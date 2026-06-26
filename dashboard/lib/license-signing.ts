/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ═══════════════════════════════════════════════════════════════════════════
// AXTO Platform — lib/license-signing.ts
// Cryptographically signs every /api/license-validate response with Ed25519
// so that on-prem products can verify the response actually came from
// axto.io and was not forged or modified in transit / by a rogue DNS entry.
//
// SECURITY MODEL
// ───────────────────────────────────────────────────────────────────────────
// - Only the PRIVATE key (env secret LICENSE_SIGNING_PRIVATE_KEY_B64) can
//   produce a valid signature. It lives exclusively in the Cloudflare Pages
//   secret store for this project and is never shipped in any product build.
// - Every distributed product embeds only the PUBLIC key (see
//   AXTO_LICENSE_PUBLIC_KEY_B64 constant mirrored into each product's
//   license.py). Because Ed25519 is asymmetric, an attacker who extracts the
//   public key from a product they run on their own machine — which is
//   unavoidable since the product is theirs to read — gains zero ability to
//   forge a new "valid" response. They can only replay a response that was
//   genuinely signed for their own machine_id, which is bounded by the
//   embedded issued_at/expires_at fields (see license.py grace-period logic).
// - The signed payload is a fixed-order, pipe-delimited string (NOT raw
//   JSON) so that the exact same bytes can be reconstructed and verified
//   from Python (httpx client) without depending on any particular JSON
//   serializer's field-ordering or number-formatting behavior.
//
// ROTATING / GENERATING KEYS
// ───────────────────────────────────────────────────────────────────────────
//   python3 - <<'PY'
//   from cryptography.hazmat.primitives.asymmetric import ed25519
//   from cryptography.hazmat.primitives import serialization
//   import base64
//   priv = ed25519.Ed25519PrivateKey.generate()
//   pub  = priv.public_key()
//   priv_raw = priv.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
//   pub_raw  = pub.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
//   print("PRIVATE:", base64.b64encode(priv_raw).decode())
//   print("PUBLIC :", base64.b64encode(pub_raw).decode())
//   PY
//
//   wrangler pages secret put LICENSE_SIGNING_PRIVATE_KEY_B64
//   # then update AXTO_LICENSE_PUBLIC_KEY_B64 in every product's license.py
//   # and ship a new build. Old signatures from a rotated-out key will fail
//   # verification on updated clients — rotate during a maintenance window.
// ═══════════════════════════════════════════════════════════════════════════

// Fixed 16-byte ASN.1 PKCS8 prefix for a raw 32-byte Ed25519 private key seed.
// (RFC 8410 — this is a constant header, identical for every Ed25519 key.)
const PKCS8_ED25519_PREFIX = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

let _signKey: CryptoKey | null = null;

async function getSigningKey(): Promise<CryptoKey> {
  if (_signKey) return _signKey;
  const seedB64 = process.env.LICENSE_SIGNING_PRIVATE_KEY_B64;
  if (!seedB64) {
    throw new Error(
      "LICENSE_SIGNING_PRIVATE_KEY_B64 is not set. Generate an Ed25519 keypair and set " +
      "this secret (wrangler pages secret put LICENSE_SIGNING_PRIVATE_KEY_B64) before " +
      "deploying. License responses cannot be signed without it."
    );
  }
  const seed = b64ToBytes(seedB64);
  if (seed.length !== 32) {
    throw new Error(
      `LICENSE_SIGNING_PRIVATE_KEY_B64 must decode to exactly 32 raw bytes (got ${seed.length}).`
    );
  }
  const pkcs8 = new Uint8Array(PKCS8_ED25519_PREFIX.length + 32);
  pkcs8.set(PKCS8_ED25519_PREFIX, 0);
  pkcs8.set(seed, PKCS8_ED25519_PREFIX.length);

  _signKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8.buffer as ArrayBuffer,
    { name: "Ed25519" } as any,
    false,
    ["sign"]
  );
  return _signKey;
}

export function randomNonce(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

export interface SignableLicenseFields {
  licenseKey: string;
  machineId: string;
  product: string;
  valid: boolean;
  status: string;
  expiresAt: string;
}

/**
 * Builds the exact canonical string that gets signed. Field order is fixed
 * and must match byte-for-byte what every product's license.py reconstructs
 * during verification. Do not reorder, rename, or add fields without
 * bumping every product's client in lockstep.
 */
export function buildCanonicalPayload(fields: SignableLicenseFields & {
  issuedAt: string;
  nonce: string;
}): string {
  return [
    fields.licenseKey,
    fields.machineId || "",
    fields.product || "",
    fields.valid ? "true" : "false",
    fields.status || "",
    fields.expiresAt || "",
    fields.issuedAt,
    fields.nonce,
  ].join("|");
}

export interface SignedLicenseResponse {
  signed_payload: string;
  signature: string;
  issued_at: string;
}

/**
 * Signs a license validation outcome with Ed25519. Called for EVERY
 * /api/license-validate response — including invalid/expired/revoked
 * outcomes — so that a man-in-the-middle cannot strip a genuine "invalid"
 * signature and substitute a forged "valid" one; both states are equally
 * authenticated.
 */
export async function signLicenseResponse(
  fields: SignableLicenseFields
): Promise<SignedLicenseResponse> {
  const issuedAt = new Date().toISOString();
  const nonce = randomNonce();
  const payload = buildCanonicalPayload({ ...fields, issuedAt, nonce });
  const key = await getSigningKey();
  const sigBuf = await crypto.subtle.sign({ name: "Ed25519" } as any, key, new TextEncoder().encode(payload));
  return {
    signed_payload: payload,
    signature: bytesToB64(new Uint8Array(sigBuf)),
    issued_at: issuedAt,
  };
}
