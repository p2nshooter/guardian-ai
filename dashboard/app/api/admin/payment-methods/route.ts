/* ==============================================================================
 * Admin payment-methods management
 *   GET  /api/admin/payment-methods            — list ALL methods (incl. disabled)
 *   POST /api/admin/payment-methods            — { id, action, ...fields }
 *        action = "toggle"  → flip enabled
 *        action = "enable" | "disable"
 *        action = "update"  → { address, network, confirmations, name }
 * Disabled methods are hidden from clients but always visible here to the admin.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDB(req);
  try {
    // Self-healing: ensure the table exists before we read/seed it. There is no
    // dedicated migration for this table, and fresh D1 databases (new deploys)
    // would otherwise render an empty page. Idempotent — safe on every request.
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'crypto',
        network TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'native',
        address TEXT NOT NULL DEFAULT '',
        contract TEXT NOT NULL DEFAULT '',
        decimals INTEGER NOT NULL DEFAULT 0,
        confirmations INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
    const existing: any = await db.prepare("SELECT COUNT(*) as n FROM payment_methods").first();
    if ((existing?.n ?? 0) === 0) {
      await db.prepare(`
        INSERT OR IGNORE INTO payment_methods
          (id, symbol, name, category, network, kind, address, contract, decimals, confirmations, enabled, sort_order)
        VALUES
          ('usdt_trc20','USDT','Tether USD (TRC20)','crypto','TRC20','trc20','','TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',6,20,0,10),
          ('bnb','BNB','BNB (BEP20)','crypto','BEP20','native','','',18,12,0,20),
          ('eth','ETH','Ethereum (ERC20)','crypto','Ethereum','native','','',18,50,0,30),
          ('btc','BTC','Bitcoin','crypto','Bitcoin','native','','',8,1,0,40),
          ('stripe','USD','Card (Stripe)','fiat','','native','','',2,0,0,100),
          ('paypal','USD','PayPal','fiat','','native','','',2,0,0,110),
          ('xendit','IDR','Xendit (Indonesia)','fiat','','native','','',2,0,0,120),
          ('midtrans','IDR','Midtrans (Indonesia)','fiat','','native','','',2,0,0,130)
      `).run();
    }
  } catch { /* table might not exist yet — migration will handle it */ }

  const rows = await db.prepare("SELECT * FROM payment_methods ORDER BY category, sort_order ASC").all();
  return NextResponse.json({ methods: rows?.results || [] });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDB(req);
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!id || !action) return NextResponse.json({ error: "id and action required" }, { status: 400 });

  const m: any = await db.prepare("SELECT * FROM payment_methods WHERE id = ?").bind(id).first();
  if (!m) return NextResponse.json({ error: "method not found" }, { status: 404 });

  const now = new Date().toISOString();

  if (action === "toggle" || action === "enable" || action === "disable") {
    const next = action === "toggle" ? (m.enabled ? 0 : 1) : action === "enable" ? 1 : 0;
    // Safety: never enable a method without a configured address (crypto).
    if (next === 1 && m.category === "crypto" && !String(m.address || "").trim())
      return NextResponse.json({ error: "configure the deposit address before enabling" }, { status: 400 });
    await db.prepare("UPDATE payment_methods SET enabled=?, updated_at=? WHERE id=?").bind(next, now, id).run();
    return NextResponse.json({ ok: true, id, enabled: next });
  }

  if (action === "update") {
    const address = body.address !== undefined ? String(body.address).trim() : m.address;
    const network = body.network !== undefined ? String(body.network).trim() : m.network;
    const confirmations = body.confirmations !== undefined ? Math.max(0, parseInt(body.confirmations, 10) || 0) : m.confirmations;
    const name = body.name !== undefined ? String(body.name).trim() : m.name;
    await db.prepare(
      "UPDATE payment_methods SET address=?, network=?, confirmations=?, name=?, updated_at=? WHERE id=?",
    ).bind(address, network, confirmations, name, now, id).run();
    return NextResponse.json({ ok: true, id, address, network, confirmations, name });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
