/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Browser-side API helper used by every portal page: one shape for success
 * and errors, credentials included, JSON in and out.
 * ============================================================================ */
"use client";

export interface ApiResult<T = any> { ok: boolean; status: number; data: T; error: string }

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const form = typeof FormData !== "undefined" && opts.body instanceof FormData;   // file uploads: the browser sets the multipart boundary
    const res = await fetch(path, {
      method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
      headers: opts.body !== undefined && !form ? { "Content-Type": "application/json" } : undefined,
      body: opts.body === undefined ? undefined : form ? (opts.body as FormData) : JSON.stringify(opts.body),
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth/")) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
    return { ok: res.ok && data?.ok !== false, status: res.status, data, error: res.ok ? (data?.ok === false ? data?.message || "" : "") : data?.error || `Request failed (${res.status})` };
  } catch (e: any) {
    return { ok: false, status: 0, data: {} as T, error: "Network error — check your connection and try again." };
  }
}

export async function signOut() {
  await api("/api/auth/logout", { method: "POST", body: {} });
  window.location.href = "/login";
}
