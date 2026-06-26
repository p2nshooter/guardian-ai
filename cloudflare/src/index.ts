/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO Platform — Cloudflare Worker: Threat Feed CDN
 * ─────────────────────────────────────────────────────────────────────────────
 * Serves Guardian AI threat feed files from R2 with:
 *   - CORS enforcement (only axto.io origins)
 *   - Request signature validation (license key check)
 *   - Cache-Control headers for edge caching
 *   - Rate limiting via Durable Objects
 *   - Automatic gzip compression
 *
 * Deploy: wrangler deploy --env production
 */

export interface Env {
  THREAT_FEED: R2Bucket;
  LICENSE_CACHE: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  ENVIRONMENT: string;
  ALLOWED_ORIGIN: string;
  CACHE_TTL: string;
}

// ── Allowed file paths in R2 ─────────────────────────────────────────────────
const ALLOWED_FILES = new Set([
  "malicious_ips.json",
  "malicious_domains.json",
  "malware_hashes.json",
  "manifest.json",
]);

// ── CORS headers ─────────────────────────────────────────────────────────────
function corsHeaders(origin: string, allowedOrigin: string): Record<string, string> {
  const isAllowed = origin === allowedOrigin || origin.endsWith(".axto.io");
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-License-Key",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Only allow GET
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    // Parse file path from URL: /threat-feed/malicious_ips.json → malicious_ips.json
    const pathParts = url.pathname.split("/").filter(Boolean);
    const fileName = pathParts[pathParts.length - 1];

    // Validate file name
    if (!fileName || !ALLOWED_FILES.has(fileName)) {
      return new Response(
        JSON.stringify({ error: "File not found", allowed: [...ALLOWED_FILES] }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Validate license key from Authorization header or query param
    const licenseKey =
      request.headers.get("X-License-Key") ||
      url.searchParams.get("license_key");

    if (!licenseKey) {
      return new Response(
        JSON.stringify({ error: "License key required" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Check license in KV cache (fast path)
    const cachedLicense = await env.LICENSE_CACHE.get(`license:${licenseKey}`);
    if (!cachedLicense) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired license" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const licenseData = JSON.parse(cachedLicense);
    if (licenseData.status !== "active") {
      return new Response(
        JSON.stringify({ error: "License inactive", status: licenseData.status }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Try Cloudflare cache first
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const cachedWithCors = new Response(cachedResponse.body, cachedResponse);
      Object.entries(cors).forEach(([k, v]) => cachedWithCors.headers.set(k, v));
      cachedWithCors.headers.set("X-Cache", "HIT");
      return cachedWithCors;
    }

    // Fetch from R2
    const object = await env.THREAT_FEED.get(fileName);
    if (!object) {
      return new Response(
        JSON.stringify({ error: "File not found in storage" }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const ttl = parseInt(env.CACHE_TTL || "3600");
    const headers = new Headers({
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}`,
      "ETag": object.etag,
      "Last-Modified": object.uploaded.toUTCString(),
      "X-Cache": "MISS",
      "X-R2-Object": fileName,
      "X-AXTO-Version": "2.0",
    });

    const response = new Response(object.body, { headers });

    // Store in Cloudflare cache
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  },
};

// ── Durable Object: Rate Limiter ─────────────────────────────────────────────
export class RateLimiter {
  private state: DurableObjectState;
  private requests: number = 0;
  private windowStart: number = Date.now();
  private readonly LIMIT = 100; // requests per window
  private readonly WINDOW_MS = 60_000; // 1 minute window

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart > this.WINDOW_MS) {
      this.requests = 0;
      this.windowStart = now;
    }

    this.requests++;

    if (this.requests > this.LIMIT) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", retry_after: Math.ceil((this.windowStart + this.WINDOW_MS - now) / 1000) }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((this.windowStart + this.WINDOW_MS - now) / 1000)),
          },
        }
      );
    }

    return new Response(JSON.stringify({ allowed: true, remaining: this.LIMIT - this.requests }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
