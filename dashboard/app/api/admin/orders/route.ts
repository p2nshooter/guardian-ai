/* AXTO — /api/admin/orders (admin only)
 *   GET ?status=&q=&page=  → orders
 *   POST {action:"mark_paid"|"reject_proof"|"refund"|"cancel", id, note?}
 *        reject_proof: the bank receipt does not match — the order stays open, the member sees
 *        the reason on the payment screen, gets an e-mail and can upload a new receipt. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, now } from "@/lib/db";
import { readMeta, patchMeta } from "@/lib/data/meta";
import { ids } from "@/lib/data/schema";
import { findLicence } from "@/lib/licences";
import { requireAdmin, respond } from "@/lib/auth";
import { parseIdrQuery } from "@/lib/billing/unique-amount";
import { markOrderPaid, syncLicenses } from "@/lib/billing/activate";
import { commissionRefunded } from "@/lib/affiliate";
import { getSale, saveSale } from "@/lib/acquisition";
import { saleRoundRefunded } from "@/lib/sale-auction";
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
  const idr = parseIdrQuery(q);
  const db = getData(req);
  const has = (v: unknown) => String(v || "").toLowerCase().includes(q);
  // Filtered on the index summaries (one list call per 1,000 orders); only the page shown is read.
  const hits = (await db.orders.listAll("all", "all", 100_000)).filter(({ id, meta: m }) => {
    if (status && m.status !== status) return false;
    if (idr) return Math.round(Number(m.amount_local) || 0) === idr || has(id) || has(m.invoice_no);
    return !q || has(m.email) || has(id) || has(m.invoice_no) || has(m.gateway_ref);
  });
  const orders = (await db.orders.getMany(hits.slice((page - 1) * PAGE, page * PAGE).map((e) => e.id))).filter((o) => o !== null);
  const total = { n: hits.length };
  return respond({ orders, total: total?.n ?? 0, page, pageSize: PAGE }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const db = getData(req);
  const o = await db.orders.get(String(b?.id || ""));
  if (!o) return fail("Order not found.", 404);
  const note = String(b?.note || "").slice(0, 300);
  if (b?.action === "mark_paid") {
    if (o.status === "paid") return fail("Already paid.");
    const r = await markOrderPaid(db, o.id, { gatewayRef: note ? `manual:${note}` : "manual", actor: ctx.session.email });
    if (r.reason === "receipt_required") return fail("This auction win is paid by bank transfer: it can be approved only once the winner has uploaded the payment screenshot.", 400, { code: "receipt_required" });
    if (!r.ok) return fail(`Could not activate: ${r.reason}`);
  } else if (b?.action === "reject_proof") {
    if (o.status !== "pending") return fail("Only open orders can have their proof rejected.");
    const m = readMeta(o.meta);
    if (!m.bank_proof) return fail("This order has no transfer proof to reject.");
    if (!note.trim()) return fail("Write the reason, so the member knows what to fix.");
    const rejected = { reason: note, at: now() };
    await db.orders.update(o.id, (x) => ({ ...x, meta: patchMeta(x.meta, (mm) => { if (mm.bank_proof && typeof mm.bank_proof === "object") mm.bank_proof.rejected = rejected; }) }));
    await sendMail(o.email, `Your transfer proof for order ${o.id} needs another look`,
      mailLayout("We could not confirm your transfer yet",
        `<p>We checked the transfer proof for order <strong>${esc(o.id)}</strong> and could not confirm it yet.</p><p><strong>Reason:</strong> ${esc(note)}</p><p>Please open the payment screen and upload a clearer receipt, or the correct one. Your order stays open.</p>`,
        { label: "Open billing", href: absoluteUrl(o.plan === "lifetime" ? "/app/lifetime" : "/app/billing") })).catch(() => false);
  } else if (b?.action === "refund") {
    if (o.status !== "paid") return fail("Only paid orders can be refunded.");
    await db.orders.update(o.id, (x) => ({ ...x, status: "refunded", meta: patchMeta(x.meta, (mm) => { mm.refund_note = note; }) }));
    // An affiliate's commission on it is reversed, or clawed back from the next payout if already paid.
    await commissionRefunded(db, o.id).catch((e) => console.error("affiliate reversal failed:", e));
    const sub = await db.subscriptions.get(ids.subscription(o.user_id));
    if (o.plan === "lifetime" && b?.endAccess) {
      // New activations and downloads stop; devices already activated offline cannot be reached.
      const lic = await db.lifetimeLicenses.find("order_id", o.id);
      if (lic) await db.lifetimeLicenses.update(lic.id, (x) => ({ ...x, status: "revoked", updated_at: now() }));
    }
    if (o.plan === "edition" && b?.endAccess) {
      // A refunded edition: its licence ends now (the engine stops at its next check-in).
      const app = String(readMeta(o.meta).edition?.app || "");
      const lic = app ? await findLicence(db, o.user_id, app, "edition") : null;
      if (lic) await db.shLicenses.update(lic.id, (x) => ({ ...x, status: "revoked", expires_at: now(), updated_at: now() }));
    }
    if (o.plan === "acquisition" && b?.endAccess) {
      // A refunded site purchase: the buyer's administrator role ends and the offer reopens.
      if (o.user_id === ctx.session.sub) return fail("You cannot remove your own administrator role.");
      await db.users.update(o.user_id, (x) => ({ ...x, role: "client", updated_at: now() }));   // 'client' = member in the users table
      const sale = await getSale(db);
      if (sale.soldTo?.orderId === o.id) await saveSale(db, { ...sale, status: "open", soldTo: undefined });
      await saleRoundRefunded(db, o, ctx.session);
    }
    if (sub?.last_order_id === o.id && b?.endAccess) {
      const at = now();
      await db.subscriptions.update(ids.subscription(o.user_id), (x) => ({ ...x, status: "canceled", current_period_end: at, updated_at: at }));
      await syncLicenses(db, o.user_id, "none", now());
    }
  } else if (b?.action === "cancel") {
    if (o.status !== "pending") return fail("Only pending orders can be cancelled.");
    await db.orders.update(o.id, (x) => (x.status === "pending" ? { ...x, status: "failed", meta: patchMeta(x.meta, (mm) => { mm.cancel_note = note; }) } : null));
  } else {
    return fail("Unknown action.");
  }
  await audit(db, ctx.session, `admin.order.${b?.action}`, "order", o.id, { note }, req);
  return respond({ ok: true }, ctx);
}
