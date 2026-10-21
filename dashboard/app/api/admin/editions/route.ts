/* AXTO — Admin → Plans → Editions
 *   GET  /api/admin/editions                 every edition with default and live price, on/off, licences sold
 *   PUT  /api/admin/editions {prices:[{code, yearly, monthly, enabled}]}   save (audited) */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { EDITIONS, getEditionPrices, mergeEditionPrices } from "@/lib/editions";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getData(req);
  const [prices, licences] = await Promise.all([
    getEditionPrices(db),
    db.shLicenses.listAll("all", "all"),
  ]);
  const sold = new Map<string, number>();
  for (const { meta: m } of licences) if (m.source === "edition" && m.status === "active") sold.set(String(m.package_code), (sold.get(String(m.package_code)) || 0) + 1);
  return respond({
    editions: EDITIONS.map((e) => {
      const p = prices.find((x) => x.code === e.code)!;
      return { app: e.app, tier: e.tier, code: e.code, name: e.name, defaultYearly: e.yearly, defaultMonthly: e.monthly, yearly: p.yearly, monthly: p.monthly, enabled: p.enabled, limits: e.limits, active: sold.get(e.code) || 0 };
    }),
  }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  if (!Array.isArray(b?.prices)) return fail("Send the price list.");
  for (const p of b.prices) {
    if (!EDITIONS.some((e) => e.code === p?.code)) return fail(`Unknown edition ${String(p?.code).slice(0, 40)}.`);
    if (!(Number(p.yearly) > 0) || !(Number(p.monthly) > 0)) return fail("Prices must be greater than zero.");
  }
  const clean = mergeEditionPrices(JSON.stringify(b.prices));
  const db = getData(req);
  await db.config.set("edition_prices", JSON.stringify(clean));
  await audit(db, ctx.session, "admin.editions.prices", "platform_config", "edition_prices", { changed: b.prices.length }, req);
  return respond({ ok: true, prices: clean }, ctx);
}
