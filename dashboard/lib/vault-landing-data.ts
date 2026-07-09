/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ═══════════════════════════════════════════════════════════════════════════
// AXTO Vault — Landing Page Section for app/page.tsx
//
// INSTRUCTIONS: Add this VAULT_PRICING array and VAULT_PRODUCT_INFO
// into your existing app/page.tsx, then render VaultSection component.
//
// Add after ORCHESTRA_PRICING in page.tsx.
// ═══════════════════════════════════════════════════════════════════════════

export const VAULT_PRICING_LANDING = [
  {
    name: "Starter",
    code: "vault_starter",
    price: 4990,
    period: "/year",
    limit: "50K req/day",
    desc: "Enterprise-grade AI privacy for growing teams. Automatically redacts PII, PHI, and financial data from every AI request — zero developer effort after the initial setup.",
    features: [
      "PII Redaction — 50+ patterns auto-detected",
      "PHI Redaction — HIPAA-grade medical data protection",
      "Financial Redaction — Cards, IBAN, API keys, wallets",
      "Session-based token map → re-injection in responses",
      "Full audit log with masked evidence trail",
      "OpenAI & Anthropic-compatible transparent proxy",
      "100% BYOK — your AI API keys, your infra",
    ],
    popular: false,
    color: "#6366f1",
    icon: "🔐",
    badge: "",
  },
  {
    name: "Professional",
    code: "vault_professional",
    price: 14900,
    period: "/year",
    limit: "500K req/day",
    desc: "Complete AI privacy compliance infrastructure. HIPAA, SOC 2, PCI-DSS, GDPR evidence generation, AES-256 encryption, differential privacy, and AI context detection.",
    features: [
      "Everything in Starter",
      "HIPAA + PCI-DSS + CCPA + SOC2 compliance",
      "AES-256-GCM encryption",
      "Differential privacy & tokenization vault",
      "Audit log export — CSV, JSON, SIEM-ready",
      "Real-time WebSocket audit stream",
      "AI context detection",
      "Full REST API for automation",
    ],
    popular: true,
    color: "#6366f1",
    icon: "🔐",
    badge: "Most Popular",
  },
  {
    name: "Business",
    code: "vault_business",
    price: 39900,
    period: "/year",
    limit: "Multi-tenant · 5M req/day",
    desc: "Enterprise-scale privacy layer with multi-tenant isolation, custom NLP entity models, AI-assisted detection, and native SIEM integration.",
    features: [
      "Everything in Professional",
      "Custom NLP models (fine-tunable per industry)",
      "Multi-tenant architecture (isolate by org/team)",
      "SIEM forwarding (Splunk, ELK, Datadog, QRadar)",
      "Audit-ready in 30 days",
      "Custom redaction vocabulary training",
      "White-label dashboard",
      "Email community support",
    ],
    popular: false,
    color: "#6366f1",
    icon: "🔐",
    badge: "",
  },
  {
    name: "Enterprise",
    code: "vault_enterprise",
    price: 119000,
    period: "/year",
    limit: "Unlimited requests · Automated monitoring",
    desc: "Bank-grade AI privacy infrastructure for global enterprises. Unlimited scale, custom AI redaction model training, multi-region deployment, and comprehensive interactive setup guide.",
    features: [
      "Everything in Business",
      "Unlimited daily requests",
      "Custom PII patterns & AI redaction model training",
      "High-availability architecture with credits",
      "Comprehensive interactive setup guide",
      "Custom contract & procurement support",
      "Security audit & pentest-ready architecture",
      "Multi-region active-active deployment",
    ],
    popular: false,
    color: "#7c3aed",
    icon: "🔐",
    badge: "Enterprise",
  },
];

// ── Vault product feature highlights for hero section ────────────────────────
export const VAULT_FEATURES = [
  {
    icon: "🕵️",
    title: "Automatic PII Redaction",
    desc: "50+ patterns: emails, phones, SSN, national IDs, addresses, dates of birth — all automatically detected and tokenized before reaching any AI provider.",
  },
  {
    icon: "🏥",
    title: "PHI Protection (HIPAA)",
    desc: "Medical record numbers, ICD diagnosis codes, lab values, medication dosages, insurance IDs — HIPAA-grade protection with zero developer overhead.",
  },
  {
    icon: "💳",
    title: "Financial Data Guard",
    desc: "Credit cards, IBAN, bank account numbers, routing numbers, API keys, bearer tokens, crypto wallet addresses — all redacted at the proxy layer.",
  },
  {
    icon: "🔄",
    title: "Seamless Re-injection",
    desc: "Original values are restored in the AI's response using session-based token mapping. Your application sees the full, unredacted response.",
  },
  {
    icon: "📋",
    title: "Compliance Audit Trail",
    desc: "Every request logged. Every redaction recorded (masked, not stored). Export evidence for SOC 2, HIPAA, GDPR, PCI-DSS audits in seconds.",
  },
  {
    icon: "🔑",
    title: "100% BYOK Architecture",
    desc: "Your AI API keys never touch AXTO infrastructure. Vault runs on your server, calls your AI provider. Zero data sovereignty compromise.",
  },
  {
    icon: "🌐",
    title: "Universal AI Compatibility",
    desc: "OpenAI, Anthropic, Google Gemini, Groq, Mistral, DeepSeek, Ollama, Azure OpenAI, and any OpenAI-compatible endpoint — all supported.",
  },
  {
    icon: "⚡",
    title: "Sub-10ms Overhead",
    desc: "Regex-first redaction engine adds less than 10ms to your AI request latency. Runs entirely in memory — no external service calls.",
  },
];

// ── Vault compliance badges ───────────────────────────────────────────────────
export const VAULT_COMPLIANCE = [
  { name: "HIPAA",    color: "#16a34a", desc: "PHI redaction + audit trail" },
  { name: "GDPR",     color: "#2563eb", desc: "PII protection + erasure support" },
  { name: "SOC 2",    color: "#7c3aed", desc: "Audit log + access controls" },
  { name: "PCI-DSS",  color: "#dc2626", desc: "Card data redaction + audit" },
  { name: "ISO 27001",color: "#0891b2", desc: "Data classification + trail" },
  { name: "PDPA",     color: "#ea580c", desc: "SEA personal data protection" },
];

// ── Vault integration code example (shown in landing page) ───────────────────
export const VAULT_CODE_EXAMPLE = `# Before Vault (data leak risk)
client = OpenAI(api_key="sk-...")

# After Vault (1 line change — full compliance)
client = OpenAI(
    api_key="anything",  # Vault uses your vault.yml key
    base_url="http://your-vault:8080/v1",
)

# Your code stays the same. Vault handles the rest.
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{
        "role": "user",
        "content": "Summarize: Patient John Smith (DOB: 1985-03-15, SSN: 123-45-6789)"
    }]
)
# AI receives: "...Patient [VAULT_PII_NAME_1] (DOB: [VAULT_DOB_1], SSN: [VAULT_SSN_1])"
# You receive: Full original text — re-injected by Vault`;
