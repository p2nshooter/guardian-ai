/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Signed, short-lived download links for self-hosted images, used by the
 * Windows/Linux installer (no browser session there — the licence key is the
 * credential). URL: /api/selfhosted/image?name=&lic=&exp=&sig=
 *   sig = HMAC-SHA256(DOWNLOAD_SIGNING_SECRET | JWT_SECRET, "name|lic|exp"), hex
 * The image route re-checks that the licence is still active before streaming.
 * ============================================================================ */
import { secret } from "./db";
import { absoluteUrl } from "./site";

const TTL_SECONDS = 6 * 3600;

async function hmacHex(msg: string): Promise<string> {
  const k = secret("DOWNLOAD_SIGNING_SECRET") || secret("JWT_SECRET");
  if (!k) throw new Error("Download signing secret is not configured.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(k), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
  return Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signedImageUrl(name: string, licenceId: string): Promise<{ url: string; expires: number }> {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const sig = await hmacHex(`${name}|${licenceId}|${exp}`);
  const q = new URLSearchParams({ name, lic: licenceId, exp: String(exp), sig });
  return { url: absoluteUrl(`/api/selfhosted/image?${q}`), expires: exp };
}

export async function verifyImageUrl(name: string, licenceId: string, exp: string, sig: string): Promise<boolean> {
  const e = Number(exp);
  if (!name || !licenceId || !Number.isFinite(e) || e < Date.now() / 1000 || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const want = await hmacHex(`${name}|${licenceId}|${e}`);
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= want.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
