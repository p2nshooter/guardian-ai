/* AXTO — POST /api/webhooks/midtrans · payment notifications.
 * signature_key is checked with the Live and the Sandbox server key; the matching
 * environment must be the order's. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { closePending } from "@/lib/billing/order-doc";
import { gatewayCredsAll, ENV_KEY, type PayEnv } from "@/lib/billing/gateways";
import { midtransVerify } from "@/lib/billing/providers";
import { markOrderPaid, isFinal } from "@/lib/billing/activate";

export async function POST(req: NextRequest) {
  const n: any = await req.json().catch(() => null);
  const db = getData(req);
  let env: PayEnv | null = null;
  if (n) for (const c of await gatewayCredsAll("midtrans")) if (await midtransVerify(n, c)) { env = c[ENV_KEY] as PayEnv; break; }
  if (!env) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  const st = n.transaction_status;
  const paid = st === "settlement" || (st === "capture" && n.fraud_status === "accept");
  if (paid) {
    const r = await markOrderPaid(db, n.order_id, { gatewayRef: n.transaction_id, paidLocal: Number(n.gross_amount || 0), gateway: "midtrans", env });
    if (!isFinal(r)) return NextResponse.json({ error: r.reason }, { status: 422 });
  } else if (st === "expire" || st === "cancel" || st === "deny") {
    await closePending(db, String(n.order_id), "midtrans", st === "expire" ? "expired" : "failed");
  }
  return NextResponse.json({ received: true });
}
