-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- ==============================================================================
-- The AXTO investor round (/invest, lib/invest.ts) — AXTO only.
--
-- Owner, 19 Oct 2026: "Maksudnya masing2 web nyari investornya, bukan
-- gabungan" — axto.io and xaa.es each raise from their own investors; the
-- joint AXTO & XAA raise planned on 14 Oct is replaced. One row per
-- application; the studio verifies the capital it received, and from that
-- moment the investor's share of AXTO revenue (paid axto.io orders, never
-- sandbox, investment or acquisition orders) is computed. Monthly payouts are
-- recorded so the investor's statement shows what is due and what is open.
CREATE TABLE IF NOT EXISTS investors (
  id           TEXT PRIMARY KEY,                       -- inv_…
  user_id      TEXT NOT NULL DEFAULT '',               -- the applying account, when signed in
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  company      TEXT NOT NULL DEFAULT '',
  country      TEXT NOT NULL DEFAULT '',
  pledge_usd   INTEGER NOT NULL,                       -- amount stated in the application
  capital_usd  INTEGER NOT NULL DEFAULT 0,             -- capital received (set at verification)
  method       TEXT NOT NULL DEFAULT 'wire',           -- wire | paypal
  status       TEXT NOT NULL DEFAULT 'applied',        -- applied | verified | declined | returned
  lang         TEXT NOT NULL DEFAULT 'en',
  message      TEXT NOT NULL DEFAULT '',
  note         TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  verified_at  TEXT NOT NULL DEFAULT '',
  verified_by  TEXT NOT NULL DEFAULT '',
  returned_at  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_investors_email  ON investors(email, status);
CREATE INDEX IF NOT EXISTS idx_investors_status ON investors(status, created_at);

CREATE TABLE IF NOT EXISTS investor_payouts (
  id           TEXT PRIMARY KEY,                       -- ipo_…
  investor_id  TEXT NOT NULL,
  period       TEXT NOT NULL,                          -- YYYY-MM
  amount_usd   REAL NOT NULL,
  reference    TEXT NOT NULL DEFAULT '',
  paid_at      TEXT NOT NULL,
  created_by   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_investor_payouts ON investor_payouts(investor_id, period);
