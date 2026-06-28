/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO — Live FX Rate Module (Edge-compatible)
 *
 * Primary source : open.er-api.com (free, no API key, updates every 24h)
 * Cache          : Cloudflare KV — key "fx:rates", TTL 3 600 s (1 h)
 * Fallback       : conservative static rates compiled at build time
 *
 * Usage (server-side route handler):
 *   const rate = await getRate("IDR", req);         // how many IDR per 1 USD
 *   const idr  = await usdToLocal(49.00, "IDR", req);   // → e.g. 799 000
 *   const usd  = await localToUsd(799000, "IDR", req);  // → 49.x
 */

import { NextRequest } from "next/server";

// ── Supported currency codes ──────────────────────────────────────────────
export type FxCurrency = string; // accept any currency code

// ── Conservative fallback rates (USD base, updated 2025-Q1) ──────────────
// These are ONLY used when both KV and the live API are unreachable.
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  IDR: 15_900,   // intentionally slightly high → client pays a bit more, not less
  SGD: 1.34,
  MYR: 4.72,
  EUR: 0.93,
  GBP: 0.79,
  AED: 3.67,
  CNY: 7.26,
  JPY: 151,
  AUD: 1.54,
  THB: 35.1,
  PHP: 57.2,
  INR: 83.4,
  KRW: 1_345,
  BRL: 5.02,
  CAD: 1.36,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.92,
  HKD: 7.82,
  TWD: 32.1,
  VND: 25_400,
  PKR: 280,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  EGP: 49.5,
  MXN: 17.2,
  ARS: 870,
  ZAR: 18.5,
  NGN: 1_580,
  RUB: 92.5,
  TRY: 32.5,
  NZD: 1.64,
};

const KV_KEY     = "fx:rates";
const KV_TTL_SEC = 3_600; // refresh KV every hour
const API_URL    = "https://open.er-api.com/v6/latest/USD";
const API_TIMEOUT_MS = 4_000;

// ── KV helpers (graceful — no-op if KV binding missing) ──────────────────
function getKV(req?: NextRequest): any | null {
  // Try @cloudflare/next-on-pages context
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getRequestContext } = require("@cloudflare/next-on-pages");
    const ctx = getRequestContext();
    if (ctx?.env?.KV) return ctx.env.KV;
  } catch { /* ignore */ }

  // Try process.env binding (nodejs_compat_populate_process_env)
  try {
    const pe = process as any;
    if (pe.env?.KV) return pe.env.KV;
  } catch { /* ignore */ }

  // Try globalThis
  try {
    const g = globalThis as any;
    if (g.__cloudflare_request_context__?.env?.KV) return g.__cloudflare_request_context__.env.KV;
  } catch { /* ignore */ }

  // Try request symbols
  if (req) {
    try {
      const r = req as any;
      if (r.__env__?.KV) return r.__env__.KV;
      for (const sym of Object.getOwnPropertySymbols(r)) {
        const v = r[sym];
        if (v?.KV) return v.KV;
      }
    } catch { /* ignore */ }
  }
  return null;
}

async function kvGet(kv: any, key: string): Promise<string | null> {
  try { return await kv.get(key); } catch { return null; }
}

async function kvPut(kv: any, key: string, value: string, ttl: number): Promise<void> {
  try { await kv.put(key, value, { expirationTtl: ttl }); } catch { /* ignore */ }
}

// ── Fetch live rates from open.er-api.com ────────────────────────────────
async function fetchLiveRates(): Promise<Record<string, number> | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json() as any;
    // open.er-api.com returns { result: "success", rates: { IDR: 15912, ... } }
    if (json.result !== "success" || !json.rates) return null;
    return json.rates as Record<string, number>;
  } catch {
    return null;
  }
}

// ── In-memory process-level cache (sub-second for repeat calls in same isolate) ──
let _memCache: { rates: Record<string, number>; at: number } | null = null;
const MEM_TTL_MS = 60_000; // 60 s

