/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Self-service launch-promo trial claim.
 *   GET  → window status + per-(product,tier) remaining pool + what this client
 *          has already claimed.
 *   POST → atomically claim one available code from the 100-pool for a
 *          product+tier and activate a 7-day trial license.
 *
 * Rules (per product owner, pre-launch promo — open to brand-new prospects):
 *   • Claim only inside the 1-year launch window (trial_promo_config).
 *   • 1 email + 1 IP + 1 device fingerprint = at most 1 trial per product.
 *   • At most trial_promo_max_products (default 2) distinct products per
 *     client — lets someone compare two products before market entry
 *     without letting one email drain every pool.
 *   • When a product+tier pool is exhausted, that option closes.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createLicense } from "@/lib/license";
import { PACKAGE_INFO } from "@/lib/stripe";

const TRIAL_DAYS = 7;
const DEFAULT_MAX_PRODUCTS = 2;

function clientIp(req: NextRequest): string {
  return req.headers.get("cf-connecting-ip")
    || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || "";
}

async function maxProductsAllowed(db: any): Promise<number> {
  try {
    const row = await dbFirst<any>(db, `SELECT value FROM site_settings WHERE key = 'trial_promo_max_products'`);
    const n = Number(row?.value);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_PRODUCTS;
  } catch { return DEFAULT_MAX_PRODUCTS; }
}

async function promoWindow(db: any): Promise<{ open: boolean; startsAt: string; endsAt: string }> {
  const cfg = await dbFirst<any>(db, `SELECT starts_at, ends_at, enabled FROM trial_promo_config WHERE id = 'axto_launch'`);
  if (!cfg) return { open: false, startsAt: "", endsAt: "" };
  const now = Date.now();
  const open = cfg.enabled === 1
    && now >= Date.parse(cfg.starts_at.replace(" ", "T") + "Z")
    && now <= Date.parse(cfg.ends_at.replace(" ", "T") + "Z");
  return { open, startsAt: cfg.starts_at, endsAt: cfg.ends_at };
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = String((user as any).email || "").toLowerCase();

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  try {
    const win = await promoWindow(db);
    const pool = await dbQuery<any>(
      db,
      `SELECT product, package_code, COUNT(*) AS available
       FROM trial_batch_codes WHERE status='available' GROUP BY product, package_code`
    );
    const mine = await dbQuery<any>(
      db,
      `SELECT product, package_code, claimed_at FROM trial_batch_codes WHERE claimed_email = ? AND status='claimed'`,
      [email]
    );
    const maxProducts = await maxProductsAllowed(db);
    const claimedProductCount = new Set(mine.map((m: any) => m.product)).size;
    return NextResponse.json({ window: win, pool, claimed: mine, maxProducts, claimedProductCount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = String((user as any).email || "").toLowerCase();
  const name = String((user as any).name || email);

  const body = await req.json().catch(() => ({}));
  const packageCode = String(body.packageCode || "").trim();
  const fingerprint = String(body.fingerprint || "").trim();
  const pkg = (PACKAGE_INFO as any)[packageCode];
  if (!packageCode || !pkg) return NextResponse.json({ error: "Unknown package" }, { status: 400 });
  const product = pkg.product;
  const ip = clientIp(req);

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  // 1. Window open?
  const win = await promoWindow(db);
  if (!win.open) return NextResponse.json({ error: "The launch trial promo is not currently open." }, { status: 403 });

  // 2. Anti-abuse: 1 email + 1 IP + 1 fingerprint per product.
  const dupEmail = await dbFirst(db, `SELECT id FROM trial_batch_codes WHERE claimed_email = ? AND product = ? AND status='claimed'`, [email, product]);
  if (dupEmail) return NextResponse.json({ error: "You have already claimed a trial for this product." }, { status: 409 });
  if (ip) {
    const dupIp = await dbFirst(db, `SELECT id FROM trial_batch_codes WHERE claimed_ip = ? AND product = ? AND status='claimed'`, [ip, product]);
    if (dupIp) return NextResponse.json({ error: "A trial for this product was already claimed from your network." }, { status: 409 });
  }
  if (fingerprint) {
    const dupFp = await dbFirst(db, `SELECT id FROM trial_batch_codes WHERE claimed_fingerprint = ? AND product = ? AND status='claimed'`, [fingerprint, product]);
    if (dupFp) return NextResponse.json({ error: "A trial for this product was already claimed from this device." }, { status: 409 });
  }

  // 3. Cap: at most `maxProductsAllowed` distinct products per client, so one
  //    email can't drain every pool — the dupEmail check above already
  //    guarantees at most 1 trial per product.
  const maxProducts = await maxProductsAllowed(db);
  const mineDistinct = await dbQuery<{ product: string }>(
    db, `SELECT DISTINCT product FROM trial_batch_codes WHERE claimed_email = ? AND status='claimed'`, [email]
  );
  const claimedProducts = new Set(mineDistinct.map((m) => m.product));
  if (!claimedProducts.has(product) && claimedProducts.size >= maxProducts) {
    return NextResponse.json({ error: `You've reached the limit of ${maxProducts} trial products per person for this promo.` }, { status: 403 });
  }

  // 4. Claim an available code atomically (mark the oldest available one).
  const code = await dbFirst<any>(
    db,
    `SELECT id, code FROM trial_batch_codes WHERE product = ? AND package_code = ? AND status='available' ORDER BY created_at ASC LIMIT 1`,
    [product, packageCode]
  );
  if (!code) return NextResponse.json({ error: "This trial pool is fully claimed. Please choose another tier or check back later." }, { status: 410 });

  // Reserve it first (best-effort optimistic lock via the status guard).
  const claim = await dbRun(
    db,
    `UPDATE trial_batch_codes SET status='claimed', claimed_email=?, claimed_ip=?, claimed_fingerprint=?, claimed_at=datetime('now') WHERE id=? AND status='available'`,
    [email, ip, fingerprint, code.id]
  );
  if (!(claim as any)?.changes) {
    return NextResponse.json({ error: "That code was just taken — please try again." }, { status: 409 });
  }

  // 5. Issue the 7-day trial license.
  let issued: any;
  try {
    issued = await createLicense({
      clientName: name, clientEmail: email, product,
      packageCode, licenseType: "trial", isTrial: true, trialDays: TRIAL_DAYS,
      gateway: "manual", source: "trial_promo", amountUsd: 0,
      notes: `Launch-promo trial (code ${code.code})`,
    } as any, req);
  } catch (e: any) {
    // Roll the code back so the pool isn't silently drained by a failed issue.
    await dbRun(db, `UPDATE trial_batch_codes SET status='available', claimed_email='', claimed_ip='', claimed_fingerprint='', claimed_at='' WHERE id=?`, [code.id]);
    return NextResponse.json({ error: e?.message || "Could not issue the trial license." }, { status: 500 });
  }

  const licenseId = issued?.licenseId || (issued?.license as any)?.id || issued?.id || "";
  // Link the license + bind the device/ip for enforcement.
  await dbRun(db, `UPDATE trial_batch_codes SET license_id=? WHERE id=?`, [licenseId, code.id]);
  if (licenseId) {
    try {
      await dbRun(db, `UPDATE licenses SET fingerprint=?, activation_ip=?, bound_machine_id=COALESCE(NULLIF(bound_machine_id,''), ?) WHERE id=?`,
        [fingerprint, ip, fingerprint || ip, licenseId]);
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    licenseKey: issued?.licenseKey,
    product, packageCode, trialDays: TRIAL_DAYS,
    expiresAt: (issued?.license as any)?.expires_at,
  });
}
