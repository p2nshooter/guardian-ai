-- ==============================================================================
-- Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Author & Architect: Yusron Efendi <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0023: AXTO Edge — AI API Gateway & Billing product
-- ═══════════════════════════════════════════════════════════════════════════

-- Edge license packages
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, max_nodes, max_workers, features, is_active, sort_order)
VALUES
  ('lp20','edge_starter',     'Edge Starter',     'edge', 2990,  0, 0, '["100_customers","1M_req_month","prompt_injection_firewall","token_metering","basic_analytics"]',                 1, 20),
  ('lp21','edge_professional','Edge Professional', 'edge', 7990,  0, 0, '["1000_customers","10M_req_month","advanced_firewall","custom_rules","invoice_generation","webhooks","siem"]',   1, 21),
  ('lp22','edge_enterprise',  'Edge Enterprise',   'edge', 24900, 0, 0, '["unlimited_customers","unlimited_req","white_label","multi_tenant","dedicated_sla","custom_billing_logic"]',   1, 22);

-- Edge product builds tracking
INSERT OR IGNORE INTO product_builds (id, product, build_type, status, ci_provider)
VALUES
  ('pb-edge-img', 'edge-core', 'image', 'pending', ''),
  ('pb-edge-exe', 'edge-core', 'exe',   'pending', '');

-- Audit log
INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0023',
  'schema_migration', 'system', '0023', 'system',
  '{"migration":"0023_edge_product","packages_added":3,"description":"AXTO Edge AI API Gateway product"}',
  datetime('now')
);
