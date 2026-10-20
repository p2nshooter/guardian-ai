/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * EDITIONS PER SELF-HOSTED APP — the single source of truth
 * (docs/AXTO-APPS-BLUEPRINT.md §3). Each of the 10 apps is sold in the editions
 * shown on the owner's "AXTO Digital Global" picture, using the package codes
 * that already exist (old PACKAGE_INFO / D1 license_packages) so licences sold
 * before stay valid. Prices are the pre-v3 list prices as defaults; the owner
 * changes them in Admin → Plans → Editions (platform_config.edition_prices).
 *
 * Used by the public pages, checkout, the member portal, the admin portal and
 * the signed licence entitlements (lib/entitlements.ts) — engines take their
 * limits from the signed data. The Business / Enterprise plan bundles stay:
 * a licence from a plan is always the top edition.
 * Pure data + helpers: no React, no server imports.
 * ============================================================================ */

export type EditionTier = "starter" | "professional" | "business" | "enterprise";
export type EditionCycle = "monthly" | "yearly";

/** Measured limits signed into the licence (-1 = unlimited, absent = not applicable). */
export interface EditionLimits {
  servers?: number; workers?: number; reqPerDay?: number; customerKeys?: number; sources?: number; eps?: number;
  frameworks?: string[]; devices?: number; endpoints?: number; gpus?: number; workspaces?: number; jurisdictions?: number; users?: number;
}

export interface Edition {
  app: string;            // self-hosted slug (lib/selfhosted.ts)
  tier: EditionTier;
  code: string;           // package code signed into the licence
  name: string;           // edition name as on the owner's picture
  yearly: number;         // default list price, USD per year
  monthly: number;        // default list price, USD per month
  limits: EditionLimits;
  /** Signed feature switches that differ from the top edition (lib/entitlements.ts). */
  off: string[];
  /** Short feature lines (English; translations in lib/i18n-pages/editions.ts). */
  features: string[];
}

const E = (app: string, tier: EditionTier, code: string, name: string, yearly: number, monthly: number, limits: EditionLimits, off: string[], features: string[]): Edition =>
  ({ app, tier, code, name, yearly, monthly, limits, off, features });

