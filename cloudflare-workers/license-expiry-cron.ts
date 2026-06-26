/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO — License Expiry Warning Cron Worker
 * Runs daily at 08:00 UTC — triggers /api/cron/expire-licenses
 * Handles: license expiry + warning emails at 30/14/7/3/1 days
 */

export interface Env {
  CRON_SECRET: string;
  APP_URL: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const url    = `${env.APP_URL || "https://axto.io"}/api/cron/expire-licenses`;
    const secret = env.CRON_SECRET;

    if (!secret) {
      console.error("CRON_SECRET not configured — skipping");
      return;
    }

    try {
      const resp = await fetch(url, {
        method:  "GET",
        headers: { "x-cron-secret": secret, "User-Agent": "AXTO-Cron/1.0" },
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        console.error(`License expiry cron failed: HTTP ${resp.status} — ${body}`);
        return;
      }

      const result = await resp.json() as {
        ok: boolean;
        expired: number;
        warnings_sent: number;
        errors: string[];
        summary: string;
      };

      console.log(`License expiry cron OK: ${result.summary}`);
      if (result.errors?.length) {
        console.warn(`Errors: ${result.errors.join(", ")}`);
      }
    } catch (err) {
      console.error(`License expiry cron exception: ${err}`);
    }
  },
} satisfies ExportedHandler<Env>;
