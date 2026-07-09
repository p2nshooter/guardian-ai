/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * PUBLIC PRODUCT CATALOG — powers /products/<slug> pages and the landing showcase.
 *
 * Everything here is CLIENT-FACING marketing content only. It deliberately
 * contains NO company secrets: no internal source layout, no infrastructure
 * details, no ports/hostnames, no proprietary algorithms — only the value a
 * customer gets. Pricing and per-tier feature lists are NOT duplicated here;
 * they come from PACKAGE_INFO (lib/stripe.ts) via getPackagesByProduct(), the
 * single source of truth, so they can never drift.
 * ============================================================================ */

export type AnimMotif =
  | "shield" | "route" | "lock" | "gateway" | "radar"
  | "checklist" | "factory" | "scan" | "spark" | "scales";

export interface Benefit { icon: string; title: string; desc: string }
export interface Integration { slug: string; emoji: string; name: string; desc: string }

export interface ProductCatalogEntry {
  slug: string;            // URL: /products/<slug>
  product: string;         // PACKAGE_INFO product key (for tiers/pricing)
  name: string;
  emoji: string;
  badge: string;
  color: string;           // accent
  gradient: string;        // hero backdrop
  anim: AnimMotif;
  tagline: string;         // one line under the name
  hero: string;            // 1–2 sentence positioning
  // Which sovereignty principles are most relevant, with a product-specific note.
  byox: { key: string; label: string; note: string }[];
  benefits: Benefit[];     // why it's worth it
  capabilities: string[];  // headline capabilities (menus/features, no secrets)
  integrations: Integration[];
}

// Shared sovereignty principles (BYOK/BYOM/BYOD/BYOI/BYOX). Each product overrides
// the `note` to say what it means for that specific product.
const BYOX_BASE = [
  { key: "BYOK", label: "Bring Your Own Key" },
  { key: "BYOM", label: "Bring Your Own Model" },
  { key: "BYOD", label: "Bring Your Own Data" },
  { key: "BYOI", label: "Bring Your Own Infrastructure" },
  { key: "BYOX", label: "Bring Your Own eXecution" },
] as const;

function byox(notes: Record<"BYOK" | "BYOM" | "BYOD" | "BYOI" | "BYOX", string>) {
  return BYOX_BASE.map((b) => ({ key: b.key, label: b.label, note: notes[b.key as keyof typeof notes] }));
}

