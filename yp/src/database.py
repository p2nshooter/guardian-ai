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
