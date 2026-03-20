import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/api/admin/:path*", "/api/portal/:path*"],
};

const COOKIE_NAME = "axto_session";

function b64urlDecode(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad.padEnd(pad.length + (4 - pad.length % 4) % 4, "="));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function quickVerify(token: string): Promise<{ sub: string; email: string; role: string; exp: number } | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;

    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" } as any, false, ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC" as any, key, b64urlDecode(sig).buffer as unknown as ArrayBuffer,
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(COOKIE_NAME)?.value;

  if (!cookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/auth/login", req.url);
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  const user = await quickVerify(cookie);
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }
    const login = new URL("/auth/login", req.url);
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  // Admin routes require admin role
  if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && user.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  return NextResponse.next();
}
