/* AXTO — GET /api/editions (public): the editions of the 10 self-hosted apps
 * with the live (admin-editable) prices, and the trial programme with the real
 * number of trial licences left per app. No personal data; cached for a minute. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { EDITIONS, getEditionPrices } from "@/lib/editions";
import { getTrialConfig, trialOpen, trialStats, trialEdition, ensureTrialPool } from "@/lib/trials";
import { SELF_HOSTED } from "@/lib/selfhosted";

export async function GET(req: NextRequest) {
  const db = getDB(req);
  const cfg = await getTrialConfig(db);
  if (cfg.enabled) await ensureTrialPool(db, cfg);
  const [prices, stats] = await Promise.all([getEditionPrices(db), trialStats(db)]);
  const editions = EDITIONS.map((e) => {
    const p = prices.find((x) => x.code === e.code)!;
    return { app: e.app, tier: e.tier, code: e.code, name: e.name, yearly: p.yearly, monthly: p.monthly, enabled: p.enabled, limits: e.limits, features: e.features };
  }).filter((e) => e.enabled);
  const open = trialOpen(cfg);
  return NextResponse.json({
    editions,
    trials: {
      open, days: cfg.days, maxProducts: cfg.maxProducts,
      apps: Object.fromEntries(SELF_HOSTED.map((p) => [p.slug, { total: stats[p.slug].total, available: open ? stats[p.slug].available : 0, edition: trialEdition(p.slug)?.name || "" }])),
    },
  }, { headers: { "Cache-Control": "public, max-age=60" } });
}
