/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO — Cloudflare Worker: Threat Feed Proxy
 * Route: threat-feed.axto.io -> R2 bucket
 *
 * - Validates license key against Dashboard API (CF Pages)
 * - KV cache 5-min untuk hasil validasi
 * - Aggressive edge caching
 * - CORS headers for Guardian engine nodes
 */

const ALLOWED_FILES = ["malicious_domains.json","malicious_ips.json","malware_hashes.json"];
const CACHE_TTL = 3600;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD",
        "Access-Control-Allow-Headers": "X-License-Key",
        "Access-Control-Max-Age": "86400",
      }});
    }

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", region: request.cf?.colo ?? "unknown" });
    }

    const filename = url.pathname.replace(/^\//, "");
    if (!ALLOWED_FILES.includes(filename)) {
      return new Response("Not Found", { status: 404 });
    }

    const licenseKey = request.headers.get("X-License-Key") ?? url.searchParams.get("license");
    if (!licenseKey) return Response.json({ error: "Missing X-License-Key" }, { status: 401 });

    // License check via KV cache (5 min TTL)
    const cacheKey = `license:${licenseKey}`;
    let valid = await env.LICENSE_KV?.get(cacheKey);
    if (!valid) {
      // Validate against AXTO Dashboard (CF Pages)
      const dashUrl = env.DASHBOARD_URL || "https://axto.io";
      const res = await fetch(`${dashUrl}/api/license-validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: licenseKey }),
      });
      const data = await res.json();
      valid = data.valid ? "1" : "0";
      await env.LICENSE_KV?.put(cacheKey, valid, { expirationTtl: 300 });
    }
    if (valid !== "1") return Response.json({ error: "Invalid or expired license" }, { status: 403 });

    // Cloudflare edge cache
    const cache = caches.default;
    const cacheReq = new Request(`${url.origin}/${filename}`);
    let response = await cache.match(cacheReq);

    if (!response) {
      const obj = await env.THREAT_FEED_BUCKET.get(filename);
      if (!obj) return new Response("Feed file not found", { status: 404 });
      response = new Response(obj.body, { headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL}`,
        "X-Feed-Updated": obj.uploaded.toISOString(),
        "X-Cache": "MISS",
        "Access-Control-Allow-Origin": "*",
      }});
      await cache.put(cacheReq, response.clone());
    }

    return response;
  }
};
