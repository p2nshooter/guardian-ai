/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * /api/admin/managed — the MANAGED AI product line (admin only). Separate
 * from BYOX: AXTO's own provider keys (ai_provider_keys), Workers AI model,
 * lock switch. Member BYOX keys are never visible here.
 *   GET → {enabled, settings, keys:[{id, provider, hint, is_active}]}
 *   PUT {enabled?, settings?} · POST {provider, value} add key · DELETE ?id=
 * ============================================================================ */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, now } from "@/lib/db";
import type { Data } from "@/lib/data";
import { requireAdmin, respond } from "@/lib/auth";
import { encryptObj } from "@/lib/gateway-crypto";
import { managedEnabled, managedSettings } from "@/lib/ai/managed";
import { isProviderId } from "@/lib/ai/providers";
import { readJson, fail, audit } from "@/lib/http";

async function view(db: Data) {
  const keys = (await db.aiProviderKeys.listAllDocs("all", "all", 500)).map((k) => ({ id: k.id, provider: k.provider, key_name: k.key_name, is_active: k.is_active, updated_at: k.updated_at }));
  return { enabled: await managedEnabled(db), settings: await managedSettings(db), keys };
}

const setConfig = (db: Data, key: string, value: string) => db.config.set(key, value);

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return respond(await view(getData(req)), ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const db = getData(req);
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
  const db = getData(req);
  const at = now();
  await db.aiProviderKeys.create({
    id: crypto.randomUUID(), provider, key_name: `…${value.slice(-4)}`, category: "llm", purpose: "managed", value_enc: await encryptObj({ value }),
    for_managed_pool: 1, is_active: 1, created_at: at, updated_at: at,
  });
  await audit(db, ctx.session, "admin.managed.key_added", "ai_provider_key", provider, {}, req);
  return respond(await view(db), ctx);
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const db = getData(req);
  await db.aiProviderKeys.delete(id);
  await audit(db, ctx.session, "admin.managed.key_deleted", "ai_provider_key", id, {}, req);
  return respond(await view(db), ctx);
}
