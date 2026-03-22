-- ═══════════════════════════════════════════════════════════════
-- Migration 0019: Auto-releases tracking table
-- Tracks every auto-build from GitHub Actions
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS auto_releases (
  id          TEXT PRIMARY KEY,
  channel     TEXT NOT NULL DEFAULT 'latest',  -- 'latest' | 'v1.2.3'
  tag         TEXT NOT NULL DEFAULT '',         -- 'latest-abc1234' | 'v1.2.3'
  commit_sha  TEXT NOT NULL DEFAULT '',
  run_url     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'success', -- 'success' | 'partial' | 'failed'
  files_count INTEGER NOT NULL DEFAULT 0,
  built_at    TEXT NOT NULL DEFAULT (datetime('now')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_releases_channel ON auto_releases(channel);
CREATE INDEX IF NOT EXISTS idx_releases_built   ON auto_releases(built_at DESC);

-- Add engine_build_id to licenses (safe if already exists from 0018)
-- Using CREATE INDEX as proxy to check — actual ALTER is idempotent via try/catch in app code
