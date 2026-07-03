/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ── AXTO Package Catalog ───────────────────────────────────────────────────
// Single source of truth for pricing, package codes, and metadata.
// All prices in USD (annual). BYOK model — client uses own infrastructure & API keys.
//
// ⚠️  EVERY file that displays pricing MUST import from here.
//     Do NOT hardcode prices in page.tsx, register/page.tsx, or any other file.
//
// ── AXTO Service Model ─────────────────────────────────────────────────────
// • 100% self-service. No managed-service agreements. No dedicated support engineers.
// • All guidance provided via interactive multi-language Setup Guide (10 languages, PDF download).
// • Community contact via email (hallo@axto.io) — best-effort response.
// • 7-day free trial available for every product (1 server/instance, single IP).
// • License locked to: 1 machine-id + 1 IP + 1 instance. No sharing.

export interface PackageInfo {
  name: string;
  description: string;
  price: number;           // annual USD
  priceMonthly: number;    // monthly USD
  product: "guardian" | "orchestra" | "vault" | "edge" | "soc" | "compliance" | "sentinel" | "antivirus" | "studio" | "legal" | "yp";
  maxNodes?: number;       // -1 = unlimited (guardian, soc, sentinel)
  maxWorkers?: number;     // -1 = unlimited (orchestra)
  maxRequests?: number;    // daily request limit -1 = unlimited (vault, edge)
  maxDevices?: number;     // IoT devices -1 = unlimited (sentinel)
  maxScansPerDay?: number; // vault scan limit (alias for maxRequests)
  maxEPS?: number;         // events per second (soc)
  maxDocuments?: number;   // -1 = unlimited (legal) — documents analyzed per day
  frameworks?: string[];   // compliance frameworks included
  features?: string[];     // feature list for UI
  isTrial?: boolean;       // trial flag
  trialDays?: number;      // trial duration (days)
  trialLimited?: boolean;  // true = deliberately capability-limited trial
  noApi?: boolean;         // trial: API access disabled (API is a paid capability)
  watermark?: boolean;     // trial: exports/reports are watermarked
  isBundle?: boolean;
  guardianPackage?: string;
  orchestraPackage?: string;
  forSale?: boolean;       // false = "Coming Soon", blocks checkout. Defaults to true if undefined.
  // ── Yusron Power (YP) only ──────────────────────────────────────────────
  isLifetimeDisconnect?: boolean; // true = yp_lifetime: once activated, the app
                                   // verifies the license ONE final time then
                                   // never calls home again — fully portable,
                                   // no ongoing dependency on axto.io.
  requiresPriorEnterprise?: boolean; // true = yp_trial_free: caller must already
                                      // hold a completed Enterprise-tier purchase
                                      // on ANY product (enforced server-side).
  trialFeeUsd?: number;      // yp_trial_paid: non-refundable download/trial fee
  trialFeeCreditable?: boolean; // fee is credited toward yp_annual/yp_lifetime
  adminApprovalRequired?: boolean; // true = not self-service; admin must grant
                                    // access before this client can even see
                                    // the download (yp_access_grants table).
}

