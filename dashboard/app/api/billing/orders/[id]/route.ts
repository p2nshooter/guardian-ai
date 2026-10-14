/* AXTO — /api/billing/orders/:id (the member's own order)
 *   GET  → status + payment details (poll this on the payment screen)
 *   POST {action:"crypto_proof", network, tx}  → verified on-chain now; paid instantly when confirmed
 *        {action:"bank_proof", reference, note} → sent to the team (Support inbox + e-mail) for approval
 *        multipart/form-data {action:"bank_proof", reference?, note?, receipt: File} → the same, with the
 *        transfer receipt (photo/PDF) kept private in R2 for the admin to check and approve */
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
import { getSale } from "@/lib/acquisition";
import { storeReceipt } from "@/lib/billing/receipt";

type Params = { params: Promise<{ id: string }> };

function view(o: any) {
  let m: any = {};
  try { m = JSON.parse(o.meta || "{}"); } catch {}
  return {
    id: o.id, status: o.status, plan: o.plan, cycle: o.cycle, gateway: o.gateway, amountUsd: o.amount_usd,
    amountLocal: o.amount_local, currency: o.currency, invoiceNo: o.invoice_no, createdAt: o.created_at, paidAt: o.paid_at,
    crypto: m.crypto ? { amount: m.crypto.amount, quotes: m.crypto.quotes, proof: m.crypto.proof || null } : null,
    bankProof: m.bank_proof ? {
      reference: m.bank_proof.reference || "", at: m.bank_proof.at || "", currency: m.bank_proof.currency || "",
      receipt: m.bank_proof.receipt ? { name: m.bank_proof.receipt.name, type: m.bank_proof.receipt.type, size: m.bank_proof.receipt.size } : null,
      rejected: m.bank_proof.rejected || null,
    } : null,
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
  const multipart = (req.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data");
  let b: any = null;
  let receiptFile: File | null = null;
  if (multipart) {
    try {
      const fd = await req.formData();
      b = { action: fd.get("action"), reference: fd.get("reference"), note: fd.get("note"), currency: fd.get("currency") };
      const f = fd.get("receipt");
      if (f && typeof f !== "string") receiptFile = f as File;
    } catch { return fail("Could not read the upload — please try again."); }
  } else {
    b = await readJson(req);
  }

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
    if (!reference && !receiptFile) return fail("Upload the transfer receipt, or enter the transfer reference / sender account name.");
    let receipt = null;
    if (receiptFile) {
      const st = await storeReceipt(o.id, receiptFile);
      if (!st.ok) return fail(st.error);
      receipt = st.receipt;
    }
    // Which BNI account the buyer wired to (IDR, USD or EUR). The order then
    // carries that currency and the quoted amount, so Orders, the history and
    // the invoice all show what was actually sent. Only quotes we issued count.
    let meta: any = {};
    try { meta = JSON.parse(o.meta || "{}"); } catch {}
    const quotes: { currency: string; amount: number }[] = Array.isArray(meta.bank_quotes) ? meta.bank_quotes : [];
    const chosen = quotes.find((q) => q.currency === String(b?.currency || "").toUpperCase()) || null;
    if (chosen && (chosen.currency !== o.currency || Number(chosen.amount) !== Number(o.amount_local))) {
      await dbRun(db, `UPDATE orders SET currency = ?, amount_local = ? WHERE id = ? AND status = 'pending'`, [chosen.currency, chosen.amount, o.id]);
    }
    const currency = chosen?.currency || o.currency;
    const local = chosen ? Number(chosen.amount) : Number(o.amount_local);
    // A new proof replaces the previous one and clears an earlier rejection.
    await dbRun(db, `UPDATE orders SET meta = json_set(COALESCE(NULLIF(meta,''),'{}'), '$.bank_proof', json(?)) WHERE id = ?`,
      [JSON.stringify({ reference, note, currency, at: now(), ...(receipt ? { receipt } : {}) }), o.id]);
    const sent = !local ? "" : currency === "IDR" ? ` / Rp${local.toLocaleString("id-ID")}` : currency === "EUR" ? ` / €${local.toFixed(2)} to the EUR account` : currency === "USD" ? ` to the USD account` : ` / ${currency} ${local}`;
    const text = `Bank transfer sent for order ${o.id} (${o.plan}, ${o.cycle}, US$${o.amount_usd}${sent}).${reference ? `\nReference: ${reference}` : ""}${receipt ? `\nReceipt uploaded (${receipt.name}) — open Admin → Orders to view it and approve.` : ""}${note ? `\nNote: ${note}` : ""}`;
    const { id: threadId } = await createThread(db, {
      name: ctx.session.name || ctx.session.email, email: ctx.session.email, topic: "bank", source: "payment",
      userId: ctx.session.sub, subject: `Payment to confirm — ${o.id}`, needsAdmin: true, first: { name: ctx.session.name || "Member", text },
    });
    const row = await getThreadRow(db, threadId);
    if (row) await notifyAdmin(row, text, "Payment to confirm").catch(() => {});
    await audit(db, ctx.session, "order.bank_proof", "order", o.id, { receipt: !!receipt }, req);
    if (o.plan === "acquisition") {
      const sale = await getSale(db);
      return respond({ ok: true, status: "pending", whatsapp: sale.whatsapp, message: `Thanks — the owner verifies the wire (usually within one business day) and your administrator access is granted the moment it is confirmed. Please also send the transfer receipt on WhatsApp ${sale.whatsapp}.` }, ctx);
    }
    const fresh = await dbFirst<any>(db, `SELECT * FROM orders WHERE id = ?`, [o.id]);
    return respond({ ok: true, status: "pending", order: view(fresh), message: receipt
      ? "Receipt received — our team checks it (usually within one business day). The moment it is approved your plan and licences appear in your dashboard and you get an e-mail."
      : "Thanks — our team confirms bank transfers within one business day. You'll get an e-mail the moment your plan is active." }, ctx);
  }
  return fail("Unknown action.");
}
