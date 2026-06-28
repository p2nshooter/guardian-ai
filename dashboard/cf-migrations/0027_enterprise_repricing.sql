-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0027: Enterprise repricing — Vault, SOC, Compliance, Sentinel, Edge
-- Rationale: pricing adjusted to reflect enterprise market positioning
-- ───────────────────────────────────────────────────────────────────────────
-- Vault    : $50K–200K/yr  (comparable: BigID $80K+, Securiti $120K+)
-- SOC      : $100K–500K/yr (comparable: Splunk $150K+, managed SOC $500K+)
-- Compliance: $30K–150K/yr (comparable: Drata $20K+, Vanta $15K+ cloud-hosted)
-- Edge     : $20K–100K/yr  (comparable: Kong Enterprise $50K+, Apigee $40K+)
-- Sentinel : $50K–300K/yr  (comparable: Claroty $100K+, Dragos $150K+)
-- ═══════════════════════════════════════════════════════════════════════════

-- Remove old starter/low-price packages
DELETE FROM license_packages WHERE code IN (
  'vault_starter', 'vault_professional', 'vault_business', 'vault_enterprise',
  'edge_starter', 'edge_professional', 'edge_enterprise',
  'soc_starter', 'soc_professional', 'soc_enterprise',
  'compliance_starter', 'compliance_professional', 'compliance_enterprise',
  'sentinel_starter', 'sentinel_professional', 'sentinel_enterprise'
);

-- ── AXTO Vault — AI Data Privacy Platform ($24,900–$199,000) ──────────────
INSERT OR REPLACE INTO license_packages
  (id, code, name, product, price_usd, max_nodes, max_workers, features, is_active, sort_order)
VALUES
  ('lp90','vault_professional','Vault Professional','vault',  24900, 0, 0,
   '[
     "500K intercepts/day",
     "150+ entity types: PII, PHI, PCI",
     "Session-based re-injection",
     "OpenAI/Anthropic/Gemini/Azure proxy",
     "Audit log with masked evidence",
     "HIPAA & SOC2 compliance reports",
     "Custom regex + dictionary entities",
     "SIEM stream: Splunk/Elastic/Datadog",
     "30-day onboarding support"
   ]', 1, 90),
  ('lp91','vault_business',    'Vault Business',    'vault',  74900, 0, 0,
   '[
     "5M intercepts/day",
     "AI-assisted NLP entity detection (fine-tunable)",
     "Multi-department isolation + audit streams",
     "GDPR data subject request automation",
     "PCI-DSS tokenization for payment cards",
     "Custom policies per AI use case",
     "SIEM + Jira/ServiceNow/PagerDuty",
     "Dedicated implementation engineer (40hr)",
     "Annual compliance health review"
   ]', 1, 91),
  ('lp92','vault_enterprise',  'Vault Enterprise',  'vault', 199000, 0, 0,
   '[
     "Unlimited intercepts",
     "Custom redaction AI model (fine-tuned)",
     "Multi-region active-active deployment",
     "Real-time Board/DPO compliance dashboard",
     "Cross-border data residency enforcement",
     "Automated DPIA generation",
     "99.99% uptime SLA with financial penalties",
     "Dedicated Customer Success Manager",
     "Quarterly pen-test + compliance review"
   ]', 1, 92);

-- ── AXTO Edge — AI Gateway & API Management ($9,900–$99,000) ─────────────
INSERT OR REPLACE INTO license_packages
  (id, code, name, product, price_usd, max_nodes, max_workers, features, is_active, sort_order)
VALUES
  ('lp93','edge_professional','Edge Professional','edge',  9900, 0, 0,
   '[
     "Unlimited customers",
     "10M req/month",
     "Token metering: input/output/cached per model",
     "Rate limiting per customer tier",
     "Prompt injection detection (50+ patterns)",
     "Content filtering + custom topics",
     "OpenAI-compatible proxy (zero code change)",
     "Webhook events: quota, abuse"
   ]', 1, 93),
  ('lp94','edge_business',    'Edge Business',    'edge', 29900, 0, 0,
   '[
     "Unlimited customers",
     "100M req/month",
     "Automatic invoice generation (PDF + webhook)",
     "Tiered customer billing plans + markup",
     "Stripe sync for subscription management",
     "Advanced jailbreak + multi-turn attack detection",
     "Model cost analytics: margin per customer",
     "Custom no-code firewall rule builder",
     "SIEM forwarding + dedicated account manager"
   ]', 1, 94),
  ('lp95','edge_enterprise',  'Edge Enterprise',  'edge', 99000, 0, 0,
   '[
     "Unlimited customers + requests",
     "White-label AI gateway",
     "Multi-tenant: resell capacity",
     "Custom billing engine (credits/postpaid/sub)",
     "EU AI Act + FTC AI compliance",
     "Programmable LLM routing middleware",
     "Air-gap + VPC deployment",
     "SLA 99.9% with financial penalties",
     "Dedicated Customer Success + Engineering team"
   ]', 1, 95);

-- ── AXTO SOC — AI Security Operations Center ($49,900–$499,000) ──────────
INSERT OR REPLACE INTO license_packages
  (id, code, name, product, price_usd, max_nodes, max_workers, features, is_active, sort_order)
