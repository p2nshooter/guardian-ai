/* AXTO — GET /api/billing/options · public: plan + lifetime prices, active payment methods, IDR and EUR rates. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, getEnv } from "@/lib/db";
import { getPlanPrices, PLANS, PLAN_ORDER } from "@/lib/plans";
import { activeGateways, usdEurRate, usdIdrRate } from "@/lib/billing/gateways";
import { getLifetimePrices, LIFETIME_GATEWAYS, CARD_MAX_USD, PAYPAL_MAX_USD, LIFETIME_BY_ADMIN, LIFETIME_DEAL } from "@/lib/lifetime";

export async function GET(req: NextRequest) {
  const db = getData(req);
  const kv = getEnv(req).KV;
  const [prices, gateways, rate, eur, lifetime] = await Promise.all([getPlanPrices(db), activeGateways(db, { fresh: true }), usdIdrRate(db, kv), usdEurRate(db, kv), getLifetimePrices(db)]);
  return NextResponse.json({
    plans: PLAN_ORDER.map((id) => ({ id, name: PLANS[id].name, monthly: prices[id].monthly, yearly: prices[id].yearly })),
    // test = the method runs on the provider's sandbox: no real money (shown as TEST MODE at checkout).
    gateways: gateways.map((g) => ({ id: g.id, label: g.label, methods: g.methods, currency: g.currency, test: g.mode === "sandbox" })),
    usdIdr: rate,
    usdEur: eur,
    lifetime: { tiers: lifetime, gateways: LIFETIME_GATEWAYS, cardMaxUsd: CARD_MAX_USD, paypalMaxUsd: PAYPAL_MAX_USD, byAdmin: LIFETIME_BY_ADMIN, contact: LIFETIME_DEAL },
  }, { headers: { "Cache-Control": "no-store" } });   // admin changes to methods and prices apply at once
}
