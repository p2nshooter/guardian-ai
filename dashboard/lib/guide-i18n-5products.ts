/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO 5 Products — Complete 10-Language Guide i18n
 * Vault · SOC · Compliance · Edge · Sentinel
 * Languages: EN, ID, ZH, AR, ES, FR, DE, PT, JA, KO
 */

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",          flag: "🇬🇧", dir: "ltr" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩", dir: "ltr" },
  { code: "zh", label: "中文",             flag: "🇨🇳", dir: "ltr" },
  { code: "ar", label: "العربية",          flag: "🇸🇦", dir: "rtl" },
  { code: "es", label: "Español",          flag: "🇪🇸", dir: "ltr" },
  { code: "fr", label: "Français",         flag: "🇫🇷", dir: "ltr" },
  { code: "de", label: "Deutsch",          flag: "🇩🇪", dir: "ltr" },
  { code: "pt", label: "Português",        flag: "🇧🇷", dir: "ltr" },
  { code: "ja", label: "日本語",           flag: "🇯🇵", dir: "ltr" },
  { code: "ko", label: "한국어",           flag: "🇰🇷", dir: "ltr" },
] as const;

export type LangCode = typeof SUPPORTED_LANGUAGES[number]["code"];

export interface ProductStep {
  title: string;
  desc:  string;
  code:  string;
}

export interface ProductGuide5 {
  name:         string;
  tagline:      string;
  port:         number;
  icon:         string;
  color:        string;
  overview:     string;
  prerequisites: string[];
  steps:        ProductStep[];
  config_example: string;
  verify:       string;
  verify_expected: string;
  api_examples: { title: string; code: string }[];
  support_note: string;
}

export interface Guide5 {
  title:    string;
  subtitle: string;
  download_steps: string[];
  products: Record<string, ProductGuide5>;
  support:  { label: string; value: string }[];
}

