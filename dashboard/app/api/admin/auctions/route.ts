/* AXTO — /api/admin/auctions · Admin → Auctions (§26.5)
 *   GET [?cycle=]  → settings, the package catalogue, one auction's lots (the running one
 *                    by default), every win awaiting payment, recent winners and totals
 *   GET ?lot=<id>  → that lot with all its bids (names and e-mails)
 *   PUT {settings} → on/off, the packages auctioned every cycle, opening %, raise %,
 *                    anti-snipe minutes, hours to pay; opens the running auction's new lots
 *   POST {action}  → open {pkg} · cancel {lot, note} · pass {lot} (to the next bidder now) ·
 *                    tick (close ended lots and pass unpaid wins now)
 * Every change is in the audit log. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond, forbidden } from "@/lib/auth";
import { readJson, fail, audit, str } from "@/lib/http";
import {
  AUCTION_DEFAULTS, CYCLE_MS, cycleEndAfter, cycleId, auctionTick, bidsOf, cancelLot, ensureCycleLots, getAuctionSettings, openLotNow, passNow, sanitizeAuction, saveAuctionSettings,
} from "@/lib/auction";
import { packageCatalog } from "@/lib/auction-packages";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const db = getData(req);
  const q = req.nextUrl.searchParams;
  const lotId = q.get("lot");
  if (lotId) {
    const lot = await db.auctionLots.get(lotId);
    if (!lot) return fail("Lot not found.", 404);
    return respond({ lot, bids: await bidsOf(db, lotId) }, ctx);
  }
  // One auction at a time (103 lots each), from the index summaries; the running one by default.
  const now = Date.now();
  const running = cycleId(cycleEndAfter(now));
  const cycles = [cycleId(cycleEndAfter(cycleEndAfter(now))), ...Array.from({ length: 12 }, (_, i) => cycleId(cycleEndAfter(now) - i * CYCLE_MS))];
  const cycle = /^\d{4}-\d{2}-\d{2}$/.test(q.get("cycle") || "") ? q.get("cycle")! : running;
  const [settings, inCycle, awaiting, sold] = await Promise.all([
    getAuctionSettings(db),
    db.auctionLots.listAll("cycle", cycle, 2000),
    db.auctionLots.listAll("status", "awaiting_payment", 2000),
    db.auctionLots.list("won", "all", { limit: 50 }),
  ]);
  const row = (e: { id: string; meta: Record<string, any> }) => ({ id: e.id, ...e.meta });
  const lots = inCycle.map(row);
  const count = (st: string) => lots.filter((l: any) => l.status === st).length;
  const winners = sold.entries.map(row);
  return respond({
    settings, defaults: AUCTION_DEFAULTS, catalog: packageCatalog(), cycle, running, cycles, lots, awaiting: awaiting.map(row), winners,
    totals: {
      lots: lots.length, open: count("open"), awaiting: count("awaiting_payment"), sold: count("sold"), unsold: count("unsold"), cancelled: count("cancelled"),
      soldUsd: lots.filter((l: any) => l.status === "sold").reduce((n: number, l: any) => n + (l.winner_usd || 0), 0),
      normalUsd: lots.filter((l: any) => l.status === "sold").reduce((n: number, l: any) => n + (l.normal_usd || 0), 0),
      bids: lots.reduce((n: number, l: any) => n + (l.bids_count || 0), 0),
    },
  }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const db = getData(req);
  const b = await readJson(req);
  if (!b?.settings) return fail("Nothing to save.");
  const before = await getAuctionSettings(db);
  const next = sanitizeAuction(b.settings, before);
  await saveAuctionSettings(db, next);
  await audit(db, ctx.session, "admin.auction_settings", "platform_config", "auction_settings", {
    enabled: next.enabled, packages: next.packages.length, openPct: next.openPct, stepPct: next.stepPct, snipeMinutes: next.snipeMinutes, payHours: next.payHours,
  }, req);
  const opened = await ensureCycleLots(db, Date.now(), ctx.session.email).catch(() => null);
  return respond({ ok: true, settings: next, opened }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const db = getData(req);
  const b = await readJson(req);
  switch (b?.action) {
    case "open": {
      const r = await openLotNow(db, str(b?.pkg, 80), ctx.session.email);
      if ("error" in r) return fail(r.error);
      await audit(db, ctx.session, "admin.auction.open", "auction_lot", r.id, { pkg: r.pkg, normalUsd: r.normal_usd }, req);
      return respond({ ok: true, lot: r }, ctx);
    }
    case "cancel": {
      const r = await cancelLot(db, str(b?.lot, 120), str(b?.note, 500), ctx.session);
      if ("error" in r) return fail(r.error);
      return respond({ ok: true, lot: r }, ctx);
    }
    case "pass": {
      const r = await passNow(db, str(b?.lot, 120), ctx.session);
      if (!r) return fail("Only a lot awaiting payment can be passed on.");
      return respond({ ok: true, lot: r }, ctx);
    }
    case "tick":
      return respond({ ok: true, ...(await auctionTick(db)) }, ctx);
    default:
      return fail("Unknown action.");
  }
}
