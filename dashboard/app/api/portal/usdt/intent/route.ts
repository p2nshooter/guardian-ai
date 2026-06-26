/* ==============================================================================
 * POST /api/portal/usdt/intent  (client)
 *   Body: { product, packageCode }
 *   Creates a USDT TRC20 payment intent: returns the deposit address, the EXACT
 *   amount to send, a QR-ready payment string, and an expiry. Works for all 10
 *   products. The cron watcher settles it on-chain and issues the license.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PACKAGE_INFO, isProductForSale } from "@/lib/stripe";
import { createPaymentIntent } from "@/lib/payments/usdt-trc20";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { product, packageCode } = await req.json().catch(() => ({}));
  const pkg = PACKAGE_INFO[packageCode];
  if (!pkg) return NextResponse.json({ error: "unknown package" }, { status: 400 });
  if (!isProductForSale(pkg.product)) return NextResponse.json({ error: "product not for sale yet" }, { status: 403 });

  // Merchant TRC20 receiving address from environment (never hardcoded).
  const depositAddress = (process.env as any).USDT_TRC20_ADDRESS || (req as any).env?.USDT_TRC20_ADDRESS;
  if (!depositAddress) return NextResponse.json({ error: "USDT not configured" }, { status: 503 });

  const orderId = uid("usdt");
  const intent = createPaymentIntent({
    orderId, userEmail: (user as any).email, product: pkg.product,
    packageCode, basePriceUsdt: pkg.price, depositAddress,
  });

  const db = getDB(req);
  await db.prepare(
    `INSERT INTO usdt_payments (id, order_id, user_email, product, package_code, amount_usdt, deposit_address, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).bind(uid("pay"), orderId, (user as any).email, pkg.product, packageCode,
         intent.amountUsdt, depositAddress, new Date(intent.createdAt).toISOString(),
         new Date(intent.expiresAt).toISOString()).run();

  // TRON URI for wallet QR codes.
  const qr = `tron:${depositAddress}?amount=${intent.amountUsdt}&token=USDT`;
  return NextResponse.json({
    ok: true, orderId, network: "TRC20 (TRON)", token: "USDT",
    depositAddress, amountUsdt: intent.amountUsdt, qr,
    expiresAt: new Date(intent.expiresAt).toISOString(),
    note: "Send the EXACT amount shown. The license is issued automatically once the payment confirms on-chain.",
  });
}
