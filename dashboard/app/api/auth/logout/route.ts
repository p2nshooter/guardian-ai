import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "edge";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  return clearSessionCookie(res);
}

export async function GET() {
  const res = NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL || "https://axto.io"));
  return clearSessionCookie(res);
}
