/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ═══════════════════════════════════════════════════════════════════════════
// AXTO Platform — lib/rate-limit.ts
// Generic fixed-window rate limiter backed by Cloudflare KV (binding "KV",
// already provisioned in wrangler.toml). Used to throttle abuse of public,
// unauthenticated endpoints such as /api/license-validate where the existing
// D1-backed login_attempts approach (see lib/auth.ts) would add unnecessary
// write load for a high-frequency endpoint that on-prem engines call on
// every heartbeat (default every 30 minutes per node, but configurable by
// whoever is running the client).
//
// Fails OPEN if the KV binding itself is unreachable (treated as an infra
// fault, not a security boundary) so a KV outage cannot become an
// availability outage for legitimate customers. The real security boundary
// for license-validate is the signed-response + offline-grace design in
// license-signing.ts and every product's license.py — rate limiting here is
// defense-in-depth against brute-force / enumeration / volumetric abuse,
// not the primary control.
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest } from "next/server";
import { getKV } from "@/lib/db";

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function rateLimit(
  req: NextRequest,
  bucket: string,
  identifier: string,
  opts: { max: number; windowSeconds: number }
): Promise<RateLimitResult> {
  const safeId = (identifier || "unknown").slice(0, 200);

  let kv: any;
  try {
    kv = getKV(req);
  } catch {
    // KV binding missing — fail open, log nothing sensitive, do not block.
    return { limited: false, remaining: opts.max, retryAfterSeconds: 0 };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const windowId = Math.floor(nowSec / opts.windowSeconds);
  const key = `rl:${bucket}:${safeId}:${windowId}`;

  let current = 0;
  try {
    const raw = await kv.get(key);
    current = raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    current = 0;
  }

  if (current >= opts.max) {
    const secsIntoWindow = nowSec % opts.windowSeconds;
    return {
      limited: true,
      remaining: 0,
      retryAfterSeconds: opts.windowSeconds - secsIntoWindow,
    };
  }

  try {
    await kv.put(key, String(current + 1), { expirationTtl: opts.windowSeconds + 10 });
  } catch {
    // Best-effort counter write — never fail the request because of it.
  }

  return { limited: false, remaining: opts.max - current - 1, retryAfterSeconds: 0 };
}

/** Convenience helper: extracts the best-effort client IP from CF headers. */
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
