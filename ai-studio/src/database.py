# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO AI Studio — Local SQLite Database
All data stored on CLIENT's server — never leaves their infrastructure.
Auto-cleanup: sessions/artifacts after 30 days, usage logs after 90 days.
"""
from __future__ import annotations
import aiosqlite, logging, os
from datetime import datetime, timezone

log = logging.getLogger("ai_studio.db")
DB_PATH = os.environ.get("AI_STUDIO_DB", "/ai-studio/data/studio.db")

SCHEMA = """
-- ── Credentials (API keys for all providers) ──────────────────────────────
CREATE TABLE IF NOT EXISTS credentials (
    id           TEXT PRIMARY KEY,
    provider     TEXT NOT NULL,
    label        TEXT NOT NULL DEFAULT '',
    endpoint     TEXT NOT NULL DEFAULT '',
    api_key_enc  TEXT NOT NULL DEFAULT '',
    is_active    INTEGER NOT NULL DEFAULT 1,
    is_verified  INTEGER NOT NULL DEFAULT 0,
    total_req    INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost   REAL    NOT NULL DEFAULT 0.0,
    last_used    TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Chat Sessions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL DEFAULT 'New Chat',
    credential_id TEXT NOT NULL DEFAULT '',
    provider     TEXT NOT NULL DEFAULT '',
    model        TEXT NOT NULL DEFAULT '',
    system_prompt TEXT NOT NULL DEFAULT '',
    messages     TEXT NOT NULL DEFAULT '[]',
    temperature  REAL NOT NULL DEFAULT 0.7,
    max_tokens   INTEGER NOT NULL DEFAULT 4096,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost   REAL NOT NULL DEFAULT 0.0,
    is_pinned    INTEGER NOT NULL DEFAULT 0,
    folder       TEXT NOT NULL DEFAULT '',
    tags         TEXT NOT NULL DEFAULT '[]',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at   TEXT NOT NULL DEFAULT (datetime('now', '+30 days'))
);

-- ── Prompt Library ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prompts (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'general',
    tags        TEXT NOT NULL DEFAULT '[]',
    use_count   INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Batch Jobs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_jobs (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL DEFAULT 'Batch Job',
    credential_id TEXT NOT NULL DEFAULT '',
    provider     TEXT NOT NULL DEFAULT '',
    model        TEXT NOT NULL DEFAULT '',
    system_prompt TEXT NOT NULL DEFAULT '',
    inputs       TEXT NOT NULL DEFAULT '[]',
    results      TEXT NOT NULL DEFAULT '[]',
    status       TEXT NOT NULL DEFAULT 'pending',
    total_items  INTEGER NOT NULL DEFAULT 0,
    done_items   INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost   REAL NOT NULL DEFAULT 0.0,
    error_msg    TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);

-- ── Usage Log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_log (
    id           TEXT PRIMARY KEY,
    session_id   TEXT,
    batch_id     TEXT,
    credential_id TEXT,
    provider     TEXT NOT NULL DEFAULT '',
    model        TEXT NOT NULL DEFAULT '',
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    latency_ms   INTEGER NOT NULL DEFAULT 0,
    cost_usd     REAL NOT NULL DEFAULT 0.0,
    status       TEXT NOT NULL DEFAULT 'success',
    error_msg    TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Compare Runs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compare_runs (
    id          TEXT PRIMARY KEY,
    prompt      TEXT NOT NULL,
    system_prompt TEXT NOT NULL DEFAULT '',
    results     TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at  TEXT NOT NULL DEFAULT (datetime('now', '+30 days'))
);

CREATE INDEX IF NOT EXISTS idx_sess_updated  ON sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sess_expires  ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_cred    ON usage_log(credential_id);
CREATE INDEX IF NOT EXISTS idx_batch_status  ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_prompts_cat   ON prompts(category);
"""

async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()
    log.info(f"AI Studio DB ready: {DB_PATH}")

async def get_db() -> aiosqlite.Connection:
    return await aiosqlite.connect(DB_PATH)

async def cleanup_expired():
    async with aiosqlite.connect(DB_PATH) as db:
        r1 = await db.execute("DELETE FROM sessions WHERE expires_at < datetime('now')")
        r2 = await db.execute("DELETE FROM compare_runs WHERE expires_at < datetime('now')")
        r3 = await db.execute("DELETE FROM usage_log WHERE created_at < datetime('now', '-90 days')")
        r4 = await db.execute("DELETE FROM batch_jobs WHERE status IN ('done','failed') AND updated_at < datetime('now', '-30 days')")
        await db.commit()
        log.info(f"Cleanup: sessions={r1.rowcount} compare={r2.rowcount} logs={r3.rowcount} batches={r4.rowcount}")
