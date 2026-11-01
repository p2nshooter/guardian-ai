/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * SITE-SALE AUCTION — the rules (docs/BLUEPRINT-V4.md §34; owner, 28 Oct 2026,
 * REQUESTS 120: "ubah bentuk penjualannya seperti lelang"; REQUESTS 125 added a
 * weekly ladder; 1 Nov 2026, REQUESTS 132: "start penawaran di $500k … penawaran
 * mulai $500k").
 *
 *   opening bid  US$500,000, the same for everyone. Flat by default; the admin may
 *                add a weekly rise, counted from day one (00:00 WIB) through every
 *                round, so the price never starts over
 *   bids         every bid at least the opening bid of the moment; after the first,
 *                also at least the high bid plus one step; jump bids allowed;
 *                never against yourself
 *   anti-snipe   a bid in the last N minutes moves the end to N minutes after it
 *   no reserve   the highest valid bid at the deadline wins
 *
 * Pure (no storage) so the pages, the API and the tests share one rule book;
 * lib/sale-auction.ts adds the R2 storage.
 * ============================================================================ */

/** The owner's floor (REQUESTS 132): offers start at US$500,000 and the admin cannot set less. */
export const OPEN_MIN_USD = 500_000;
export const OPEN_MAX_USD = 100_000_000;
/** A sanity ceiling on any one bid (a typo with three extra zeros is refused, not recorded). */
export const MAX_BID_USD = 5_000_000_000;
const WEEK = 7 * 86_400_000;
/** Day one of the ladder starts at 00:00 in Jakarta (WIB, UTC+7), where the owner is. */
const WIB_MS = 7 * 3_600_000;

export interface SaleAuctionSettings {
  /** The opening bid on day one of the ladder. */
  startUsd: number;
  /** Added to the opening bid at the end of every full week. */
  weeklyUsd: number;
  /** Day one of the ladder (YYYY-MM-DD, from 00:00 WIB). */
  from: string;
  /** The smallest raise over the high bid. */
  stepUsd: number;
  /** Length of a round. */
  days: number;
  snipeMinutes: number;
  /** The time the winner has to pay. */
  payDays: number;
  /** A round that ends without a bid is followed at once by a new one. */
  autoRestart: boolean;
  /** The owner approves each bidder before they can bid. */
  approval: boolean;
}

export const SALE_AUCTION_DEFAULTS: SaleAuctionSettings = {
  startUsd: 500_000, weeklyUsd: 0, from: "2026-11-01", stepUsd: 25_000, days: 14, snipeMinutes: 10, payDays: 7, autoRestart: true, approval: true,
};

/**
 * The revision of the owner's price. Settings stored before it (US$10M + US$100k a week, REQUESTS 125) are read with
 * the price of this revision — opening bid, weekly rise, day one, step and the fixed price — until the admin saves again.
 */
export const SALE_PRICE_REV = 2;
export const SALE_PRICE_FIELDS = ["startUsd", "weeklyUsd", "from", "stepUsd"] as const;

const num = (v: unknown) => Number(String(v ?? "").replace(/[^\d.]/g, ""));
const within = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = num(v);
  return v !== undefined && v !== null && v !== "" && Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n) : fallback;
};

export function sanitizeSaleAuction(v: any, base: SaleAuctionSettings = SALE_AUCTION_DEFAULTS): SaleAuctionSettings {
  if (!v || typeof v !== "object") return { ...base };
  const bool = (x: unknown, d: boolean) => (typeof x === "boolean" ? x : d);
  const day = (x: unknown, d: string) => (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(`${x}T00:00:00Z`)) ? x : d);
  return {
    startUsd: within(v.startUsd, OPEN_MIN_USD, OPEN_MAX_USD, base.startUsd),
    weeklyUsd: within(v.weeklyUsd, 0, 10_000_000, base.weeklyUsd),
    from: day(v.from, base.from),
    stepUsd: within(v.stepUsd, 1_000, 10_000_000, base.stepUsd),
    days: within(v.days, 1, 90, base.days),
    snipeMinutes: within(v.snipeMinutes, 0, 120, base.snipeMinutes),
    payDays: within(v.payDays, 1, 60, base.payDays),
    autoRestart: bool(v.autoRestart, base.autoRestart),
    approval: bool(v.approval, base.approval),
  };
}

type Ladder = Pick<SaleAuctionSettings, "startUsd" | "weeklyUsd" | "from">;
/** 00:00 WIB on day one of the ladder. */
export const ladderStart = (s: Pick<Ladder, "from">) => Date.parse(`${s.from}T00:00:00Z`) - WIB_MS;
const weeksIn = (s: Ladder, nowMs: number) => Math.max(0, Math.floor((nowMs - ladderStart(s)) / WEEK));
/** The opening bid at a moment: the start plus one weekly rise for every full week since day one. */
export const ladderPrice = (s: Ladder, nowMs = Date.now()) => s.startUsd + s.weeklyUsd * weeksIn(s, nowMs);
/** When the opening bid next rises ("" when it does not). */
export const nextRiseAt = (s: Ladder, nowMs = Date.now()) =>
  s.weeklyUsd > 0 ? new Date(ladderStart(s) + (weeksIn(s, nowMs) + 1) * WEEK).toISOString() : "";

export interface RoundState {
  status: string; starts_at: string; ends_at: string; open_usd: number; step_usd: number; bids_count: number; high_usd: number; high_user: string;
}

/** The lowest bid accepted now: the opening bid of the moment (`floorUsd`, the ladder), and after the first bid also the high bid plus a step. */
export const nextMinBid = (r: Pick<RoundState, "bids_count" | "high_usd" | "step_usd">, floorUsd: number) =>
  Math.max(floorUsd, r.bids_count > 0 ? r.high_usd + r.step_usd : 0);

export type SaleBidProblem = "closed" | "not_started" | "ended" | "bad_amount" | "too_low" | "too_high" | "already_highest";

/** Why a bid cannot be placed (null = it can). Decided again on every compare-and-swap attempt. */
export function saleBidProblem(r: RoundState, amount: number, userId: string, nowMs: number, floorUsd: number): SaleBidProblem | null {
  if (r.status !== "open") return "closed";
  if (nowMs < Date.parse(r.starts_at)) return "not_started";
  if (nowMs >= Date.parse(r.ends_at)) return "ended";
  if (!Number.isInteger(amount) || amount < 1) return "bad_amount";
  if (r.bids_count > 0 && r.high_user === userId) return "already_highest";
  if (amount > MAX_BID_USD) return "too_high";
  if (amount < nextMinBid(r, floorUsd)) return "too_low";
  return null;
}

/** The whole-dollar amount a bidder typed ("12,500,000", "$12.5M" is not accepted — digits only). */
export const parseBid = (v: unknown) => {
  const s = String(v ?? "").replace(/[\s,$_]/g, "");
  return /^\d{1,13}$/.test(s) ? Number(s) : NaN;
};

export { extendedEnd, maskName, displayNameProblem, cleanDisplayName, type NameProblem } from "./auction-terms";
