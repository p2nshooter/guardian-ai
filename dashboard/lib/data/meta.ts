/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * Orders keep a small JSON object in `meta` (environment, chosen apps, bank
 * proof, notes…). These helpers read and change it the way SQLite's
 * json_extract / json_set did, without ever throwing on old or empty values.
 * ============================================================================ */

export function readMeta(meta: string | null | undefined): Record<string, any> {
  try {
    const v = JSON.parse(meta || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** A copy of `meta` with `fn` applied to its object (json_set). */
export function patchMeta(meta: string | null | undefined, fn: (m: Record<string, any>) => void): string {
  const m = readMeta(meta);
  fn(m);
  return JSON.stringify(m);
}
