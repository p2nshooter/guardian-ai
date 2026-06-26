-- ==============================================================================
-- Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Author & Architect: Yusron Efendi <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════════════════
-- AXTO Platform — Migration 0025: Complete Platform Rewrite
-- ═══════════════════════════════════════════════════════════════════════════════
-- Purpose : Single-pass authoritative schema for the full 7-product AXTO Platform.
--           Safe to apply on top of migrations 0001–0024 (all idempotent).
--           Replaces all stale pricing, adds missing tables, enforces correct
--           product types, and seeds world-class feature data.
--
-- Products : guardian · orchestra · vault · edge · soc · compliance · sentinel
-- Pricing  : Benchmarked vs CrowdStrike, Splunk, Vanta, Kong, Claroty (2024-2025)
-- Schema   : Cloudflare D1 (SQLite dialect)
-- Author   : AXTO Platform Team
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — CORE AUTH & IDENTITY TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Users (admin + client accounts)
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'client',
  password_hash TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- Magic link tokens
CREATE TABLE IF NOT EXISTS magic_links (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_magic_token   ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_email   ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_expires ON magic_links(expires_at);

-- Sessions (JWT-less server-side sessions via KV or D1)
CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  user_email   TEXT NOT NULL,
  user_role    TEXT NOT NULL DEFAULT 'client',
  token        TEXT NOT NULL UNIQUE,
  ip_address   TEXT NOT NULL DEFAULT '',
  user_agent   TEXT NOT NULL DEFAULT '',
  last_active  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL,
  revoked      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_token   ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — CLIENT MANAGEMENT
-- ─────────────────────────────────────────────────────────────────────────────

-- Clients (paying customers)
CREATE TABLE IF NOT EXISTS clients (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL DEFAULT '',
  organization    TEXT NOT NULL DEFAULT '',
  country         TEXT NOT NULL DEFAULT '',
  currency        TEXT NOT NULL DEFAULT 'USD',
  phone           TEXT NOT NULL DEFAULT '',
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  language        TEXT NOT NULL DEFAULT 'en',
  notes           TEXT NOT NULL DEFAULT '',
  tags            TEXT NOT NULL DEFAULT '[]',
  mrr_usd         REAL NOT NULL DEFAULT 0,
  ltv_usd         REAL NOT NULL DEFAULT 0,
  health_score    INTEGER NOT NULL DEFAULT 100,
  last_login      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clients_email  ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_org    ON clients(organization);
CREATE INDEX IF NOT EXISTS idx_clients_country ON clients(country);

-- Registration queue (pre-payment)
CREATE TABLE IF NOT EXISTS registrations (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL,
  name            TEXT NOT NULL DEFAULT '',
  organization    TEXT NOT NULL DEFAULT '',
  country         TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  password_hash   TEXT,
  email_verified  INTEGER NOT NULL DEFAULT 0,
  verify_token    TEXT,
  verify_expires  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  pkg_interest    TEXT NOT NULL DEFAULT '',
  source          TEXT NOT NULL DEFAULT 'register',
  ip_address      TEXT NOT NULL DEFAULT '',
  user_agent      TEXT NOT NULL DEFAULT '',
  referrer        TEXT NOT NULL DEFAULT '',
  utm_source      TEXT NOT NULL DEFAULT '',
  utm_campaign    TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_email   ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_reg_status  ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_reg_verify  ON registrations(verify_token);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — LICENSE PACKAGES (Authoritative — replaces all prior seeds)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS license_packages (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  product         TEXT NOT NULL,          -- guardian|orchestra|vault|edge|soc|compliance|sentinel|bundle
  price_usd       REAL NOT NULL DEFAULT 0, -- annual USD
  price_monthly   REAL NOT NULL DEFAULT 0, -- monthly USD equivalent
  max_nodes       INTEGER NOT NULL DEFAULT 1,     -- servers/devices (-1 = unlimited)
  max_workers     INTEGER NOT NULL DEFAULT 0,     -- AI workers (-1 = unlimited)
  max_devices     INTEGER NOT NULL DEFAULT 0,     -- OT devices (-1 = unlimited)
  max_req_day     INTEGER NOT NULL DEFAULT 0,     -- API req/day (0 = N/A)
  max_sources     INTEGER NOT NULL DEFAULT 0,     -- SOC log sources (0 = N/A)
  max_ingestion_gb INTEGER NOT NULL DEFAULT 0,    -- SOC GB/day (0 = N/A)
  max_frameworks  INTEGER NOT NULL DEFAULT 1,     -- compliance frameworks (0 = unlimited)
  features        TEXT NOT NULL DEFAULT '[]',     -- JSON array of feature keys
  tier            TEXT NOT NULL DEFAULT 'growth', -- growth|professional|enterprise|sovereign
  is_bundle       INTEGER NOT NULL DEFAULT 0,
  bundle_products TEXT NOT NULL DEFAULT '[]',     -- JSON array for bundle
  is_active       INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lp_code    ON license_packages(code);
CREATE INDEX IF NOT EXISTS idx_lp_product ON license_packages(product, is_active);
CREATE INDEX IF NOT EXISTS idx_lp_tier    ON license_packages(tier);

-- ── Delete stale package rows (old pricing, wrong codes) ─────────────────────
DELETE FROM license_packages WHERE code IN (
  'lite','pro','shield','aegis',
  'orchestra_core','orchestra_scale','orchestra_unlimited',
  'vault_starter','vault_professional','vault_business','vault_enterprise',
  'vault_growth','vault_unlimited',
  'edge_growth','edge_professional','edge_enterprise','edge_unlimited','edge_platform',
  'soc_growth','soc_professional','soc_enterprise','soc_unlimited','soc_platform',
  'compliance_growth','compliance_professional','compliance_enterprise','compliance_unlimited','compliance_sovereign',
  'sentinel_growth','sentinel_professional','sentinel_enterprise','sentinel_unlimited','sentinel_critical',
  'bundle_starter','bundle_professional','bundle_enterprise'
);

-- ─────────────────────────────────────────────────────
-- 🛡️  GUARDIAN AI — Self-Hosted Cybersecurity Platform
-- Benchmark: CrowdStrike $99–184/endpoint/yr | SentinelOne $69/endpoint/yr
-- Value: full-stack self-hosted, no per-endpoint fee, BYOK, eBPF included
-- ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, price_monthly, max_nodes, features, tier, sort_order)
VALUES
  ('lp_g1', 'lite',   'Guardian Sentinel',     'guardian',   490,   49,    1,
   '["7_layer_ai_engine","realtime_threat_feeds","auto_quarantine","clamav_antivirus","email_slack_discord_alerts","ai_support_assistant","file_integrity_monitor","process_monitor","network_monitor","dns_monitor"]',
   'growth', 10),
  ('lp_g2', 'pro',    'Guardian Professional', 'guardian',   1990,  199,   25,
   '["all_sentinel","ai_threat_hunting","ueba_analytics","multi_server_dashboard","soc2_iso27001_hipaa_pcidss","siem_splunk_elk_datadog","standalone_antivirus_rest_api","incident_response_playbooks","ssh_brute_force_detection","custom_alert_rules"]',
   'professional', 11),
  ('lp_g3', 'shield', 'Guardian Business',     'guardian',   7990,  799,   100,
   '["all_professional","ebpf_kernel_inspection","mtls_node_mesh","rootkit_memory_forensics","custom_incident_runbooks","deception_engine_honeypots","attack_graph_visualization","siem_webhook_stream","gdpr_compliance_reports","pdf_executive_reports"]',
   'enterprise', 12),
  ('lp_g4', 'aegis',  'Guardian Enterprise',   'guardian',   29900, 2990,  1000,
   '["all_business","1000_node_global_scale","white_label_dashboard","custom_threat_intel_feed","multi_tenant_architecture","priority_engineering_support","custom_sla","air_gap_option","dedicated_customer_success","custom_integrations"]',
   'sovereign', 13);

-- ─────────────────────────────────────────────────────
-- ⚡  ORCHESTRA AI — Self-Hosted AI Orchestration
-- Benchmark: PortKey Enterprise $500+/mo | Helicone $500/mo | LangSmith $39/user/mo
-- Value: self-hosted, no per-token overhead, GPU-native, BYOK
-- ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, price_monthly, max_workers, features, tier, sort_order)
VALUES
  ('lp_o1', 'orchestra_core',      'Orchestra Starter',      'orchestra', 2990,  299,  10,
   '["cpu_gpu_auto_detect","5_routing_strategies","openai_claude_gemini_groq_ollama","cost_optimization","budget_caps","realtime_analytics","openai_compatible_api","job_queue","websocket_events","worker_health_monitor"]',
   'growth', 20),
  ('lp_o2', 'orchestra_scale',     'Orchestra Professional', 'orchestra', 9990,  999,  50,
   '["all_starter","all_6_routing_strategies","priority_job_queue","dead_letter_queue","autoscaler_scale_to_zero","federated_multi_region","custom_provider_endpoints","cost_analytics_per_team","azure_mistral_cohere","ab_testing_providers"]',
   'professional', 21),
  ('lp_o3', 'orchestra_unlimited', 'Orchestra Enterprise',   'orchestra', 29900, 2990, -1,
   '["all_professional","unlimited_workers_cpu_gpu","white_label_api_gateway","custom_routing_logic","credential_vault_rotation","priority_engineering","custom_models_finetuned","semantic_caching_layer","grafana_datadog_export","dedicated_sla"]',
   'enterprise', 22);

-- ─────────────────────────────────────────────────────
-- 🔒  VAULT AI — Data Privacy & PII Redaction Engine
-- Benchmark: Protegrity $50k+/yr | BigID $20k+/yr | DataSunrise $10k+/yr
-- Value: self-hosted FHIR/HL7, synthetic data, homomorphic option
-- ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, price_monthly, max_req_day, max_nodes, features, tier, sort_order)
VALUES
  ('lp_v1', 'vault_growth',       'Vault Growth',       'vault', 9900,  990,  100000,  0,
   '["120_entity_patterns","pii_phi_financial","luhn_validated_cards","risk_scoring","5_projects","audit_trail","regex_custom_patterns","confidence_thresholds","json_xml_text_support","rest_api"]',
   'growth', 30),
  ('lp_v2', 'vault_professional', 'Vault Professional', 'vault', 49900, 4990, 1000000, 0,
   '["all_growth","fhir_r4","hl7_v2_v3","gdpr_article_25","synthetic_data_gen","siem_event_stream","unlimited_projects","baa_available","hipaa_phi_extended","data_lineage_tracking"]',
   'professional', 31),
  ('lp_v3', 'vault_enterprise',   'Vault Enterprise',   'vault', 99900, 9990, -1,      0,
   '["all_professional","multi_tenant","custom_ml_detection_models","homomorphic_encryption_option","baa_support","fedRAMP_aligned","saml_sso","dedicated_support","custom_training_pipeline_option","right_to_erasure_workflows"]',
   'enterprise', 32),
  ('lp_v4', 'vault_unlimited',    'Vault Sovereign',    'vault', 199900,19990,-1,      0,
   '["all_enterprise","dedicated_deployment","air_gap_certified","custom_training_pipeline","on_premise_cert","sla_99_99","dedicated_engineer","custom_entity_taxonomy","zero_trust_architecture","iso27001_certified_option"]',
   'sovereign', 33);

-- ─────────────────────────────────────────────────────
-- 🌐  EDGE AI — AI API Gateway & Traffic Control
-- Benchmark: Kong Enterprise $50k+/yr | Apigee $20k+/yr | AWS API GW usage-based
-- Value: self-hosted semantic cache, prompt firewall, token metering, zero vendor lock-in
-- ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, price_monthly, max_req_day, max_nodes, features, tier, sort_order)
VALUES
  ('lp_e1', 'edge_growth',       'Edge Growth',       'edge', 4900,  490,  500000,  3,
   '["semantic_response_cache","rate_limiting_per_key_ip","automatic_failover","3_projects","basic_analytics","latency_tracking","error_rate_monitoring","openai_anthropic_gemini_routing","json_validation","cors_management"]',
   'growth', 40),
  ('lp_e2', 'edge_professional', 'Edge Professional', 'edge', 19900, 1990, -1,      50,
   '["all_growth","token_metering","billing_webhooks","prompt_injection_firewall","ab_testing_engine","advanced_observability","unlimited_projects","per_customer_rate_limits","spend_alerts","grafana_datadog_export"]',
   'professional', 41),
  ('lp_e3', 'edge_enterprise',   'Edge Enterprise',   'edge', 49900, 4990, -1,      -1,
   '["all_professional","white_label_gateway","custom_routing_rules","ip_allowlist_blocklist","sla_monitoring","abuse_detection_ml","saml_sso","audit_log_export","custom_retry_policies","mutual_tls"]',
   'enterprise', 42),
  ('lp_e4', 'edge_platform',     'Edge Platform',     'edge', 99900, 9990, -1,      -1,
   '["all_enterprise","multi_region_ha","dedicated_sla","compliance_audit_logs","custom_billing_integration","priority_engineering","geo_routing","circuit_breaker_per_provider","custom_cache_ttl_policies","zero_downtime_deploys"]',
   'sovereign', 43);