export const PACKAGE_INFO: Record<string, PackageInfo> = {

  // ── Trial — 7 Days, deliberately CAPABILITY-LIMITED (not just cheaper) ─────
  // Core features only · no API · watermarked exports · tiny caps · 1 machine.
  // Designed so the paid yearly plan is clearly, substantially more capable —
  // a trial proves value without replacing a purchase.
  trial_guardian:   { name: "Guardian Trial",    description: "7-day trial — core only, 1 server, no API, watermarked", price: 0, priceMonthly: 0, product: "guardian",   maxNodes: 1,  isTrial: true, trialDays: 7, trialLimited: true, noApi: true, watermark: true,
                      features: ["AI behavioral analysis (core)", "ClamAV scanning", "Email alerts only"] },
  trial_orchestra:  { name: "Orchestra Trial",   description: "7-day trial — core routing, 2 workers, no API, watermarked", price: 0, priceMonthly: 0, product: "orchestra",  maxWorkers: 2, isTrial: true, trialDays: 7, trialLimited: true, noApi: true, watermark: true,
                      features: ["Smart routing (core, 2 strategies)", "Up to 2 CPU workers", "Basic cost view"] },
  trial_vault:      { name: "Vault Trial",       description: "7-day trial — core entities, 2K req/day, no API, watermarked", price: 0, priceMonthly: 0, product: "vault",      maxRequests: 2_000, maxScansPerDay: 2_000, isTrial: true, trialDays: 7, trialLimited: true, noApi: true, watermark: true, forSale: false,
                      features: ["PII redaction (core entities)", "Transparent proxy", "2K requests/day"] },
  trial_edge:       { name: "Edge Trial",        description: "7-day trial — core routing, 2K req/day, no API, watermarked", price: 0, priceMonthly: 0, product: "edge",       maxRequests: 2_000, isTrial: true, trialDays: 7, trialLimited: true, noApi: true, watermark: true, forSale: false,
                      features: ["Multi-provider routing (core)", "2K requests/day", "Basic analytics"] },
  trial_soc:        { name: "SOC Trial",         description: "7-day trial — 3 sources, 50 EPS, no API, watermarked", price: 0, priceMonthly: 0, product: "soc",        maxNodes: 3, maxEPS: 50, isTrial: true, trialDays: 7, trialLimited: true, noApi: true, watermark: true, forSale: false,
                      features: ["SIEM ingest (3 sources)", "MITRE mapping (core)", "50 EPS"] },
  trial_compliance: { name: "Compliance Trial",  description: "7-day trial — 1 framework, no API, watermarked", price: 0, priceMonthly: 0, product: "compliance", frameworks: ["soc2"], isTrial: true, trialDays: 7, trialLimited: true, noApi: true, watermark: true, forSale: false,
                      features: ["1 framework (SOC 2)", "Control checks (core)", "Watermarked reports"] },
  trial_sentinel:   { name: "Sentinel Trial",    description: "7-day trial — 5 devices, no API, watermarked", price: 0, priceMonthly: 0, product: "sentinel",   maxDevices: 5, maxNodes: 5, isTrial: true, trialDays: 7, trialLimited: true, noApi: true, watermark: true, forSale: false,
                      features: ["Device discovery (5)", "OT rules (core)", "Watermarked reports"] },
  trial_antivirus:  { name: "Antivirus Trial",   description: "7-day trial — 2 endpoints, no API, watermarked", price: 0, priceMonthly: 0, product: "antivirus",  maxNodes: 2, isTrial: true, trialDays: 7, trialLimited: true, noApi: true, watermark: true,
                      features: ["ClamAV scanning (2 endpoints)", "Quarantine", "On-demand scans"] },

  // ── Guardian AI — Self-Hosted Cybersecurity ────────────────────────────────
  lite: {
    name: "Guardian Sentinel",
    description: "1 server — AI-powered threat detection for individual workloads",
    price: 990, priceMonthly: 99,
    product: "guardian", maxNodes: 1,
    features: ["AI behavioral analysis", "Threat intelligence feeds", "Automated quarantine", "ClamAV engine", "Email & Slack alerts", "Compliance reports"],
  },
  pro: {
    name: "Guardian Professional",
    description: "Up to 25 servers — threat hunting, UEBA analytics, and compliance reporting",
    price: 4990, priceMonthly: 499,
    product: "guardian", maxNodes: 25,
    features: ["All Sentinel features", "AI threat hunting & UEBA", "Multi-server management", "SOC 2 & ISO 27001 reports", "SIEM forwarding", "Antivirus REST API"],
  },
  shield: {
    name: "Guardian Business",
    description: "Up to 100 servers — eBPF kernel inspection, mTLS mesh, and deception engine",
    price: 19900, priceMonthly: 1990,
    product: "guardian", maxNodes: 100,
    features: ["All Professional features", "eBPF deep kernel inspection", "mTLS encrypted node mesh", "Rootkit & memory forensics", "Custom incident runbooks", "Deception engine (honeypots)"],
  },
  aegis: {
    name: "Guardian Enterprise",
    description: "Up to 1,000 servers — multi-tenant, white-label, custom threat intelligence",
    price: 79000, priceMonthly: 7900,
    product: "guardian", maxNodes: 1000,
    features: ["All Business features", "1,000 node scale", "White-label dashboard", "Custom threat intel feeds", "Multi-tenant architecture", "Comprehensive interactive setup guide"],
  },

  // ── Orchestra AI — Self-Hosted AI Orchestration ────────────────────────────
  orchestra_core: {
    name: "Orchestra Starter",
    description: "Up to 10 AI workers — smart routing across 15+ providers",
    price: 34900, priceMonthly: 3490,
    product: "orchestra", maxWorkers: 10,
    features: ["CPU & GPU auto-detect", "5 routing strategies", "OpenAI/Claude/Gemini/Groq/Ollama", "Cost optimization & budget caps", "Real-time analytics", "OpenAI-compatible API"],
  },
  orchestra_scale: {
    name: "Orchestra Professional",
    description: "Up to 50 AI workers — autoscale, federation, and cost analytics",
    price: 89900, priceMonthly: 8990,
    product: "orchestra", maxWorkers: 50,
    features: ["All Starter features", "All 6 routing strategies", "Priority queue & dead letter", "Autoscaler (scale-to-zero)", "Federated multi-region", "Custom provider endpoints"],
  },
  orchestra_unlimited: {
    name: "Orchestra Enterprise",
    description: "Unlimited workers — full control, custom routing, white-label",
    price: 249000, priceMonthly: 24900,
    product: "orchestra", maxWorkers: -1,
    features: ["All Professional features", "Unlimited workers (CPU+GPU)", "White-label API gateway", "Custom routing logic", "Credential vault & rotation", "Comprehensive interactive setup guide"],
  },

  // ── Bundle Plans — Guardian + Orchestra ────────────────────────────────────
  bundle_starter: {
    name: "Starter Bundle",
    description: "Guardian Professional + Orchestra Starter",
    price: 33900, priceMonthly: 3390,
    product: "guardian", isBundle: true,
    guardianPackage: "pro", orchestraPackage: "orchestra_core",
  },
  bundle_professional: {
    name: "Professional Bundle",
    description: "Guardian Business + Orchestra Professional",
    price: 93300, priceMonthly: 9330,
    product: "guardian", isBundle: true,
    guardianPackage: "shield", orchestraPackage: "orchestra_scale",
  },
  bundle_enterprise: {
    name: "Enterprise Bundle",
    description: "Guardian Enterprise + Orchestra Enterprise — full platform",
    price: 278800, priceMonthly: 27880,
    product: "guardian", isBundle: true,
    guardianPackage: "aegis", orchestraPackage: "orchestra_unlimited",
  },

  // ── AXTO Vault — AI Data Privacy Platform ─────────────────────────────────
  vault_starter: {
    name: "Vault Starter",
    description: "AI privacy for growing teams — PII/PHI/financial redaction, up to 50K requests/day",
    price: 4990, priceMonthly: 499,
    product: "vault", maxRequests: 50_000, maxScansPerDay: 50_000, forSale: true,
    features: ["15 PII entity types", "7 masking strategies", "GDPR + PDPA", "Session-based re-injection", "Audit log", "OpenAI & Anthropic proxy"],
  },
  vault_professional: {
    name: "Vault Professional",
    description: "Compliance-grade AI privacy — HIPAA, PCI-DSS, SOC 2, up to 500K requests/day",
    price: 14900, priceMonthly: 1490,
    product: "vault", maxRequests: 500_000, maxScansPerDay: 500_000, forSale: true,
    features: ["All Starter features", "HIPAA + PCI-DSS + CCPA + SOC2", "AES-256-GCM encryption", "Differential privacy", "Tokenization vault", "AI context detection"],
  },
  vault_business: {
    name: "Vault Business",
    description: "Multi-department privacy — custom NLP models, SIEM forwarding, up to 5M requests/day",
    price: 39900, priceMonthly: 3990,
    product: "vault", maxRequests: 5_000_000, maxScansPerDay: 5_000_000, forSale: true,
    features: ["All Professional features", "Custom NLP entity models", "SIEM forwarding", "Multi-tenant isolation", "Custom redaction vocabulary", "White-label dashboard"],
  },
  vault_enterprise: {
    name: "Vault Enterprise",
    description: "Unlimited privacy infrastructure — custom AI redaction, multi-region deployment",
    price: 119000, priceMonthly: 11900,
    product: "vault", maxRequests: -1, maxScansPerDay: -1, forSale: true,
    features: ["All Business features", "Unlimited requests", "Custom PII patterns", "Multi-region deployment", "Custom AI redaction model", "Automated DPIA generation"],
  },

  // ── AXTO Edge — AI Gateway & API Management ────────────────────────────────
  edge_starter: {
    name: "Edge Starter",
    description: "AI gateway for startups — 100K requests/day, 5 customer API keys",
    price: 7990, priceMonthly: 799,
    product: "edge", maxRequests: 100_000, forSale: true,
    features: ["7 AI providers", "5 customer API keys", "Cost routing", "Prompt injection firewall", "Basic caching", "Usage dashboard"],
  },
  edge_professional: {
    name: "Edge Professional",
    description: "AI API gateway — unlimited customers, token metering, 1M requests/day",
    price: 24900, priceMonthly: 2490,
    product: "edge", maxRequests: 1_000_000, forSale: true,
    features: ["All Starter features", "Unlimited customers", "Smart balance routing", "Per-customer billing", "Circuit breaker", "Advanced analytics"],
  },
  edge_business: {
    name: "Edge Business",
    description: "AI billing layer — auto invoicing, tiered plans, Stripe sync, 10M requests/day",
    price: 40900, priceMonthly: 4090,
    product: "edge", maxRequests: 10_000_000, forSale: true,
    features: ["All Professional features", "Auto invoice generation", "Tiered customer plans", "Custom markup", "Stripe sync", "SIEM forwarding"],
  },
  edge_enterprise: {
    name: "Edge Enterprise",
    description: "White-label AI infrastructure — unlimited requests, multi-tenant, custom billing",
    price: 69000, priceMonthly: 6900,
    product: "edge", maxRequests: -1, forSale: true,
    features: ["All Business features", "Unlimited requests", "White-label", "Custom routing rules", "Multi-tenant", "Custom billing engine"],
  },

  // ── AXTO SOC — AI Security Operations Center ───────────────────────────────
    soc_starter: {
    name: "SOC Starter",
    description: "SIEM + SOAR essentials — 5 log sources, 200 EPS, automated threat alerts",
    price: 24900, priceMonthly: 2490,
    product: "soc", maxNodes: 5, maxEPS: 200, forSale: true,
    features: ["5 detection rules", "MITRE ATT&CK mapping", "1M+ IOC threat intel", "Slack alerts", "Incident tracking", "Weekly executive report"],
  },
  soc_professional: {
    name: "SOC Professional",
    description: "Full SIEM + SOAR — 25 log sources, 1K EPS, threat intelligence",
    price: 79000, priceMonthly: 7900,
    product: "soc", maxNodes: 25, maxEPS: 1000, forSale: true,
    features: ["15 detection rules", "MITRE ATT&CK mapping", "5M+ IOC threat intel", "Slack SOAR automation", "Incident management", "Executive reports"],
  },
  soc_business: {
    name: "SOC Business",
    description: "Enterprise SOC — 100 log sources, 10K EPS, AI-assisted threat hunting",
    price: 136900, priceMonthly: 13690,
    product: "soc", maxNodes: 100, maxEPS: 10000, forSale: true,
    features: ["All Professional features", "AI-powered triage (BYOK)", "Custom SOAR playbooks", "Private threat intel feeds", "1-year log retention", "MITRE ATT&CK mapping"],
  },
  soc_enterprise: {
    name: "SOC Enterprise",
    description: "Multi-tenant SOC — unlimited log sources, unlimited EPS, white-label",
    price: 249000, priceMonthly: 24900,
    product: "soc", maxNodes: -1, maxEPS: -1, forSale: true,
    features: ["All Business features", "Unlimited EPS", "Multi-tenant white-label", "Custom detection rules", "STIX/TAXII exchange", "Tamper-proof log chain"],
  },

  // ── AXTO Compliance — Automated Audit Platform ─────────────────────────────
  compliance_starter: {
    name: "Compliance Starter",
    description: "SOC 2 & GDPR continuous monitoring — automated evidence collection",
    price: 7990, priceMonthly: 799,
    product: "compliance", forSale: true,
    frameworks: ["soc2", "gdpr"],
    features: ["2 frameworks (SOC2 + GDPR)", "80+ controls auto-checked", "Gap analysis", "Evidence collection", "Continuous monitoring"],
  },
  compliance_professional: {
    name: "Compliance Professional",
    description: "6 frameworks — SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA",
    price: 19900, priceMonthly: 1990,
    product: "compliance", forSale: true,
    frameworks: ["soc2", "iso27001", "hipaa", "pci_dss", "gdpr", "pdpa"],
    features: ["6 frameworks", "All controls", "Vendor risk assessment", "Policy library", "Risk register", "Audit-ready PDF reports"],
  },
  compliance_business: {
    name: "Compliance Business",
    description: "All 7 frameworks including NIST CSF — CI/CD compliance gates, Guardian integration",
    price: 31900, priceMonthly: 3190,
    product: "compliance", forSale: true,
    frameworks: ["soc2", "iso27001", "hipaa", "pci_dss", "gdpr", "pdpa", "nist_csf"],
    features: ["7 frameworks", "CI/CD compliance gates", "Guardian + SOC integration", "Custom controls", "Evidence versioning", "White-label reports"],
  },
  compliance_enterprise: {
    name: "Compliance Enterprise",
    description: "Custom frameworks, multi-tenant, M&A due diligence, white-label",
    price: 49000, priceMonthly: 4900,
    product: "compliance", forSale: true,
    frameworks: ["soc2", "iso27001", "hipaa", "pci_dss", "gdpr", "pdpa", "nist_csf"],
    features: ["All Business features", "Custom framework builder", "Multi-tenant", "M&A due diligence package", "Regulatory change monitoring", "White-label for MSSPs"],
  },

  // ── AXTO Sentinel — IoT/OT Security ────────────────────────────────────────
  sentinel_starter: {
    name: "Sentinel Starter",
    description: "OT/IoT security for small sites — up to 50 devices, IEC 62443 reporting",
    price: 12900, priceMonthly: 1290,
    product: "sentinel", maxDevices: 50, maxNodes: 50, forSale: true,
    features: ["50 device inventory", "15 OT security rules", "Modbus polling", "CVE matching", "Slack alerts", "IEC 62443 report"],
  },
  sentinel_professional: {
    name: "Sentinel Professional",
    description: "OT/ICS security for mid-size facilities — up to 500 devices, AI triage",
    price: 39900, priceMonthly: 3990,
    product: "sentinel", maxDevices: 500, maxNodes: 500, forSale: true,
    features: ["500 devices", "All Starter features", "AI threat triage (BYOK)", "NERC CIP compliance", "NIST 800-82 report", "NVD CVE enrichment"],
  },
  sentinel_business: {
    name: "Sentinel Business",
    description: "Enterprise OT security — up to 5,000 devices, multi-facility, SOAR auto-response",
    price: 68900, priceMonthly: 6890,
    product: "sentinel", maxDevices: 5000, maxNodes: 5000, forSale: true,
    features: ["5000 devices", "All Professional features", "SOAR auto-response", "Multi-site support", "Firmware vulnerability tracking", "Executive dashboards"],
  },
  sentinel_enterprise: {
    name: "Sentinel Enterprise",
    description: "Multi-site OT security — unlimited devices, custom protocol decoders, white-label",
    price: 129000, priceMonthly: 12900,
    product: "sentinel", maxDevices: -1, maxNodes: -1, forSale: true,
    features: ["Unlimited devices", "All Business features", "Custom protocol decoders", "Air-gap deployment", "NERC CIP package", "Real-time PCAP integration"],
  },

  // ── AXTO Antivirus — ClamAV + ML Endpoint Protection ───────────────────────
  antivirus_starter: {
    name: "Antivirus Starter",
    description: "ClamAV + YARA rules — up to 10 endpoints, REST API included",
    price: 2900, priceMonthly: 290,
    product: "antivirus", maxNodes: 10,
    features: ["ClamAV engine", "YARA rules", "REST API", "10 endpoints", "Quarantine management"],
  },
  antivirus_professional: {
    name: "Antivirus Professional",
    description: "ClamAV + ML behavioral detection — up to 100 endpoints, Guardian integration",
    price: 9900, priceMonthly: 990,
    product: "antivirus", maxNodes: 100,
    features: ["All Starter features", "ML behavioral detection", "Guardian AI integration", "100 endpoints", "Real-time scanning"],
  },
  antivirus_enterprise: {
    name: "Antivirus Enterprise",
    description: "Unlimited endpoints — custom YARA rules, SOC integration, white-label",
    price: 29900, priceMonthly: 2990,
    product: "antivirus", maxNodes: -1,
    features: ["All Professional features", "Unlimited endpoints", "Custom YARA rules", "SOC integration", "White-label"],
  },

  // ── Cross-product Suites ───────────────────────────────────────────────────
  // Suite pricing = meaningful discount vs buying individual products.
  // privacy_suite: Vault Pro ($14,900) + Compliance Pro ($19,900) = $34,800 → suite $27,800 (save $7,000)
  privacy_suite: {
    name: "Privacy & Compliance Suite",
    description: "Vault Professional + Compliance Professional — save $7,000 vs individual",
    price: 27800, priceMonthly: 2780,
    product: "vault", isBundle: true, forSale: true,
    features: ["AXTO Vault Professional (500K req/day)", "AXTO Compliance Professional (6 frameworks)", "Combined audit evidence", "Single setup guide"],
  },
  // security_suite: SOC Pro ($79,000) + Sentinel Pro ($39,900) = $118,900 → suite $95,100 (save $23,800)
  security_suite: {
    name: "Security Operations Suite",
    description: "SOC Professional + Sentinel Professional — save $23,800 vs individual",
    price: 95100, priceMonthly: 9510,
    product: "soc", isBundle: true, forSale: true,
    features: ["AXTO SOC Professional (25 sources, 1K EPS)", "AXTO Sentinel Professional (500 devices)", "Correlated IT/OT threat view", "Unified alerting"],
  },
  // platform_5: All 5 Professional tiers = $14,900+$24,900+$79,000+$19,900+$39,900 = $178,600 → suite $130,400 (save $48,200)
  platform_5: {
    name: "Full Platform (All 5 Products)",
    description: "Vault + Edge + SOC + Compliance + Sentinel — all at Professional tier, save $48,200",
    price: 130400, priceMonthly: 13040,
    product: "vault", isBundle: true, forSale: true,
    features: ["Vault Professional (500K req/day)", "Edge Professional (1M req/day)", "SOC Professional (25 sources)", "Compliance Professional (6 frameworks)", "Sentinel Professional (500 devices)"],
  },
  // ── AXTO Studio — AI & GPU Pool Platform (Monthly) ─────────────────────
  studio_starter: {
    name: "Studio Starter",
    description: "AI playground + GPU dashboard — 500 req/day, 1 GPU endpoint, 5 providers",
    price: 490, priceMonthly: 49,
    product: "studio",
    features: ["AI Studio (Chat + Completions)", "GPU Studio (1 endpoint)", "5 AI providers", "500 req/day", "1 GB storage (7-day retention)"],
  },
  studio_professional: {
    name: "Studio Professional",
    description: "Full AI + GPU + Hybrid pipelines — 5,000 req/day, 5 GPUs, REST API",
    price: 1990, priceMonthly: 199,
    product: "studio",
    features: ["All 3 Studios: AI + GPU + Hybrid", "15 providers + custom", "5 GPU endpoints", "5,000 req/day + API", "Pipeline builder", "10 GB storage (14-day)"],
  },
  studio_enterprise: {
    name: "Studio Enterprise",
    description: "Unlimited scale — unlimited requests, GPUs, providers, white-label",
    price: 7990, priceMonthly: 799,
    product: "studio",
    features: ["Unlimited everything", "White-label", "SSO-ready", "100 GB storage", "Webhook CI/CD", "SOC 2 audit logs"],
  },
  trial_studio: {
    name: "Studio Trial",
    description: "7-day trial — core AI Studio, 1 pipeline, no API, watermarked",
    price: 0, priceMonthly: 0,
    product: "studio",
    isTrial: true, trialDays: 7, trialLimited: true, noApi: true, watermark: true,
    features: ["AI Studio (core)", "1 pipeline", "Cloud providers only"],
  },

  // ── AXTO Legal — Enterprise AI Legal & Compliance Platform ──────────────
  // Copyright (c) 2024-2026 Axto AI. All rights reserved. AXTO (axto.io)
  // 18 AI Workspaces · 195+ Jurisdictions · 50+ Frameworks · BYOK+BYOD
  legal_starter: {
    name: "AXTO Legal Starter",
    description: "AI legal research for SME — 3 workspaces, 30 jurisdictions, 100 docs/day",
    price: 14900, priceMonthly: 1490,
    product: "legal", maxDocuments: 100,
    features: [
      "3 AI Workspaces (Legal Research, Contract Intelligence, Compliance)",
      "30 jurisdictions — ASEAN, EU, US focus",
      "20 compliance frameworks (GDPR, ISO 27001, PDPA, OJK)",
      "PDF & DOCX upload/download (max 50MB)",
      "5 BYOK LLM connections (OpenAI, Claude, Gemini, Groq, Ollama)",
      "English + Bahasa Indonesia UI",
      "Real-time regulatory radar (monthly digest)",
      "100 documents/day analysis quota",
    ],
    forSale: true,
  },
  legal_professional: {
    name: "AXTO Legal Professional",
    description: "Full AI legal suite — 10 workspaces, 100 jurisdictions, unlimited docs (MOST POPULAR)",
    price: 49000, priceMonthly: 4900,
    product: "legal", maxDocuments: -1,
    features: [
      "10 AI Workspaces including AML/KYC, Due Diligence, ESG",
      "100 jurisdictions — global coverage",
      "40+ compliance frameworks",
      "PDF & DOCX upload/download (max 100MB)",
      "All BYOK LLM providers + local Ollama support",
      "10 languages (EN, ID, DE, FR, RU, AR, ZH, JA, KO, ES)",
      "Real-time regulatory radar (daily alerts)",
      "Unlimited document analysis",
      "60+ verified data sources",
      "Citation engine & source verification",
    ],
    forSale: true,
  },
  legal_business: {
    name: "AXTO Legal Business",
    description: "Enterprise AI legal — 18 workspaces, 195+ jurisdictions, multi-user, white-label ready",
    price: 99000, priceMonthly: 9900,
    product: "legal", maxDocuments: -1,
    features: [
      "All 18 AI Workspaces",
      "195+ jurisdictions — full global coverage",
      "50+ compliance frameworks",
      "Multi-user (up to 25 users)",
      "BYOD custom connector integration",
      "LexisNexis / Westlaw / Hukumonline connector support",
      "Air-gapped deployment (local LLM only mode)",
      "Custom regulatory monitoring alerts",
      "API-first architecture for LegalTech integration",
      "Audit trail & compliance evidence export",
    ],
    forSale: true,
  },
  legal_enterprise: {
    name: "AXTO Legal Enterprise",
    description: "Sovereign AI legal — unlimited users, custom jurisdictions, white-label, air-gapped",
    price: 249000, priceMonthly: 24900,
    product: "legal", maxDocuments: -1,
    features: [
      "All Business features",
      "Unlimited users & multi-tenant",
      "Custom jurisdiction database import",
      "White-label branding & custom domain",
      "Sovereign AI — 100% air-gapped deployment option",
      "Custom LLM fine-tuning pipeline",
      "Priority support & onboarding — self-hosted, no managed SLA",
      "Custom compliance framework builder",
      "Full BYOD connector marketplace",
      "On-premise government-grade deployment",
    ],
    forSale: true,
  },
  trial_legal: {
    name: "AXTO Legal Trial",
    description: "7-day trial — 3 workspaces, 10 docs/day, core jurisdictions, no API, watermarked",
    price: 0, priceMonthly: 0,
    product: "legal", isTrial: true, trialDays: 7, trialLimited: true, noApi: true, watermark: true,
    maxDocuments: 10,
    features: ["3 AI workspaces", "10 documents/day", "Core jurisdictions", "Watermarked exports"],
  },

  // ── Yusron Power (YP) — invite-only super-enterprise tier ──────────────────
  // Merges every AXTO product's capability into one application, plus AI
  // provider-scaling and a comprehensive legal-research module beyond
  // legal-core's scope. 100% BYOK/BYOI/BYOD/BYOM/BYOX — AXTO operates zero
  // shared infrastructure; the client's own keys, GPUs, and servers run it.
  // Not self-service: adminApprovalRequired gates even seeing the download.
  yp_annual: {
    name: "Yusron Power — Annual",
    description: "Every AXTO capability, merged into one super-application. Invite-only.",
    price: 500000, priceMonthly: 0,
    product: "yp", adminApprovalRequired: true, forSale: false, // not yet built — never show publicly until Phase B ships and is verified
    features: [
      "Every AXTO product's engine merged into one application",
      "AI-provider scaling — auto-routes each job to the best-performing configured provider",
      "Comprehensive global legal research module (prompts, jurisdictions, open legal APIs)",
      "Smart local database on your own infrastructure",
      "Full BYOK/BYOI/BYOD/BYOM/BYOX — your keys, your GPUs, your servers, always",
      "Hardcoded in-app usage guide",
    ],
  },
  yp_lifetime: {
    name: "Yusron Power — Lifetime (Disconnect)",
    description: "One-time payment. After final activation the app never calls axto.io again — move it between servers forever, no ongoing dependency.",
    price: 5000000, priceMonthly: 0,
    product: "yp", isLifetimeDisconnect: true, adminApprovalRequired: true, forSale: false, // not yet built
    features: [
      "Everything in Annual",
      "One final license check, then permanently disconnected from axto.io",
      "Move between servers indefinitely — no reactivation ever required",
      "No GPU/CPU worker dependency — full capability standalone",
    ],
  },
  yp_trial_free: {
    name: "Yusron Power — Trial (Enterprise Clients)",
    description: "7-day trial — core modules only, no API, watermarked. Requires a completed Enterprise-tier purchase on any AXTO product.",
    price: 0, priceMonthly: 0,
    product: "yp", isTrial: true, trialDays: 7, trialLimited: true, noApi: true, watermark: true,
    requiresPriorEnterprise: true, adminApprovalRequired: true, forSale: false, // not yet built
    features: ["Core AI provider-scaling (1 provider)", "Privacy redaction", "Watermarked exports"],
  },
  yp_trial_paid: {
    name: "Yusron Power — Trial (New Clients)",
    description: "30-day trial — core modules only, no API, watermarked. $100,000 non-refundable download fee, credited in full toward Annual or Lifetime if you continue.",
    price: 0, priceMonthly: 0,
    product: "yp", isTrial: true, trialDays: 30, trialLimited: true, noApi: true, watermark: true,
    trialFeeUsd: 100000, trialFeeCreditable: true, adminApprovalRequired: true, forSale: false, // not yet built
    features: ["Core AI provider-scaling (1 provider)", "Privacy redaction", "Watermarked exports"],
  },
};

