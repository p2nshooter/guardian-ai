/**
 * AXTO — Cloudflare D1 Database Client
 * Uses official @cloudflare/next-on-pages getRequestContext()
 */

import { NextRequest } from "next/server";

function getEnv(req?: NextRequest): any {
  // Method 1: Official @cloudflare/next-on-pages getRequestContext
  try {
    const { getRequestContext } = require("@cloudflare/next-on-pages");
    const ctx = getRequestContext();
    if (ctx?.env?.DB) return ctx.env;
  } catch {}

  // Method 2: process.env (CF Pages injects bindings here with nodejs_compat_populate_process_env)
  try {
    const pe = process as any;
    if (pe.env?.DB) return pe.env;
  } catch {}

  // Method 3: globalThis.__cloudflare_request_context__ (older next-on-pages)
  try {
    const g = globalThis as any;
    if (g.__cloudflare_request_context__?.env?.DB) return g.__cloudflare_request_context__.env;
  } catch {}

  // Method 4: Via request symbols
  if (req) {
    try {
      const r = req as any;
      if (r.__env__?.DB) return r.__env__;
      if (r.cf?.env?.DB) return r.cf.env;
      const keys = Object.getOwnPropertySymbols(r);
      for (const sym of keys) {
        const val = r[sym];
        if (val?.DB) return val;
      }
    } catch {}
  }

  return null;
}

export function getDB(req?: NextRequest): any {
  const env = getEnv(req);
  if (env?.DB) return env.DB;
  throw new Error(
    "D1 binding 'DB' not found. Ensure wrangler.toml [[d1_databases]] is configured and IDs are set."
  );
}

export function getKV(req?: NextRequest): any {
  const env = getEnv(req);
  if (env?.KV) return env.KV;
  throw new Error("KV binding not found.");
}

export function getR2(req?: NextRequest): any {
  const env = getEnv(req);
  if (env?.R2) return env.R2;
  throw new Error("R2 binding not found.");
}

// ── Query helpers ─────────────────────────────────────────────────────────

export async function dbQuery<T = Record<string, unknown>>(
  db: any, sql: string, params: unknown[] = []
): Promise<T[]> {
  const result = await db.prepare(sql).bind(...params).all();
  return (result.results || []) as T[];
}

export async function dbFirst<T = Record<string, unknown>>(
  db: any, sql: string, params: unknown[] = []
): Promise<T | null> {
  const result = await db.prepare(sql).bind(...params).first();
  return (result as T) ?? null;
}

export async function dbRun(
  db: any, sql: string, params: unknown[] = []
): Promise<any> {
  return db.prepare(sql).bind(...params).run();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
