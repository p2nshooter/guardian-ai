/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Subscription lifecycle housekeeping (hourly via /api/cron/tick, and the
 * legacy daily /api/cron/expire-licenses):
 *   • renewal reminders 7 / 3 / 1 days before a plan ends (once per day max)
 *   • plans past their end date → expired; their self-hosted licences suspended
 *   • unpaid orders older than 3 days → expired
 * ============================================================================ */
import { now } from "../db";
import type { Data } from "../data";
import { syncLicenses } from "./activate";
import { GATEWAYS } from "./gateways";
import { PLANS, isPlanId } from "../plans";
import { sendMail, mails } from "../mail";

/** Every subscription's summary (the "all" index: no document reads). */
async function subscriptionSummaries(db: Data): Promise<{ user_id: string; plan: string; status: string; current_period_end: string; reminded_at: string }[]> {
  const out: { user_id: string; plan: string; status: string; current_period_end: string; reminded_at: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await db.subscriptions.list("all", "all", { cursor, limit: 1000 });
    for (const e of page.entries) out.push({ user_id: String(e.meta.user_id || e.id), plan: String(e.meta.plan || ""), status: String(e.meta.status || ""), current_period_end: String(e.meta.current_period_end || ""), reminded_at: String(e.meta.reminded_at || "") });
    cursor = page.cursor;
  } while (cursor);
  return out;
}

export async function runHousekeeping(db: Data): Promise<{ expired: number; warnings_sent: number; orders_expired: number }> {
  const nowIso = now();
  const today = nowIso.slice(0, 10);
  const horizon = new Date(Date.now() + 7.5 * 86_400_000).toISOString();
  let warnings = 0;
  const subs = await subscriptionSummaries(db);

  for (const r of subs.filter((x) => x.status === "active" && x.current_period_end > nowIso && x.current_period_end <= horizon)) {
    const days = Math.ceil((Date.parse(r.current_period_end) - Date.now()) / 86_400_000);
    if (![7, 3, 1].includes(days) || r.reminded_at.slice(0, 10) === today || !isPlanId(r.plan)) continue;
    // Claimed per day with compare-and-swap, so two cron runs never send the same reminder twice.
    let mine = false;
    await db.subscriptions.update(r.user_id, (s) => {
      mine = s.reminded_at.slice(0, 10) !== today;
      return mine ? { ...s, reminded_at: nowIso } : null;
    }).catch(() => null);
    if (!mine) continue;
    const u = await db.users.get(r.user_id);
    if (!u) continue;
    const m = mails.renewalReminder({ planName: PLANS[r.plan].name, days, until: r.current_period_end.slice(0, 10) });
    if (await sendMail(u.email, m.subject, m.html)) warnings++;
  }

  let expired = 0;
  for (const r of subs.filter((x) => x.status === "active" && x.current_period_end <= nowIso)) {
    let ended = false;
    const s = await db.subscriptions.update(r.user_id, (cur) => {
      ended = cur.status === "active" && cur.current_period_end <= nowIso;
      return ended ? { ...cur, status: "expired", updated_at: nowIso } : null;
    }).catch(() => null);
    if (!ended || !s) continue;
    expired++;
    await syncLicenses(db, r.user_id, "none", s.current_period_end);
  }

  // Unpaid orders older than 3 days.
  const cutoff = new Date(Date.now() - 3 * 86_400_000).toISOString();
  let ordersExpired = 0;
  for (const g of GATEWAYS) {
    // The pending index is oldest first: stop at the first order young enough to stay open.
    let cursor: string | undefined;
    let more = true;
    while (more) {
      const page = await db.orders.list("pending", g.id, { cursor, limit: 200 });
      for (const e of page.entries) {
        if (String(e.meta.created_at || "") >= cutoff) { more = false; break; }
        let won = false;
        await db.orders.update(e.id, (o) => {
          won = o.status === "pending" && o.created_at < cutoff;
          return won ? { ...o, status: "expired" } : null;
        }).catch(() => null);
        if (won) ordersExpired++;
      }
      cursor = page.cursor;
      if (!cursor) more = false;
    }
  }

  return { expired, warnings_sent: warnings, orders_expired: ordersExpired };
}
