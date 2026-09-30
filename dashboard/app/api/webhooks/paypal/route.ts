/* AXTO — POST /api/webhooks/paypal · PAYMENT.CAPTURE.COMPLETED.
 * Verified through PayPal's API with the Live or the Sandbox app (whichever has a
 * Webhook ID and accepts it); that environment must match the order's. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { gatewayCredsAll, ENV_KEY, type PayEnv } from "@/lib/billing/gateways";
import { paypalVerifyWebhook } from "@/lib/billing/providers";
import { markOrderPaid } from "@/lib/billing/activate";

export async function POST(req: NextRequest) {
  const event = await req.json().catch(() => null);
  const db = getDB(req);
  let env: PayEnv | null = null;
  if (event) {
    for (const c of await gatewayCredsAll("paypal")) {
      if (await paypalVerifyWebhook(c, req.headers, event).catch(() => false)) { env = c[ENV_KEY] as PayEnv; break; }
    }
  }
  if (!env) return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const cap = event.resource || {};
    const orderId = cap.custom_id || "";
    if (orderId) await markOrderPaid(db, orderId, { gatewayRef: cap.id, paidUsd: Number(cap.amount?.value || 0), gateway: "paypal", env });
  }
  return NextResponse.json({ received: true });
}
