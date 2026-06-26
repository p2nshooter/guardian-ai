# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""AXTO SOC — SQLite Database Layer"""
from __future__ import annotations
import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import structlog

log = structlog.get_logger()


def get_db(data_dir: Path) -> sqlite3.Connection:
    db_path = data_dir / "soc.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id          TEXT PRIMARY KEY,
    ts          REAL NOT NULL,
    source      TEXT NOT NULL,
    source_ip   TEXT,
    event_type  TEXT NOT NULL,
    severity    TEXT NOT NULL DEFAULT 'info',
    category    TEXT,
    raw         TEXT,
    parsed      TEXT,
    tags        TEXT DEFAULT '[]',
    incident_id TEXT,
    processed   INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_incident ON events(incident_id);

CREATE TABLE IF NOT EXISTS incidents (
    id           TEXT PRIMARY KEY,
    created_at   REAL NOT NULL,
    updated_at   REAL NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT,
    severity     TEXT NOT NULL DEFAULT 'medium',
    status       TEXT NOT NULL DEFAULT 'open',
    assignee     TEXT,
    tags         TEXT DEFAULT '[]',
    timeline     TEXT DEFAULT '[]',
    mitre_tactic TEXT,
    mitre_tech   TEXT,
    closed_at    REAL,
    resolution   TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);

CREATE TABLE IF NOT EXISTS threat_intel (
    ioc_value   TEXT NOT NULL,
    ioc_type    TEXT NOT NULL,
    threat_type TEXT,
    confidence  REAL DEFAULT 0.5,
    source      TEXT,
    first_seen  REAL NOT NULL,
    last_seen   REAL NOT NULL,
    tags        TEXT DEFAULT '[]',
    PRIMARY KEY (ioc_value, ioc_type)
);

CREATE INDEX IF NOT EXISTS idx_ioc_value ON threat_intel(ioc_value);

CREATE TABLE IF NOT EXISTS playbooks (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    trigger     TEXT NOT NULL,
    conditions  TEXT DEFAULT '{}',
    actions     TEXT DEFAULT '[]',
    enabled     INTEGER DEFAULT 1,
    run_count   INTEGER DEFAULT 0,
    last_run    REAL
);

CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    created_at  REAL NOT NULL,
    report_type TEXT NOT NULL,
    period_from REAL,
    period_to   REAL,
    data        TEXT,
    format      TEXT DEFAULT 'json'
);
"""


class SOCDB:
    def __init__(self, data_dir: Path):
        self._conn = get_db(data_dir)
        self._init_schema()

    def _init_schema(self):
        for stmt in SCHEMA.split(";"):
            s = stmt.strip()
            if s:
                self._conn.execute(s)
        self._conn.commit()

    # ── Events ────────────────────────────────────────────────────────────────

    def insert_event(self, event: dict) -> str:
        import uuid as _uuid
        eid = event.get("id") or str(_uuid.uuid4())
        self._conn.execute(
            """INSERT OR IGNORE INTO events
               (id, ts, source, source_ip, event_type, severity, category,
                raw, parsed, tags, incident_id)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            [
                eid,
                event.get("ts", time.time()),
                event.get("source", "unknown"),
                event.get("source_ip"),
                event.get("event_type", "generic"),
                event.get("severity", "info"),
                event.get("category"),
                event.get("raw"),
                json.dumps(event.get("parsed", {})),
                json.dumps(event.get("tags", [])),
                event.get("incident_id"),
            ]
        )
        self._conn.commit()
        return eid

    def get_events(
        self, severity: Optional[str] = None,
        since: float = 0, limit: int = 100
    ) -> List[Dict]:
        q = "SELECT * FROM events WHERE ts > ?"
        args: list = [since]
        if severity:
            q += " AND severity = ?"
            args.append(severity)
        q += " ORDER BY ts DESC LIMIT ?"
        args.append(limit)
        return [dict(r) for r in self._conn.execute(q, args).fetchall()]

    def event_count_by_severity(self, since: float = 0) -> Dict[str, int]:
        rows = self._conn.execute(
            "SELECT severity, COUNT(*) as cnt FROM events WHERE ts > ? GROUP BY severity",
            [since]
        ).fetchall()
        return {r["severity"]: r["cnt"] for r in rows}

    # ── Incidents ─────────────────────────────────────────────────────────────

    def create_incident(self, data: dict) -> str:
        import uuid as _uuid
        iid = str(_uuid.uuid4())
        now = time.time()
        self._conn.execute(
            """INSERT INTO incidents
               (id, created_at, updated_at, title, description, severity,
                status, assignee, tags, timeline, mitre_tactic, mitre_tech)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            [
                iid, now, now,
                data.get("title", "Untitled Incident"),
                data.get("description", ""),
                data.get("severity", "medium"),
                "open",
                data.get("assignee"),
                json.dumps(data.get("tags", [])),
                json.dumps([{"ts": now, "action": "created", "note": "Incident created"}]),
                data.get("mitre_tactic"),
                data.get("mitre_tech"),
            ]
        )
        self._conn.commit()
        return iid

    def get_incidents(
        self, status: Optional[str] = None, limit: int = 50
    ) -> List[Dict]:
        q = "SELECT * FROM incidents"
        args: list = []
        if status:
            q += " WHERE status = ?"
            args.append(status)
        q += " ORDER BY created_at DESC LIMIT ?"
        args.append(limit)
        return [dict(r) for r in self._conn.execute(q, args).fetchall()]

    def update_incident(self, iid: str, updates: dict) -> bool:
        now = time.time()
        # Append timeline entry
        row = self._conn.execute(
            "SELECT timeline FROM incidents WHERE id = ?", [iid]
        ).fetchone()
        if not row:
            return False
        timeline = json.loads(row["timeline"] or "[]")
        if "note" in updates:
            timeline.append({"ts": now, "action": updates.get("action", "updated"),
                             "note": updates["note"]})
        sets = ["updated_at = ?"]
        vals: list = [now]
        for field in ["status", "severity", "assignee", "resolution", "title"]:
            if field in updates:
                sets.append(f"{field} = ?")
                vals.append(updates[field])
        sets.append("timeline = ?")
        vals.append(json.dumps(timeline))
        if updates.get("status") == "closed":
            sets.append("closed_at = ?")
            vals.append(now)
        vals.append(iid)
        self._conn.execute(
            f"UPDATE incidents SET {', '.join(sets)} WHERE id = ?", vals
        )
        self._conn.commit()
        return True

    # ── Threat Intel ─────────────────────────────────────────────────────────

    def upsert_ioc(self, ioc: dict):
        now = time.time()
        self._conn.execute(
            """INSERT INTO threat_intel
               (ioc_value, ioc_type, threat_type, confidence, source,
                first_seen, last_seen, tags)
               VALUES (?,?,?,?,?,?,?,?)
               ON CONFLICT(ioc_value, ioc_type) DO UPDATE SET
                 last_seen=excluded.last_seen,
                 confidence=MAX(threat_intel.confidence, excluded.confidence)""",
            [
                ioc["value"], ioc["type"],
                ioc.get("threat_type", "unknown"),
                ioc.get("confidence", 0.5),
                ioc.get("source", "manual"),
                ioc.get("first_seen", now),
                now,
                json.dumps(ioc.get("tags", [])),
            ]
        )
        self._conn.commit()

    def lookup_ioc(self, value: str) -> Optional[Dict]:
        row = self._conn.execute(
            "SELECT * FROM threat_intel WHERE ioc_value = ?", [value]
        ).fetchone()
        return dict(row) if row else None

    def threat_intel_count(self) -> int:
        return self._conn.execute(
            "SELECT COUNT(*) FROM threat_intel"
        ).fetchone()[0]

    # ── Playbooks ────────────────────────────────────────────────────────────

    def get_playbooks(self) -> List[Dict]:
        return [dict(r) for r in
                self._conn.execute("SELECT * FROM playbooks WHERE enabled=1").fetchall()]

    def insert_default_playbooks(self):
        """Seed default SOAR playbooks."""
        defaults = [
            {
                "id": "pb-brute-force",
                "name": "Block Brute Force Attack",
                "trigger": "brute_force",
                "conditions": json.dumps({"min_attempts": 10, "window_seconds": 60}),
                "actions": json.dumps([
                    {"type": "block_ip", "params": {"duration_hours": 24}},
                    {"type": "create_incident", "params": {"severity": "high"}},
                    {"type": "alert_slack"},
                ]),
            },
            {
                "id": "pb-malware-detect",
                "name": "Malware Detection Response",
                "trigger": "malware_detected",
                "conditions": json.dumps({}),
                "actions": json.dumps([
                    {"type": "create_incident", "params": {"severity": "critical"}},
                    {"type": "isolate_source"},
                    {"type": "alert_email"},
                    {"type": "alert_slack"},
                ]),
            },
            {
                "id": "pb-critical-cve",
                "name": "Critical CVE Alert",
                "trigger": "cve_critical",
                "conditions": json.dumps({"cvss_min": 9.0}),
                "actions": json.dumps([
                    {"type": "create_incident", "params": {"severity": "critical"}},
                    {"type": "alert_email"},
                ]),
            },
        ]
        for pb in defaults:
            self._conn.execute(
                """INSERT OR IGNORE INTO playbooks
                   (id, name, trigger, conditions, actions, enabled)
                   VALUES (?,?,?,?,?,1)""",
                [pb["id"], pb["name"], pb["trigger"], pb["conditions"], pb["actions"]]
            )
        self._conn.commit()

    def close(self):
        try:
            self._conn.close()
        except Exception:
            pass
