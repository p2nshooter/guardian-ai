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
 * ============================================================================ */
import { NextRequest, NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth";

export const config = { matcher: ["/app/:path*", "/admin/:path*", "/app", "/admin"] };

export default async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
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
