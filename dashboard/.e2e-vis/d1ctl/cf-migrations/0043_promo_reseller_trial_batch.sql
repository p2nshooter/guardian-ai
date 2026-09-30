-- ============================================================================
-- 0043_promo_reseller_trial_batch.sql
-- Additive only. Safe to apply on top of existing data.
--   1. promo_pricing         — time-boxed promotional price overrides, admin
--                              show/hide, layered on top of license_packages
--   2. resellers             — reseller accounts + cumulative sales volume
--   3. reseller_commission_tiers — volume thresholds -> commission % (max 25)
--   4. reseller_sales        — one row per commissioned sale
--   5. trial_batch_codes     — admin-generated trial codes, 100 per
--                              product+package tier, hand-distributed
--   6. trial_promo_config    — the axto.io launch-promo 1-year claim window
-- ============================================================================

-- ── 1. Promo pricing ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_pricing (
  id                   TEXT PRIMARY KEY,
  package_code         TEXT NOT NULL,
  product              TEXT NOT NULL,
  label                TEXT NOT NULL DEFAULT '',
  promo_price          REAL NOT NULL,
  promo_price_monthly  REAL NOT NULL DEFAULT 0,
  starts_at            TEXT NOT NULL,
  ends_at              TEXT NOT NULL,
  enabled              INTEGER NOT NULL DEFAULT 1,
  created_by           TEXT NOT NULL DEFAULT '',
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_promo_package ON promo_pricing(package_code);
CREATE INDEX IF NOT EXISTS idx_promo_window  ON promo_pricing(enabled, starts_at, ends_at);

-- ── 2. Resellers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resellers (
  id               TEXT PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL DEFAULT '',
  company          TEXT NOT NULL DEFAULT '',
  referral_code    TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'active',   -- active | suspended
  total_sales_usd  REAL NOT NULL DEFAULT 0,           -- cumulative, drives tier
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reseller_code   ON resellers(referral_code);
CREATE INDEX IF NOT EXISTS idx_reseller_status ON resellers(status);

-- ── 3. Commission tiers (volume-based, max 25%) ────────────────────────────────
CREATE TABLE IF NOT EXISTS reseller_commission_tiers (
  id              TEXT PRIMARY KEY,
  tier_name       TEXT NOT NULL,
  min_volume_usd  REAL NOT NULL,     -- cumulative sales required to reach this tier
  commission_pct  REAL NOT NULL,     -- 0-25
  sort_order      INTEGER NOT NULL DEFAULT 0
);
-- Seed a sensible default ladder (admin can edit/replace via CRUD).
INSERT OR IGNORE INTO reseller_commission_tiers (id, tier_name, min_volume_usd, commission_pct, sort_order) VALUES
  ('tier-starter',  'Starter',   0,      10, 0),
  ('tier-silver',   'Silver',    10000,  15, 1),
  ('tier-gold',     'Gold',      50000,  20, 2),
  ('tier-platinum', 'Platinum',  150000, 25, 3);

-- ── 4. Reseller sales / commission ledger ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS reseller_sales (
  id                TEXT PRIMARY KEY,
  reseller_id       TEXT NOT NULL,
  license_id        TEXT NOT NULL DEFAULT '',
  client_email      TEXT NOT NULL DEFAULT '',
  order_amount_usd  REAL NOT NULL,
  commission_pct    REAL NOT NULL,
  commission_usd    REAL NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | void
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at           TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_resale_reseller ON reseller_sales(reseller_id);
CREATE INDEX IF NOT EXISTS idx_resale_status   ON reseller_sales(status);

-- ── 5. Trial batch codes (admin-generated, 100 per product+tier) ──────────────
CREATE TABLE IF NOT EXISTS trial_batch_codes (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  product               TEXT NOT NULL,
  package_code          TEXT NOT NULL,
  batch_id              TEXT NOT NULL,               -- groups one generation run
  status                TEXT NOT NULL DEFAULT 'available', -- available | claimed | disabled
  claimed_email         TEXT NOT NULL DEFAULT '',
  claimed_ip            TEXT NOT NULL DEFAULT '',
  claimed_fingerprint   TEXT NOT NULL DEFAULT '',
  license_id            TEXT NOT NULL DEFAULT '',
  claimed_at            TEXT NOT NULL DEFAULT '',
  disabled_at           TEXT NOT NULL DEFAULT '',
  created_by            TEXT NOT NULL DEFAULT '',
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trialbatch_lookup ON trial_batch_codes(product, package_code, status);
CREATE INDEX IF NOT EXISTS idx_trialbatch_code   ON trial_batch_codes(code);
CREATE INDEX IF NOT EXISTS idx_trialbatch_email  ON trial_batch_codes(claimed_email);
CREATE INDEX IF NOT EXISTS idx_trialbatch_batch  ON trial_batch_codes(batch_id);

-- ── 6. Launch-promo self-service trial window (single config row) ─────────────
CREATE TABLE IF NOT EXISTS trial_promo_config (
  id         TEXT PRIMARY KEY DEFAULT 'axto_launch',
  starts_at  TEXT NOT NULL,
  ends_at    TEXT NOT NULL,     -- claim window: starts_at + 1 year
  enabled    INTEGER NOT NULL DEFAULT 1
);