VALUES
  ('lp96','soc_professional','SOC Professional','soc',  49900, 25,  0,
   '[
     "25 log sources",
     "SIEM: syslog UDP + CEF + API push",
     "SOAR: 20 automated playbooks",
     "5M+ IOCs updated every 6 hours",
     "Incident management with SLA tracking",
     "Guardian AI deep integration",
     "90-day compressed log retention",
     "Executive report: weekly + monthly",
     "Email/Slack/PagerDuty alerting"
   ]', 1, 96),
  ('lp97','soc_business',    'SOC Business',    'soc', 149900, 100, 0,
   '[
     "100 log sources",
     "AI-assisted threat hunting",
     "Custom SOAR via visual workflow editor",
     "Private threat intelligence feed integration",
     "1-year encrypted log retention",
     "SIEM forwarding: Splunk/Elastic/Microsoft Sentinel",
     "MITRE ATT&CK mapping per incident",
     "Dedicated security analyst onboarding (80hr)",
     "Quarterly threat landscape review"
   ]', 1, 97),
  ('lp98','soc_enterprise',  'SOC Enterprise',  'soc', 499000, -1, 0,
   '[
     "Unlimited log sources + retention",
     "Multi-tenant SOC for subsidiaries/BUs",
     "White-label for MSSPs",
     "Custom threat intelligence exchange (STIX/TAXII)",
     "Tamper-proof chain-of-custody",
     "Air-gap deployment support",
     "SOAR: Jira/ServiceNow/Palo Alto XSOAR",
     "99.9% SLA with financial penalties",
     "Dedicated Customer Success + Security Engineering"
   ]', 1, 98);

-- ── AXTO Compliance — Automated Audit Platform ($14,900–$149,000) ────────
INSERT OR REPLACE INTO license_packages
  (id, code, name, product, price_usd, max_nodes, max_workers, features, is_active, sort_order)
VALUES
  ('lp99', 'compliance_professional','Compliance Professional','compliance',  14900, 0, 0,
   '[
     "SOC 2 Type II continuous monitoring",
     "ISO 27001:2022 — 93 controls",
     "HIPAA technical + admin safeguards",
     "PCI-DSS v4.0 — 12 requirements",
     "Automated evidence collection 24hr",
     "Gap analysis with remediation roadmap",
     "Audit-ready PDF reports",
     "Control grading A-F per domain"
   ]', 1, 99),
  ('lp100','compliance_business',    'Compliance Business',    'compliance',  49900, 0, 0,
   '[
     "7 frameworks (GDPR, PDPA, NIST CSF added)",
     "API compliance gates in CI/CD",
     "Guardian + SOC integration",
     "Tamper-proof evidence timestamps",
     "Dedicated compliance onboarding (40hr)",
     "Auditor collaboration portal",
     "Hourly automated scans"
   ]', 1, 100),
  ('lp101','compliance_enterprise',  'Compliance Enterprise',  'compliance', 149000, 0, 0,
   '[
     "Custom framework builder",
     "Multi-tenant: BUs/subsidiaries/M&A targets",
     "M&A due diligence compliance package",
     "Continuous regulatory change monitoring",
     "White-label for MSSPs",
     "Board-level compliance dashboard",
     "Quarterly compliance strategy sessions",
     "99.9% SLA + dedicated Customer Success Manager"
   ]', 1, 101);

-- ── AXTO Sentinel — IoT/OT Security ($24,900–$299,000) ───────────────────
INSERT OR REPLACE INTO license_packages
  (id, code, name, product, price_usd, max_nodes, max_workers, features, is_active, sort_order)
VALUES
  ('lp102','sentinel_professional','Sentinel Professional','sentinel',  24900,  500, 0,
   '[
     "500 devices",
     "Active + passive discovery (ARP/mDNS/SNMP)",
     "15+ OT protocols: Modbus/DNP3/BACnet/S7/EtherNet-IP/MQTT",
     "Per-device risk score 0-100",
     "CVE database matching per firmware",
     "Default credential detection (500+ devices)",
     "IEC 62443 zone/conduit mapping",
     "SOC + Guardian OT/IT correlated response"
   ]', 1, 102),
  ('lp103','sentinel_business',    'Sentinel Business',    'sentinel',  79900, 5000, 0,
   '[
     "5,000 devices",
     "Multi-facility centralized dashboard",
     "OT asset lifecycle management",
     "Firmware vulnerability tracking + patch status",
     "SOAR auto-response: isolate/alert/ticket",
     "IEC 62443 compliance reporting",
     "Network segmentation gap analysis",
     "Dedicated OT security onboarding (80hr)",
     "Quarterly OT threat briefing"
   ]', 1, 103),
  ('lp104','sentinel_enterprise',  'Sentinel Enterprise',  'sentinel', 299000,   -1, 0,
   '[
     "Unlimited devices + sites",
     "Custom OT protocol decoder development",
     "Air-gap deployment + offline IOC updates",
     "NERC CIP compliance package",
     "OT threat intelligence feeds",
     "Multi-org white-label for MSSPs",
     "Board-level OT risk dashboard",
     "48hr on-site incident response SLA",
     "Source code escrow + perpetual license option"
   ]', 1, 104);

-- Audit log
INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0027',
  'schema_migration', 'system', '0027', 'system',
  '{
    "migration": "0027_enterprise_repricing",
    "products": ["vault","edge","soc","compliance","sentinel"],
    "rationale": "Pricing updated to reflect enterprise market positioning. Comparable products: BigID $80K+, Claroty $100K+, Splunk SIEM $150K+, Drata $20K+, Kong $50K+.",
    "vault":      {"professional":24900,"business":74900,"enterprise":199000},
    "edge":       {"professional":9900,"business":29900,"enterprise":99000},
    "soc":        {"professional":49900,"business":149900,"enterprise":499000},
    "compliance": {"professional":14900,"business":49900,"enterprise":149000},
    "sentinel":   {"professional":24900,"business":79900,"enterprise":299000}
  }',
  datetime('now')
);
