/* AXTO — GET /api/programs · the partner programmes a visitor may know about
 * (docs/BUSINESS-MASTER-BLUEPRINT.md §3): only the ones shown, only their public
 * terms. A hidden programme is simply absent — 200, because the footer asks on
 * every public page. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { anyShown, getPrograms, publicPrograms } from "@/lib/programs";
import { PLANS, getPlanPrices } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const db = getData(req);
  const [p, prices] = await Promise.all([getPrograms(db), getPlanPrices(db).catch(() => null)]);
  // The list prices feed the worked examples: Pro (monthly) on the reseller page, Business (yearly) on the white-label page.
  return NextResponse.json({
    any: anyShown(p), programs: publicPrograms(p), proMonthlyUsd: prices?.pro.monthly ?? PLANS.pro.monthly, businessYearlyUsd: prices?.business.yearly ?? PLANS.business.yearly,
  }, { headers: { "Cache-Control": "no-store" } });
}
