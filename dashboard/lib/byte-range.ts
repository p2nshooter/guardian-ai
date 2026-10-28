/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * HTTP Range parsing for build downloads (RFC 9110 §14.1.2), one range only:
 * a browser or AXTO Setup resuming a multi-GB image asks for `bytes=N-`.
 * Several ranges, or a header that is not bytes=…, get the whole file (200).
 * ============================================================================ */

export type ByteRange = { start: number; end: number } | "unsatisfiable" | null;

export function parseRange(header: string | null | undefined, size: number): ByteRange {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header || "").trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  if (m[1] === "") {
    // bytes=-N: the last N bytes
    const n = Number(m[2]);
    if (!Number.isSafeInteger(n) || n <= 0) return n === 0 ? "unsatisfiable" : null;
    return size === 0 ? "unsatisfiable" : { start: Math.max(0, size - n), end: size - 1 };
  }
  const start = Number(m[1]);
  if (!Number.isSafeInteger(start)) return null;
  if (start >= size) return "unsatisfiable";
  let end = m[2] === "" ? size - 1 : Number(m[2]);
  if (!Number.isSafeInteger(end) || end < start) return null;
  if (end >= size) end = size - 1;
  return { start, end };
}

/** Human file size for build lists (1.0 KB … 6.12 GB, binary units). */
export function buildSize(bytes: number): string {
  if (!(bytes > 0)) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n >= 100 || i === 0 ? Math.round(n) : n.toFixed(n >= 10 ? 1 : 2)} ${u[i]}`;
}
