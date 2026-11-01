/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - AI workspace for legal, security & business teams
 * Maintained by: AXTO Digital Global <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Cloudflare bindings and the data store.
 *
 * Bindings (dashboard/wrangler.toml):
 *   DATA       R2   axto-data       — every record (users, subscriptions, orders, licences…), lib/data
 *   BACKUPS    R2   axto-backups    — daily backups of DATA (35 days) and the archive of the old D1 tables
 *   DB         D1   axto-db         — READ ONLY: the source of the one-time move to R2 (lib/data/migrate.ts);
 *                                     removed seven days after it (CLAUDE.md §6: R2 only, never D1)
 *   KV         KV   axto-kv         — rate limits, small caches
 *   R2         R2   axto-storage    — platform content (encrypted prompts, invoices, archives)
 *   USER_FILES R2   axto-documents  — member uploads & saved work (u/<userId>/…)
 *   R2_BUILDS  R2   axto-builds     — self-hosted Docker images, EXEs, guide PDFs
 *   AI         Workers AI            — used ONLY by the locked Managed AI path and the support assistant (never by BYOX apps)
 * ============================================================================ */

import type { NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { Store } from "./r2/store";
import { dataFor, GatedBucket, type Data } from "./data";
import { MaintenanceError, runMigration, type D1Like, type StepEnv } from "./data/migrate";

export interface CfEnv {
  DATA?: any;
  BACKUPS?: any;
  DB?: any;
  KV?: any;
  R2?: any;
  USER_FILES?: any;
  R2_BUILDS?: any;
  AI?: any;
  [k: string]: any;
}

// Bindings and secrets are fixed for the life of an isolate. Keeping the last
// request's env lets work that outlives its request (WebSocket message
// handlers, waitUntil tasks) still reach R2, KV and secrets.
let lastEnv: CfEnv | null = null;

export function getEnv(_req?: NextRequest): CfEnv {
  try {
    const ctx = getRequestContext();
    if (ctx?.env) { lastEnv = ctx.env as unknown as CfEnv; return lastEnv; }
  } catch {}
  if (lastEnv) return lastEnv;
  try {
    const pe = (process as any).env;
    if (pe?.DATA || pe?.DB) return pe as CfEnv;
  } catch {}
  return {};
}

function need(name: keyof CfEnv, req?: NextRequest): any {
  const b = getEnv(req)[name];
  if (!b) throw new Error(`Cloudflare binding "${String(name)}" is not configured.`);
  return b;
}

/* ── records (R2) ─────────────────────────────────────────────────────── */

export function migrationEnv(env: CfEnv): StepEnv {
  return {
    d1: (env.DB as D1Like | undefined) ?? null,
    archive: env.BACKUPS ?? null,
    migratePayments: async (d1) => (await import("./billing/gateways")).migrateLegacyPayments(d1),
  };
}

let cached: { binding: unknown; data: Data; raw: Data } | null = null;
let ready = false;
let pending: Promise<void> | null = null;

/** Wait until the one-time move from D1 is done (runs one step of it if not). */
function gate(raw: Data, env: CfEnv): Promise<void> {
  if (ready) return Promise.resolve();
  pending ??= (async () => {
    const state = await runMigration(raw, migrationEnv(env), 1);
    if (!state) throw new MaintenanceError();
    ready = true;
  })().finally(() => { pending = null; });
  return pending;
}

function stores(req?: NextRequest) {
  const env = getEnv(req);
  const bucket = env.DATA;
  if (!bucket) throw new Error(`Cloudflare binding "DATA" is not configured.`);
  if (cached && cached.binding === bucket) return cached;
  const raw = dataFor(new Store(bucket));
  const next = { binding: bucket, raw, data: dataFor(new Store(new GatedBucket(bucket, () => gate(raw, env)))) };
  cached = next;
  return next;
}

/**
 * Whether the records can be used (the one-time move from D1 is done). Runs
 * one step of the move when no one else is, so visitors finish it too; false
 * while it is still running (the middleware answers 503 then).
 */
export async function dataReady(req?: NextRequest): Promise<boolean> {
  if (ready) return true;
  const env = getEnv(req);
  if (!env.DATA) return true; // not configured: the route itself reports the missing binding
  try {
    await gate(stores(req).raw, env);
    return true;
  } catch (e) {
    if (e instanceof MaintenanceError) return false;
    throw e;
  }
}

/** Every record of the platform (lib/data/schema.ts), on the private R2 bucket DATA. */
export const getData = (req?: NextRequest): Data => stores(req).data;
/** The same collections without the migration gate — for the migrator, backups and the health probe. */
export const getRawData = (req?: NextRequest): Data => stores(req).raw;
export const getKV = (req?: NextRequest) => need("KV", req);
export const getR2 = (req?: NextRequest) => need("R2", req);
export const getR2Builds = (req?: NextRequest) => getEnv(req).R2_BUILDS || need("R2", req);
export const getUserFiles = (req?: NextRequest) => getEnv(req).USER_FILES || need("R2", req);
export const getAI = (req?: NextRequest) => getEnv(req).AI || null;

/** Run background work after the response (webhook fan-out, filling the trial pool) when the platform allows it. */
export function background(p: Promise<unknown>) {
  try {
    getRequestContext().ctx.waitUntil(p.catch(() => {}));
    return;
  } catch {}
  p.catch(() => {});
}

/** Server-side secret/env lookup: Pages secrets are exposed on process.env and on the binding env. */
export function secret(name: string): string {
  const fromBinding = getEnv()[name];
  if (typeof fromBinding === "string" && fromBinding) return fromBinding;
  return (process.env[name] as string) || "";
}

export function newId(prefix = ""): string {
  const id = crypto.randomUUID().replace(/-/g, "");
  return prefix ? `${prefix}_${id.slice(0, 20)}` : id;
}

export function now(): string {
  return new Date().toISOString();
}
