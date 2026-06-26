/* ==============================================================================
 * GET  /api/portal/crypto/methods   → list ENABLED payment methods (hides OFF)
 * POST /api/portal/crypto/intent    → { product, packageCode, methodId }
 *      Creates a crypto payment intent for an enabled method only. Returns the
 *      deposit address, exact amount (with unique tag), network, QR + expiry.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PACKAGE_INFO, isProductForSale } from "@/lib/stripe";
import { getEnabledMethod, getPublicMethods } from "@/lib/payments/methods";
import { createCryptoIntent } from "@/lib/payments/crypto";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// Live USD→coin rate. Stablecoins return 1. The only network dependency here.
async function rateUsdPerCoin(symbol: string): Promise<number> {
  if (symbol === "USDT") return 1;
  const ids: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin" };
  const id = ids[symbol];
  if (!id) return 0;
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    const j: any = await r.json();
    return Number(j?.[id]?.usd) || 0;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const methods = await getPublicMethods(getDB(req));
  return NextResponse.json({ methods }); // only enabled methods; OFF ones never appear
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { product, packageCode, methodId } = await req.json().catch(() => ({}));
  const pkg = PACKAGE_INFO[packageCode];
  if (!pkg) return NextResponse.json({ error: "unknown package" }, { status: 400 });
  if (!isProductForSale(pkg.product)) return NextResponse.json({ error: "product not for sale yet" }, { status: 403 });

  const db = getDB(req);
  const method = await getEnabledMethod(db, String(methodId));
  if (!method) return NextResponse.json({ error: "payment method unavailable" }, { status: 400 });
  if (!method.address) return NextResponse.json({ error: "method not configured" }, { status: 503 });

  const rate = await rateUsdPerCoin(method.symbol);
  if (rate <= 0) return NextResponse.json({ error: "rate unavailable, try again" }, { status: 503 });

  const orderId = uid("cpay");
  const intent = createCryptoIntent({
    method, orderId, userEmail: (user as any).email, product: pkg.product,
    packageCode, amountUsd: pkg.price, rateUsdPerCoin: rate,
  });

  await db.prepare(
    `INSERT INTO crypto_payments (id, order_id, method_id, user_email, product, package_code, amount_usd, amount_crypto, symbol, network, deposit_address, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).bind(
    uid("cp"), orderId, method.id, (user as any).email, pkg.product, packageCode,
    pkg.price, intent.amountCrypto, method.symbol, method.network, method.address,
    new Date(intent.createdAt).toISOString(), new Date(intent.expiresAt).toISOString(),
  ).run();

  const qr = method.kind === "trc20"
    ? `tron:${method.address}?amount=${intent.amountCrypto}`
    : method.network === "Bitcoin"
      ? `bitcoin:${method.address}?amount=${intent.amountCrypto}`
      : `ethereum:${method.address}?value=${intent.amountCrypto}`;

  return NextResponse.json({
    ok: true, orderId, method: method.id, symbol: method.symbol, network: method.network,
    depositAddress: method.address, amountCrypto: intent.amountCrypto, amountUsd: pkg.price,
    confirmations: method.confirmations, qr, expiresAt: new Date(intent.expiresAt).toISOString(),
    note: "Send the EXACT amount on the EXACT network. The license is issued automatically once the payment confirms on-chain. An invoice is always generated.",
  });
}
