-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- Migration 0032: build_formats table
-- Controls which download formats (docker / exe-linux / exe-windows) are available
-- to clients on a per-product basis.
--
-- Admin toggles these via Admin → Releases → "Client Download Availability" panel.
-- Portal download API reads this table before serving any file from R2.
--
-- If a row is missing, the download API falls back to hardcoded defaults:
--   guardian, antivirus, studio → docker + exe-linux + exe-windows enabled
--   orchestra                    → docker only enabled
--   everything else              → all formats disabled (Coming Soon)

CREATE TABLE IF NOT EXISTS build_formats (
  product     TEXT NOT NULL,
  format      TEXT NOT NULL,   -- "docker" | "exe-linux" | "exe-windows"
  enabled     INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (product, format)
);

-- Seed defaults for products that are already shipping builds
-- Guardian — all 3 formats available
INSERT OR IGNORE INTO build_formats (product, format, enabled) VALUES
  ('guardian', 'docker',      1),
  ('guardian', 'exe-linux',   1),
  ('guardian', 'exe-windows', 1);

-- Orchestra — Docker only (EXE not yet packaged)
INSERT OR IGNORE INTO build_formats (product, format, enabled) VALUES
  ('orchestra', 'docker',      1),
  ('orchestra', 'exe-linux',   0),
  ('orchestra', 'exe-windows', 0);

-- Antivirus — all 3 formats
INSERT OR IGNORE INTO build_formats (product, format, enabled) VALUES
  ('antivirus', 'docker',      1),
  ('antivirus', 'exe-linux',   1),
  ('antivirus', 'exe-windows', 1);

-- Studio — Docker only
INSERT OR IGNORE INTO build_formats (product, format, enabled) VALUES
  ('studio', 'docker',      1),
  ('studio', 'exe-linux',   0),
  ('studio', 'exe-windows', 0);

-- Coming Soon products — all formats disabled by default
INSERT OR IGNORE INTO build_formats (product, format, enabled) VALUES
  ('vault',      'docker',      0),
  ('vault',      'exe-linux',   0),
  ('vault',      'exe-windows', 0),
  ('edge',       'docker',      0),
  ('edge',       'exe-linux',   0),
  ('edge',       'exe-windows', 0),
  ('soc',        'docker',      0),
  ('soc',        'exe-linux',   0),
  ('soc',        'exe-windows', 0),
  ('compliance', 'docker',      0),
  ('compliance', 'exe-linux',   0),
  ('compliance', 'exe-windows', 0),
  ('sentinel',   'docker',      0),
  ('sentinel',   'exe-linux',   0),
  ('sentinel',   'exe-windows', 0);
