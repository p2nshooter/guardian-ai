/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 * Small request/response helpers shared by every API route.
 * ============================================================================ */
import { NextRequest, NextResponse } from "next/server";
import { dbRun, now } from "./db";

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

export async function audit(db: any, actor: { sub?: string; email?: string } | null, action: string, entityType = "", entityId = "", meta: Record<string, unknown> = {}, req?: NextRequest): Promise<void> {
  await dbRun(db,
    `INSERT INTO audit_log (id, actor_id, actor_email, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [crypto.randomUUID(), actor?.sub || "system", actor?.email || "system", action, entityType, entityId,
     JSON.stringify(meta).slice(0, 4000), req ? ipOf(req) : "", req?.headers.get("user-agent")?.slice(0, 300) || "", now()]).catch(() => {});
}