-- ─────────────────────────────────────────────────────
-- 🎯  SOC AI — Security Operations Center
-- Benchmark: Splunk $50-150/GB/day | IBM QRadar $10k+/yr | Exabeam $50k+/yr
-- Value: no per-GB pricing, self-hosted, SOAR included, AI triage
-- ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, price_monthly, max_nodes, max_ingestion_gb, max_sources, features, tier, sort_order)
VALUES
  ('lp_s1', 'soc_growth',       'SOC Growth',       'soc', 19900,  1990,  10,  50,  10,
   '["siem_engine","ueba_analytics","correlation_rules","threat_intelligence_feeds","incident_management","10_log_sources","50gb_daily_ingestion","alert_triage","dashboard_realtime","email_slack_alerts"]',
   'growth', 50),
  ('lp_s2', 'soc_professional', 'SOC Professional', 'soc', 99900,  9990,  100, 100, 100,
   '["all_growth","500_soar_rules","ai_alert_triage","compliance_reports_soc2_iso_hipaa","advanced_threat_hunting","100_log_sources","100gb_daily_ingestion","malware_sandbox","network_behavior_analytics","custom_detection_rules"]',
   'professional', 51),
  ('lp_s3', 'soc_enterprise',   'SOC Enterprise',   'soc', 249900, 24990, 500, 500, 500,
   '["all_professional","multi_tenant_soc","digital_forensics","ai_malware_analysis","executive_dashboard","500_log_sources","500gb_daily_ingestion","threat_graph","deception_integration","soar_custom_playbooks"]',
   'enterprise', 52),
  ('lp_s4', 'soc_platform',     'SOC Platform',     'soc', 499900, 49990, -1,  -1,  -1,
   '["all_enterprise","unlimited_log_ingestion","custom_threat_intelligence","xdr_integration","dedicated_security_team","bespoke_sla","custom_compliance_frameworks","air_gap_option","managed_detection_response","white_label_portal"]',
   'sovereign', 53);

