/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ═══════════════════════════════════════════════════════════════════════════
// AXTO Vault — Package catalog additions for lib/stripe.ts
//
// INSTRUCTIONS: Merge this content into your existing lib/stripe.ts
// Add the vault entries into the PACKAGE_INFO object, and update the
// product type union to include 'vault'.
//
// Step 1: Change product type in PackageInfo:
//   product: "guardian" | "orchestra"
//   → product: "guardian" | "orchestra" | "vault" | "edge" | "soc" | "compliance" | "sentinel"
//
// Step 2: Add to generateLicenseKey() in lib/license.ts:
//   'vault'   → 'VAULT'
//   'edge'    → 'EDGE'
//   'soc'     → 'SOC'
//   'compliance' → 'CMPL'
//   'sentinel' → 'SNTL'
//
// Step 3: Add getProductFromPackage() entries:
//   vault_*     → 'vault'
//   edge_*      → 'edge'
//   soc_*       → 'soc'
//   compliance_*→ 'compliance'
//   sentinel_* → 'sentinel'
// ═══════════════════════════════════════════════════════════════════════════

// Add these entries to PACKAGE_INFO in lib/stripe.ts:

// DEPRECATED — canonical data is in lib/stripe.ts
// Kept only for backward compat with old imports.
// Prices MUST match lib/stripe.ts.
export const VAULT_PACKAGE_INFO = {
  vault_starter: {
    name:         "Vault Starter",
    description:  "Privacy intelligence for startups — GDPR & PDPA, up to 50K requests/day",
    price:        4990,
    priceMonthly: 499,
    product:      "vault" as const,
    maxNodes:     0,
    maxRequests:  50_000,
  },
  vault_professional: {
    name:         "Vault Professional",
    description:  "Compliance-grade AI privacy for regulated mid-market. HIPAA & GDPR proof-of-compliance out of the box.",
    price:        14900,
    priceMonthly: 1490,
    product:      "vault" as const,
    maxNodes:     0,
    maxRequests:  500_000,
  },
  vault_business: {
    name:         "Vault Business",
    description:  "Multi-department deployment. Custom NLP entity models, AI-assisted detection, full SIEM forwarding.",
    price:        39900,
    priceMonthly: 3990,
    product:      "vault" as const,
    maxNodes:     0,
    maxRequests:  5_000_000,
  },
  vault_enterprise: {
    name:         "Vault Enterprise",
    description:  "Bank-grade AI privacy. Custom redaction AI fine-tuning, multi-region, Automated monitoring.",
    price:        119000,
    priceMonthly: 11900,
    product:      "vault" as const,
    maxNodes:     0,
    maxRequests:  -1,
  },
};

// ── Vault pricing display — synced with lib/stripe.ts ────────────────────────
export const VAULT_PRICING = [
  {
    name:    "Starter",
    code:    "vault_starter",
    price:   4990,
    period:  "/year",
    limit:   "Up to 50,000 req/day",
    desc:    "Deploy enterprise-grade AI privacy for your team. Automatically redacts sensitive data before it ever reaches your AI provider.",
    features: [
      "PII Redaction — Emails, phones, SSN, addresses",
      "PHI Redaction — Medical records, diagnoses, lab values",
      "Financial Redaction — Cards, IBAN, API keys, wallets",
      "Session-based re-injection (original values in response)",
      "Audit log with masked evidence trail",
      "OpenAI & Anthropic-compatible proxy",
      "GDPR + PDPA frameworks",
      "100% BYOK — your AI keys stay on your server",
    ],
    popular: false,
    color:   "#6366f1",
    icon:    "🔐",
  },
  {
    name:    "Professional",
    code:    "vault_professional",
    price:   14900,
    period:  "/year",
    limit:   "Up to 500,000 req/day",
    desc:    "Complete privacy compliance infrastructure for regulated industries. Full audit trail, HIPAA, SOC 2, PCI-DSS, and GDPR compliance evidence.",
    features: [
      "Everything in Starter",
      "HIPAA + PCI-DSS + CCPA + SOC2",
      "AES-256-GCM encryption",
      "Differential privacy",
      "Tokenization vault",
      "AI context detection",
      "Real-time WebSocket audit stream",
      "API access for audit & policy management",
    ],
    popular: true,
    color:   "#6366f1",
    icon:    "🔐",
  },
  {
    name:    "Business",
    code:    "vault_business",
    price:   39900,
    period:  "/year",
    limit:   "Multi-tenant · 5,000,000 req/day",
    desc:    "Enterprise-scale privacy layer with multi-tenant isolation, custom AI-based redaction, and native SIEM integration.",
    features: [
      "Everything in Professional",
      "Custom NLP models",
      "Multi-tenant architecture",
      "SIEM forwarding (Splunk, ELK, Datadog)",
      "Audit-ready in 30 days",
      "White-label dashboard",
      "Custom redaction vocabulary",
      "Email community support",
    ],
    popular: false,
    color:   "#6366f1",
    icon:    "🔐",
  },
  {
    name:    "Enterprise",
    code:    "vault_enterprise",
    price:   119000,
    period:  "/year",
    limit:   "Unlimited requests · Automated monitoring",
    desc:    "Bank-grade AI privacy infrastructure. Unlimited scale, custom AI redaction model training, multi-region, and comprehensive interactive setup guide.",
    features: [
      "Everything in Business",
      "Unlimited daily requests",
      "Custom PII patterns",
      "High-availability architecture",
      "Comprehensive interactive setup guide",
      "Custom contract & procurement support",
      "Security audit & pentest-ready",
      "Multi-region deployment",
    ],
    popular: false,
    color:   "#7c3aed",
    icon:    "🔐",
  },
];
