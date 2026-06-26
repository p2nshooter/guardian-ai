/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO (axto.io). All rights reserved.
 * Platform: AXTO (axto.io) — Sovereign AI Infrastructure.
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO — Crypto Payment Watcher Cron Worker
 * Runs every minute. Triggers the on-chain settlement watchers so that a
 * client's Smart License is issued automatically, with no manual step, as soon
 * as their crypto payment confirms on-chain:
 *   • /api/cron/crypto-watch  (USDT-TRC20, BNB, ETH, BTC)
 *   • /api/cron/usdt-watch    (USDT-TRC20 dedicated watcher)
 * Both endpoints are idempotent and secured by CRON_SECRET.
 */

export interface Env {
  CRON_SECRET: string;
  APP_URL: string;
}

const ENDPOINTS = ["/api/cron/crypto-watch", "/api/cron/usdt-watch"];

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const base = env.APP_URL || "https://axto.io";
    const secret = env.CRON_SECRET;
    if (!secret) {
      console.error("CRON_SECRET not configured — skipping crypto watch");
      return;
    }

    for (const path of ENDPOINTS) {
      try {
        const resp = await fetch(`${base}${path}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${secret}`, "User-Agent": "AXTO-CryptoWatch/1.0" },
        });
        if (!resp.ok) {
          const body = await resp.text().catch(() => "");
          console.error(`crypto watch ${path} failed: HTTP ${resp.status} — ${body}`);
          continue;
        }
        const r = await resp.json().catch(() => ({}));
        console.log(`crypto watch ${path} OK: ${JSON.stringify(r)}`);
      } catch (err) {
        console.error(`crypto watch ${path} exception: ${err}`);
      }
    }
  },
} satisfies ExportedHandler<Env>;
