/* AXTO — POST /api/webhooks/midtrans · settlement / accepted capture → activate plan. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbRun } from "@/lib/db";
import { gatewayCreds } from "@/lib/billing/gateways";
import { midtransVerify } from "@/lib/billing/providers";
import { markOrderPaid } from "@/lib/billing/activate";

export async function POST(req: NextRequest) {
  const n: any = await req.json().catch(() => null);
  const db = getDB(req);
  const creds = await gatewayCreds(db, "midtrans");
  if (!n || !creds || !(await midtransVerify(n, creds))) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  const st = n.transaction_status;
  const paid = st === "settlement" || (st === "capture" && n.fraud_status === "accept");
  if (paid) {
    const r = await markOrderPaid(db, n.order_id, { gatewayRef: n.transaction_id, paidLocal: Number(n.gross_amount || 0) });
    if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 422 });
  } else if (st === "expire" || st === "cancel" || st === "deny") {
    await dbRun(db, `UPDATE orders SET status = ? WHERE id = ? AND status = 'pending'`, [st === "expire" ? "expired" : "failed", n.order_id]);
  }
  return NextResponse.json({ received: true });
}