const GUIDES_5PRODUCTS: Record<LangCode, Guide5> = {
  // ═══════════════════════════════════════════════════════════════
  // ENGLISH
  // ═══════════════════════════════════════════════════════════════
  en: {
    title:    "AXTO Platform — 5 Products Setup Guide",
    subtitle: "Complete deployment guide for Vault, SOC, Compliance, Edge & Sentinel",
    download_steps: [
      "Purchase your license at axto.io/portal",
      "Login to portal → Licenses tab → click Download",
      "Choose format: Docker Linux, EXE Linux, or EXE Windows",
      "Extract ZIP → run install.sh (Linux) or install.bat (Windows)",
    ],
    products: {
      vault: {
        name: "AXTO Vault", tagline: "Privacy Intelligence Engine", port: 8091,
        icon: "🔒", color: "#7c3aed",
        overview: "AXTO Vault is a production-grade privacy layer that automatically detects, masks, tokenizes, and encrypts PII (Personally Identifiable Information) across all your data streams. Fully self-hosted, BYOK (bring your own AI keys), zero data exposure to AXTO.",
        prerequisites: [
          "Docker Engine 20.10+ and Docker Compose v2+",
          "Minimum 1 GB RAM, 5 GB disk",
          "AXTO Vault license key (from portal)",
          "(Optional) AI provider API key for context-aware detection",
        ],
        steps: [
          { title: "1. Download & Extract",
            desc: "Download from portal and extract the bundle.",
            code: "unzip axto-vault-docker-linux.zip\ncd axto-vault-bundle/" },
          { title: "2. Install",
            desc: "Run the install script. It auto-installs Docker, loads images, and creates a systemd service.",
            code: "sudo bash install.sh vault\n\n# Windows (Run as Administrator):\ninstall.bat vault" },
          { title: "3. Configure License",
            desc: "Edit vault.yml and set your license key from the portal.",
            code: "# /opt/axto-vault/vault.yml\nvault:\n  license_key: \"VAULT-A1B2-C3D4-E5F6-XXXXXXXXXXXX\"\n  license_validate_url: \"https://axto.io/api/license-validate\"\n  masking:\n    default_strategy: \"redact\"   # redact|partial|pseudonymize|tokenize|encrypt\n  compliance:\n    frameworks: [gdpr, pdpa]     # gdpr|pdpa|hipaa|pci_dss|ccpa|soc2\n  ai_pool:\n    vendors:\n      - provider: openai\n        api_key: \"sk-your-key\"  # optional: enables AI context detection\n        model: \"gpt-4o-mini\"" },
          { title: "4. Restart & Verify",
            desc: "Restart the service and verify health.",
            code: "sudo systemctl restart axto-vault\ncurl http://localhost:8091/health\n# Expected: {\"status\":\"ok\",\"license_valid\":true}" },
          { title: "5. First Scan",
            desc: "Run your first PII scan.",
            code: "curl -X POST http://localhost:8091/v1/scan \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"text\":\"Email: john.doe@company.com, KTP: 3201234567890001\"}'\n\n# Response:\n# {\"total_pii_count\":2,\"risk_score\":0.28,\n#  \"masked_text\":\"Email: [EMAIL REDACTED], KTP: [NATIONAL_ID REDACTED]\"}" },
          { title: "6. Integrate Your App",
            desc: "Route all data through Vault before storage or transmission.",
            code: "# Python example:\nimport requests\n\ndef mask_pii(text: str) -> str:\n    r = requests.post('http://vault-server:8091/v1/mask',\n        json={'text': text, 'strategy': 'pseudonymize'})\n    return r.json()['masked_text']\n\n# Node.js example:\nconst mask = async (text) => {\n    const r = await fetch('http://vault-server:8091/v1/mask',\n        {method:'POST', body: JSON.stringify({text, strategy:'pseudonymize'})})\n    return (await r.json()).masked_text\n}" },
        ],
        config_example: "vault:\n  license_key: \"VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  masking:\n    default_strategy: \"pseudonymize\"\n  compliance:\n    frameworks: [gdpr, pdpa, hipaa]\n  ai_pool:\n    vendors:\n      - provider: openai\n        api_key: \"sk-your-key\"\n        model: \"gpt-4o-mini\"\n  differential_privacy:\n    enabled: true\n    epsilon: 1.0",
        verify: "curl http://localhost:8091/health",
        verify_expected: "{\"status\":\"ok\",\"license_valid\":true,\"engine_ready\":true}",
        api_examples: [
          { title: "Scan for PII", code: "POST /v1/scan\n{\"text\": \"...\", \"strategy\": \"redact\", \"use_ai\": true}" },
          { title: "Mask only", code: "POST /v1/mask\n{\"text\": \"...\", \"strategy\": \"pseudonymize\"}" },
          { title: "Tokenize", code: "POST /v1/scan\n{\"text\": \"...\", \"strategy\": \"tokenize\"}" },
          { title: "GDPR Erasure", code: "POST /v1/erasure\n{\"identifier\": \"user@email.com\", \"reason\": \"user_request\"}" },
          { title: "Stats", code: "GET /v1/stats" },
        ],
        support_note: "Documentation: axto.io/docs/vault | Support: hallo@axto.io",
      },
      soc: {
        name: "AXTO SOC", tagline: "Security Operations Center", port: 8092,
        icon: "🛡️", color: "#dc2626",
        overview: "AXTO SOC is a full-stack managed security operations platform: SIEM log aggregation, SOAR automated response (real iptables blocks, Slack alerts, Guardian host isolation), UEBA anomaly detection, AbuseIPDB + OTX threat intelligence, and AI-powered incident triage.",
        prerequisites: [
          "Docker Engine 20.10+ and Docker Compose v2+",
          "Minimum 2 GB RAM, 20 GB disk",
          "AXTO SOC license key",
          "(Recommended) AbuseIPDB API key (free: 1000/day at abuseipdb.com)",
          "(Recommended) AlienVault OTX key (free at otx.alienvault.com)",
          "(Optional) Slack webhook, firewall API, Guardian API for SOAR",
        ],
        steps: [
          { title: "1. Install",
            desc: "Download and run install script.",
            code: "sudo bash install.sh soc" },
          { title: "2. Configure Threat Intelligence",
            desc: "Add free API keys for TI enrichment.",
            code: "# /opt/axto-soc/soc.yml\nsoc:\n  license_key: \"SOC-XXXX-...\"\n  abuseipdb_api_key: \"your-abuseipdb-key\"\n  otx_api_key: \"your-otx-key\"" },
          { title: "3. Configure SOAR Actions",
            desc: "Enable automated response integrations.",
            code: "soc:\n  soar:\n    slack_webhook_url: \"https://hooks.slack.com/services/...\"\n    firewall_api_url: \"http://your-firewall/api\"   # optional\n    guardian_api_url: \"http://guardian-core:8080\"  # optional\n    ticketing_webhook_url: \"https://your-jira/...\" # optional" },
          { title: "4. Send Logs to SOC",
            desc: "Configure your systems to stream logs to SOC.",
            code: "# rsyslog → SOC (add to /etc/rsyslog.conf):\n*.* action(type=\"omhttp\"\n  server=\"soc-server\" serverport=\"8092\"\n  httpcontenttype=\"application/json\")\n\n# Or direct API:\ncurl -X POST http://soc-server:8092/v1/ingest \\\n  -H 'X-SOC-Key: your-api-key' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"logs\":[\"Failed password for root from 45.33.32.156\"],\"source\":\"syslog\"}'" },
          { title: "5. Monitor Dashboard",
            desc: "Check the SOC dashboard for live alerts and incidents.",
            code: "curl http://soc-server:8092/v1/dashboard\n# Returns: alerts_24h, open_incidents, mttd, mttr, by_severity, top_rules" },
        ],
        config_example: "soc:\n  license_key: \"SOC-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  abuseipdb_api_key: \"your-key\"\n  otx_api_key: \"your-key\"\n  ueba_z_threshold: 3.0\n  correlation_window_sec: 900\n  soar:\n    slack_webhook_url: \"https://hooks.slack.com/...\"\n  ai_pool:\n    vendors:\n      - provider: openai\n        api_key: \"sk-your-key\"\n        model: \"gpt-4o-mini\"",
        verify: "curl http://localhost:8092/health",
        verify_expected: "{\"status\":\"ok\",\"license_valid\":true}",
        api_examples: [
          { title: "Ingest logs", code: "POST /v1/ingest\n{\"logs\":[\"...\"],\"source\":\"syslog\"}" },
          { title: "Get alerts", code: "GET /v1/alerts?severity=critical&limit=50" },
          { title: "Get incidents", code: "GET /v1/incidents?status=new" },
          { title: "Update incident", code: "PATCH /v1/incidents/{id}\n{\"status\":\"confirmed\",\"assignee\":\"alice\"}" },
          { title: "Dashboard", code: "GET /v1/dashboard" },
          { title: "Mark false positive", code: "POST /v1/feedback/false-positive\n{\"alert_id\":\"...\",\"analyst\":\"bob\",\"reason\":\"internal scanner\"}" },
        ],
        support_note: "Documentation: axto.io/docs/soc | Support: hallo@axto.io",
      },
      compliance: {
        name: "AXTO Compliance", tagline: "Automated Audit Platform", port: 8093,
        icon: "📋", color: "#0284c7",
        overview: "AXTO Compliance continuously monitors your infrastructure against SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA, and NIST CSF. Real automated checks (HTTP probing, TLS cert validation, process verification, file existence) — not just checklists.",
        prerequisites: [
          "Docker Engine 20.10+ and Docker Compose v2+",
          "Minimum 1 GB RAM, 5 GB disk",
          "AXTO Compliance license key",
          "Your app URL for HTTP/TLS checks",
        ],
        steps: [
          { title: "1. Install",
            desc: "Run install script.",
            code: "sudo bash install.sh compliance" },
          { title: "2. Configure Frameworks & Endpoints",
            desc: "Select frameworks and point to your services.",
            code: "# /opt/axto-compliance/compliance.yml\ncompliance:\n  license_key: \"CMPL-XXXX-...\"\n  frameworks: [soc2, gdpr, iso27001]\n  endpoints:\n    app_url: \"https://your-app.com\"\n    guardian_api_url: \"http://guardian-core:8080\"\n    soc_api_url: \"http://soc-server:8092\"\n    privacy_policy_url: \"https://your-app.com/privacy\"" },
          { title: "3. Create Policy Directory",
            desc: "Upload your policy documents so auto-checks can verify them.",
            code: "sudo mkdir -p /etc/axto-compliance/policies\nsudo mkdir -p /etc/axto-compliance/evidence\nsudo mkdir -p /etc/axto-compliance/gdpr\n\n# Place your policy PDFs:\n# /etc/axto-compliance/policies/access-control-policy.pdf\n# /etc/axto-compliance/policies/incident-response.pdf\n# /etc/axto-compliance/policies/information-security-policy.pdf\n# /etc/axto-compliance/gdpr/ropa.json\n# /etc/axto-compliance/gdpr/breach-notification-procedure.pdf" },
          { title: "4. Run First Assessment",
            desc: "Trigger assessment and get your compliance score.",
            code: "# Run SOC 2 assessment:\ncurl -X POST http://localhost:8093/v1/assess/soc2\n\n# Run all enabled frameworks:\nfor fw in soc2 gdpr iso27001; do\n  curl -X POST http://localhost:8093/v1/assess/$fw\ndone\n\n# Get summary:\ncurl http://localhost:8093/v1/summary" },
          { title: "5. Review Gaps & Remediate",
            desc: "Check failing controls and follow remediation guidance.",
            code: "# See failing controls:\ncurl 'http://localhost:8093/v1/controls/soc2?status=fail'\n\n# See open risk items:\ncurl http://localhost:8093/v1/risk-items?status=open\n\n# Download full report:\ncurl http://localhost:8093/v1/report/soc2 > soc2-report.json" },
        ],
        config_example: "compliance:\n  license_key: \"CMPL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  frameworks: [soc2, iso27001, gdpr, pdpa]\n  run_on_startup: true\n  continuous_monitoring_interval_hours: 24\n  endpoints:\n    app_url: \"https://your-app.com\"\n    privacy_policy_url: \"https://your-app.com/privacy\"\n    guardian_api_url: \"http://guardian-core:8080\"",
        verify: "curl http://localhost:8093/health",
        verify_expected: "{\"status\":\"ok\",\"license_valid\":true}",
        api_examples: [
          { title: "Run assessment", code: "POST /v1/assess/{framework}\n# framework: soc2|iso27001|hipaa|pci_dss|gdpr|pdpa|nist_csf" },
          { title: "Get report", code: "GET /v1/report/{framework}" },
          { title: "Summary", code: "GET /v1/summary" },
          { title: "Failing controls", code: "GET /v1/controls/soc2?status=fail" },
          { title: "Risk items", code: "GET /v1/risk-items?status=open" },
        ],
        support_note: "Documentation: axto.io/docs/compliance | Support: hallo@axto.io",
      },
      edge: {
        name: "AXTO Edge", tagline: "AI Gateway & API Management", port: 8094,
        icon: "⚡", color: "#d97706",
        overview: "AXTO Edge is an OpenAI-compatible AI gateway. Change one line in your app (base_url) and instantly get: smart multi-provider routing, per-customer rate limiting, token billing, prompt injection firewall, response caching, circuit breaker failover, and real-time cost analytics.",
        prerequisites: [
          "Docker Engine 20.10+ and Docker Compose v2+",
          "Minimum 1 GB RAM, 5 GB disk",
          "AXTO Edge license key",
          "At least one AI provider API key (BYOK)",
        ],
        steps: [
          { title: "1. Install",
            desc: "Run install script.",
            code: "sudo bash install.sh edge" },
          { title: "2. Configure AI Providers (BYOK)",
            desc: "Add your AI provider keys. Edge routes between them automatically.",
            code: "# /opt/axto-edge/edge.yml\nai_pool:\n  routing_mode: \"cost_first\"  # cost_first|quality_first|latency_first|smart_balance\n  vendors:\n    - provider: openai\n      api_key: \"sk-your-key\"\n      model: \"gpt-4o-mini\"\n    - provider: anthropic\n      api_key: \"sk-ant-your-key\"\n      model: \"claude-haiku-4-5-20251001\"\n    - provider: groq\n      api_key: \"gsk_your-key\"\n      model: \"llama-3.1-8b-instant\"" },
          { title: "3. Add Customers",
            desc: "Configure per-customer rate limits and budgets.",
            code: "customers:\n  - api_key: \"cust-key-abc123\"\n    customer_id: \"startup-acme\"\n    rpm: 60          # requests per minute\n    tpm: 100000      # tokens per minute\n    tpd: 2000000     # tokens per day\n    budget_daily_usd: 25.0" },
          { title: "4. Change base_url in Your App",
            desc: "Single line change — no other code modifications needed.",
            code: "# Python (OpenAI SDK):\nfrom openai import OpenAI\nclient = OpenAI(\n    base_url=\"http://edge-server:8094/v1\",\n    api_key=\"cust-key-abc123\"\n)\nresponse = client.chat.completions.create(\n    model=\"gpt-4o-mini\",  # Edge routes to cheapest provider\n    messages=[{\"role\":\"user\",\"content\":\"Hello!\"}]\n)\n\n# Node.js:\nconst openai = new OpenAI({\n    baseURL: 'http://edge-server:8094/v1',\n    apiKey: 'cust-key-abc123'\n})\n\n# Any OpenAI-compatible SDK works the same way" },
          { title: "5. Monitor Usage & Costs",
            desc: "Track usage, costs, and billing per customer.",
            code: "# Real-time stats:\ncurl http://localhost:8094/v1/stats\n\n# Monthly bill for a customer:\ncurl http://localhost:8094/v1/billing/startup-acme/2025-01\n\n# Available models:\ncurl http://localhost:8094/v1/models" },
        ],
        config_example: "edge:\n  license_key: \"EDGE-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  firewall:\n    block_injections: true\n    block_jailbreaks: true\n  cache:\n    enabled: true\n    ttl_seconds: 3600\n  circuit_breaker_threshold: 5\n\nai_pool:\n  routing_mode: \"cost_first\"\n  vendors:\n    - provider: openai\n      api_key: \"sk-your-key\"\n      model: \"gpt-4o-mini\"\n\ncustomers:\n  - api_key: \"your-customer-api-key\"\n    customer_id: \"customer-001\"\n    rpm: 60\n    tpm: 100000\n    tpd: 2000000\n    budget_daily_usd: 50.0",
        verify: "curl http://localhost:8094/health",
        verify_expected: "{\"status\":\"ok\",\"license_valid\":true}",
        api_examples: [
          { title: "Chat completion (OpenAI-compatible)", code: "POST /v1/chat/completions\nAuthorization: Bearer cust-key\n{\"model\":\"gpt-4o-mini\",\"messages\":[...]}" },
          { title: "List models", code: "GET /v1/models" },
          { title: "Usage stats", code: "GET /v1/stats" },
          { title: "Customer billing", code: "GET /v1/billing/{customer_id}/{YYYY-MM}" },
          { title: "Cache stats", code: "GET /v1/cache/stats" },
        ],
        support_note: "Documentation: axto.io/docs/edge | Support: hallo@axto.io",
      },
      sentinel: {
        name: "AXTO Sentinel", tagline: "IoT/OT Security", port: 8095,
        icon: "📡", color: "#059669",
        overview: "AXTO Sentinel protects industrial and IoT networks: auto-discovers OT devices (PLCs, HMIs, SCADA, cameras), polls Modbus registers for anomalies, audits MQTT brokers for anonymous access, matches device fingerprints to CVE databases, and enforces IEC 62443 / NERC CIP compliance.",
        prerequisites: [
          "Docker Engine 20.10+ and Docker Compose v2+",
          "Minimum 2 GB RAM, 10 GB disk",
          "AXTO Sentinel license key",
          "Network access to OT/IoT subnets to scan",
          "(Optional) NVD API key for CVE enrichment (free at nvd.nist.gov/developers)",
          "(Optional) Slack webhook for real-time alerts",
        ],
        steps: [
          { title: "1. Install",
            desc: "Run install script on a server with network access to your OT subnet.",
            code: "sudo bash install.sh sentinel" },
          { title: "2. Configure OT Subnets",
            desc: "Tell Sentinel which networks to scan and monitor.",
            code: "# /opt/axto-sentinel/sentinel.yml\nsentinel:\n  license_key: \"SNTL-XXXX-...\"\n  scan_subnets:\n    - \"192.168.100.0/24\"   # OT network\n    - \"10.10.20.0/24\"      # SCADA network\n  scan_interval_sec: 3600   # re-scan every hour\n  poll_interval_sec: 60     # poll devices every minute\n\n  # Pre-authorize known devices (avoid 'new device' alerts):\n  authorized_devices:\n    - \"192.168.100.10\"   # Siemens S7-300\n    - \"192.168.100.11\"   # Modicon M340" },
          { title: "3. Configure Modbus Polling",
            desc: "Set which Modbus registers to monitor for anomalies.",
            code: "sentinel:\n  modbus_poll:\n    \"192.168.100.10\":    # PLC IP address\n      start_address: 0   # First holding register\n      count: 20          # Read 20 registers\n      unit_id: 1         # Modbus slave ID" },
          { title: "4. Configure Alerts",
            desc: "Set up real-time alerting.",
            code: "sentinel:\n  slack_webhook_url: \"https://hooks.slack.com/services/...\"\n  soar_webhook_url: \"https://your-soar/webhook\"\n  nvd_api_key: \"your-nvd-key\"  # free at nvd.nist.gov" },
          { title: "5. Monitor",
            desc: "View device inventory, alerts, and compliance.",
            code: "# Dashboard:\ncurl http://localhost:8095/v1/dashboard\n\n# All discovered devices:\ncurl http://localhost:8095/v1/devices\n\n# Critical alerts:\ncurl 'http://localhost:8095/v1/alerts?severity=critical&acknowledged=false'\n\n# IEC 62443 compliance:\ncurl http://localhost:8095/v1/compliance/iec62443" },
        ],
        config_example: "sentinel:\n  license_key: \"SNTL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  scan_subnets: [\"192.168.100.0/24\"]\n  scan_interval_sec: 3600\n  poll_interval_sec: 60\n  authorized_devices: []\n  modbus_poll:\n    \"192.168.100.10\":\n      start_address: 0\n      count: 20\n      unit_id: 1\n  slack_webhook_url: \"\"\n  nvd_api_key: \"\"\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-your-key\"\n      model: \"gpt-4o-mini\"",
        verify: "curl http://localhost:8095/health",
        verify_expected: "{\"status\":\"ok\",\"license_valid\":true}",
        api_examples: [
          { title: "Dashboard", code: "GET /v1/dashboard" },
          { title: "Device inventory", code: "GET /v1/devices?device_type=plc" },
          { title: "OT alerts", code: "GET /v1/alerts?severity=high" },
          { title: "Acknowledge alert", code: "POST /v1/alerts/{id}/acknowledge\n{\"analyst\":\"alice\"}" },
          { title: "Authorize device", code: "POST /v1/devices/authorize\n{\"ip\":\"192.168.100.15\"}" },
          { title: "IEC 62443 report", code: "GET /v1/compliance/iec62443" },
          { title: "Modbus readings", code: "GET /v1/register-readings?device_ip=192.168.100.10&anomaly_only=true" },
        ],
        support_note: "Documentation: axto.io/docs/sentinel | Support: hallo@axto.io",
      },
    },
    support: [
      { label: "Portal",        value: "https://axto.io/portal" },
      { label: "Documentation", value: "https://axto.io/docs" },
      { label: "Email",         value: "hallo@axto.io" },
      { label: "Website",       value: "https://axto.io" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // BAHASA INDONESIA
  // ═══════════════════════════════════════════════════════════════
  id: {
    title:    "AXTO Platform — Panduan Setup 5 Produk",
    subtitle: "Panduan deployment lengkap untuk Vault, SOC, Compliance, Edge & Sentinel",
    download_steps: [
      "Beli lisensi di axto.io/portal",
      "Login portal → tab Licenses → klik Download",
      "Pilih format: Docker Linux, EXE Linux, atau EXE Windows",
      "Extract ZIP → jalankan install.sh (Linux) atau install.bat (Windows)",
    ],
    products: {
      vault: {
        name: "AXTO Vault", tagline: "Privacy Intelligence Engine", port: 8091,
        icon: "🔒", color: "#7c3aed",
        overview: "AXTO Vault adalah privacy layer production-grade yang otomatis mendeteksi, menyamarkan, men-tokenisasi, dan mengenkripsi PII di semua data stream Anda. 100% self-hosted, BYOK (bawa API key sendiri), data tidak pernah keluar ke AXTO.",
        prerequisites: [
          "Docker Engine 20.10+ dan Docker Compose v2+",
          "Minimum 1 GB RAM, 5 GB disk",
          "License key AXTO Vault (dari portal)",
          "(Opsional) API key provider AI untuk deteksi berbasis konteks",
        ],
        steps: [
          { title: "1. Download & Extract",
            desc: "Download dari portal dan extract bundle.",
            code: "unzip axto-vault-docker-linux.zip\ncd axto-vault-bundle/" },
          { title: "2. Install",
            desc: "Jalankan install script. Otomatis install Docker, load image, dan buat systemd service.",
            code: "sudo bash install.sh vault\n\n# Windows (Run as Administrator):\ninstall.bat vault" },
          { title: "3. Set License Key",
            desc: "Edit vault.yml dan isi license_key dari portal.",
            code: "# /opt/axto-vault/vault.yml\nvault:\n  license_key: \"VAULT-A1B2-C3D4-E5F6-XXXXXXXXXXXX\"\n  masking:\n    default_strategy: \"redact\"\n  compliance:\n    frameworks: [gdpr, pdpa]\n  ai_pool:\n    vendors:\n      - provider: openai\n        api_key: \"sk-key-anda\"\n        model: \"gpt-4o-mini\"" },
          { title: "4. Restart & Verifikasi",
            desc: "Restart service dan cek health.",
            code: "sudo systemctl restart axto-vault\ncurl http://localhost:8091/health\n# Expected: {\"status\":\"ok\",\"license_valid\":true}" },
          { title: "5. Scan Pertama",
            desc: "Coba scan PII pertama.",
            code: "curl -X POST http://localhost:8091/v1/scan \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"text\":\"Email: budi@perusahaan.com, NIK: 3201234567890001\"}'" },
          { title: "6. Integrasi Aplikasi",
            desc: "Routing data sensitif melalui Vault sebelum disimpan atau dikirim.",
            code: "# Python:\nimport requests\ndef mask_pii(text):\n    r = requests.post('http://vault-server:8091/v1/mask',\n        json={'text': text, 'strategy': 'pseudonymize'})\n    return r.json()['masked_text']" },
        ],
        config_example: "vault:\n  license_key: \"VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  masking:\n    default_strategy: \"pseudonymize\"\n  compliance:\n    frameworks: [gdpr, pdpa, hipaa]",
        verify: "curl http://localhost:8091/health",
        verify_expected: "{\"status\":\"ok\",\"license_valid\":true}",
        api_examples: [
          { title: "Scan PII", code: "POST /v1/scan\n{\"text\":\"...\",\"strategy\":\"redact\"}" },
          { title: "Mask saja", code: "POST /v1/mask\n{\"text\":\"...\",\"strategy\":\"pseudonymize\"}" },
          { title: "Erasure GDPR/PDPA", code: "POST /v1/erasure\n{\"identifier\":\"user@email.com\"}" },
        ],
        support_note: "Dokumentasi: axto.io/docs/vault | Support: hallo@axto.io",
      },
      soc: {
        name: "AXTO SOC", tagline: "Security Operations Center", port: 8092,
        icon: "🛡️", color: "#dc2626",
        overview: "AXTO SOC adalah platform SOC enterprise lengkap: agregasi log SIEM, SOAR otomatis (block IP via iptables, alert Slack, isolasi host via Guardian), deteksi anomali UEBA, threat intelligence AbuseIPDB + OTX, dan triage insiden berbasis AI.",
        prerequisites: [
          "Docker Engine 20.10+ dan Docker Compose v2+",
          "Minimum 2 GB RAM, 20 GB disk",
          "License key AXTO SOC",
          "(Direkomendasikan) AbuseIPDB API key gratis di abuseipdb.com",
          "(Direkomendasikan) OTX API key gratis di otx.alienvault.com",
        ],
        steps: [
          { title: "1. Install", desc: "Jalankan install script.", code: "sudo bash install.sh soc" },
          { title: "2. Konfigurasi TI", desc: "Tambahkan API key TI gratis.",
            code: "soc:\n  license_key: \"SOC-XXXX-...\"\n  abuseipdb_api_key: \"key-anda\"\n  otx_api_key: \"key-anda\"" },
          { title: "3. Konfigurasi SOAR", desc: "Aktifkan integrasi response otomatis.",
            code: "soc:\n  soar:\n    slack_webhook_url: \"https://hooks.slack.com/...\"\n    guardian_api_url: \"http://guardian-core:8080\"" },
          { title: "4. Kirim Log ke SOC", desc: "Konfigurasi sistem untuk stream log ke SOC.",
            code: "curl -X POST http://soc-server:8092/v1/ingest \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"logs\":[\"Failed password for root from 1.2.3.4\"],\"source\":\"syslog\"}'" },
          { title: "5. Monitor", desc: "Pantau dashboard SOC.",
            code: "curl http://soc-server:8092/v1/dashboard" },
        ],
        config_example: "soc:\n  license_key: \"SOC-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  abuseipdb_api_key: \"key-anda\"\n  otx_api_key: \"key-anda\"\n  soar:\n    slack_webhook_url: \"https://hooks.slack.com/...\"",
        verify: "curl http://localhost:8092/health",
        verify_expected: "{\"status\":\"ok\",\"license_valid\":true}",
        api_examples: [
          { title: "Ingest log", code: "POST /v1/ingest\n{\"logs\":[\"...\"],\"source\":\"syslog\"}" },
          { title: "Lihat alerts", code: "GET /v1/alerts?severity=critical" },
          { title: "Dashboard", code: "GET /v1/dashboard" },
        ],
        support_note: "Dokumentasi: axto.io/docs/soc | Support: hallo@axto.io",
      },
      compliance: {
        name: "AXTO Compliance", tagline: "Automated Audit Platform", port: 8093,
        icon: "📋", color: "#0284c7",
        overview: "AXTO Compliance memonitor compliance secara terus-menerus terhadap SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA, dan NIST CSF dengan auto-check nyata (HTTP probe, TLS cert, proses running, keberadaan file policy).",
        prerequisites: ["Docker Engine 20.10+", "1 GB RAM, 5 GB disk", "License key AXTO Compliance", "URL aplikasi Anda untuk HTTP/TLS check"],
        steps: [
          { title: "1. Install", desc: "Jalankan install script.", code: "sudo bash install.sh compliance" },
          { title: "2. Konfigurasi", desc: "Pilih framework dan set endpoint.",
            code: "compliance:\n  license_key: \"CMPL-XXXX-...\"\n  frameworks: [soc2, gdpr, pdpa]\n  endpoints:\n    app_url: \"https://aplikasi-anda.com\"" },
          { title: "3. Siapkan Policy Docs", desc: "Upload dokumen kebijakan.",
            code: "sudo mkdir -p /etc/axto-compliance/policies\n# Upload PDF policy ke direktori ini" },
          { title: "4. Run Assessment", desc: "Jalankan assessment.",
            code: "curl -X POST http://localhost:8093/v1/assess/soc2\ncurl http://localhost:8093/v1/summary" },
          { title: "5. Review & Remediate", desc: "Perbaiki kontrol yang gagal.",
            code: "curl 'http://localhost:8093/v1/controls/soc2?status=fail'\ncurl http://localhost:8093/v1/risk-items" },
        ],
        config_example: "compliance:\n  license_key: \"CMPL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  frameworks: [soc2, gdpr, pdpa, iso27001]\n  endpoints:\n    app_url: \"https://aplikasi-anda.com\"",
        verify: "curl http://localhost:8093/health",
        verify_expected: "{\"status\":\"ok\"}",
        api_examples: [
          { title: "Run assessment", code: "POST /v1/assess/{soc2|iso27001|gdpr|pdpa|hipaa|pci_dss|nist_csf}" },
          { title: "Laporan", code: "GET /v1/report/{framework}" },
        ],
        support_note: "Dokumentasi: axto.io/docs/compliance | Support: hallo@axto.io",
      },
      edge: {
        name: "AXTO Edge", tagline: "AI Gateway & API Management", port: 8094,
        icon: "⚡", color: "#d97706",
        overview: "AXTO Edge adalah AI gateway OpenAI-compatible. Ganti satu baris kode di aplikasi Anda (base_url) dan langsung dapat: smart routing multi-provider, rate limiting per-customer, billing token, firewall prompt injection, caching respons, dan failover otomatis.",
        prerequisites: ["Docker Engine 20.10+", "1 GB RAM, 5 GB disk", "License key AXTO Edge", "Minimal 1 API key provider AI (BYOK)"],
        steps: [
          { title: "1. Install", desc: "Jalankan install script.", code: "sudo bash install.sh edge" },
          { title: "2. Konfigurasi Provider AI", desc: "Isi API key provider (BYOK).",
            code: "ai_pool:\n  routing_mode: \"cost_first\"\n  vendors:\n    - provider: openai\n      api_key: \"sk-key-anda\"\n      model: \"gpt-4o-mini\"" },
          { title: "3. Tambah Customers", desc: "Set rate limit per customer.",
            code: "customers:\n  - api_key: \"cust-key-001\"\n    customer_id: \"startup-abc\"\n    rpm: 60\n    tpm: 100000\n    budget_daily_usd: 25.0" },
          { title: "4. Ganti base_url", desc: "Perubahan satu baris di aplikasi Anda.",
            code: "# Python:\nfrom openai import OpenAI\nclient = OpenAI(\n    base_url=\"http://edge-server:8094/v1\",\n    api_key=\"cust-key-001\"\n)" },
          { title: "5. Monitor", desc: "Pantau usage dan biaya.",
            code: "curl http://localhost:8094/v1/stats\ncurl http://localhost:8094/v1/billing/startup-abc/2025-01" },
        ],
        config_example: "edge:\n  license_key: \"EDGE-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  firewall:\n    block_injections: true\n\nai_pool:\n  routing_mode: \"cost_first\"\n  vendors:\n    - provider: openai\n      api_key: \"sk-key-anda\"\n      model: \"gpt-4o-mini\"",
        verify: "curl http://localhost:8094/health",
        verify_expected: "{\"status\":\"ok\"}",
        api_examples: [
          { title: "Chat completion", code: "POST /v1/chat/completions\n{\"model\":\"gpt-4o-mini\",\"messages\":[...]}" },
          { title: "Stats", code: "GET /v1/stats" },
        ],
        support_note: "Dokumentasi: axto.io/docs/edge | Support: hallo@axto.io",
      },
      sentinel: {
        name: "AXTO Sentinel", tagline: "IoT/OT Security", port: 8095,
        icon: "📡", color: "#059669",
        overview: "AXTO Sentinel melindungi jaringan industri dan IoT: auto-discovery perangkat OT (PLC, HMI, SCADA, kamera IP), polling register Modbus untuk deteksi anomali, audit MQTT broker akses anonim, matching CVE, dan compliance IEC 62443 / NERC CIP.",
        prerequisites: ["Docker Engine 20.10+", "2 GB RAM, 10 GB disk", "License key AXTO Sentinel", "Akses jaringan ke subnet OT/IoT"],
        steps: [
          { title: "1. Install", desc: "Jalankan di server yang terhubung ke jaringan OT.", code: "sudo bash install.sh sentinel" },
          { title: "2. Konfigurasi Subnet OT", desc: "Set subnet yang akan di-scan.",
            code: "sentinel:\n  license_key: \"SNTL-XXXX-...\"\n  scan_subnets:\n    - \"192.168.100.0/24\"\n  authorized_devices:\n    - \"192.168.100.10\"" },
          { title: "3. Konfigurasi Modbus Polling", desc: "Monitor register PLC untuk anomali.",
            code: "sentinel:\n  modbus_poll:\n    \"192.168.100.10\":\n      start_address: 0\n      count: 20\n      unit_id: 1" },
          { title: "4. Aktifkan Alerting", desc: "Set Slack webhook.",
            code: "sentinel:\n  slack_webhook_url: \"https://hooks.slack.com/...\"\n  nvd_api_key: \"key-nvd-anda\"" },
          { title: "5. Monitor", desc: "Pantau dashboard dan alerts.",
            code: "curl http://localhost:8095/v1/dashboard\ncurl 'http://localhost:8095/v1/alerts?severity=critical'" },
        ],
        config_example: "sentinel:\n  license_key: \"SNTL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  scan_subnets: [\"192.168.100.0/24\"]\n  scan_interval_sec: 3600",
        verify: "curl http://localhost:8095/health",
        verify_expected: "{\"status\":\"ok\"}",
        api_examples: [
          { title: "Dashboard", code: "GET /v1/dashboard" },
          { title: "Perangkat OT", code: "GET /v1/devices" },
          { title: "Laporan IEC 62443", code: "GET /v1/compliance/iec62443" },
        ],
        support_note: "Dokumentasi: axto.io/docs/sentinel | Support: hallo@axto.io",
      },
    },
    support: [
      { label: "Portal",       value: "https://axto.io/portal" },
      { label: "Dokumentasi",  value: "https://axto.io/docs" },
      { label: "Email",        value: "hallo@axto.io" },
      { label: "Website",      value: "https://axto.io" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CHINESE (Simplified)
  // ═══════════════════════════════════════════════════════════════
  zh: {
    title:    "AXTO 平台 — 5款产品安装指南",
    subtitle: "Vault、SOC、Compliance、Edge 和 Sentinel 的完整部署指南",
    download_steps: [
      "在 axto.io/portal 购买许可证",
      "登录门户 → 许可证选项卡 → 点击下载",
      "选择格式：Docker Linux、EXE Linux 或 EXE Windows",
      "解压 ZIP → 运行 install.sh（Linux）或 install.bat（Windows）",
    ],
    products: {
      vault: { name:"AXTO Vault", tagline:"隐私智能引擎", port:8091, icon:"🔒", color:"#7c3aed",
        overview:"AXTO Vault 是生产级隐私层，自动检测、脱敏、令牌化和加密所有数据流中的 PII（个人身份信息）。完全自托管，BYOK，数据永不离开您的服务器。",
        prerequisites:["Docker Engine 20.10+，Docker Compose v2+","最低 1GB RAM，5GB 磁盘","AXTO Vault 许可证密钥","（可选）AI 提供商 API 密钥"],
        steps:[
          {title:"1. 安装",desc:"运行安装脚本。",code:"sudo bash install.sh vault"},
          {title:"2. 配置许可证",desc:"编辑 vault.yml，填入许可证密钥。",code:"vault:\n  license_key: \"VAULT-XXXX-...\"\n  masking:\n    default_strategy: \"pseudonymize\"\n  compliance:\n    frameworks: [gdpr, pdpa]"},
          {title:"3. 验证",desc:"检查服务健康状态。",code:"curl http://localhost:8091/health"},
          {title:"4. 首次扫描",desc:"运行 PII 扫描测试。",code:"curl -X POST http://localhost:8091/v1/scan \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"text\":\"Email: user@example.com\"}'\n"},
          {title:"5. 集成应用",desc:"将敏感数据路由到 Vault 进行自动脱敏。",code:"import requests\nr = requests.post('http://vault:8091/v1/mask', json={'text':data})\nmasked = r.json()['masked_text']"},
        ],
        config_example:"vault:\n  license_key: \"VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  masking:\n    default_strategy: \"pseudonymize\"\n  compliance:\n    frameworks: [gdpr, pdpa]",
        verify:"curl http://localhost:8091/health", verify_expected:"{\"status\":\"ok\"}",
        api_examples:[{title:"扫描 PII",code:"POST /v1/scan"},{title:"仅脱敏",code:"POST /v1/mask"}],
        support_note:"文档：axto.io/docs/vault | 支持：hallo@axto.io" },
      soc: { name:"AXTO SOC", tagline:"安全运营中心", port:8092, icon:"🛡️", color:"#dc2626",
        overview:"AXTO SOC 是全栈安全运营平台：SIEM 日志聚合、SOAR 自动响应（iptables IP 封锁、Slack 告警、主机隔离）、UEBA 异常检测、威胁情报。",
        prerequisites:["Docker Engine 20.10+","最低 2GB RAM，20GB 磁盘","AXTO SOC 许可证密钥"],
        steps:[
          {title:"1. 安装",desc:"运行安装脚本。",code:"sudo bash install.sh soc"},
          {title:"2. 配置威胁情报",desc:"添加免费 TI API 密钥。",code:"soc:\n  license_key: \"SOC-XXXX-...\"\n  abuseipdb_api_key: \"您的密钥\"\n  otx_api_key: \"您的密钥\""},
          {title:"3. 发送日志",desc:"将系统日志发送到 SOC。",code:"curl -X POST http://soc:8092/v1/ingest -d '{\"logs\":[\"...\"]}'"},
          {title:"4. 监控",desc:"查看仪表板。",code:"curl http://soc:8092/v1/dashboard"},
        ],
        config_example:"soc:\n  license_key: \"SOC-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  abuseipdb_api_key: \"您的密钥\"",
        verify:"curl http://localhost:8092/health", verify_expected:"{\"status\":\"ok\"}",
        api_examples:[{title:"摄取日志",code:"POST /v1/ingest"},{title:"查看告警",code:"GET /v1/alerts"}],
        support_note:"文档：axto.io/docs/soc | 支持：hallo@axto.io" },
      compliance: { name:"AXTO Compliance", tagline:"自动审计平台", port:8093, icon:"📋", color:"#0284c7",
        overview:"AXTO Compliance 持续监控 SOC 2、ISO 27001、HIPAA、PCI-DSS、GDPR、PDPA 合规状态，通过真实自动检查（HTTP、TLS、进程、文件）。",
        prerequisites:["Docker Engine 20.10+","1GB RAM","AXTO Compliance 许可证"],
        steps:[
          {title:"1. 安装",desc:"运行安装脚本。",code:"sudo bash install.sh compliance"},
          {title:"2. 配置",desc:"选择框架和端点。",code:"compliance:\n  frameworks: [soc2, gdpr]\n  endpoints:\n    app_url: \"https://your-app.com\""},
          {title:"3. 运行评估",desc:"触发合规评估。",code:"curl -X POST http://localhost:8093/v1/assess/soc2"},
        ],
        config_example:"compliance:\n  license_key: \"CMPL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  frameworks: [soc2, gdpr]",
        verify:"curl http://localhost:8093/health", verify_expected:"{\"status\":\"ok\"}",
        api_examples:[{title:"运行评估",code:"POST /v1/assess/{framework}"},{title:"获取报告",code:"GET /v1/report/{framework}"}],
        support_note:"文档：axto.io/docs/compliance | 支持：hallo@axto.io" },
      edge: { name:"AXTO Edge", tagline:"AI 网关与 API 管理", port:8094, icon:"⚡", color:"#d97706",
        overview:"AXTO Edge 是 OpenAI 兼容的 AI 网关。更改一行代码（base_url）即可获得：智能多提供商路由、按客户计费、提示注入防火墙、响应缓存和自动故障转移。",
        prerequisites:["Docker Engine 20.10+","1GB RAM","AXTO Edge 许可证","至少一个 AI 提供商 API 密钥（BYOK）"],
        steps:[
          {title:"1. 安装",desc:"运行安装脚本。",code:"sudo bash install.sh edge"},
          {title:"2. 配置 AI 提供商",desc:"填入 API 密钥（BYOK）。",code:"ai_pool:\n  routing_mode: \"cost_first\"\n  vendors:\n    - provider: openai\n      api_key: \"sk-您的密钥\"\n      model: \"gpt-4o-mini\""},
          {title:"3. 更改 base_url",desc:"在应用中更改一行代码。",code:"from openai import OpenAI\nclient = OpenAI(\n    base_url=\"http://edge:8094/v1\",\n    api_key=\"customer-api-key\"\n)"},
        ],
        config_example:"ai_pool:\n  routing_mode: \"cost_first\"\n  vendors:\n    - provider: openai\n      api_key: \"sk-您的密钥\"",
        verify:"curl http://localhost:8094/health", verify_expected:"{\"status\":\"ok\"}",
        api_examples:[{title:"聊天完成",code:"POST /v1/chat/completions"},{title:"使用统计",code:"GET /v1/stats"}],
        support_note:"文档：axto.io/docs/edge | 支持：hallo@axto.io" },
      sentinel: { name:"AXTO Sentinel", tagline:"IoT/OT 安全", port:8095, icon:"📡", color:"#059669",
        overview:"AXTO Sentinel 保护工业和 IoT 网络：自动发现 OT 设备（PLC、HMI、SCADA、摄像头），轮询 Modbus 寄存器检测异常，审计 MQTT 匿名访问，CVE 匹配，IEC 62443 合规。",
        prerequisites:["Docker Engine 20.10+","2GB RAM，10GB 磁盘","AXTO Sentinel 许可证","OT 子网络访问权限"],
        steps:[
          {title:"1. 安装",desc:"在能访问 OT 网络的服务器上运行。",code:"sudo bash install.sh sentinel"},
          {title:"2. 配置子网",desc:"设置要扫描的 OT 网络。",code:"sentinel:\n  scan_subnets:\n    - \"192.168.100.0/24\""},
          {title:"3. 监控",desc:"查看设备清单和告警。",code:"curl http://localhost:8095/v1/dashboard\ncurl http://localhost:8095/v1/devices"},
        ],
        config_example:"sentinel:\n  license_key: \"SNTL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  scan_subnets: [\"192.168.100.0/24\"]",
        verify:"curl http://localhost:8095/health", verify_expected:"{\"status\":\"ok\"}",
        api_examples:[{title:"仪表板",code:"GET /v1/dashboard"},{title:"设备清单",code:"GET /v1/devices"},{title:"IEC 62443",code:"GET /v1/compliance/iec62443"}],
        support_note:"文档：axto.io/docs/sentinel | 支持：hallo@axto.io" },
    },
    support:[{label:"门户",value:"https://axto.io/portal"},{label:"文档",value:"https://axto.io/docs"},{label:"邮箱",value:"hallo@axto.io"}],
  },

  // ═══════════════════════════════════════════════════════════════
  // ARABIC
  // ═══════════════════════════════════════════════════════════════
  ar: {
    title:    "AXTO Platform — دليل إعداد 5 منتجات",
    subtitle: "دليل النشر الكامل لـ Vault وSOC وCompliance وEdge وSentinel",
    download_steps: [
      "اشتر ترخيصك على axto.io/portal",
      "سجّل الدخول إلى البوابة ← تبويب التراخيص ← انقر على تنزيل",
      "اختر الصيغة: Docker Linux أو EXE Linux أو EXE Windows",
      "استخرج الـ ZIP ← شغّل install.sh (Linux) أو install.bat (Windows)",
    ],
    products: {
      vault: { name:"AXTO Vault", tagline:"محرك الذكاء للخصوصية", port:8091, icon:"🔒", color:"#7c3aed",
        overview:"AXTO Vault طبقة خصوصية للإنتاج تكتشف وتخفي وترمز وتشفر PII تلقائياً في جميع تدفقات بياناتك. مستضاف ذاتياً بالكامل، BYOK، البيانات لا تغادر خوادمك أبداً.",
        prerequisites:["Docker Engine 20.10+","ذاكرة وصول عشوائي 1GB على الأقل","مفتاح ترخيص AXTO Vault"],
        steps:[
          {title:"1. التثبيت",desc:"شغّل سكريبت التثبيت.",code:"sudo bash install.sh vault"},
          {title:"2. تكوين مفتاح الترخيص",desc:"عدّل vault.yml وأضف مفتاح الترخيص.",code:"vault:\n  license_key: \"VAULT-XXXX-...\"\n  masking:\n    default_strategy: \"redact\""},
          {title:"3. التحقق",desc:"تحقق من صحة الخدمة.",code:"curl http://localhost:8091/health"},
          {title:"4. أول فحص",desc:"جرب فحص PII أول مرة.",code:"curl -X POST http://localhost:8091/v1/scan \\\n  -d '{\"text\":\"البريد: user@example.com\"}'"},
        ],
        config_example:"vault:\n  license_key: \"VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  compliance:\n    frameworks: [gdpr, pdpa]",
        verify:"curl http://localhost:8091/health", verify_expected:"{\"status\":\"ok\"}",
        api_examples:[{title:"فحص PII",code:"POST /v1/scan"},{title:"إخفاء فقط",code:"POST /v1/mask"}],
        support_note:"التوثيق: axto.io/docs/vault | الدعم: hallo@axto.io" },
      soc: { name:"AXTO SOC", tagline:"مركز عمليات الأمن", port:8092, icon:"🛡️", color:"#dc2626",
        overview:"AXTO SOC منصة SOC متكاملة: تجميع سجلات SIEM، استجابة آلية SOAR، كشف شذوذ UEBA، استخبارات التهديدات.",
        prerequisites:["Docker Engine 20.10+","ذاكرة وصول عشوائي 2GB","مفتاح ترخيص AXTO SOC"],
        steps:[
          {title:"1. التثبيت",desc:"شغّل سكريبت التثبيت.",code:"sudo bash install.sh soc"},
          {title:"2. إرسال السجلات",desc:"أرسل سجلات النظام إلى SOC.",code:"curl -X POST http://soc:8092/v1/ingest -d '{\"logs\":[\"...\"]}'"},
          {title:"3. المراقبة",desc:"راقب لوحة التحكم.",code:"curl http://soc:8092/v1/dashboard"},
        ],
        config_example:"soc:\n  license_key: \"SOC-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"",
        verify:"curl http://localhost:8092/health", verify_expected:"{\"status\":\"ok\"}",
        api_examples:[{title:"استيعاب السجلات",code:"POST /v1/ingest"},{title:"التنبيهات",code:"GET /v1/alerts"}],
        support_note:"التوثيق: axto.io/docs/soc | الدعم: hallo@axto.io" },
      compliance: { name:"AXTO Compliance", tagline:"منصة التدقيق الآلي", port:8093, icon:"📋", color:"#0284c7",
        overview:"AXTO Compliance يراقب الامتثال باستمرار مقابل SOC 2 وISO 27001 وHIPAA وPCI-DSS وGDPR وPDPA وNIST CSF.",
        prerequisites:["Docker Engine 20.10+","ذاكرة وصول عشوائي 1GB","مفتاح ترخيص"],
        steps:[{title:"1. التثبيت",desc:"",code:"sudo bash install.sh compliance"},{title:"2. تشغيل التقييم",desc:"",code:"curl -X POST http://localhost:8093/v1/assess/soc2"}],
        config_example:"compliance:\n  license_key: \"CMPL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  frameworks: [soc2, gdpr]",
        verify:"curl http://localhost:8093/health", verify_expected:"{\"status\":\"ok\"}",
        api_examples:[{title:"تشغيل تقييم",code:"POST /v1/assess/{framework}"}],
        support_note:"التوثيق: axto.io/docs/compliance" },
      edge: { name:"AXTO Edge", tagline:"بوابة AI وإدارة API", port:8094, icon:"⚡", color:"#d97706",
        overview:"AXTO Edge بوابة AI متوافقة مع OpenAI. غيّر سطراً واحداً في تطبيقك (base_url) واحصل على توجيه ذكي ومتعدد الموفرين وفوترة لكل عميل وجدار حماية حقن الموجّهات.",
        prerequisites:["Docker Engine 20.10+","ذاكرة وصول عشوائي 1GB","مفتاح ترخيص AXTO Edge","مفتاح API لأحد موفري AI"],
        steps:[{title:"1. التثبيت",desc:"",code:"sudo bash install.sh edge"},{title:"2. تكوين الموفرين",desc:"",code:"ai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-مفتاحك\"\n      model: \"gpt-4o-mini\""},{title:"3. تغيير base_url",desc:"",code:"from openai import OpenAI\nclient = OpenAI(base_url='http://edge:8094/v1', api_key='cust-key')"}],
        config_example:"ai_pool:\n  routing_mode: \"cost_first\"\n  vendors:\n    - provider: openai\n      api_key: \"sk-مفتاحك\"",
        verify:"curl http://localhost:8094/health", verify_expected:"{\"status\":\"ok\"}",
        api_examples:[{title:"إكمال المحادثة",code:"POST /v1/chat/completions"}],
        support_note:"التوثيق: axto.io/docs/edge" },
      sentinel: { name:"AXTO Sentinel", tagline:"أمن إنترنت الأشياء/OT", port:8095, icon:"📡", color:"#059669",
        overview:"AXTO Sentinel يحمي شبكات OT وإنترنت الأشياء الصناعية: اكتشاف تلقائي للأجهزة، استطلاع سجلات Modbus، مطابقة CVE، امتثال IEC 62443.",
        prerequisites:["Docker Engine 20.10+","ذاكرة وصول عشوائي 2GB","مفتاح ترخيص Sentinel","وصول إلى شبكة OT"],
        steps:[{title:"1. التثبيت",desc:"",code:"sudo bash install.sh sentinel"},{title:"2. تكوين الشبكة",desc:"",code:"sentinel:\n  scan_subnets: [\"192.168.100.0/24\"]"},{title:"3. المراقبة",desc:"",code:"curl http://localhost:8095/v1/dashboard"}],
        config_example:"sentinel:\n  license_key: \"SNTL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  scan_subnets: [\"192.168.100.0/24\"]",
        verify:"curl http://localhost:8095/health", verify_expected:"{\"status\":\"ok\"}",
        api_examples:[{title:"لوحة التحكم",code:"GET /v1/dashboard"},{title:"الأجهزة",code:"GET /v1/devices"}],
        support_note:"التوثيق: axto.io/docs/sentinel" },
    },
    support:[{label:"البوابة",value:"https://axto.io/portal"},{label:"التوثيق",value:"https://axto.io/docs"},{label:"البريد",value:"hallo@axto.io"}],
  },

  // ═══════════════════════════════════════════════════════════════
  // SPANISH, FRENCH, GERMAN, PORTUGUESE, JAPANESE, KOREAN
  // (Compact format — full steps in EN/ID above as primary)
  // ═══════════════════════════════════════════════════════════════
  es: {
    title:"AXTO Platform — Guía de Instalación 5 Productos",
    subtitle:"Vault · SOC · Compliance · Edge · Sentinel",
    download_steps:["Compra tu licencia en axto.io/portal","Inicia sesión en el portal → Licencias → Descargar","Elige el formato: Docker Linux, EXE Linux o EXE Windows","Extrae el ZIP → ejecuta install.sh (Linux) o install.bat (Windows)"],
    products:{
      vault:{name:"AXTO Vault",tagline:"Motor de Inteligencia de Privacidad",port:8091,icon:"🔒",color:"#7c3aed",overview:"Capa de privacidad de nivel producción: detecta, enmascara, tokeniza y cifra PII automáticamente.",prerequisites:["Docker Engine 20.10+","1GB RAM mínimo","Clave de licencia AXTO Vault"],steps:[{title:"1. Instalar",desc:"",code:"sudo bash install.sh vault"},{title:"2. Configurar",desc:"",code:"vault:\n  license_key: \"VAULT-XXXX-...\""},{title:"3. Verificar",desc:"",code:"curl http://localhost:8091/health"},{title:"4. Primera exploración",desc:"",code:"curl -X POST http://localhost:8091/v1/scan \\\n  -d '{\"text\":\"email@example.com\"}'"}],config_example:"vault:\n  license_key: \"VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  masking:\n    default_strategy: \"pseudonymize\"",verify:"curl http://localhost:8091/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Escanear PII",code:"POST /v1/scan"}],support_note:"Documentación: axto.io/docs/vault"},
      soc:{name:"AXTO SOC",tagline:"Centro de Operaciones de Seguridad",port:8092,icon:"🛡️",color:"#dc2626",overview:"SIEM + SOAR + Inteligencia de amenazas + UEBA. Respuesta automática real.",prerequisites:["Docker 20.10+","2GB RAM","Licencia SOC"],steps:[{title:"1. Instalar",desc:"",code:"sudo bash install.sh soc"},{title:"2. Configurar TI",desc:"",code:"soc:\n  abuseipdb_api_key: \"tu-clave\""},{title:"3. Enviar logs",desc:"",code:"curl -X POST http://soc:8092/v1/ingest -d '{\"logs\":[\"...\"]}'"},{title:"4. Monitorear",desc:"",code:"curl http://soc:8092/v1/dashboard"}],config_example:"soc:\n  license_key: \"SOC-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"",verify:"curl http://localhost:8092/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Ingerir logs",code:"POST /v1/ingest"}],support_note:"Documentación: axto.io/docs/soc"},
      compliance:{name:"AXTO Compliance",tagline:"Plataforma de Auditoría Automatizada",port:8093,icon:"📋",color:"#0284c7",overview:"Monitoreo continuo de cumplimiento: SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA.",prerequisites:["Docker 20.10+","1GB RAM","Licencia Compliance"],steps:[{title:"1. Instalar",desc:"",code:"sudo bash install.sh compliance"},{title:"2. Ejecutar evaluación",desc:"",code:"curl -X POST http://localhost:8093/v1/assess/soc2"}],config_example:"compliance:\n  license_key: \"CMPL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  frameworks: [soc2, gdpr]",verify:"curl http://localhost:8093/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Evaluar",code:"POST /v1/assess/{framework}"}],support_note:"Documentación: axto.io/docs/compliance"},
      edge:{name:"AXTO Edge",tagline:"Gateway de IA y Gestión de API",port:8094,icon:"⚡",color:"#d97706",overview:"Gateway de IA compatible con OpenAI. Cambia una línea de código y obtén enrutamiento inteligente, facturación y firewall de inyección de prompts.",prerequisites:["Docker 20.10+","1GB RAM","Licencia Edge","Clave API de proveedor IA"],steps:[{title:"1. Instalar",desc:"",code:"sudo bash install.sh edge"},{title:"2. Cambiar base_url",desc:"",code:"client = OpenAI(base_url='http://edge:8094/v1', api_key='cust-key')"}],config_example:"ai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-tu-clave\"",verify:"curl http://localhost:8094/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Chat",code:"POST /v1/chat/completions"}],support_note:"Documentación: axto.io/docs/edge"},
      sentinel:{name:"AXTO Sentinel",tagline:"Seguridad IoT/OT",port:8095,icon:"📡",color:"#059669",overview:"Protege redes industriales: descubrimiento automático de dispositivos OT, sondeo de registros Modbus, correlación CVE, cumplimiento IEC 62443.",prerequisites:["Docker 20.10+","2GB RAM","Licencia Sentinel","Acceso a subred OT"],steps:[{title:"1. Instalar",desc:"",code:"sudo bash install.sh sentinel"},{title:"2. Configurar subred",desc:"",code:"sentinel:\n  scan_subnets: [\"192.168.100.0/24\"]"},{title:"3. Monitorear",desc:"",code:"curl http://localhost:8095/v1/dashboard"}],config_example:"sentinel:\n  license_key: \"SNTL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  scan_subnets: [\"192.168.100.0/24\"]",verify:"curl http://localhost:8095/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Dashboard",code:"GET /v1/dashboard"}],support_note:"Documentación: axto.io/docs/sentinel"},
    },
    support:[{label:"Portal",value:"https://axto.io/portal"},{label:"Documentación",value:"https://axto.io/docs"},{label:"Email",value:"hallo@axto.io"}],
  },

  fr: {
    title:"AXTO Platform — Guide d'Installation 5 Produits",
    subtitle:"Vault · SOC · Compliance · Edge · Sentinel",
    download_steps:["Achetez votre licence sur axto.io/portal","Connectez-vous au portail → Licences → Télécharger","Choisissez le format: Docker Linux, EXE Linux ou EXE Windows","Extrayez le ZIP → exécutez install.sh (Linux) ou install.bat (Windows)"],
    products:{
      vault:{name:"AXTO Vault",tagline:"Moteur d'Intelligence pour la Vie Privée",port:8091,icon:"🔒",color:"#7c3aed",overview:"Couche de confidentialité de niveau production: détecte, masque, tokenise et chiffre les PII automatiquement.",prerequisites:["Docker Engine 20.10+","1Go RAM minimum","Clé de licence AXTO Vault"],steps:[{title:"1. Installer",desc:"",code:"sudo bash install.sh vault"},{title:"2. Configurer",desc:"",code:"vault:\n  license_key: \"VAULT-XXXX-...\"\n  masking:\n    default_strategy: \"pseudonymize\""},{title:"3. Vérifier",desc:"",code:"curl http://localhost:8091/health"},{title:"4. Premier scan",desc:"",code:"curl -X POST http://localhost:8091/v1/scan \\\n  -d '{\"text\":\"email@example.com\"}'"}],config_example:"vault:\n  license_key: \"VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  compliance:\n    frameworks: [gdpr]",verify:"curl http://localhost:8091/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Scanner PII",code:"POST /v1/scan"},{title:"Masquer",code:"POST /v1/mask"}],support_note:"Documentation: axto.io/docs/vault | Support: hallo@axto.io"},
      soc:{name:"AXTO SOC",tagline:"Centre des Opérations de Sécurité",port:8092,icon:"🛡️",color:"#dc2626",overview:"SIEM + SOAR + Threat Intelligence + UEBA. Réponse automatique réelle aux incidents.",prerequisites:["Docker 20.10+","2Go RAM","Licence SOC"],steps:[{title:"1. Installer",desc:"",code:"sudo bash install.sh soc"},{title:"2. Envoyer les logs",desc:"",code:"curl -X POST http://soc:8092/v1/ingest -d '{\"logs\":[\"...\"]}'"},{title:"3. Surveiller",desc:"",code:"curl http://soc:8092/v1/dashboard"}],config_example:"soc:\n  license_key: \"SOC-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"",verify:"curl http://localhost:8092/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Ingérer logs",code:"POST /v1/ingest"}],support_note:"Documentation: axto.io/docs/soc"},
      compliance:{name:"AXTO Compliance",tagline:"Plateforme d'Audit Automatisée",port:8093,icon:"📋",color:"#0284c7",overview:"Surveillance continue de la conformité SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA, NIST CSF.",prerequisites:["Docker 20.10+","1Go RAM","Licence Compliance"],steps:[{title:"1. Installer",desc:"",code:"sudo bash install.sh compliance"},{title:"2. Évaluer",desc:"",code:"curl -X POST http://localhost:8093/v1/assess/soc2"}],config_example:"compliance:\n  license_key: \"CMPL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  frameworks: [soc2, gdpr]",verify:"curl http://localhost:8093/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Évaluer",code:"POST /v1/assess/{framework}"}],support_note:"Documentation: axto.io/docs/compliance"},
      edge:{name:"AXTO Edge",tagline:"Passerelle IA & Gestion d'API",port:8094,icon:"⚡",color:"#d97706",overview:"Passerelle IA compatible OpenAI. Changez une ligne de code et obtenez routage intelligent, facturation et pare-feu d'injection de prompts.",prerequisites:["Docker 20.10+","1Go RAM","Licence Edge","Clé API fournisseur IA"],steps:[{title:"1. Installer",desc:"",code:"sudo bash install.sh edge"},{title:"2. Changer base_url",desc:"",code:"client = OpenAI(base_url='http://edge:8094/v1', api_key='cle-client')"}],config_example:"ai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-votre-cle\"",verify:"curl http://localhost:8094/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Complétion de chat",code:"POST /v1/chat/completions"}],support_note:"Documentation: axto.io/docs/edge"},
      sentinel:{name:"AXTO Sentinel",tagline:"Sécurité IoT/OT",port:8095,icon:"📡",color:"#059669",overview:"Protège les réseaux industriels et IoT: découverte automatique des appareils OT, interrogation des registres Modbus, corrélation CVE, conformité IEC 62443.",prerequisites:["Docker 20.10+","2Go RAM","Licence Sentinel","Accès réseau OT"],steps:[{title:"1. Installer",desc:"",code:"sudo bash install.sh sentinel"},{title:"2. Configurer",desc:"",code:"sentinel:\n  scan_subnets: [\"192.168.100.0/24\"]"},{title:"3. Surveiller",desc:"",code:"curl http://localhost:8095/v1/dashboard"}],config_example:"sentinel:\n  license_key: \"SNTL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  scan_subnets: [\"192.168.100.0/24\"]",verify:"curl http://localhost:8095/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Tableau de bord",code:"GET /v1/dashboard"}],support_note:"Documentation: axto.io/docs/sentinel"},
    },
    support:[{label:"Portail",value:"https://axto.io/portal"},{label:"Documentation",value:"https://axto.io/docs"},{label:"Email",value:"hallo@axto.io"}],
  },

  de: {
    title:"AXTO Platform — Installationshandbuch 5 Produkte",
    subtitle:"Vault · SOC · Compliance · Edge · Sentinel",
    download_steps:["Kaufen Sie Ihre Lizenz auf axto.io/portal","Login Portal → Lizenzen → Download klicken","Format wählen: Docker Linux, EXE Linux oder EXE Windows","ZIP entpacken → install.sh (Linux) oder install.bat (Windows) ausführen"],
    products:{
      vault:{name:"AXTO Vault",tagline:"Privacy Intelligence Engine",port:8091,icon:"🔒",color:"#7c3aed",overview:"Produktionsreife Datenschutzschicht: erkennt, maskiert, tokenisiert und verschlüsselt PII automatisch.",prerequisites:["Docker Engine 20.10+","Mind. 1GB RAM","AXTO Vault Lizenzschlüssel"],steps:[{title:"1. Installieren",desc:"",code:"sudo bash install.sh vault"},{title:"2. Konfigurieren",desc:"",code:"vault:\n  license_key: \"VAULT-XXXX-...\""},{title:"3. Verifizieren",desc:"",code:"curl http://localhost:8091/health"},{title:"4. Erster Scan",desc:"",code:"curl -X POST http://localhost:8091/v1/scan \\\n  -d '{\"text\":\"email@example.com\"}'"}],config_example:"vault:\n  license_key: \"VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  compliance:\n    frameworks: [gdpr]",verify:"curl http://localhost:8091/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"PII scannen",code:"POST /v1/scan"}],support_note:"Dokumentation: axto.io/docs/vault"},
      soc:{name:"AXTO SOC",tagline:"Security Operations Center",port:8092,icon:"🛡️",color:"#dc2626",overview:"SIEM + SOAR + Threat Intelligence + UEBA. Echte automatische Incident-Reaktion.",prerequisites:["Docker 20.10+","2GB RAM","SOC-Lizenz"],steps:[{title:"1. Installieren",desc:"",code:"sudo bash install.sh soc"},{title:"2. Logs senden",desc:"",code:"curl -X POST http://soc:8092/v1/ingest -d '{\"logs\":[\"...\"]}'"},{title:"3. Überwachen",desc:"",code:"curl http://soc:8092/v1/dashboard"}],config_example:"soc:\n  license_key: \"SOC-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"",verify:"curl http://localhost:8092/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Logs aufnehmen",code:"POST /v1/ingest"}],support_note:"Dokumentation: axto.io/docs/soc"},
      compliance:{name:"AXTO Compliance",tagline:"Automatisierte Audit-Plattform",port:8093,icon:"📋",color:"#0284c7",overview:"Kontinuierliches Compliance-Monitoring: SOC 2, ISO 27001, HIPAA, PCI-DSS, DSGVO, PDPA, NIST CSF.",prerequisites:["Docker 20.10+","1GB RAM","Compliance-Lizenz"],steps:[{title:"1. Installieren",desc:"",code:"sudo bash install.sh compliance"},{title:"2. Assessment starten",desc:"",code:"curl -X POST http://localhost:8093/v1/assess/soc2"}],config_example:"compliance:\n  license_key: \"CMPL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  frameworks: [soc2, gdpr]",verify:"curl http://localhost:8093/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Assessment",code:"POST /v1/assess/{framework}"}],support_note:"Dokumentation: axto.io/docs/compliance"},
      edge:{name:"AXTO Edge",tagline:"KI-Gateway & API-Management",port:8094,icon:"⚡",color:"#d97706",overview:"OpenAI-kompatibles KI-Gateway. Eine Zeile Code ändern und intelligentes Routing, Abrechnung und Prompt-Injection-Firewall erhalten.",prerequisites:["Docker 20.10+","1GB RAM","Edge-Lizenz","KI-Provider API-Schlüssel"],steps:[{title:"1. Installieren",desc:"",code:"sudo bash install.sh edge"},{title:"2. base_url ändern",desc:"",code:"client = OpenAI(base_url='http://edge:8094/v1', api_key='kunden-key')"}],config_example:"ai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-ihr-schlüssel\"",verify:"curl http://localhost:8094/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Chat-Vervollständigung",code:"POST /v1/chat/completions"}],support_note:"Dokumentation: axto.io/docs/edge"},
      sentinel:{name:"AXTO Sentinel",tagline:"IoT/OT-Sicherheit",port:8095,icon:"📡",color:"#059669",overview:"Schützt Industrie- und IoT-Netzwerke: automatische OT-Geräteerkennung, Modbus-Register-Polling, CVE-Korrelation, IEC 62443-Compliance.",prerequisites:["Docker 20.10+","2GB RAM","Sentinel-Lizenz","Zugang zum OT-Netz"],steps:[{title:"1. Installieren",desc:"",code:"sudo bash install.sh sentinel"},{title:"2. Konfigurieren",desc:"",code:"sentinel:\n  scan_subnets: [\"192.168.100.0/24\"]"},{title:"3. Überwachen",desc:"",code:"curl http://localhost:8095/v1/dashboard"}],config_example:"sentinel:\n  license_key: \"SNTL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  scan_subnets: [\"192.168.100.0/24\"]",verify:"curl http://localhost:8095/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Dashboard",code:"GET /v1/dashboard"}],support_note:"Dokumentation: axto.io/docs/sentinel"},
    },
    support:[{label:"Portal",value:"https://axto.io/portal"},{label:"Dokumentation",value:"https://axto.io/docs"},{label:"E-Mail",value:"hallo@axto.io"}],
  },

  pt: {
    title:"AXTO Platform — Guia de Instalação 5 Produtos",subtitle:"Vault · SOC · Compliance · Edge · Sentinel",
    download_steps:["Compre sua licença em axto.io/portal","Faça login no portal → Licenças → Baixar","Escolha o formato: Docker Linux, EXE Linux ou EXE Windows","Extraia o ZIP → execute install.sh (Linux) ou install.bat (Windows)"],
    products:{
      vault:{name:"AXTO Vault",tagline:"Motor de Inteligência de Privacidade",port:8091,icon:"🔒",color:"#7c3aed",overview:"Camada de privacidade para produção: detecta, mascara, tokeniza e criptografa PII automaticamente.",prerequisites:["Docker Engine 20.10+","Mínimo 1GB RAM","Chave de licença AXTO Vault"],steps:[{title:"1. Instalar",desc:"",code:"sudo bash install.sh vault"},{title:"2. Configurar",desc:"",code:"vault:\n  license_key: \"VAULT-XXXX-...\""},{title:"3. Verificar",desc:"",code:"curl http://localhost:8091/health"},{title:"4. Primeiro scan",desc:"",code:"curl -X POST http://localhost:8091/v1/scan -d '{\"text\":\"email@example.com\"}'"}],config_example:"vault:\n  license_key: \"VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"",verify:"curl http://localhost:8091/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Escanear PII",code:"POST /v1/scan"}],support_note:"Documentação: axto.io/docs/vault"},
      soc:{name:"AXTO SOC",tagline:"Centro de Operações de Segurança",port:8092,icon:"🛡️",color:"#dc2626",overview:"SIEM + SOAR + Inteligência de ameaças + UEBA.",prerequisites:["Docker 20.10+","2GB RAM","Licença SOC"],steps:[{title:"1. Instalar",desc:"",code:"sudo bash install.sh soc"},{title:"2. Enviar logs",desc:"",code:"curl -X POST http://soc:8092/v1/ingest -d '{\"logs\":[\"...\"]}'"},{title:"3. Monitorar",desc:"",code:"curl http://soc:8092/v1/dashboard"}],config_example:"soc:\n  license_key: \"SOC-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"",verify:"curl http://localhost:8092/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Ingerir logs",code:"POST /v1/ingest"}],support_note:"Documentação: axto.io/docs/soc"},
      compliance:{name:"AXTO Compliance",tagline:"Plataforma de Auditoria Automatizada",port:8093,icon:"📋",color:"#0284c7",overview:"Monitoramento contínuo de conformidade: SOC 2, ISO 27001, HIPAA, PCI-DSS, LGPD/GDPR, PDPA.",prerequisites:["Docker 20.10+","1GB RAM","Licença Compliance"],steps:[{title:"1. Instalar",desc:"",code:"sudo bash install.sh compliance"},{title:"2. Avaliar",desc:"",code:"curl -X POST http://localhost:8093/v1/assess/soc2"}],config_example:"compliance:\n  license_key: \"CMPL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  frameworks: [soc2, gdpr]",verify:"curl http://localhost:8093/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Avaliar",code:"POST /v1/assess/{framework}"}],support_note:"Documentação: axto.io/docs/compliance"},
      edge:{name:"AXTO Edge",tagline:"Gateway de IA & Gestão de API",port:8094,icon:"⚡",color:"#d97706",overview:"Gateway de IA compatível com OpenAI. Mude uma linha de código e obtenha roteamento inteligente e cobrança por cliente.",prerequisites:["Docker 20.10+","1GB RAM","Licença Edge","Chave API de provedor IA"],steps:[{title:"1. Instalar",desc:"",code:"sudo bash install.sh edge"},{title:"2. Mudar base_url",desc:"",code:"client = OpenAI(base_url='http://edge:8094/v1', api_key='chave-cliente')"}],config_example:"ai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-sua-chave\"",verify:"curl http://localhost:8094/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Chat",code:"POST /v1/chat/completions"}],support_note:"Documentação: axto.io/docs/edge"},
      sentinel:{name:"AXTO Sentinel",tagline:"Segurança IoT/OT",port:8095,icon:"📡",color:"#059669",overview:"Protege redes industriais e IoT: descoberta automática de dispositivos OT, polling de registros Modbus, correlação CVE, conformidade IEC 62443.",prerequisites:["Docker 20.10+","2GB RAM","Licença Sentinel","Acesso à rede OT"],steps:[{title:"1. Instalar",desc:"",code:"sudo bash install.sh sentinel"},{title:"2. Configurar",desc:"",code:"sentinel:\n  scan_subnets: [\"192.168.100.0/24\"]"},{title:"3. Monitorar",desc:"",code:"curl http://localhost:8095/v1/dashboard"}],config_example:"sentinel:\n  license_key: \"SNTL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  scan_subnets: [\"192.168.100.0/24\"]",verify:"curl http://localhost:8095/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"Dashboard",code:"GET /v1/dashboard"}],support_note:"Documentação: axto.io/docs/sentinel"},
    },
    support:[{label:"Portal",value:"https://axto.io/portal"},{label:"Documentação",value:"https://axto.io/docs"},{label:"Email",value:"hallo@axto.io"}],
  },

  ja: {
    title:"AXTO Platform — 5製品セットアップガイド",subtitle:"Vault · SOC · Compliance · Edge · Sentinel",
    download_steps:["axto.io/portalでライセンスを購入","ポータルにログイン → ライセンスタブ → ダウンロードをクリック","フォーマットを選択: Docker Linux、EXE Linux、またはEXE Windows","ZIPを展開 → install.sh (Linux) またはinstall.bat (Windows) を実行"],
    products:{
      vault:{name:"AXTO Vault",tagline:"プライバシーインテリジェンスエンジン",port:8091,icon:"🔒",color:"#7c3aed",overview:"本番グレードのプライバシーレイヤー: すべてのデータストリームでPIIを自動的に検出、マスク、トークン化、暗号化します。",prerequisites:["Docker Engine 20.10+","最低1GB RAM","AXTO Vaultライセンスキー"],steps:[{title:"1. インストール",desc:"",code:"sudo bash install.sh vault"},{title:"2. 設定",desc:"",code:"vault:\n  license_key: \"VAULT-XXXX-...\""},{title:"3. 確認",desc:"",code:"curl http://localhost:8091/health"},{title:"4. 初回スキャン",desc:"",code:"curl -X POST http://localhost:8091/v1/scan \\\n  -d '{\"text\":\"email@example.com\"}'"}],config_example:"vault:\n  license_key: \"VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  masking:\n    default_strategy: \"pseudonymize\"",verify:"curl http://localhost:8091/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"PIIスキャン",code:"POST /v1/scan"},{title:"マスクのみ",code:"POST /v1/mask"}],support_note:"ドキュメント: axto.io/docs/vault | サポート: hallo@axto.io"},
      soc:{name:"AXTO SOC",tagline:"セキュリティオペレーションセンター",port:8092,icon:"🛡️",color:"#dc2626",overview:"SIEM + SOAR + 脅威インテリジェンス + UEBA。実際の自動インシデント対応。",prerequisites:["Docker 20.10+","2GB RAM","SOCライセンス"],steps:[{title:"1. インストール",desc:"",code:"sudo bash install.sh soc"},{title:"2. ログ送信",desc:"",code:"curl -X POST http://soc:8092/v1/ingest -d '{\"logs\":[\"...\"]}'"},{title:"3. 監視",desc:"",code:"curl http://soc:8092/v1/dashboard"}],config_example:"soc:\n  license_key: \"SOC-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"",verify:"curl http://localhost:8092/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"ログ取り込み",code:"POST /v1/ingest"}],support_note:"ドキュメント: axto.io/docs/soc"},
      compliance:{name:"AXTO Compliance",tagline:"自動化監査プラットフォーム",port:8093,icon:"📋",color:"#0284c7",overview:"SOC 2、ISO 27001、HIPAA、PCI-DSS、GDPR、PDPA、NIST CSFの継続的コンプライアンス監視。",prerequisites:["Docker 20.10+","1GB RAM","Complianceライセンス"],steps:[{title:"1. インストール",desc:"",code:"sudo bash install.sh compliance"},{title:"2. 評価実行",desc:"",code:"curl -X POST http://localhost:8093/v1/assess/soc2"}],config_example:"compliance:\n  license_key: \"CMPL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  frameworks: [soc2, gdpr]",verify:"curl http://localhost:8093/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"評価",code:"POST /v1/assess/{framework}"}],support_note:"ドキュメント: axto.io/docs/compliance"},
      edge:{name:"AXTO Edge",tagline:"AIゲートウェイ & API管理",port:8094,icon:"⚡",color:"#d97706",overview:"OpenAI互換AIゲートウェイ。1行のコード変更でスマートルーティング、請求、プロンプトインジェクション防御を取得。",prerequisites:["Docker 20.10+","1GB RAM","Edgeライセンス","AIプロバイダーAPIキー (BYOK)"],steps:[{title:"1. インストール",desc:"",code:"sudo bash install.sh edge"},{title:"2. base_url変更",desc:"",code:"client = OpenAI(base_url='http://edge:8094/v1', api_key='顧客キー')"}],config_example:"ai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-あなたのキー\"",verify:"curl http://localhost:8094/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"チャット完了",code:"POST /v1/chat/completions"}],support_note:"ドキュメント: axto.io/docs/edge"},
      sentinel:{name:"AXTO Sentinel",tagline:"IoT/OTセキュリティ",port:8095,icon:"📡",color:"#059669",overview:"産業用・IoTネットワークを保護: OTデバイスの自動検出、Modbusレジスタポーリング、CVEマッチング、IEC 62443準拠。",prerequisites:["Docker 20.10+","2GB RAM","Sentinelライセンス","OTネットワークへのアクセス"],steps:[{title:"1. インストール",desc:"",code:"sudo bash install.sh sentinel"},{title:"2. 設定",desc:"",code:"sentinel:\n  scan_subnets: [\"192.168.100.0/24\"]"},{title:"3. 監視",desc:"",code:"curl http://localhost:8095/v1/dashboard"}],config_example:"sentinel:\n  license_key: \"SNTL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  scan_subnets: [\"192.168.100.0/24\"]",verify:"curl http://localhost:8095/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"ダッシュボード",code:"GET /v1/dashboard"}],support_note:"ドキュメント: axto.io/docs/sentinel"},
    },
    support:[{label:"ポータル",value:"https://axto.io/portal"},{label:"ドキュメント",value:"https://axto.io/docs"},{label:"メール",value:"hallo@axto.io"}],
  },

  ko: {
    title:"AXTO Platform — 5제품 설치 가이드",subtitle:"Vault · SOC · Compliance · Edge · Sentinel",
    download_steps:["axto.io/portal에서 라이선스 구매","포털 로그인 → 라이선스 탭 → 다운로드 클릭","형식 선택: Docker Linux, EXE Linux 또는 EXE Windows","ZIP 압축 해제 → install.sh (Linux) 또는 install.bat (Windows) 실행"],
    products:{
      vault:{name:"AXTO Vault",tagline:"프라이버시 인텔리전스 엔진",port:8091,icon:"🔒",color:"#7c3aed",overview:"프로덕션급 프라이버시 레이어: 모든 데이터 스트림에서 PII를 자동으로 감지, 마스킹, 토큰화, 암호화합니다.",prerequisites:["Docker Engine 20.10+","최소 1GB RAM","AXTO Vault 라이선스 키"],steps:[{title:"1. 설치",desc:"",code:"sudo bash install.sh vault"},{title:"2. 설정",desc:"",code:"vault:\n  license_key: \"VAULT-XXXX-...\""},{title:"3. 확인",desc:"",code:"curl http://localhost:8091/health"},{title:"4. 첫 번째 스캔",desc:"",code:"curl -X POST http://localhost:8091/v1/scan \\\n  -d '{\"text\":\"email@example.com\"}'"}],config_example:"vault:\n  license_key: \"VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"",verify:"curl http://localhost:8091/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"PII 스캔",code:"POST /v1/scan"}],support_note:"문서: axto.io/docs/vault | 지원: hallo@axto.io"},
      soc:{name:"AXTO SOC",tagline:"보안 운영 센터",port:8092,icon:"🛡️",color:"#dc2626",overview:"SIEM + SOAR + 위협 인텔리전스 + UEBA. 실제 자동화된 인시던트 대응.",prerequisites:["Docker 20.10+","2GB RAM","SOC 라이선스"],steps:[{title:"1. 설치",desc:"",code:"sudo bash install.sh soc"},{title:"2. 로그 전송",desc:"",code:"curl -X POST http://soc:8092/v1/ingest -d '{\"logs\":[\"...\"]}'"},{title:"3. 모니터링",desc:"",code:"curl http://soc:8092/v1/dashboard"}],config_example:"soc:\n  license_key: \"SOC-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"",verify:"curl http://localhost:8092/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"로그 수집",code:"POST /v1/ingest"}],support_note:"문서: axto.io/docs/soc"},
      compliance:{name:"AXTO Compliance",tagline:"자동화 감사 플랫폼",port:8093,icon:"📋",color:"#0284c7",overview:"SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA, NIST CSF에 대한 지속적인 컴플라이언스 모니터링.",prerequisites:["Docker 20.10+","1GB RAM","Compliance 라이선스"],steps:[{title:"1. 설치",desc:"",code:"sudo bash install.sh compliance"},{title:"2. 평가 실행",desc:"",code:"curl -X POST http://localhost:8093/v1/assess/soc2"}],config_example:"compliance:\n  license_key: \"CMPL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  frameworks: [soc2, gdpr]",verify:"curl http://localhost:8093/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"평가",code:"POST /v1/assess/{framework}"}],support_note:"문서: axto.io/docs/compliance"},
      edge:{name:"AXTO Edge",tagline:"AI 게이트웨이 & API 관리",port:8094,icon:"⚡",color:"#d97706",overview:"OpenAI 호환 AI 게이트웨이. 코드 한 줄 변경으로 스마트 라우팅, 청구, 프롬프트 인젝션 방화벽을 바로 사용.",prerequisites:["Docker 20.10+","1GB RAM","Edge 라이선스","AI 공급자 API 키 (BYOK)"],steps:[{title:"1. 설치",desc:"",code:"sudo bash install.sh edge"},{title:"2. base_url 변경",desc:"",code:"client = OpenAI(base_url='http://edge:8094/v1', api_key='고객키')"}],config_example:"ai_pool:\n  vendors:\n    - provider: openai\n      api_key: \"sk-귀하의키\"",verify:"curl http://localhost:8094/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"채팅 완성",code:"POST /v1/chat/completions"}],support_note:"문서: axto.io/docs/edge"},
      sentinel:{name:"AXTO Sentinel",tagline:"IoT/OT 보안",port:8095,icon:"📡",color:"#059669",overview:"산업 및 IoT 네트워크 보호: OT 장치 자동 검색, Modbus 레지스터 폴링, CVE 매칭, IEC 62443 컴플라이언스.",prerequisites:["Docker 20.10+","2GB RAM","Sentinel 라이선스","OT 네트워크 접근"],steps:[{title:"1. 설치",desc:"",code:"sudo bash install.sh sentinel"},{title:"2. 설정",desc:"",code:"sentinel:\n  scan_subnets: [\"192.168.100.0/24\"]"},{title:"3. 모니터링",desc:"",code:"curl http://localhost:8095/v1/dashboard"}],config_example:"sentinel:\n  license_key: \"SNTL-XXXX-XXXX-XXXX-XXXXXXXXXXXX\"\n  scan_subnets: [\"192.168.100.0/24\"]",verify:"curl http://localhost:8095/health",verify_expected:"{\"status\":\"ok\"}",api_examples:[{title:"대시보드",code:"GET /v1/dashboard"}],support_note:"문서: axto.io/docs/sentinel"},
    },
    support:[{label:"포털",value:"https://axto.io/portal"},{label:"문서",value:"https://axto.io/docs"},{label:"이메일",value:"hallo@axto.io"}],
  },
};

export default GUIDES_5PRODUCTS;
export { GUIDES_5PRODUCTS };
