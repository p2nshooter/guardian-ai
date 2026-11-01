/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * Member content encryption at rest (R2 USER_FILES bucket).
 *   cipher: AES-256-GCM, random 96-bit IV, AAD = the object key
 *           (a ciphertext cannot be moved to another object or member)
 *   key:    HKDF-SHA256(ENCRYPTION_KEY, salt "axto.io/user-files", info "user:<id>")
 *           — one key per member, never stored.
 * Format: 1 version byte (1) ‖ 12-byte IV ‖ ciphertext.
 * ============================================================================ */
import { secret } from "./db";

const keys = new Map<string, CryptoKey>();

async function userKey(userId: string): Promise<CryptoKey> {
  const raw = (secret("ENCRYPTION_KEY") || "").trim();
  if (raw.length < 32) throw new Error("ENCRYPTION_KEY is not configured.");
  const cacheId = `${raw.length}:${raw.slice(-6)}:${userId}`;
  const hit = keys.get(cacheId);
  if (hit) return hit;
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(raw), "HKDF", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("axto.io/user-files"), info: new TextEncoder().encode(`user:${userId}`) },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  if (keys.size > 500) keys.clear();
  keys.set(cacheId, key);
  return key;
}

export async function sealForUser(userId: string, objectKey: string, data: Uint8Array | string): Promise<Uint8Array> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(objectKey) }, await userKey(userId), bytes));
  const out = new Uint8Array(1 + 12 + ct.length);
  out[0] = 1;
  out.set(iv, 1);
  out.set(ct, 13);
  return out;
}

export async function openForUser(userId: string, objectKey: string, blob: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const b = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
  if (b[0] !== 1 || b.length < 29) throw new Error("Unsupported or corrupted object.");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b.slice(1, 13), additionalData: new TextEncoder().encode(objectKey) }, await userKey(userId), b.slice(13));
  return new Uint8Array(pt);
}

export async function putSealedJson(bucket: any, userId: string, key: string, value: unknown, extra: Record<string, string> = {}): Promise<number> {
  const body = await sealForUser(userId, key, JSON.stringify(value));
  await bucket.put(key, body, { httpMetadata: { contentType: "application/octet-stream" }, customMetadata: { enc: "user-v1", ...extra } });
  return body.length;
}

export async function getSealedJson<T>(bucket: any, userId: string, key: string): Promise<{ value: T; size: number; etag: string } | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  const buf = new Uint8Array(await obj.arrayBuffer());
  const value = JSON.parse(new TextDecoder().decode(await openForUser(userId, key, buf))) as T;
  return { value, size: buf.length, etag: obj.etag };
}
