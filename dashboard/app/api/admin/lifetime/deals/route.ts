/* AXTO — /api/admin/lifetime/deals (admin only) · Friday deals and offer rules.
 *   GET → current settings, defaults and today's / the next deal
 *   PUT {enabled, fridayPct, lastFridayPct, tz, offersEnabled, minOfferPct, offerValidDays} */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbRun, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { DEAL_DEFAULTS, MAX_DEAL_PCT, dealState, getDealConfig, mergeDealConfig, validTz } from "@/lib/lifetime-deals";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const cfg = await getDealConfig(getDB(req));
  return respond({ cfg, defaults: DEAL_DEFAULTS, maxPct: MAX_DEAL_PCT, deal: dealState(new Date(), cfg) }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  if (!b || typeof b !== "object") return fail("Send the settings.");
  if (b.tz !== undefined && !validTz(b.tz)) return fail("Unknown time zone — use an IANA name such as Asia/Jakarta.");
  for (const k of ["fridayPct", "lastFridayPct"] as const) {
    if (b[k] !== undefined && !(Number(b[k]) >= 0 && Number(b[k]) <= MAX_DEAL_PCT)) return fail(`Discounts must be 0–${MAX_DEAL_PCT} %.`);
  }
  if (b.minOfferPct !== undefined && !(Number(b.minOfferPct) >= 1 && Number(b.minOfferPct) <= 100)) return fail("The minimum offer must be 1–100 % of the list price.");
  if (b.offerValidDays !== undefined && !(Number(b.offerValidDays) >= 1 && Number(b.offerValidDays) <= 60)) return fail("An agreed price can be reserved for 1–60 days.");
  const db = getDB(req);
  const cfg = mergeDealConfig({ ...(await getDealConfig(db)), ...b });
  await dbRun(db, `INSERT INTO platform_config (key, value, updated_at) VALUES ('lifetime_deals', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [JSON.stringify(cfg), now()]);
  await audit(db, ctx.session, "admin.lifetime.deals", "platform_config", "lifetime_deals", { ...cfg }, req);
  return respond({ ok: true, cfg, deal: dealState(new Date(), cfg) }, ctx);
}
