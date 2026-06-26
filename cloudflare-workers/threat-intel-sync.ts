/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// AXTO Threat Intelligence Sync Worker
// Syncs threat feeds from NVD, abuse.ch, OTX to R2
// Triggers: every 6 hours

export default {
  async scheduled(event, env, ctx) {
    const feeds = [
      { name: "abuse_ch_malware", url: "https://bazaar.abuse.ch/export/json/recent/" },
      { name: "abuse_ch_feodo", url: "https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json" },
    ];

    for (const feed of feeds) {
      try {
        const res = await fetch(feed.url, { headers: { "User-Agent": "AXTO-ThreatFeed/2.0" } });
        if (res.ok) {
          const data = await res.text();
          await env.THREAT_FEED.put(`feeds/${feed.name}.json`, data, {
            httpMetadata: { contentType: "application/json" },
          });
          console.log(`[ThreatIntel] Synced ${feed.name}: ${data.length} bytes`);
        }
      } catch (err) {
        console.error(`[ThreatIntel] Failed ${feed.name}:`, err.message);
      }
    }
  },

  async fetch(request, env) {
    return new Response("Threat Intel sync worker is running.", { status: 200 });
  },
};
