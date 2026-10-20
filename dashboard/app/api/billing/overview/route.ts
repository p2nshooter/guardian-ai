/* AXTO — GET /api/billing/overview · the member's subscription and order history. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { readMeta } from "@/lib/data/meta";
import { loadSession, unauthorized, respond } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  const db = getData(req);
  const [sub, page] = await Promise.all([db.subscriptions.get(ctx.session.sub), db.orders.listDocs("user", ctx.session.sub, { limit: 50 })]);
  const subscription = sub ? { plan: sub.plan, cycle: sub.cycle, status: sub.status, current_period_start: sub.current_period_start, current_period_end: sub.current_period_end } : null;
  const orders = page.docs.map((o) => ({
    id: o.id, invoice_no: o.invoice_no, plan: o.plan, cycle: o.cycle, amount_usd: o.amount_usd, currency: o.currency, amount_local: o.amount_local,
    gateway: o.gateway, status: o.status, created_at: o.created_at, paid_at: o.paid_at, method: String(readMeta(o.meta).method || ""),
  }));
  return respond({ subscription, orders }, ctx);
}