export const EDITIONS: Edition[] = [
  // Guardian AI — servers protected
  E("guardian", "starter", "lite", "Sentinel Lite", 990, 99, { servers: 1 }, ["threat_hunting", "ebpf", "mtls", "multi_tenant", "white_label"],
    ["1 server", "AI behavioural detection, ClamAV and alerts"]),
  E("guardian", "professional", "pro", "Professional", 4_990, 499, { servers: 25 }, ["ebpf", "mtls", "multi_tenant", "white_label"],
    ["Up to 25 servers", "Threat hunting and UEBA", "Compliance reports"]),
  E("guardian", "business", "shield", "Business", 19_900, 1_990, { servers: 100 }, ["multi_tenant", "white_label"],
    ["Up to 100 servers", "eBPF kernel inspection", "mTLS node mesh and deception"]),
  E("guardian", "enterprise", "aegis", "Enterprise", 79_000, 7_900, { servers: 1_000 }, [],
    ["Up to 1,000 servers", "Multi-tenant and white-label", "Custom threat intelligence"]),
  // Orchestra AI — AI workers
  E("orchestra", "starter", "orchestra_core", "Starter", 34_900, 3_490, { workers: 10 }, ["autoscaler", "federation", "cost_analytics"],
    ["Up to 10 AI workers", "Smart routing across 15+ providers"]),
  E("orchestra", "professional", "orchestra_scale", "Professional", 89_900, 8_990, { workers: 50 }, [],
    ["Up to 50 AI workers", "Autoscaling and federation", "Cost analytics"]),
  E("orchestra", "enterprise", "orchestra_unlimited", "Enterprise", 249_000, 24_900, { workers: -1 }, [],
    ["Unlimited workers", "Custom routing", "White-label"]),
  // Vault AI — requests per day
  E("vault", "starter", "vault_starter", "Starter", 4_990, 499, { reqPerDay: 50_000 }, ["phi_redaction", "hipaa_report", "soc2_report", "custom_policies", "multi_tenant", "siem_integration"],
    ["50,000 requests a day", "PII redaction proxy and audit log"]),
  E("vault", "professional", "vault_professional", "Professional", 14_900, 1_490, { reqPerDay: 500_000 }, ["custom_policies", "multi_tenant", "siem_integration"],
    ["500,000 requests a day", "HIPAA, PCI DSS and SOC 2 reports"]),
  E("vault", "business", "vault_business", "Business", 39_900, 3_990, { reqPerDay: 5_000_000 }, [],
    ["5 million requests a day", "Custom entity models", "SIEM forwarding"]),
  E("vault", "enterprise", "vault_enterprise", "Enterprise", 119_000, 11_900, { reqPerDay: -1 }, [],
    ["Unlimited requests", "Multi-region deployment"]),
  // Edge AI — requests per day, customer keys
  E("edge", "starter", "edge_starter", "Starter", 7_990, 799, { reqPerDay: 100_000, customerKeys: 5 }, ["token_metering"],
    ["100,000 requests a day", "5 customer API keys"]),
  E("edge", "professional", "edge_professional", "Professional", 24_900, 2_490, { reqPerDay: 1_000_000, customerKeys: -1 }, [],
    ["1 million requests a day", "Unlimited customers", "Token metering"]),
  E("edge", "business", "edge_business", "Business", 40_900, 4_090, { reqPerDay: 10_000_000, customerKeys: -1 }, [],
    ["10 million requests a day", "Automatic invoicing"]),
  E("edge", "enterprise", "edge_enterprise", "Enterprise", 69_000, 6_900, { reqPerDay: -1, customerKeys: -1 }, [],
    ["Unlimited requests", "Multi-tenant and white-label"]),
  // SOC AI — log sources, events per second
  E("soc", "starter", "soc_starter", "Starter", 24_900, 2_490, { sources: 5, eps: 200 }, ["threat_hunting"],
    ["5 log sources, 200 events a second", "MITRE ATT&CK mapping and alerts"]),
  E("soc", "professional", "soc_professional", "Professional", 79_000, 7_900, { sources: 25, eps: 1_000 }, ["threat_hunting"],
    ["25 log sources, 1,000 events a second", "Threat intelligence"]),
  E("soc", "business", "soc_business", "Business", 136_900, 13_690, { sources: 100, eps: 10_000 }, [],
    ["100 log sources, 10,000 events a second", "AI-assisted threat hunting"]),
  E("soc", "enterprise", "soc_enterprise", "Enterprise", 249_000, 24_900, { sources: -1, eps: -1 }, [],
    ["Unlimited sources and events", "Multi-tenant for MSSPs"]),
  // Compliance AI — frameworks
  E("compliance", "starter", "compliance_starter", "Starter", 7_990, 799, { frameworks: ["soc2", "gdpr"] }, ["iso27001", "hipaa", "pci_dss"],
    ["SOC 2 and GDPR", "Automated evidence and gap analysis"]),
  E("compliance", "professional", "compliance_professional", "Professional", 19_900, 1_990, { frameworks: ["soc2", "iso27001", "hipaa", "pci_dss", "gdpr", "pdpa"] }, [],
    ["6 frameworks: SOC 2, ISO 27001, HIPAA, PCI DSS, GDPR, PDPA"]),
  E("compliance", "business", "compliance_business", "Business", 31_900, 3_190, { frameworks: ["soc2", "iso27001", "hipaa", "pci_dss", "gdpr", "pdpa", "nist_csf"] }, [],
    ["7 frameworks including NIST CSF", "CI/CD compliance gates"]),
  E("compliance", "enterprise", "compliance_enterprise", "Enterprise", 49_000, 4_900, { frameworks: ["soc2", "iso27001", "hipaa", "pci_dss", "gdpr", "pdpa", "nist_csf"] }, [],
    ["Custom frameworks", "Multi-tenant", "M&A due-diligence package"]),
  // Sentinel OT — devices
  E("sentinel", "starter", "sentinel_starter", "Starter", 12_900, 1_290, { devices: 50 }, [],
    ["Up to 50 devices", "IEC 62443 report"]),
  E("sentinel", "professional", "sentinel_professional", "Professional", 39_900, 3_990, { devices: 500 }, [],
    ["Up to 500 devices", "AI-assisted triage"]),
  E("sentinel", "business", "sentinel_business", "Business", 68_900, 6_890, { devices: 5_000 }, [],
    ["Up to 5,000 devices", "Multiple sites and SOAR response"]),
  E("sentinel", "enterprise", "sentinel_enterprise", "Enterprise", 129_000, 12_900, { devices: -1 }, [],
    ["Unlimited devices", "Custom protocol decoders"]),
  // Antivirus — endpoints
  E("antivirus", "starter", "antivirus_starter", "Starter", 2_900, 290, { endpoints: 10 }, ["guardian_ml"],
    ["Up to 10 endpoints", "ClamAV and pattern-rule scanning API"]),
  E("antivirus", "professional", "antivirus_professional", "Professional", 9_900, 990, { endpoints: 100 }, [],
    ["Up to 100 endpoints", "Hash list that learns from your samples"]),
  E("antivirus", "enterprise", "antivirus_enterprise", "Enterprise", 29_900, 2_990, { endpoints: -1 }, [],
    ["Unlimited endpoints", "Bulk import of malware hash feeds"]),
  // AXTO Studio — requests per day, GPUs
  E("studio", "starter", "studio_starter", "Starter", 490, 49, { reqPerDay: 500, gpus: 1 }, ["hybrid_pool", "image_generation"],
    ["500 requests a day", "1 GPU endpoint"]),
  E("studio", "professional", "studio_professional", "Professional", 1_990, 199, { reqPerDay: 5_000, gpus: 5 }, [],
    ["5,000 requests a day", "5 GPU endpoints", "Hybrid pipelines"]),
  E("studio", "enterprise", "studio_enterprise", "Enterprise", 7_990, 799, { reqPerDay: 50_000, gpus: -1 }, [],
    ["50,000 requests a day", "White-label"]),
  // AXTO Legal — workspaces, jurisdictions
  E("legal", "starter", "legal_starter", "Starter", 14_900, 1_490, { workspaces: 3, jurisdictions: 30, users: 1 }, ["air_gapped"],
    ["3 workspaces, 30 jurisdictions"]),
  E("legal", "professional", "legal_professional", "Professional", 49_000, 4_900, { workspaces: 10, jurisdictions: 100, users: 5 }, ["air_gapped"],
    ["10 workspaces, 100 jurisdictions"]),
  E("legal", "business", "legal_business", "Business", 99_000, 9_900, { workspaces: 18, jurisdictions: -1, users: 25 }, ["air_gapped"],
    ["18 workspaces, 195+ jurisdictions", "Up to 25 users"]),
  E("legal", "enterprise", "legal_enterprise", "Enterprise", 249_000, 24_900, { workspaces: -1, jurisdictions: -1, users: -1 }, [],
    ["Unlimited workspaces and users", "Air-gapped deployment"]),
];

