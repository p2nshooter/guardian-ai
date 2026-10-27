/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * LICENCE AUCTION — the rules (docs/BLUEPRINT-V4.md §26.5, owner 26 Oct 2026,
 * and §27.4, owner 27 Oct 2026): EVERY package is auctioned every 2 weeks, the
 * next auction starting the moment one ends, always ending on a Friday at
 * 07:00 WIB (Asia/Jakarta, UTC+7 — 00:00 UTC); one lot per package; bidding
 * opens at 25 % of the normal price and every bid raises it by exactly 10 % of
 * that opening bid (§27.5); a bid in the last 5 minutes extends the lot by 5
 * minutes; only verified members bid; the winner pays through the normal
 * checkout and the licence is issued only then — an unpaid winner stays the
 * winner, shown as "not paid yet" (no automatic hand-over unless the admin
 * switches it on); a bank transfer needs the payment screenshot and an
 * administrator's approval. The winner chooses the
 * name shown with the win (filtered for abuse and other people's brands).
 *
 * Pure (no storage) so the pages, the API and the tests share one rule book;
 * lib/auction.ts adds the R2 storage.
 * ============================================================================ */

import { EDITIONS } from "./editions";

export const AUCTION_KEY = "auction_settings";

const DAY = 86_400_000;
/** The first auction ends on Friday 6 November 2026 at 07:00 WIB (= 00:00 UTC); every other one 14 days after the last. */
export const AUCTION_ANCHOR_MS = Date.UTC(2026, 10, 6, 0, 0, 0);
export const CYCLE_MS = 14 * DAY;
/** The time zone the owner reads the end in: "jumat jam 7 pagi" = Friday 07:00 Western Indonesia Time. */
export const AUCTION_TZ = "Asia/Jakarta";
export const AUCTION_TZ_LABEL = "WIB";
/**
 * In the last day of an auction, new lots join the NEXT one: they are opened
 * ahead and start the moment this one ends, so a new auction always begins at
 * once ("langsung sesi baru").
 */
export const LATE_ADD_MS = DAY;

/** The device tiers lifetime licences are sold in (lib/lifetime.ts LIFETIME_TIERS — a test keeps the two equal). */
export const LIFETIME_DEVICE_TIERS = [1, 5, 10, 25, 50, 100];
/**
 * Every package sold (owner, 27 Oct 2026: "lelang seluruh paket"): each edition
 * of each app for one year, each app's lifetime licence in every device tier,
 * and the suite in every device tier — 103 lots per auction.
 */
export const ALL_PACKAGES: string[] = [
  ...EDITIONS.map((e) => `edition:${e.code}:yearly`),
  ...Array.from(new Set(EDITIONS.map((e) => e.app))).flatMap((app) => LIFETIME_DEVICE_TIERS.map((d) => `lifetime:app:${app}:${d}`)),
  ...LIFETIME_DEVICE_TIERS.map((d) => `lifetime:suite:${d}`),
];

export type LotKind = "edition" | "lifetime";
export type LotStatus = "open" | "awaiting_payment" | "sold" | "unsold" | "cancelled";

export interface AuctionSettings {
  enabled: boolean;
  /** Package keys on auction every cycle (see packageKey). */
  packages: string[];
  openPct: number;        // opening bid, % of the normal price
  stepPct: number;        // every bid's raise, % of the OPENING bid (owner: "kenaikan 10% dari harga awal")
  snipeMinutes: number;   // a bid this close to the end extends the lot by as much
  payHours: number;       // the time the winner is asked to pay in
  /** Hand an unpaid win to the next bidder after payHours. Off by default (owner, 27 Oct 2026: keep the winner, "belum membayar"). */
  autoPass: boolean;
  updatedAt?: string;
}

/** Owner's terms: every package, opening at 25 %, each bid +10 % of the opening bid, 5-minute anti-snipe, asked to pay in 48 hours, no automatic hand-over. */
export const AUCTION_DEFAULTS: AuctionSettings = {
  enabled: true,
  packages: [...ALL_PACKAGES],
  openPct: 25, stepPct: 10, snipeMinutes: 5, payHours: 48, autoPass: false,
};

const num = (v: unknown) => Number(String(v ?? "").replace(/[^\d.]/g, ""));
const within = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = num(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n * 100) / 100 : fallback;
};

