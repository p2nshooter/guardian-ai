/* AXTO — /api/admin/acquisition · Admin → Site sale
 *   GET → settings + every acquisition order
 *   PUT {settings} → price, status (open / paused / sold), automatic admin grant,
 *       payment methods, WhatsApp number and the BNI receiving accounts */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, dbQuery } from "@/lib/db";
import { requireAdmin, respond, forbidden } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { getSale, saveSale, sanitizeSale, SALE_DEFAULTS, SALE_GATEWAYS } from "@/lib/acquisition";
import { activeGateways } from "@/lib/billing/gateways";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const db = getDB(req);
  const [settings, orders, active] = await Promise.all([
    getSale(db),
    dbQuery<any>(db, `SELECT id, email, amount_usd, amount_local, gateway, status, invoice_no, meta, created_at, paid_at FROM orders WHERE plan = 'acquisition' ORDER BY created_at DESC LIMIT 200`),
    activeGateways(db),
  ]);
  return respond({
    settings, defaults: SALE_DEFAULTS, gateways: SALE_GATEWAYS,
    live: Object.fromEntries(active.map((g) => [g.id, g.mode])),
    orders: orders.map((o) => {
      let m: any = {};
      try { m = JSON.parse(o.meta || "{}"); } catch {}
      return { id: o.id, email: o.email, amountUsd: o.amount_usd, amountIdr: o.amount_local, gateway: o.gateway, status: o.status, invoiceNo: o.invoice_no, createdAt: o.created_at, paidAt: o.paid_at,
               env: m.env === "sandbox" ? "sandbox" : "live", buyer: m.buyer || {}, proof: m.bank_proof || m.crypto?.proof || null };
    }),
  }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return forbidden();
  const db = getDB(req);
  const b = await readJson(req);
  if (!b?.settings) return fail("Nothing to save.");
  const current = await getSale(db);
  const next = sanitizeSale({ ...b.settings, soldTo: b.settings.status === "sold" ? current.soldTo : undefined }, current);
  if (!next.gateways.length) return fail("Offer at least one payment method.");
  await saveSale(db, next);
  await audit(db, ctx.session, "admin.site_sale", "platform_config", "site_sale", { status: next.status, priceUsd: next.priceUsd, autoGrantAdmin: next.autoGrantAdmin, gateways: next.gateways }, req);
  return respond({ ok: true, settings: next }, ctx);
}