export const PRODUCT_CATALOG: ProductCatalogEntry[] = [
  {
    slug: "guardian", product: "guardian", name: "Guardian AI", emoji: "🛡️", badge: "SECURITY",
    color: "#0284c7", gradient: "linear-gradient(135deg,#0a1628,#0c2b45)", anim: "shield",
    tagline: "Self-hosted AI cybersecurity for your servers",
    hero: "Seven layers of AI threat detection that run entirely on your own machines. Guardian watches every process, file and connection, and responds to attacks in under 30 seconds — with nothing ever leaving your network.",
    byox: byox({
      BYOK: "Plug in your own AI provider key for deep analysis — Guardian never sees or stores it.",
      BYOM: "Prefer a local model? Point Guardian at your own Ollama or vLLM endpoint.",
      BYOD: "Every event, log and forensic report stays in your own database.",
      BYOI: "Runs as a Docker container on your servers — cloud, on-prem or air-gapped.",
      BYOX: "You own the whole detection stack end to end. No telemetry, no call-home.",
    }),
    benefits: [
      { icon: "⚡", title: "Response in under 30 seconds", desc: "Kill the process, block the IP, quarantine the file and produce a forensic report — automatically, before an analyst even reads the alert." },
      { icon: "🧠", title: "AI that explains itself", desc: "Ask “what happened at 3am?” in plain language and get a clear answer, powered by your own keys." },
      { icon: "🔒", title: "Nothing leaves your network", desc: "No telemetry and no cloud dependency — ideal for regulated and air-gapped environments." },
      { icon: "📄", title: "Audit-ready in one click", desc: "Generate SOC 2, ISO 27001, HIPAA, PCI-DSS and GDPR reports with evidence collected for you." },
    ],
    capabilities: [
      "7-layer threat scanner (hash, entropy, YARA, AI deep-scan and behaviour)",
      "Real-time file-integrity monitoring with instant alerts",
      "Process tree analysis — detects privilege escalation, miners and reverse shells",
      "Live network monitor with C2 domain blocking and geo-mapping",
      "NIST-based incident response workflow with one-click containment",
      "Natural-language AI analyst chat (BYOK)",
      "One-click compliance reporting",
      "Single dashboard for 1 to 1,000 servers",
    ],
    integrations: [
      { slug: "orchestra", emoji: "🎼", name: "Orchestra AI", desc: "Offload heavy AI analysis to your GPU workers." },
      { slug: "soc", emoji: "🎯", name: "AXTO SOC", desc: "Stream Guardian events straight into your SIEM." },
      { slug: "compliance", emoji: "📋", name: "AXTO Compliance", desc: "Map incidents to controls automatically." },
    ],
  },
  {
    slug: "orchestra", product: "orchestra", name: "Orchestra AI", emoji: "🎼", badge: "ORCHESTRATION",
    color: "#7c3aed", gradient: "linear-gradient(135deg,#1a0a2e,#2d1254)", anim: "route",
    tagline: "One endpoint for 15+ AI providers",
    hero: "A single OpenAI-compatible endpoint that routes every request to the cheapest, fastest or highest-quality model automatically — across 15+ providers and your own GPUs, with zero per-token markup.",
    byox: byox({
      BYOK: "Bring your own provider keys — OpenAI, Claude, Gemini, Groq and more. You pay them directly.",
      BYOM: "Add your own GPU workers running Ollama or vLLM for fully local inference.",
      BYOD: "Prompts, responses and cost analytics stay entirely on your infrastructure.",
      BYOI: "Deploy the router and workers as Docker containers wherever you like.",
      BYOX: "Own your entire AI supply chain — no lock-in, no markup, no middleman.",
    }),
    benefits: [
      { icon: "🛣️", title: "Smart routing, six strategies", desc: "cost-first, quality-first, balanced, round-robin, local-first or failover — switch in real time." },
      { icon: "💰", title: "Zero token markup", desc: "You pay providers directly. Full per-provider, per-model, per-day cost analytics with budget caps." },
      { icon: "🎮", title: "Mix cloud and local GPUs", desc: "Blend hosted APIs with your own GPU pool and auto-balance the load." },
      { icon: "🔌", title: "Drop-in compatible", desc: "Point your app at one /v1/chat/completions endpoint — change a single line of code." },
    ],
    capabilities: [
      "OpenAI-compatible API gateway",
      "15+ providers plus any OpenAI-compatible endpoint",
      "GPU + CPU worker pools with autoscaling",
      "Priority job queue with retries and dead-letter handling",
      "Per-provider cost analytics and daily budget caps",
      "Six routing strategies, switchable live",
      "Grafana-compatible metrics",
    ],
    integrations: [
      { slug: "guardian", emoji: "🛡️", name: "Guardian AI", desc: "Run heavy threat-analysis models on Orchestra workers." },
      { slug: "studio", emoji: "🧠", name: "AXTO Studio", desc: "Use Orchestra as the model backend for Studio." },
      { slug: "vault", emoji: "🔒", name: "AXTO Vault", desc: "Redact sensitive data before it is routed to any model." },
    ],
  },
  {
    slug: "vault", product: "vault", name: "AXTO Vault", emoji: "🔒", badge: "PRIVACY",
    color: "#6366f1", gradient: "linear-gradient(135deg,#0f1030,#241a52)", anim: "lock",
    tagline: "Redact PII before it reaches any model",
    hero: "A transparent privacy proxy that strips PII, PHI and financial data out of every AI request in milliseconds — then re-injects the real values into the response, so your users see full data and the model never does.",
    byox: byox({
      BYOK: "Use your own AI provider keys; Vault sits transparently in front of them.",
      BYOM: "Works the same with local models — nothing about your setup changes.",
      BYOD: "Original values are re-injected locally and never stored in plaintext.",
      BYOI: "A single Docker container between your app and any AI provider.",
      BYOX: "Compliance-grade privacy that you host and control entirely.",
    }),
    benefits: [
      { icon: "🕵️", title: "The model never sees real data", desc: "SSNs, cards, emails, health data and more are masked before they ever leave your network." },
      { icon: "↩️", title: "Invisible to your app", desc: "Your application receives the original values, re-injected on the way back — no code changes." },
      { icon: "⚖️", title: "Compliance built in", desc: "HIPAA, GDPR, PCI-DSS, SOC 2 and PDPA coverage with a full audit trail." },
      { icon: "🎛️", title: "Per-project policies", desc: "Tune exactly what gets redacted for each application or team." },
    ],
    capabilities: [
      "15+ PII entity types with 7 masking strategies",
      "Session-based re-injection of original values",
      "Per-project redaction policies",
      "AES-256-GCM encryption and tokenization vault",
      "Audit log of every redaction (originals never stored)",
      "OpenAI- and Anthropic-compatible proxy",
      "SIEM forwarding of privacy events",
    ],
    integrations: [
      { slug: "orchestra", emoji: "🎼", name: "Orchestra AI", desc: "Redact, then route safely to any provider." },
      { slug: "compliance", emoji: "📋", name: "AXTO Compliance", desc: "Feed privacy evidence into audits automatically." },
    ],
  },
  {
    slug: "edge", product: "edge", name: "AXTO Edge", emoji: "🌐", badge: "GATEWAY",
    color: "#0891b2", gradient: "linear-gradient(135deg,#07202b,#0c3a4a)", anim: "gateway",
    tagline: "AI gateway & API management for your customers",
    hero: "Turn your AI capabilities into a product. Edge gives every customer their own API key, routes by cost, meters usage and bills automatically — with a prompt-injection firewall in front of it all.",
    byox: byox({
      BYOK: "Your upstream provider keys stay yours; customers only ever see keys you issue.",
      BYOM: "Route customer traffic to hosted models or your own GPU endpoints.",
      BYOD: "Usage, billing and customer data live in your database.",
      BYOI: "Self-hosted gateway — you own the traffic and the margins.",
      BYOX: "Run a full AI business on infrastructure you control.",
    }),
    benefits: [
      { icon: "🔑", title: "Per-customer API keys", desc: "Issue, rotate and revoke keys with per-customer limits and plans." },
      { icon: "📊", title: "Meter and bill automatically", desc: "Token metering, tiered plans, custom markup and invoice generation." },
      { icon: "🛡️", title: "Prompt-injection firewall", desc: "Block abuse and injection attempts before they reach a model." },
      { icon: "⚡", title: "Cost-aware routing", desc: "Send each request to the most economical capable model." },
    ],
    capabilities: [
      "Customer API-key management",
      "Token metering and per-customer billing",
      "Tiered customer plans with custom markup",
      "Prompt-injection firewall and abuse detection",
      "Response caching and circuit breaking",
      "Stripe sync and automatic invoicing",
      "Advanced usage analytics",
    ],
    integrations: [
      { slug: "orchestra", emoji: "🎼", name: "Orchestra AI", desc: "Use Orchestra routing under your gateway." },
      { slug: "vault", emoji: "🔒", name: "AXTO Vault", desc: "Redact customer data at the edge." },
    ],
  },
  {
    slug: "soc", product: "soc", name: "AXTO SOC", emoji: "🎯", badge: "OPERATIONS",
    color: "#dc2626", gradient: "linear-gradient(135deg,#2a0a0a,#451414)", anim: "radar",
    tagline: "AI-assisted SIEM + SOAR",
    hero: "A self-hosted security operations center: collect logs, correlate against millions of threat indicators, map to MITRE ATT&CK and respond automatically — with AI triage that uses your own keys.",
    byox: byox({
      BYOK: "AI-assisted triage runs on your own provider key.",
      BYOM: "Swap in a local model for classification if you prefer.",
      BYOD: "All logs, incidents and evidence stay in your environment.",
      BYOI: "Deploy the core and workers as containers on your own hardware.",
      BYOX: "A complete SOC you operate and own — no data shipped to a vendor.",
    }),
    benefits: [
      { icon: "🔗", title: "Correlate everything", desc: "Turn raw logs from many sources into ranked, actionable incidents." },
      { icon: "🤖", title: "AI triage (BYOK)", desc: "Summarize and prioritize incidents automatically using your own keys." },
      { icon: "🎯", title: "MITRE ATT&CK mapping", desc: "See exactly which tactics and techniques you are seeing in the wild." },
      { icon: "⚙️", title: "Automated response (SOAR)", desc: "Block, isolate and alert with custom playbooks — no manual toil." },
    ],
    capabilities: [
      "SIEM log collection across many sources",
      "Millions of IOCs of threat intelligence",
      "MITRE ATT&CK detection mapping",
      "SOAR automation and custom playbooks",
      "Incident management and tracking",
      "Executive reporting",
      "STIX/TAXII threat-intel exchange (higher tiers)",
    ],
    integrations: [
      { slug: "guardian", emoji: "🛡️", name: "Guardian AI", desc: "Guardian nodes feed events straight into the SIEM." },
      { slug: "sentinel", emoji: "🏭", name: "AXTO Sentinel", desc: "Bring OT/IoT telemetry into unified operations." },
    ],
  },
  {
    slug: "compliance", product: "compliance", name: "AXTO Compliance", emoji: "📋", badge: "COMPLIANCE",
    color: "#16a34a", gradient: "linear-gradient(135deg,#07220f,#0d3a1c)", anim: "checklist",
    tagline: "Continuous, automated audit monitoring",
    hero: "Stop scrambling before audits. Compliance continuously checks your controls across up to seven frameworks, collects the evidence for you and turns it into audit-ready reports.",
    byox: byox({
      BYOK: "Optional AI assistance uses your own key.",
      BYOM: "Local models supported for private evidence analysis.",
      BYOD: "Evidence and control state remain entirely in your environment.",
      BYOI: "Self-hosted — sensitive compliance data never leaves your servers.",
      BYOX: "You own the evidence chain end to end.",
    }),
    benefits: [
      { icon: "🔄", title: "Always audit-ready", desc: "Continuous monitoring instead of a once-a-year fire drill." },
      { icon: "🧾", title: "Evidence collected for you", desc: "Automated evidence gathering across your stack." },
      { icon: "📚", title: "Seven frameworks", desc: "SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA and NIST CSF." },
      { icon: "🚦", title: "Gaps, ranked", desc: "See exactly which controls need attention and why." },
    ],
    capabilities: [
      "Continuous control monitoring",
      "Automated evidence collection",
      "Gap analysis with prioritization",
      "Vendor risk assessment",
      "Policy library and risk register",
      "Audit-ready PDF reports",
      "CI/CD compliance gates (higher tiers)",
    ],
    integrations: [
      { slug: "guardian", emoji: "🛡️", name: "Guardian AI", desc: "Pull security evidence directly from Guardian." },
      { slug: "soc", emoji: "🎯", name: "AXTO SOC", desc: "Map incidents to compliance controls." },
    ],
  },
  {
    slug: "sentinel", product: "sentinel", name: "AXTO Sentinel", emoji: "🏭", badge: "INDUSTRIAL",
    color: "#ca8a04", gradient: "linear-gradient(135deg,#241a05,#3d2e08)", anim: "factory",
    tagline: "Security for industrial IoT & OT",
    hero: "Passive, safe security for operational technology. Sentinel discovers every device on your industrial network, watches protocol behaviour for anomalies and maps everything to the Purdue model — without ever disrupting a process.",
    byox: byox({
      BYOK: "Optional AI enrichment uses your own key.",
      BYOM: "Local models supported for fully offline sites.",
      BYOD: "Asset inventory and alerts stay on-site.",
      BYOI: "Runs on your plant network — designed for air-gapped operation.",
      BYOX: "Own your OT security posture with zero external dependencies.",
    }),
    benefits: [
      { icon: "🔍", title: "Passive asset discovery", desc: "See every device — type, vendor, firmware — without active scanning." },
      { icon: "🧬", title: "Protocol anomaly detection", desc: "Spot abnormal OT/ICS behaviour before it becomes an incident." },
      { icon: "🏗️", title: "Purdue-model mapping", desc: "Visualize your network by zone and catch level-boundary violations." },
      { icon: "📐", title: "IEC 62443 reporting", desc: "Standards-aligned reporting for industrial environments." },
    ],
    capabilities: [
      "Passive OT/IoT asset discovery",
      "Protocol-anomaly detection",
      "CVE exposure per device",
      "Purdue-model topology and violation alerts",
      "IEC 62443 reporting",
      "Safe, non-disruptive monitoring",
    ],
    integrations: [
      { slug: "soc", emoji: "🎯", name: "AXTO SOC", desc: "Forward OT alerts for unified IT/OT visibility." },
    ],
  },
  {
    slug: "antivirus", product: "antivirus", name: "AXTO Antivirus", emoji: "🦠", badge: "ENDPOINT",
    color: "#ea580c", gradient: "linear-gradient(135deg,#2a1205,#45200a)", anim: "scan",
    tagline: "ClamAV + machine-learning endpoint protection",
    hero: "Proven ClamAV signatures combined with machine-learning detection and automatic quarantine — a lightweight, self-hosted endpoint shield that keeps getting smarter.",
    byox: byox({
      BYOK: "Optional AI analysis uses your own key.",
      BYOM: "Local models supported for offline scanning.",
      BYOD: "Scan results and quarantine data stay with you.",
      BYOI: "Deploy as a container across your endpoints and servers.",
      BYOX: "Own your endpoint protection with no cloud dependency.",
    }),
    benefits: [
      { icon: "🧪", title: "Signatures + machine learning", desc: "Combine ClamAV coverage with behavioural ML detection." },
      { icon: "🚧", title: "Automatic quarantine", desc: "Isolate threats the moment they are found." },
      { icon: "🪶", title: "Lightweight", desc: "Real-time protection without slowing your systems down." },
      { icon: "🔌", title: "REST API", desc: "Wire scanning into your own pipelines and workflows." },
    ],
    capabilities: [
      "ClamAV engine with continuous signature updates",
      "Machine-learning threat detection",
      "Automatic quarantine",
      "Real-time and scheduled scanning",
      "REST API for integration",
    ],
    integrations: [
      { slug: "guardian", emoji: "🛡️", name: "Guardian AI", desc: "Wire scanning into Guardian's incident response." },
    ],
  },
  {
    slug: "studio", product: "studio", name: "AXTO Studio", emoji: "🧠", badge: "AI STUDIO",
    color: "#0f766e", gradient: "linear-gradient(135deg,#04211e,#0a3a35)", anim: "spark",
    tagline: "Your self-hosted AI & GPU workspace",
    hero: "A professional workspace for AI and GPU work — chat, image and video generation, and visual pipelines — all powered by your own API keys and GPU endpoints. Your keys, your data, your server.",
    byox: byox({
      BYOK: "Bring keys for OpenAI, Claude, Gemini, Groq and more — Studio never stores them.",
      BYOM: "Connect your own GPU endpoints (RunPod, Lambda, vast.ai or custom).",
      BYOD: "Sessions, artifacts and history live in your database only.",
      BYOI: "Runs as a container on your server; nothing is shared with AXTO.",
      BYOX: "A full creative AI stack that is entirely yours.",
    }),
    benefits: [
      { icon: "💬", title: "One workspace, every model", desc: "Chat across 10+ providers using your own keys, with saved history." },
      { icon: "🎨", title: "Create images and video", desc: "Generate and animate with your connected GPU endpoints." },
      { icon: "🔀", title: "Visual pipelines", desc: "Chain AI and GPU steps with conditional routing — e.g. local first, cloud on overflow." },
      { icon: "🔐", title: "Encrypted credentials", desc: "All keys encrypted at rest on your own disk." },
    ],
    capabilities: [
      "Multi-provider AI chat (10+ providers, BYOK)",
      "Image and video generation via your GPU endpoints",
      "Photo animation, cartoon and sound tools",
      "Visual pipeline builder (AI + GPU + logic nodes)",
      "Credential manager with per-provider usage tracking",
      "REST and WebSocket APIs",
    ],
    integrations: [
      { slug: "orchestra", emoji: "🎼", name: "Orchestra AI", desc: "Use Orchestra as a shared model backend." },
    ],
  },
  {
    slug: "legal", product: "legal", name: "AXTO Legal", emoji: "⚖️", badge: "LEGAL",
    color: "#4338ca", gradient: "linear-gradient(135deg,#12123a,#20205e)", anim: "scales",
    tagline: "Private AI for legal work",
    hero: "AI-assisted legal research, contract intelligence and document drafting that runs on your own infrastructure — so privileged and confidential material never leaves your control.",
    byox: byox({
      BYOK: "Use your own AI provider keys for every query.",
      BYOM: "Run local models for maximum confidentiality.",
      BYOD: "Connect your own sources — internal documents or providers like LexisNexis and Westlaw.",
      BYOI: "Self-hosted, so privileged material stays privileged.",
      BYOX: "Own a private legal-AI stack with no third-party exposure.",
    }),
    benefits: [
      { icon: "🔎", title: "Research, faster", desc: "Ask questions across jurisdictions and get sourced answers." },
      { icon: "📑", title: "Contract intelligence", desc: "Surface risks, obligations and unusual clauses automatically." },
      { icon: "✍️", title: "Document drafting", desc: "Generate and refine documents from your own templates." },
      { icon: "🔐", title: "Confidential by design", desc: "Everything runs on your infrastructure — nothing is sent to a vendor." },
    ],
    capabilities: [
      "AI legal research across jurisdictions",
      "Contract analysis and risk surfacing",
      "Document builder from your templates",
      "Bring-your-own data connectors (LexisNexis, Westlaw, internal)",
      "Full confidentiality — self-hosted",
    ],
    integrations: [
      { slug: "vault", emoji: "🔒", name: "AXTO Vault", desc: "Redact client PII before any AI call." },
      { slug: "compliance", emoji: "📋", name: "AXTO Compliance", desc: "Keep matters aligned to regulatory controls." },
    ],
  },
];

export function getProductBySlug(slug: string): ProductCatalogEntry | undefined {
  return PRODUCT_CATALOG.find((p) => p.slug === slug);
}

export const PRODUCT_SLUGS = PRODUCT_CATALOG.map((p) => p.slug);
