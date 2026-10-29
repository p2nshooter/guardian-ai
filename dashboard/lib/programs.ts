/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PARTNER PROGRAMMES — the switches and the numbers (docs/BUSINESS-MASTER-BLUEPRINT.md
 * §3–§4, REQUESTS 131). Admin → Programs edits them; every page, API and the AI chat
 * read them from here.
 *
 *   visible    the public pages, menu links, sitemap and chat knowledge (default: shown)
 *   accepting  new members may join (default: yes)
 *   frozen     emergency stop of new issuing and payouts; what exists keeps working
 *
 * The self-serve portal of each programme ships in its own phase (affiliate: P2;
 * reseller: P4; white label: P5, §11). Until then a shown programme still has its page
 * and takes applications (lib/partners.ts) — the page says the portal opens later and
 * no one is asked to pay for something that does not exist yet.
 * ============================================================================ */
import type { Data } from "./data";
import { now } from "./db";

export type ProgramId = "affiliate" | "reseller" | "whitelabel";
export const PROGRAM_IDS: ProgramId[] = ["affiliate", "reseller", "whitelabel"];
/** Which programmes have their self-serve portal live. Flipped in code as each phase ships. */
export const PORTAL_LIVE: Record<ProgramId, boolean> = { affiliate: true, reseller: false, whitelabel: false };
/** The public page of each programme. */
export const PROGRAM_PATH: Record<ProgramId, string> = { affiliate: "/affiliate", reseller: "/resellers", whitelabel: "/white-label" };

export interface Switches { visible: boolean; accepting: boolean; frozen: boolean }
/** A volume tier: from this trailing-12-month purchase total, this discount off list. */
export interface Tier { fromUsd: number; pct: number }

export interface AffiliateTerms extends Switches {
  /** % of every paid order of a referred direct customer… */
  commissionPct: number;
  /** …during this many months after the customer signed up. */
  months: number;
  /** % of a referred reseller's or white-label partner's entry fee, once. */
  partnerFeePct: number;
  /** Days a commission is held before it can be paid (the refund window). */
  holdDays: number;
  /** Days a referral link is remembered in the visitor's browser. */
  cookieDays: number;
  /** The smallest payout. */
  minPayoutUsd: number;
  /** A single commission at or above this is held for one admin look before it becomes payable. */
  reviewAboveUsd: number;
  /** PayPal Payouts may run by itself (the PayPal app must have Payouts enabled). */
  paypalPayouts: boolean;
}

export interface ResellerTerms extends Switches {
  entryUsd: number; includedCreditUsd: number; tiers: Tier[];
  annualUsd: number; annualWaivedFromUsd: number; mapPct: number;
}

export interface WhiteLabelTerms extends Switches {
  entryUsd: number; includedCreditUsd: number; tiers: Tier[];
  annualUsd: number; annualReducedUsd: number; annualReducedFromUsd: number; minAnnualUsd: number;
  maxCombinedDiscountPct: number; aiMarkup: number;
}

export interface Programs { affiliate: AffiliateTerms; reseller: ResellerTerms; whitelabel: WhiteLabelTerms; updatedAt?: string }

const SHOWN: Switches = { visible: true, accepting: true, frozen: false };

export const PROGRAM_DEFAULTS: Programs = {
  affiliate: {
    ...SHOWN, commissionPct: 20, months: 12, partnerFeePct: 10, holdDays: 30, cookieDays: 60, minPayoutUsd: 50,
    reviewAboveUsd: 2_000, paypalPayouts: false,
  },
  reseller: {
    ...SHOWN, entryUsd: 5_000, includedCreditUsd: 2_500,
    tiers: [{ fromUsd: 0, pct: 25 }, { fromUsd: 25_000, pct: 30 }, { fromUsd: 100_000, pct: 35 }],
    annualUsd: 1_200, annualWaivedFromUsd: 25_000, mapPct: 10,
  },
  whitelabel: {
    ...SHOWN, entryUsd: 150_000, includedCreditUsd: 50_000,
    tiers: [{ fromUsd: 0, pct: 50 }, { fromUsd: 250_000, pct: 55 }, { fromUsd: 1_000_000, pct: 60 }],
    annualUsd: 48_000, annualReducedUsd: 24_000, annualReducedFromUsd: 500_000, minAnnualUsd: 60_000,
    maxCombinedDiscountPct: 65, aiMarkup: 2.5,
  },
};

const KEY = "programs";

const num = (v: unknown) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.]/g, "")));
const within = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = num(v);
  return v !== undefined && v !== null && v !== "" && Number.isFinite(n) && n >= lo && n <= hi ? n : fallback;
};
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);

function switches(v: any, d: Switches): Switches {
  return { visible: bool(v?.visible, d.visible), accepting: bool(v?.accepting, d.accepting), frozen: bool(v?.frozen, d.frozen) };
}

