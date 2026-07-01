/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * lib/pricing.ts — Live DB-first price lookup
 *
 * Architecture:
 *   1. Runtime pricing is stored in license_packages.price_usd / price_monthly (D1)
 *   2. Admin can update it via /api/admin/pricing without a code deploy
 *   3. lib/stripe.ts PACKAGE_INFO is the FALLBACK ONLY — used when DB is
 *      unavailable (cold start, migration not yet applied, etc.)
 *   4. Public /api/packages endpoint merges live DB prices over static
 *      descriptive data so landing page + register page always show current prices
 *   5. Checkout uses getLivePrice() which queries DB first, falls back to
 *      PACKAGE_INFO[code].price so checkout is never broken even without DB
 *
 * This file is intentionally import-safe for edge runtime — no Node.js APIs.
 */

import { getDB, dbFirst, dbQuery } from "@/lib/db";
import { PACKAGE_INFO } from "@/lib/stripe";
import { NextRequest } from "next/server";

export interface LivePrice {
  code: string;
  price: number;        // annual USD
  priceMonthly: number; // monthly USD
  source: "db" | "static";
  promo?: { label: string; endsAt: string; originalPrice: number; originalPriceMonthly: number };
}

interface PromoRow {
  package_code: string;
  label: string;
  promo_price: number;
  promo_price_monthly: number;
  ends_at: string;
}

/**
 * Fetch all currently-active promo rows (enabled + within [starts_at, ends_at])
 * in one query. Best-effort — returns {} if the DB/table is unavailable so
 * pricing never breaks because a promo lookup failed.
 */
async function getActivePromos(req: NextRequest): Promise<Record<string, PromoRow>> {
  const out: Record<string, PromoRow> = {};
  try {
    const db = getDB(req);
    const rows = await dbQuery<PromoRow>(
      db,
      `SELECT package_code, label, promo_price, promo_price_monthly, ends_at
       FROM promo_pricing
       WHERE enabled = 1 AND datetime('now') >= datetime(starts_at) AND datetime('now') <= datetime(ends_at)`
    );
    for (const r of rows) out[r.package_code] = r;
  } catch {
    // table missing or DB unavailable — no promos active
  }
  return out;
}

/** Apply an active promo row on top of a resolved base price, if one exists. */
function applyPromo(base: LivePrice, promo: PromoRow | undefined): LivePrice {
  if (!promo || promo.promo_price <= 0) return base;
  return {
    ...base,
    price: promo.promo_price,
    priceMonthly: promo.promo_price_monthly > 0 ? promo.promo_price_monthly : base.priceMonthly,
    promo: {
      label: promo.label,
      endsAt: promo.ends_at,
      originalPrice: base.price,
      originalPriceMonthly: base.priceMonthly,
    },
  };
}

// ── Lifetime (perpetual) pricing ────────────────────────────────────────────
// Business rule: Lifetime = 10× the annual price. Sales may negotiate down to a
// floor of 5× annual (handled by manual admin issuance, never below this), so a
// perpetual license is always worth at least five years of subscription.
export const LIFETIME_MULTIPLIER = 10;
export const LIFETIME_MIN_MULTIPLIER = 5;

/** Standard lifetime price for an annual price (10× annual). */
export function lifetimePrice(annual: number): number {
  return Math.round(annual * LIFETIME_MULTIPLIER);
}

/** Clamp a negotiated lifetime price to the allowed floor (>= 5× annual). */
export function clampLifetimePrice(annual: number, proposed: number): number {
  return Math.max(Math.round(annual * LIFETIME_MIN_MULTIPLIER), Math.round(proposed));
}

export interface LivePackageRow {
  code: string;
  price_usd: number;
  price_monthly: number;
  for_sale: number;
  name?: string;
  product?: string;
}

/**
 * Get live price for a single package code.
 * Falls back to PACKAGE_INFO[code].price if DB is unavailable or returns 0.
 */
export async function getLivePrice(
  req: NextRequest,
  code: string
): Promise<LivePrice> {
  const staticPkg = (PACKAGE_INFO as any)[code];
  const staticPrice: number = staticPkg?.price ?? 0;
  const staticMonthly: number = staticPkg?.priceMonthly ?? 0;

  try {
    const db = getDB(req);
    const row = await dbFirst<{ price_usd: number; price_monthly: number }>(
      db,
      `SELECT price_usd, price_monthly FROM license_packages WHERE code = ? AND is_active = 1 LIMIT 1`,
      [code]
    );
    if (row && row.price_usd > 0) {
      const base: LivePrice = {
        code,
        price: row.price_usd,
        priceMonthly: row.price_monthly > 0 ? row.price_monthly : Math.round(row.price_usd / 10),
        source: "db",
      };
      const promos = await getActivePromos(req);
      return applyPromo(base, promos[code]);
    }
  } catch {
    // DB unavailable — use static fallback silently
  }

  const base: LivePrice = { code, price: staticPrice, priceMonthly: staticMonthly, source: "static" };
  const promos = await getActivePromos(req);
  return applyPromo(base, promos[code]);
}

