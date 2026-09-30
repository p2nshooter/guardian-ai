-- ============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- 0052 — platform_config: admin-editable key/value settings.
--
-- Backs the AXTO Free Full-Access Program (lib/free-access.ts): the global
-- program end date / start date / enabled flag live here so an admin can move
-- the countdown from the portal without a redeploy. Reads always fall back to
-- the compiled defaults, so a missing row can never lock anyone out.
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed the free-access window (one year, aligned to the axto.io domain term).
-- These match FREE_ACCESS_DEFAULT_* in lib/free-access.ts.
INSERT OR IGNORE INTO platform_config (key, value, updated_at) VALUES
  ('free_access_enabled', 'true',                      datetime('now')),
  ('free_access_start',   '2026-07-23T00:00:00.000Z',  datetime('now')),
  ('free_access_end',     '2027-07-23T00:00:00.000Z',  datetime('now'));
