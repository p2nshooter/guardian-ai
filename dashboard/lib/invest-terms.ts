/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * INVESTOR ROUND — AXTO only (/invest, Admin → Investors, /app/investor).
 *
 * Owner, 19 Oct 2026, on the "joint offering for AXTO and XAA" line of
 * xaa.es: "Maksudnya masing2 web nyari investornya, bukan gabungan" — each
 * site raises from its own investors. So the joint US$2M AXTO & XAA raise of
 * 14 Oct (docs/REQUESTS.md row 55) becomes an AXTO-only round on axto.io,
 * paid from AXTO revenue only; xaa.es runs its own round on xaa.es/invest.
 *
 * Terms live in platform_config "invest_offer" (Admin → Investors). Until the
 * owner changes them, the defaults are the 14 Oct terms applied to AXTO alone:
 * a pool of 30 % of every paid AXTO revenue transaction shared pro rata to
 * capital against a US$2,000,000 target (US$50,000 → 0.75 %), minimum ticket
 * US$50,000, paid monthly until a full acquisition of AXTO, when the capital is
 * returned in full.
 *
 * Show / hide (docs/BLUEPRINT-V4.md §26.4, §27.4): the owner switches the round
 * on or off in Admin → Investors. Owner, 27 Oct 2026: "Investor defoultnya
 * ganti jadi show" — it is SHOWN by default. While hidden there is no footer
 * link, no sitemap entry, /invest is a 404 (noindex), the public API and
 * applications are refused, and the member menu shows "Investment" only to
 * someone who already has a stake.
 *
 * This file is pure (no database) so the public page and the tests can use it;
 * lib/invest.ts adds the storage.
 *
 * Revenue = paid axto.io orders, in USD, on the day they were paid — never a
 * sandbox (test) payment, never an investment or acquisition order, never a
 * refunded one (its status is no longer 'paid'). Capital is confirmed by a
 * person (a signed agreement and a bank wire — the bank-wire exception of the
 * zero-touch rule); everything after that is computed.
 * ============================================================================ */

export const INVEST_KEY = "invest_offer";

export type InvestStatus = "open" | "paused" | "closed";
export type InvestorStatus = "applied" | "verified" | "declined" | "returned";

export interface InvestOffer {
  /** Shown on the public site and in the member menu at all (§26.4). On by default (owner, 27 Oct 2026). */
  visible: boolean;
  status: InvestStatus;
  targetUsd: number;
  minUsd: number;
  /** Percentage (0–100] of every paid AXTO revenue transaction shared among investors. */
  poolPct: number;
  /** WhatsApp for investor questions. */
  whatsapp: string;
  updatedAt?: string;
}

export const INVEST_DEFAULTS: InvestOffer = { visible: true, status: "open", targetUsd: 2_000_000, minUsd: 50_000, poolPct: 30, whatsapp: "+6285691234561" };

const num = (v: unknown) => Number(String(v ?? "").replace(/[^\d.]/g, ""));

/** Stored / submitted settings → valid ones; anything unusable keeps the current (or default) value. */
export function sanitizeInvest(v: any, base: InvestOffer = INVEST_DEFAULTS): InvestOffer {
  if (!v || typeof v !== "object") return { ...base };
  const target = num(v.targetUsd);
  const targetUsd = Number.isFinite(target) && target >= 10_000 ? Math.round(target) : base.targetUsd;
  const min = num(v.minUsd);
  const minUsd = Number.isFinite(min) && min >= 1_000 && min <= targetUsd ? Math.round(min) : Math.min(base.minUsd, targetUsd);
  const pool = num(v.poolPct);
  const poolPct = Number.isFinite(pool) && pool > 0 && pool <= 100 ? Math.round(pool * 100) / 100 : base.poolPct;
  const whatsapp = String(v.whatsapp ?? "").replace(/[^\d+ ]/g, "").trim().slice(0, 30);
  return {
    visible: typeof v.visible === "boolean" ? v.visible : base.visible,
    status: v.status === "paused" || v.status === "closed" ? v.status : v.status === "open" ? "open" : base.status,
    targetUsd, minUsd, poolPct,
    whatsapp: /\d{8,}/.test(whatsapp.replace(/\D/g, "")) ? whatsapp : base.whatsapp,
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt.slice(0, 40) : base.updatedAt,
  };
}

/** Fraction (0–1) of each revenue transaction owed to a stake of this size. */
export function shareOf(capitalUsd: number, offer: Pick<InvestOffer, "poolPct" | "targetUsd">): number {
  if (!(capitalUsd > 0) || !(offer.targetUsd > 0)) return 0;
  return Math.min(offer.poolPct / 100, (offer.poolPct / 100) * (capitalUsd / offer.targetUsd));
}

/** "0.75 %" in the reader's locale. */
export function pct(fraction: number, locale = "en-US"): string {
  const p = fraction * 100;
  return `${p.toLocaleString(locale, { maximumFractionDigits: p < 1 ? 3 : 2 })} %`;
}

export interface Investor {
  id: string; user_id: string; name: string; email: string; company: string; country: string;
  pledge_usd: number; capital_usd: number; method: string; status: InvestorStatus; lang: string;
  message: string; note: string; created_at: string; verified_at: string; verified_by: string; returned_at: string;
}
export interface Payout { id: string; investor_id: string; period: string; amount_usd: number; reference: string; paid_at: string; created_by: string }
export interface StatementMonth { period: string; revenueUsd: number; dueUsd: number; paidUsd: number }
export interface Statement { share: number; months: StatementMonth[]; totalRevenueUsd: number; totalDueUsd: number; totalPaidUsd: number; balanceUsd: number }

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Month by month, from the day the capital was verified (to the day it was
 * returned, if it has been): AXTO revenue, the stake's share of it, and what
 * has been paid. Pure — the tests drive it directly.
 */
export function buildStatement(
  investor: Pick<Investor, "capital_usd" | "verified_at" | "returned_at">,
  offer: Pick<InvestOffer, "poolPct" | "targetUsd">,
  revenue: { at: string; amountUsd: number }[],
  payouts: Pick<Payout, "period" | "amount_usd">[],
): Statement {
  const share = shareOf(investor.capital_usd, offer);
  const from = investor.verified_at || "";
  const until = investor.returned_at || "9999";
  const byMonth = new Map<string, StatementMonth>();
  const month = (period: string) => {
    let m = byMonth.get(period);
    if (!m) byMonth.set(period, (m = { period, revenueUsd: 0, dueUsd: 0, paidUsd: 0 }));
    return m;
  };
  if (from) for (const tx of revenue) if (tx.at >= from && tx.at < until) month(tx.at.slice(0, 7)).revenueUsd += tx.amountUsd;
  for (const p of payouts) month(p.period).paidUsd += Number(p.amount_usd);
  const months = [...byMonth.values()]
    .map((m) => ({ ...m, revenueUsd: cents(m.revenueUsd), dueUsd: cents(m.revenueUsd * share), paidUsd: cents(m.paidUsd) }))
    .sort((a, b) => a.period.localeCompare(b.period));
  const sum = (k: keyof StatementMonth) => cents(months.reduce((s, m) => s + (m[k] as number), 0));
  const totalDueUsd = sum("dueUsd"), totalPaidUsd = sum("paidUsd");
  return { share, months, totalRevenueUsd: sum("revenueUsd"), totalDueUsd, totalPaidUsd, balanceUsd: cents(totalDueUsd - totalPaidUsd) };
}
