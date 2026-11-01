/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
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
import { getData, newId, now } from "@/lib/db";
import { ids } from "@/lib/data/schema";
import { newOrder } from "@/lib/billing/order-doc";
import { createPasswordReset } from "@/lib/password-reset";
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
  const db = getData(req);
  const u = await db.users.get(id);
  if (!u) return fail("Member not found.", 404);
  const user = { id: u.id, email: u.email, role: u.role, name: u.name, organization: u.organization, country: u.country, status: u.status, created_at: u.created_at, last_login_at: u.last_login_at, storage_bytes: u.storage_bytes };
  const [subscription, orderPage, lics, use, aiKeys] = await Promise.all([
    db.subscriptions.get(ids.subscription(id)),
    db.orders.listDocs("user", id, { limit: 100 }),
    db.shLicenses.listAllDocs("user", id),
    db.byoxUsage.get(ids.usage(id, monthKey())),
    db.userAiKeys.listAllDocs("user", id),
  ]);
  const orders = orderPage.docs.map((o) => ({ id: o.id, invoice_no: o.invoice_no, plan: o.plan, cycle: o.cycle, amount_usd: o.amount_usd, currency: o.currency, amount_local: o.amount_local, gateway: o.gateway, gateway_ref: o.gateway_ref, status: o.status, created_at: o.created_at, paid_at: o.paid_at }));
  const licenses = lics.map((l) => ({ id: l.id, product: l.product, license_key: l.license_key, status: l.status, expires_at: l.expires_at, max_nodes: l.max_nodes, bound_machine_id: l.bound_machine_id, last_seen_at: l.last_seen_at, last_version: l.last_version, reset_count: l.reset_count }));
  const usage = use ? { requests: use.requests, clipper_videos: use.clipper_videos } : null;
  const keys = aiKeys.map((k) => ({ provider: k.provider, hint: k.hint, created_at: k.created_at }));
  return respond({ user, subscription, orders, licenses, usage, byoxKeys: keys }, ctx);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const b = await readJson(req);
  const db = getData(req);
  const user = await db.users.get(id);
  if (!user) return fail("Member not found.", 404);
  if (user.role === "admin") return fail("Admin accounts are managed in Settings.");
  const action = String(b?.action || "");

  if (action === "grant") {
    if (!isPlanId(b?.plan) || !isCycle(b?.cycle)) return fail("Choose a plan and period.");
    const orderId = newId("ord");
    await db.orders.create(newOrder({
      id: orderId, user_id: id, email: user.email, plan: b.plan, cycle: b.cycle, amount_usd: 0, gateway: "manual",
      meta: JSON.stringify({ complimentary: true, by: ctx.session.email, note: String(b?.note || "").slice(0, 300) }),
    }));
    const r = await markOrderPaid(db, orderId, { gatewayRef: "complimentary", actor: ctx.session.email });
    if (!r.ok) return fail(`Could not grant: ${r.reason}`);
  } else if (action === "extend") {
    const days = Math.min(3650, Math.max(1, parseInt(String(b?.days || "0"), 10) || 0));
    const sub = await db.subscriptions.get(ids.subscription(id));
    if (!sub) return fail("This member has no subscription. Use Grant instead.");
    const base = Math.max(Date.parse(sub.current_period_end), Date.now());
    const end = new Date(base + days * 86_400_000).toISOString();
    await db.subscriptions.update(ids.subscription(id), (x) => ({ ...x, current_period_end: end, status: "active", updated_at: now() }));
    await syncLicenses(db, id, sub.plan, end);
  } else if (action === "cancel") {
    const at = now();
    if (await db.subscriptions.get(ids.subscription(id))) await db.subscriptions.update(ids.subscription(id), (x) => ({ ...x, status: "canceled", current_period_end: at, updated_at: at }));
    await syncLicenses(db, id, "none", now());
  } else if (action === "suspend" || action === "activate") {
    const status = action === "suspend" ? "suspended" : "active";
    await db.users.update(id, (x) => ({ ...x, status, updated_at: now() }));
  } else if (action === "reset_password") {
    const token = await createPasswordReset(db, user.email);
    const m = mails.passwordReset(absoluteUrl(`/reset-password?token=${token}`));
    await sendMail(user.email, m.subject, m.html);
  } else {
    return fail("Unknown action.");
  }
  await audit(db, ctx.session, `admin.member.${action}`, "user", id, { plan: b?.plan, cycle: b?.cycle, days: b?.days }, req);
  return respond({ ok: true }, ctx);
}
