# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO GPU Studio — Local SQLite Database
All data stored on CLIENT's server.
"""
from __future__ import annotations
import aiosqlite, logging, os

log = logging.getLogger("gpu_studio.db")
DB_PATH = os.environ.get("GPU_STUDIO_DB", "/gpu-studio/data/studio.db")

SCHEMA = """
-- ── Endpoints (GPU servers / API providers) ───────────────────────────────
CREATE TABLE IF NOT EXISTS endpoints (
    id           TEXT PRIMARY KEY,
    label        TEXT NOT NULL DEFAULT '',
    provider     TEXT NOT NULL DEFAULT 'custom',
    endpoint_url TEXT NOT NULL DEFAULT '',
    api_key_enc  TEXT NOT NULL DEFAULT '',
    is_active    INTEGER NOT NULL DEFAULT 1,
    is_verified  INTEGER NOT NULL DEFAULT 0,
    gpu_type     TEXT NOT NULL DEFAULT '',
    vram_gb      INTEGER NOT NULL DEFAULT 0,
    models       TEXT NOT NULL DEFAULT '[]',
    total_jobs   INTEGER NOT NULL DEFAULT 0,
    total_cost   REAL    NOT NULL DEFAULT 0.0,
    last_used    TEXT,
    last_health  TEXT,
    status       TEXT NOT NULL DEFAULT 'unknown',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Generation Jobs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
    id              TEXT PRIMARY KEY,
    endpoint_id     TEXT NOT NULL DEFAULT '',
    job_type        TEXT NOT NULL DEFAULT 'txt2img',
    title           TEXT NOT NULL DEFAULT '',
    prompt          TEXT NOT NULL DEFAULT '',
    negative_prompt TEXT NOT NULL DEFAULT '',
    model           TEXT NOT NULL DEFAULT '',
    params          TEXT NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'pending',
    result_urls     TEXT NOT NULL DEFAULT '[]',
    result_data     TEXT NOT NULL DEFAULT '{}',
    error_msg       TEXT NOT NULL DEFAULT '',
    latency_ms      INTEGER NOT NULL DEFAULT 0,
    cost_usd        REAL    NOT NULL DEFAULT 0.0,
    seed            INTEGER,
    steps           INTEGER NOT NULL DEFAULT 20,
    width           INTEGER NOT NULL DEFAULT 1024,
    height          INTEGER NOT NULL DEFAULT 1024,
    folder          TEXT NOT NULL DEFAULT '',
    tags            TEXT NOT NULL DEFAULT '[]',
    is_favorite     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at      TEXT NOT NULL DEFAULT (datetime('now', '+30 days'))
);

-- ── Batch Generation Jobs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_jobs (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL DEFAULT 'Batch',
    endpoint_id  TEXT NOT NULL DEFAULT '',
    job_type     TEXT NOT NULL DEFAULT 'txt2img',
    model        TEXT NOT NULL DEFAULT '',
    base_params  TEXT NOT NULL DEFAULT '{}',
    prompts      TEXT NOT NULL DEFAULT '[]',
    results      TEXT NOT NULL DEFAULT '[]',
    status       TEXT NOT NULL DEFAULT 'pending',
    total_items  INTEGER NOT NULL DEFAULT 0,
    done_items   INTEGER NOT NULL DEFAULT 0,
    total_cost   REAL    NOT NULL DEFAULT 0.0,
    error_msg    TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);

-- ── Style Presets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presets (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    job_type        TEXT NOT NULL DEFAULT 'txt2img',
    model           TEXT NOT NULL DEFAULT '',
    prompt_prefix   TEXT NOT NULL DEFAULT '',
    prompt_suffix   TEXT NOT NULL DEFAULT '',
    negative_prompt TEXT NOT NULL DEFAULT '',
    params          TEXT NOT NULL DEFAULT '{}',
    preview_url     TEXT NOT NULL DEFAULT '',
    category        TEXT NOT NULL DEFAULT 'style',
    use_count       INTEGER NOT NULL DEFAULT 0,
    is_favorite     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Gallery ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
    id          TEXT PRIMARY KEY,
    job_id      TEXT NOT NULL,
    image_url   TEXT NOT NULL DEFAULT '',
    image_data  BLOB,
    prompt      TEXT NOT NULL DEFAULT '',
    model       TEXT NOT NULL DEFAULT '',
    params      TEXT NOT NULL DEFAULT '{}',
    width       INTEGER NOT NULL DEFAULT 1024,
    height      INTEGER NOT NULL DEFAULT 1024,
    seed        INTEGER,
    folder      TEXT NOT NULL DEFAULT '',
    tags        TEXT NOT NULL DEFAULT '[]',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at  TEXT NOT NULL DEFAULT (datetime('now', '+30 days'))
);

-- ── Usage Log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_log (
    id           TEXT PRIMARY KEY,
    job_id       TEXT,
    endpoint_id  TEXT,
    job_type     TEXT NOT NULL DEFAULT 'txt2img',
    model        TEXT NOT NULL DEFAULT '',
    latency_ms   INTEGER NOT NULL DEFAULT 0,
    cost_usd     REAL    NOT NULL DEFAULT 0.0,
    status       TEXT NOT NULL DEFAULT 'success',
    error_msg    TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_created   ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_type      ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_expires   ON jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_gallery_fav    ON gallery(is_favorite);
CREATE INDEX IF NOT EXISTS idx_gallery_folder ON gallery(folder);
CREATE INDEX IF NOT EXISTS idx_usage_created  ON usage_log(created_at DESC);
"""

async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()
    log.info(f"GPU Studio DB ready: {DB_PATH}")

async def get_db():
    return await aiosqlite.connect(DB_PATH)

async def cleanup_expired():
    async with aiosqlite.connect(DB_PATH) as db:
        r1 = await db.execute("DELETE FROM jobs WHERE expires_at < datetime('now')")
        r2 = await db.execute("DELETE FROM gallery WHERE expires_at < datetime('now')")
        r3 = await db.execute("DELETE FROM usage_log WHERE created_at < datetime('now', '-90 days')")
        r4 = await db.execute("DELETE FROM batch_jobs WHERE status IN ('done','failed') AND updated_at < datetime('now', '-30 days')")
        await db.commit()
        log.info(f"Cleanup: jobs={r1.rowcount} gallery={r2.rowcount} logs={r3.rowcount} batches={r4.rowcount}")
