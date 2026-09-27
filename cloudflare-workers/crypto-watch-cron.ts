/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO (axto.io). All rights reserved.
 * Platform: AXTO (axto.io) — Sovereign AI Infrastructure.
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO — platform automation heartbeat (every minute).
 * Calls /api/cron/tick, which without any person:
 *   • confirms direct crypto payments on-chain → activates the plan and
 *     issues the licences immediately
 *   • hourly: renewal reminders, expiries, stale orders
 * The endpoint is idempotent and protected by CRON_SECRET.
 */

export interface Env {
  CRON_SECRET: string;
  APP_URL: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const base = env.APP_URL || "https://axto.io";
    if (!env.CRON_SECRET) {
      console.error("CRON_SECRET not configured — skipping automation tick");
      return;
    }
    try {
      const resp = await fetch(`${base}/api/cron/tick`, {
        headers: { "x-cron-secret": env.CRON_SECRET, "User-Agent": "AXTO-Automation/3.0" },
      });
      const body = await resp.text().catch(() => "");
      if (!resp.ok) console.error(`tick failed: HTTP ${resp.status} — ${body.slice(0, 500)}`);
      else console.log(`tick OK: ${body.slice(0, 500)}`);
    } catch (err) {
      console.error(`tick exception: ${err}`);
    }
  },
} satisfies ExportedHandler<Env>;
