-- ============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- 0053 — installs: one row per (install fingerprint, product).
--
-- The Free Full-Access Program removes licence keys entirely. Each downloaded
-- app self-registers on first validation using its machine fingerprint as the
-- install ID (no user input). This table records every install so the admin
-- portal can show the live install count + list, drive the public landing
-- counter (viral ranking, counts only), and so "one ID = one install per year"
-- is observable and manageable.
--
--   status            active | revoked. A revoked ID is locked server-side; the
--                     client must contact the admin (pay $1000) to free it for a
--                     fresh reinstall.
--   expires_override  when set, overrides the GLOBAL program end date for THIS
--                     install only — the admin's manual per-ID time extension.
--
-- Re-validation from the same machine updates last_seen; it never creates a
-- second install. Countdown + synchronized lock come from the global end date
-- in platform_config (0052), unless expires_override lengthens it for one ID.
-- ============================================================================
CREATE TABLE IF NOT EXISTS installs (
  install_id       TEXT NOT NULL,          -- SHA-256 machine fingerprint (32 hex)
  product          TEXT NOT NULL,          -- guardian | orchestra | vault | ...
  first_seen       TEXT NOT NULL,          -- when this install's countdown started
  last_seen        TEXT NOT NULL,          -- most recent heartbeat
  hostname         TEXT NOT NULL DEFAULT '',
  version          TEXT NOT NULL DEFAULT '',
  ip               TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'active',  -- active | revoked
  expires_override TEXT NOT NULL DEFAULT '',        -- ISO; admin per-ID extension
  notes            TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (install_id, product)
);

CREATE INDEX IF NOT EXISTS idx_installs_product   ON installs (product);
CREATE INDEX IF NOT EXISTS idx_installs_last_seen ON installs (last_seen);
CREATE INDEX IF NOT EXISTS idx_installs_status    ON installs (status);
