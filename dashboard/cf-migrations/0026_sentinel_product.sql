-- ==============================================================================
-- Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Author & Architect: Yusron Efendi <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0026: AXTO Sentinel — IoT/OT Security Platform product
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, max_nodes, max_workers, features, is_active, sort_order)
VALUES
  ('lp29','sentinel_starter',      'Sentinel Starter',      'sentinel', 4990,  100,  0, '["device_discovery","ot_protocol_detection","risk_scoring","100_devices","threat_alerts","email_slack_alerts","4h_scan_interval"]',                             1, 29),
  ('lp30','sentinel_professional', 'Sentinel Professional', 'sentinel', 19900, 1000, 0, '["device_discovery","ot_protocol_detection","risk_scoring","1000_devices","threat_alerts","soar_integration","cve_tracking","guardian_integration","api_access"]', 1, 30),
  ('lp31','sentinel_enterprise',   'Sentinel Enterprise',   'sentinel', 59900, -1,   0, '["all_professional","unlimited_devices","multi_site","white_label","custom_protocols","dedicated_sla","ot_asset_management","compliance_reporting"]',             1, 31);

INSERT OR IGNORE INTO product_builds (id, product, build_type, status, ci_provider)
VALUES
  ('pb-sentinel-img', 'sentinel-engine', 'image', 'pending', ''),
  ('pb-sentinel-exe', 'sentinel-engine', 'exe',   'pending', '');

INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0026',
  'schema_migration', 'system', '0026', 'system',
  '{"migration":"0026_sentinel_product","packages_added":3,"description":"AXTO Sentinel — IoT/OT Security: device discovery, OT protocol detection, risk scoring"}',
  datetime('now')
);
