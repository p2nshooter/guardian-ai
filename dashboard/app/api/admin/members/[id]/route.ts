/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * /api/admin/members/:id (admin only)
 *   GET   → profile, subscription, orders, licences, usage
 *   POST  {action}:
 *     grant   {plan, cycle}   → complimentary period via the normal activation path
 *     extend  {days}          → push the current period end forward
 *     cancel                  → end the subscription now (licences suspended)
 *     suspend | activate      → block / unblock sign-in and licences
 *     reset_password          → email a reset link
 * ============================================================================ */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, newId, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { isPlanId, isCycle, monthKey } from "@/lib/plans";
import { markOrderPaid, syncLicenses } from "@/lib/billing/activate";
import { readJson, fail, audit } from "@/lib/http";
import { sendMail, mails } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const db = getDB(req);
  const user = await dbFirst(db, `SELECT id, email, role, name, organization, country, status, created_at, last_login_at, storage_bytes FROM users WHERE id = ?`, [id]);
  if (!user) return fail("Member not found.", 404);
  const [subscription, orders, licenses, usage, keys] = await Promise.all([
    dbFirst(db, `SELECT * FROM subscriptions WHERE user_id = ?`, [id]),
    dbQuery(db, `SELECT id, invoice_no, plan, cycle, amount_usd, currency, amount_local, gateway, gateway_ref, status, created_at, paid_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`, [id]),
    dbQuery(db, `SELECT id, product, license_key, status, expires_at, max_nodes, bound_machine_id, last_seen_at, last_version, reset_count FROM sh_licenses WHERE user_id = ?`, [id]),
    dbFirst(db, `SELECT requests, clipper_videos FROM byox_usage WHERE user_id = ? AND month = ?`, [id, monthKey()]),
    dbQuery(db, `SELECT provider, hint, created_at FROM user_ai_keys WHERE user_id = ?`, [id]),
  ]);
  return respond({ user, subscription, orders, licenses, usage, byoxKeys: keys }, ctx);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const b = await readJson(req);
  const db = getDB(req);
  const user = await dbFirst<{ id: string; email: string; role: string }>(db, `SELECT id, email, role FROM users WHERE id = ?`, [id]);
  if (!user) return fail("Member not found.", 404);
  if (user.role === "admin") return fail("Admin accounts are managed in Settings.");
  const action = String(b?.action || "");

  if (action === "grant") {
    if (!isPlanId(b?.plan) || !isCycle(b?.cycle)) return fail("Choose a plan and period.");
    const orderId = newId("ord");
    await dbRun(db, `INSERT INTO orders (id, user_id, email, plan, cycle, amount_usd, currency, gateway, status, meta, created_at)
                     VALUES (?, ?, ?, ?, ?, 0, 'USD', 'manual', 'pending', ?, ?)`,
      [orderId, id, user.email, b.plan, b.cycle, JSON.stringify({ complimentary: true, by: ctx.session.email, note: String(b?.note || "").slice(0, 300) }), now()]);
    const r = await markOrderPaid(db, orderId, { gatewayRef: "complimentary", actor: ctx.session.email });
    if (!r.ok) return fail(`Could not grant: ${r.reason}`);
  } else if (action === "extend") {
    const days = Math.min(3650, Math.max(1, parseInt(String(b?.days || "0"), 10) || 0));
    const sub = await dbFirst<{ current_period_end: string; plan: string }>(db, `SELECT current_period_end, plan FROM subscriptions WHERE user_id = ?`, [id]);
    if (!sub) return fail("This member has no subscription. Use Grant instead.");
    const base = Math.max(Date.parse(sub.current_period_end), Date.now());
    const end = new Date(base + days * 86_400_000).toISOString();
    await dbRun(db, `UPDATE subscriptions SET current_period_end = ?, status = 'active', updated_at = ? WHERE user_id = ?`, [end, now(), id]);
    await syncLicenses(db, id, sub.plan, end);
  } else if (action === "cancel") {
    await dbRun(db, `UPDATE subscriptions SET status = 'canceled', current_period_end = ?, updated_at = ? WHERE user_id = ?`, [now(), now(), id]);
    await syncLicenses(db, id, "none", now());
  } else if (action === "suspend" || action === "activate") {
    await dbRun(db, `UPDATE users SET status = ?, updated_at = ? WHERE id = ?`, [action === "suspend" ? "suspended" : "active", now(), id]);
  } else if (action === "reset_password") {
    const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
    await dbRun(db, `INSERT INTO password_resets (id, email, token, expires_at, used, created_at) VALUES (?, ?, ?, datetime('now', '+30 minutes'), 0, datetime('now'))`, [newId(), user.email, token]);
    const m = mails.passwordReset(absoluteUrl(`/reset-password?token=${token}`));
    await sendMail(user.email, m.subject, m.html);
  } else {
    return fail("Unknown action.");
  }
  await audit(db, ctx.session, `admin.member.${action}`, "user", id, { plan: b?.plan, cycle: b?.cycle, days: b?.days }, req);
  return respond({ ok: true }, ctx);
}
