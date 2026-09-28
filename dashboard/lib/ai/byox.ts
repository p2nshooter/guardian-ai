/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * BYOX — Bring Your Own Key / Model / Endpoint.
 *
 * Every cloud app runs on the MEMBER's own AI credentials, stored encrypted in
 * `user_ai_keys`. This module reads ONLY that table. It never falls back to
 * AXTO-provided AI; that is the separate, locked Managed path
 * (lib/ai/managed.ts), which in turn never reads member keys.
 * ============================================================================ */
import { dbFirst, dbQuery, dbRun, now, secret } from "../db";
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

export async function listKeys(db: any, userId: string): Promise<{ keys: SavedKey[]; preferred: string }> {
  const [rows, u] = await Promise.all([
    dbQuery<{ provider: string; hint: string; model: string; key_enc: string; created_at: string }>(db,
      `SELECT provider, hint, model, key_enc, created_at FROM user_ai_keys WHERE user_id = ? ORDER BY created_at`, [userId]),
    dbFirst<{ ai_provider: string }>(db, `SELECT ai_provider FROM users WHERE id = ?`, [userId]),
  ]);
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

export async function saveKey(db: any, userId: string, provider: string, input: { value?: string; model?: string; baseUrl?: string }): Promise<string | null> {
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
  await dbRun(db,
    `INSERT INTO user_ai_keys (user_id, provider, key_enc, hint, model, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, provider) DO UPDATE SET key_enc = excluded.key_enc, hint = excluded.hint, model = excluded.model`,
    [userId, provider, enc, hint, model, now()]);
  // First chat-capable key becomes the default automatically.
  if (providerInfo(provider)!.chat) {
    await dbRun(db, `UPDATE users SET ai_provider = ? WHERE id = ? AND ai_provider = ''`, [provider, userId]);
  }
  return null;
}

export async function deleteKey(db: any, userId: string, provider: string): Promise<void> {
  await dbRun(db, `DELETE FROM user_ai_keys WHERE user_id = ? AND provider = ?`, [userId, provider]);
  await dbRun(db, `UPDATE users SET ai_provider = '' WHERE id = ? AND ai_provider = ?`, [userId, provider]);
}

export async function setPreferred(db: any, userId: string, provider: string): Promise<string | null> {
  if (!isProviderId(provider) || !providerInfo(provider)!.chat) return "Choose a chat provider.";
  const has = await dbFirst(db, `SELECT 1 AS x FROM user_ai_keys WHERE user_id = ? AND provider = ?`, [userId, provider]);
  if (!has) return "Add a key for that provider first.";
  await dbRun(db, `UPDATE users SET ai_provider = ? WHERE id = ?`, [provider, userId]);
  return null;
}

async function connectionFor(db: any, userId: string, provider: ProviderId, modelOverride?: string, stt = false): Promise<Connection | null> {
  const row = await dbFirst<{ key_enc: string; model: string }>(db,
    `SELECT key_enc, model FROM user_ai_keys WHERE user_id = ? AND provider = ?`, [userId, provider]);
  if (!row) return null;
  let s: Secret;
  try { s = await decryptObj<Secret>(row.key_enc); } catch { return null; }
  const info = providerInfo(provider)!;
  const model = stt ? (info.sttModel || info.defaultModel) : (modelOverride || row.model || info.defaultModel);
  return { provider, apiKey: s.value || "", model, baseUrl: s.baseUrl };
}

/** Every usable chat connection in failover order: requested provider → member's default → other keys. */
export async function resolveChatAll(db: any, userId: string, want?: { provider?: string; model?: string }): Promise<Connection[]> {
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
export async function resolveChat(db: any, userId: string, want?: { provider?: string; model?: string }): Promise<Connection> {
  return (await resolveChatAll(db, userId, want))[0];
}

/** Change the saved default model for a provider without re-entering the key. */
export async function setModel(db: any, userId: string, provider: string, model: string): Promise<string | null> {
  if (!isProviderId(provider)) return "Unknown provider.";
  const m = String(model || "").trim().slice(0, 200);
  const r = await dbRun(db, `UPDATE user_ai_keys SET model = ? WHERE user_id = ? AND provider = ?`, [m, userId, provider]);
  return r?.meta?.changes ? null : "Add a key for that provider first.";
}

/** Connection for speech-to-text (Clipper): Deepgram → Groq → OpenAI, or the one requested. */
export async function resolveStt(db: any, userId: string, want?: string): Promise<Connection> {
  const order: ProviderId[] = isProviderId(want) && providerInfo(want)!.stt ? [want] : ["deepgram", "groq", "openai"];
  for (const p of order) {
    const c = await connectionFor(db, userId, p, undefined, true);
    if (c) return c;
  }
  throw new ByoxMissingKey("stt");
}

export const BYOX_PROVIDERS = PROVIDERS;
