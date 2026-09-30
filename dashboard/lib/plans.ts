/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * SUBSCRIPTION PLANS — the single source of truth for what every plan costs and
 * unlocks. Pricing page, checkout, entitlement checks, the member portal, the
 * admin portal and self-hosted licence issuing all read from here.
 *
 * Prices are defaults; the admin can override them (platform_config key
 * "plan_prices") without a deploy — see getPlanPrices().
 * ============================================================================ */

export type PlanId = "starter" | "pro" | "business" | "enterprise";
export type Tier = "none" | PlanId;
export type Cycle = "monthly" | "yearly";
export type PromptLevel = "basic" | "pro" | "premium" | "elite";

export interface PlanLimits {
  clipperVideosPerMonth: number;   // -1 = unlimited
  storageGB: number;
  promptLevels: PromptLevel[];
  legalWorkspaces: "core" | "all";
  apps: string[];                  // cloud app slugs from lib/apps.ts
  selfHostedApps: number;          // how many self-hosted products (0 = none, -1 = all)
  selfHostedNodes: number;         // max nodes per self-hosted licence (-1 = unlimited)
  apiKeys: number;                 // AXTO Connect developer keys (0 = no developer API)
  apiRpm: number;                  // Connect requests per minute, per member
  webhooks: number;                // signed webhook endpoints
}

export interface Plan {
  id: PlanId;
  name: string;
  rank: number;                    // for comparisons (higher = more)
  headline: string;
  bestFor: string;
  monthly: number;                 // USD
  yearly: number;                  // USD
  highlight?: boolean;
  limits: PlanLimits;
  features: string[];              // human copy, derived from limits — keep in sync
}

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "business", "enterprise"];
export const TIER_RANK: Record<Tier, number> = { none: 0, starter: 1, pro: 2, business: 3, enterprise: 4 };

// These are BYOX plans: every app runs on the member's OWN AI keys / models /
// endpoints, so AI usage is unlimited on our side. AXTO-provided AI ("Managed")
// is a separate, currently locked product — see MANAGED_PLANS below.
const CORE_APPS = ["legal", "prompts", "studio", "vault", "clipper"];
const ALL_APPS = ["legal", "prompts", "studio", "vault", "clipper", "compliance", "security"];

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter", name: "Starter", rank: 1,
    headline: "Everything you need to start working with AI.",
    bestFor: "Freelancers & solo professionals",
    monthly: 19, yearly: 190,
    limits: {
      clipperVideosPerMonth: 10, storageGB: 1, promptLevels: ["basic", "pro"], legalWorkspaces: "core",
      apps: CORE_APPS, selfHostedApps: 0, selfHostedNodes: 0, apiKeys: 2, apiRpm: 60, webhooks: 1,
    },
    features: [
      "Unlimited AI with your own keys (BYOK)",
      "Legal AI — 6 core workspaces",
      "Prompt Library — Basic & Pro prompts",
      "AI Studio (multi-model chat)",
      "Clipper — 10 videos per month",
      "Privacy Vault (in-browser redaction)",
      "1 GB secure file storage",
      "Developer API & realtime — 2 keys, 60 requests/min, 1 webhook",
    ],
  },
  pro: {
    id: "pro", name: "Pro", rank: 2, highlight: true,
    headline: "The full cloud workspace for serious professionals.",
    bestFor: "Lawyers, consultants, analysts",
    monthly: 49, yearly: 490,
    limits: {
      clipperVideosPerMonth: 50, storageGB: 10, promptLevels: ["basic", "pro", "premium"], legalWorkspaces: "all",
      apps: ALL_APPS, selfHostedApps: 0, selfHostedNodes: 0, apiKeys: 5, apiRpm: 300, webhooks: 5,
    },
    features: [
      "Unlimited AI with your own keys (BYOK)",
      "Legal AI — all 36 workspaces",
      "Prompt Library — + Premium prompts",
      "Compliance Center & Security Analyst",
      "Clipper — 50 videos per month",
      "AI Studio & Privacy Vault",
      "10 GB secure file storage",
      "Developer API & realtime — 5 keys, 300 requests/min, 5 webhooks",
    ],
  },
  business: {
    id: "business", name: "Business", rank: 3,
    headline: "Cloud workspace plus self-hosted apps on your own servers.",
    bestFor: "Firms & growing teams",
    monthly: 199, yearly: 1990,
    limits: {
      clipperVideosPerMonth: 200, storageGB: 50, promptLevels: ["basic", "pro", "premium", "elite"], legalWorkspaces: "all",
      apps: ALL_APPS, selfHostedApps: 3, selfHostedNodes: 5, apiKeys: 20, apiRpm: 1200, webhooks: 20,
    },
    features: [
      "Everything in Pro",
      "Prompt Library — + Elite (global-scale) prompts",
      "Clipper — 200 videos per month",
      "Self-hosted: any 3 apps, top tier, up to 5 nodes each",
      "Docker images & setup guides",
      "50 GB secure file storage",
      "Developer API & realtime — 20 keys, 1,200 requests/min, 20 webhooks",
    ],
  },
  enterprise: {
    id: "enterprise", name: "Enterprise", rank: 4,
    headline: "Every app, every tier, on unlimited servers.",
    bestFor: "Enterprises & regulated organisations",
    monthly: 999, yearly: 9990,
    limits: {
      clipperVideosPerMonth: -1, storageGB: 500, promptLevels: ["basic", "pro", "premium", "elite"], legalWorkspaces: "all",
      apps: ALL_APPS, selfHostedApps: -1, selfHostedNodes: -1, apiKeys: 100, apiRpm: 6000, webhooks: 50,
    },
    features: [
      "Everything in Business",
      "Clipper — unlimited videos",
      "Self-hosted: all 10 apps, top tier, unlimited nodes",
      "Air-gapped & on-premise deployment",
      "500 GB secure file storage",
      "Priority email support",
      "Developer API & realtime — 100 keys, 6,000 requests/min, 50 webhooks",
    ],
  },
};

