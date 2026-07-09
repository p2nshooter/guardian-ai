-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- Migration 0006: Nuclear reset — drop & recreate all tables
-- This is safe because this is first deployment (no production data).
-- Creates ALL tables with the correct complete schema.
-- ============================================================

-- ── Drop everything and start clean ────────────────────────────────────
DROP TABLE IF EXISTS license_heartbeats;
DROP TABLE IF EXISTS license_nodes;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS licenses;
DROP TABLE IF EXISTS license_packages;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS magic_links;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS payment_gateways;
DROP TABLE IF EXISTS site_settings;
DROP TABLE IF EXISTS site_content;
DROP TABLE IF EXISTS autopost_platform_configs;
DROP TABLE IF EXISTS autopost_posts;
DROP TABLE IF EXISTS autopost_schedules;

-- ── Users ──────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client')),
  password_hash TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ── Magic Links ────────────────────────────────────────────────────────
CREATE TABLE magic_links (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_magic_token ON magic_links(token);

-- ── Clients ────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  country      TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- ── License Packages ───────────────────────────────────────────────────
CREATE TABLE license_packages (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  product     TEXT NOT NULL CHECK (product IN ('guardian','orchestra')),
  price_usd   REAL NOT NULL DEFAULT 0,
  max_nodes   INTEGER NOT NULL DEFAULT 1,
  max_workers INTEGER NOT NULL DEFAULT 0,
  features    TEXT NOT NULL DEFAULT '[]',
  is_active   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed packages with correct pricing
INSERT INTO license_packages (id, code, name, product, price_usd, max_nodes, max_workers, is_active, sort_order) VALUES
  ('lp01','lite',                 'Guardian Sentinel',   'guardian',    249,    1,   0, 1, 1),
  ('lp02','pro',                  'Guardian Pro',        'guardian',    990,   20,   0, 1, 2),
  ('lp03','shield',               'Guardian Business',   'guardian',   3990,  100,   0, 1, 3),
  ('lp04','aegis',                'Guardian Enterprise',  'guardian',  17900, 1000,   0, 1, 4),
  ('lp05','orchestra_core',       'Orchestra Core',      'orchestra',  9900,   10,  10, 1, 5),
  ('lp06','orchestra_scale',      'Orchestra Scale',     'orchestra', 24900,   50,  50, 1, 6),
  ('lp07','orchestra_unlimited',  'Orchestra Enterprise','orchestra', 59900,   -1,  -1, 1, 7),
  ('lp08','bundle_starter',       'Bundle Starter (Guardian Pro + Orchestra Core)',                    'guardian',  9490,  20,  10, 1, 8),
  ('lp09','bundle_professional',  'Bundle Professional (Guardian Business + Orchestra Scale)',         'guardian', 24900, 100,  50, 1, 9),
  ('lp10','bundle_enterprise',    'Bundle Enterprise (Guardian Enterprise + Orchestra Enterprise)',    'guardian', 69900, 1000, -1, 1, 10);

-- ── Licenses ───────────────────────────────────────────────────────────
CREATE TABLE licenses (
  id               TEXT PRIMARY KEY,
  client_id        TEXT NOT NULL,
  license_key      TEXT NOT NULL UNIQUE,
  product          TEXT NOT NULL DEFAULT 'guardian' CHECK (product IN ('guardian','orchestra')),
  package_code     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','expired','revoked')),
  gateway          TEXT NOT NULL DEFAULT 'manual',
  billing_cycle    TEXT NOT NULL DEFAULT 'yearly',
  amount_usd       REAL NOT NULL DEFAULT 0,
  expires_at       TEXT NOT NULL,
  bound_machine_id TEXT,
  max_nodes        INTEGER NOT NULL DEFAULT 1,
  max_resets       INTEGER NOT NULL DEFAULT 3,
  reset_count      INTEGER NOT NULL DEFAULT 0,
  notes            TEXT NOT NULL DEFAULT '',
  source           TEXT NOT NULL DEFAULT 'checkout',
  payment_ref      TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_lic_key    ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_lic_client ON licenses(client_id);
CREATE INDEX IF NOT EXISTS idx_lic_status ON licenses(status);

-- ── License Nodes ──────────────────────────────────────────────────────
CREATE TABLE license_nodes (
  id         TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  node_id    TEXT NOT NULL,
  node_name  TEXT NOT NULL DEFAULT '',
  ip         TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'active',
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (license_id) REFERENCES licenses(id)
);
CREATE INDEX IF NOT EXISTS idx_nodes_lic ON license_nodes(license_id);

-- ── License Heartbeats ─────────────────────────────────────────────────
CREATE TABLE license_heartbeats (
  id         TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  machine_id TEXT NOT NULL DEFAULT '',
  ip         TEXT NOT NULL DEFAULT '',
  product    TEXT NOT NULL DEFAULT 'unknown',
  node_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (license_id) REFERENCES licenses(id)
);
CREATE INDEX IF NOT EXISTS idx_hb_lic ON license_heartbeats(license_id);

-- ── Invoices ───────────────────────────────────────────────────────────
CREATE TABLE invoices (
  id           TEXT PRIMARY KEY,
  client_id    TEXT NOT NULL,
  license_id   TEXT,
  client_email TEXT NOT NULL DEFAULT '',
  amount_usd   REAL NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'USD',
  amount_local REAL NOT NULL DEFAULT 0,
  gateway      TEXT NOT NULL DEFAULT 'manual',
  payment_ref  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'paid',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_inv_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_inv_ref    ON invoices(payment_ref);
CREATE INDEX IF NOT EXISTS idx_inv_email  ON invoices(client_email);

-- ── Payment Gateways ───────────────────────────────────────────────────
CREATE TABLE payment_gateways (
  id              TEXT PRIMARY KEY,
  gateway         TEXT NOT NULL UNIQUE CHECK (gateway IN ('stripe','paypal','xendit','midtrans')),
  credentials_enc TEXT NOT NULL DEFAULT '',
  meta            TEXT NOT NULL DEFAULT '{}',
  is_active       INTEGER NOT NULL DEFAULT 0,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO payment_gateways (id, gateway) VALUES
  ('gw01','stripe'),('gw02','paypal'),('gw03','xendit'),('gw04','midtrans');

-- ── Site Settings ──────────────────────────────────────────────────────
CREATE TABLE site_settings (
  id         TEXT PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO site_settings (id, key, value) VALUES
  ('ss001','hero_guardian_title','AI-Powered Cybersecurity'),
  ('ss002','hero_guardian_subtitle','Protect every server 24/7 with behavioral threat detection'),
  ('ss003','hero_orchestra_title','AI Workflow Orchestration'),
  ('ss004','hero_orchestra_subtitle','Route AI workloads across GPU clusters intelligently'),
  ('ss005','stats_licenses_total','500+'),
  ('ss006','stats_servers_protected','10,000+'),
  ('ss007','stats_uptime','99.9%');

-- ── Site Content ───────────────────────────────────────────────────────
CREATE TABLE site_content (
  id         TEXT PRIMARY KEY,
  section    TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL DEFAULT '',
  meta       TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_content_section ON site_content(section, is_active, sort_order);

-- ── AutoPost Platform Configs ──────────────────────────────────────────
CREATE TABLE autopost_platform_configs (
  id          TEXT PRIMARY KEY,
  platform    TEXT NOT NULL UNIQUE,
  credentials TEXT NOT NULL DEFAULT '',
  is_active   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── AutoPost Posts ─────────────────────────────────────────────────────
CREATE TABLE autopost_posts (
  id                 TEXT PRIMARY KEY,
  template_id        TEXT NOT NULL DEFAULT '',
  platform           TEXT NOT NULL,
  platform_config_id TEXT NOT NULL DEFAULT '',
  platform_post_id   TEXT NOT NULL DEFAULT '',
  platform_url       TEXT NOT NULL DEFAULT '',
  category           TEXT NOT NULL DEFAULT '',
  title              TEXT NOT NULL DEFAULT '',
  body_text          TEXT NOT NULL DEFAULT '',
  image_url          TEXT NOT NULL DEFAULT '',
  hashtags           TEXT NOT NULL DEFAULT '[]',
  metadata           TEXT NOT NULL DEFAULT '{}',
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','failed')),
  error_msg          TEXT NOT NULL DEFAULT '',
  error_message      TEXT NOT NULL DEFAULT '',
  scheduled_at       TEXT,
  published_at       TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_status ON autopost_posts(status);

-- ── AutoPost Schedules ─────────────────────────────────────────────────
CREATE TABLE autopost_schedules (
  id         TEXT PRIMARY KEY,
  platform   TEXT NOT NULL,
  frequency  TEXT NOT NULL DEFAULT 'daily',
  language   TEXT NOT NULL DEFAULT 'en',
  is_active  INTEGER NOT NULL DEFAULT 1,
  last_run   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Admin seed ─────────────────────────────────────────────────────────
INSERT OR IGNORE INTO users (id, email, role, password_hash, created_at, updated_at)
VALUES (
  'admin-001',
  'alghoniy2026@gmail.com',
  'admin',
  'SET_VIA_ADMIN_PASSWORD_ENV',
  datetime('now'),
  datetime('now')
);
