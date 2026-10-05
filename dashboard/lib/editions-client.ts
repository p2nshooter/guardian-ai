/* One shared fetch of /api/editions per page view (public cards, product pages). */
"use client";
export interface EditionsPayload {
  editions: { app: string; tier: "starter" | "professional" | "business" | "enterprise"; code: string; name: string; yearly: number; monthly: number; features: string[] }[];
  trials: { open: boolean; days: number; maxProducts: number; apps: Record<string, { total: number; available: number; edition: string }> };
}
let pending: Promise<EditionsPayload | null> | null = null;
export function loadEditions(): Promise<EditionsPayload | null> {
  if (!pending) pending = fetch("/api/editions").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return pending;
}