export const TIER_ORDER: EditionTier[] = ["starter", "professional", "business", "enterprise"];
export const isEditionCycle = (x: unknown): x is EditionCycle => x === "monthly" || x === "yearly";

export const editionsFor = (app: string): Edition[] => EDITIONS.filter((e) => e.app === app).sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
export const getEdition = (code: string): Edition | undefined => EDITIONS.find((e) => e.code === code);
export const topEdition = (app: string): Edition | undefined => editionsFor(app).at(-1);
export const isTopEdition = (code: string): boolean => { const e = getEdition(code); return !!e && topEdition(e.app)?.code === code; };
/** Rank of an edition inside its app (0 = lowest); -1 for an unknown code. */
export const editionRank = (code: string): number => { const e = getEdition(code); return e ? editionsFor(e.app).findIndex((x) => x.code === code) : -1; };

/** The node-style cap stored on the licence row (sh_licenses.max_nodes) for an edition. */
export function editionMaxNodes(e: Edition): number {
  const l = e.limits;
  return l.servers ?? l.workers ?? l.sources ?? l.devices ?? l.endpoints ?? l.gpus ?? l.users ?? -1;
}

/** Signed entitlement keys for an edition, layered over the app's top set (lib/entitlements.ts). */
export function editionEntitlements(e: Edition): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = { edition: e.tier };
  for (const k of e.off) out[k] = false;
  const l = e.limits;
  if (l.reqPerDay !== undefined) { out.max_req_day = l.reqPerDay; out.max_requests_daily = l.reqPerDay; }
  if (l.customerKeys !== undefined) out.max_customer_keys = l.customerKeys;
  if (l.sources !== undefined) out.max_sources = l.sources;
  if (l.eps !== undefined) out.max_eps = l.eps;
  if (l.devices !== undefined) out.max_devices = l.devices;
  if (l.gpus !== undefined) out.max_gpus = l.gpus;
  if (l.workspaces !== undefined) out.workspaces = l.workspaces;
  if (l.jurisdictions !== undefined) out.max_countries = l.jurisdictions;
  if (l.users !== undefined) out.max_users = l.users;
  if (l.frameworks) { out.frameworks = l.frameworks.join(","); out.max_frameworks = l.frameworks.length; }
  return out;
}

