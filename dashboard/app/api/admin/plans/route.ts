/* AXTO — /api/admin/plans (admin only) · view defaults and override plan prices. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbRun, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { getPlanPrices, defaultPrices, PLANS, PLAN_ORDER, mergePrices } from "@/lib/plans";
import { readJson, fail, audit } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const prices = await getPlanPrices(getDB(req));
  return respond({ plans: PLAN_ORDER.map((id) => ({ ...PLANS[id], price: prices[id], defaultPrice: defaultPrices()[id] })) }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  if (!b?.prices || typeof b.prices !== "object") return fail("Send prices.");
  for (const id of PLAN_ORDER) {
    const p = b.prices[id];
    if (!p || !(Number(p.monthly) > 0) || !(Number(p.yearly) > 0)) return fail(`Enter valid prices for ${PLANS[id].name}.`);
  }
  const clean = mergePrices(JSON.stringify(b.prices));
  const db = getDB(req);
  await dbRun(db, `INSERT INTO platform_config (key, value, updated_at) VALUES ('plan_prices', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [JSON.stringify(clean), now()]);
  await audit(db, ctx.session, "admin.plans.prices", "platform_config", "plan_prices", clean, req);
  return respond({ ok: true, prices: clean }, ctx);
}