export function isPlanId(x: unknown): x is PlanId {
  return typeof x === "string" && (PLAN_ORDER as string[]).includes(x);
}

export function isCycle(x: unknown): x is Cycle {
  return x === "monthly" || x === "yearly";
}

/** Tier → limits. "none" (free account) gets read-only access to Basic prompts. */
export function limitsFor(tier: Tier): PlanLimits {
  if (tier === "none") {
    return { clipperVideosPerMonth: 0, storageGB: 0, promptLevels: ["basic"], legalWorkspaces: "core", apps: ["prompts"], selfHostedApps: 0, selfHostedNodes: 0, apiKeys: 0, apiRpm: 0, webhooks: 0 };
  }
  return PLANS[tier].limits;
}

export function atLeast(tier: Tier, min: Tier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[min];
}

/** Lowest plan that unlocks a given prompt level. */
export function planForPromptLevel(level: PromptLevel): Tier {
  if (level === "basic") return "none";
  if (level === "pro") return "starter";
  if (level === "premium") return "pro";
  return "business";
}

/** Lowest plan that unlocks a given cloud app. */
export function planForApp(app: string): Tier {
  for (const id of PLAN_ORDER) if (PLANS[id].limits.apps.includes(app)) return id;
  return "enterprise";
}

// ── Prices (admin-overridable) ─────────────────────────────────────────────
export type PriceTable = Record<PlanId, { monthly: number; yearly: number }>;

export function defaultPrices(): PriceTable {
  const t = {} as PriceTable;
  for (const id of PLAN_ORDER) t[id] = { monthly: PLANS[id].monthly, yearly: PLANS[id].yearly };
  return t;
}

/** Merge an admin override (JSON from platform_config.plan_prices) over defaults, ignoring junk. */
export function mergePrices(overrideJson: string | null | undefined): PriceTable {
  const t = defaultPrices();
  if (!overrideJson) return t;
  try {
    const o = JSON.parse(overrideJson);
    for (const id of PLAN_ORDER) {
      const m = Number(o?.[id]?.monthly), y = Number(o?.[id]?.yearly);
      if (Number.isFinite(m) && m > 0) t[id].monthly = Math.round(m * 100) / 100;
      if (Number.isFinite(y) && y > 0) t[id].yearly = Math.round(y * 100) / 100;
    }
  } catch {}
  return t;
}

export async function getPlanPrices(db: any): Promise<PriceTable> {
  try {
    const row = await db.prepare(`SELECT value FROM platform_config WHERE key = 'plan_prices'`).first();
    return mergePrices(row?.value);
  } catch {
    return defaultPrices();
  }
}

export function priceFor(prices: PriceTable, plan: PlanId, cycle: Cycle): number {
  return cycle === "yearly" ? prices[plan].yearly : prices[plan].monthly;
}

/** Add one billing period to a date (calendar months, clamped to month end). */
export function addPeriod(from: Date, cycle: Cycle): Date {
  const d = new Date(from.getTime());
  const months = cycle === "yearly" ? 12 : 1;
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

export function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function formatUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: n % 1 ? 2 : 0 })}`;
}

// ── MANAGED (AXTO-provided AI) — a separate product line, LOCKED ───────────
// Defined here so pricing is ready, but never sold or used while locked
// (platform_config.managed_enabled != "1"). Nothing in the BYOX plans above
// depends on these, and the Managed code path never reads BYOX keys.
export interface ManagedPlan { id: string; name: string; monthly: number; creditsPerMonth: number; blurb: string }

export const MANAGED_PLANS: ManagedPlan[] = [
  { id: "managed_lite", name: "Managed Lite", monthly: 29, creditsPerMonth: 500, blurb: "AXTO provides the AI — no API keys needed." },
  { id: "managed_plus", name: "Managed Plus", monthly: 99, creditsPerMonth: 2500, blurb: "More AI credits for daily professional use." },
  { id: "managed_max", name: "Managed Max", monthly: 299, creditsPerMonth: 10000, blurb: "High-volume AI for teams." },
];
