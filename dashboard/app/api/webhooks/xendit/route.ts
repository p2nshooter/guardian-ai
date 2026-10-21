/* AXTO — POST /api/webhooks/xendit · invoice callbacks (x-callback-token).
 * The token identifies the environment (Live or Sandbox), which must match the order's. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { gatewayCredsAll, ENV_KEY, type PayEnv } from "@/lib/billing/gateways";
import { xenditVerify } from "@/lib/billing/providers";
import { markOrderPaid, isFinal } from "@/lib/billing/activate";

export async function POST(req: NextRequest) {
  const db = getData(req);
  const token = req.headers.get("x-callback-token");
  const env = ((await gatewayCredsAll("xendit")).find((c) => xenditVerify(token, c))?.[ENV_KEY] || null) as PayEnv | null;
  if (!env) return NextResponse.json({ error: "invalid token" }, { status: 401 });
  const b: any = await req.json().catch(() => ({}));
  if ((b.status === "PAID" || b.status === "SETTLED") && b.external_id) {
    // Card invoices can be charged in USD; everything else is IDR.
    const paid = Number(b.paid_amount ?? b.amount ?? 0);
    const usd = String(b.currency || "").toUpperCase() === "USD";
    const r = await markOrderPaid(db, b.external_id, { gatewayRef: b.id, ...(usd ? { paidUsd: paid } : { paidLocal: paid }), gateway: "xendit", env });
    if (!isFinal(r)) return NextResponse.json({ error: r.reason }, { status: 422 });
  }
  return NextResponse.json({ received: true });
}
