/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 * Small request/response helpers shared by every API route.
 * ============================================================================ */
import { NextRequest, NextResponse } from "next/server";
import { now } from "./db";
import type { Data } from "./data";

export async function readJson<T = any>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function fail(message: string, status = 400, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function ok(data: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ ok: true, ...data });
}

export function ipOf(req: NextRequest): string {
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

export function str(v: unknown, max = 500): string {
  return String(v ?? "").trim().slice(0, max);
}

/** Append an entry to the admin audit log (never blocks the action it records). */
export async function audit(db: Data, actor: { sub?: string; email?: string } | null, action: string, entityType = "", entityId = "", meta: Record<string, unknown> = {}, req?: NextRequest): Promise<void> {
  await db.audit.create({
    id: crypto.randomUUID(), actor_id: actor?.sub || "system", actor_email: actor?.email || "system", action,
    entity_type: entityType, entity_id: entityId, metadata: JSON.stringify(meta).slice(0, 4000),
    ip_address: req ? ipOf(req) : "", user_agent: req?.headers.get("user-agent")?.slice(0, 300) || "", created_at: now(),
  }).catch(() => {});
}
