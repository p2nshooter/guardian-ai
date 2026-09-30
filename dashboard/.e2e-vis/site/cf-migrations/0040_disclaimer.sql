-- ============================================================================
-- 0040_disclaimer.sql  (additive)
-- Records each client's acceptance of the master disclaimer. A client must have
-- accepted the CURRENT version before they can download or use any application.
-- ============================================================================
CREATE TABLE IF NOT EXISTS disclaimer_acceptances (
  id          TEXT PRIMARY KEY,
  user_email  TEXT NOT NULL,
  version     TEXT NOT NULL,
  product     TEXT NOT NULL DEFAULT 'all',
  accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip          TEXT NOT NULL DEFAULT '',
  user_agent  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_disc_email   ON disclaimer_acceptances(user_email);
CREATE INDEX IF NOT EXISTS idx_disc_version ON disclaimer_acceptances(version);
