/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Lifetime licence pricing beyond the list price (docs/AXTO-APPS-BLUEPRINT.md §15):
 *
 *   • Friday deals — every Friday (00:00–23:59 in the owner's time zone) the
 *     list price drops by `fridayPct` (default 30 %); on the LAST Friday of the
 *     month by `lastFridayPct` (default 50 %). Computed on the server; the
 *     browser only displays it.
 *   • Customer offers — a signed-in member proposes a price; the admin accepts,
 *     counters or declines it by hand. Offers below `minOfferPct` of the list
 *     price are refused at once.
 *
 * One rule: the customer pays the LOWEST valid price when the order is created —
 * the deal of the day or the agreed offer, never both stacked. The struck-through
 * list price is real: it is what the licence costs on every other day.
 * Pure functions (no I/O) except getDealConfig.
 * ============================================================================ */

export interface DealConfig {
  enabled: boolean;        // Friday deals on/off
  fridayPct: number;       // every Friday
  lastFridayPct: number;   // the last Friday of the month
  tz: string;              // IANA zone the day is counted in
  offersEnabled: boolean;  // members may propose a price
  minOfferPct: number;     // offers below this % of the list price are refused at once
  offerValidDays: number;  // an accepted / countered price can be paid for this many days
}

export const DEAL_DEFAULTS: DealConfig = {
  enabled: true, fridayPct: 30, lastFridayPct: 50, tz: "Asia/Jakarta",
  offersEnabled: true, minOfferPct: 40, offerValidDays: 7,
};

/** Highest discount the admin can set — a licence is never given away by a typo. */
export const MAX_DEAL_PCT = 90;

export type DealKind = "friday" | "lastFriday";
export interface DealDay {
  kind: DealKind;
  pct: number;
  date: string;      // local date in the deal's time zone, YYYY-MM-DD
  startsAt: string;  // ISO UTC instant of local 00:00
  endsAt: string;    // ISO UTC instant of the next local 00:00
}
export interface DealState { tz: string; now: string; active: DealDay | null; next: DealDay | null }

export function validTz(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

const int = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : dflt;
};

/** Merge the admin override (platform_config.lifetime_deals) over the defaults, clamping junk. */
export function mergeDealConfig(json: string | null | undefined | Partial<DealConfig>): DealConfig {
  let o: any = {};
  if (typeof json === "string") { try { o = JSON.parse(json) || {}; } catch { o = {}; } }
  else if (json && typeof json === "object") o = json;
  const d = DEAL_DEFAULTS;
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : d.enabled,
    fridayPct: int(o.fridayPct, 0, MAX_DEAL_PCT, d.fridayPct),
    lastFridayPct: int(o.lastFridayPct, 0, MAX_DEAL_PCT, d.lastFridayPct),
    tz: validTz(o.tz) ? o.tz : d.tz,
    offersEnabled: typeof o.offersEnabled === "boolean" ? o.offersEnabled : d.offersEnabled,
    minOfferPct: int(o.minOfferPct, 1, 100, d.minOfferPct),
    offerValidDays: int(o.offerValidDays, 1, 60, d.offerValidDays),
  };
}

export async function getDealConfig(db: any): Promise<DealConfig> {
  try {
    const row = await db.prepare(`SELECT value FROM platform_config WHERE key = 'lifetime_deals'`).first();
    return mergeDealConfig(row?.value);
  } catch {
    return mergeDealConfig(null);
  }
}

/* ---------- calendar in a time zone ---------- */

interface Local { y: number; m: number; d: number; wd: number; offsetMs: number }
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const fmtCache = new Map<string, Intl.DateTimeFormat>();

function localParts(t: number, tz: string): Local {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    fmtCache.set(tz, f);
  }
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(t))) p[x.type] = x.value;
  const y = Number(p.year), m = Number(p.month), d = Number(p.day);
  const wall = Date.UTC(y, m - 1, d, Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return { y, m, d, wd: WD[p.weekday] ?? 0, offsetMs: wall - Math.floor(t / 1000) * 1000 };
}

/** UTC instant of local 00:00 on y-m-d in `tz` (handles DST by re-checking the offset once). */
function localMidnight(y: number, m: number, d: number, tz: string): number {
  const base = Date.UTC(y, m - 1, d);
  const first = base - localParts(base, tz).offsetMs;
  return base - localParts(first, tz).offsetMs;
}

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** Friday whose next Friday falls in another month. */
export const isLastFriday = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 5 && d + 7 > daysInMonth(y, m);

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function dealOn(y: number, m: number, d: number, cfg: DealConfig): DealDay | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCDay() !== 5) return null;
  const Y = date.getUTCFullYear(), M = date.getUTCMonth() + 1, D = date.getUTCDate();
  const kind: DealKind = isLastFriday(Y, M, D) ? "lastFriday" : "friday";
  const pct = kind === "lastFriday" ? cfg.lastFridayPct : cfg.fridayPct;
  if (pct <= 0) return null;
  const start = localMidnight(Y, M, D, cfg.tz);
  const end = localMidnight(Y, M, D + 1, cfg.tz);
  return { kind, pct, date: iso(Y, M, D), startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() };
}

/** Today's deal (if any) and the next one, in the configured time zone. */
export function dealState(now: Date | number, cfg: DealConfig): DealState {
  const t = typeof now === "number" ? now : now.getTime();
  const out: DealState = { tz: cfg.tz, now: new Date(t).toISOString(), active: null, next: null };
  if (!cfg.enabled || (cfg.fridayPct <= 0 && cfg.lastFridayPct <= 0)) return out;
  const L = localParts(t, cfg.tz);
  out.active = dealOn(L.y, L.m, L.d, cfg);
  // The next deal day after today: walk Friday by Friday (a 0 % kind is skipped).
  const toFri = ((5 - L.wd + 7) % 7) || 7;
  for (let k = toFri; k <= toFri + 7 * 6 && !out.next; k += 7) out.next = dealOn(L.y, L.m, L.d + k, cfg);
  return out;
}

/* ---------- prices ---------- */

/** List price minus `pct` %, in whole dollars. */
export const discounted = (amount: number, pct: number) => Math.max(1, Math.round((amount * (100 - pct)) / 100));

export type PriceSource = "list" | "deal" | "offer";
export interface BestPrice { amount: number; listUsd: number; source: PriceSource; pct: number; deal: DealDay | null }

/** The lowest valid price: today's deal or the agreed offer — never stacked. */
export function bestPrice(listUsd: number, deal: DealDay | null, agreedUsd?: number | null): BestPrice {
  let best: BestPrice = { amount: listUsd, listUsd, source: "list", pct: 0, deal: null };
  if (deal && deal.pct > 0) {
    const a = discounted(listUsd, deal.pct);
    if (a < best.amount) best = { amount: a, listUsd, source: "deal", pct: deal.pct, deal };
  }
  if (agreedUsd && agreedUsd > 0 && agreedUsd < best.amount) {
    best = { amount: Math.round(agreedUsd), listUsd, source: "offer", pct: Math.round((1 - agreedUsd / listUsd) * 100), deal: null };
  }
  return best;
}

/** The lowest offer that reaches the admin (anything below is refused at once). */
export const offerFloor = (listUsd: number, cfg: DealConfig) => Math.ceil((listUsd * cfg.minOfferPct) / 100);