/**
 * Get live prices for ALL packages in one query (used by /api/packages and
 * the admin pricing panel). Returns a map of code → LivePrice.
 */
export async function getAllLivePrices(
  req: NextRequest
): Promise<Record<string, LivePrice>> {
  // Seed from static first so every known code has an entry
  const result: Record<string, LivePrice> = {};
  for (const [code, pkg] of Object.entries(PACKAGE_INFO as Record<string, any>)) {
    result[code] = {
      code,
      price: pkg.price ?? 0,
      priceMonthly: pkg.priceMonthly ?? 0,
      source: "static",
    };
  }

  try {
    const db = getDB(req);
    const rows = await dbQuery<LivePackageRow>(
      db,
      `SELECT code, price_usd, price_monthly FROM license_packages WHERE is_active = 1 AND price_usd > 0`
    );
    for (const row of rows) {
      if (result[row.code] !== undefined || row.price_usd > 0) {
        result[row.code] = {
          code: row.code,
          price: row.price_usd,
          priceMonthly: row.price_monthly > 0 ? row.price_monthly : Math.round(row.price_usd / 10),
          source: "db",
        };
      }
    }
  } catch {
    // DB unavailable — all entries stay as "static"
  }

  const promos = await getActivePromos(req);
  for (const [code, promo] of Object.entries(promos)) {
    if (result[code]) result[code] = applyPromo(result[code], promo);
  }

  return result;
}

/**
 * Get all packages with their live prices, for_sale flag, and static metadata.
 * This is what the admin pricing panel and /api/packages endpoint use.
 */
export async function getAllPackagesWithLivePrices(req: NextRequest): Promise<{
  code: string;
  name: string;
  product: string;
  tier?: string;
  isBundle?: boolean;
  forSale: boolean;
  price: number;
  priceMonthly: number;
  staticPrice: number;
  staticPriceMonthly: number;
  source: "db" | "static";
  promo?: { label: string; endsAt: string; originalPrice: number; originalPriceMonthly: number };
}[]> {
  const pkgInfo = PACKAGE_INFO as Record<string, any>;

  // Build the base list from static PACKAGE_INFO
  const packages = Object.entries(pkgInfo).map(([code, pkg]) => ({
    code,
    name: pkg.name ?? code,
    product: pkg.product ?? "unknown",
    tier: pkg.tier,
    isBundle: pkg.isBundle ?? false,
    forSale: pkg.forSale !== false,
    price: pkg.price ?? 0,
    priceMonthly: pkg.priceMonthly ?? 0,
    staticPrice: pkg.price ?? 0,
    staticPriceMonthly: pkg.priceMonthly ?? 0,
    source: "static" as "static" | "db",
  }));

  try {
    const db = getDB(req);
    const rows = await dbQuery<LivePackageRow>(
      db,
      `SELECT code, price_usd, price_monthly, for_sale FROM license_packages WHERE is_active = 1`
    );

    const byCode: Record<string, LivePackageRow> = {};
    for (const r of rows) byCode[r.code] = r;

    for (const pkg of packages) {
      const row = byCode[pkg.code];
      if (row) {
        if (row.price_usd > 0) {
          pkg.price = row.price_usd;
          pkg.priceMonthly = row.price_monthly > 0 ? row.price_monthly : Math.round(row.price_usd / 10);
          pkg.source = "db";
        }
        pkg.forSale = row.for_sale === 1;
      }
    }
  } catch {
    // DB unavailable — return static data
  }

  const promos = await getActivePromos(req);
  for (const pkg of packages) {
    const promo = promos[pkg.code];
    if (!promo || promo.promo_price <= 0) continue;
    (pkg as any).promo = {
      label: promo.label,
      endsAt: promo.ends_at,
      originalPrice: pkg.price,
      originalPriceMonthly: pkg.priceMonthly,
    };
    pkg.price = promo.promo_price;
    pkg.priceMonthly = promo.promo_price_monthly > 0 ? promo.promo_price_monthly : pkg.priceMonthly;
  }

  return packages;
}
