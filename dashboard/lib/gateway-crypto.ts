/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AES-256-GCM encryption for payment gateway credentials.
 * Uses ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Writing NEVER falls back to plaintext-equivalent base64 — live Stripe/PayPal
 * secrets are too sensitive to store reversibly by accident. If the key isn't
 * configured, encryptObj throws and the save is refused (see app/api/admin/
 * gateways/route.ts, which already surfaces this as a clear admin-facing error).
 * decryptObj still reads the legacy "b64:" format so credentials saved before
 * this fix (or before ENCRYPTION_KEY was configured) don't become unreadable —
 * re-saving them once the key is set upgrades them to real encryption.
 */

const FALLBACK_PREFIX = "b64:";

async function getEncKey(): Promise<CryptoKey | null> {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  try {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return crypto.subtle.importKey("raw", bytes.buffer as ArrayBuffer, "AES-GCM", false, ["encrypt", "decrypt"]);
  } catch { return null; }
}

export async function encryptObj<T>(obj: T): Promise<string> {
  const key = await getEncKey();
  if (!key) {
    throw new Error("ENCRYPTION_KEY not set — refusing to store gateway credentials unencrypted. Set a 64-hex-char ENCRYPTION_KEY in env vars.");
  }
  const json = JSON.stringify(obj);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(json);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const ivHex     = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");
  const cipherHex = Array.from(new Uint8Array(cipher)).map(b => b.toString(16).padStart(2, "0")).join("");
  return ivHex + cipherHex;
}

export async function decryptObj<T>(encoded: string): Promise<T> {
  // Handle base64 fallback
  if (encoded.startsWith(FALLBACK_PREFIX)) {
    return JSON.parse(atob(encoded.slice(FALLBACK_PREFIX.length))) as T;
  }

  const key = await getEncKey();
  if (!key) throw new Error("ENCRYPTION_KEY not set and data is not base64 fallback format");

  const ivHex     = encoded.slice(0, 24);
  const cipherHex = encoded.slice(24);
  const iv        = new Uint8Array(12);
  for (let i = 0; i < 12; i++) iv[i] = parseInt(ivHex.substr(i * 2, 2), 16);
  const cipher = new Uint8Array(cipherHex.length / 2);
  for (let i = 0; i < cipher.length; i++) cipher[i] = parseInt(cipherHex.substr(i * 2, 2), 16);

  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher.buffer as ArrayBuffer);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