export interface EditionPrice { code: string; yearly: number; monthly: number; enabled: boolean }

/** Merge the admin override (platform_config.edition_prices) over the defaults, ignoring junk. */
export function mergeEditionPrices(overrideJson: string | null | undefined): EditionPrice[] {
  const rows = EDITIONS.map((e) => ({ code: e.code, yearly: e.yearly, monthly: e.monthly, enabled: true }));
  if (!overrideJson) return rows;
  try {
    const o = JSON.parse(overrideJson);
    if (!Array.isArray(o)) return rows;
    for (const r of rows) {
      const x = o.find((y: any) => y && y.code === r.code);
      if (!x) continue;
      const yearly = Number(x.yearly), monthly = Number(x.monthly);
      if (Number.isFinite(yearly) && yearly > 0) r.yearly = Math.round(yearly * 100) / 100;
      if (Number.isFinite(monthly) && monthly > 0) r.monthly = Math.round(monthly * 100) / 100;
      if (typeof x.enabled === "boolean") r.enabled = x.enabled;
    }
  } catch {}
  return rows;
}

export async function getEditionPrices(db: any): Promise<EditionPrice[]> {
  try {
    const row = await db.prepare(`SELECT value FROM platform_config WHERE key = 'edition_prices'`).first();
    return mergeEditionPrices(row?.value);
  } catch {
    return mergeEditionPrices(null);
  }
}

/** Price of an edition for a cycle, or null when the edition is unknown or switched off. */
export function editionPrice(code: string, cycle: EditionCycle, prices: EditionPrice[] = mergeEditionPrices(null)): number | null {
  const p = prices.find((x) => x.code === code);
  if (!p || !p.enabled) return null;
  return cycle === "yearly" ? p.yearly : p.monthly;
}

/** Up to this amount every active payment method may carry an edition; above it only
 * bank/wire, crypto and card (to the card ceiling) — PayPal and IDR wallets cap far lower. */
export const EDITION_ANY_GATEWAY_MAX = 10_000;
export const EDITION_LARGE_GATEWAYS = ["manual", "crypto", "nowpayments", "stripe"];
export function editionGatewayAllowed(gateway: string, amountUsd: number, cardMaxUsd = 999_999): boolean {
  if (amountUsd <= EDITION_ANY_GATEWAY_MAX) return !!gateway;
  if (!EDITION_LARGE_GATEWAYS.includes(gateway)) return false;
  return gateway !== "stripe" || amountUsd <= cardMaxUsd;
}

const EN_TIER: Record<EditionTier, string> = { starter: "Starter", professional: "Professional", business: "Business", enterprise: "Enterprise" };
/** True when an edition carries a name of its own (e.g. Guardian's "Sentinel Lite") rather than the tier name. */
export const hasOwnName = (e: { tier: EditionTier; name: string }) => e.name !== EN_TIER[e.tier];