/** Tiers ascending by threshold, the first from 0, discounts never falling as volume rises. */
function tiers(v: unknown, d: Tier[]): Tier[] {
  if (!Array.isArray(v) || !v.length || v.length > 6) return d.map((t) => ({ ...t }));
  const out = v.map((t: any) => ({ fromUsd: within(t?.fromUsd, 0, 1e10, NaN), pct: within(t?.pct, 0, 90, NaN) }));
  if (out.some((t) => Number.isNaN(t.fromUsd) || Number.isNaN(t.pct)) || out[0]!.fromUsd !== 0) return d.map((t) => ({ ...t }));
  for (let i = 1; i < out.length; i++) if (out[i]!.fromUsd <= out[i - 1]!.fromUsd || out[i]!.pct < out[i - 1]!.pct) return d.map((t) => ({ ...t }));
  return out;
}

export function sanitizePrograms(v: any, base: Programs = PROGRAM_DEFAULTS): Programs {
  const a = v?.affiliate || {}, r = v?.reseller || {}, w = v?.whitelabel || {};
  const ba = base.affiliate, br = base.reseller, bw = base.whitelabel;
  const reseller: ResellerTerms = {
    ...switches(r, br), entryUsd: within(r.entryUsd, 0, 1e8, br.entryUsd), includedCreditUsd: within(r.includedCreditUsd, 0, 1e8, br.includedCreditUsd),
    tiers: tiers(r.tiers, br.tiers), annualUsd: within(r.annualUsd, 0, 1e8, br.annualUsd),
    annualWaivedFromUsd: within(r.annualWaivedFromUsd, 0, 1e10, br.annualWaivedFromUsd), mapPct: within(r.mapPct, 0, 50, br.mapPct),
  };
  const whitelabel: WhiteLabelTerms = {
    ...switches(w, bw), entryUsd: within(w.entryUsd, 0, 1e9, bw.entryUsd), includedCreditUsd: within(w.includedCreditUsd, 0, 1e9, bw.includedCreditUsd),
    tiers: tiers(w.tiers, bw.tiers), annualUsd: within(w.annualUsd, 0, 1e9, bw.annualUsd), annualReducedUsd: within(w.annualReducedUsd, 0, 1e9, bw.annualReducedUsd),
    annualReducedFromUsd: within(w.annualReducedFromUsd, 0, 1e11, bw.annualReducedFromUsd), minAnnualUsd: within(w.minAnnualUsd, 0, 1e9, bw.minAnnualUsd),
    maxCombinedDiscountPct: within(w.maxCombinedDiscountPct, 0, 90, bw.maxCombinedDiscountPct), aiMarkup: within(w.aiMarkup, 1, 20, bw.aiMarkup),
  };
  // The credit included in an entry fee can never exceed the fee itself.
  reseller.includedCreditUsd = Math.min(reseller.includedCreditUsd, reseller.entryUsd);
  whitelabel.includedCreditUsd = Math.min(whitelabel.includedCreditUsd, whitelabel.entryUsd);
  return {
    affiliate: {
      ...switches(a, ba), commissionPct: within(a.commissionPct, 0, 50, ba.commissionPct), months: within(a.months, 1, 60, ba.months),
      partnerFeePct: within(a.partnerFeePct, 0, 30, ba.partnerFeePct), holdDays: within(a.holdDays, 14, 120, ba.holdDays),
      cookieDays: within(a.cookieDays, 1, 365, ba.cookieDays), minPayoutUsd: within(a.minPayoutUsd, 10, 10_000, ba.minPayoutUsd),
      reviewAboveUsd: within(a.reviewAboveUsd, 50, 1e8, ba.reviewAboveUsd), paypalPayouts: bool(a.paypalPayouts, ba.paypalPayouts),
    },
    reseller, whitelabel,
    updatedAt: typeof v?.updatedAt === "string" ? v.updatedAt.slice(0, 40) : undefined,
  };
}

export async function getPrograms(db: Data): Promise<Programs> {
  try {
    const raw = await db.config.get(KEY);
    return raw ? sanitizePrograms(JSON.parse(raw)) : sanitizePrograms({});
  } catch {
    return sanitizePrograms({});
  }
}

export async function savePrograms(db: Data, p: Programs): Promise<Programs> {
  const clean = { ...sanitizePrograms(p), updatedAt: now() };
  await db.config.set(KEY, JSON.stringify(clean));
  return clean;
}

/** Shown on the site: the admin has not hidden it (default: shown). */
export const isShown = (p: Programs, id: ProgramId) => p[id].visible;
/** Any programme shown: the /partners hub and its footer link exist. */
export const anyShown = (p: Programs) => PROGRAM_IDS.some((id) => isShown(p, id));
/** Open to new members: shown, accepting and not frozen. */
export const isOpen = (p: Programs, id: ProgramId) => isShown(p, id) && p[id].accepting && !p[id].frozen;

/** The discount a trailing-12-month purchase total earns. */
export function tierFor(list: Tier[], trailingUsd: number): Tier {
  let t = list[0]!;
  for (const x of list) if (trailingUsd >= x.fromUsd) t = x;
  return t;
}

