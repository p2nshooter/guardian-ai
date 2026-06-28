-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- AXTO Platform — D1 Schema (Complete)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client')),
  password_hash TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS magic_links (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_magic_token ON magic_links(token);

CREATE TABLE IF NOT EXISTS clients (
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

CREATE TABLE IF NOT EXISTS license_packages (
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

INSERT OR IGNORE INTO license_packages (id, code, name, product, price_usd, max_nodes, sort_order) VALUES
  ('lp01','lite','Guardian Lite','guardian',149,1,1),
  ('lp02','pro','Guardian Pro','guardian',599,10,2),
  ('lp03','shield','Guardian Shield','guardian',2999,100,3),
  ('lp04','aegis','Guardian Aegis','guardian',12999,1000,4),
  ('lp05','orchestra_core','Orchestra Core','orchestra',5900,10,5),
  ('lp06','orchestra_scale','Orchestra Scale','orchestra',17900,50,6),
  ('lp07','orchestra_unlimited','Orchestra Unlimited','orchestra',34900,-1,7);

CREATE TABLE IF NOT EXISTS licenses (
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
CREATE INDEX IF NOT EXISTS idx_lic_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_lic_client ON licenses(client_id);
CREATE INDEX IF NOT EXISTS idx_lic_status ON licenses(status);

CREATE TABLE IF NOT EXISTS license_nodes (
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

CREATE TABLE IF NOT EXISTS license_heartbeats (
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

CREATE TABLE IF NOT EXISTS invoices (
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
CREATE INDEX IF NOT EXISTS idx_inv_ref ON invoices(payment_ref);
CREATE INDEX IF NOT EXISTS idx_inv_email ON invoices(client_email);

CREATE TABLE IF NOT EXISTS payment_gateways (
  id              TEXT PRIMARY KEY,
  gateway         TEXT NOT NULL UNIQUE CHECK (gateway IN ('stripe','paypal','xendit','midtrans')),
  credentials_enc TEXT NOT NULL DEFAULT '',
  meta            TEXT NOT NULL DEFAULT '{}',
  is_active       INTEGER NOT NULL DEFAULT 0,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO payment_gateways (id, gateway) VALUES
  ('gw01','stripe'),('gw02','paypal'),('gw03','xendit'),('gw04','midtrans');

CREATE TABLE IF NOT EXISTS site_settings (
  id         TEXT PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO site_settings (id, key, value) VALUES
  ('ss001','hero_guardian_title','AI-Powered Cybersecurity'),
  ('ss002','hero_guardian_subtitle','Protect every server 24/7 with behavioral threat detection'),
  ('ss003','hero_orchestra_title','AI Workflow Orchestration'),
  ('ss004','hero_orchestra_subtitle','Route AI workloads across GPU clusters intelligently'),
  ('ss005','stats_licenses_total','500+'),
  ('ss006','stats_servers_protected','10,000+'),
  ('ss007','stats_uptime','99.9%');

CREATE TABLE IF NOT EXISTS site_content (
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
