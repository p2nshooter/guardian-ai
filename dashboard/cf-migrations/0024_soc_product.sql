-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0024: AXTO SOC — AI Security Operations Center product
-- ═══════════════════════════════════════════════════════════════════════════

-- SOC license packages
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, max_nodes, max_workers, features, is_active, sort_order)
VALUES
  ('lp23','soc_starter',      'SOC Starter',       'soc', 9900,   1,  0, '["siem_aggregation","soar_basic","threat_intel_osint","incident_management","10_playbooks","email_slack_alerts","30d_retention"]',                    1, 23),
  ('lp24','soc_professional', 'SOC Professional',  'soc', 29900,  10, 0, '["siem_aggregation","soar_full","threat_intel_premium","incident_management","unlimited_playbooks","siem_integration","executive_reporting","90d_retention","guardian_integration"]', 1, 24),
  ('lp25','soc_enterprise',   'SOC Enterprise',    'soc', 99900,  -1, 0, '["all_professional","multi_tenant","custom_threat_feeds","white_label","dedicated_sla_99_9","custom_soar_logic","365d_retention","priority_support"]',  1, 25);

-- SOC product builds tracking
INSERT OR IGNORE INTO product_builds (id, product, build_type, status, ci_provider)
VALUES
  ('pb-soc-img', 'soc-engine', 'image', 'pending', ''),
  ('pb-soc-exe', 'soc-engine', 'exe',   'pending', '');

-- Audit log
INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0024',
  'schema_migration', 'system', '0024', 'system',
  '{"migration":"0024_soc_product","packages_added":3,"description":"AXTO SOC — AI Security Operations Center: SIEM, SOAR, Threat Intelligence"}',
  datetime('now')
);
