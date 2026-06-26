-- ==============================================================================
-- Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Author & Architect: Yusron Efendi <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════
-- Migration 0029: Add for_sale column to license_packages
-- ═══════════════════════════════════════════════════════════════════
-- Purpose: Allow admin to toggle products between "for sale" and "not for sale"
-- When for_sale = 0, the product shows "Coming Soon" on landing page & client portal
-- and checkout is blocked.

ALTER TABLE license_packages ADD COLUMN for_sale INTEGER NOT NULL DEFAULT 1;

-- Default: Guardian & Orchestra & Antivirus & Playbooks are for sale
-- All other 5 products default to NOT for sale (Coming Soon)
UPDATE license_packages SET for_sale = 0 WHERE product IN ('vault', 'edge', 'soc', 'compliance', 'sentinel');
UPDATE license_packages SET for_sale = 1 WHERE product IN ('guardian', 'orchestra', 'antivirus');

-- Also add for_sale to bundles that include non-for-sale products
UPDATE license_packages SET for_sale = 0 WHERE code IN ('privacy_suite', 'security_suite', 'platform_5');

-- Audit log
INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0029',
  'schema_migration',
  'system',
  '0029',
  'system',
  '{"migration":"0029_for_sale_column","description":"Add for_sale column to license_packages for sell/not-sell toggle"}',
  datetime('now')
);
