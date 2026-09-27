/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * /api/admin/managed — the MANAGED AI product line (admin only). Separate
 * from BYOX: AXTO's own provider keys (ai_provider_keys), Workers AI model,
 * lock switch. Member BYOX keys are never visible here.
 *   GET → {enabled, settings, keys:[{id, provider, hint, is_active}]}
 *   PUT {enabled?, settings?} · POST {provider, value} add key · DELETE ?id=
 * ============================================================================ */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { encryptObj } from "@/lib/gateway-crypto";
import { managedEnabled, managedSettings } from "@/lib/ai/managed";
import { isProviderId } from "@/lib/ai/providers";
import { readJson, fail, audit } from "@/lib/http";

async function view(db: any) {
  const keys = await dbQuery<any>(db, `SELECT id, provider, key_name, is_active, updated_at FROM ai_provider_keys ORDER BY updated_at DESC`);
  return { enabled: await managedEnabled(db), settings: await managedSettings(db), keys };
}

async function setConfig(db: any, key: string, value: string) {
  await dbRun(db, `INSERT INTO platform_config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [key, value, now()]);
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return respond(await view(getDB(req)), ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const db = getDB(req);
  if (typeof b?.enabled === "boolean") await setConfig(db, "managed_enabled", b.enabled ? "1" : "0");
  if (b?.settings && typeof b.settings === "object") {
    const s = b.settings;
    const clean = {
      provider: ["workers", "anthropic", "openai", "google", "groq", "openrouter"].includes(s.provider) ? s.provider : "workers",
      models: typeof s.models === "object" && s.models ? Object.fromEntries(Object.entries(s.models).map(([k, v]) => [k, String(v).slice(0, 120)])) : {},
      workersModel: String(s.workersModel || "@cf/meta/llama-3.3-70b-instruct-fp8-fast").slice(0, 120),
      effort: ["low", "medium", "high", "xhigh", "max"].includes(s.effort) ? s.effort : undefined,
    };
    await setConfig(db, "managed_settings", JSON.stringify(clean));
  }
  await audit(db, ctx.session, "admin.managed.update", "platform_config", "managed", { enabled: b?.enabled }, req);
  return respond(await view(db), ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const provider = String(b?.provider || "");
  const value = String(b?.value || "").trim();
  if (!isProviderId(provider) || provider === "custom" || provider === "deepgram") return fail("Choose a chat provider.");
  if (value.length < 8) return fail("Paste the full key.");
  const db = getDB(req);
  await dbRun(db, `INSERT INTO ai_provider_keys (id, provider, key_name, category, purpose, value_enc, for_managed_pool, is_active, created_at, updated_at)
                   VALUES (?, ?, ?, 'llm', 'managed', ?, 1, 1, ?, ?)`,
    [crypto.randomUUID(), provider, `…${value.slice(-4)}`, await encryptObj({ value }), now(), now()]);
  await audit(db, ctx.session, "admin.managed.key_added", "ai_provider_key", provider, {}, req);
  return respond(await view(db), ctx);
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const db = getDB(req);
  await dbRun(db, `DELETE FROM ai_provider_keys WHERE id = ?`, [id]);
  await audit(db, ctx.session, "admin.managed.key_deleted", "ai_provider_key", id, {}, req);
  return respond(await view(db), ctx);
}
