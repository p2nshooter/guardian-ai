/* AXTO — POST /api/webhooks/stripe · Stripe checkout events.
 * Verified against the Live AND the Sandbox signing secret; the environment
 * that verifies must match the order's (test money never pays a real order). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { gatewayCredsAll, ENV_KEY, type PayEnv } from "@/lib/billing/gateways";
import { stripeVerify } from "@/lib/billing/providers";
import { markOrderPaid, isFinal } from "@/lib/billing/activate";

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const db = getData(req);
  let env: PayEnv | null = null;
  for (const c of await gatewayCredsAll("stripe")) {
    if (await stripeVerify(payload, req.headers.get("stripe-signature"), c.webhook_secret)) { env = c[ENV_KEY] as PayEnv; break; }
  }
  if (!env) return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  const ev = JSON.parse(payload);
  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    const s = ev.data?.object || {};
    const orderId = s.client_reference_id || s.metadata?.order_id;
    if (orderId && s.payment_status === "paid") {
      const r = await markOrderPaid(db, orderId, { gatewayRef: s.payment_intent || s.id, paidUsd: Number(s.amount_total || 0) / 100, gateway: "stripe", env });
      if (!isFinal(r)) return NextResponse.json({ error: r.reason }, { status: 422 });
    }
  }
  return NextResponse.json({ received: true });
}
