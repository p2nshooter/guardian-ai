/* AXTO — POST /api/webhooks/paypal · PAYMENT.CAPTURE.COMPLETED → activate plan.
 * (The return URL already captures payments; this webhook is the safety net.) */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { gatewayCreds } from "@/lib/billing/gateways";
import { paypalVerifyWebhook } from "@/lib/billing/providers";
import { markOrderPaid } from "@/lib/billing/activate";

export async function POST(req: NextRequest) {
  const event = await req.json().catch(() => null);
  const db = getDB(req);
  const creds = await gatewayCreds(db, "paypal");
  if (!event || !creds || !(await paypalVerifyWebhook(creds, req.headers, event))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const cap = event.resource || {};
    const orderId = cap.custom_id || "";
    if (orderId) await markOrderPaid(db, orderId, { gatewayRef: cap.id, paidUsd: Number(cap.amount?.value || 0), gateway: "paypal" });
  }
  return NextResponse.json({ received: true });
}
