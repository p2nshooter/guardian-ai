import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken, signJWT, setSessionCookie } from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function isSafeRedirect(redirect: string): boolean {
  if (!redirect.startsWith("/")) return false;
  if (redirect.startsWith("//")) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const rawRedirect = url.searchParams.get("redirect") || "/portal";
  const redirect = isSafeRedirect(rawRedirect) ? rawRedirect : "/portal";

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_token", req.url));
  }

  let user;
  try { user = await verifyMagicToken(token, req); } catch (e: any) {
    console.error("[AUTH CALLBACK] verifyMagicToken error:", e.message);
    return NextResponse.redirect(new URL("/auth/login?error=server_error", req.url));
  }

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login?error=invalid_or_expired", req.url));
  }

  try {
    const jwt = await signJWT({ sub: user.id, email: user.email, role: user.role });
    let finalRedirect = redirect;
    if (redirect === "/portal" && user.role === "admin") finalRedirect = "/admin";
    const res = NextResponse.redirect(new URL(finalRedirect, req.url));
    return setSessionCookie(res, jwt);
  } catch (e: any) {
    console.error("[AUTH CALLBACK] signJWT error:", e.message);
    return NextResponse.redirect(new URL("/auth/login?error=server_error", req.url));
  }
}
