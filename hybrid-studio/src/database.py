# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Hybrid Studio — Local SQLite Database
Stores workflows, pipeline runs, nodes, connections, templates.
All data on CLIENT's server.
"""
from __future__ import annotations
import aiosqlite, logging, os

log = logging.getLogger("hybrid_studio.db")
DB_PATH = os.environ.get("HYBRID_STUDIO_DB", "/hybrid-studio/data/studio.db")

SCHEMA = """
-- ── Workflows (pipelines) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflows (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL DEFAULT 'Untitled Pipeline',
    description TEXT NOT NULL DEFAULT '',
    nodes       TEXT NOT NULL DEFAULT '[]',
    edges       TEXT NOT NULL DEFAULT '[]',
    variables   TEXT NOT NULL DEFAULT '{}',
    tags        TEXT NOT NULL DEFAULT '[]',
    category    TEXT NOT NULL DEFAULT 'general',
    is_template INTEGER NOT NULL DEFAULT 0,
    is_active   INTEGER NOT NULL DEFAULT 1,
    run_count   INTEGER NOT NULL DEFAULT 0,
    last_run    TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Pipeline Runs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runs (
    id          TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    trigger     TEXT NOT NULL DEFAULT 'manual',
    inputs      TEXT NOT NULL DEFAULT '{}',
    outputs     TEXT NOT NULL DEFAULT '{}',
    node_logs   TEXT NOT NULL DEFAULT '[]',
    error_msg   TEXT NOT NULL DEFAULT '',
    started_at  TEXT,
    finished_at TEXT,
    duration_ms INTEGER,
    cost_usd    REAL    NOT NULL DEFAULT 0.0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Node Definitions (custom/saved nodes) ─────────────────────────────
CREATE TABLE IF NOT EXISTS node_defs (
    id          TEXT PRIMARY KEY,
    node_type   TEXT NOT NULL,
    config      TEXT NOT NULL DEFAULT '{}',
    label       TEXT NOT NULL DEFAULT '',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    use_count   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── API Connections ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connections (
    id          TEXT PRIMARY KEY,
    service     TEXT NOT NULL,
    label       TEXT NOT NULL DEFAULT '',
    credentials TEXT NOT NULL DEFAULT '{}',
    is_active   INTEGER NOT NULL DEFAULT 1,
    is_verified INTEGER NOT NULL DEFAULT 0,
    last_used   TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Scheduled Triggers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
    id          TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    cron_expr   TEXT NOT NULL DEFAULT '',
    is_active   INTEGER NOT NULL DEFAULT 1,
    last_run    TEXT,
    next_run    TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_runs_workflow  ON runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_runs_status    ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_created   ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_updated     ON workflows(updated_at DESC);
"""

async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()
    log.info(f"Hybrid Studio DB ready: {DB_PATH}")

async def get_db():
    return await aiosqlite.connect(DB_PATH)

async def cleanup_old_runs():
    async with aiosqlite.connect(DB_PATH) as db:
        r = await db.execute("DELETE FROM runs WHERE created_at < datetime('now', '-30 days') AND status IN ('done','failed')")
        await db.commit()
        log.info(f"Cleaned {r.rowcount} old runs")
