-- ── Migration 0013: OAuth State & Token Storage for AutoPost ──────────────
-- Adds table to track OAuth flow states (PKCE/state parameter)
-- and extends platform_configs with oauth metadata

-- OAuth state table: tracks in-progress OAuth flows
CREATE TABLE IF NOT EXISTS autopost_oauth_states (
  id          TEXT PRIMARY KEY,
  platform    TEXT NOT NULL,
  state       TEXT NOT NULL UNIQUE,   -- random CSRF token
  code_verifier TEXT NOT NULL DEFAULT '', -- PKCE code verifier (for Twitter OAuth2)
  redirect_uri TEXT NOT NULL DEFAULT '',
  expires_at  TEXT NOT NULL,          -- short expiry (10 minutes)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_oauth_state ON autopost_oauth_states(state);

-- Extend platform_configs: add oauth-specific columns
ALTER TABLE autopost_platform_configs ADD COLUMN oauth_connected INTEGER NOT NULL DEFAULT 0;
ALTER TABLE autopost_platform_configs ADD COLUMN oauth_account_name TEXT NOT NULL DEFAULT '';
ALTER TABLE autopost_platform_configs ADD COLUMN oauth_account_id TEXT NOT NULL DEFAULT '';
ALTER TABLE autopost_platform_configs ADD COLUMN oauth_scopes TEXT NOT NULL DEFAULT '';
ALTER TABLE autopost_platform_configs ADD COLUMN token_expires_at TEXT;
ALTER TABLE autopost_platform_configs ADD COLUMN refresh_token TEXT NOT NULL DEFAULT '';

-- Clean up expired OAuth states (run periodically)
-- DELETE FROM autopost_oauth_states WHERE expires_at < datetime('now');
