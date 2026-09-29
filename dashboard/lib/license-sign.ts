/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * Ed25519 licence signing (v3) — FAIL-CLOSED.
 *
 * Canonical payload (must match SIGNED_PAYLOAD_FIELDS in every engine's
 * license.py, byte for byte):
 *   license_key|machine_id|product|valid|status|expires_at|issued_at|nonce[|entitlements]
 *
 * The private key is a raw 32-byte Ed25519 seed, base64. Source order:
 *   1. D1 platform_config.license_signing_key — the v3 rotated key (the Pages
 *      secret may still hold the old, publicly known demo key, so D1 wins)
 *   2. Pages secret LICENSE_SIGNING_PRIVATE_KEY_B64
 * There is deliberately NO built-in/demo key: without a key, signing throws
 * and callers answer 503.
 * The matching public key is compiled into the engines (AXTO_LICENSE_PUBLIC_KEY_B64).
 * ============================================================================ */
import { dbFirst, secret } from "./db";

export interface SignFields {
  licenseKey: string;
  machineId: string;
  product: string;
  valid: boolean;
  status: string;
  expiresAt: string;
  entitlements?: string;
  /** Engine-supplied request nonce, echoed so a captured answer cannot be replayed. */
  nonce?: string;
}

export class SigningUnavailable extends Error {
  constructor() { super("Licence signing key is not configured."); }
}

// PKCS#8 wrapper for a raw Ed25519 seed (RFC 8410): 16-byte prefix + 32-byte seed.
const PKCS8_PREFIX = [0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20];

let cached: { b64: string; key: CryptoKey } | null = null;
let fetched: { b64: string; at: number } | null = null;   // saves a D1 read per validation

async function privateKeyB64(db: any): Promise<string> {
  if (fetched && Date.now() - fetched.at < 600_000) return fetched.b64;
  const b64 = await readKey(db);
  fetched = { b64, at: Date.now() };
  return b64;
}

async function readKey(db: any): Promise<string> {
  try {
    const r = await dbFirst<{ value: string }>(db, `SELECT value FROM platform_config WHERE key = 'license_signing_key'`);
    if (r?.value) return r.value;
  } catch {}
  return secret("LICENSE_SIGNING_PRIVATE_KEY_B64");
}

async function signingKey(db: any): Promise<CryptoKey> {
  const b64 = (await privateKeyB64(db)).trim();
  if (!b64) throw new SigningUnavailable();
  if (cached?.b64 === b64) return cached.key;
  const seed = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if (seed.length !== 32) throw new SigningUnavailable();
  const der = new Uint8Array(48);
  der.set(PKCS8_PREFIX, 0);
  der.set(seed, 16);
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "Ed25519" } as any, false, ["sign"]);
  cached = { b64, key };
  return key;
}

/** Values must never contain the "|" delimiter; engines also expect plain tokens. */
export function clean(v: string): string {
  return String(v ?? "").replace(/[|\r\n]/g, "").slice(0, 200);
}

export function canonicalPayload(f: SignFields, issuedAt: string, nonce: string): string {
  const parts = [clean(f.licenseKey), clean(f.machineId), clean(f.product), f.valid ? "true" : "false", clean(f.status), clean(f.expiresAt), issuedAt, nonce];
  if (f.entitlements) parts.push(f.entitlements.replace(/[|\r\n]/g, ""));
  return parts.join("|");
}

async function signString(db: any, payload: string): Promise<string> {
  const key = await signingKey(db);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" } as any, key, new TextEncoder().encode(payload)));
  let bin = "";
  for (let i = 0; i < sig.length; i++) bin += String.fromCharCode(sig[i]);
  return btoa(bin);
}

/** Signs an arbitrary canonical payload (Lifetime activation files) with the licence key. */
export async function signPayload(db: any, payload: string): Promise<string> {
  return signString(db, payload);
}

/** Accepts an engine nonce only in a strict, delimiter-free form. */
export function requestNonce(v: unknown): string {
  return typeof v === "string" && /^[A-Za-z0-9]{16,64}$/.test(v) ? v : "";
}

function newNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12))).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Separately-signed entitlements block read by Legal and the Studio modules
 * (ai/gpu/hybrid). Field order must match ENTITLEMENTS_FIELDS in those engines:
 *   license_key|machine_id|product|entitlements|issued_at|nonce
 */
export async function signEntitlements(db: any, f: { licenseKey: string; machineId: string; product: string; entitlements: string; nonce?: string }): Promise<{ entitlements_payload: string; entitlements_signature: string }> {
  const payload = [clean(f.licenseKey), clean(f.machineId), clean(f.product), f.entitlements.replace(/[|\r\n]/g, ""), new Date().toISOString(), requestNonce(f.nonce) || newNonce()].join("|");
  return { entitlements_payload: payload, entitlements_signature: await signString(db, payload) };
}

/** Returns the fields every engine verifies: { signed_payload, signature, issued_at }. */
export async function signLicense(db: any, f: SignFields): Promise<{ signed_payload: string; signature: string; issued_at: string }> {
  const issuedAt = new Date().toISOString();
  const payload = canonicalPayload(f, issuedAt, requestNonce(f.nonce) || newNonce());
  return { signed_payload: payload, signature: await signString(db, payload), issued_at: issuedAt };
}