-- ─────────────────────────────────────────────────────
-- 📋  COMPLIANCE AI — Continuous Compliance Automation
-- Benchmark: Vanta $7.5k-30k/yr | Drata $10k-50k+/yr | Tugboat Logic $5k+/yr
-- Value: self-hosted, all frameworks, 150+ templates, automated evidence
-- ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, price_monthly, max_frameworks, features, tier, sort_order)
VALUES
  ('lp_c1', 'compliance_growth',       'Compliance Growth',       'compliance', 9900,   990,   1,
   '["continuous_control_monitoring","1_framework","automated_evidence_collection","gap_analysis","audit_ready_reports","policy_templates_50","control_library","scheduled_assessments","email_alerts","pdf_export"]',
   'growth', 60),
  ('lp_c2', 'compliance_professional', 'Compliance Professional', 'compliance', 29900,  2990,  5,
   '["all_growth","5_frameworks_soc2_iso_hipaa_pcidss_gdpr","risk_register","vendor_risk_management","150_policy_templates","auditor_access_links","evidence_tagging","control_owners","remediation_tracking","api_integrations_aws_gcp_azure_github"]',
   'professional', 61),
  ('lp_c3', 'compliance_enterprise',   'Compliance Enterprise',   'compliance', 79900,  7990,  0,
   '["all_professional","all_global_frameworks","pdpa","nist_csf","cis_controls","third_party_risk_management","multi_team_collaboration","custom_framework_builder","automated_vendor_questionnaires","sso_saml"]',
   'enterprise', 62),
  ('lp_c4', 'compliance_sovereign',    'Compliance Sovereign',    'compliance', 149900, 14990, 0,
   '["all_enterprise","multi_entity_management","white_label_platform","fedramp","nerc_cip","audit_firm_api","dedicated_compliance_engineer","custom_evidence_collection_scripts","air_gap_option","on_premise_cert"]',
   'sovereign', 63);

-- ─────────────────────────────────────────────────────
-- 🏭  SENTINEL OT — Industrial Cybersecurity (OT/ICS)
-- Benchmark: Claroty $50k+/yr | Dragos $50k+/yr | Nozomi Networks $30k+/yr
-- Value: self-hosted, passive monitoring, 7 industrial protocols, NERC CIP/IEC 62443
-- ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, price_monthly, max_devices, features, tier, sort_order)
VALUES
  ('lp_ot1', 'sentinel_growth',       'Sentinel Growth',       'sentinel', 19900,  1990,  250,
   '["passive_ot_monitoring","250_ot_ics_devices","7_industrial_protocols_modbus_dnp3_enip_profinet_iec61850_bacnet_opcua","asset_discovery","anomaly_alerting","basic_reporting","firmware_inventory","traffic_baseline","email_alerts","topology_map"]',
   'growth', 70),
  ('lp_ot2', 'sentinel_professional', 'Sentinel Professional', 'sentinel', 49900,  4990,  2500,
   '["all_growth","cve_vulnerability_tracking","mitre_attck_ics_mapping","purdue_model_visualization","it_ot_boundary_control","siem_forwarding","2500_devices","custom_alert_rules","protocol_deep_inspection","pdf_compliance_reports"]',
   'professional', 71),
  ('lp_ot3', 'sentinel_enterprise',   'Sentinel Enterprise',   'sentinel', 149900, 14990, 25000,
   '["all_professional","multi_site_management","iec_62443_compliance","nerc_cip_compliance","digital_forensics","soc_integration","25000_devices","historian_integration","asset_risk_scoring","executive_dashboard"]',
   'enterprise', 72),
  ('lp_ot4', 'sentinel_critical',     'Sentinel Critical',     'sentinel', 299900, 29990, -1,
   '["all_enterprise","unlimited_devices","air_gap_deployment","custom_protocol_support","ot_incident_response_team","dedicated_ot_engineer","custom_purdue_models","zero_trust_ot_segmentation","threat_intel_ics_specific","bespoke_sla"]',
   'sovereign', 73);

-- ─────────────────────────────────────────────────────
-- 🎁  MULTI-PRODUCT BUNDLES
-- Guardian AI + Orchestra AI combined at meaningful savings
-- ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO license_packages
  (id, code, name, product, price_usd, price_monthly, max_nodes, max_workers, features, tier, is_bundle, bundle_products, sort_order)
