/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ============================================================
// AXTO Dashboard — Engine Builder: 5 New Products
// Patch: add to existing engine-builder/page.tsx PRODUCTS array
// ============================================================
//
// INSTRUCTIONS: In dashboard/app/admin/engine-builder/page.tsx,
// ADD these entries to the existing PRODUCTS array alongside
// Guardian and Orchestra products.
//
// ============================================================

export const NEW_PRODUCTS = [
  // ── AXTO Vault ──────────────────────────────────────────────
  {
    id: "vault-core",
    icon: "🔒",
    name: "Vault Core",
    group: "vault",
    color: "#7c3aed",
    port: 8091,
    desc: "Privacy intelligence — PII detection, masking & tokenization",
    registries: {
      ghcr: "ghcr.io/your-org/vault-engine:latest",
      gitlab: "registry.gitlab.com/axto-platform/vault-engine/vault-engine:latest",
    },
    compose_template: "vault-compose.yml",
    config_template: "vault.yml",
    r2_key_docker: "builds/latest/raw/vault-engine.tar.gz",
    r2_key_exe: "builds/latest/exe/vault-engine-windows.exe",
    docs_url: "https://axto.io/docs/vault",
    features: ["PII Detection (15 types)", "7 Masking Strategies", "AES-256-GCM Encryption",
               "GDPR/PDPA/HIPAA/PCI Compliance", "Immutable Audit Log", "AI Context Analysis (BYOK)",
               "Differential Privacy", "Right to Erasure API"],
    min_ram_gb: 1,
    min_disk_gb: 5,
    tier2_available: false,
  },

  // ── AXTO SOC ─────────────────────────────────────────────────
  {
    id: "soc-core",
    icon: "🛡️",
    name: "SOC Core",
    group: "soc",
    color: "#dc2626",
    port: 8092,
    desc: "Security Operations Center — SIEM + SOAR + Threat Intelligence",
    registries: {
      ghcr: "ghcr.io/your-org/soc-engine:latest",
      gitlab: "registry.gitlab.com/axto-platform/soc-engine/soc-engine:latest",
    },
    compose_template: "soc-compose.yml",
    config_template: "soc.yml",
    r2_key_docker: "builds/latest/raw/soc-engine.tar.gz",
    r2_key_exe: "builds/latest/exe/soc-engine-windows.exe",
    docs_url: "https://axto.io/docs/soc",
    features: ["15+ Detection Rules", "MITRE ATT&CK Mapping", "AbuseIPDB + OTX TI",
               "Real SOAR (iptables/Slack/email)", "UEBA Anomaly Detection",
               "Incident Management & Tracking", "AI Triage (BYOK)", "False Positive Learning"],
    min_ram_gb: 2,
    min_disk_gb: 20,
    tier2_available: true,
  },

  // ── AXTO Compliance ──────────────────────────────────────────
  {
    id: "compliance-core",
    icon: "📋",
    name: "Compliance Core",
    group: "compliance",
    color: "#0284c7",
    port: 8093,
    desc: "Automated audit — SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA",
    registries: {
      ghcr: "ghcr.io/your-org/compliance-engine:latest",
      gitlab: "registry.gitlab.com/axto-platform/compliance-engine/compliance-engine:latest",
    },
    compose_template: "compliance-compose.yml",
    config_template: "compliance.yml",
    r2_key_docker: "builds/latest/raw/compliance-engine.tar.gz",
    r2_key_exe: "builds/latest/exe/compliance-engine-windows.exe",
    docs_url: "https://axto.io/docs/compliance",
    features: ["7 Frameworks (SOC2/ISO27001/HIPAA/PCI-DSS/GDPR/PDPA/NIST)",
               "80+ Controls", "Real Auto-Checks (HTTP/TLS/port/process)",
               "Gap Analysis + Remediation", "Evidence Collection (hash-verified)",
               "Continuous Monitoring (24h)", "Risk Register", "Audit-Ready Reports"],
    min_ram_gb: 1,
    min_disk_gb: 5,
    tier2_available: false,
  },

  // ── AXTO Edge ────────────────────────────────────────────────
  {
    id: "edge-core",
    icon: "⚡",
    name: "Edge Core",
    group: "edge",
    color: "#d97706",
    port: 8094,
    desc: "AI Gateway — OpenAI-compatible with billing, firewall & smart routing",
    registries: {
      ghcr: "ghcr.io/your-org/edge-engine:latest",
      gitlab: "registry.gitlab.com/axto-platform/edge-engine/edge-engine:latest",
    },
    compose_template: "edge-compose.yml",
    config_template: "edge.yml",
    r2_key_docker: "builds/latest/raw/edge-engine.tar.gz",
    r2_key_exe: "builds/latest/exe/edge-engine-windows.exe",
    docs_url: "https://axto.io/docs/edge",
    features: ["7 AI Providers (OpenAI/Anthropic/Gemini/Groq/DeepSeek/Mistral/Ollama)",
               "Smart Routing (cost/latency/quality/smart-balance)",
               "Prompt Injection Firewall (15 patterns)",
               "Per-Customer Rate Limiting", "Real-time Cost Metering",
               "Circuit Breaker + Auto Failover", "Semantic Cache",
               "OpenAI-Compatible API (drop-in)"],
    min_ram_gb: 1,
    min_disk_gb: 5,
    tier2_available: false,
  },

  // ── AXTO Sentinel ────────────────────────────────────────────
  {
    id: "sentinel-core",
    icon: "📡",
    name: "Sentinel Core",
    group: "sentinel",
    color: "#059669",
    port: 8095,
    desc: "IoT/OT Security — Protect PLCs, HMIs, SCADA, industrial networks",
    registries: {
      ghcr: "ghcr.io/your-org/sentinel-engine:latest",
      gitlab: "registry.gitlab.com/axto-platform/sentinel-engine/sentinel-engine:latest",
    },
    compose_template: "sentinel-compose.yml",
    config_template: "sentinel.yml",
    r2_key_docker: "builds/latest/raw/sentinel-engine.tar.gz",
    r2_key_exe: "builds/latest/exe/sentinel-engine-windows.exe",
    docs_url: "https://axto.io/docs/sentinel",
    features: ["13 Device Type Detection", "Real Modbus TCP Polling (no library)",
               "MQTT Anonymous Access Detection", "NVD CVE Correlation",
               "15 OT Security Rules (IEC 62443/NERC CIP)", "Welford UEBA Baselines",
               "Network Topology Mapping", "AI Threat Analysis (BYOK)"],
    min_ram_gb: 2,
    min_disk_gb: 10,
    tier2_available: false,
  },
];

