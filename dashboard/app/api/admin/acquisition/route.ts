/* AXTO — /api/admin/acquisition · Admin → Site sale
 *   GET → settings + every acquisition order + the auction: the running round with
 *         its bids (e-mails and companies — admins only), recent rounds, bidders
 *   PUT {settings} → status (open / paused / sold), auction or fixed price, the
 *       auction settings (opening bid or random in US$10M–100M, step, length,
 *       anti-snipe, payment window, restart, bidder approval), asking price,
 *       automatic admin grant, payment methods, WhatsApp, BNI receiving accounts
 *   POST {action} → start_round {openUsd?} · cancel_round {id, note} · pass_round {id}
 *       · approve_bidder / reject_bidder {id} */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { readMeta } from "@/lib/data/meta";
import { requireAdmin, respond, forbidden } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { getSale, saveSale, sanitizeSale, SALE_DEFAULTS, SALE_GATEWAYS } from "@/lib/acquisition";
import { activeGateways } from "@/lib/billing/gateways";
import {
  OPEN_MAX_USD, OPEN_MIN_USD, cancelRound, decideBidder, latestRound, nextMinBid, passRound, roundBids, startRound,
} from "@/lib/sale-auction";

async function auctionView(req: NextRequest) {
  const db = getData(req);
  const round = await latestRound(db);
  const [bids, rounds, pending, approved, rejected] = await Promise.all([
    round ? roundBids(db, round.id, 200) : Promise.resolve([]),
    db.saleRounds.list("all", "all", { limit: 12 }).then((p) => p.entries.map((e) => ({ id: e.id, ...e.meta }))),
    db.saleBidders.list("status", "pending", { limit: 200 }).then((p) => p.entries),
    db.saleBidders.list("status", "approved", { limit: 200 }).then((p) => p.entries),
    db.saleBidders.list("status", "rejected", { limit: 50 }).then((p) => p.entries),
  ]);
  const bidder = (status: string) => (e: { id: string; meta: Record<string, unknown> }) => ({ id: e.id, status, ...e.meta });
  return {
    range: { min: OPEN_MIN_USD, max: OPEN_MAX_USD },
    round: round ? { ...round, next_min_usd: nextMinBid(round) } : null,
    bids: bids.map((b) => ({ id: b.id, seq: b.seq, name: b.display_name, email: b.email, company: b.company, amountUsd: b.amount_usd, at: b.created_at })),
    rounds,
    bidders: [...pending.map(bidder("pending")), ...approved.map(bidder("approved")), ...rejected.map(bidder("rejected"))],
  };
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const db = getData(req);
  const [settings, orders, active, auction] = await Promise.all([
    getSale(db),
    db.orders.listDocs("plan", "acquisition", { limit: 200 }).then((p) => p.docs),
    activeGateways(db),
    auctionView(req),
  ]);
  return respond({
    settings, defaults: SALE_DEFAULTS, gateways: SALE_GATEWAYS,
    live: Object.fromEntries(active.map((g) => [g.id, g.mode])),
    auction,
    orders: orders.map((o) => {
      const m = readMeta(o.meta);
      return { id: o.id, email: o.email, amountUsd: o.amount_usd, amountIdr: o.amount_local, gateway: o.gateway, status: o.status, invoiceNo: o.invoice_no, createdAt: o.created_at, paidAt: o.paid_at,
               env: m.env === "sandbox" ? "sandbox" : "live", buyer: m.buyer || {}, proof: m.bank_proof || m.crypto?.proof || null, round: m.saleRound || "" };
    }),
  }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const db = getData(req);
  const b = await readJson(req);
  if (!b?.settings) return fail("Nothing to save.");
  const current = await getSale(db);
  const open = Number(b.settings?.auction?.openUsd || 0);
  if (open && (open < OPEN_MIN_USD || open > OPEN_MAX_USD)) return fail("The opening bid must be between US$10,000,000 and US$100,000,000.");
  const next = sanitizeSale({ ...b.settings, soldTo: b.settings.status === "sold" ? current.soldTo : undefined }, current);
  if (!next.gateways.length) return fail("Offer at least one payment method.");
  if (!next.auction.randomOpen && !next.auction.openUsd) return fail("Set the opening bid, or let it be drawn at random.");
  await saveSale(db, next);
  await audit(db, ctx.session, "admin.site_sale", "platform_config", "site_sale", { status: next.status, mode: next.mode, auction: next.auction, priceUsd: next.priceUsd, autoGrantAdmin: next.autoGrantAdmin, gateways: next.gateways }, req);
  return respond({ ok: true, settings: next, auction: await auctionView(req) }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const db = getData(req);
  const b = await readJson(req);
  const action = String(b?.action || "");
  const id = String(b?.id || "");
  let out: unknown;
  if (action === "start_round") {
    const sale = await getSale(db);
    if (sale.mode !== "auction") return fail("Switch the sale to auction first.");
    if (sale.status !== "open") return fail("Open the sale first (status: open).");
    const open = Number(b?.openUsd || 0);
    if (open && (open < OPEN_MIN_USD || open > OPEN_MAX_USD)) return fail("The opening bid must be between US$10,000,000 and US$100,000,000.");
    out = await startRound(db, sale, ctx.session, Date.now(), { openUsd: open || undefined });
    if (!out) return fail("A round is already running or awaiting the winner's payment — cancel or finish it first.");
  } else if (action === "cancel_round") {
    out = await cancelRound(db, id, String(b?.note || ""), ctx.session);
  } else if (action === "pass_round") {
    out = await passRound(db, id, ctx.session);
  } else if (action === "approve_bidder" || action === "reject_bidder") {
    out = await decideBidder(db, id, action === "approve_bidder", ctx.session);
  } else {
    return fail("Unknown action.");
  }
  if (out && typeof out === "object" && "error" in out) return fail(String((out as { error: string }).error));
  return respond({ ok: true, auction: await auctionView(req) }, ctx);
}
