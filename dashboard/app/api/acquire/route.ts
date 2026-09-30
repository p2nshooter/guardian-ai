/* AXTO — GET /api/acquire · the public state of the site sale: price, whether it
 * is open, and the payment methods a buyer can use right now. Bank accounts and
 * the WhatsApp number are only returned inside a started checkout. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { activeGateways } from "@/lib/billing/gateways";
import { getSale, PAYPAL_TYPICAL_MAX_USD } from "@/lib/acquisition";

export async function GET(req: NextRequest) {
  const db = getDB(req);
  const [sale, active] = await Promise.all([getSale(db), activeGateways(db)]);
  const live = new Map(active.map((g) => [g.id, g]));
  type Method = { id: string; label: string; methods: string; test: boolean; limit?: number };
  const gateways = sale.gateways.flatMap((id): Method[] => {
    if (id === "manual") return [{ id, label: "Bank wire (BNI, SWIFT BNINIDJA)", methods: "USD or IDR wire to the owner's BNI account", test: false }];
    const g = live.get(id);
    if (!g) return [];
    return [{ id, label: g.label, methods: g.methods, test: g.mode === "sandbox", limit: id === "paypal" && sale.priceUsd > PAYPAL_TYPICAL_MAX_USD ? PAYPAL_TYPICAL_MAX_USD : undefined }];
  });
  return NextResponse.json({ status: sale.status, priceUsd: sale.priceUsd, gateways, soldAt: sale.status === "sold" ? sale.soldTo?.paidAt || "" : "" },
    { headers: { "Cache-Control": "no-store" } });
}
