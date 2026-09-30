-- ============================================================================
-- 0036_trial_usdt_activation.sql
-- Additive only. Safe to apply on top of existing data.
--   1. trial_requests   — client-submitted trial requests awaiting admin accept
--   2. usdt_payments    — USDT TRC20 payment intents + on-chain settlement state
--   3. licenses.*       — activation reporting fields (fingerprint, username,
--                         activated_at, activation_ip) so client activations show
--                         up in the admin panel with full detail.
-- ============================================================================

-- ── 1. Trial requests ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trial_requests (
  id            TEXT PRIMARY KEY,
  user_email    TEXT NOT NULL,
  product       TEXT NOT NULL,
  package_code  TEXT NOT NULL DEFAULT '',
  company       TEXT NOT NULL DEFAULT '',
  country       TEXT NOT NULL DEFAULT '',
  use_case      TEXT NOT NULL DEFAULT '',
  machine_hint  TEXT NOT NULL DEFAULT '',
  trial_days    INTEGER NOT NULL DEFAULT 14,        -- default 2-week trial
  status        TEXT NOT NULL DEFAULT 'pending',    -- pending | approved | rejected
  auto_approved INTEGER NOT NULL DEFAULT 0,
  requested_at  TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at    TEXT NOT NULL DEFAULT '',
  decided_by    TEXT NOT NULL DEFAULT '',
  license_id    TEXT NOT NULL DEFAULT '',
  meta          TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_trialreq_status ON trial_requests(status);
CREATE INDEX IF NOT EXISTS idx_trialreq_email  ON trial_requests(user_email);

-- ── 2. USDT TRC20 payments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usdt_payments (
  id             TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL UNIQUE,              -- ties an on-chain memo/amount to an order
  user_email     TEXT NOT NULL,
  product        TEXT NOT NULL,
  package_code   TEXT NOT NULL,
  amount_usdt    REAL NOT NULL,                     -- expected amount (incl. unique cents tag)
  deposit_address TEXT NOT NULL,                    -- TRC20 receiving address
  status         TEXT NOT NULL DEFAULT 'pending',   -- pending | confirmed | expired | mismatch
  tx_hash        TEXT NOT NULL DEFAULT '',
  from_address   TEXT NOT NULL DEFAULT '',
  confirmations  INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at     TEXT NOT NULL DEFAULT '',
  confirmed_at   TEXT NOT NULL DEFAULT '',
  license_id     TEXT NOT NULL DEFAULT '',
  meta           TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_usdt_status ON usdt_payments(status);
CREATE INDEX IF NOT EXISTS idx_usdt_order  ON usdt_payments(order_id);

-- ── 3. License activation reporting fields ───────────────────────────────────
-- (bound_machine_id already exists from earlier migrations; these add the rest.)
ALTER TABLE licenses ADD COLUMN fingerprint        TEXT NOT NULL DEFAULT '';
ALTER TABLE licenses ADD COLUMN activated_username TEXT NOT NULL DEFAULT '';
ALTER TABLE licenses ADD COLUMN activated_at       TEXT NOT NULL DEFAULT '';
ALTER TABLE licenses ADD COLUMN activation_ip      TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_lic_activated ON licenses(activated_at);