// ── New Bundle Definitions ────────────────────────────────────────────────────
export const NEW_BUNDLES = [
  {
    id: "privacy-bundle",
    label: "Privacy Suite",
    description: "Vault + Compliance — Full privacy & audit coverage",
    products: ["vault-core", "compliance-core"],
    type: "docker" as const,
    packageCodes: ["privacy_starter", "privacy_pro", "bundle_professional", "bundle_enterprise"],
    price_monthly_usd: 3500,
    price_yearly_usd: 35000,
  },
  {
    id: "security-bundle",
    label: "Security Suite",
    description: "SOC + Sentinel — Full security operations coverage",
    products: ["soc-core", "sentinel-core"],
    type: "docker" as const,
    packageCodes: ["security_starter", "security_pro", "bundle_professional", "bundle_enterprise"],
    price_monthly_usd: 6000,
    price_yearly_usd: 60000,
  },
  {
    id: "platform-5-bundle",
    label: "Full Platform (All 5)",
    description: "Vault + SOC + Compliance + Edge + Sentinel — Complete enterprise suite",
    products: ["vault-core", "soc-core", "compliance-core", "edge-core", "sentinel-core"],
    type: "docker" as const,
    packageCodes: ["bundle_enterprise", "bundle_ultimate"],
    price_monthly_usd: 12000,
    price_yearly_usd: 120000,
  },
];

// ── License Package Definitions (for stripe.ts) ──────────────────────────────
export const NEW_LICENSE_PACKAGES = [
  // Vault
  { code: "vault_starter",  name: "Vault Starter",    product: "vault",      price_usd: 999,   period: "monthly", max_scans_per_day: 10000  },
  { code: "vault_pro",      name: "Vault Pro",         product: "vault",      price_usd: 2499,  period: "monthly", max_scans_per_day: 100000 },
  { code: "vault_enterprise",name:"Vault Enterprise",  product: "vault",      price_usd: 7999,  period: "monthly", max_scans_per_day: -1     },

  // SOC
  { code: "soc_standard",   name: "SOC Standard",      product: "soc",        price_usd: 2999,  period: "monthly", max_eps: 1000    },
  { code: "soc_advanced",   name: "SOC Advanced",      product: "soc",        price_usd: 7999,  period: "monthly", max_eps: 10000   },
  { code: "soc_enterprise", name: "SOC Enterprise",    product: "soc",        price_usd: 19999, period: "monthly", max_eps: -1      },

  // Compliance
  { code: "comp_starter",   name: "Compliance Starter",product: "compliance", price_usd: 1499,  period: "monthly", frameworks: ["soc2"]                        },
  { code: "comp_pro",       name: "Compliance Pro",    product: "compliance", price_usd: 3999,  period: "monthly", frameworks: ["soc2","iso27001","gdpr","pdpa"] },
  { code: "comp_enterprise",name: "Compliance Ent.",   product: "compliance", price_usd: 8999,  period: "monthly", frameworks: ["all"]                         },

  // Edge
  { code: "edge_starter",   name: "Edge Starter",      product: "edge",       price_usd: 499,   period: "monthly", max_requests_per_day: 100000  },
  { code: "edge_pro",       name: "Edge Pro",           product: "edge",       price_usd: 1999,  period: "monthly", max_requests_per_day: 1000000 },
  { code: "edge_enterprise",name: "Edge Enterprise",   product: "edge",       price_usd: 5999,  period: "monthly", max_requests_per_day: -1      },

  // Sentinel
  { code: "sent_starter",   name: "Sentinel Starter",  product: "sentinel",   price_usd: 1999,  period: "monthly", max_devices: 50   },
  { code: "sent_pro",       name: "Sentinel Pro",      product: "sentinel",   price_usd: 5999,  period: "monthly", max_devices: 500  },
  { code: "sent_enterprise",name: "Sentinel Enterprise",product: "sentinel",  price_usd: 14999, period: "monthly", max_devices: -1   },
];
