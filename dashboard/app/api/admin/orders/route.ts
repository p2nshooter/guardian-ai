/* AXTO — /api/admin/orders (admin only)
 *   GET ?status=&q=&page=  → orders
 *   POST {action:"mark_paid"|"refund"|"cancel", id, note?} */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { markOrderPaid, syncLicenses } from "@/lib/billing/activate";
import { readJson, fail, audit } from "@/lib/http";

const PAGE = 50;

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const q = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 100);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const where: string[] = ["1 = 1"]; const args: unknown[] = [];
  if (status) { where.push("status = ?"); args.push(status); }
  if (q) { where.push("(email LIKE ? OR id LIKE ? OR invoice_no LIKE ? OR gateway_ref LIKE ?)"); args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
  const db = getDB(req);
  const w = where.join(" AND ");
  const [orders, total] = await Promise.all([
    dbQuery(db, `SELECT * FROM orders WHERE ${w} ORDER BY created_at DESC LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`, args),
    dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM orders WHERE ${w}`, args),
  ]);
  return respond({ orders, total: total?.n ?? 0, page, pageSize: PAGE }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const db = getDB(req);
  const o = await dbFirst<any>(db, `SELECT * FROM orders WHERE id = ?`, [String(b?.id || "")]);
  if (!o) return fail("Order not found.", 404);
  const note = String(b?.note || "").slice(0, 300);
  if (b?.action === "mark_paid") {
    if (o.status === "paid") return fail("Already paid.");
    const r = await markOrderPaid(db, o.id, { gatewayRef: note ? `manual:${note}` : "manual", actor: ctx.session.email });
    if (!r.ok) return fail(`Could not activate: ${r.reason}`);
  } else if (b?.action === "refund") {
    if (o.status !== "paid") return fail("Only paid orders can be refunded.");
    await dbRun(db, `UPDATE orders SET status = 'refunded', meta = json_set(meta, '$.refund_note', ?) WHERE id = ?`, [note, o.id]);
    const sub = await dbFirst<{ last_order_id: string }>(db, `SELECT last_order_id FROM subscriptions WHERE user_id = ?`, [o.user_id]);
    if (sub?.last_order_id === o.id && b?.endAccess) {
      await dbRun(db, `UPDATE subscriptions SET status = 'canceled', current_period_end = ?, updated_at = ? WHERE user_id = ?`, [now(), now(), o.user_id]);
      await syncLicenses(db, o.user_id, "none", now());
    }
  } else if (b?.action === "cancel") {
    if (o.status !== "pending") return fail("Only pending orders can be cancelled.");
    await dbRun(db, `UPDATE orders SET status = 'failed', meta = json_set(meta, '$.cancel_note', ?) WHERE id = ?`, [note, o.id]);
  } else {
    return fail("Unknown action.");
  }
  await audit(db, ctx.session, `admin.order.${b?.action}`, "order", o.id, { note }, req);
  return respond({ ok: true }, ctx);
}
