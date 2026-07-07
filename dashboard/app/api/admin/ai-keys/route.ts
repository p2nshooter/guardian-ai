/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Admin · AI Provider Key Vault
 *   GET  /api/admin/ai-keys              — list (filter by ?provider= / ?category=)
 *   POST /api/admin/ai-keys              — { action: create|update|delete, ... }
 * Encrypted at rest (AES-256-GCM, same ENCRYPTION_KEY as payment_gateways).
 * The raw key value is NEVER returned once saved — only whether it's set.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbFirst, dbRun, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { encryptObj } from "@/lib/gateway-crypto";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") || "";
  const category = url.searchParams.get("category") || "";

  const where: string[] = [];
  const binds: any[] = [];
  if (provider) { where.push("provider = ?"); binds.push(provider); }
  if (category) { where.push("category = ?"); binds.push(category); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const rows = await dbQuery<any>(
      db,
      `SELECT id, provider, key_name, category, purpose, for_managed_pool, is_active, created_at, updated_at
       FROM ai_provider_keys ${whereSql} ORDER BY provider, key_name`,
      binds
    );
    const providers = await dbQuery<any>(db, `SELECT DISTINCT provider FROM ai_provider_keys ORDER BY provider`);
    const categories = await dbQuery<any>(db, `SELECT DISTINCT category FROM ai_provider_keys WHERE category != '' ORDER BY category`);
    return NextResponse.json({
      keys: rows,
      providers: providers.map((p: any) => p.provider),
      categories: categories.map((c: any) => c.category),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  const { action } = body;

  try {
    if (action === "create") {
      const { provider, keyName, category, purpose, value, forManagedPool } = body;
      if (!provider || !keyName || !value) {
        return NextResponse.json({ error: "provider, keyName, and value are required" }, { status: 400 });
      }
      let valueEnc: string;
      try {
        valueEnc = await encryptObj({ value: String(value) });
      } catch (e: any) {
        return NextResponse.json({
          error: e?.message?.includes("ENCRYPTION_KEY")
            ? "ENCRYPTION_KEY env var not configured. Set it in Cloudflare Pages → Settings → Environment Variables."
            : "Encryption failed: " + (e?.message || "unknown"),
        }, { status: 500 });
      }
      const id = newId();
      const ts = now();
      await dbRun(db,
        `INSERT INTO ai_provider_keys (id, provider, key_name, category, purpose, value_enc, for_managed_pool, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [id, String(provider).trim(), String(keyName).trim(), String(category || "").trim(), String(purpose || "").trim(),
         valueEnc, forManagedPool ? 1 : 0, ts, ts]
      );
      return NextResponse.json({ success: true, id });
    }

    if (action === "update") {
      const { id, category, purpose, isActive, forManagedPool, value } = body;
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const existing = await dbFirst<any>(db, `SELECT id FROM ai_provider_keys WHERE id = ?`, [id]);
      if (!existing) return NextResponse.json({ error: "Key not found" }, { status: 404 });

      const fields: string[] = [];
      const binds: any[] = [];
      if (category !== undefined) { fields.push("category = ?"); binds.push(String(category).trim()); }
      if (purpose !== undefined)  { fields.push("purpose = ?");  binds.push(String(purpose).trim()); }
      if (isActive !== undefined) { fields.push("is_active = ?"); binds.push(isActive ? 1 : 0); }
      if (forManagedPool !== undefined) { fields.push("for_managed_pool = ?"); binds.push(forManagedPool ? 1 : 0); }
      if (value) {
        try {
          fields.push("value_enc = ?");
          binds.push(await encryptObj({ value: String(value) }));
        } catch (e: any) {
          return NextResponse.json({ error: "Encryption failed: " + (e?.message || "unknown") }, { status: 500 });
        }
      }
      if (!fields.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
      fields.push("updated_at = ?"); binds.push(now());
      binds.push(id);
      await dbRun(db, `UPDATE ai_provider_keys SET ${fields.join(", ")} WHERE id = ?`, binds);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      await dbRun(db, `DELETE FROM ai_provider_keys WHERE id = ?`, [id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Operation failed" }, { status: 500 });
  }
}
