/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * GET /api/cron/tick — the platform's heartbeat (Worker "axto-crypto-watch-cron",
 * every minute; header x-cron-secret or Bearer). Everything that must happen
 * without a person:
 *   first        the one-time move of the records from D1 to R2, a step per tick
 *                until it is done (nothing else runs before it is)
 *   every tick   confirm direct crypto payments on-chain → plan + licences;
 *                retry due Connect webhook deliveries; the next slice of the
 *                daily backup; the first trial pool, until it is complete; the
 *                licence auction (open this cycle's lots, close ended ones, pass
 *                unpaid wins on — lib/auction.ts); the site-sale auction (open
 *                the first round, close an ended one, open the next after an
 *                unsold one — lib/sale-auction.ts); the daily LinkedIn posts of
 *                axto.io and xaa.es once their time has come (lib/linkedin)
 *   hourly       renewal reminders, expiries, stale orders (lib/billing/lifecycle);
 *                Connect events past the retention period are deleted; the
 *                LinkedIn token is refreshed (or the admin reminded) before it ends;
 *                affiliate commissions mature and the month's payouts are made
 * Storage-lean: the hourly marker is one setting, claimed with compare-and-swap
 * so overlapping ticks never run the hourly work twice.
 * ============================================================================ */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, getEnv, dataReady, now } from "@/lib/db";
import { cronAuthorized } from "@/lib/cron";
import { watchCryptoOrders } from "@/lib/billing/crypto-watch";
import { runHousekeeping } from "@/lib/billing/lifecycle";
import { retryDue } from "@/lib/connect/webhooks";
import { pruneEvents } from "@/lib/connect/events";
import { getConnectSettings } from "@/lib/connect/settings";
import { backupStep } from "@/lib/data/backup-job";
import { ensureTrialPool, getTrialConfig, TRIAL_BATCH_MAX } from "@/lib/trials";
import { auctionTick } from "@/lib/auction";
import { linkedinTick, linkedinMaintenance } from "@/lib/linkedin/autopost";
import { saleAuctionTick } from "@/lib/sale-auction";
import { affiliateTick } from "@/lib/affiliate";
import { gatewayCreds } from "@/lib/billing/gateways";
import { paypalPayout } from "@/lib/billing/providers";
import { decryptJson } from "@/lib/secure-store";

const HOURLY_MS = 55 * 60_000;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = { ok: true, at: now() };
  if (!(await dataReady(req))) return NextResponse.json({ ...out, migrating: true });
  const db = getData(req);
  const env = getEnv(req);
  try { out.crypto = await watchCryptoOrders(db); } catch (e: any) { out.crypto = { error: String(e?.message || e) }; }
  try { out.webhooks = await retryDue(db); } catch (e: any) { out.webhooks = { error: String(e?.message || e) }; }
  if (env.BACKUPS) {
    try { out.backup = await backupStep(env.DATA, db.store, env.BACKUPS); } catch (e: any) { out.backup = { error: String(e?.message || e) }; }
  }
  try {
    const cfg = await getTrialConfig(db);
    if (cfg.enabled) out.trialPool = await ensureTrialPool(db, cfg, TRIAL_BATCH_MAX);
  } catch (e: any) { out.trialPool = { error: String(e?.message || e) }; }
  try { out.auction = await auctionTick(db); } catch (e: any) { out.auction = { error: String(e?.message || e) }; }
  try { out.siteAuction = await saleAuctionTick(db); } catch (e: any) { out.siteAuction = { error: String(e?.message || e) }; }
  // Two LinkedIn posts a day (axto.io, xaa.es); the images are read from this site's own public folder.
  try { out.linkedin = await linkedinTick(db, { fetch, origin: new URL(req.url).origin }); } catch (e: any) { out.linkedin = { error: String(e?.message || e) }; }

  const force = new URL(req.url).searchParams.get("hourly") === "1";
  let hourly = false;
  await db.store.updateDoc<{ value: string; updated_at: string } | null>("config/cron_hourly_at", null, (cur) => {
    // Decided on every run of the compare-and-swap: only one tick per hour wins.
    hourly = force || !cur?.value || Date.now() - Date.parse(cur.value) > HOURLY_MS;
    return hourly ? { value: now(), updated_at: now() } : null;
  });
  if (hourly) {
    try { out.housekeeping = await runHousekeeping(db); } catch (e: any) { out.housekeeping = { error: String(e?.message || e) }; }
    try { out.connectPruned = await pruneEvents(db, (await getConnectSettings(db)).retentionDays); } catch (e: any) { out.connectPruned = { error: String(e?.message || e) }; }
    try { out.linkedinToken = await linkedinMaintenance(db, { fetch }); } catch (e: any) { out.linkedinToken = { error: String(e?.message || e) }; }
    // Affiliate commissions leave the refund window; from the 5th, the month's payouts (BUSINESS-MASTER-BLUEPRINT §7.4).
    try {
      const pp = await gatewayCreds(db, "paypal").catch(() => null);
      out.affiliate = await affiliateTick(db, { decrypt: decryptJson, paypal: pp ? (p) => paypalPayout(pp, p) : undefined });
    } catch (e: any) { out.affiliate = { error: String(e?.message || e) }; }
  }
  return NextResponse.json(out);
}
