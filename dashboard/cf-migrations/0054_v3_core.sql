-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- ==============================================================================
-- AXTO v3 — paid-subscription core.
--
-- Lean by design: D1 keeps only small relational rows. Everything bulky
-- (prompt content, documents, AI outputs, chat history, invoices) lives in R2
-- and is referenced here by key.
--
-- users.role keeps its original CHECK ('admin','client'); the app treats
-- 'client' as a paying/prospective "member".
-- ==============================================================================

ALTER TABLE users ADD COLUMN name          TEXT    NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN organization  TEXT    NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN country       TEXT    NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN status        TEXT    NOT NULL DEFAULT 'active';   -- active | suspended
ALTER TABLE users ADD COLUMN last_login_at TEXT    NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN storage_bytes INTEGER NOT NULL DEFAULT 0;           -- bytes used in R2
ALTER TABLE users ADD COLUMN ai_provider   TEXT    NOT NULL DEFAULT '';          -- BYOX: preferred provider

-- One subscription row per member (prepaid periods; renewals extend it).
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id              TEXT PRIMARY KEY,
  plan                 TEXT NOT NULL,                     -- starter | pro | business | enterprise
  cycle                TEXT NOT NULL DEFAULT 'monthly',   -- monthly | yearly
  status               TEXT NOT NULL DEFAULT 'active',    -- active | canceled | expired
  current_period_start TEXT NOT NULL,
  current_period_end   TEXT NOT NULL,
  last_order_id        TEXT NOT NULL DEFAULT '',
  reminded_at          TEXT NOT NULL DEFAULT '',          -- last renewal reminder sent
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subs_end ON subscriptions(status, current_period_end);

-- Orders = checkout attempts and payments (all gateways).
CREATE TABLE IF NOT EXISTS orders (
  id           TEXT PRIMARY KEY,                          -- ord_…
  invoice_no   TEXT NOT NULL DEFAULT '',
  user_id      TEXT NOT NULL,
  email        TEXT NOT NULL,
  plan         TEXT NOT NULL,
  cycle        TEXT NOT NULL,
  amount_usd   REAL NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'USD',
  amount_local REAL NOT NULL DEFAULT 0,
  gateway      TEXT NOT NULL,                             -- stripe | paypal | xendit | midtrans | nowpayments | manual
  gateway_ref  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending',           -- pending | paid | failed | expired | refunded
  meta         TEXT NOT NULL DEFAULT '{}',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_ref    ON orders(gateway, gateway_ref);

-- Self-hosted licences (replaces the legacy `licenses` table whose CHECK
-- constraint only allowed guardian/orchestra).
CREATE TABLE IF NOT EXISTS sh_licenses (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  product          TEXT NOT NULL,
  license_key      TEXT NOT NULL UNIQUE,
  package_code     TEXT NOT NULL,
  max_nodes        INTEGER NOT NULL DEFAULT 5,            -- -1 = unlimited
  status           TEXT NOT NULL DEFAULT 'active',        -- active | suspended | revoked
  expires_at       TEXT NOT NULL,
  bound_machine_id TEXT NOT NULL DEFAULT '',
  reset_count      INTEGER NOT NULL DEFAULT 0,
  last_seen_at     TEXT NOT NULL DEFAULT '',
  last_version     TEXT NOT NULL DEFAULT '',
  last_ip          TEXT NOT NULL DEFAULT '',
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shl_user_product ON sh_licenses(user_id, product);

-- BYOX usage (member's own AI keys) — statistics + Clipper monthly quota.
CREATE TABLE IF NOT EXISTS byox_usage (
  user_id        TEXT NOT NULL,
  month          TEXT NOT NULL,                           -- YYYY-MM
  requests       INTEGER NOT NULL DEFAULT 0,
  clipper_videos INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

-- MANAGED usage (AXTO-provided AI) — kept completely separate from BYOX.
CREATE TABLE IF NOT EXISTS managed_usage (
  user_id      TEXT NOT NULL,
  month        TEXT NOT NULL,                             -- YYYY-MM
  credits_used INTEGER NOT NULL DEFAULT 0,
  tokens       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

-- Index of member files; the bytes live in R2 (USER_FILES bucket).
CREATE TABLE IF NOT EXISTS files (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  app        TEXT NOT NULL,                               -- legal | studio | vault | compliance | security | prompts
  kind       TEXT NOT NULL DEFAULT 'output',              -- output | upload | chat
  title      TEXT NOT NULL,
  r2_key     TEXT NOT NULL,
  mime       TEXT NOT NULL DEFAULT 'application/json',
  size       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id, app, updated_at);

-- MANAGED subscriptions (AXTO-provided AI) — separate from BYOX `subscriptions`.
-- Locked until platform_config.managed_enabled = '1'.
CREATE TABLE IF NOT EXISTS managed_subscriptions (
  user_id            TEXT PRIMARY KEY,
  plan               TEXT NOT NULL,                       -- managed_lite | managed_plus | managed_max
  status             TEXT NOT NULL DEFAULT 'active',
  current_period_end TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- BYOX credentials: the member's own keys / endpoints (AES-GCM, ENCRYPTION_KEY).
-- Never read by the Managed path.
CREATE TABLE IF NOT EXISTS user_ai_keys (
  user_id    TEXT NOT NULL,
  provider   TEXT NOT NULL,                               -- anthropic | openai | google | groq | openrouter | deepgram | custom
  key_enc    TEXT NOT NULL,                               -- {"value","model","baseUrl"}
  hint       TEXT NOT NULL DEFAULT '',                    -- last 4 chars, for display
  model      TEXT NOT NULL DEFAULT '',                    -- preferred model (not secret)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, provider)
);

-- Sequential counters (invoice numbers).
CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

-- The Free Full-Access Program has ended: remove its switches.
DELETE FROM platform_config WHERE key IN ('free_access_enabled', 'free_access_start', 'free_access_end');
