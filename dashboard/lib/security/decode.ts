/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * SECURITY ANALYST v4 — a CyberChef-style decoder ON THE DEVICE. Data flows as
 * bytes through a recipe of operations (base64, hex, URL, HTML entities,
 * PowerShell -EncodedCommand, gzip / deflate, XOR, ROT-N, reverse, JWT,
 * unicode escapes, defang / refang, hashes). "Magic" tries the common
 * layerings automatically. Decoding only — nothing is executed.
 * ============================================================================ */
import { refang } from "./modes";
import { defang } from "./ioc";

export type OpId =
  | "fromBase64" | "toBase64" | "fromHex" | "toHex" | "urlDecode" | "urlEncode" | "htmlDecode" | "fromUtf16le" | "psEncoded"
  | "gunzip" | "inflate" | "xor" | "rot" | "reverse" | "jwt" | "unicodeUnescape" | "defang" | "refang" | "sha256" | "sha1" | "md5" | "strings";
export interface Op { id: OpId; arg?: string }
export const OPS: { id: OpId; arg?: string; argDefault?: string }[] = [
  { id: "fromBase64" }, { id: "toBase64" }, { id: "fromHex" }, { id: "toHex" }, { id: "urlDecode" }, { id: "urlEncode" }, { id: "htmlDecode" },
  { id: "psEncoded" }, { id: "fromUtf16le" }, { id: "gunzip" }, { id: "inflate" }, { id: "xor", arg: "key", argDefault: "0x41" }, { id: "rot", arg: "n", argDefault: "13" },
  { id: "reverse" }, { id: "jwt" }, { id: "unicodeUnescape" }, { id: "defang" }, { id: "refang" }, { id: "strings", arg: "min", argDefault: "4" }, { id: "sha256" }, { id: "sha1" }, { id: "md5" },
];

const enc = new TextEncoder();
export const utf8 = (b: Uint8Array) => new TextDecoder("utf-8", { fatal: false }).decode(b);
const bytes = (s: string) => enc.encode(s);

function b64decode(s: string): Uint8Array {
  let t = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(t)) throw new Error("Not Base64");
  while (t.length % 4) t += "=";
  const bin = atob(t);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64encode(b: Uint8Array): string { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); }
function hexdecode(s: string): Uint8Array {
  const t = s.replace(/0x|\\x|[\s:,-]/gi, "");
  if (!/^(?:[0-9a-f]{2})*$/i.test(t)) throw new Error("Not hex");
  return Uint8Array.from(t.match(/../g) || [], (h) => parseInt(h, 16));
}
const hexencode = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const htmlDecode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e.toLowerCase()] ?? m);
const utf16le = (b: Uint8Array) => new TextDecoder("utf-16le", { fatal: false }).decode(b);

async function stream(b: Uint8Array, fmt: "gzip" | "deflate" | "deflate-raw"): Promise<Uint8Array> {
  const ds = new DecompressionStream(fmt as CompressionFormat);
  const res = new Response(new Blob([b as BlobPart]).stream().pipeThrough(ds));
  return new Uint8Array(await res.arrayBuffer());
}
async function digest(alg: "SHA-256" | "SHA-1", b: Uint8Array) { return hexencode(new Uint8Array(await crypto.subtle.digest(alg, b as BufferSource))); }

// MD5 (RFC 1321) — WebCrypto has none; small, dependency-free.
export function md5(b: Uint8Array): string {
  const K = new Uint32Array(64), S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
  const len = b.length, n = (((len + 8) >> 6) + 1) * 16, w = new Uint32Array(n);
  for (let i = 0; i < len; i++) w[i >> 2] |= b[i] << ((i % 4) * 8);
  w[len >> 2] |= 0x80 << ((len % 4) * 8);
  w[n - 2] = (len * 8) >>> 0; w[n - 1] = Math.floor((len * 8) / 2 ** 32);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let o = 0; o < n; o += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; } else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const tmp = D; D = C; C = B;
      const x = (A + F + K[i] + w[o + g]) >>> 0;
      B = (B + ((x << S[i]) | (x >>> (32 - S[i])))) >>> 0; A = tmp;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  return [a0, b0, c0, d0].map((v) => Array.from({ length: 4 }, (_, i) => ((v >>> (i * 8)) & 255).toString(16).padStart(2, "0")).join("")).join("");
}

function xorKey(arg: string): Uint8Array {
  const a = (arg || "0x41").trim();
  if (/^(?:0x)?[0-9a-f]+$/i.test(a) && (a.startsWith("0x") || a.length % 2 === 0)) return hexdecode(a.replace(/^0x/i, "").padStart(2, "0"));
  return bytes(a);
}
const rot = (s: string, n: number) => s.replace(/[a-z]/gi, (c) => { const base = c <= "Z" ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - base + n) % 26 + 26) % 26 + base); });

/** PowerShell -EncodedCommand: pull the Base64 after -e/-enc/… (or take the whole input) and decode UTF-16LE. */
export function psDecode(s: string): string {
  const m = s.match(/\s[-/](?:e|ec|en|enc|enco|encod|encode|encodedcommand)\s+([A-Za-z0-9+/=]{8,})/i);
  return utf16le(b64decode(m ? m[1] : s.trim()));
}

