/* AXTO — POST /api/webhooks/xendit · invoice PAID/SETTLED → activate plan. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { gatewayCreds } from "@/lib/billing/gateways";
import { xenditVerify } from "@/lib/billing/providers";
import { markOrderPaid, isFinal } from "@/lib/billing/activate";

export async function POST(req: NextRequest) {
  const db = getDB(req);
  const creds = await gatewayCreds(db, "xendit");
  if (!creds || !xenditVerify(req.headers.get("x-callback-token"), creds)) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
  const b: any = await req.json().catch(() => ({}));
  if ((b.status === "PAID" || b.status === "SETTLED") && b.external_id) {
    const r = await markOrderPaid(db, b.external_id, { gatewayRef: b.id, paidLocal: Number(b.paid_amount ?? b.amount ?? 0), gateway: "xendit" });
    if (!isFinal(r)) return NextResponse.json({ error: r.reason }, { status: 422 });
  }
  return NextResponse.json({ received: true });
}
