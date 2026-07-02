/* ==============================================================================
 * GET /api/cron/crypto-watch   (scheduled — secured by CRON_SECRET)
 *   Settles confirmed on-chain payments across ALL enabled methods (USDT/BNB/
 *   ETH/BTC). On a confirmed match it issues the license (same smart-license
 *   issuer) and writes a MANDATORY invoice, then the license appears in the
 *   client dashboard. Network access required at runtime (the live boundary).
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { createLicense } from "@/lib/license";
import { getEnabledMethod } from "@/lib/payments/methods";
import { settleCryptoPayment, type CryptoIntent, type PaymentMethod } from "@/lib/payments/crypto";
import { writeInvoice } from "@/lib/invoice";
import { recordResellerSale } from "@/lib/reseller";
import { sendWelcomeEmail } from "@/lib/email";
import { PACKAGE_INFO } from "@/lib/stripe";
import { processPlaybookPurchase } from "@/lib/webhooks/shared";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function GET(req: NextRequest) {
  // MANDATORY: an unconfigured CRON_SECRET must reject every request, not
  // skip auth -- this endpoint settles real payments and issues licenses.
  const secret = (process.env as any).CRON_SECRET || (req as any).env?.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDB(req);
  const now = Date.now();
  const pending: any = await db.prepare(
    "SELECT * FROM crypto_payments WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50",
  ).all();
  const rows: any[] = pending?.results || [];

  let settled = 0, expired = 0, stillPending = 0, skipped = 0;
  for (const p of rows) {
    const method = await getEnabledMethod(db, p.method_id);
    if (!method) { skipped++; continue; } // method disabled after intent → skip safely
    const createdAt = Date.parse(p.created_at) || now;
    const expiresAt = Date.parse(p.expires_at) || now + 3_600_000;
    if (now > expiresAt) {
      await db.prepare("UPDATE crypto_payments SET status='expired' WHERE id=?").bind(p.id).run();
      expired++; continue;
    }
    const intent: CryptoIntent = {
      orderId: p.order_id, methodId: p.method_id, userEmail: p.user_email, product: p.product,
      packageCode: p.package_code, amountUsd: p.amount_usd, amountCrypto: p.amount_crypto,
      symbol: p.symbol, network: p.network, depositAddress: p.deposit_address,
      decimals: method.decimals, minConfirmations: method.confirmations, createdAt, expiresAt,
    };

    try {
      const result = await settleCryptoPayment(method as PaymentMethod, intent, {
        // defaultFetcher routes to the correct chain explorer by method.kind/network
        issueLicense: async (a) => {
          // Playbook/bundle purchases carry no license -- product is set to
          // the 'playbook' sentinel at intent-creation time (see api/checkout
          // gateway==='crypto' branch). Reuse the same completion logic every
          // other gateway uses (idempotency, bundle expansion, purchase
          // record, confirmation email) instead of a license.
          if (a.product === "playbook") {
            let pbMeta: any = {};
            try { pbMeta = JSON.parse(p.meta || "{}"); } catch {}
            await processPlaybookPurchase(req, {
              email: a.email, name: pbMeta.name || a.email, amountUsd: p.amount_usd,
              paymentRef: `${a.symbol}:${a.txHash}`, gateway: "crypto",
              playbookId: pbMeta.playbook_id || undefined, bundleId: pbMeta.bundle_id || undefined,
            });
            return { licenseId: "" };
          }
          const issued: any = await createLicense({
            clientName: a.email, clientEmail: a.email, product: a.product,
            packageCode: a.packageCode, licenseType: "paid", paymentRef: `${a.symbol}:${a.txHash}`,
          } as any, req);
          // createLicense() returns { licenseKey, license, clientId, product } --
          // the id lives on the nested license row, not a top-level licenseId/id.
          const licenseId = issued?.license?.id || "";
          let referralCode = "";
          try { referralCode = JSON.parse(p.meta || "{}").referralCode || ""; } catch {}
          await recordResellerSale(db, { referralCode, amountUsd: p.amount_usd, licenseId, clientEmail: a.email });
          // Same welcome-email step every other payment gateway does after
          // issuing a license (see lib/webhooks/shared.ts processPayment) --
          // crypto settlement never called it, so paying clients never got
          // their license key by email despite the checkout page telling
          // them to check it.
          try {
            await sendWelcomeEmail({
              to: a.email, name: a.email, licenseKey: issued?.licenseKey || "",
              packageName: PACKAGE_INFO[a.packageCode]?.name || a.packageCode,
              expiresAt: issued?.license?.expires_at || "", product: a.product,
            });
          } catch {}
          return { licenseId };
        },
        writeInvoice: async (a) => {
          const invoiceId = await writeInvoice(db, {
            email: a.email, product: a.product, licenseId: a.licenseId, kind: "crypto",
            amountUsd: a.amountUsd, orderId: intent.orderId, txHash: a.txHash,
            amountCrypto: a.amountCrypto, symbol: a.symbol, network: intent.network,
          });
          return { invoiceId };
        },
        now,
      });
      if (result.settled) {
        await db.prepare(
          "UPDATE crypto_payments SET status='confirmed', tx_hash=?, confirmed_at=?, license_id=?, invoice_id=? WHERE id=?",
        ).bind(result.txHash || "", new Date().toISOString(), result.licenseId || "", result.invoiceId || "", p.id).run();
        settled++;
      } else { stillPending++; }
    } catch { stillPending++; /* transient explorer error — retry next run */ }
  }

  return NextResponse.json({ ok: true, scanned: rows.length, settled, expired, stillPending, skipped });
}
