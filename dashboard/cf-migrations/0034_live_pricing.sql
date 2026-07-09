-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════
-- Migration 0034: Seed live pricing into license_packages
-- ═══════════════════════════════════════════════════════════════════
-- Purpose: Populate price_usd and price_monthly columns so that
--   /api/admin/pricing can read and write live prices from the DB,
--   without requiring a code deploy to change prices.
--
-- These values MUST match lib/stripe.ts (canonical TS prices) at the
-- time this migration is written. After this migration runs, the DB
-- becomes the source of truth for runtime pricing — lib/stripe.ts
-- values become the fallback-only defaults used when DB is unavailable.
--
-- Business tier for Edge/SOC/Compliance/Sentinel: calculated by
-- preserving the geometric proportional position of the old Business
-- tier between the new Professional and Enterprise prices.
-- ═══════════════════════════════════════════════════════════════════

-- Guardian AI ─────────────────────────────────────────────────────
UPDATE license_packages SET price_usd = 990,   price_monthly = 99,   updated_at = datetime('now') WHERE code = 'lite';
UPDATE license_packages SET price_usd = 4990,  price_monthly = 499,  updated_at = datetime('now') WHERE code = 'pro';
UPDATE license_packages SET price_usd = 19900, price_monthly = 1990, updated_at = datetime('now') WHERE code = 'shield';
UPDATE license_packages SET price_usd = 79000, price_monthly = 7900, updated_at = datetime('now') WHERE code = 'aegis';

-- Orchestra AI ────────────────────────────────────────────────────
UPDATE license_packages SET price_usd = 34900,  price_monthly = 3490,  updated_at = datetime('now') WHERE code = 'orchestra_core';
UPDATE license_packages SET price_usd = 89900,  price_monthly = 8990,  updated_at = datetime('now') WHERE code = 'orchestra_scale';
UPDATE license_packages SET price_usd = 249000, price_monthly = 24900, updated_at = datetime('now') WHERE code = 'orchestra_unlimited';

-- Vault AI ────────────────────────────────────────────────────────
UPDATE license_packages SET price_usd = 4990,   price_monthly = 499,   updated_at = datetime('now') WHERE code = 'vault_starter';
UPDATE license_packages SET price_usd = 14900,  price_monthly = 1490,  updated_at = datetime('now') WHERE code = 'vault_professional';
UPDATE license_packages SET price_usd = 39900,  price_monthly = 3990,  updated_at = datetime('now') WHERE code = 'vault_business';
UPDATE license_packages SET price_usd = 119000, price_monthly = 11900, updated_at = datetime('now') WHERE code = 'vault_enterprise';

-- Edge AI ─────────────────────────────────────────────────────────
UPDATE license_packages SET price_usd = 7990,  price_monthly = 799,  updated_at = datetime('now') WHERE code = 'edge_starter';
UPDATE license_packages SET price_usd = 24900, price_monthly = 2490, updated_at = datetime('now') WHERE code = 'edge_professional';
UPDATE license_packages SET price_usd = 40900, price_monthly = 4090, updated_at = datetime('now') WHERE code = 'edge_business';
UPDATE license_packages SET price_usd = 69000, price_monthly = 6900, updated_at = datetime('now') WHERE code = 'edge_enterprise';

-- SOC AI ──────────────────────────────────────────────────────────
UPDATE license_packages SET price_usd = 24900,  price_monthly = 2490,  updated_at = datetime('now') WHERE code = 'soc_starter';
UPDATE license_packages SET price_usd = 79000,  price_monthly = 7900,  updated_at = datetime('now') WHERE code = 'soc_professional';
UPDATE license_packages SET price_usd = 136900, price_monthly = 13690, updated_at = datetime('now') WHERE code = 'soc_business';
UPDATE license_packages SET price_usd = 249000, price_monthly = 24900, updated_at = datetime('now') WHERE code = 'soc_enterprise';

-- Compliance AI ───────────────────────────────────────────────────
UPDATE license_packages SET price_usd = 7990,  price_monthly = 799,  updated_at = datetime('now') WHERE code = 'compliance_starter';
UPDATE license_packages SET price_usd = 19900, price_monthly = 1990, updated_at = datetime('now') WHERE code = 'compliance_professional';
UPDATE license_packages SET price_usd = 31900, price_monthly = 3190, updated_at = datetime('now') WHERE code = 'compliance_business';
UPDATE license_packages SET price_usd = 49000, price_monthly = 4900, updated_at = datetime('now') WHERE code = 'compliance_enterprise';

