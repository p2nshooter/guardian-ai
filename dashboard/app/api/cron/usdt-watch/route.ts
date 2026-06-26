/* ==============================================================================
 * GET /api/cron/usdt-watch   (scheduled — secured by CRON_SECRET)
 *   Polls TRON for incoming USDT TRC20 transfers and settles any pending intent
 *   whose on-chain payment is confirmed: issues the license (same smart-license
 *   issuer) and writes the invoice. Schedule it via Cloudflare Cron or GitLab.
 *   Network access required at runtime (TronGrid) — this is the live boundary.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { createLicense } from "@/lib/license";
import { settlePayment, type PaymentIntent } from "@/lib/payments/usdt-trc20";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function GET(req: NextRequest) {
  const secret = (process.env as any).CRON_SECRET || (req as any).env?.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (secret && auth !== `Bearer ${secret}`) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDB(req);
  const apiKey = (process.env as any).TRON_API_KEY || (req as any).env?.TRON_API_KEY;
  const now = Date.now();

  const pending: any = await db.prepare(
    "SELECT * FROM usdt_payments WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50",
  ).all();
  const rows: any[] = pending?.results || [];

  let settled = 0, expired = 0, stillPending = 0;
  for (const p of rows) {
    const createdAt = Date.parse(p.created_at) || now;
    const expiresAt = Date.parse(p.expires_at) || now + 3_600_000;
    if (now > expiresAt) {
      await db.prepare("UPDATE usdt_payments SET status='expired' WHERE id=?").bind(p.id).run();
      expired++; continue;
    }
    const intent: PaymentIntent = {
      orderId: p.order_id, userEmail: p.user_email, product: p.product,
      packageCode: p.package_code, amountUsdt: p.amount_usdt,
      depositAddress: p.deposit_address, createdAt, expiresAt,
    };

    try {
      const result = await settlePayment(intent, {
        fetchTransfers: async (addr) => {
          const { fetchIncomingTransfers } = await import("@/lib/payments/usdt-trc20");
          return fetchIncomingTransfers(addr, { apiKey });
        },
        issueLicense: async (a) => {
          const issued: any = await createLicense({
            clientName: a.email, clientEmail: a.email, product: a.product,
            packageCode: a.packageCode, licenseType: "paid",
            paymentRef: `usdt:${a.txHash}`,
          } as any, req);
          return { licenseId: issued?.licenseId || issued?.id || "", licenseKey: issued?.licenseKey || "", expiresAt: issued?.expiresAt || "" };
        },
        writeInvoice: async (a) => {
          try {
            await db.prepare(
              `INSERT INTO invoices (id, user_email, product, amount, currency, status, kind, license_id, tx_hash, created_at, meta)
               VALUES (?, ?, ?, ?, 'USDT', 'paid', 'usdt', ?, ?, ?, ?)`,
            ).bind(uid("inv"), a.email, a.product, a.amountUsdt, a.licenseId, a.txHash,
                   new Date().toISOString(), JSON.stringify({ network: "TRC20" })).run();
          } catch { /* schema variance non-fatal */ }
        },
        now,
      });
      if (result.settled) {
        await db.prepare(
          "UPDATE usdt_payments SET status='confirmed', tx_hash=?, confirmed_at=?, license_id=? WHERE id=?",
        ).bind(result.txHash || "", new Date().toISOString(), result.licenseId || "", p.id).run();
        settled++;
      } else { stillPending++; }
    } catch { stillPending++; /* transient network error — retry next run */ }
  }

  return NextResponse.json({ ok: true, scanned: rows.length, settled, expired, stillPending });
}
