-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- ==============================================================================
-- Editions per self-hosted app and the "100 trial licences per app" programme
-- (docs/AXTO-APPS-BLUEPRINT.md §3–§4).
--
-- sh_licenses.source says where a licence comes from:
--   plan    — included in the Business / Enterprise subscription (top edition)
--   edition — one app bought in an edition (Starter … Enterprise), monthly or yearly
--   trial   — a 14-day trial from the per-app pool (Professional edition)
-- A member can hold one licence per app per source, so a paid edition never
-- disappears when a plan changes, and a trial never overwrites a paid licence.
ALTER TABLE sh_licenses ADD COLUMN source TEXT NOT NULL DEFAULT 'plan';
DROP INDEX IF EXISTS idx_shl_user_product;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shl_user_product_source ON sh_licenses(user_id, product, source);
CREATE INDEX IF NOT EXISTS idx_shl_source ON sh_licenses(source, status);

-- The trial pool: 100 codes per app by default (Admin → Trials makes more or
-- fewer). One small row per code; a claim takes one atomically.
CREATE TABLE IF NOT EXISTS sh_trials (
  code        TEXT PRIMARY KEY,                    -- TRIAL-XXXX-XXXX-XXXX
  product     TEXT NOT NULL,                       -- self-hosted slug
  batch       TEXT NOT NULL,                       -- batch id (admin action)
  status      TEXT NOT NULL DEFAULT 'available',   -- available | claimed | disabled
  user_id     TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  ip          TEXT NOT NULL DEFAULT '',
  license_id  TEXT NOT NULL DEFAULT '',
  claimed_at  TEXT NOT NULL DEFAULT '',
  rating      INTEGER NOT NULL DEFAULT 0,          -- 1–5 from the member, 0 = not rated
  converted   INTEGER NOT NULL DEFAULT 0,          -- 1 once the member paid for this app
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sh_trials_product ON sh_trials(product, status);
CREATE INDEX IF NOT EXISTS idx_sh_trials_user ON sh_trials(user_id, product);
CREATE INDEX IF NOT EXISTS idx_sh_trials_ip ON sh_trials(ip, product);
