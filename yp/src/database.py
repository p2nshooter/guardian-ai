# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
YP Smart Local Database.

A single embedded SQLite database on the CLIENT's own infrastructure — no data
ever leaves the client's server. Stores the unified event/audit log, per-job
routing decisions and provider-scaling telemetry, redaction audit (masked
evidence only — never the raw sensitive value), and a lightweight document
store for the legal-research module.

Everything is async (aiosqlite) so it never blocks the API event loop.
"""
from __future__ import annotations
import time
import uuid
from pathlib import Path

import aiosqlite

_SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  ts          REAL NOT NULL,
  module      TEXT NOT NULL,          -- security|privacy|gateway|soc|compliance|ot|legal|scheduler
  kind        TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'info',
  summary     TEXT NOT NULL DEFAULT '',
  meta_json   TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_events_ts     ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_module ON events(module);

CREATE TABLE IF NOT EXISTS jobs (
  id           TEXT PRIMARY KEY,
  ts           REAL NOT NULL,
  provider     TEXT NOT NULL DEFAULT '',
  model        TEXT NOT NULL DEFAULT '',
  latency_s    REAL NOT NULL DEFAULT 0,
  ok           INTEGER NOT NULL DEFAULT 0,
  redactions   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_jobs_ts ON jobs(ts);

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  ts          REAL NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  jurisdiction TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  tags_json   TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_docs_jur ON documents(jurisdiction);

-- SOC alerts raised by the correlation engine over the event stream.
CREATE TABLE IF NOT EXISTS alerts (
  id          TEXT PRIMARY KEY,
  ts          REAL NOT NULL,
  rule_id     TEXT NOT NULL DEFAULT '',
  severity    TEXT NOT NULL DEFAULT 'medium',
  title       TEXT NOT NULL DEFAULT '',
  detail      TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'open',    -- open | acknowledged | closed
  meta_json   TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_alerts_ts     ON alerts(ts);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);

-- OT/IoT asset inventory (client-registered, YP-classified).
CREATE TABLE IF NOT EXISTS assets (
  id          TEXT PRIMARY KEY,
  ts          REAL NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  ip          TEXT NOT NULL DEFAULT '',
  asset_type  TEXT NOT NULL DEFAULT '',       -- plc | rtu | hmi | sensor | server | unknown
  protocol    TEXT NOT NULL DEFAULT '',       -- modbus | dnp3 | s7 | opcua | bacnet | ...
  vendor      TEXT NOT NULL DEFAULT '',
  risk_score  INTEGER NOT NULL DEFAULT 0,     -- 0..100
  exposed     INTEGER NOT NULL DEFAULT 0,     -- reachable from untrusted network
  meta_json   TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_assets_risk ON assets(risk_score);

-- Antivirus / content scan findings.
CREATE TABLE IF NOT EXISTS findings (
  id          TEXT PRIMARY KEY,
  ts          REAL NOT NULL,
  target      TEXT NOT NULL DEFAULT '',
  verdict     TEXT NOT NULL DEFAULT 'clean',  -- clean | suspicious | malicious
  score       INTEGER NOT NULL DEFAULT 0,     -- 0..100
  signatures  TEXT NOT NULL DEFAULT '[]',     -- JSON list of matched signature names
  sha256      TEXT NOT NULL DEFAULT '',
  quarantined INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_findings_verdict ON findings(verdict);
"""


def _uid() -> str:
    return uuid.uuid4().hex


