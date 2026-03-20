CREATE TABLE IF NOT EXISTS autopost_platform_configs (
  id          TEXT PRIMARY KEY,
  platform    TEXT NOT NULL UNIQUE,
  credentials TEXT NOT NULL DEFAULT '',
  is_active   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS autopost_posts (
  id           TEXT PRIMARY KEY,
  template_id  TEXT NOT NULL DEFAULT '',
  platform     TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT '',
  title        TEXT NOT NULL DEFAULT '',
  body_text    TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','failed')),
  error_msg    TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT,
  published_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_status ON autopost_posts(status);

CREATE TABLE IF NOT EXISTS autopost_schedules (
  id         TEXT PRIMARY KEY,
  platform   TEXT NOT NULL,
  frequency  TEXT NOT NULL DEFAULT 'daily',
  language   TEXT NOT NULL DEFAULT 'en',
  is_active  INTEGER NOT NULL DEFAULT 1,
  last_run   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
