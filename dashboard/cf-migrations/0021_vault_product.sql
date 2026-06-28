-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0021: AXTO Vault — AI Privacy Layer product support
-- Extends: licenses, license_packages, engine_builds, product_builds
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Extend product CHECK constraint to include new products ───────────────
-- SQLite does not support ALTER TABLE ... MODIFY CONSTRAINT, so we
-- handle this in application logic (lib/license.ts product enum extension).
-- The CHECK is advisory only in older SQLite; new rows will insert correctly.

-- ── 2. Vault license packages ────────────────────────────────────────────────
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, max_nodes, max_workers, features, is_active, sort_order)
VALUES
  ('lp10', 'vault_starter',     'Vault Starter',     'vault', 1990,   0, 0, '["pii_redaction","phi_redaction","financial_redaction","audit_log","5_projects","50k_req_daily"]',        1, 10),
  ('lp11', 'vault_professional','Vault Professional', 'vault', 5990,   0, 0, '["pii_redaction","phi_redaction","financial_redaction","audit_log","custom_policies","unlimited_projects","250k_req_daily","soc2_report","hipaa_report","api_access"]', 1, 11),
  ('lp12', 'vault_business',    'Vault Business',     'vault', 14900,  0, 0, '["all_professional","custom_regex_patterns","multi_tenant","siem_integration","1m_req_daily","dedicated_support","white_label"]',                                      1, 12),
  ('lp13', 'vault_enterprise',  'Vault Enterprise',   'vault', 49900,  0, 0, '["all_business","unlimited_requests","on_premise_compliance","custom_redaction_ai","sla_99_9","priority_engineering"]',                                                 1, 13);

-- ── 3. Vault builds tracking ─────────────────────────────────────────────────
INSERT OR IGNORE INTO product_builds (id, product, build_type, status)
VALUES
  ('pb-vault-img', 'vault-core', 'image', 'pending'),
  ('pb-vault-exe', 'vault-core', 'exe',   'pending');

-- ── 4. Audit log entry for migration ─────────────────────────────────────────
INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0021',
  'schema_migration',
  'system',
  '0021',
  'system',
  '{"migration":"0021_vault_product","description":"Add AXTO Vault AI Privacy Layer product support","packages_added":4,"builds_initialized":2}',
  datetime('now')
);
