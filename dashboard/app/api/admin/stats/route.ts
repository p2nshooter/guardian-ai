/* AXTO — GET /api/admin/stats · overview KPIs (admin only). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { monthKey } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getData(req);
  const nowIso = new Date().toISOString();
  const d30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const y1 = new Date(Date.now() - 365 * 86_400_000).toISOString();
  // Every figure comes from index summaries (users, subscriptions, orders, licences, usage): list calls only.
  const [users, subs, paid, orders, licences, usage] = await Promise.all([
    db.users.listAll("all", "all"), db.subscriptions.listAll("all", "all"), db.orders.listAll("paid", "all"),
    db.orders.listAll("all", "all"), db.shLicenses.listAll("all", "all"), db.byoxUsage.listAll("month", monthKey()),
  ]);
  const clients = users.filter((e) => e.meta.role === "client");
  const active = subs.filter((e) => e.meta.status === "active" && String(e.meta.current_period_end || "") > nowIso);
  const byPlanMap = new Map<string, { plan: string; cycle: string; n: number }>();
  for (const { meta: m } of active) {
    const k = `${m.plan}|${m.cycle}`;
    const row = byPlanMap.get(k) ?? { plan: String(m.plan), cycle: String(m.cycle), n: 0 };
    row.n += 1;
    byPlanMap.set(k, row);
  }
  // Sandbox (test-environment) payments are never revenue.
  const real = paid.filter((e) => !Number(e.meta.sandbox));
  const paidAmount = new Map(real.map((e) => [e.id, Number(e.meta.amount_usd) || 0]));
  // MRR from what each active subscriber actually paid for the current period
  // (admin-edited prices, discounts; complimentary grants count as $0).
  let mrr = 0;
  for (const { meta: m } of active) {
    const amount = paidAmount.get(String(m.last_order_id || "")) ?? 0;
    mrr += m.cycle === "yearly" ? amount / 12 : amount;
  }
  const sum = (list: typeof real) => list.reduce((a, e) => a + (Number(e.meta.amount_usd) || 0), 0);
  const last30 = real.filter((e) => String(e.meta.paid_at || "") >= d30);
  const months = new Map<string, number>();
  for (const e of real) {
    const at = String(e.meta.paid_at || "");
    if (at >= y1) months.set(at.slice(0, 7), (months.get(at.slice(0, 7)) || 0) + (Number(e.meta.amount_usd) || 0));
  }
  const recentDocs = (await db.orders.getMany(orders.slice(0, 8).map((e) => e.id))).filter((o) => o !== null);
  const recent = recentDocs.map((o) => {
    const env = orders.find((e) => e.id === o.id)?.meta.sandbox ? "sandbox" : null;
    return { id: o.id, email: o.email, plan: o.plan, cycle: o.cycle, amount_usd: o.amount_usd, gateway: o.gateway, status: o.status, created_at: o.created_at, paid_at: o.paid_at, env };
  });
  const byox = usage.reduce((a, e) => ({ r: a.r + (Number(e.meta.requests) || 0), c: a.c + (Number(e.meta.clipper_videos) || 0) }), { r: 0, c: 0 });
  return respond({
    members: clients.length, newMembers30d: clients.filter((e) => String(e.meta.created_at || "") >= d30).length,
    activeSubscriptions: active.length, byPlan: [...byPlanMap.values()],
    mrr: Math.round(mrr * 100) / 100,
    revenue30d: sum(last30), orders30d: last30.length, revenueAll: sum(real),
    pendingOrders: orders.filter((e) => e.meta.status === "pending").length,
    activeLicenses: licences.filter((e) => e.meta.status === "active").length,
    byoxRequestsMonth: byox.r, clipperVideosMonth: byox.c,
    recentOrders: recent, revenueByMonth: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([m, s]) => ({ m, s })),
  }, ctx);
}
