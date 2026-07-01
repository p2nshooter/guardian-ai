/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, dbQuery, newId, now } from "@/lib/db";
import { createLicense, createBundleLicenses } from "@/lib/license";
import { sendWelcomeEmail, sendBundleEmail, sendEmail } from "@/lib/email";
import { PACKAGE_INFO } from "@/lib/stripe";
import { recordResellerSale } from "@/lib/reseller";

export async function processPlaybookPurchase(req: NextRequest, params: {
  email: string; name: string; amountUsd: number; paymentRef: string;
  gateway: string; playbookId?: string; bundleId?: string;
}) {
  const { email, name, amountUsd, paymentRef, gateway, playbookId, bundleId } = params;
  const db = getDB(req);

  // Idempotency
  const existing = await dbFirst(db, `SELECT id FROM playbook_purchases WHERE payment_ref = ?`, [paymentRef]);
  if (existing) return NextResponse.json({ ok: true });

  // Create purchase record - need client_id for FK but also store email
  let clientId = "unknown";
  try {
    const clientRow = await dbFirst<any>(db, `SELECT id FROM clients WHERE email = ?`, [email.toLowerCase()]);
    if (clientRow) clientId = clientRow.id;
  } catch {}

  await dbRun(db,
    `INSERT INTO playbook_purchases (id, client_id, client_email, playbook_id, bundle_id, amount_usd, gateway, payment_ref, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [newId(), clientId, email.toLowerCase(), playbookId || "", bundleId || "", amountUsd, gateway, paymentRef, "completed", now()]
  );

  // If bundle, create individual purchase records for each playbook in the bundle
  if (bundleId) {
    const bundle = await dbFirst<any>(db, `SELECT playbook_ids FROM playbook_bundles WHERE id = ?`, [bundleId]);
    if (bundle?.playbook_ids) {
      try {
        const ids = JSON.parse(bundle.playbook_ids);
        for (const pbId of ids) {
          await dbRun(db,
            `INSERT OR IGNORE INTO playbook_purchases (id, client_email, playbook_id, bundle_id, amount_usd, gateway, payment_ref, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
            [newId(), email, pbId, bundleId, 0, gateway, `${paymentRef}-${pbId}`, "completed", now()]
          ).catch(() => {});
        }
      } catch {}
    }
  }

  // Auto-create user entry if not exists (so they can login to portal)
  const userExists = await dbFirst(db, `SELECT id FROM users WHERE email = ?`, [email]);
  if (!userExists) {
    await dbRun(db, `INSERT INTO users (id, email, role, created_at, updated_at) VALUES (?,?,'client',?,?)`,
      [newId(), email, now(), now()]).catch(() => {});
  }

  // Send confirmation email
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
    await sendEmail({
      to: email,
      subject: "📦 Your AXTO Playbook is Ready to Download",
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="background:#060c14;color:#e2f4ff;font-family:-apple-system,sans-serif;padding:40px 24px;margin:0">
<div style="max-width:480px;margin:0 auto">
  <div style="font-size:24px;font-weight:800;color:#22d3ee;margin-bottom:24px">📦 AXTO Playbooks</div>
  <h2 style="color:#fff;margin:0 0 12px">Your Playbook is Ready, ${name || "there"}!</h2>
  <p style="color:#94a3b8;line-height:1.6;margin:0 0 24px">Thank you for your purchase. Your playbook is ready to download from your portal.</p>
  <a href="${appUrl}/auth/login" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#0284c7);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Download from Portal →</a>
  <p style="color:#475569;font-size:12px;margin-top:24px;line-height:1.6">Login with your email: <strong style="color:#22d3ee">${email}</strong><br>Use Magic Link or the password you registered with.</p>
  <hr style="border:none;border-top:1px solid #1e293b;margin:28px 0">
  <p style="color:#334155;font-size:11px">Need help? Contact <a href="mailto:hallo@axto.io" style="color:#22d3ee">hallo@axto.io</a></p>
</div></body></html>`,
    });
  } catch {}

  return NextResponse.json({ ok: true });
}

export async function processPayment(req: NextRequest, params: {
  pkg: string; email: string; name: string; organization: string;
  billing: string; isBundle: boolean; guardianPackage: string;
  orchestraPackage: string; amountUsd: number; paymentRef: string;
  gateway: "stripe" | "paypal" | "xendit" | "midtrans";
  source?: string; playbookId?: string; bundleId?: string; referralCode?: string;
}) {
  const { pkg, email, name, organization, billing, isBundle, guardianPackage, orchestraPackage, amountUsd, paymentRef, gateway, source, playbookId, bundleId, referralCode } = params;

  // ── Playbook purchase ──────────────────────────────────────────────────
  if (source === "playbook") {
    return processPlaybookPurchase(req, { email, name, amountUsd, paymentRef, gateway, playbookId, bundleId });
  }

  // ── License purchase ───────────────────────────────────────────────────
  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
  const existing = await dbFirst(db, `SELECT id FROM invoices WHERE payment_ref = ? OR payment_ref = ?`, [`${paymentRef}`, `${paymentRef}-G`]);
  if (existing) return NextResponse.json({ ok: true });

  const base = {
    clientName: name || email, clientEmail: email, organization,
    gateway, billingCycle: (billing || "yearly") as "yearly" | "monthly",
  };

  if (isBundle && guardianPackage && orchestraPackage) {
    const { guardian: g, orchestra: o } = await createBundleLicenses({
      ...base, guardianPackage, orchestraPackage, paymentRef, amountUsdTotal: amountUsd,
    }, req);
    try {
      await sendBundleEmail({
        to: email, name: name || email,
        guardianKey: g.licenseKey, guardianPackage: PACKAGE_INFO[guardianPackage]?.name || guardianPackage,
        guardianExpiry: (g.license as any).expires_at,
        orchestraKey: o.licenseKey, orchestraPackage: PACKAGE_INFO[orchestraPackage]?.name || orchestraPackage,
        orchestraExpiry: (o.license as any).expires_at,
      });
    } catch {}
    await recordResellerSale(db, { referralCode, amountUsd, licenseId: (g.license as any).id, clientEmail: email });
  } else {
    const { licenseKey, license, product } = await createLicense({
      ...base, packageCode: pkg, paymentRef, amountUsd,
      trialDays: PACKAGE_INFO[pkg]?.trialDays,
    }, req);
    try {
      await sendWelcomeEmail({
        to: email, name: name || email, licenseKey,
        packageName: PACKAGE_INFO[pkg]?.name || pkg,
        expiresAt: (license as any).expires_at, product,
      });
    } catch {}
    await recordResellerSale(db, { referralCode, amountUsd, licenseId: (license as any).id, clientEmail: email });
  }

  return NextResponse.json({ ok: true });
}
