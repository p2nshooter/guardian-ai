/* AXTO — POST /api/auth/logout */
export const runtime = "edge";
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  return clearSessionCookie(NextResponse.json({ ok: true }));
}
