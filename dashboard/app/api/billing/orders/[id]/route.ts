/* AXTO — /api/billing/orders/:id (the member's own order)
 *   GET  → status + payment details (poll this on the payment screen)
 *   POST {action:"crypto_proof", network, tx}  → verified on-chain now; paid instantly when confirmed
 *        {action:"bank_proof", reference, note} → sent to the team (Support inbox + e-mail) for approval */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, dbFirst, dbRun, now } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { verifyCryptoProof, CRYPTO_NETWORKS } from "@/lib/billing/crypto-watch";
import { createThread, getThreadRow, cleanText } from "@/lib/support/store";
import { notifyAdmin } from "@/lib/support/service";
import type { Network } from "@/lib/billing/chain";

type Params = { params: Promise<{ id: string }> };

function view(o: any) {
  let m: any = {};
  try { m = JSON.parse(o.meta || "{}"); } catch {}
  return {
    id: o.id, status: o.status, plan: o.plan, cycle: o.cycle, gateway: o.gateway, amountUsd: o.amount_usd,
    amountLocal: o.amount_local, currency: o.currency, invoiceNo: o.invoice_no, createdAt: o.created_at, paidAt: o.paid_at,
    crypto: m.crypto ? { amount: m.crypto.amount, quotes: m.crypto.quotes, proof: m.crypto.proof || null } : null,
    bankProof: m.bank_proof || null,
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const { id } = await params;
  const o = await dbFirst<any>(getDB(req), `SELECT * FROM orders WHERE id = ? AND user_id = ?`, [id, ctx.session.sub]);
  if (!o) return fail("Order not found.", 404);
  return respond({ order: view(o) }, ctx);
}

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const { id } = await params;
  const rl = await rateLimit(req, "order-proof", ctx.session.sub, { max: 12, windowSeconds: 3600 });
  if (rl.limited) return fail("Too many attempts — please wait a few minutes.", 429);
  const db = getDB(req);
  const o = await dbFirst<any>(db, `SELECT * FROM orders WHERE id = ? AND user_id = ?`, [id, ctx.session.sub]);
  if (!o) return fail("Order not found.", 404);
  if (o.status === "paid") return respond({ ok: true, status: "paid", message: "This order is already paid.", order: view(o) }, ctx);
  if (o.status !== "pending") return fail("This order is no longer open — start a new checkout.", 409);
  const b = await readJson(req);

  if (b?.action === "crypto_proof") {
    if (o.gateway !== "crypto") return fail("This order isn't a crypto order.");
    const network = String(b?.network || "") as Network;
    if (!CRYPTO_NETWORKS.includes(network)) return fail("Choose the network you paid on.");
    const tx = cleanText(b?.tx, 120);
    if (tx.length < 32) return fail("Paste the full transaction hash (TXID).");
    const r = await verifyCryptoProof(db, o.id, network, tx);
    await audit(db, ctx.session, "order.crypto_proof", "order", o.id, { network, status: r.status }, req);
    const fresh = await dbFirst<any>(db, `SELECT * FROM orders WHERE id = ?`, [o.id]);
    return respond({ ok: r.status !== "rejected", ...r, order: view(fresh) }, ctx);
  }

  if (b?.action === "bank_proof") {
    if (o.gateway !== "manual") return fail("This order isn't a bank-transfer order.");
    const reference = cleanText(b?.reference, 120);
    const note = cleanText(b?.note, 1000);
    if (!reference) return fail("Enter the transfer reference or the sender account name.");
    await dbRun(db, `UPDATE orders SET meta = json_set(COALESCE(NULLIF(meta,''),'{}'), '$.bank_proof', json(?)) WHERE id = ?`,
      [JSON.stringify({ reference, note, at: now() }), o.id]);
    const text = `Bank transfer sent for order ${o.id} (${o.plan}, ${o.cycle}, US$${o.amount_usd}${o.amount_local ? ` / Rp${Number(o.amount_local).toLocaleString("id-ID")}` : ""}).\nReference: ${reference}${note ? `\nNote: ${note}` : ""}`;
    const { id: threadId } = await createThread(db, {
      name: ctx.session.name || ctx.session.email, email: ctx.session.email, topic: "bank", source: "payment",
      userId: ctx.session.sub, subject: `Payment to confirm — ${o.id}`, needsAdmin: true, first: { name: ctx.session.name || "Member", text },
    });
    const row = await getThreadRow(db, threadId);
    if (row) await notifyAdmin(row, text, "Payment to confirm").catch(() => {});
    await audit(db, ctx.session, "order.bank_proof", "order", o.id, {}, req);
    return respond({ ok: true, status: "pending", message: "Thanks — our team confirms bank transfers within one business day. You'll get an e-mail the moment your plan is active." }, ctx);
  }
  return fail("Unknown action.");
}
