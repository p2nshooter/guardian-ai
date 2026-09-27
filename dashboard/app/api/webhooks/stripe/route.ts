/* AXTO — POST /api/webhooks/stripe · checkout.session.completed → activate plan. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { gatewayCreds } from "@/lib/billing/gateways";
import { stripeVerify } from "@/lib/billing/providers";
import { markOrderPaid } from "@/lib/billing/activate";

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const db = getDB(req);
  const creds = await gatewayCreds(db, "stripe");
  if (!creds || !(await stripeVerify(payload, req.headers.get("stripe-signature"), creds.webhook_secret))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  const ev = JSON.parse(payload);
  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    const s = ev.data?.object || {};
    const orderId = s.client_reference_id || s.metadata?.order_id;
    if (orderId && s.payment_status === "paid") {
      const r = await markOrderPaid(db, orderId, { gatewayRef: s.payment_intent || s.id, paidUsd: Number(s.amount_total || 0) / 100 });
      if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 422 });
    }
  }
  return NextResponse.json({ received: true });
}
