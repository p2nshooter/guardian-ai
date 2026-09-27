/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Encrypted settings in R2 — payment gateways, bank/crypto payout details,
 * e-mail and support-AI credentials. Nothing sensitive lives in D1 or in the
 * repository; admins edit everything from the Admin portal.
 *
 *   object:  R2 (axto-storage)  secure/<name>.json.enc
 *   cipher:  AES-256-GCM, random 96-bit IV, AAD = document name
 *            (a ciphertext cannot be swapped between documents)
 *   key:     HKDF-SHA256 of the SETTINGS_ENCRYPTION_KEY secret
 *            (falls back to ENCRYPTION_KEY), info "axto-settings-v1"
 *
 * Reads are cached per isolate for 60 s (R2-lean); a write refreshes the cache.
 * Secrets never leave the server: admin APIs return them masked (maskSecrets).
 * ============================================================================ */
import { getR2, secret } from "./db";

const PREFIX = "secure/";
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: unknown }>();
let keyCache: { raw: string; key: CryptoKey } | null = null;

export class SettingsKeyMissing extends Error {
  constructor() { super("SETTINGS_ENCRYPTION_KEY (or ENCRYPTION_KEY) is not configured."); }
}

async function settingsKey(): Promise<CryptoKey> {
  const raw = (secret("SETTINGS_ENCRYPTION_KEY") || secret("ENCRYPTION_KEY") || "").trim();
  if (raw.length < 32) throw new SettingsKeyMissing();
  if (keyCache?.raw === raw) return keyCache.key;
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(raw), "HKDF", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("axto.io/secure-store"), info: new TextEncoder().encode("axto-settings-v1") },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  keyCache = { raw, key };
  return key;
}

const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptJson(name: string, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(name) }, await settingsKey(),
    new TextEncoder().encode(JSON.stringify(value))));
  return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) });
}

export async function decryptJson<T>(name: string, blob: string): Promise<T> {
  const { iv, ct } = JSON.parse(blob);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv), additionalData: new TextEncoder().encode(name) }, await settingsKey(), unb64(ct));
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

function objectKey(name: string) {
  if (!/^[a-z0-9-]{1,40}$/.test(name)) throw new Error("bad settings name");
  return `${PREFIX}${name}.json.enc`;
}

/** Decrypted document, or `fallback` when it has never been saved. */
export async function readSecure<T>(req: any | undefined, name: string, fallback: T): Promise<T> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const obj = await getR2(req).get(objectKey(name));
  const value = obj ? await decryptJson<T>(name, await obj.text()) : fallback;
  cache.set(name, { at: Date.now(), value });
  return value;
}

export async function writeSecure(req: any | undefined, name: string, value: unknown): Promise<void> {
  await getR2(req).put(objectKey(name), await encryptJson(name, value), {
    httpMetadata: { contentType: "application/octet-stream" },
    customMetadata: { kind: "axto-secure-settings", v: "1" },
  });
  cache.set(name, { at: Date.now(), value });
}

// ── masking for admin UIs ────────────────────────────────────────────────────
export const MASK = "••••••••";

export function maskValue(v: string): string {
  if (!v) return "";
  return v.length <= 8 ? MASK : `${MASK}${v.slice(-4)}`;
}

/** Keeps the stored secret when the admin submits the masked value or leaves it blank. */
export function keepSecret(submitted: unknown, stored: string | undefined): string {
  const s = typeof submitted === "string" ? submitted.trim() : "";
  if (!s || s.startsWith(MASK)) return stored || "";
  return s;
}
