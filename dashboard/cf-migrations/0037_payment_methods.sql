-- ============================================================================
-- 0037_payment_methods.sql   (additive)
--   1. payment_methods  — admin-editable registry. Everything is OFF by default
--      EXCEPT the four crypto methods the owner enabled: USDT, BNB, ETH, BTC.
--      Disabled methods must be hidden everywhere (UI + API filter on enabled=1).
--   2. crypto_payments   — generalized multi-chain payment intents + settlement
--      (supersedes the USDT-only table; that one is kept for back-compat).
--
--  ⚠️  ADDRESSES BELOW ARE SEED DEFAULTS — VERIFY EACH IN THE ADMIN PANEL BEFORE
--      GOING LIVE. A single wrong character means funds are lost. They are stored
--      here (not in source code) precisely so an admin can correct them safely.
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id            TEXT PRIMARY KEY,          -- 'btc' | 'eth' | 'bnb' | 'usdt_trc20' | 'stripe' ...
  symbol        TEXT NOT NULL,             -- BTC | ETH | BNB | USDT
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'crypto', -- 'crypto' | 'fiat'
  network       TEXT NOT NULL DEFAULT '',  -- Bitcoin | Ethereum | BEP20 | TRC20
  kind          TEXT NOT NULL DEFAULT 'native', -- native | erc20 | bep20 | trc20
  address       TEXT NOT NULL DEFAULT '',
  contract      TEXT NOT NULL DEFAULT '',  -- token contract (empty for native coins)
  decimals      INTEGER NOT NULL DEFAULT 8,
  confirmations INTEGER NOT NULL DEFAULT 1,
  enabled       INTEGER NOT NULL DEFAULT 0, -- 0 = OFF (hidden everywhere)
  sort_order    INTEGER NOT NULL DEFAULT 100,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_paymethod_enabled ON payment_methods(enabled);

-- ── The four ENABLED crypto methods (verify addresses before production) ─────
INSERT OR IGNORE INTO payment_methods
  (id, symbol, name, category, network, kind, address, contract, decimals, confirmations, enabled, sort_order)
VALUES
  ('usdt_trc20','USDT','Tether USD (TRC20)','crypto','TRC20','trc20',
   'TNo8jgJqmnUGAPUDb159cC8uhAeFDP8keW','TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',6,20,1,10),
  ('bnb','BNB','BNB (BEP20)','crypto','BEP20','native',
   '0x1bed722b27b3d2bdab3dfe06ea75b84a3a824f3d','',18,12,1,20),
  ('eth','ETH','Ethereum (ERC)','crypto','Ethereum','native',
   '0x1bed722b27b3d2bdab3dfe06ea75b84a3a824f3d','',18,50,1,30),
  ('btc','BTC','Bitcoin','crypto','Bitcoin','native',
   '1AzqohLY6XPGbabHmMhstYMPFUThoiBnya','',8,1,1,40);

-- ── Fiat gateways: present but DISABLED by default (hidden until enabled) ────
INSERT OR IGNORE INTO payment_methods
  (id, symbol, name, category, network, kind, address, decimals, confirmations, enabled, sort_order)
VALUES
  ('stripe','USD','Card (Stripe)','fiat','','native','',2,0,0,100),
  ('paypal','USD','PayPal','fiat','','native','',2,0,0,110),
  ('xendit','IDR','Xendit','fiat','','native','',2,0,0,120),
  ('midtrans','IDR','Midtrans','fiat','','native','',2,0,0,130);

-- ── Generalized multi-chain payments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crypto_payments (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL UNIQUE,
  method_id       TEXT NOT NULL,            -- FK → payment_methods.id
  user_email      TEXT NOT NULL,
  product         TEXT NOT NULL,
  package_code    TEXT NOT NULL,
  amount_usd      REAL NOT NULL,            -- price in USD
  amount_crypto   REAL NOT NULL,            -- exact coin/token amount to send (with unique tag)
  symbol          TEXT NOT NULL,
  network         TEXT NOT NULL,
  deposit_address TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending|confirmed|expired|mismatch
  tx_hash         TEXT NOT NULL DEFAULT '',
  from_address    TEXT NOT NULL DEFAULT '',
  confirmations   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT NOT NULL DEFAULT '',
  confirmed_at    TEXT NOT NULL DEFAULT '',
  license_id      TEXT NOT NULL DEFAULT '',
  invoice_id      TEXT NOT NULL DEFAULT '',
  meta            TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_cryptopay_status ON crypto_payments(status);
CREATE INDEX IF NOT EXISTS idx_cryptopay_method ON crypto_payments(method_id);
CREATE INDEX IF NOT EXISTS idx_cryptopay_order  ON crypto_payments(order_id);
