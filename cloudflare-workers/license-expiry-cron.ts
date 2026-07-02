/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO — License Expiry Warning Cron Worker
 * Runs daily at 08:00 UTC — triggers /api/cron/expire-licenses
 * Handles: license expiry + warning emails at 30/14/3 days (matches the
 * landing-page FAQ promise — see WARNING_DAYS in that route).
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

      // Matches the actual shape returned by /api/cron/expire-licenses.
      const result = await resp.json() as {
        ok: boolean;
        expired: number;
        warnings_sent: number;
      };

      console.log(`License expiry cron OK: ${result.expired} expired, ${result.warnings_sent} warnings sent`);
    } catch (err) {
      console.error(`License expiry cron exception: ${err}`);
    }
  },
} satisfies ExportedHandler<Env>;