VALUES
  ('lp_b1', 'bundle_starter',      'Security + AI Starter',      'guardian', 3990,  399,  25,   10,
   '["guardian_professional_25_servers","orchestra_starter_10_workers","single_license_key","priority_onboarding","30_day_money_back"]',
   'growth', 1, '["pro","orchestra_core"]', 80),
  ('lp_b2', 'bundle_professional', 'Security + AI Professional', 'guardian', 14990, 1499, 100,  50,
   '["guardian_business_100_servers","orchestra_professional_50_workers","ebpf_plus_autoscale","siem_soar_integration","unified_analytics"]',
   'professional', 1, '["shield","orchestra_scale"]', 81),
  ('lp_b3', 'bundle_enterprise',   'Security + AI Enterprise',   'guardian', 49900, 4990, 1000, -1,
   '["guardian_enterprise_1000_servers","orchestra_enterprise_unlimited","white_label_both","custom_threat_intel_plus_routing","dedicated_engineering_sla"]',
   'enterprise', 1, '["aegis","orchestra_unlimited"]', 82);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4 — LICENSES (Extend with all new product types)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS licenses (
  id               TEXT PRIMARY KEY,
  client_id        TEXT NOT NULL,
  license_key      TEXT NOT NULL UNIQUE,
  product          TEXT NOT NULL DEFAULT 'guardian',
  package_code     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  gateway          TEXT NOT NULL DEFAULT 'manual',
  billing_cycle    TEXT NOT NULL DEFAULT 'yearly',
  license_type     TEXT NOT NULL DEFAULT 'yearly',
  amount_usd       REAL NOT NULL DEFAULT 0,
  expires_at       TEXT NOT NULL,
  bound_machine_id TEXT,
  max_nodes        INTEGER NOT NULL DEFAULT 1,
  max_workers      INTEGER NOT NULL DEFAULT 0,
  max_devices      INTEGER NOT NULL DEFAULT 0,
  max_req_day      INTEGER NOT NULL DEFAULT 0,
  max_sources      INTEGER NOT NULL DEFAULT 0,
  max_ingestion_gb INTEGER NOT NULL DEFAULT 0,
  max_frameworks   INTEGER NOT NULL DEFAULT 1,
  max_resets       INTEGER NOT NULL DEFAULT 3,
  reset_count      INTEGER NOT NULL DEFAULT 0,
  trial_days       INTEGER NOT NULL DEFAULT 0,
  is_lifetime      INTEGER NOT NULL DEFAULT 0,
  max_cpu          INTEGER NOT NULL DEFAULT 0,
  max_gpu          INTEGER NOT NULL DEFAULT 0,
  warning_sent_days TEXT NOT NULL DEFAULT '[]',
  notes            TEXT NOT NULL DEFAULT '',
  source           TEXT NOT NULL DEFAULT 'checkout',
  payment_ref      TEXT NOT NULL DEFAULT '',
  engine_build_id  TEXT,
  meta             TEXT NOT NULL DEFAULT '{}',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_lic_key     ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_lic_client  ON licenses(client_id);
CREATE INDEX IF NOT EXISTS idx_lic_status  ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_lic_product ON licenses(product);
CREATE INDEX IF NOT EXISTS idx_lic_expires ON licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_lic_pkg     ON licenses(package_code);

-- License-node registry (which machine IDs are bound per license)
CREATE TABLE IF NOT EXISTS license_nodes (
  id         TEXT PRIMARY KEY,
  license_id TEXT NOT NULL,
  node_id    TEXT NOT NULL,
  node_name  TEXT NOT NULL DEFAULT '',
  hostname   TEXT NOT NULL DEFAULT '',
  ip         TEXT NOT NULL DEFAULT '',
  os         TEXT NOT NULL DEFAULT '',
  arch       TEXT NOT NULL DEFAULT '',
  version    TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'active',
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (license_id) REFERENCES licenses(id)
);
CREATE INDEX IF NOT EXISTS idx_nodes_lic    ON license_nodes(license_id);
CREATE INDEX IF NOT EXISTS idx_nodes_nodeid ON license_nodes(node_id);

-- License heartbeats (activation pings from deployed engines)
CREATE TABLE IF NOT EXISTS license_heartbeats (
  id           TEXT PRIMARY KEY,
  license_id   TEXT NOT NULL,
  machine_id   TEXT NOT NULL DEFAULT '',
  hostname     TEXT NOT NULL DEFAULT '',
  ip           TEXT NOT NULL DEFAULT '',
  product      TEXT NOT NULL DEFAULT 'unknown',
  version      TEXT NOT NULL DEFAULT '',
  node_count   INTEGER NOT NULL DEFAULT 0,
  worker_count INTEGER NOT NULL DEFAULT 0,
  health       TEXT NOT NULL DEFAULT '{}',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (license_id) REFERENCES licenses(id)
);
CREATE INDEX IF NOT EXISTS idx_hb_lic     ON license_heartbeats(license_id);
CREATE INDEX IF NOT EXISTS idx_hb_created ON license_heartbeats(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5 — PAYMENTS & INVOICING
-- ─────────────────────────────────────────────────────────────────────────────

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL,
  license_id    TEXT,
  client_email  TEXT NOT NULL DEFAULT '',
  client_name   TEXT NOT NULL DEFAULT '',
  organization  TEXT NOT NULL DEFAULT '',
  amount_usd    REAL NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  amount_local  REAL NOT NULL DEFAULT 0,
  fx_rate       REAL NOT NULL DEFAULT 1,
  gateway       TEXT NOT NULL DEFAULT 'manual',
  payment_ref   TEXT NOT NULL DEFAULT '',
  invoice_number TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'paid',
  package_code  TEXT NOT NULL DEFAULT '',
  period_start  TEXT,
  period_end    TEXT,
  line_items    TEXT NOT NULL DEFAULT '[]',
  notes         TEXT NOT NULL DEFAULT '',
  pdf_url       TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_inv_client  ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_inv_ref     ON invoices(payment_ref);
CREATE INDEX IF NOT EXISTS idx_inv_email   ON invoices(client_email);
CREATE INDEX IF NOT EXISTS idx_inv_status  ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_inv_number  ON invoices(invoice_number);

-- Payment gateways
CREATE TABLE IF NOT EXISTS payment_gateways (
  id               TEXT PRIMARY KEY,
  gateway          TEXT NOT NULL UNIQUE,
  display_name     TEXT NOT NULL DEFAULT '',
  credentials_enc  TEXT NOT NULL DEFAULT '',
  webhook_secret   TEXT NOT NULL DEFAULT '',
  supported_currencies TEXT NOT NULL DEFAULT '["USD"]',
  meta             TEXT NOT NULL DEFAULT '{}',
  is_active        INTEGER NOT NULL DEFAULT 0,
  is_test_mode     INTEGER NOT NULL DEFAULT 1,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO payment_gateways (id, gateway, display_name, supported_currencies) VALUES
  ('gw01', 'stripe',    'Stripe',    '["USD","EUR","GBP","SGD","AUD","CAD","JPY"]'),
  ('gw02', 'paypal',    'PayPal',    '["USD","EUR","GBP","AUD","CAD"]'),
  ('gw03', 'xendit',    'Xendit',    '["IDR","PHP","USD","MYR","THB","VND"]'),
  ('gw04', 'midtrans',  'Midtrans',  '["IDR"]'),
  ('gw05', 'crypto',    'Crypto',    '["USDT","USDC","BTC","ETH"]'),
  ('gw06', 'wise',      'Wise',      '["USD","EUR","GBP","IDR","SGD","AUD","MYR","THB","PHP","VND","JPY","KRW","CNY"]'),
  ('gw07', 'manual',    'Manual/Wire','["USD","EUR","GBP","IDR","SGD","AUD","CAD","JPY","KRW","CNY"]');

-- FX rates cache (updated periodically via Cloudflare Worker cron)
CREATE TABLE IF NOT EXISTS fx_rates (
  id         TEXT PRIMARY KEY,
  from_ccy   TEXT NOT NULL DEFAULT 'USD',
  to_ccy     TEXT NOT NULL,
  rate       REAL NOT NULL DEFAULT 1,
  source     TEXT NOT NULL DEFAULT 'openexchangerates',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fx_pair ON fx_rates(from_ccy, to_ccy);

-- Seed base FX rates (will be overwritten by cron)
INSERT OR IGNORE INTO fx_rates (id, from_ccy, to_ccy, rate) VALUES
  ('fx001', 'USD', 'IDR', 15800), ('fx002', 'USD', 'EUR', 0.92),
  ('fx003', 'USD', 'GBP', 0.79),  ('fx004', 'USD', 'SGD', 1.34),
  ('fx005', 'USD', 'AUD', 1.53),  ('fx006', 'USD', 'CAD', 1.36),
  ('fx007', 'USD', 'JPY', 149.5), ('fx008', 'USD', 'KRW', 1320),
  ('fx009', 'USD', 'MYR', 4.72),  ('fx010', 'USD', 'THB', 35.2),
  ('fx011', 'USD', 'PHP', 56.5),  ('fx012', 'USD', 'VND', 24500),
  ('fx013', 'USD', 'CNY', 7.24),  ('fx014', 'USD', 'INR', 83.2),
  ('fx015', 'USD', 'BRL', 4.97),  ('fx016', 'USD', 'MXN', 17.1),
  ('fx017', 'USD', 'ZAR', 18.6),  ('fx018', 'USD', 'NGN', 1580),
  ('fx019', 'USD', 'AED', 3.67),  ('fx020', 'USD', 'SAR', 3.75);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6 — BUILD & RELEASE SYSTEM
-- ─────────────────────────────────────────────────────────────────────────────

-- Product builds (CI/CD artifacts per product per platform)
CREATE TABLE IF NOT EXISTS product_builds (
  id            TEXT PRIMARY KEY,
  product       TEXT NOT NULL,        -- 'guardian-bundle', 'orchestra-starter-bundle', etc.
  package_code  TEXT NOT NULL DEFAULT '', -- 'pro', 'orchestra_scale', etc.
  build_type    TEXT NOT NULL DEFAULT 'docker',  -- 'docker' | 'exe'
  arch          TEXT NOT NULL DEFAULT 'linux',   -- 'linux' | 'arm64' | 'windows'
  status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'building' | 'ready' | 'failed'
  version       TEXT NOT NULL DEFAULT 'latest',
  file_size     INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT NOT NULL DEFAULT '',
  r2_key        TEXT NOT NULL DEFAULT '',
  download_url  TEXT NOT NULL DEFAULT '',
  pipeline_id   TEXT NOT NULL DEFAULT '',
  pipeline_url  TEXT NOT NULL DEFAULT '',
  ci_provider   TEXT NOT NULL DEFAULT '',        -- 'github' | 'gitlab' | 'manual'
  commit_hash   TEXT NOT NULL DEFAULT '',
  progress      INTEGER NOT NULL DEFAULT 0,
  build_log     TEXT NOT NULL DEFAULT '',
  meta          TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pb_product  ON product_builds(product, build_type, arch);
CREATE INDEX IF NOT EXISTS idx_pb_status   ON product_builds(status);
CREATE INDEX IF NOT EXISTS idx_pb_pkg      ON product_builds(package_code);
CREATE INDEX IF NOT EXISTS idx_pb_ci       ON product_builds(ci_provider, status);

-- Seed initial build records for all 7 products × all package tiers × Docker+EXE
INSERT OR IGNORE INTO product_builds (id, product, package_code, build_type, arch, status) VALUES
  -- Guardian builds
  ('pb-g-sent-dk',  'guardian-sentinel-bundle',     'lite',   'docker', 'linux',   'pending'),
  ('pb-g-sent-win', 'guardian-sentinel-bundle',     'lite',   'exe',    'windows', 'pending'),
  ('pb-g-pro-dk',   'guardian-professional-bundle', 'pro',    'docker', 'linux',   'pending'),
  ('pb-g-pro-win',  'guardian-professional-bundle', 'pro',    'exe',    'windows', 'pending'),
  ('pb-g-biz-dk',   'guardian-business-bundle',     'shield', 'docker', 'linux',   'pending'),
  ('pb-g-biz-win',  'guardian-business-bundle',     'shield', 'exe',    'windows', 'pending'),
  ('pb-g-ent-dk',   'guardian-enterprise-bundle',   'aegis',  'docker', 'linux',   'pending'),
  ('pb-g-ent-win',  'guardian-enterprise-bundle',   'aegis',  'exe',    'windows', 'pending'),
  -- Orchestra builds
  ('pb-o-st-dk',  'orchestra-starter-bundle',      'orchestra_core',      'docker', 'linux',   'pending'),
  ('pb-o-st-win', 'orchestra-starter-bundle',      'orchestra_core',      'exe',    'windows', 'pending'),
  ('pb-o-pr-dk',  'orchestra-professional-bundle', 'orchestra_scale',     'docker', 'linux',   'pending'),
  ('pb-o-pr-win', 'orchestra-professional-bundle', 'orchestra_scale',     'exe',    'windows', 'pending'),
  ('pb-o-en-dk',  'orchestra-enterprise-bundle',   'orchestra_unlimited', 'docker', 'linux',   'pending'),
  ('pb-o-en-win', 'orchestra-enterprise-bundle',   'orchestra_unlimited', 'exe',    'windows', 'pending'),
  -- Vault builds
  ('pb-v-gr-dk',  'vault-growth-bundle',       'vault_growth',       'docker', 'linux',   'pending'),
  ('pb-v-pr-dk',  'vault-professional-bundle', 'vault_professional', 'docker', 'linux',   'pending'),
  ('pb-v-en-dk',  'vault-enterprise-bundle',   'vault_enterprise',   'docker', 'linux',   'pending'),
  ('pb-v-so-dk',  'vault-sovereign-bundle',    'vault_unlimited',    'docker', 'linux',   'pending'),
  -- Edge builds
  ('pb-e-gr-dk',  'edge-growth-bundle',       'edge_growth',       'docker', 'linux',   'pending'),
  ('pb-e-pr-dk',  'edge-professional-bundle', 'edge_professional', 'docker', 'linux',   'pending'),
  ('pb-e-en-dk',  'edge-enterprise-bundle',   'edge_enterprise',   'docker', 'linux',   'pending'),
  ('pb-e-pl-dk',  'edge-platform-bundle',     'edge_platform',     'docker', 'linux',   'pending'),
  -- SOC builds
  ('pb-s-gr-dk',  'soc-growth-bundle',       'soc_growth',       'docker', 'linux',   'pending'),
  ('pb-s-pr-dk',  'soc-professional-bundle', 'soc_professional', 'docker', 'linux',   'pending'),
  ('pb-s-en-dk',  'soc-enterprise-bundle',   'soc_enterprise',   'docker', 'linux',   'pending'),
  ('pb-s-pl-dk',  'soc-platform-bundle',     'soc_platform',     'docker', 'linux',   'pending'),
  -- Compliance builds
  ('pb-c-gr-dk',  'compliance-growth-bundle',       'compliance_growth',       'docker', 'linux',   'pending'),
  ('pb-c-pr-dk',  'compliance-professional-bundle', 'compliance_professional', 'docker', 'linux',   'pending'),
  ('pb-c-en-dk',  'compliance-enterprise-bundle',   'compliance_enterprise',   'docker', 'linux',   'pending'),
  ('pb-c-so-dk',  'compliance-sovereign-bundle',    'compliance_sovereign',    'docker', 'linux',   'pending'),
  -- Sentinel OT builds
  ('pb-ot-gr-dk', 'sentinel-growth-bundle',       'sentinel_growth',       'docker', 'linux',   'pending'),
  ('pb-ot-pr-dk', 'sentinel-professional-bundle', 'sentinel_professional', 'docker', 'linux',   'pending'),
  ('pb-ot-en-dk', 'sentinel-enterprise-bundle',   'sentinel_enterprise',   'docker', 'linux',   'pending'),
  ('pb-ot-cr-dk', 'sentinel-critical-bundle',     'sentinel_critical',     'docker', 'linux',   'pending'),
  -- Multi-product bundles
  ('pb-bnd-st-dk', 'bundle-starter',       'bundle_starter',      'docker', 'linux',   'pending'),
  ('pb-bnd-pr-dk', 'bundle-professional',  'bundle_professional', 'docker', 'linux',   'pending'),
  ('pb-bnd-en-dk', 'bundle-enterprise',    'bundle_enterprise',   'docker', 'linux',   'pending');

-- Engine builds (custom one-off builds from admin dashboard)
CREATE TABLE IF NOT EXISTS engine_builds (
  id            TEXT PRIMARY KEY,
  build_type    TEXT NOT NULL DEFAULT 'docker',
  product       TEXT NOT NULL DEFAULT 'guardian',
  status        TEXT NOT NULL DEFAULT 'pending',
  label         TEXT NOT NULL DEFAULT '',
  license_key   TEXT NOT NULL DEFAULT '',
  license_type  TEXT NOT NULL DEFAULT 'yearly',
  trial_days    INTEGER DEFAULT 0,
  max_nodes     INTEGER DEFAULT 1,
  max_gpu       INTEGER DEFAULT 0,
  max_workers   INTEGER DEFAULT 10,
  unlimited     INTEGER DEFAULT 0,
  client_name   TEXT DEFAULT '',
  client_email  TEXT DEFAULT '',
  client_org    TEXT DEFAULT '',
  r2_key        TEXT DEFAULT '',
  download_url  TEXT DEFAULT '',
  file_size     INTEGER DEFAULT 0,
  checksum      TEXT DEFAULT '',
  version       TEXT DEFAULT 'latest',
  arch          TEXT DEFAULT 'linux/amd64',
  notes         TEXT DEFAULT '',
  expires_at    TEXT DEFAULT '',
  deleted_at    TEXT DEFAULT '',
  created_by    TEXT DEFAULT 'admin',
  run_url       TEXT DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eb_status  ON engine_builds(status);
CREATE INDEX IF NOT EXISTS idx_eb_product ON engine_builds(product);

-- Auto-releases (CI/CD build webhooks)
CREATE TABLE IF NOT EXISTS auto_releases (
  id          TEXT PRIMARY KEY,
  channel     TEXT NOT NULL DEFAULT 'latest',
  tag         TEXT NOT NULL DEFAULT '',
  commit_sha  TEXT NOT NULL DEFAULT '',
  run_url     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'success',
  files_count INTEGER NOT NULL DEFAULT 0,
  built_at    TEXT NOT NULL DEFAULT (datetime('now')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_channel ON auto_releases(channel);
CREATE INDEX IF NOT EXISTS idx_ar_built   ON auto_releases(built_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7 — PER-PRODUCT CONFIG TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Generic product config (key-value per product)
CREATE TABLE IF NOT EXISTS product_config (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  product    TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pcfg_pk ON product_config(product, key);

-- Guardian config
INSERT OR IGNORE INTO product_config (product, key, value) VALUES
  ('guardian', 'scan_interval_seconds',      '300'),
  ('guardian', 'ai_threat_confidence_threshold', '0.75'),
  ('guardian', 'auto_quarantine_enabled',    'true'),
  ('guardian', 'auto_kill_process_enabled',  'false'),
  ('guardian', 'auto_block_ip_enabled',      'true'),
  ('guardian', 'ebpf_enabled',               'true'),
  ('guardian', 'clamav_enabled',             'true'),
  ('guardian', 'threat_feed_refresh_hours',  '6'),
  ('guardian', 'alert_email_enabled',        'true'),
  ('guardian', 'alert_slack_enabled',        'false'),
  ('guardian', 'alert_discord_enabled',      'false'),
  ('guardian', 'siem_forward_enabled',       'false'),
  ('guardian', 'siem_forward_url',           ''),
  ('guardian', 'compliance_soc2_enabled',    'true'),
  ('guardian', 'compliance_iso27001_enabled','true'),
  ('guardian', 'compliance_hipaa_enabled',   'true'),
  ('guardian', 'compliance_pcidss_enabled',  'true'),
  ('guardian', 'deception_enabled',          'false'),
  ('guardian', 'honeypot_count',             '3'),
  ('guardian', 'pdf_reports_enabled',        'true');

-- Orchestra config
INSERT OR IGNORE INTO product_config (product, key, value) VALUES
  ('orchestra', 'routing_strategy',          'smart_balance'),
  ('orchestra', 'cost_budget_daily_usd',     '0'),
  ('orchestra', 'autoscale_enabled',         'true'),
  ('orchestra', 'autoscale_queue_threshold', '10'),
  ('orchestra', 'autoscale_max_workers',     '50'),
  ('orchestra', 'autoscale_scaledown_delay', '300'),
  ('orchestra', 'failover_enabled',          'true'),
  ('orchestra', 'failover_max_retries',      '3'),
  ('orchestra', 'semantic_cache_enabled',    'false'),
  ('orchestra', 'semantic_cache_threshold',  '0.92'),
  ('orchestra', 'federation_enabled',        'false'),
  ('orchestra', 'analytics_retention_days',  '90'),
  ('orchestra', 'webhook_events_enabled',    'true'),
  ('orchestra', 'gpu_workers_enabled',       'false'),
  ('orchestra', 'priority_queue_enabled',    'true');

-- Vault config
INSERT OR IGNORE INTO product_config (product, key, value) VALUES
  ('vault', 'confidence_threshold',         '0.85'),
  ('vault', 'redaction_mode',               'mask'),
  ('vault', 'audit_retention_days',         '365'),
  ('vault', 'pii_enabled',                  'true'),
  ('vault', 'phi_enabled',                  'true'),
  ('vault', 'financial_enabled',            'true'),
  ('vault', 'fhir_enabled',                 'false'),
  ('vault', 'synthetic_data_enabled',       'false'),
  ('vault', 'siem_stream_enabled',          'false'),
  ('vault', 'homomorphic_enabled',          'false'),
  ('vault', 'risk_scoring_enabled',         'true'),
  ('vault', 'data_lineage_enabled',         'true');

-- Edge config
INSERT OR IGNORE INTO product_config (product, key, value) VALUES
  ('edge', 'semantic_cache_enabled',        'true'),
  ('edge', 'semantic_cache_ttl_seconds',    '3600'),
  ('edge', 'rate_limit_per_key_rpm',        '60'),
  ('edge', 'rate_limit_per_ip_rpm',         '30'),
  ('edge', 'prompt_firewall_enabled',       'true'),
  ('edge', 'prompt_firewall_sensitivity',   'medium'),
  ('edge', 'ab_testing_enabled',            'false'),
  ('edge', 'token_metering_enabled',        'true'),
  ('edge', 'billing_webhooks_enabled',      'false'),
  ('edge', 'circuit_breaker_enabled',       'true'),
  ('edge', 'circuit_breaker_threshold',     '5'),
  ('edge', 'geo_routing_enabled',           'false');

-- SOC config
INSERT OR IGNORE INTO product_config (product, key, value) VALUES
  ('soc', 'alert_retention_days',           '90'),
  ('soc', 'max_rules',                      '500'),
  ('soc', 'ueba_enabled',                   'true'),
  ('soc', 'ti_enrichment_enabled',          'true'),
  ('soc', 'soar_enabled',                   'true'),
  ('soc', 'ai_triage_enabled',              'true'),
  ('soc', 'ai_triage_confidence',           '0.8'),
  ('soc', 'threat_hunting_enabled',         'true'),
  ('soc', 'forensics_enabled',              'false'),
  ('soc', 'notification_webhook',           ''),
  ('soc', 'slack_channel',                  ''),
  ('soc', 'siem_forward_url',               '');

-- Compliance config
INSERT OR IGNORE INTO product_config (product, key, value) VALUES
  ('compliance', 'frameworks',              '["soc2","iso27001"]'),
  ('compliance', 'audit_retention_days',    '365'),
  ('compliance', 'evidence_auto_collect',   'true'),
  ('compliance', 'risk_scoring_enabled',    'true'),
  ('compliance', 'vendor_mgmt_enabled',     'false'),
  ('compliance', 'policy_templates_count',  '150'),
  ('compliance', 'report_schedule',         'weekly'),
  ('compliance', 'auditor_links_enabled',   'true'),
  ('compliance', 'notification_webhook',    ''),
  ('compliance', 'slack_channel',           '');

-- Sentinel OT config
INSERT OR IGNORE INTO product_config (product, key, value) VALUES
  ('sentinel', 'passive_mode',              'true'),
  ('sentinel', 'protocols',                 '["modbus","dnp3","enip","profinet","iec61850","bacnet","opcua"]'),
  ('sentinel', 'asset_discovery_enabled',   'true'),
  ('sentinel', 'cve_tracking_enabled',      'true'),
  ('sentinel', 'mitre_ics_mapping',         'true'),
  ('sentinel', 'purdue_model_enabled',      'true'),
  ('sentinel', 'siem_forward_enabled',      'false'),
  ('sentinel', 'compliance_nerc_cip',       'false'),
  ('sentinel', 'compliance_iec62443',       'false'),
  ('sentinel', 'anomaly_sensitivity',       'medium'),
  ('sentinel', 'alert_retention_days',      '180');

-- Legacy config tables (keep compatible)
CREATE TABLE IF NOT EXISTS soc_config (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  key        TEXT UNIQUE NOT NULL,
  value      TEXT,
  updated_at REAL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_soc_config_key ON soc_config(key);

CREATE TABLE IF NOT EXISTS compliance_config (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  key        TEXT UNIQUE NOT NULL,
  value      TEXT,
  updated_at REAL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_compliance_config_key ON compliance_config(key);

INSERT OR IGNORE INTO soc_config (key, value) VALUES
  ('alert_retention_days','90'),('max_rules','500'),('ueba_enabled','true'),
  ('ti_enrichment_enabled','true'),('soar_enabled','true'),('ai_triage_enabled','true'),
  ('notification_webhook',''),('slack_channel',''),('siem_forward_url','');

INSERT OR IGNORE INTO compliance_config (key, value) VALUES
  ('frameworks','["soc2","iso27001"]'),('audit_retention_days','365'),
  ('evidence_auto_collect','true'),('notification_webhook',''),
  ('slack_channel',''),('report_schedule','weekly');

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8 — DOWNLOAD ACCESS CONTROL
-- Tracks what each license is entitled to download
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS download_grants (
  id          TEXT PRIMARY KEY,
  license_id  TEXT NOT NULL,
  client_id   TEXT NOT NULL,
  product     TEXT NOT NULL,
  package_code TEXT NOT NULL,
  build_type  TEXT NOT NULL DEFAULT 'docker',  -- 'docker' | 'exe' | 'all'
  granted_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_download  TEXT,
  FOREIGN KEY (license_id) REFERENCES licenses(id),
  FOREIGN KEY (client_id)  REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_dg_license ON download_grants(license_id);
CREATE INDEX IF NOT EXISTS idx_dg_client  ON download_grants(client_id);

-- Download audit log
CREATE TABLE IF NOT EXISTS download_log (
  id          TEXT PRIMARY KEY,
  license_id  TEXT NOT NULL,
  client_email TEXT NOT NULL,
  product     TEXT NOT NULL,
  package_code TEXT NOT NULL,
  file_name   TEXT NOT NULL DEFAULT '',
  build_type  TEXT NOT NULL DEFAULT 'docker',
  file_size   INTEGER NOT NULL DEFAULT 0,
  ip_address  TEXT NOT NULL DEFAULT '',
  user_agent  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dl_license  ON download_log(license_id);
CREATE INDEX IF NOT EXISTS idx_dl_created  ON download_log(created_at);
CREATE INDEX IF NOT EXISTS idx_dl_email    ON download_log(client_email);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9 — AUDIT, EMAIL & WEBHOOK TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Unified audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT NOT NULL DEFAULT '',
  actor_email TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id   TEXT NOT NULL DEFAULT '',
  metadata    TEXT NOT NULL DEFAULT '{}',
  ip_address  TEXT NOT NULL DEFAULT '',
  user_agent  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_al_actor   ON audit_log(actor_email);
CREATE INDEX IF NOT EXISTS idx_al_entity  ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_al_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_al_action  ON audit_log(action);

-- Email delivery log
CREATE TABLE IF NOT EXISTS email_log (
  id         TEXT PRIMARY KEY,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL DEFAULT '',
  template   TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'sent',
  resend_id  TEXT NOT NULL DEFAULT '',
  error_msg  TEXT NOT NULL DEFAULT '',
  metadata   TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_el_email   ON email_log(to_email);
CREATE INDEX IF NOT EXISTS idx_el_status  ON email_log(status);
CREATE INDEX IF NOT EXISTS idx_el_created ON email_log(created_at);

-- Webhook events (inbound from payment gateways)
CREATE TABLE IF NOT EXISTS webhook_events (
  id         TEXT PRIMARY KEY,
  gateway    TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload    TEXT NOT NULL DEFAULT '{}',
  status     TEXT NOT NULL DEFAULT 'received', -- 'received' | 'processed' | 'failed' | 'ignored'
  error_msg  TEXT NOT NULL DEFAULT '',
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_we_gateway ON webhook_events(gateway, event_type);
CREATE INDEX IF NOT EXISTS idx_we_status  ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_we_created ON webhook_events(created_at);

-- Outbound webhook subscriptions (client webhooks for events)
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL,
  url         TEXT NOT NULL,
  secret      TEXT NOT NULL DEFAULT '',
  events      TEXT NOT NULL DEFAULT '["license.activated","license.expired","license.revoked"]',
  is_active   INTEGER NOT NULL DEFAULT 1,
  last_fired  TEXT,
  fail_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_ws_client ON webhook_subscriptions(client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 10 — AUTOPOST & CONTENT MARKETING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS autopost_platform_configs (
  id         TEXT PRIMARY KEY,
  platform   TEXT NOT NULL UNIQUE,
  credentials TEXT NOT NULL DEFAULT '',
  is_active  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS autopost_posts (
  id           TEXT PRIMARY KEY,
  template_id  TEXT NOT NULL DEFAULT '',
  platform     TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT '',
  title        TEXT NOT NULL DEFAULT '',
  body_text    TEXT NOT NULL DEFAULT '',
  image_url    TEXT NOT NULL DEFAULT '',
  hashtags     TEXT NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'draft',
  error_msg    TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT,
  published_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_status    ON autopost_posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_platform  ON autopost_posts(platform);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON autopost_posts(scheduled_at);

CREATE TABLE IF NOT EXISTS autopost_schedules (
  id         TEXT PRIMARY KEY,
  platform   TEXT NOT NULL,
  frequency  TEXT NOT NULL DEFAULT 'daily',
  language   TEXT NOT NULL DEFAULT 'en',
  is_active  INTEGER NOT NULL DEFAULT 1,
  last_run   TEXT,
  next_run   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 11 — PLAYBOOKS (Digital Products)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS playbooks (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL DEFAULT '',
  price_usd    REAL NOT NULL DEFAULT 0,
  file_key     TEXT NOT NULL DEFAULT '',
  preview_url  TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  pages        INTEGER NOT NULL DEFAULT 0,
  language     TEXT NOT NULL DEFAULT 'en',
  tags         TEXT NOT NULL DEFAULT '[]',
  is_active    INTEGER NOT NULL DEFAULT 1,
  download_count INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pb_slug     ON playbooks(slug);
CREATE INDEX IF NOT EXISTS idx_pb_category ON playbooks(category, is_active);

CREATE TABLE IF NOT EXISTS playbook_purchases (
  id           TEXT PRIMARY KEY,
  client_id    TEXT NOT NULL,
  playbook_id  TEXT NOT NULL,
  amount_usd   REAL NOT NULL DEFAULT 0,
  gateway      TEXT NOT NULL DEFAULT 'manual',
  payment_ref  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'completed',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id)   REFERENCES clients(id),
  FOREIGN KEY (playbook_id) REFERENCES playbooks(id)
);
CREATE INDEX IF NOT EXISTS idx_pp_client  ON playbook_purchases(client_id);
CREATE INDEX IF NOT EXISTS idx_pp_playbook ON playbook_purchases(playbook_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 12 — SITE SETTINGS & CONTENT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_settings (
  id         TEXT PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO site_settings (id, key, value) VALUES
  ('ss001', 'platform_name',          'AXTO Platform'),
  ('ss002', 'platform_tagline',       'AI Security & Orchestration — 100% Self-Hosted'),
  ('ss003', 'platform_url',           'https://axto.io'),
  ('ss004', 'support_email',          'hallo@axto.io'),
  ('ss005', 'product_count',          '7'),
  ('ss006', 'stats_licenses',         '500+'),
  ('ss007', 'stats_servers_protected','10,000+'),
  ('ss008', 'stats_uptime',           '99.9%'),
  ('ss009', 'stats_countries',        '42+'),
  ('ss010', 'trial_days',             '14'),
  ('ss011', 'money_back_days',        '30'),
  ('ss012', 'deploy_minutes',         '10'),
  ('ss013', 'guardian_docker_image',  'registry.gitlab.com/axto-platform/guardian-ai/guardian-engine:latest'),
  ('ss014', 'orchestra_docker_image', 'registry.gitlab.com/axto-platform/guardian-ai/orchestra-core:latest'),
  ('ss015', 'vault_docker_image',     'registry.gitlab.com/axto-platform/vault-ai/vault-engine:latest'),
  ('ss016', 'edge_docker_image',      'registry.gitlab.com/axto-platform/edge-ai/edge-engine:latest'),
  ('ss017', 'soc_docker_image',       'registry.gitlab.com/axto-platform/soc-ai/soc-engine:latest'),
  ('ss018', 'compliance_docker_image','registry.gitlab.com/axto-platform/compliance-ai/compliance-engine:latest'),
  ('ss019', 'sentinel_docker_image',  'registry.gitlab.com/axto-platform/sentinel-ot/sentinel-engine:latest'),
  ('ss020', 'maintenance_mode',       'false'),
  ('ss021', 'registration_open',      'true'),
  ('ss022', 'max_trial_seats',        '1000'),
  ('ss023', 'crypto_payments_enabled','false'),
  ('ss024', 'multi_currency_enabled', 'true');

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  enabled     INTEGER NOT NULL DEFAULT 0,
  rollout_pct INTEGER NOT NULL DEFAULT 0,
  targets     TEXT NOT NULL DEFAULT '[]',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO feature_flags (id, name, description, enabled, rollout_pct) VALUES
  ('ff001', 'new_landing_v2',          'New 7-product landing page',              1, 100),
  ('ff002', 'bundle_downloads',        'Per-tier packaged bundle downloads',       1, 100),
  ('ff003', 'multi_currency_checkout', 'Multi-currency checkout with FX rates',    1, 100),
  ('ff004', 'client_portal_v2',        'New client portal with all 7 products',    1, 100),
  ('ff005', 'crypto_payments',         'Crypto payment gateway (USDT/USDC)',       0, 0),
  ('ff006', 'ai_support_bot',          'AI support bot in client portal',          1, 100),
  ('ff007', 'orchestrate_downloads',   'Orchestrated CI/CD build system',          1, 100),
  ('ff008', 'sentinel_product',        'Sentinel OT/ICS product enabled',          1, 100),
  ('ff009', 'vault_product',           'Vault AI product enabled',                 1, 100),
  ('ff010', 'edge_product',            'Edge AI product enabled',                  1, 100),
  ('ff011', 'soc_product',             'SOC AI product enabled',                   1, 100),
  ('ff012', 'compliance_product',      'Compliance AI product enabled',            1, 100),
  ('ff013', 'white_label',             'White-label portal for enterprise clients', 0, 0),
  ('ff014', 'air_gap_builds',          'Air-gap build pipeline',                   0, 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 13 — ADMIN SEED (Idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO users (id, email, role, password_hash, created_at, updated_at)
VALUES (
  lower(hex(randomblob(16))),
  'admin@axto.io',
  'admin',
  'CHANGE_THIS_RUN_setup.sh_TO_GENERATE_HASH',
  datetime('now'),
  datetime('now')
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 14 — AUDIT LOG ENTRY FOR THIS MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0025',
  'schema_migration',
  'system',
  '0025',
  'system',
  '{"migration":"0025_complete_platform_rewrite","products":7,"packages":29,"tables_created":28,"description":"Complete rewrite: all 7 products (guardian,orchestra,vault,edge,soc,compliance,sentinel), competitive pricing benchmarked vs CrowdStrike/Splunk/Vanta/Kong/Claroty, download grants system, per-product config, FX rates, feature flags, webhook subscriptions"}',
  datetime('now')
);
