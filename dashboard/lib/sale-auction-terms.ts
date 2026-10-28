/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * SITE-SALE AUCTION — the rules (docs/BLUEPRINT-V4.md §34; owner, 28 Oct 2026,
 * REQUESTS 120: "minimal penawaran range random dari $10jt-$100jt, ubah bentuk
 * penjualannya seperti lelang").
 *
 *   opening bid  drawn at random between US$10 million and US$100 million (to the
 *                nearest US$100,000) when a round opens, or set by the admin in
 *                that range; stored on the round, so every visitor sees the same
 *   bids         the first at least the opening bid, every later one at least the
 *                high bid plus one step; jump bids allowed; never against yourself
 *   anti-snipe   a bid in the last N minutes moves the end to N minutes after it
 *   no reserve   the highest valid bid at the deadline wins
 *
 * Pure (no storage) so the pages, the API and the tests share one rule book;
 * lib/sale-auction.ts adds the R2 storage.
 * ============================================================================ */

export const OPEN_MIN_USD = 10_000_000;
export const OPEN_MAX_USD = 100_000_000;
export const OPEN_ROUND_TO = 100_000;
/** A sanity ceiling on any one bid (a typo with three extra zeros is refused, not recorded). */
export const MAX_BID_USD = 5_000_000_000;

export interface SaleAuctionSettings {
  /** The admin's opening bid (used when `randomOpen` is off). */
  openUsd: number;
  /** Draw a new random opening bid between US$10M and US$100M for every round. */
  randomOpen: boolean;
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
  openUsd: 0, randomOpen: true, stepUsd: 250_000, days: 14, snipeMinutes: 10, payDays: 7, autoRestart: true, approval: true,
};

const num = (v: unknown) => Number(String(v ?? "").replace(/[^\d.]/g, ""));
const within = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = num(v);
  return v !== undefined && v !== null && v !== "" && Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n) : fallback;
};

export function sanitizeSaleAuction(v: any, base: SaleAuctionSettings = SALE_AUCTION_DEFAULTS): SaleAuctionSettings {
  if (!v || typeof v !== "object") return { ...base };
  const bool = (x: unknown, d: boolean) => (typeof x === "boolean" ? x : d);
  const open = num(v.openUsd);
  return {
    openUsd: v.openUsd === 0 || v.openUsd === "0" ? 0 : Number.isFinite(open) && open >= OPEN_MIN_USD && open <= OPEN_MAX_USD ? roundOpen(open) : base.openUsd,
    randomOpen: bool(v.randomOpen, base.randomOpen),
    stepUsd: within(v.stepUsd, 1_000, 10_000_000, base.stepUsd),
    days: within(v.days, 1, 90, base.days),
    snipeMinutes: within(v.snipeMinutes, 0, 120, base.snipeMinutes),
    payDays: within(v.payDays, 1, 60, base.payDays),
    autoRestart: bool(v.autoRestart, base.autoRestart),
    approval: bool(v.approval, base.approval),
  };
}

const roundOpen = (n: number) => Math.min(OPEN_MAX_USD, Math.max(OPEN_MIN_USD, Math.round(n / OPEN_ROUND_TO) * OPEN_ROUND_TO));
/** A random opening bid in the owner's range, to the nearest US$100,000. */
export const randomOpening = (rand: () => number = Math.random) => roundOpen(OPEN_MIN_USD + rand() * (OPEN_MAX_USD - OPEN_MIN_USD));
/** The opening bid of a new round: drawn, or the admin's own figure. */
export const openingFor = (s: SaleAuctionSettings, rand: () => number = Math.random) =>
  s.randomOpen || !s.openUsd ? randomOpening(rand) : roundOpen(s.openUsd);

export interface RoundState {
  status: string; starts_at: string; ends_at: string; open_usd: number; step_usd: number; bids_count: number; high_usd: number; high_user: string;
}

/** The lowest bid that is accepted now. */
export const nextMinBid = (r: Pick<RoundState, "bids_count" | "high_usd" | "open_usd" | "step_usd">) =>
  r.bids_count > 0 ? r.high_usd + r.step_usd : r.open_usd;

export type SaleBidProblem = "closed" | "not_started" | "ended" | "bad_amount" | "too_low" | "too_high" | "already_highest";

/** Why a bid cannot be placed (null = it can). Decided again on every compare-and-swap attempt. */
export function saleBidProblem(r: RoundState, amount: number, userId: string, nowMs: number): SaleBidProblem | null {
  if (r.status !== "open") return "closed";
  if (nowMs < Date.parse(r.starts_at)) return "not_started";
  if (nowMs >= Date.parse(r.ends_at)) return "ended";
  if (!Number.isInteger(amount) || amount < 1) return "bad_amount";
  if (r.bids_count > 0 && r.high_user === userId) return "already_highest";
  if (amount > MAX_BID_USD) return "too_high";
  if (amount < nextMinBid(r)) return "too_low";
  return null;
}

/** The whole-dollar amount a bidder typed ("12,500,000", "$12.5M" is not accepted — digits only). */
export const parseBid = (v: unknown) => {
  const s = String(v ?? "").replace(/[\s,$_]/g, "");
  return /^\d{1,13}$/.test(s) ? Number(s) : NaN;
};

export { extendedEnd, maskName, displayNameProblem, cleanDisplayName, type NameProblem } from "./auction-terms";
