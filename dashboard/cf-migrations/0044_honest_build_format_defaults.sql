-- ============================================================================
-- 0044_honest_build_format_defaults.sql
-- Additive/corrective. Safe to apply on top of existing data.
--
-- Migration 0032 seeded build_formats with exe-linux=1 / exe-windows=1 for
-- guardian and antivirus. That is dishonest: NO CI workflow builds a
-- standalone Linux binary for any product, and the Windows .exe artifacts
-- have not been verified as production-ready running binaries. Per the
-- product owner's rule — an EXE download may only be ON after it is proven
-- 100% running — reset every product to the honest baseline:
--
--   docker      → ON  (CI builds a real Docker image for all 10 products)
--   exe-linux   → OFF (no such artifact is produced anywhere)
--   exe-windows → OFF (must be verified before an admin turns it ON)
--
-- Admins can still flip any format ON later via Admin → Releases; those
-- edits persist (this migration runs exactly once).
-- ============================================================================

-- Make sure the table exists (0032 may have been among the migrations that
-- were historically blocked; the API also self-heals, but be explicit here).
CREATE TABLE IF NOT EXISTS build_formats (
  product     TEXT NOT NULL,
  format      TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (product, format)
);

-- Docker ON for every product (real, CI-built).
INSERT INTO build_formats (product, format, enabled, updated_at) VALUES
  ('guardian',  'docker', 1, datetime('now')),
  ('orchestra', 'docker', 1, datetime('now')),
  ('vault',     'docker', 1, datetime('now')),
  ('edge',      'docker', 1, datetime('now')),
  ('soc',       'docker', 1, datetime('now')),
  ('compliance','docker', 1, datetime('now')),
  ('sentinel',  'docker', 1, datetime('now')),
  ('antivirus', 'docker', 1, datetime('now')),
  ('studio',    'docker', 1, datetime('now')),
  ('legal',     'docker', 1, datetime('now'))
ON CONFLICT(product, format) DO UPDATE SET enabled = 1, updated_at = datetime('now');

-- Every EXE format OFF for every product until individually verified.
INSERT INTO build_formats (product, format, enabled, updated_at) VALUES
  ('guardian',  'exe-linux',   0, datetime('now')),
  ('guardian',  'exe-windows', 0, datetime('now')),
  ('orchestra', 'exe-linux',   0, datetime('now')),
  ('orchestra', 'exe-windows', 0, datetime('now')),
  ('vault',     'exe-linux',   0, datetime('now')),
  ('vault',     'exe-windows', 0, datetime('now')),
  ('edge',      'exe-linux',   0, datetime('now')),
  ('edge',      'exe-windows', 0, datetime('now')),
  ('soc',       'exe-linux',   0, datetime('now')),
  ('soc',       'exe-windows', 0, datetime('now')),
  ('compliance','exe-linux',   0, datetime('now')),
  ('compliance','exe-windows', 0, datetime('now')),
  ('sentinel',  'exe-linux',   0, datetime('now')),
  ('sentinel',  'exe-windows', 0, datetime('now')),
  ('antivirus', 'exe-linux',   0, datetime('now')),
  ('antivirus', 'exe-windows', 0, datetime('now')),
  ('studio',    'exe-linux',   0, datetime('now')),
  ('studio',    'exe-windows', 0, datetime('now')),
  ('legal',     'exe-linux',   0, datetime('now')),
  ('legal',     'exe-windows', 0, datetime('now'))
ON CONFLICT(product, format) DO UPDATE SET enabled = 0, updated_at = datetime('now');