/** What a visitor may know: only programmes that are shown, and only their public terms. */
export function publicPrograms(p: Programs) {
  return {
    affiliate: isShown(p, "affiliate") ? {
      open: isOpen(p, "affiliate"), portal: PORTAL_LIVE.affiliate, commissionPct: p.affiliate.commissionPct, months: p.affiliate.months, partnerFeePct: p.affiliate.partnerFeePct,
      holdDays: p.affiliate.holdDays, cookieDays: p.affiliate.cookieDays, minPayoutUsd: p.affiliate.minPayoutUsd,
    } : null,
    reseller: isShown(p, "reseller") ? {
      open: isOpen(p, "reseller"), portal: PORTAL_LIVE.reseller, entryUsd: p.reseller.entryUsd, includedCreditUsd: p.reseller.includedCreditUsd, tiers: p.reseller.tiers,
      annualUsd: p.reseller.annualUsd, annualWaivedFromUsd: p.reseller.annualWaivedFromUsd, mapPct: p.reseller.mapPct,
    } : null,
    whitelabel: isShown(p, "whitelabel") ? {
      open: isOpen(p, "whitelabel"), portal: PORTAL_LIVE.whitelabel, entryUsd: p.whitelabel.entryUsd, includedCreditUsd: p.whitelabel.includedCreditUsd, tiers: p.whitelabel.tiers,
      annualUsd: p.whitelabel.annualUsd, annualReducedUsd: p.whitelabel.annualReducedUsd, annualReducedFromUsd: p.whitelabel.annualReducedFromUsd,
      minAnnualUsd: p.whitelabel.minAnnualUsd, maxCombinedDiscountPct: p.whitelabel.maxCombinedDiscountPct,
    } : null,
  };
}
export type PublicPrograms = ReturnType<typeof publicPrograms>;

const usd = (n: number) => `US$${n.toLocaleString("en-US")}`;
const tierText = (t: Tier[]) => t.map((x) => `${x.pct}% ${x.fromUsd ? `from ${usd(x.fromUsd)}` : "from the start"}`).join(", ");

/** The support chat's knowledge of the programmes: only shown ones, only their public terms (§9). */
export function programFacts(p: Programs, siteUrl: string): string {
  const v = publicPrograms(p);
  const out: string[] = [];
  const state = (x: { open: boolean; portal: boolean }) => (!x.open ? "Not taking new members at the moment." : x.portal ? "Open: join from the member portal." : "Taking applications now; the self-serve partner portal opens later and applicants are invited by e-mail.");
  if (v.affiliate) {
    const a = v.affiliate;
    out.push(`- Affiliate programme (${siteUrl}/affiliate), free to join for any signed-in member. ${state(a)} ${a.commissionPct}% of every paid order of a customer you refer, for ${a.months} months after they sign up; ${a.partnerFeePct}% once of a referred reseller's or white-label partner's entry fee. Your link remembers a visitor for ${a.cookieDays} days; the account is tied to you when they sign up. Each commission is held ${a.holdDays} days (the refund window); refunds reverse it. Paid monthly from the 5th, minimum ${usd(a.minPayoutUsd)}, by PayPal, USDT (TRC20) or bank wire. Self-referrals never earn.`);
  }
  if (v.reseller) {
    const r = v.reseller;
    out.push(`- Reseller programme (${siteUrl}/resellers), sells AXTO under the AXTO brand. ${state(r)} Entry fee ${usd(r.entryUsd)}, of which ${usd(r.includedCreditUsd)} is credit to buy licences. Wholesale discount off list price, rising by purchases in the last 12 months: ${tierText(r.tiers)}. Annual fee ${usd(r.annualUsd)} from the second year, waived from ${usd(r.annualWaivedFromUsd)} of purchases. Resellers set their own prices; advertised prices stay at least list price minus ${r.mapPct}%. Resellers support their own clients.`);
  }
  if (v.whitelabel) {
    const w = v.whitelabel;
    out.push(`- White-label programme (${siteUrl}/white-label), the AXTO platform under the partner's own brand (name, logo, colours, domain, e-mail; English plus one more language). ${state(w)} Entry fee ${usd(w.entryUsd)} for the first year, of which ${usd(w.includedCreditUsd)} is wholesale credit; includes a dedicated instance, the partner portal and API, onboarding, and Manage (AI provided for the partner's clients, sold only inside white label). Wholesale discount ${tierText(w.tiers)}; combined discounts never exceed ${w.maxCombinedDiscountPct}%. From the second year: platform fee ${usd(w.annualUsd)} a year (${usd(w.annualReducedUsd)} from ${usd(w.annualReducedFromUsd)} of purchases) and minimum purchases of ${usd(w.minAnnualUsd)} a year, any shortfall issued as credit. The partner owns its clients completely: setup, support, complaints, renewals, revocations and bans.`);
  }
  if (!out.length) return "";
  return `## Partner programmes (prepaid: partners pay before they sell; prices in USD, set by AXTO and shown on the pages below)
${out.join("\n")}
Hub: ${siteUrl}/partners. Contracts, custom terms and anything not written here are for the team.`;
}
