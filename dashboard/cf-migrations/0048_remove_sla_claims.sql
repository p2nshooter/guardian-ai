-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- Migration 0048: Remove SLA claims from enterprise package feature lists
-- Every AXTO product is self-hosted with no managed-service / human SLA --
-- migration 0027 seeded several enterprise tiers with contractual-sounding
-- "SLA 99.9%", "financial penalties", and "48hr on-site incident response"
-- language that no self-hosted product can honor. Corrective (not a rewrite
-- of 0027, which is already applied) -- replaces only the SLA-bearing lines,
-- every other feature is preserved verbatim.
-- ==============================================================================

UPDATE license_packages SET features = '[
  "Unlimited intercepts",
  "Custom redaction AI model (fine-tuned)",
  "Multi-region active-active deployment",
  "Real-time Board/DPO compliance dashboard",
  "Cross-border data residency enforcement",
  "Automated DPIA generation",
  "Engineered for 99.99% uptime — self-hosted, no managed SLA",
  "Dedicated Customer Success Manager",
  "Quarterly pen-test + compliance review"
]' WHERE code = 'vault_enterprise';

UPDATE license_packages SET features = '[
  "Unlimited customers + requests",
  "White-label AI gateway",
  "Multi-tenant: resell capacity",
  "Custom billing engine (credits/postpaid/sub)",
  "EU AI Act + FTC AI compliance",
  "Programmable LLM routing middleware",
  "Air-gap + VPC deployment",
  "Engineered for 99.9% uptime — self-hosted, no managed SLA",
  "Dedicated Customer Success + Engineering team"
]' WHERE code = 'edge_enterprise';

UPDATE license_packages SET features = '[
  "25 log sources",
  "SIEM: syslog UDP + CEF + API push",
  "SOAR: 20 automated playbooks",
  "5M+ IOCs updated every 6 hours",
  "Incident management with response-time tracking",
  "Guardian AI deep integration",
  "90-day compressed log retention",
  "Executive report: weekly + monthly",
  "Email/Slack/PagerDuty alerting"
]' WHERE code = 'soc_professional';

UPDATE license_packages SET features = '[
  "Unlimited log sources + retention",
  "Multi-tenant SOC for subsidiaries/BUs",
  "White-label for MSSPs",
  "Custom threat intelligence exchange (STIX/TAXII)",
  "Tamper-proof chain-of-custody",
  "Air-gap deployment support",
  "SOAR: Jira/ServiceNow/Palo Alto XSOAR",
  "Engineered for 99.9% uptime — self-hosted, no managed SLA",
  "Dedicated Customer Success + Security Engineering"
]' WHERE code = 'soc_enterprise';

UPDATE license_packages SET features = '[
  "Custom framework builder",
  "Multi-tenant: BUs/subsidiaries/M&A targets",
  "M&A due diligence compliance package",
  "Continuous regulatory change monitoring",
  "White-label for MSSPs",
  "Board-level compliance dashboard",
  "Quarterly compliance strategy sessions",
  "Engineered for 99.9% uptime + dedicated Customer Success Manager"
]' WHERE code = 'compliance_enterprise';

UPDATE license_packages SET features = '[
  "Unlimited devices + sites",
  "Custom OT protocol decoder development",
  "Air-gap deployment + offline IOC updates",
  "NERC CIP compliance package",
  "OT threat intelligence feeds",
  "Multi-org white-label for MSSPs",
  "Board-level OT risk dashboard",
  "Priority remote incident-response consultation",
  "Source code escrow + perpetual license option"
]' WHERE code = 'sentinel_enterprise';

-- Audit log
INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0048',
  'schema_migration', 'system', '0048', 'system',
  '{
    "migration": "0048_remove_sla_claims",
    "rationale": "Every AXTO product is self-hosted with no managed-service SLA. Removed contractual SLA/financial-penalty/on-site-response language from vault, edge, soc, compliance, sentinel enterprise tiers seeded by migration 0027.",
    "codes": ["vault_enterprise","edge_enterprise","soc_professional","soc_enterprise","compliance_enterprise","sentinel_enterprise"]
  }',
  datetime('now')
);
