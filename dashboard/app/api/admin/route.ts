/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendWelcomeEmail, sendBundleEmail } from "@/lib/email";
import { PACKAGE_INFO } from "@/lib/stripe";
import { createLicense, createBundleLicenses } from "@/lib/license";

// ── Append-only audit helper ─────────────────────────────────────────────────
// Records every admin action against a license into license_audit (migration
// 0035). Fire-and-forget: an audit-write failure must never block the action
// itself (e.g. if the table is absent on a not-yet-migrated DB).
async function auditLog(
  db: any,
  licenseId: string,
  action: string,
  actorEmail: string,
  detail: Record<string, any> = {}
): Promise<void> {
  try {
    await dbRun(
      db,
      `INSERT INTO license_audit (id, license_id, action, actor_email, detail, created_at)
       VALUES (?,?,?,?,?,?)`,
      [newId(), licenseId, action, actorEmail || "", JSON.stringify(detail), now()]
    );
  } catch { /* non-critical — never block the action on audit failure */ }
}


export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  const licTotal = await dbFirst<{ n: number }>(db, `SELECT COUNT(*) as n FROM licenses`);
  const licActive = await dbFirst<{ n: number }>(db, `SELECT COUNT(*) as n FROM licenses WHERE status='active'`);
  const licExpired = await dbFirst<{ n: number }>(db, `SELECT COUNT(*) as n FROM licenses WHERE status='expired'`);
  const clientTotal = await dbFirst<{ n: number }>(db, `SELECT COUNT(*) as n FROM clients`);
  const revenueRow = await dbFirst<{ total: number }>(
    db,
    `SELECT COALESCE(SUM(amount_usd),0) as total FROM invoices WHERE status='paid'`
  );
  const licenses = await dbQuery<any>(db, `
    SELECT l.*, c.name as client_name, c.email as client_email, c.organization
    FROM licenses l
    LEFT JOIN clients c ON c.id = l.client_id
    ORDER BY l.created_at DESC LIMIT 500
  `);

  return NextResponse.json({
    stats: {
      total: licTotal?.n || 0,
      active: licActive?.n || 0,
      expired: licExpired?.n || 0,
      clients: clientTotal?.n || 0,
      revenue: revenueRow?.total || 0,
    },
    licenses,
  });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, licenseId } = body;
  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
  const actor = (user as any)?.email || "";

  if (action === "suspend") {
    await dbRun(db, `UPDATE licenses SET status='suspended', updated_at=? WHERE id=?`, [now(), licenseId]);
    await auditLog(db, licenseId, "suspend", actor);
    return NextResponse.json({ success: true });
  }

  if (action === "reactivate") {
    await dbRun(db, `UPDATE licenses SET status='active', updated_at=? WHERE id=?`, [now(), licenseId]);
    await auditLog(db, licenseId, "reactivate", actor);
    return NextResponse.json({ success: true });
  }

  if (action === "revoke") {
    await dbRun(db, `UPDATE licenses SET status='revoked', updated_at=? WHERE id=?`, [now(), licenseId]);
    await auditLog(db, licenseId, "revoke", actor);
    return NextResponse.json({ success: true });
  }

  if (action === "reset_binding") {
    await dbRun(
      db,
      `UPDATE licenses SET bound_machine_id=NULL, reset_count=reset_count+1, updated_at=? WHERE id=?`,
      [now(), licenseId]
    );
    await auditLog(db, licenseId, "reset_binding", actor);
    return NextResponse.json({ success: true });
  }

  // ── ON / OFF switch ────────────────────────────────────────────────────────
  // Explicit enable/disable independent of the lifecycle status. "disable"
  // turns the license OFF (is_enabled=0 → validation refuses it exactly like a
  // suspension) without destroying its status/expiry; "enable" turns it back
  // ON. Survives expiry/renewal so an admin can pre-stage either state.
  if (action === "disable") {
    await dbRun(db, `UPDATE licenses SET is_enabled=0, updated_at=? WHERE id=?`, [now(), licenseId]);
    await auditLog(db, licenseId, "disable", actor);
    return NextResponse.json({ success: true, is_enabled: 0 });
  }

  if (action === "enable") {
    await dbRun(db, `UPDATE licenses SET is_enabled=1, updated_at=? WHERE id=?`, [now(), licenseId]);
    await auditLog(db, licenseId, "enable", actor);
    return NextResponse.json({ success: true, is_enabled: 1 });
  }

  // ── Toggle convenience (flips current on/off state) ──────────────────────────
  if (action === "toggle_enabled") {
    const lic = await dbFirst<any>(db, `SELECT is_enabled FROM licenses WHERE id=?`, [licenseId]);
    if (!lic) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const next = lic.is_enabled ? 0 : 1;
    await dbRun(db, `UPDATE licenses SET is_enabled=?, updated_at=? WHERE id=?`, [next, now(), licenseId]);
    await auditLog(db, licenseId, next ? "enable" : "disable", actor);
    return NextResponse.json({ success: true, is_enabled: next });
  }

  // ── Manual approval of an OWNED key, no portal account ───────────────────────
  // Marks an existing license as manually approved by an admin (the customer
  // already holds the key). Sets it active + enabled + flags it as a manual
  // grant, and — by design — does NOT create or require a users login row.
  if (action === "activate_manual") {
    const lic = await dbFirst<any>(db, `SELECT * FROM licenses WHERE id=?`, [licenseId]);
    if (!lic) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await dbRun(
      db,
      `UPDATE licenses
          SET status='active', is_enabled=1, activated_manually=1,
              manual_activated_at=?, updated_at=?
        WHERE id=?`,
      [now(), now(), licenseId]
    );
    await auditLog(db, licenseId, "manual_activate", actor, { previous_status: lic.status });
    return NextResponse.json({ success: true });
  }

  // ── Extend by MONTHS (existing behavior, now audited) ────────────────────────
  if (action === "extend") {
    const months = Number(body.months) || 12;
    const lic = await dbFirst<any>(db, `SELECT * FROM licenses WHERE id=?`, [licenseId]);
    if (!lic) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const oldExpiry = lic.expires_at;
    const base = new Date(lic.expires_at) > new Date() ? new Date(lic.expires_at) : new Date();
    base.setMonth(base.getMonth() + months);
    await dbRun(
      db,
      `UPDATE licenses SET expires_at=?, status='active', updated_at=? WHERE id=?`,
      [base.toISOString(), now(), licenseId]
    );
    await auditLog(db, licenseId, "extend", actor, { months, old_expiry: oldExpiry, new_expiry: base.toISOString() });
    return NextResponse.json({ success: true, expires_at: base.toISOString() });
  }

  // ── Add an exact number of DAYS to a license ─────────────────────────────────
  // Admin can top up any license by N days (e.g. +7, +30, +90). Counts from the
  // later of "now" and the current expiry, so adding days to an already-expired
  // license restarts from today; adding to an active one stacks on top. Also
  // re-activates an expired license. Bounded to [1, 3650] days for safety.
  if (action === "add_days") {
    const rawDays = Number(body.days);
    if (!Number.isFinite(rawDays) || rawDays === 0) {
      return NextResponse.json({ error: "days must be a non-zero number" }, { status: 400 });
    }
    const days = Math.trunc(rawDays);
    if (Math.abs(days) > 3650) {
      return NextResponse.json({ error: "days out of range (max 3650)" }, { status: 400 });
    }
    const lic = await dbFirst<any>(db, `SELECT * FROM licenses WHERE id=?`, [licenseId]);
    if (!lic) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const oldExpiry = lic.expires_at;
    // For positive days: base = max(now, current expiry). For negative (claw
    // back): base = current expiry (so we shorten the actual remaining term).
    const base = days > 0
      ? (new Date(lic.expires_at) > new Date() ? new Date(lic.expires_at) : new Date())
      : new Date(lic.expires_at);
    base.setDate(base.getDate() + days);
    const stillValid = base > new Date();
    await dbRun(
      db,
      `UPDATE licenses SET expires_at=?, status=?, updated_at=? WHERE id=?`,
      [base.toISOString(), stillValid ? "active" : "expired", now(), licenseId]
    );
    await auditLog(db, licenseId, "add_days", actor, { days, old_expiry: oldExpiry, new_expiry: base.toISOString() });
    return NextResponse.json({ success: true, expires_at: base.toISOString(), days_added: days });
  }

  if (action === "resend_email") {
    const lic = await dbFirst<any>(
      db,
      `SELECT l.*, c.name, c.email FROM licenses l JOIN clients c ON c.id=l.client_id WHERE l.id=?`,
      [licenseId]
    );
    if (!lic) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const pkgName = PACKAGE_INFO[lic.package_code]?.name || lic.package_code;
    await sendWelcomeEmail({
      to: lic.email,
      name: lic.name,
      licenseKey: lic.license_key,
      packageName: pkgName,
      expiresAt: lic.expires_at,
      product: lic.product,
    });
    return NextResponse.json({ success: true });
  }

  if (action === "create") {
    const {
      clientName, clientEmail, organization, packageCode,
      expiresMonths, licenseType, trialDays, trialWeeks, maxCpu, maxGpu,
      notes,
    } = body;
    if (!clientEmail || !packageCode) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // ── Resolve trial length ────────────────────────────────────────────────
    // trialWeeks (1–4) takes precedence and maps to 7/14/21/28 days. Otherwise
    // trialDays (1–28) is accepted. Default is 7 days (1 week) for a bare trial.
    const wantTrial = licenseType === "trial";
    let trialDayCount = 0;
    if (wantTrial) {
      const wk = Number(trialWeeks);
      if (wk && wk >= 1) {
        trialDayCount = Math.min(Math.max(Math.floor(wk), 1), 4) * 7;   // 1–4 weeks → 7–28 days
      } else {
        trialDayCount = Math.min(Math.max(Number(trialDays) || 7, 1), 28); // 1–28 days
      }
    }

    // ── Resolve term for non-trial licenses ─────────────────────────────────
    let resolvedMonths = Number(expiresMonths) || 12;
    if (licenseType === "lifetime" || licenseType === "per_instance") resolvedMonths = 12 * 100; // ~lifetime
    else if (licenseType === "monthly") resolvedMonths = 1;

    // ── Manual activation without a portal account ──────────────────────────
    const skipUser = body.skipUser === true || body.noUser === true;
    const pkgPrice = PACKAGE_INFO[packageCode]?.price ?? 0;
    const billingCycle: "yearly" | "monthly" = licenseType === "monthly" ? "monthly" : "yearly";

    let result;
    try {
      result = await createLicense({
        clientName: clientName || clientEmail,
        clientEmail,
        organization: organization || "",
        packageCode,
        licenseType: licenseType || "yearly",
        isTrial: wantTrial,
        ...(wantTrial ? { trialDays: trialDayCount } : { expiresMonths: resolvedMonths || 12 }),
        skipUser,
        manualActivation: true,   // every admin-issued key is a manual grant
        notes: [
          notes,
          licenseType ? `License type: ${licenseType}` : "",
          wantTrial ? `Trial: ${trialDayCount} days (${Math.round(trialDayCount / 7) || 1}w)` : "",
          skipUser ? "Manual activation (no user account)" : "",
          maxCpu ? `Custom CPU: ${maxCpu}` : "",
          maxGpu ? `Custom GPU: ${maxGpu}` : "",
        ].filter(Boolean).join(" | "),
        gateway: "manual",
        billingCycle,
        source: "admin",
        amountUsd: wantTrial
          ? 0
          : (licenseType === "monthly"
              ? (PACKAGE_INFO[packageCode]?.priceMonthly ?? pkgPrice)
              : pkgPrice),
      }, req);
    } catch (e: any) {
      // e.g. "Trial already used for legal" — surface as a clean 400, not a 500
      return NextResponse.json({ error: e?.message || "Failed to create license" }, { status: 400 });
    }

    await auditLog(db, (result.license as any).id, "create", actor, {
      package: packageCode,
      license_type: licenseType || "yearly",
      trial_days: wantTrial ? trialDayCount : undefined,
      skip_user: skipUser,
      manual: true,
    });

    // Email: default ON, but a no-account manual grant defaults to NOT emailing
    // unless the admin explicitly asks for it.
    const sendEmail = (body.sendEmail ?? body.sendEmailFlag) === true
      ? true
      : (body.sendEmail ?? body.sendEmailFlag) === false
        ? false
        : !skipUser; // unspecified → email only when an account exists
    if (sendEmail) {
      try {
        const pkgName = PACKAGE_INFO[packageCode]?.name || packageCode;
        await sendWelcomeEmail({
          to: clientEmail,
          name: clientName || clientEmail,
          licenseKey: result.licenseKey,
          packageName: pkgName,
          expiresAt: (result.license as any).expires_at,
          product: result.product,
        });
      } catch {}
    }
    return NextResponse.json({
      success: true,
      licenseKey: result.licenseKey,
      licenseId: (result.license as any).id,
      expiresAt: (result.license as any).expires_at,
      skipUser,
      emailed: sendEmail,
    });
  }

  if (action === "create_bundle") {
    const { clientName, clientEmail, guardianPackage, orchestraPackage, sendEmailFlag } = body;
    if (!clientEmail || !guardianPackage || !orchestraPackage) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const result = await createBundleLicenses({
      clientName: clientName || clientEmail,
      clientEmail,
      guardianPackage,
      orchestraPackage,
      gateway: "manual",
    }, req);
    if (sendEmailFlag !== false) {
      try {
        await sendBundleEmail({
          to: clientEmail,
          name: clientName || clientEmail,
          guardianKey: result.guardian.licenseKey,
          guardianPackage: PACKAGE_INFO[guardianPackage]?.name || guardianPackage,
          guardianExpiry: (result.guardian.license as any).expires_at,
          orchestraKey: result.orchestra.licenseKey,
          orchestraPackage: PACKAGE_INFO[orchestraPackage]?.name || orchestraPackage,
          orchestraExpiry: (result.orchestra.license as any).expires_at,
        });
      } catch {}
    }
    return NextResponse.json({
      success: true,
      guardianKey: result.guardian.licenseKey,
      orchestraKey: result.orchestra.licenseKey,
    });
  }

  if (action === "set_password") {
    const { targetEmail, newPassword } = body;
    if (!targetEmail || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Password min 8 chars" }, { status: 400 });
    }
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const keyMat = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(newPassword),
      { name: "PBKDF2" } as any,
      false,
      ["deriveBits"]
    );
    const saltArr = new Uint8Array(salt.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const derived = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltArr.buffer as unknown as ArrayBuffer,
        iterations: 100000,
        hash: "SHA-256",
      } as any,
      keyMat,
      256
    );
    const hash = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, "0")).join("");
    await dbRun(
      db,
      `UPDATE users SET password_hash=?, updated_at=? WHERE email=?`,
      [`pbkdf2:100000:${salt}:${hash}`, now(), targetEmail.toLowerCase()]
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
