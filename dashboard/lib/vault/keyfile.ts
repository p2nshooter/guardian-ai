/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * PRIVACY VAULT — the restore map as a password-encrypted key file, so a member
 * can keep it offline and restore originals later (WebCrypto only):
 *   PBKDF2-SHA-256 (310 000 iterations, 16-byte salt) → AES-256-GCM (12-byte IV)
 * The password never leaves the device; AXTO never sees the map.
 * ============================================================================ */

const ITERATIONS = 310_000;
const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export interface KeyFile { axto: "vault-key"; v: 1; kdf: "PBKDF2-SHA256"; iterations: number; salt: string; iv: string; data: string; created: string; entries: number }

export async function sealMap(map: Record<string, string>, password: string, iterations = ITERATIONS): Promise<string> {
  if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(password, salt, iterations), new TextEncoder().encode(JSON.stringify(map))));
  const f: KeyFile = { axto: "vault-key", v: 1, kdf: "PBKDF2-SHA256", iterations, salt: b64(salt), iv: b64(iv), data: b64(data), created: new Date().toISOString(), entries: Object.keys(map).length };
  return JSON.stringify(f, null, 2);
}

export async function openMap(json: string, password: string): Promise<Record<string, string>> {
  let f: KeyFile;
  try { f = JSON.parse(json); } catch { throw new Error("This is not an AXTO Vault key file."); }
  if (f?.axto !== "vault-key" || f.v !== 1) throw new Error("This is not an AXTO Vault key file.");
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(f.iv) as BufferSource }, await key(password, unb64(f.salt), f.iterations), unb64(f.data) as BufferSource);
    const map = JSON.parse(new TextDecoder().decode(plain));
    if (!map || typeof map !== "object") throw new Error("bad");
    return map;
  } catch { throw new Error("Wrong password, or the key file was changed."); }
}