class YPDatabase:
    def __init__(self, data_dir: Path):
        self._path = str(Path(data_dir) / "yp.db")
        self._db: aiosqlite.Connection | None = None

    async def connect(self) -> None:
        Path(self._path).parent.mkdir(parents=True, exist_ok=True)
        self._db = await aiosqlite.connect(self._path)
        self._db.row_factory = aiosqlite.Row
        await self._db.executescript(_SCHEMA)
        await self._db.commit()

    async def close(self) -> None:
        if self._db:
            await self._db.close()

    # ── Events / audit ───────────────────────────────────────────────────────
    async def log_event(self, module: str, kind: str, summary: str = "",
                        severity: str = "info", meta_json: str = "{}") -> str:
        assert self._db
        eid = _uid()
        await self._db.execute(
            "INSERT INTO events (id, ts, module, kind, severity, summary, meta_json) "
            "VALUES (?,?,?,?,?,?,?)",
            (eid, time.time(), module, kind, severity, summary, meta_json),
        )
        await self._db.commit()
        return eid

    async def recent_events(self, limit: int = 100, module: str | None = None) -> list:
        assert self._db
        if module:
            cur = await self._db.execute(
                "SELECT * FROM events WHERE module=? ORDER BY ts DESC LIMIT ?", (module, limit))
        else:
            cur = await self._db.execute(
                "SELECT * FROM events ORDER BY ts DESC LIMIT ?", (limit,))
        return [dict(r) for r in await cur.fetchall()]

    # ── Jobs (provider-scaling telemetry) ────────────────────────────────────
    async def log_job(self, provider: str, model: str, latency_s: float,
                     ok: bool, redactions: int = 0) -> None:
        assert self._db
        await self._db.execute(
            "INSERT INTO jobs (id, ts, provider, model, latency_s, ok, redactions) "
            "VALUES (?,?,?,?,?,?,?)",
            (_uid(), time.time(), provider, model, latency_s, 1 if ok else 0, redactions),
        )
        await self._db.commit()

    async def job_summary(self) -> dict:
        assert self._db
        cur = await self._db.execute(
            "SELECT COUNT(*) n, SUM(ok) oks, AVG(latency_s) lat, SUM(redactions) reds FROM jobs")
        row = dict(await cur.fetchone())
        return {
            "total_jobs": row.get("n") or 0,
            "successful": row.get("oks") or 0,
            "avg_latency_s": round(row.get("lat") or 0, 3),
            "total_redactions": row.get("reds") or 0,
        }

    # ── Documents (legal store) ──────────────────────────────────────────────
    async def add_document(self, title: str, jurisdiction: str, body: str,
                          tags_json: str = "[]") -> str:
        assert self._db
        did = _uid()
        await self._db.execute(
            "INSERT INTO documents (id, ts, title, jurisdiction, body, tags_json) "
            "VALUES (?,?,?,?,?,?)",
            (did, time.time(), title, jurisdiction, body, tags_json),
        )
        await self._db.commit()
        return did

    async def search_documents(self, q: str, limit: int = 20) -> list:
        assert self._db
        like = f"%{q}%"
        cur = await self._db.execute(
            "SELECT id, ts, title, jurisdiction, tags_json FROM documents "
            "WHERE title LIKE ? OR body LIKE ? ORDER BY ts DESC LIMIT ?",
            (like, like, limit))
        return [dict(r) for r in await cur.fetchall()]

    # ── Alerts (SOC) ─────────────────────────────────────────────────────────
    async def add_alert(self, rule_id: str, severity: str, title: str,
                       detail: str = "", source: str = "", meta_json: str = "{}") -> str:
        assert self._db
        aid = _uid()
        await self._db.execute(
            "INSERT INTO alerts (id, ts, rule_id, severity, title, detail, source, status, meta_json) "
            "VALUES (?,?,?,?,?,?,?,'open',?)",
            (aid, time.time(), rule_id, severity, title, detail, source, meta_json),
        )
        await self._db.commit()
        return aid

    async def recent_alerts(self, limit: int = 100, status: str | None = None) -> list:
        assert self._db
        if status:
            cur = await self._db.execute(
                "SELECT * FROM alerts WHERE status=? ORDER BY ts DESC LIMIT ?", (status, limit))
        else:
            cur = await self._db.execute(
                "SELECT * FROM alerts ORDER BY ts DESC LIMIT ?", (limit,))
        return [dict(r) for r in await cur.fetchall()]

    async def set_alert_status(self, alert_id: str, status: str) -> bool:
        assert self._db
        cur = await self._db.execute(
            "UPDATE alerts SET status=? WHERE id=?", (status, alert_id))
        await self._db.commit()
        return cur.rowcount > 0

    async def count_events_since(self, module: str, kind: str, since_ts: float,
                               source: str | None = None) -> int:
        """Count matching events in a recent window — the SOC engine's primitive."""
        assert self._db
        if source is not None:
            cur = await self._db.execute(
                "SELECT COUNT(*) n FROM events WHERE module=? AND kind=? AND ts>=? "
                "AND meta_json LIKE ?",
                (module, kind, since_ts, f'%\"source\": \"{source}\"%'))
        else:
            cur = await self._db.execute(
                "SELECT COUNT(*) n FROM events WHERE module=? AND kind=? AND ts>=?",
                (module, kind, since_ts))
        row = await cur.fetchone()
        return (dict(row).get("n") if row else 0) or 0

    # ── Assets (OT) ──────────────────────────────────────────────────────────
    async def add_asset(self, name: str, ip: str, asset_type: str, protocol: str,
                      vendor: str, risk_score: int, exposed: bool,
                      meta_json: str = "{}") -> str:
        assert self._db
        aid = _uid()
        await self._db.execute(
            "INSERT INTO assets (id, ts, name, ip, asset_type, protocol, vendor, risk_score, exposed, meta_json) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (aid, time.time(), name, ip, asset_type, protocol, vendor, risk_score,
             1 if exposed else 0, meta_json),
        )
        await self._db.commit()
        return aid

    async def list_assets(self, limit: int = 500) -> list:
        assert self._db
        cur = await self._db.execute(
            "SELECT * FROM assets ORDER BY risk_score DESC, ts DESC LIMIT ?", (limit,))
        return [dict(r) for r in await cur.fetchall()]

    # ── Findings (AV / content scan) ─────────────────────────────────────────
    async def add_finding(self, target: str, verdict: str, score: int,
                        signatures: str, sha256: str, quarantined: bool) -> str:
        assert self._db
        fid = _uid()
        await self._db.execute(
            "INSERT INTO findings (id, ts, target, verdict, score, signatures, sha256, quarantined) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (fid, time.time(), target, verdict, score, signatures, sha256,
             1 if quarantined else 0),
        )
        await self._db.commit()
        return fid

    async def recent_findings(self, limit: int = 100, verdict: str | None = None) -> list:
        assert self._db
        if verdict:
            cur = await self._db.execute(
                "SELECT * FROM findings WHERE verdict=? ORDER BY ts DESC LIMIT ?", (verdict, limit))
        else:
            cur = await self._db.execute(
                "SELECT * FROM findings ORDER BY ts DESC LIMIT ?", (limit,))
        return [dict(r) for r in await cur.fetchall()]
