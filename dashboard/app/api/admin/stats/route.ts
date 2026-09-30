/* AXTO — GET /api/admin/stats · overview KPIs (admin only). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { monthKey } from "@/lib/plans";

// Sandbox (test-environment) payments are never revenue.
const REAL = `COALESCE(json_extract(meta, '$.env'), 'live') != 'sandbox'`;

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDB(req);
  const nowIso = new Date().toISOString();
  const d30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [members, newMembers, subs, paying, rev30, revAll, pending, lic, byox, recent, monthly] = await Promise.all([
    dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM users WHERE role = 'client'`),
    dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM users WHERE role = 'client' AND created_at >= ?`, [d30]),
    dbQuery<{ plan: string; cycle: string; n: number }>(db,
      `SELECT plan, cycle, COUNT(*) AS n FROM subscriptions WHERE status = 'active' AND current_period_end > ? GROUP BY plan, cycle`, [nowIso]),
    // MRR from what each active subscriber actually paid for the current period
    // (admin-edited prices, discounts; complimentary grants count as $0).
    dbQuery<{ cycle: string; amount: number }>(db,
      `SELECT s.cycle, COALESCE(o.amount_usd, 0) AS amount FROM subscriptions s
         LEFT JOIN orders o ON o.id = s.last_order_id AND o.status = 'paid' AND COALESCE(json_extract(o.meta, '$.env'), 'live') != 'sandbox'
        WHERE s.status = 'active' AND s.current_period_end > ?`, [nowIso]),
    dbFirst<{ s: number; n: number }>(db, `SELECT COALESCE(SUM(amount_usd), 0) AS s, COUNT(*) AS n FROM orders WHERE status = 'paid' AND ${REAL} AND paid_at >= ?`, [d30]),
    dbFirst<{ s: number; n: number }>(db, `SELECT COALESCE(SUM(amount_usd), 0) AS s, COUNT(*) AS n FROM orders WHERE status = 'paid' AND ${REAL}`),
    dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'`),
    dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM sh_licenses WHERE status = 'active'`),
    dbFirst<{ r: number; c: number }>(db, `SELECT COALESCE(SUM(requests), 0) AS r, COALESCE(SUM(clipper_videos), 0) AS c FROM byox_usage WHERE month = ?`, [monthKey()]),
    dbQuery(db, `SELECT o.id, o.email, o.plan, o.cycle, o.amount_usd, o.gateway, o.status, o.created_at, o.paid_at, json_extract(o.meta, '$.env') AS env FROM orders o ORDER BY o.created_at DESC LIMIT 8`),
    dbQuery<{ m: string; s: number }>(db,
      `SELECT substr(paid_at, 1, 7) AS m, SUM(amount_usd) AS s FROM orders WHERE status = 'paid' AND ${REAL} AND paid_at >= ? GROUP BY m ORDER BY m`,
      [new Date(Date.now() - 365 * 86_400_000).toISOString()]),
  ]);
  let mrr = 0;
  for (const r of paying) mrr += r.cycle === "yearly" ? Number(r.amount) / 12 : Number(r.amount);
  return respond({
    members: members?.n ?? 0, newMembers30d: newMembers?.n ?? 0,
    activeSubscriptions: subs.reduce((a, r) => a + r.n, 0), byPlan: subs,
    mrr: Math.round(mrr * 100) / 100,
    revenue30d: rev30?.s ?? 0, orders30d: rev30?.n ?? 0, revenueAll: revAll?.s ?? 0,
    pendingOrders: pending?.n ?? 0, activeLicenses: lic?.n ?? 0,
    byoxRequestsMonth: byox?.r ?? 0, clipperVideosMonth: byox?.c ?? 0,
    recentOrders: recent, revenueByMonth: monthly,
  }, ctx);
}
