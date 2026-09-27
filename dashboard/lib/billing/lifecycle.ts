/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Subscription lifecycle housekeeping (hourly via /api/cron/tick, and the
 * legacy daily /api/cron/expire-licenses):
 *   • renewal reminders 7 / 3 / 1 days before a plan ends (once per day max)
 *   • plans past their end date → expired; their self-hosted licences suspended
 *   • unpaid orders older than 3 days → expired
 * ============================================================================ */
import { dbQuery, dbRun, now } from "../db";
import { syncLicenses } from "./activate";
import { PLANS, isPlanId } from "../plans";
import { sendMail, mails } from "../mail";

export async function runHousekeeping(db: any): Promise<{ expired: number; warnings_sent: number }> {
  const nowIso = now();
  const today = nowIso.slice(0, 10);
  let warnings = 0;

  const soon = await dbQuery<{ user_id: string; plan: string; current_period_end: string; reminded_at: string; email: string }>(db,
    `SELECT s.user_id, s.plan, s.current_period_end, s.reminded_at, u.email
       FROM subscriptions s JOIN users u ON u.id = s.user_id
      WHERE s.status = 'active' AND s.current_period_end > ? AND s.current_period_end <= ?`,
    [nowIso, new Date(Date.now() + 7.5 * 86_400_000).toISOString()]);
  for (const r of soon) {
    const days = Math.ceil((Date.parse(r.current_period_end) - Date.now()) / 86_400_000);
    if (![7, 3, 1].includes(days) || r.reminded_at.slice(0, 10) === today || !isPlanId(r.plan)) continue;
    const m = mails.renewalReminder({ planName: PLANS[r.plan].name, days, until: r.current_period_end.slice(0, 10) });
    if (await sendMail(r.email, m.subject, m.html)) warnings++;
    await dbRun(db, `UPDATE subscriptions SET reminded_at = ? WHERE user_id = ?`, [nowIso, r.user_id]);
  }

  const ended = await dbQuery<{ user_id: string; current_period_end: string }>(db,
    `SELECT user_id, current_period_end FROM subscriptions WHERE status = 'active' AND current_period_end <= ?`, [nowIso]);
  for (const r of ended) {
    await dbRun(db, `UPDATE subscriptions SET status = 'expired', updated_at = ? WHERE user_id = ?`, [nowIso, r.user_id]);
    await syncLicenses(db, r.user_id, "none", r.current_period_end);
  }

  await dbRun(db, `UPDATE orders SET status = 'expired' WHERE status = 'pending' AND created_at < ?`,
    [new Date(Date.now() - 3 * 86_400_000).toISOString()]);

  return { expired: ended.length, warnings_sent: warnings };
}
