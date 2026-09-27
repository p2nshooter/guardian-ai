/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * MANAGED AI — AXTO provides the AI (platform keys + Cloudflare Workers AI).
 *
 * LOCKED by default: every entry point checks managedEnabled() first and the
 * admin unlocks it in Admin → Managed AI (platform_config.managed_enabled).
 * This path reads ONLY `ai_provider_keys` (AXTO's keys), the Workers AI
 * binding and `managed_usage`. It never touches member BYOX keys.
 * ============================================================================ */
import { dbFirst, dbQuery, dbRun } from "../db";
import { decryptObj } from "../gateway-crypto";
import { monthKey, MANAGED_PLANS } from "../plans";
import { isProviderId, providerInfo, chatStream, workersAiStream, type ChatMessage, type Connection, type GenOptions } from "./providers";

export interface ManagedSettings {
  provider: "workers" | "anthropic" | "openai" | "google" | "groq" | "openrouter";
  models: Record<string, string>;
  workersModel: string;
  effort?: GenOptions["effort"];
}

export const DEFAULT_MANAGED: ManagedSettings = {
  provider: "workers", models: {}, workersModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
};

export async function managedEnabled(db: any): Promise<boolean> {
  try {
    const r = await dbFirst<{ value: string }>(db, `SELECT value FROM platform_config WHERE key = 'managed_enabled'`);
    return r?.value === "1";
  } catch {
    return false;
  }
}

export async function managedSettings(db: any): Promise<ManagedSettings> {
  try {
    const r = await dbFirst<{ value: string }>(db, `SELECT value FROM platform_config WHERE key = 'managed_settings'`);
    if (r?.value) return { ...DEFAULT_MANAGED, ...JSON.parse(r.value) };
  } catch {}
  return DEFAULT_MANAGED;
}

/** Monthly credit allowance from the member's active Managed plan (0 = none). */
export async function managedAllowance(db: any, userId: string): Promise<{ planId: string; credits: number; used: number }> {
  const [sub, use] = await Promise.all([
    dbFirst<{ plan: string }>(db,
      `SELECT plan FROM managed_subscriptions WHERE user_id = ? AND status = 'active' AND current_period_end > ?`, [userId, new Date().toISOString()]),
    dbFirst<{ credits_used: number }>(db, `SELECT credits_used FROM managed_usage WHERE user_id = ? AND month = ?`, [userId, monthKey()]),
  ]);
  const plan = MANAGED_PLANS.find((p) => p.id === sub?.plan);
  return { planId: plan?.id || "", credits: plan?.creditsPerMonth || 0, used: use?.credits_used || 0 };
}

async function platformConnection(db: any, s: ManagedSettings): Promise<Connection | null> {
  if (s.provider === "workers") return null;
  const rows = await dbQuery<{ provider: string; value_enc: string }>(db,
    `SELECT provider, value_enc FROM ai_provider_keys WHERE is_active = 1 AND provider = ? ORDER BY updated_at DESC LIMIT 1`, [s.provider]);
  const row = rows[0];
  if (!row || !isProviderId(row.provider)) return null;
  try {
    const key = (await decryptObj<{ value: string }>(row.value_enc)).value;
    return key ? { provider: row.provider, apiKey: key, model: s.models[row.provider] || providerInfo(row.provider)!.defaultModel } : null;
  } catch {
    return null;
  }
}

/** Start a Managed generation. Throws a readable error when locked or out of credits. */
export async function managedStream(db: any, ai: any, userId: string, system: string, messages: ChatMessage[]): Promise<{ gen: AsyncGenerator<string>; provider: string; model: string }> {
  if (!(await managedEnabled(db))) throw new Error("Managed AI is not available yet. Your apps work today with your own AI keys (BYOX).");
  const a = await managedAllowance(db, userId);
  if (a.credits <= 0) throw new Error("You don't have a Managed AI plan.");
  if (a.used >= a.credits) throw new Error("You have used all Managed AI credits for this month.");
  const s = await managedSettings(db);
  await dbRun(db,
    `INSERT INTO managed_usage (user_id, month, credits_used, tokens) VALUES (?, ?, 1, 0)
     ON CONFLICT(user_id, month) DO UPDATE SET credits_used = credits_used + 1`, [userId, monthKey()]);
  const conn = await platformConnection(db, s);
  if (conn) return { gen: chatStream(conn, system, messages, { effort: s.effort }), provider: conn.provider, model: conn.model };
  if (!ai) throw new Error("Managed AI is not configured.");
  return { gen: workersAiStream(ai, s.workersModel, system, messages), provider: "workers", model: s.workersModel };
}