// ── Main: get all rates (USD base) ───────────────────────────────────────
export async function getAllRates(req?: NextRequest): Promise<Record<string, number>> {

  // 1. Memory cache (fastest)
  if (_memCache && Date.now() - _memCache.at < MEM_TTL_MS) {
    return _mergeWithFallback(_memCache.rates);
  }

  // 2. KV cache
  const kv = getKV(req);
  if (kv) {
    const cached = await kvGet(kv, KV_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Record<string, number>;
        _memCache = { rates: parsed, at: Date.now() };
        return _mergeWithFallback(parsed);
      } catch { /* corrupt — fall through */ }
    }
  }

  // 3. Live API
  const live = await fetchLiveRates();
  if (live) {
    _memCache = { rates: live, at: Date.now() };
    if (kv) await kvPut(kv, KV_KEY, JSON.stringify(live), KV_TTL_SEC);
    return _mergeWithFallback(live);
  }

  // 4. Fallback
  return { ...FALLBACK_RATES };
}

function _mergeWithFallback(raw: Record<string, number>): Record<string, number> {
  const result = { ...FALLBACK_RATES };
  for (const code of Object.keys(FALLBACK_RATES)) {
    if (raw[code] && raw[code] > 0) result[code] = raw[code];
  }
  // Also include any extra currencies from live API not in fallback
  for (const [code, rate] of Object.entries(raw)) {
    if (rate > 0 && !result[code]) result[code] = rate;
  }
  return result;
}

// ── Convenience helpers ────────────────────────────────────────────────────

/**
 * Returns how many units of `currency` equal 1 USD.
 * e.g. getRate("IDR") → 15912
 */
export async function getRate(
  currency: FxCurrency | string,
  req?: NextRequest
): Promise<number> {
  if (currency === "USD") return 1;
  const rates = await getAllRates(req);
  return (rates as any)[currency] ?? FALLBACK_RATES[currency as FxCurrency] ?? 1;
}

/**
 * Convert USD → local currency amount (rounded).
 * e.g. usdToLocal(49, "IDR") → 779188
 */
export async function usdToLocal(
  usdAmount: number,
  currency: FxCurrency | string,
  req?: NextRequest
): Promise<number> {
  const rate = await getRate(currency, req);
  return Math.round(usdAmount * rate);
}

/**
 * Convert local currency → USD (rounded to 2 dp).
 * e.g. localToUsd(779188, "IDR") → 49.00
 */
export async function localToUsd(
  localAmount: number,
  currency: FxCurrency | string,
  req?: NextRequest
): Promise<number> {
  if (currency === "USD") return Math.round(localAmount * 100) / 100;
  const rate = await getRate(currency, req);
  if (rate <= 0) return 0;
  return Math.round((localAmount / rate) * 100) / 100;
}

/**
 * Format a USD price as local currency string.
 * e.g. formatLocal(49, "IDR") → "Rp779rb"
 */
export async function formatLocal(
  usdPrice: number,
  currency: FxCurrency | string,
  req?: NextRequest
): Promise<string> {
  const SYMBOLS: Record<string, string> = {
    IDR:"Rp", USD:"$", SGD:"S$", MYR:"RM", EUR:"€",
    GBP:"£", AED:"د.إ", CNY:"¥", JPY:"¥", AUD:"A$",
    THB:"฿", PHP:"₱", INR:"₹", KRW:"₩", BRL:"R$",
    CAD:"C$", CHF:"Fr", SEK:"kr", NOK:"kr", DKK:"kr",
    HKD:"HK$", TWD:"NT$", VND:"₫", PKR:"₨", SAR:"﷼",
    QAR:"﷼", KWD:"د.ك", EGP:"E£", MXN:"$", ARS:"$",
    ZAR:"R", NGN:"₦", RUB:"₽", TRY:"₺", NZD:"NZ$",
  };
  const val  = await usdToLocal(usdPrice, currency, req);
  const sym  = SYMBOLS[currency] ?? currency + " ";
  if (currency === "IDR") {
    if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(1)}jt`;
    if (val >= 1_000)     return `${sym}${(val / 1_000).toFixed(0)}rb`;
  }
  if (["JPY","KRW","IDR"].includes(currency)) return `${sym}${val.toLocaleString()}`;
  return `${sym}${(val / 100 * 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
