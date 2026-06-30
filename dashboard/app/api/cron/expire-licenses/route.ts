/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, now } from "@/lib/db";
import { sendRenewalReminderEmail } from "@/lib/email";
import { PACKAGE_INFO } from "@/lib/stripe";

// Matches the landing-page FAQ promise: "Automated renewal reminders sent
// at 30, 14, and 3 days before expiry."
const WARNING_DAYS = [30, 14, 3];

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let db: any;

  try { db = getDB(req); } catch {

    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });

  }
  const expired = await dbQuery<any>(db, `SELECT id FROM licenses WHERE status='active' AND expires_at < datetime('now')`);
  let count = 0;
  for (const lic of expired) { await dbRun(db, `UPDATE licenses SET status='expired', updated_at=? WHERE id=?`, [now(), lic.id]); count++; }

  // ── Renewal warnings for licenses expiring within 30 days ────────────────
  const soon = await dbQuery<any>(db, `
    SELECT l.id, l.license_key, l.expires_at, l.package_code, l.warning_sent_days, c.email, c.name
      FROM licenses l JOIN clients c ON c.id = l.client_id
     WHERE l.status = 'active'
       AND l.expires_at >= datetime('now') AND l.expires_at <= datetime('now', '+30 days')`);

  let warnings = 0;
  for (const lic of soon) {
    const daysLeft = Math.ceil((Date.parse(lic.expires_at) - Date.now()) / 86_400_000);
    let sentDays: number[] = [];
    try { sentDays = JSON.parse(lic.warning_sent_days || "[]"); } catch { sentDays = []; }

    const due = WARNING_DAYS.find(w => daysLeft <= w && !sentDays.includes(w));
    if (due === undefined) continue;

    try {
      await sendRenewalReminderEmail({
        to: lic.email, name: lic.name || lic.email, licenseKey: lic.license_key,
        packageName: PACKAGE_INFO[lic.package_code]?.name || lic.package_code,
        expiresAt: lic.expires_at, daysLeft,
      });
      sentDays.push(due);
      await dbRun(db, `UPDATE licenses SET warning_sent_days=?, updated_at=? WHERE id=?`, [JSON.stringify(sentDays), now(), lic.id]);
      warnings++;
    } catch { /* email send failed — left unmarked, retried on next run */ }
  }

  return NextResponse.json({ ok: true, expired: count, warnings_sent: warnings });
}
