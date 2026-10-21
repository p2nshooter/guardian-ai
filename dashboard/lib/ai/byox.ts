/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * BYOX — Bring Your Own Key / Model / Endpoint.
 *
 * Every cloud app runs on the MEMBER's own AI credentials, stored encrypted in
 * `user_ai_keys`. This module reads ONLY that collection. It never falls back to
 * AXTO-provided AI; that is the separate, locked Managed path
 * (lib/ai/managed.ts), which in turn never reads member keys.
 * ============================================================================ */
import { now, secret } from "../db";
import type { Data } from "../data";
import { ids } from "../data/schema";
import { encryptObj, decryptObj } from "../gateway-crypto";
import { PROVIDERS, providerInfo, isProviderId, endpointProblem, type Connection, type ProviderId } from "./providers";

export interface SavedKey { provider: ProviderId; hint: string; model: string; baseUrl: string; createdAt: string }

interface Secret { value: string; baseUrl?: string }

export class ByoxMissingKey extends Error {
  constructor(public need: "chat" | "stt") {
    super(need === "stt"
      ? "Add a speech-to-text key (OpenAI, Groq or Deepgram) in Settings → My AI keys to use this feature."
      : "Add your own AI key in Settings → My AI keys to start. Google Gemini and Groq both offer free tiers.");
  }
}

export const allowInsecureEndpoints = () => secret("ALLOW_INSECURE_ENDPOINTS") === "1";

export async function listKeys(db: Data, userId: string): Promise<{ keys: SavedKey[]; preferred: string }> {
  const [rows, u] = await Promise.all([db.userAiKeys.listAllDocs("user", userId), db.users.get(userId)]);
  const keys: SavedKey[] = [];
  for (const r of rows) {
    if (!isProviderId(r.provider)) continue;
    let baseUrl = "";
    if (r.provider === "custom") {
      try { baseUrl = (await decryptObj<Secret>(r.key_enc)).baseUrl || ""; } catch {}
    }
    keys.push({ provider: r.provider, hint: r.hint, model: r.model, baseUrl, createdAt: r.created_at });
  }
  return { keys, preferred: u?.ai_provider || "" };
}

export async function saveKey(db: Data, userId: string, provider: string, input: { value?: string; model?: string; baseUrl?: string }): Promise<string | null> {
  if (!isProviderId(provider)) return "Unknown provider.";
  const value = String(input.value || "").trim();
  const model = String(input.model || "").trim().slice(0, 200);
  const baseUrl = String(input.baseUrl || "").trim().replace(/\/+$/, "");
  if (provider === "custom") {
    const bad = endpointProblem(baseUrl, allowInsecureEndpoints());
    if (bad) return bad;
    if (!model) return "Enter the model name your endpoint serves (e.g. llama3.1:70b).";
  } else if (value.length < 8) {
    return "That key looks too short. Paste the full key.";
  }
  if (value.length > 400) return "That key is too long.";
  const enc = await encryptObj({ value, ...(provider === "custom" ? { baseUrl } : {}) });
  const hint = value ? `…${value.slice(-4)}` : "no key";
  await db.userAiKeys.upsert(ids.aiKey(userId, provider), (cur) =>
    cur ? { ...cur, key_enc: enc, hint, model } : { id: ids.aiKey(userId, provider), user_id: userId, provider, key_enc: enc, hint, model, created_at: now() });
  // First chat-capable key becomes the default automatically.
  if (providerInfo(provider)!.chat) {
    await db.users.update(userId, (u) => (u.ai_provider ? null : { ...u, ai_provider: provider }));
  }
  return null;
}

export async function deleteKey(db: Data, userId: string, provider: string): Promise<void> {
  if (!isProviderId(provider)) return;
  await db.userAiKeys.delete(ids.aiKey(userId, provider));
  await db.users.update(userId, (u) => (u.ai_provider === provider ? { ...u, ai_provider: "" } : null));
}

export async function setPreferred(db: Data, userId: string, provider: string): Promise<string | null> {
  if (!isProviderId(provider) || !providerInfo(provider)!.chat) return "Choose a chat provider.";
  if (!(await db.userAiKeys.get(ids.aiKey(userId, provider)))) return "Add a key for that provider first.";
  await db.users.update(userId, (u) => ({ ...u, ai_provider: provider }));
  return null;
}

/** Whether the member has saved a key for this provider. */
export async function hasKey(db: Data, userId: string, provider: string): Promise<boolean> {
  return isProviderId(provider) && Boolean(await db.userAiKeys.get(ids.aiKey(userId, provider)));
}

async function connectionFor(db: Data, userId: string, provider: ProviderId, modelOverride?: string, stt = false): Promise<Connection | null> {
  const row = await db.userAiKeys.get(ids.aiKey(userId, provider));
  if (!row) return null;
  let s: Secret;
  try { s = await decryptObj<Secret>(row.key_enc); } catch { return null; }
  const info = providerInfo(provider)!;
  const model = stt ? (info.sttModel || info.defaultModel) : (modelOverride || row.model || info.defaultModel);
  return { provider, apiKey: s.value || "", model, baseUrl: s.baseUrl };
}

/** Every usable chat connection in failover order: requested provider → member's default → other keys. */
export async function resolveChatAll(db: Data, userId: string, want?: { provider?: string; model?: string }): Promise<Connection[]> {
  const { keys, preferred } = await listKeys(db, userId);
  const chatKeys = keys.filter((k) => providerInfo(k.provider)!.chat).map((k) => k.provider);
  const order = [want?.provider, preferred, ...chatKeys].filter((p, i, a): p is ProviderId => isProviderId(p) && chatKeys.includes(p) && a.indexOf(p) === i);
  const out: Connection[] = [];
  for (const p of order) {
    const c = await connectionFor(db, userId, p, want?.provider === p ? want?.model : undefined);
    if (c) out.push(c);
  }
  if (!out.length) throw new ByoxMissingKey("chat");
  return out;
}

/** Connection for text generation: requested provider → member's default → any chat key. */
export async function resolveChat(db: Data, userId: string, want?: { provider?: string; model?: string }): Promise<Connection> {
  return (await resolveChatAll(db, userId, want))[0];
}

/** Change the saved default model for a provider without re-entering the key. */
export async function setModel(db: Data, userId: string, provider: string, model: string): Promise<string | null> {
  if (!isProviderId(provider)) return "Unknown provider.";
  const m = String(model || "").trim().slice(0, 200);
  const id = ids.aiKey(userId, provider);
  if (!(await db.userAiKeys.get(id))) return "Add a key for that provider first.";
  await db.userAiKeys.update(id, (k) => ({ ...k, model: m }));
  return null;
}

/** Connection for speech-to-text (Clipper): Deepgram → Groq → OpenAI, or the one requested. */
export async function resolveStt(db: Data, userId: string, want?: string): Promise<Connection> {
  const order: ProviderId[] = isProviderId(want) && providerInfo(want)!.stt ? [want] : ["deepgram", "groq", "openai"];
  for (const p of order) {
    const c = await connectionFor(db, userId, p, undefined, true);
    if (c) return c;
  }
  throw new ByoxMissingKey("stt");
}

export const BYOX_PROVIDERS = PROVIDERS;
