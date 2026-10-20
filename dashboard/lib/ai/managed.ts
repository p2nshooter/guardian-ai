/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * MANAGED AI — AXTO provides the AI (platform keys + Cloudflare Workers AI).
 *
 * LOCKED by default: every entry point checks managedEnabled() first and the
 * admin unlocks it in Admin → Managed AI (setting "managed_enabled").
 * This path reads ONLY `ai_provider_keys` (AXTO's keys), the Workers AI
 * binding and `managed_usage`. It never touches member BYOX keys.
 * ============================================================================ */
import type { Data } from "../data";
import { ids } from "../data/schema";
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

export async function managedEnabled(db: Data): Promise<boolean> {
  try {
    return (await db.config.get("managed_enabled")) === "1";
  } catch {
    return false;
  }
}

export async function managedSettings(db: Data): Promise<ManagedSettings> {
  try {
    const raw = await db.config.get("managed_settings");
    if (raw) return { ...DEFAULT_MANAGED, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_MANAGED;
}

/** Monthly credit allowance from the member's active Managed plan (0 = none). */
export async function managedAllowance(db: Data, userId: string): Promise<{ planId: string; credits: number; used: number }> {
  const [sub, use] = await Promise.all([db.managedSubscriptions.get(userId), db.managedUsage.get(ids.usage(userId, monthKey()))]);
  const active = sub && sub.status === "active" && sub.current_period_end > new Date().toISOString() ? sub : null;
  const plan = MANAGED_PLANS.find((p) => p.id === active?.plan);
  return { planId: plan?.id || "", credits: plan?.creditsPerMonth || 0, used: use?.credits_used || 0 };
}

async function platformConnection(db: Data, s: ManagedSettings): Promise<Connection | null> {
  if (s.provider === "workers") return null;
  // The "all" index is newest first by updated_at.
  const row = (await db.aiProviderKeys.listAllDocs("all", "all")).find((k) => k.is_active === 1 && k.provider === s.provider);
  if (!row || !isProviderId(row.provider)) return null;
  try {
    const key = (await decryptObj<{ value: string }>(row.value_enc)).value;
    return key ? { provider: row.provider, apiKey: key, model: s.models[row.provider] || providerInfo(row.provider)!.defaultModel } : null;
  } catch {
    return null;
  }
}

/** Start a Managed generation. Throws a readable error when locked or out of credits. */
export async function managedStream(db: Data, ai: any, userId: string, system: string, messages: ChatMessage[]): Promise<{ gen: AsyncGenerator<string>; provider: string; model: string }> {
  if (!(await managedEnabled(db))) throw new Error("Managed AI is not available yet. Your apps work today with your own AI keys (BYOX).");
  const a = await managedAllowance(db, userId);
  if (a.credits <= 0) throw new Error("You don't have a Managed AI plan.");
  if (a.used >= a.credits) throw new Error("You have used all Managed AI credits for this month.");
  const s = await managedSettings(db);
  const m = monthKey();
  await db.managedUsage.upsert(ids.usage(userId, m), (cur) => {
    const u = cur ?? { id: ids.usage(userId, m), user_id: userId, month: m, credits_used: 0, tokens: 0 };
    return { ...u, credits_used: u.credits_used + 1 };
  });
  const conn = await platformConnection(db, s);
  if (conn) return { gen: chatStream(conn, system, messages, { effort: s.effort }), provider: conn.provider, model: conn.model };
  if (!ai) throw new Error("Managed AI is not configured.");
  return { gen: workersAiStream(ai, s.workersModel, system, messages), provider: "workers", model: s.workersModel };
}