/** "edition:<code>:<yearly|monthly>" · "lifetime:app:<product>:<devices>" · "lifetime:suite:<devices>". */
export const PACKAGE_RE = /^(edition:[a-z0-9_]{2,40}:(yearly|monthly)|lifetime:app:[a-z0-9_-]{2,30}:\d{1,3}|lifetime:suite:\d{1,3})$/;

export function sanitizeAuction(v: any, base: AuctionSettings = AUCTION_DEFAULTS): AuctionSettings {
  if (!v || typeof v !== "object") return { ...base, packages: [...base.packages] };
  const packages = Array.isArray(v.packages)
    ? Array.from(new Set(v.packages.map(String).filter((p: string) => PACKAGE_RE.test(p)))).slice(0, 300) as string[]
    : [...base.packages];
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : base.enabled,
    packages,
    openPct: within(v.openPct, 1, 100, base.openPct),
    stepPct: within(v.stepPct, 0.1, 100, base.stepPct),
    snipeMinutes: within(v.snipeMinutes, 0, 60, base.snipeMinutes),
    payHours: within(v.payHours, 1, 24 * 14, base.payHours),
    autoPass: typeof v.autoPass === "boolean" ? v.autoPass : base.autoPass,
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt.slice(0, 40) : base.updatedAt,
  };
}

/** The end of the auction running at `t` (ms): the first Friday-07:00-WIB grid point strictly after it. */
export function cycleEndAfter(t: number): number {
  return AUCTION_ANCHOR_MS + (Math.floor((t - AUCTION_ANCHOR_MS) / CYCLE_MS) + 1) * CYCLE_MS;
}
export const cycleStartOf = (end: number) => end - CYCLE_MS;
/** "2026-11-06" — the id of an auction cycle (its last day). */
export const cycleId = (end: number) => new Date(end).toISOString().slice(0, 10);

/** Opening bid (a share of the normal price) and the raise of every bid (a share of the opening bid), in whole dollars, never below $1. */
export function openingBid(normalUsd: number, s: Pick<AuctionSettings, "openPct">): number {
  return Math.max(1, Math.ceil((normalUsd * s.openPct) / 100));
}
export function bidStep(openUsd: number, s: Pick<AuctionSettings, "stepPct">): number {
  return Math.max(1, Math.ceil((openUsd * s.stepPct) / 100));
}

export interface LotState {
  status: LotStatus | string; starts_at: string; ends_at: string; normal_usd: number; open_usd: number; step_usd: number;
  bids_count: number; high_usd: number; high_user: string;
}

/** The next bid: the opening bid, then the high bid plus one step — the last step stops at the normal price. */
export const nextMinimum = (l: Pick<LotState, "bids_count" | "high_usd" | "open_usd" | "step_usd" | "normal_usd">) =>
  l.bids_count > 0 ? Math.min(l.high_usd + l.step_usd, l.normal_usd) : l.open_usd;

export type BidProblem = "closed" | "not_started" | "ended" | "too_low" | "too_high" | "not_next" | "already_highest" | "bad_amount";

/**
 * Why a bid cannot be placed (null = it can). Every bid is exactly the next price (owner: each bid +10 % of the
 * opening bid), in whole dollars, never above the normal price; a bid that lost a race to another is "not_next".
 */
export function bidProblem(l: LotState, amount: number, userId: string, nowMs: number): BidProblem | null {
  if (l.status !== "open") return "closed";
  if (nowMs < Date.parse(l.starts_at)) return "not_started";
  if (nowMs >= Date.parse(l.ends_at)) return "ended";
  if (!Number.isInteger(amount) || amount < 1) return "bad_amount";
  if (l.bids_count > 0 && l.high_user === userId) return "already_highest";
  if (l.bids_count > 0 && l.high_usd >= l.normal_usd) return "too_high";
  if (amount > l.normal_usd) return "too_high";
  const next = nextMinimum(l);
  if (amount < next) return l.bids_count > 0 && amount > l.high_usd ? "not_next" : "too_low";
  if (amount > next) return "not_next";
  return null;
}

/** Anti-snipe: a bid this close to the end moves the end to `snipeMinutes` after the bid. */
export function extendedEnd(endsAt: string, nowMs: number, snipeMinutes: number): string {
  const end = Date.parse(endsAt);
  const guard = snipeMinutes * 60_000;
  return guard > 0 && end - nowMs < guard ? new Date(nowMs + guard).toISOString() : endsAt;
}

/* ---- the name a winner shows -------------------------------------------- */

