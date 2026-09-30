-- AXTO Connect — developer API keys, realtime events and webhooks.
-- Keys are stored as SHA-256 digests only (the key itself is shown once).
-- Event payloads and webhook signing secrets are encrypted per member
-- (AES-256-GCM, lib/user-crypto) before they reach this database.

CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  name         TEXT NOT NULL,
  prefix       TEXT NOT NULL,           -- first characters, to recognise a key in lists
  hash         TEXT NOT NULL UNIQUE,    -- SHA-256 of the full key (hex)
  scopes       TEXT NOT NULL,           -- space-separated: ai:run events:read events:write rtc mcp
  origins      TEXT NOT NULL DEFAULT '',-- space-separated browser origins allowed (CORS); empty = server-side only
  created_at   TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

CREATE TABLE IF NOT EXISTS connect_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  channel    TEXT NOT NULL,
  type       TEXT NOT NULL,
  data       TEXT NOT NULL,             -- base64 of the per-member sealed JSON
  size       INTEGER NOT NULL DEFAULT 0,
  source     TEXT NOT NULL DEFAULT '',  -- key id, "app" or "webhook-test"
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_connect_events_user ON connect_events(user_id, id);
CREATE INDEX IF NOT EXISTS idx_connect_events_created ON connect_events(created_at);

CREATE TABLE IF NOT EXISTS webhooks (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  url              TEXT NOT NULL,
  secret_enc       TEXT NOT NULL,       -- base64 of the per-member sealed signing secret
  channels         TEXT NOT NULL DEFAULT '*',
  types            TEXT NOT NULL DEFAULT '*',
  active           INTEGER NOT NULL DEFAULT 1,
  failures         INTEGER NOT NULL DEFAULT 0,
  last_status      INTEGER,
  last_error       TEXT,
  last_delivery_at TEXT,
  created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id          TEXT PRIMARY KEY,
  webhook_id  TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  event_id    INTEGER NOT NULL,
  attempt     INTEGER NOT NULL DEFAULT 0,
  status      INTEGER,                  -- HTTP status of the last attempt (0 = network error)
  duration_ms INTEGER,
  error       TEXT,
  done        INTEGER NOT NULL DEFAULT 0,
  next_at     TEXT,                     -- when to retry (NULL when done)
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id, created_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_due ON webhook_deliveries(done, next_at);
