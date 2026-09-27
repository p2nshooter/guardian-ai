/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Cloudflare bindings + tiny D1 helpers.
 *
 * Bindings (dashboard/wrangler.toml):
 *   DB         D1   axto-db         — lean relational core (users, subscriptions, orders…)
 *   KV         KV   axto-kv         — rate limits, small caches
 *   R2         R2   axto-storage    — platform content (encrypted prompts, invoices, archives)
 *   USER_FILES R2   axto-documents  — member uploads & saved work (u/<userId>/…)
 *   R2_BUILDS  R2   axto-builds     — self-hosted Docker images, EXEs, guide PDFs
 *   AI         Workers AI            — built-in model fallback (no API key needed)
 * ============================================================================ */

import type { NextRequest } from "next/server";

export interface CfEnv {
  DB?: any;
  KV?: any;
  R2?: any;
  USER_FILES?: any;
  R2_BUILDS?: any;
  AI?: any;
  [k: string]: any;
}

export function getEnv(_req?: NextRequest): CfEnv {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getRequestContext } = require("@cloudflare/next-on-pages");
    const ctx = getRequestContext();
    if (ctx?.env) return ctx.env as CfEnv;
  } catch {}
  try {
    const pe = (process as any).env;
    if (pe?.DB) return pe as CfEnv;
  } catch {}
  return {};
}

function need(name: keyof CfEnv, req?: NextRequest): any {
  const b = getEnv(req)[name];
  if (!b) throw new Error(`Cloudflare binding "${String(name)}" is not configured.`);
  return b;
}

export const getDB = (req?: NextRequest) => need("DB", req);
export const getKV = (req?: NextRequest) => need("KV", req);
export const getR2 = (req?: NextRequest) => need("R2", req);
export const getR2Builds = (req?: NextRequest) => getEnv(req).R2_BUILDS || need("R2", req);
export const getUserFiles = (req?: NextRequest) => getEnv(req).USER_FILES || need("R2", req);
export const getAI = (req?: NextRequest) => getEnv(req).AI || null;

/** Server-side secret/env lookup: Pages secrets are exposed on process.env and on the binding env. */
export function secret(name: string): string {
  const fromBinding = getEnv()[name];
  if (typeof fromBinding === "string" && fromBinding) return fromBinding;
  return (process.env[name] as string) || "";
}

// ── Query helpers ──────────────────────────────────────────────────────────
export async function dbQuery<T = Record<string, any>>(db: any, sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await db.prepare(sql).bind(...params).all();
  return (r.results || []) as T[];
}

export async function dbFirst<T = Record<string, any>>(db: any, sql: string, params: unknown[] = []): Promise<T | null> {
  const r = await db.prepare(sql).bind(...params).first();
  return (r as T) ?? null;
}

export async function dbRun(db: any, sql: string, params: unknown[] = []): Promise<any> {
  return db.prepare(sql).bind(...params).run();
}

/** Execute several statements atomically (D1 batch = single transaction). */
export async function dbBatch(db: any, stmts: [string, unknown[]][]): Promise<any[]> {
  return db.batch(stmts.map(([sql, p]) => db.prepare(sql).bind(...p)));
}

export function newId(prefix = ""): string {
  const id = crypto.randomUUID().replace(/-/g, "");
  return prefix ? `${prefix}_${id.slice(0, 20)}` : id;
}

export function now(): string {
  return new Date().toISOString();
}
