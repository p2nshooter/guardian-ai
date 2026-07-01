/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAllLivePrices } from "@/lib/pricing";

/**
 * GET /api/packages
 *
 * Public endpoint — no auth required. Returns a map of package code → current
 * live price (annual USD) and priceMonthly. Used by landing page and register
 * page to show prices that the admin may have updated without a code deploy.
 *
 * Response shape:
 *   {
 *     prices: {
 *       [code: string]: {
 *         price: number; priceMonthly: number; source: "db"|"static";
 *         promo?: { label, endsAt, originalPrice, originalPriceMonthly }
 *       }
 *     }
 *   }
 *
 * Cache: no-store (prices must be live, not stale from edge cache)
 */
export async function GET(req: NextRequest) {
  try {
    const livePrices = await getAllLivePrices(req);

    // Build a clean public response (no internal fields)
    const prices: Record<string, { price: number; priceMonthly: number; source: string; promo?: any }> = {};
    for (const [code, lp] of Object.entries(livePrices) as [string, any][]) {
      prices[code] = {
        price: lp.price,
        priceMonthly: lp.priceMonthly,
        source: lp.source,
        ...(lp.promo ? { promo: lp.promo } : {}),
      };
    }

    return NextResponse.json(
      { prices },
      {
        headers: {
          "Cache-Control": "no-store, must-revalidate",
          "CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    // If anything goes wrong, return empty — UI falls back to static prices
    return NextResponse.json(
      { prices: {}, error: "pricing_unavailable" },
      {
        status: 200, // intentionally 200 so UI doesn't fail hard
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
