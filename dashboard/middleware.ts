/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * Page guard for the two portals. API routes authorise themselves (they need
 * the plan, not just a login), so this only redirects browsers:
 *   /app/*   → signed-in members & admins
 *   /admin/* → admins only
 * And while the one-time move of the records from D1 to R2 runs (minutes,
 * once), every API answers 503 with a clear message instead of failing —
 * except health and the cron/migration endpoints that drive the move.
 * ============================================================================ */
import { NextRequest, NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth";
import { dataReady } from "@/lib/db";
import { MaintenanceError } from "@/lib/data/migrate";

export const config = { matcher: ["/app/:path*", "/admin/:path*", "/app", "/admin", "/api/:path*"] };

const DRIVES_THE_MOVE = /^\/api\/(health|cron)(\/|$)/;

export default async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    if (DRIVES_THE_MOVE.test(pathname) || (await dataReady(req).catch(() => true))) return NextResponse.next();
    return NextResponse.json({ error: new MaintenanceError().message, maintenance: true }, { status: 503, headers: { "Retry-After": "20", "Cache-Control": "no-store" } });
  }
  const s = await verifySession(req.cookies.get(COOKIE_NAME)?.value).catch(() => null);
  if (!s) {
    const login = new URL("/login", req.url);
    login.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(login);
  }
  if (pathname.startsWith("/admin") && s.role !== "admin") return NextResponse.redirect(new URL("/app", req.url));
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
