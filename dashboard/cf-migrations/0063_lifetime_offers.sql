-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- ==============================================================================
-- Customer offers on lifetime licences (docs/AXTO-APPS-BLUEPRINT.md §15).
-- A signed-in member proposes a price for one app or the Suite at a device tier;
-- the admin accepts, counters or declines it by hand. An accepted / countered
-- price can be paid until valid_until; the paid order issues the licence as usual.
--
-- status: pending   — waiting for the admin
--         accepted  — admin accepted the member's price (agreed_usd = offer_usd)
--         countered — admin proposed agreed_usd instead
--         declined  — admin said no (admin_note = the reason the member sees)
--         withdrawn — the member took it back
--         expired   — not paid before valid_until (set lazily)
--         paid      — an order at agreed_usd was paid (order_id)
-- The Friday deals live in platform_config 'lifetime_deals' (JSON, Admin → Lifetime).
CREATE TABLE IF NOT EXISTS lifetime_offers (
  id          TEXT PRIMARY KEY,                    -- lof_…
  user_id     TEXT NOT NULL,
  email       TEXT NOT NULL,
  scope       TEXT NOT NULL,                       -- app | suite
  product     TEXT NOT NULL,                       -- self-hosted slug, or 'suite'
  devices     INTEGER NOT NULL,                    -- tier (1 · 5 · 10 · 25 · 50 · 100)
  list_usd    INTEGER NOT NULL,                    -- list price when the offer was made
  offer_usd   INTEGER NOT NULL,                    -- the member's price
  note        TEXT NOT NULL DEFAULT '',            -- the member's message
  status      TEXT NOT NULL DEFAULT 'pending',
  agreed_usd  INTEGER NOT NULL DEFAULT 0,
  admin_note  TEXT NOT NULL DEFAULT '',
  decided_by  TEXT NOT NULL DEFAULT '',
  decided_at  TEXT NOT NULL DEFAULT '',
  valid_until TEXT NOT NULL DEFAULT '',
  order_id    TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lof_user ON lifetime_offers(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lof_status ON lifetime_offers(status, created_at);