// ── Trial constants ──────────────────────────────────────────────────────────
export const TRIAL_DURATION_DAYS = 7;
export const TRIAL_PACKAGES = Object.keys(PACKAGE_INFO).filter(k => k.startsWith("trial_"));

// ── Package → engine download mapping ────────────────────────────────────────
export const PACKAGE_PRODUCTS: Record<string, string[]> = {
  trial_guardian: ["guardian-engine"], trial_orchestra: ["orchestra-engine"],
  trial_vault: ["vault-engine"], trial_edge: ["edge-engine"],
  trial_soc: ["soc-engine"], trial_compliance: ["compliance-engine"],
  trial_sentinel: ["sentinel-engine"], trial_antivirus: ["antivirus-engine"],
  lite: ["guardian-engine"], pro: ["guardian-engine"],
  shield: ["guardian-engine"], aegis: ["guardian-engine"],
  orchestra_core: ["orchestra-engine"], orchestra_scale: ["orchestra-engine"],
  orchestra_unlimited: ["orchestra-engine"],
  vault_starter: ["vault-engine"], vault_professional: ["vault-engine"],
  vault_business: ["vault-engine"], vault_enterprise: ["vault-engine"],
  edge_starter: ["edge-engine"], edge_professional: ["edge-engine"],
  edge_business: ["edge-engine"], edge_enterprise: ["edge-engine"],
  soc_starter: ["soc-engine"], soc_professional: ["soc-engine"], soc_business: ["soc-engine"],
  soc_enterprise: ["soc-engine"],
  compliance_starter: ["compliance-engine"], compliance_professional: ["compliance-engine"],
  compliance_business: ["compliance-engine"], compliance_enterprise: ["compliance-engine"],
  sentinel_starter: ["sentinel-engine"], sentinel_professional: ["sentinel-engine"],
  sentinel_business: ["sentinel-engine"], sentinel_enterprise: ["sentinel-engine"],
  antivirus_starter: ["antivirus-engine"], antivirus_professional: ["antivirus-engine"],
  antivirus_enterprise: ["antivirus-engine"],
  studio_starter: ["studio-core"], studio_professional: ["studio-core"],
  studio_enterprise: ["studio-core"], trial_studio: ["studio-core"],
  bundle_starter: ["guardian-engine", "orchestra-engine"],
  bundle_professional: ["guardian-engine", "orchestra-engine"],
  bundle_enterprise: ["guardian-engine", "orchestra-engine"],
  privacy_suite: ["vault-engine", "compliance-engine"],
  security_suite: ["soc-engine", "sentinel-engine"],
  platform_5: ["vault-engine", "soc-engine", "compliance-engine", "edge-engine", "sentinel-engine"],
};

