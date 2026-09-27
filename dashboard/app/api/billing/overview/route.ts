/* AXTO — GET /api/billing/overview · the member's subscription and order history. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, dbFirst, dbQuery } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  const db = getDB(req);
  const [subscription, orders] = await Promise.all([
    dbFirst(db, `SELECT plan, cycle, status, current_period_start, current_period_end FROM subscriptions WHERE user_id = ?`, [ctx.session.sub]),
    dbQuery(db, `SELECT id, invoice_no, plan, cycle, amount_usd, currency, amount_local, gateway, status, created_at, paid_at
                   FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [ctx.session.sub]),
  ]);
  return respond({ subscription, orders }, ctx);
}
