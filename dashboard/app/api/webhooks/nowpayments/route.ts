/* AXTO — POST /api/webhooks/nowpayments · IPN "finished" → activate plan. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbRun } from "@/lib/db";
import { gatewayCreds } from "@/lib/billing/gateways";
import { nowpaymentsVerify } from "@/lib/billing/providers";
import { markOrderPaid, isFinal } from "@/lib/billing/activate";

export async function POST(req: NextRequest) {
  const b: any = await req.json().catch(() => null);
  const db = getDB(req);
  const creds = await gatewayCreds(db, "nowpayments");
  if (!b || !creds || !(await nowpaymentsVerify(b, req.headers.get("x-nowpayments-sig"), creds))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  if (b.payment_status === "finished" && b.order_id) {
    // price_amount is the USD invoice amount; actually_paid is in crypto, so trust the gateway's
    // "finished" state and check the invoiced USD price against our order.
    const r = await markOrderPaid(db, String(b.order_id), { gatewayRef: String(b.payment_id || ""), paidUsd: Number(b.price_amount || 0), gateway: "nowpayments" });
    if (!isFinal(r)) return NextResponse.json({ error: r.reason }, { status: 422 });
  } else if (b.payment_status === "failed" || b.payment_status === "expired") {
    await dbRun(db, `UPDATE orders SET status = ? WHERE id = ? AND status = 'pending'`, [b.payment_status, String(b.order_id)]);
  }
  return NextResponse.json({ received: true });
}
