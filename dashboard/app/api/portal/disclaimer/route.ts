/* ==============================================================================
 * GET  /api/portal/disclaimer?lang=en|id  — current disclaimer + my acceptance
 * POST /api/portal/disclaimer             — record my acceptance of the current
 *                                           version (required before app use)
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DISCLAIMER, DISCLAIMER_VERSION, type DisclaimerLang } from "@/lib/disclaimer";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

async function hasAcceptedCurrent(db: any, email: string): Promise<boolean> {
  try {
    const row = await db.prepare(
      "SELECT id FROM disclaimer_acceptances WHERE user_email = ? AND version = ? LIMIT 1",
    ).bind(email, DISCLAIMER_VERSION).first();
    return !!row;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const lang = (new URL(req.url).searchParams.get("lang") === "id" ? "id" : "en") as DisclaimerLang;
  const accepted = await hasAcceptedCurrent(getDB(req), (user as any).email);
  return NextResponse.json({
    version: DISCLAIMER_VERSION,
    accepted,
    disclaimer: DISCLAIMER[lang],
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.agree !== true) return NextResponse.json({ error: "you must explicitly agree" }, { status: 400 });

  const db = getDB(req);
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "";
  const ua = req.headers.get("user-agent") || "";
  await db.prepare(
    "INSERT INTO disclaimer_acceptances (id, user_email, version, product, accepted_at, ip, user_agent) VALUES (?, ?, ?, 'all', ?, ?, ?)",
  ).bind(uid("disc"), (user as any).email, DISCLAIMER_VERSION, new Date().toISOString(), ip, ua).run();

  return NextResponse.json({ ok: true, version: DISCLAIMER_VERSION, acceptedAt: new Date().toISOString() });
}
