-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- Migration 0049: Activate for-sale on Vault, Edge, SOC, Compliance, Sentinel
--
-- These 5 products ship a real, CI-built Docker (Linux) image today (see
-- migration 0044 — docker=1 in build_formats for every product). The Windows
-- EXE artifact is not yet verified for any of them and stays OFF in
-- build_formats until an admin confirms it. This migration only changes
-- PURCHASE availability (for_sale) — download-format gating is untouched and
-- continues to be enforced independently by build_formats.
--
-- Mirrors the lib/stripe.ts PACKAGE_INFO change flipping forSale:false to
-- forSale:true for the same 20 paid tiers + 3 cross-product bundles that
-- include them (privacy_suite, security_suite, platform_5). Trial packages
-- and YP (still paused) are untouched.
-- ==============================================================================

UPDATE license_packages SET for_sale = 1
WHERE product IN ('vault', 'edge', 'soc', 'compliance', 'sentinel')
  AND code NOT LIKE 'trial_%';

UPDATE license_packages SET for_sale = 1
WHERE code IN ('privacy_suite', 'security_suite', 'platform_5');

-- Audit log
INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0049',
  'schema_migration', 'system', '0049', 'system',
  '{
    "migration": "0049_activate_vault_edge_soc_compliance_sentinel",
    "rationale": "Docker/Linux builds are production-ready for all 5 products (CI-built since migration 0044). Windows EXE remains Coming Soon per-product via build_formats until individually verified.",
    "products": ["vault","edge","soc","compliance","sentinel"],
    "bundles": ["privacy_suite","security_suite","platform_5"]
  }',
  datetime('now')
);
