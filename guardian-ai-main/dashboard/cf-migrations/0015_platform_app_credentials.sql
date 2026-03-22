-- Migration 0015: Store OAuth App Credentials in D1
-- Admin inputs App ID/Secret per platform once → stored here → no env var needed

CREATE TABLE IF NOT EXISTS platform_app_credentials (
  id          TEXT PRIMARY KEY,
  platform    TEXT NOT NULL UNIQUE,  -- 'facebook', 'twitter', 'linkedin', etc.
  app_id      TEXT NOT NULL DEFAULT '',
  app_secret  TEXT NOT NULL DEFAULT '',
  extra       TEXT NOT NULL DEFAULT '{}', -- JSON for extra fields (e.g. tiktok client_key)
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
