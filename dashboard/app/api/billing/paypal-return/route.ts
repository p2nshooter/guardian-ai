/* AXTO — GET /api/billing/paypal-return?order=…&token=… · capture the approved PayPal
 * payment server-side, then send the member back to Billing (or Lifetime licences). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst } from "@/lib/db";
import { gatewayCreds } from "@/lib/billing/gateways";
import { paypalCapture } from "@/lib/billing/providers";
import { markOrderPaid } from "@/lib/billing/activate";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order") || "";
  const token = url.searchParams.get("token") || "";
  const db = getDB(req);
  const o = await dbFirst<{ id: string; gateway_ref: string; amount_usd: number; plan: string }>(db, `SELECT id, gateway_ref, amount_usd, plan FROM orders WHERE id = ? AND gateway = 'paypal'`, [orderId]);
  const page = o?.plan === "lifetime" ? "/app/lifetime" : "/app/billing";
  const back = (q: string) => NextResponse.redirect(new URL(`${page}?${q}`, req.url));
  if (!o || !token || (o.gateway_ref && o.gateway_ref !== token)) return back("canceled=1");
  const creds = await gatewayCreds(db, "paypal");
  if (!creds) return back("error=gateway");
  try {
    const cap = await paypalCapture(creds, token);
    if (!cap.ok || (cap.orderId && cap.orderId !== o.id)) return back("error=payment");
    const r = await markOrderPaid(db, o.id, { gatewayRef: cap.captureId, paidUsd: cap.amount, gateway: "paypal" });
    return back(r.ok ? `paid=${encodeURIComponent(o.id)}` : r.reason === "refunded" ? "error=refunded" : "error=amount");
  } catch {
    return back("error=payment");
  }
}
