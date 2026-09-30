/* AXTO — GET /api/acquire/status?order=… · the buyer's acquisition order. Reads
 * the account fresh, so the moment the payment is verified the buyer's session
 * cookie carries the administrator role (no sign-out needed). */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, dbFirst } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { fail } from "@/lib/http";
import { getSale } from "@/lib/acquisition";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  const id = new URL(req.url).searchParams.get("order") || "";
  const db = getDB(req);
  const o = await dbFirst<{ id: string; status: string; gateway: string; amount_usd: number; invoice_no: string; paid_at: string; meta: string }>(db,
    `SELECT id, status, gateway, amount_usd, invoice_no, paid_at, meta FROM orders WHERE id = ? AND user_id = ? AND plan = 'acquisition'`, [id, ctx.session.sub]);
  if (!o) return fail("Order not found.", 404);
  let test = false;
  try { test = JSON.parse(o.meta || "{}").env === "sandbox"; } catch {}
  const sale = await getSale(db);
  const paid = o.status === "paid";
  return respond({
    order: { id: o.id, status: o.status, gateway: o.gateway, amountUsd: o.amount_usd, invoiceNo: o.invoice_no, paidAt: o.paid_at, test },
    admin: ctx.session.role === "admin",
    buyer: paid && sale.soldTo?.orderId === o.id,
    whatsapp: paid || o.gateway === "manual" ? sale.whatsapp : "",
  }, ctx);
}
