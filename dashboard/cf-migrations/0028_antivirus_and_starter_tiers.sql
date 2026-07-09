-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════
-- Migration 0028: Antivirus product + starter tier packages
-- ═══════════════════════════════════════════════════════════════════

-- Insert antivirus license packages
-- FIX: column name is 'price_usd' not 'price' (defined in migration 0025)
INSERT OR IGNORE INTO license_packages (id, code, name, price_usd, price_monthly, product, max_nodes, features, created_at)
VALUES
  (lower(hex(randomblob(16))), 'antivirus_starter',      'Antivirus Starter',      2900,   290,  'antivirus', 10,   'ClamAV engine,YARA rules,REST API,Quarantine management',             datetime('now')),
  (lower(hex(randomblob(16))), 'antivirus_professional', 'Antivirus Professional',  9900,   990,  'antivirus', 100,  'ML behavioral detection,Guardian AI integration,Real-time scanning',  datetime('now')),
  (lower(hex(randomblob(16))), 'antivirus_enterprise',   'Antivirus Enterprise',    29900,  2990, 'antivirus', -1,   'Unlimited endpoints,Custom YARA rules,SOC integration,White-label',   datetime('now'));

-- Insert missing starter tiers (safe — OR IGNORE skips if code already exists)
INSERT OR IGNORE INTO license_packages (id, code, name, price_usd, price_monthly, product, max_nodes, features, created_at)
VALUES
  (lower(hex(randomblob(16))), 'vault_starter',      'Vault Starter',        9900,   990,  'vault',      0,  '15 PII types,7 masking strategies,GDPR + PDPA,Audit log',        datetime('now')),
  (lower(hex(randomblob(16))), 'edge_starter',       'Edge Starter',         4900,   490,  'edge',       0,  '7 AI providers,5 customer API keys,Cost routing,Basic caching',  datetime('now')),
  (lower(hex(randomblob(16))), 'sentinel_starter',   'Sentinel Starter',     19900,  1990, 'sentinel',   50, '50 device inventory,15 OT rules,Modbus polling,CVE matching',    datetime('now')),
  (lower(hex(randomblob(16))), 'compliance_starter', 'Compliance Starter',   14900,  1490, 'compliance', 0,  'SOC2 + GDPR,80+ controls,Gap analysis,Evidence collection',      datetime('now')),
  (lower(hex(randomblob(16))), 'soc_professional',   'SOC Professional',     49900,  4990, 'soc',        25, 'SIEM+SOAR,MITRE ATT&CK,AbuseIPDB,Incident management',          datetime('now'));

-- Insert cross-product bundles
INSERT OR IGNORE INTO license_packages (id, code, name, price_usd, price_monthly, product, max_nodes, features, created_at)
VALUES
  (lower(hex(randomblob(16))), 'privacy_suite',  'Privacy Suite',              59900,  5990,  'vault', 0,  'Vault Professional + Compliance Professional',         datetime('now')),
  (lower(hex(randomblob(16))), 'security_suite', 'Security Suite',             199900, 19990, 'soc',   0,  'SOC Business + Sentinel Professional',                 datetime('now')),
  (lower(hex(randomblob(16))), 'platform_5',     'Full Platform (All 5)',      299900, 29990, 'vault', 0,  'Vault+SOC+Compliance+Edge+Sentinel at Professional tier', datetime('now'));
