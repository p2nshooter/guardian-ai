# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Studio — Local Database (SQLite)
All data stored on CLIENT'S server — never leaves their infrastructure.
Auto-cleanup of artifacts older than 14 days.
"""
import aiosqlite
import logging
import os
from datetime import datetime, timezone

log = logging.getLogger("studio.database")

DB_PATH = os.environ.get("STUDIO_DB_PATH", "/studio/data/studio.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'ai',
    label TEXT NOT NULL DEFAULT '',
    credentials_enc TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    is_verified INTEGER NOT NULL DEFAULT 0,
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_usd REAL NOT NULL DEFAULT 0,
    last_used TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    studio_type TEXT NOT NULL DEFAULT 'ai',
    title TEXT NOT NULL DEFAULT 'Untitled',
    provider TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    system_prompt TEXT NOT NULL DEFAULT '',
    messages TEXT NOT NULL DEFAULT '[]',
    settings TEXT NOT NULL DEFAULT '{}',
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_usd REAL NOT NULL DEFAULT 0,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL DEFAULT (datetime('now', '+14 days'))
);

CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    studio_type TEXT NOT NULL DEFAULT 'ai',
    artifact_type TEXT NOT NULL DEFAULT 'text',
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    file_path TEXT NOT NULL DEFAULT '',
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'text/plain',
    meta TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL DEFAULT (datetime('now', '+14 days'))
);

CREATE TABLE IF NOT EXISTS gpu_instances (
    id TEXT PRIMARY KEY,
    credential_id TEXT NOT NULL,
    instance_name TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'custom',
    gpu_type TEXT NOT NULL DEFAULT '',
    gpu_count INTEGER NOT NULL DEFAULT 1,
    vram_gb INTEGER NOT NULL DEFAULT 0,
    endpoint_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'offline',
    deployed_model TEXT NOT NULL DEFAULT '',
    last_health TEXT,
    meta TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipelines (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Untitled Pipeline',
    description TEXT NOT NULL DEFAULT '',
    nodes TEXT NOT NULL DEFAULT '[]',
    edges TEXT NOT NULL DEFAULT '[]',
    settings TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft',
    last_run TEXT,
    run_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL DEFAULT (datetime('now', '+14 days'))
);

CREATE TABLE IF NOT EXISTS usage_log (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    studio_type TEXT NOT NULL DEFAULT 'ai',
    provider TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'success',
    error_msg TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sess_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_art_expires ON artifacts(expires_at);
CREATE INDEX IF NOT EXISTS idx_pipe_expires ON pipelines(expires_at);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_log(created_at);
"""


async def init_db():
    """Initialize database and create tables."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()
    log.info(f"Database initialized: {DB_PATH}")


async def get_db():
    """Get database connection."""
    return await aiosqlite.connect(DB_PATH)


async def cleanup_expired():
    """Delete expired sessions, artifacts, pipelines. Run daily."""
    async with aiosqlite.connect(DB_PATH) as db:
        now = datetime.now(timezone.utc).isoformat()
        r1 = await db.execute("DELETE FROM sessions WHERE expires_at < ?", [now])
        r2 = await db.execute("DELETE FROM artifacts WHERE expires_at < ?", [now])
        r3 = await db.execute("DELETE FROM pipelines WHERE expires_at < ?", [now])
        # Clean old usage logs (keep 90 days)
        r4 = await db.execute("DELETE FROM usage_log WHERE created_at < datetime('now', '-90 days')")
        await db.commit()
        log.info(f"Cleanup: {r1.rowcount} sessions, {r2.rowcount} artifacts, {r3.rowcount} pipelines, {r4.rowcount} logs deleted")

    # Also clean artifact files from disk
    artifacts_dir = "/studio/artifacts"
    if os.path.isdir(artifacts_dir):
        import time as _time
        cutoff = _time.time() - (14 * 86400)
        for fname in os.listdir(artifacts_dir):
            fpath = os.path.join(artifacts_dir, fname)
            try:
                if os.path.getmtime(fpath) < cutoff:
                    os.remove(fpath)
            except Exception:
                pass
