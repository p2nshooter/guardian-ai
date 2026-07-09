/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
/**
 * GET /api/fx-rates
 * Live exchange rates (USD base) — fetched from open.er-api.com,
 * cached 1 h in Cloudflare KV, falls back to safe static rates.
 *
 * Response: { ok, base, rates, updated_at }
 */
import { NextRequest, NextResponse } from "next/server";
import { getAllRates, FALLBACK_RATES } from "@/lib/fx";


export async function GET(req: NextRequest) {
  try {
    const rates = await getAllRates(req);
    return NextResponse.json(
      { ok: true, base: "USD", rates, updated_at: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { ok: true, base: "USD", rates: FALLBACK_RATES, source: "fallback", updated_at: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
