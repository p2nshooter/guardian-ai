-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- ==============================================================================
-- AXTO v3.2 — Lifetime (perpetual, OFFLINE) self-hosted licences.
--   lifetime_licenses    one row per purchase (or admin-issued deal)
--   lifetime_activations one row per (licence, app, device) — each yields an
--                        Ed25519-signed .axto-license file the engine verifies
--                        locally, with no connection to axto.io.
-- The device limit applies PER APP: a 5-device suite licence lets each of the
-- 10 apps run on up to 5 devices. Orders reuse the `orders` table with
-- plan = 'lifetime', cycle = 'once' and the choice in meta.lifetime.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS lifetime_licenses (
  id             TEXT PRIMARY KEY,                          -- LT-XXXXXXXXXXXX
  user_id        TEXT NOT NULL,
  order_id       TEXT NOT NULL DEFAULT '',                  -- '' = issued by an admin
  scope          TEXT NOT NULL CHECK (scope IN ('app', 'suite')),
  product        TEXT NOT NULL,                             -- app slug, or 'suite'
  devices        INTEGER NOT NULL CHECK (devices BETWEEN 1 AND 100),
  major_version  INTEGER NOT NULL DEFAULT 3,
  updates_until  TEXT NOT NULL,                             -- downloads of new builds allowed until
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  note           TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lifetime_user  ON lifetime_licenses(user_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lifetime_order ON lifetime_licenses(order_id) WHERE order_id != '';

CREATE TABLE IF NOT EXISTS lifetime_activations (
  id           TEXT PRIMARY KEY,
  license_id   TEXT NOT NULL,
  product      TEXT NOT NULL,
  machine_id   TEXT NOT NULL,
  label        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  revoked_at   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_lifetime_act ON lifetime_activations(license_id, product);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lifetime_act_live ON lifetime_activations(license_id, product, machine_id) WHERE revoked_at = '';
