/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Read helper for the AI provider key vault (ai_provider_keys table, admin CRUD
 * at /admin/ai-keys). Used by any future integration that needs to call an AI
 * provider using AXTO's own stored key rather than a client's BYOK key.
 * ============================================================================ */
import { decryptObj } from "@/lib/gateway-crypto";

/** Fetch and decrypt one active key by provider + key_name. Returns "" if not found/inactive. */
export async function getAiProviderKey(db: any, provider: string, keyName: string): Promise<string> {
  try {
    const row: any = await db.prepare(
      `SELECT value_enc FROM ai_provider_keys WHERE provider = ? AND key_name = ? AND is_active = 1`
    ).bind(provider, keyName).first();
    if (!row?.value_enc) return "";
    const decoded = await decryptObj<{ value?: string }>(row.value_enc);
    return decoded?.value || "";
  } catch { return ""; }
}

/** Fetch and decrypt every active key for a provider, keyed by key_name. */
export async function getAiProviderKeys(db: any, provider: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  try {
    const rows: any = await db.prepare(
      `SELECT key_name, value_enc FROM ai_provider_keys WHERE provider = ? AND is_active = 1`
    ).bind(provider).all();
    for (const row of rows?.results || []) {
      try {
        const decoded = await decryptObj<{ value?: string }>(row.value_enc);
        if (decoded?.value) out[row.key_name] = decoded.value;
      } catch {}
    }
  } catch {}
  return out;
}