/** Words never shown on axto.io (several languages; whole words, case- and accent-insensitive, "l33t" undone). */
const ABUSE = [
  "fuck", "fucking", "fucker", "motherfucker", "shit", "bitch", "bastard", "asshole", "cock", "cunt", "pussy", "whore", "slut", "nigger", "nigga", "faggot", "retard", "porn", "sex", "nazi", "hitler",
  "anjing", "bangsat", "babi", "kontol", "memek", "ngentot", "goblok", "tolol", "bajingan", "jancok", "jancuk", "pepek", "lonte", "pelacur", "asu", "pukimak",
  "scheisse", "arschloch", "fotze", "hure", "wichser", "merde", "putain", "salope", "connard", "encule", "cazzo", "stronzo", "puttana", "vaffanculo",
  "puta", "mierda", "pendejo", "cabron",
];
/** Spelled-together forms still caught inside one word ("bigshitcompany"); long enough not to hit real names. */
const ABUSE_INSIDE = ["fuck", "motherfucker", "asshole", "nigger", "faggot", "kontol", "ngentot", "bajingan", "vaffanculo", "arschloch", "pukimak"];

/** Other people's brands a winner may not show as their own name (whole words). */
const BRANDS = [
  "google", "alphabet", "youtube", "microsoft", "azure", "apple", "iphone", "amazon", "aws", "meta", "facebook", "instagram", "whatsapp", "openai", "chatgpt",
  "anthropic", "tesla", "spacex", "samsung", "nvidia", "intel", "amd", "ibm", "oracle", "salesforce", "adobe", "netflix", "tiktok", "bytedance", "twitter",
  "paypal", "stripe", "visa", "mastercard", "cloudflare", "github", "gitlab", "linkedin", "uber", "airbnb", "alibaba", "tencent", "baidu", "huawei", "xiaomi", "sony",
  "toyota", "honda", "coca cola", "cocacola", "pepsi", "nike", "adidas", "disney", "gojek", "tokopedia", "shopee", "telkomsel", "pertamina", "bni", "bca", "bank mandiri",
  "crowdstrike", "palo alto networks", "fortinet", "kaspersky", "norton", "mcafee", "vanta", "drata", "axto", "xaa",
];
/** Distinctive brands also caught inside one word ("GoogleSolutions"). */
const BRANDS_INSIDE = ["google", "youtube", "microsoft", "facebook", "instagram", "whatsapp", "openai", "chatgpt", "samsung", "nvidia", "salesforce", "netflix", "tiktok",
  "bytedance", "paypal", "cloudflare", "github", "linkedin", "alibaba", "tencent", "huawei", "xiaomi", "cocacola", "tokopedia", "telkomsel", "pertamina", "crowdstrike", "kaspersky", "mastercard"];

const fold = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase();
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };
const unleet = (s: string) => s.replace(/[013457@$]/g, (c) => LEET[c] ?? c);

export type NameProblem = "length" | "chars" | "contact" | "abuse" | "brand";

/** Tidy a display name: single spaces, no control characters, at most 48 characters. */
export const cleanDisplayName = (s: unknown) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 48);

/** Why a display name cannot be shown (null = it can). */
export function displayNameProblem(raw: unknown): NameProblem | null {
  const name = cleanDisplayName(raw);
  if (name.length < 2) return "length";
  if (/@|https?:|www\.|\.(com|net|org|io|id|co|es|de|xyz)\b/i.test(name) || /\d{5,}/.test(name.replace(/\s/g, ""))) return "contact";
  if (!/\p{L}/u.test(name) || !/^[\p{L}\p{M}\p{N} .,&'’()\-]+$/u.test(name)) return "chars";
  const plain = fold(name).split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(unleet);
  const joined = plain.join("");
  if (plain.some((w) => ABUSE.includes(w)) || ABUSE_INSIDE.some((w) => joined.includes(w))) return "abuse";
  const spaced = ` ${plain.join(" ")} `;
  if (BRANDS.some((b) => spaced.includes(` ${b} `)) || BRANDS_INSIDE.some((b) => joined.includes(b))) return "brand";
  return null;
}

/** A bidder in a public list: first letter and the length hint only ("A••••• (3)"). */
export const maskName = (name: string) => {
  const n = cleanDisplayName(name);
  return n ? `${[...n][0]}${"•".repeat(Math.min(5, Math.max(2, n.length - 1)))}` : "—";
};