export function getPackagePrice(code: string): number {
  return PACKAGE_INFO[code]?.price ?? 0;
}

export function getMaxNodes(code: string): number {
  return PACKAGE_INFO[code]?.maxNodes ?? 1;
}

export function getMaxWorkers(code: string): number {
  return PACKAGE_INFO[code]?.maxWorkers ?? 0;
}

export function getMaxDevices(code: string): number {
  return PACKAGE_INFO[code]?.maxDevices ?? 0;
}

export function getMaxRequests(code: string): number {
  const info = PACKAGE_INFO[code];
  return info?.maxRequests ?? info?.maxScansPerDay ?? 0;
}

export function getMaxEPS(code: string): number {
  return PACKAGE_INFO[code]?.maxEPS ?? 0;
}

export function getProductFromCode(code: string): string {
  return PACKAGE_INFO[code]?.product ?? "guardian";
}

export function isTrial(code: string): boolean {
  return !!PACKAGE_INFO[code]?.isTrial;
}

/** Check if a package is available for purchase (forSale). Defaults to true if not set. */
export function isForSale(code: string): boolean {
  const info = PACKAGE_INFO[code];
  if (!info) return false;
  return info.forSale !== false;
}

/** Check if a product (e.g. 'vault') has any for-sale packages */
export function isProductForSale(product: string): boolean {
  return Object.values(PACKAGE_INFO).some(v => v.product === product && !v.isBundle && !v.isTrial && v.forSale !== false);
}

/** Product icon mapping — used in admin dashboard & portal */
export const PRODUCT_ICONS: Record<string, string> = {
  guardian:   "🛡️",
  orchestra:  "🎼",
  vault:      "🔒",
  edge:       "🌐",
  soc:        "🎯",
  compliance: "📋",
  sentinel:   "🏭",
  antivirus:  "🦠",
  studio:     "🧠",
  legal:      "⚖️",
  bundle:     "🎁",
};

/** Product display name (short) */
export const PRODUCT_NAMES: Record<string, string> = {
  guardian:   "Guardian AI",
  orchestra:  "Orchestra AI",
  vault:      "Vault AI",
  edge:       "Edge AI",
  soc:        "SOC AI",
  compliance: "Compliance AI",
  sentinel:   "Sentinel OT",
  antivirus:  "Antivirus",
  studio:     "AXTO Studio",
  legal:      "AXTO Legal",
  bundle:     "Bundles & Suites",
};

/** Returns all non-bundle, non-trial packages for a given product */
export function getPackagesByProduct(product: string): Record<string, PackageInfo> {
  return Object.fromEntries(
    Object.entries(PACKAGE_INFO).filter(([, v]) => v.product === product && !v.isBundle && !v.isTrial)
  );
}
