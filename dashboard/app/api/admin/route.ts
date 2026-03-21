export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendWelcomeEmail, sendBundleEmail } from "@/lib/email";
import { PACKAGE_INFO } from "@/lib/stripe";
import { createLicense, createBundleLicenses } from "@/lib/license";


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

  if (action === "suspend") {
    await dbRun(db, `UPDATE licenses SET status='suspended', updated_at=? WHERE id=?`, [now(), licenseId]);
    return NextResponse.json({ success: true });
  }

  if (action === "reactivate") {
    await dbRun(db, `UPDATE licenses SET status='active', updated_at=? WHERE id=?`, [now(), licenseId]);
    return NextResponse.json({ success: true });
  }

  if (action === "revoke") {
    await dbRun(db, `UPDATE licenses SET status='revoked', updated_at=? WHERE id=?`, [now(), licenseId]);
    return NextResponse.json({ success: true });
  }

  if (action === "reset_binding") {
    await dbRun(
      db,
      `UPDATE licenses SET bound_machine_id=NULL, reset_count=reset_count+1, updated_at=? WHERE id=?`,
      [now(), licenseId]
    );
    return NextResponse.json({ success: true });
  }

  if (action === "extend") {
    const months = Number(body.months) || 12;
    const lic = await dbFirst<any>(db, `SELECT * FROM licenses WHERE id=?`, [licenseId]);
    if (!lic) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const base = new Date(lic.expires_at) > new Date() ? new Date(lic.expires_at) : new Date();
    base.setMonth(base.getMonth() + months);
    await dbRun(
      db,
      `UPDATE licenses SET expires_at=?, status='active', updated_at=? WHERE id=?`,
      [base.toISOString(), now(), licenseId]
    );
    return NextResponse.json({ success: true });
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
      expiresMonths, licenseType, trialDays, maxCpu, maxGpu,
      notes, sendEmailFlag
    } = body;
    if (!clientEmail || !packageCode) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Calculate expiry
    let resolvedMonths = Number(expiresMonths) || 12;
    if (licenseType === "trial") {
      const days = Math.min(Math.max(Number(trialDays) || 3, 1), 7);
      resolvedMonths = 0; // handled via days below
      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + days);
      // Override: pass expires via notes for trial
    } else if (licenseType === "lifetime" || licenseType === "per_instance") {
      resolvedMonths = 12 * 100; // 100 years
    } else if (licenseType === "monthly") {
      resolvedMonths = 1;
    }

    // For trial: calculate days-based expiry
    let finalExpiresMonths = resolvedMonths;
    if (licenseType === "trial") {
      const days = Math.min(Math.max(Number(trialDays) || 3, 1), 7);
      // Approximate: use fractional months
      finalExpiresMonths = days / 30;
      if (finalExpiresMonths < 0.033) finalExpiresMonths = 0.033; // min 1 day
    }

    const pkgPrice = PACKAGE_INFO[packageCode]?.price ?? 0;
    const result = await createLicense({
      clientName: clientName || clientEmail,
      clientEmail,
      organization: organization || "",
      packageCode,
      expiresMonths: finalExpiresMonths || 12,
      notes: [
        notes,
        licenseType ? `License type: ${licenseType}` : "",
        licenseType === "trial" ? `Trial: ${trialDays || 3} days` : "",
        maxCpu ? `Custom CPU: ${maxCpu}` : "",
        maxGpu ? `Custom GPU: ${maxGpu}` : "",
      ].filter(Boolean).join(" | "),
      gateway: "manual",
      amountUsd: pkgPrice,
    }, req);

    if (sendEmailFlag !== false) {
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
    return NextResponse.json({ success: true, licenseKey: result.licenseKey });
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
