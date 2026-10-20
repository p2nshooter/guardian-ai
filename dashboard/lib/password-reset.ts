/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Password-reset links: valid 30 minutes, usable once. Only the SHA-256 of the
 * token is stored (it is the document id), so a copy of the data cannot be
 * turned into working reset links.
 * ============================================================================ */
import type { Data } from "./data";

const TTL_MS = 30 * 60_000;

async function hashToken(token: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A new reset token for an e-mail address (the caller sends the link). */
export async function createPasswordReset(db: Data, email: string): Promise<string> {
  const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
  const at = Date.now();
  await db.passwordResets.create({
    id: await hashToken(token), email, used: 0,
    expires_at: new Date(at + TTL_MS).toISOString(), created_at: new Date(at).toISOString(),
  });
  return token;
}

/**
 * Use a token: the e-mail it was issued for, or null when it is unknown,
 * expired or already used. Claimed with compare-and-swap, so two requests
 * racing with the same link cannot both succeed.
 */
export async function consumePasswordReset(db: Data, token: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const id = await hashToken(token);
  const cur = await db.passwordResets.get(id);
  if (!cur || cur.used || Date.parse(cur.expires_at) <= Date.now()) return null;
  let won = false;
  await db.passwordResets.update(id, (r) => {
    // Decided on every run: a callback re-run after a lost race must not keep an earlier "won".
    won = !r.used && Date.parse(r.expires_at) > Date.now();
    return won ? { ...r, used: 1 } : null;
  });
  return won ? cur.email : null;
}
