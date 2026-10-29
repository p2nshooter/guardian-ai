/* AXTO — GET /api/acquire · the public state of the site sale: whether it is
 * open, how it is sold (auction or fixed price), the payment methods a buyer can
 * use right now and — in an auction — the running round: opening bid, high bid,
 * next minimum, deadline and the latest bids with masked names (lib/sale-auction).
 * A signed-in member also gets their own side (registration, best bid, leading,
 * won). Bank accounts and the WhatsApp number are only returned inside a started
 * checkout. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { loadSession } from "@/lib/auth";
import { activeGateways } from "@/lib/billing/gateways";
import { getSale, PAYPAL_TYPICAL_MAX_USD } from "@/lib/acquisition";
import { latestRound, myAuction, publicRound, roundBids } from "@/lib/sale-auction";

export async function GET(req: NextRequest) {
  const db = getData(req);
  const [sale, active] = await Promise.all([getSale(db), activeGateways(db)]);
  const auction = sale.mode === "auction";
  const round = auction ? await latestRound(db) : null;
  const ctx = auction ? await loadSession(req).catch(() => null) : null;
  const [bids, me] = await Promise.all([
    round ? roundBids(db, round.id, 10) : Promise.resolve([]),
    ctx ? myAuction(db, ctx.session, round) : Promise.resolve(null),
  ]);
  // The amount a payment method must carry: the winning bid in an auction, the asking price otherwise.
  const amount = auction ? (round?.winner_usd || round?.high_usd || round?.open_usd || 0) : sale.priceUsd;
  const live = new Map(active.map((g) => [g.id, g]));
  type Method = { id: string; label: string; methods: string; test: boolean; limit?: number };
  const gateways = sale.gateways.flatMap((id): Method[] => {
    if (id === "manual") return [{ id, label: "Bank wire (BNI, SWIFT BNINIDJA)", methods: "USD or IDR wire to the owner's BNI account", test: false }];
    const g = live.get(id);
    if (!g) return [];
    return [{ id, label: g.label, methods: g.methods, test: g.mode === "sandbox", limit: id === "paypal" && amount > PAYPAL_TYPICAL_MAX_USD ? PAYPAL_TYPICAL_MAX_USD : undefined }];
  });
  return NextResponse.json({
    status: sale.status, mode: sale.mode, priceUsd: sale.priceUsd, gateways, soldAt: sale.status === "sold" ? sale.soldTo?.paidAt || "" : "",
    auction: auction ? { approval: sale.auction.approval, round: round ? publicRound(round, bids, sale.auction) : null, me } : null,
  }, { headers: { "Cache-Control": "no-store" } });
}
