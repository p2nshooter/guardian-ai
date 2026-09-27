/* AXTO — /api/byox/keys · the member's own AI keys & endpoints (BYOX only).
 *   GET    → saved keys (hints only, never the secret) + provider catalogue
 *   POST   {provider, value, model?, baseUrl?} → save / replace
 *   PATCH  {preferred} → default chat provider
 *   DELETE ?provider=… → remove */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { loadSession, unauthorized, respond } from "@/lib/auth";
import { listKeys, saveKey, deleteKey, setPreferred } from "@/lib/ai/byox";
import { PROVIDERS } from "@/lib/ai/providers";
import { readJson, fail, audit } from "@/lib/http";

const catalogue = PROVIDERS.map((p) => ({ id: p.id, name: p.name, chat: p.chat, stt: p.stt, defaultModel: p.defaultModel, models: p.models, keyHint: p.keyHint, keyUrl: p.keyUrl, freeTier: p.freeTier || "" }));

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const data = await listKeys(getDB(req), ctx.session.sub);
  return respond({ ...data, providers: catalogue }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const b = await readJson(req);
  const db = getDB(req);
  const err = await saveKey(db, ctx.session.sub, String(b?.provider || ""), { value: b?.value, model: b?.model, baseUrl: b?.baseUrl });
  if (err) return fail(err);
  await audit(db, ctx.session, "byox.key_saved", "user_ai_key", String(b?.provider), {}, req);
  return respond({ ok: true, ...(await listKeys(db, ctx.session.sub)) }, ctx);
}

export async function PATCH(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const b = await readJson(req);
  const db = getDB(req);
  const err = await setPreferred(db, ctx.session.sub, String(b?.preferred || ""));
  if (err) return fail(err);
  return respond({ ok: true, ...(await listKeys(db, ctx.session.sub)) }, ctx);
}

export async function DELETE(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const provider = new URL(req.url).searchParams.get("provider") || "";
  const db = getDB(req);
  await deleteKey(db, ctx.session.sub, provider);
  await audit(db, ctx.session, "byox.key_deleted", "user_ai_key", provider, {}, req);
  return respond({ ok: true, ...(await listKeys(db, ctx.session.sub)) }, ctx);
}