-- Sentinel OT ─────────────────────────────────────────────────────
UPDATE license_packages SET price_usd = 12900,  price_monthly = 1290,  updated_at = datetime('now') WHERE code = 'sentinel_starter';
UPDATE license_packages SET price_usd = 39900,  price_monthly = 3990,  updated_at = datetime('now') WHERE code = 'sentinel_professional';
UPDATE license_packages SET price_usd = 68900,  price_monthly = 6890,  updated_at = datetime('now') WHERE code = 'sentinel_business';
UPDATE license_packages SET price_usd = 129000, price_monthly = 12900, updated_at = datetime('now') WHERE code = 'sentinel_enterprise';

-- Guardian+Orchestra Bundles ──────────────────────────────────────
UPDATE license_packages SET price_usd = 33900,  price_monthly = 3390,  updated_at = datetime('now') WHERE code = 'bundle_starter';
UPDATE license_packages SET price_usd = 93300,  price_monthly = 9330,  updated_at = datetime('now') WHERE code = 'bundle_professional';
UPDATE license_packages SET price_usd = 278800, price_monthly = 27880, updated_at = datetime('now') WHERE code = 'bundle_enterprise';

-- Cross-product Suites ────────────────────────────────────────────
UPDATE license_packages SET price_usd = 27800,  price_monthly = 2780,  updated_at = datetime('now') WHERE code = 'privacy_suite';
UPDATE license_packages SET price_usd = 95100,  price_monthly = 9510,  updated_at = datetime('now') WHERE code = 'security_suite';
UPDATE license_packages SET price_usd = 130400, price_monthly = 13040, updated_at = datetime('now') WHERE code = 'platform_5';

-- Antivirus (unchanged from original) ────────────────────────────
UPDATE license_packages SET price_usd = 2900,  price_monthly = 290,  updated_at = datetime('now') WHERE code = 'antivirus_starter';
UPDATE license_packages SET price_usd = 9900,  price_monthly = 990,  updated_at = datetime('now') WHERE code = 'antivirus_professional';
UPDATE license_packages SET price_usd = 29900, price_monthly = 2990, updated_at = datetime('now') WHERE code = 'antivirus_enterprise';

-- Studio (unchanged, monthly-based product) ───────────────────────
UPDATE license_packages SET price_usd = 490,   price_monthly = 49,   updated_at = datetime('now') WHERE code = 'studio_starter';
UPDATE license_packages SET price_usd = 1990,  price_monthly = 199,  updated_at = datetime('now') WHERE code = 'studio_professional';
UPDATE license_packages SET price_usd = 7990,  price_monthly = 799,  updated_at = datetime('now') WHERE code = 'studio_enterprise';

-- Mark pricing as live-editable (metadata flag)
UPDATE license_packages SET updated_at = datetime('now') WHERE price_usd > 0;

-- Audit log
INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0034',
  'schema_migration',
  'system',
  '0034',
  'system',
  '{"migration":"0034_live_pricing","description":"Seed price_usd/price_monthly into license_packages for admin-editable live pricing. DB is now the runtime source of truth; lib/stripe.ts is fallback only."}',
  datetime('now')
);

-- AXTO Legal (new product — seeded at launch prices)
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, price_monthly, tier, is_active, sort_order, for_sale, created_at, updated_at)
VALUES
  ('pkg-legal-starter',    'legal_starter',    'AXTO Legal Starter',       'legal', 14900, 1490, 'starter',      1, 90, 1, datetime('now'), datetime('now')),
  ('pkg-legal-pro',        'legal_professional','AXTO Legal Professional',  'legal', 49000, 4900, 'professional', 1, 91, 1, datetime('now'), datetime('now')),
  ('pkg-legal-enterprise', 'legal_enterprise', 'AXTO Legal Enterprise',    'legal', 99000, 9900, 'business',     1, 92, 1, datetime('now'), datetime('now')),
  ('pkg-trial-legal',      'trial_legal',      'AXTO Legal Trial',         'legal', 0,     0,    'trial',        1, 93, 1, datetime('now'), datetime('now'));

-- AXTO Legal Business & Enterprise (updated prices per spec)
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, price_monthly, tier, is_active, sort_order, for_sale, created_at, updated_at)
VALUES
  ('pkg-legal-biz',  'legal_business',  'AXTO Legal Business',  'legal', 99000,  9900,  'business',   1, 92, 1, datetime('now'), datetime('now')),
  ('pkg-legal-ent',  'legal_enterprise','AXTO Legal Enterprise', 'legal', 249000, 24900, 'enterprise', 1, 93, 1, datetime('now'), datetime('now'));

-- Update existing enterprise entry to correct price
UPDATE license_packages SET price_usd=249000, price_monthly=24900, tier='enterprise', sort_order=93 WHERE code='legal_enterprise';
UPDATE license_packages SET price_usd=14900, price_monthly=1490 WHERE code='legal_starter';
UPDATE license_packages SET price_usd=49000, price_monthly=4900 WHERE code='legal_professional';
