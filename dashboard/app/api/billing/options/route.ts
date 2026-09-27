/* AXTO — GET /api/billing/options · public: plan prices, active payment methods, IDR rate. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getEnv } from "@/lib/db";
import { getPlanPrices, PLANS, PLAN_ORDER } from "@/lib/plans";
import { activeGateways, usdIdrRate } from "@/lib/billing/gateways";

export async function GET(req: NextRequest) {
  const db = getDB(req);
  const [prices, gateways, rate] = await Promise.all([getPlanPrices(db), activeGateways(db), usdIdrRate(db, getEnv(req).KV)]);
  return NextResponse.json({
    plans: PLAN_ORDER.map((id) => ({ id, name: PLANS[id].name, monthly: prices[id].monthly, yearly: prices[id].yearly })),
    gateways: gateways.map((g) => ({ id: g.id, label: g.label, methods: g.methods, currency: g.currency })),
    usdIdr: rate,
  }, { headers: { "Cache-Control": "public, max-age=300" } });
}
