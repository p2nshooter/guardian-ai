/* AXTO — POST /api/webhooks/nowpayments · IPN (x-nowpayments-sig).
 * Checked with the Live and the Sandbox IPN secret; the matching environment must be the order's. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { closePending } from "@/lib/billing/order-doc";
import { gatewayCredsAll, ENV_KEY, type PayEnv } from "@/lib/billing/gateways";
import { nowpaymentsVerify } from "@/lib/billing/providers";
import { markOrderPaid, isFinal } from "@/lib/billing/activate";

export async function POST(req: NextRequest) {
  const b: any = await req.json().catch(() => null);
  const db = getData(req);
  let env: PayEnv | null = null;
  if (b) for (const c of await gatewayCredsAll("nowpayments")) if (await nowpaymentsVerify(b, req.headers.get("x-nowpayments-sig"), c)) { env = c[ENV_KEY] as PayEnv; break; }
  if (!env) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  if (b.payment_status === "finished" && b.order_id) {
    // price_amount is the USD invoice amount; actually_paid is in crypto, so trust the gateway's
    // "finished" state and check the invoiced USD price against our order.
    const r = await markOrderPaid(db, String(b.order_id), { gatewayRef: String(b.payment_id || ""), paidUsd: Number(b.price_amount || 0), gateway: "nowpayments", env });
    if (!isFinal(r)) return NextResponse.json({ error: r.reason }, { status: 422 });
  } else if (b.payment_status === "failed" || b.payment_status === "expired") {
    await closePending(db, String(b.order_id), "nowpayments", String(b.payment_status));
  }
  return NextResponse.json({ received: true });
}
