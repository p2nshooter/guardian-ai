/* AXTO — GET /api/acquire/status?order=… · the buyer's acquisition order. Reads
 * the account fresh, so the moment the payment is verified the buyer's session
 * cookie carries the administrator role (no sign-out needed). */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { readMeta } from "@/lib/data/meta";
import { ownOrder } from "@/lib/billing/order-doc";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { fail } from "@/lib/http";
import { getSale } from "@/lib/acquisition";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  const id = new URL(req.url).searchParams.get("order") || "";
  const db = getData(req);
  const o = await ownOrder(db, id, ctx.session.sub);
  if (!o || o.plan !== "acquisition") return fail("Order not found.", 404);
  const test = readMeta(o.meta).env === "sandbox";
  const sale = await getSale(db);
  const paid = o.status === "paid";
  return respond({
    order: { id: o.id, status: o.status, gateway: o.gateway, amountUsd: o.amount_usd, invoiceNo: o.invoice_no, paidAt: o.paid_at, test },
    admin: ctx.session.role === "admin",
    buyer: paid && sale.soldTo?.orderId === o.id,
    whatsapp: paid || o.gateway === "manual" ? sale.whatsapp : "",
  }, ctx);
}