export async function apply(op: Op, input: Uint8Array): Promise<Uint8Array> {
  const s = () => utf8(input);
  switch (op.id) {
    case "fromBase64": return b64decode(s());
    case "toBase64": return bytes(b64encode(input));
    case "fromHex": return hexdecode(s());
    case "toHex": return bytes(hexencode(input));
    case "urlDecode": return bytes(decodeURIComponent(s().replace(/\+/g, " ")));
    case "urlEncode": return bytes(encodeURIComponent(s()));
    case "htmlDecode": return bytes(htmlDecode(s()));
    case "fromUtf16le": return bytes(utf16le(input));
    case "psEncoded": return bytes(psDecode(s()));
    case "gunzip": return stream(input, "gzip");
    case "inflate": try { return await stream(input, "deflate"); } catch { return stream(input, "deflate-raw"); }
    case "xor": { const k = xorKey(op.arg || ""); if (!k.length) return input; return input.map((x, i) => x ^ k[i % k.length]); }
    case "rot": return bytes(rot(s(), Number(op.arg ?? 13) || 13));
    case "reverse": return bytes(Array.from(s()).reverse().join(""));
    case "jwt": {
      const [h, p, sig] = s().trim().split(".");
      if (!h || !p) throw new Error("Not a JWT");
      const j = (x: string) => JSON.stringify(JSON.parse(utf8(b64decode(x))), null, 2);
      return bytes(`// header\n${j(h)}\n// payload\n${j(p)}\n// signature (not verified)\n${sig || ""}`);
    }
    case "unicodeUnescape": return bytes(s().replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})|%u([0-9a-f]{4})/gi, (_m, a, b2, c, d) => String.fromCodePoint(parseInt(a || b2 || c || d, 16))));
    case "defang": return bytes(s().replace(/\b(?:https?|ftp):\/\/[^\s"'<>]+|\b(?:\d{1,3}\.){3}\d{1,3}\b|\b[\w.+%-]+@[\w.-]+\.\w{2,}\b|\b(?:[a-z0-9-]+\.)+[a-z]{2,24}\b/gi, (m) => defang(m)));
    case "refang": return bytes(refang(s()));
    case "strings": { const min = Math.max(2, Number(op.arg) || 4); return bytes((utf8(input).match(new RegExp(`[\\x20-\\x7e]{${min},}`, "g")) || []).join("\n")); }
    case "sha256": return bytes(await digest("SHA-256", input));
    case "sha1": return bytes(await digest("SHA-1", input));
    case "md5": return bytes(md5(input));
  }
}

export interface Step { op: Op; ok: boolean; output: Uint8Array; error?: string }
export async function runRecipe(input: string, recipe: Op[]): Promise<Step[]> {
  let cur: Uint8Array = bytes(input);
  const steps: Step[] = [];
  for (const op of recipe) {
    try { cur = await apply(op, cur); steps.push({ op, ok: true, output: cur }); }
    catch (e: any) { steps.push({ op, ok: false, output: cur, error: String(e?.message || e) }); break; }
  }
  return steps;
}

/** How "readable" bytes are (share of printable ASCII / whitespace). */
export function printable(b: Uint8Array): number {
  if (!b.length) return 0;
  let n = 0;
  for (const x of b) if ((x >= 32 && x < 127) || x === 9 || x === 10 || x === 13) n++;
  return n / b.length;
}
const isGzip = (b: Uint8Array) => b[0] === 0x1f && b[1] === 0x8b;
const looksUtf16 = (b: Uint8Array) => b.length >= 4 && b.length % 2 === 0 && b.filter((x, i) => i % 2 === 1 && x === 0).length > b.length / 2 * 0.8;

/** Magic: peel off layers that obviously apply, up to 6 deep. */
export async function magic(input: string): Promise<{ recipe: Op[]; output: string }> {
  const recipe: Op[] = [];
  let cur: Uint8Array = bytes(input.trim());
  for (let depth = 0; depth < 6; depth++) {
    const text = utf8(cur).trim();
    let next: Op | null = null;
    if (isGzip(cur)) next = { id: "gunzip" };
    else if (looksUtf16(cur)) next = { id: "fromUtf16le" };
    else if (/\s[-/](?:e|ec|en|enc|encodedcommand)\s+[A-Za-z0-9+/=]{16,}/i.test(text)) next = { id: "psEncoded" };
    else if (/^eyJ[\w-]+\.[\w-]+\.?[\w-]*$/.test(text)) next = { id: "jwt" };
    else if (/^[A-Za-z0-9+/_-]{16,}={0,2}$/.test(text.replace(/\s+/g, "")) && text.replace(/\s+/g, "").length % 4 !== 1) next = { id: "fromBase64" };
    else if (/^(?:[0-9a-f]{2}[\s:]?){8,}$/i.test(text)) next = { id: "fromHex" };
    else if (/%[0-9a-f]{2}/i.test(text) && (text.match(/%[0-9a-f]{2}/gi) || []).length >= 3) next = { id: "urlDecode" };
    else if (/&(?:#x?[0-9a-f]+|[a-z]+);/i.test(text) && (text.match(/&(?:#x?[0-9a-f]+|[a-z]+);/gi) || []).length >= 3) next = { id: "htmlDecode" };
    else if (/\\u[0-9a-f]{4}|\\x[0-9a-f]{2}/i.test(text)) next = { id: "unicodeUnescape" };
    if (!next) break;
    try {
      const out = await apply(next, cur);
      if (!out.length || (next.id === "fromBase64" && printable(out) < 0.6 && !isGzip(out) && !looksUtf16(out))) break;
      recipe.push(next); cur = out;
    } catch { break; }
  }
  return { recipe, output: utf8(cur) };
}
