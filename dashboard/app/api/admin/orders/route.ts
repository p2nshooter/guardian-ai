/* AXTO — /api/admin/orders (admin only)
 *   GET ?status=&q=&page=  → orders
 *   POST {action:"mark_paid"|"reject_proof"|"refund"|"cancel", id, note?}
 *        reject_proof: the bank receipt does not match — the order stays open, the member sees
 *        the reason on the payment screen, gets an e-mail and can upload a new receipt. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { parseIdrQuery } from "@/lib/billing/unique-amount";
import { markOrderPaid, syncLicenses } from "@/lib/billing/activate";
import { getSale, saveSale } from "@/lib/acquisition";
import { readJson, fail, audit } from "@/lib/http";
import { sendMail, mailLayout } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

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
  const idr = parseIdrQuery(q);
  if (idr) { where.push("(CAST(ROUND(amount_local) AS INTEGER) = ? OR id LIKE ? OR invoice_no LIKE ?)"); args.push(idr, `%${q}%`, `%${q}%`); }
  else if (q) { where.push("(email LIKE ? OR id LIKE ? OR invoice_no LIKE ? OR gateway_ref LIKE ?)"); args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
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
  } else if (b?.action === "reject_proof") {
    if (o.status !== "pending") return fail("Only open orders can have their proof rejected.");
    let m: any = {};
    try { m = JSON.parse(o.meta || "{}"); } catch {}
    if (!m.bank_proof) return fail("This order has no transfer proof to reject.");
    if (!note.trim()) return fail("Write the reason, so the member knows what to fix.");
    await dbRun(db, `UPDATE orders SET meta = json_set(meta, '$.bank_proof.rejected', json(?)) WHERE id = ?`, [JSON.stringify({ reason: note, at: now() }), o.id]);
    await sendMail(o.email, `Your transfer proof for order ${o.id} needs another look`,
      mailLayout("We could not confirm your transfer yet",
        `<p>We checked the transfer proof for order <strong>${esc(o.id)}</strong> and could not confirm it yet.</p><p><strong>Reason:</strong> ${esc(note)}</p><p>Please open the payment screen and upload a clearer receipt, or the correct one. Your order stays open.</p>`,
        { label: "Open billing", href: absoluteUrl(o.plan === "lifetime" ? "/app/lifetime" : "/app/billing") })).catch(() => false);
  } else if (b?.action === "refund") {
    if (o.status !== "paid") return fail("Only paid orders can be refunded.");
    await dbRun(db, `UPDATE orders SET status = 'refunded', meta = json_set(meta, '$.refund_note', ?) WHERE id = ?`, [note, o.id]);
    const sub = await dbFirst<{ last_order_id: string }>(db, `SELECT last_order_id FROM subscriptions WHERE user_id = ?`, [o.user_id]);
    if (o.plan === "lifetime" && b?.endAccess) {
      // New activations and downloads stop; devices already activated offline cannot be reached.
      await dbRun(db, `UPDATE lifetime_licenses SET status = 'revoked', updated_at = ? WHERE order_id = ?`, [now(), o.id]);
    }
    if (o.plan === "acquisition" && b?.endAccess) {
      // A refunded site purchase: the buyer's administrator role ends and the offer reopens.
      if (o.user_id === ctx.session.sub) return fail("You cannot remove your own administrator role.");
      await dbRun(db, `UPDATE users SET role = 'client', updated_at = ? WHERE id = ?`, [now(), o.user_id]);   // 'client' = member in the users table
      const sale = await getSale(db);
      if (sale.soldTo?.orderId === o.id) await saveSale(db, { ...sale, status: "open", soldTo: undefined });
    }
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
