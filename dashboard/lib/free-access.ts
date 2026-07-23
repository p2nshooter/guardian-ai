/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * AXTO Free Full-Access Program (lib/free-access.ts)
 * ---------------------------------------------------------------------------
 * The whole AXTO catalogue is offered at FULL tier, with NO paid licence, for
 * a fixed window of one year — aligned to the axto.io domain term. This module
 * is the single source of truth for that window.
 *
 * How the transparent kill-switch works (NON-destructive by design):
 *   • While the window is OPEN, /api/license-validate returns a signed
 *     `valid:true` grant whose `expires_at` == the global program end date.
 *   • Every on-prem engine already checks that expiry locally and, when it
 *     passes, locks itself into a read-only state and shows a renew/notice
 *     message. So when the year ends, every install locks itself with a clear
 *     message — WITHOUT any code ever deleting a client's data or scripts.
 *   • Advance countdown notices (warning / critical_warning) are surfaced in
 *     the signed response and in the portal, so no lock is ever a surprise.
 *
 * Admin can move the end date from the portal; the override lives in the
 * `platform_config` D1 table and always falls back to the compiled default,
 * so a missing table / cold cache can never accidentally "expire" everyone.
 * ============================================================================ */
import { NextRequest } from "next/server";
import { dbFirst, dbRun, getDB, now } from "@/lib/db";

export const FREE_ACCESS_PROGRAM_NAME = "AXTO Free Full-Access 2026";

// ── Compiled defaults ────────────────────────────────────────────────────────
// One year of free, full-tier access. These are the safe fallbacks used when
// neither an env override nor a DB (admin) override is present.
export const FREE_ACCESS_DEFAULT_START = "2026-07-23T00:00:00.000Z";
export const FREE_ACCESS_DEFAULT_END   = "2027-07-23T00:00:00.000Z";

// platform_config keys (admin-editable overrides)
const CFG_END     = "free_access_end";
const CFG_START   = "free_access_start";
const CFG_ENABLED = "free_access_enabled";

export interface FreeAccessConfig {
  enabled:  boolean;
  startISO: string;
  endISO:   string;
  source:   "db" | "env" | "default"; // where the END date came from
}

export interface FreeAccessStatus extends FreeAccessConfig {
  active:      boolean; // now within [start, end) and enabled
  now:         string;
  msLeft:      number;  // ms until end (clamped >= 0)
  daysLeft:    number;  // whole days until end (ceil, clamped >= 0)
  started:     boolean; // now >= start
  ended:       boolean; // now >= end
}

// ── Env overrides (server / build-time) ──────────────────────────────────────
function envStr(k: string): string | null {
  try {
    const v = (process as any)?.env?.[k];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  } catch { return null; }
}

/** Normalise a loosely-typed date input to a valid ISO string, or null. */
export function normalizeDate(input: unknown): string | null {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;
  // Accept plain YYYY-MM-DD as midnight UTC
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00.000Z` : s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ── Pure computation ─────────────────────────────────────────────────────────
export function computeFreeAccess(cfg: FreeAccessConfig, at: Date = new Date()): FreeAccessStatus {
  const start = new Date(cfg.startISO).getTime();
  const end   = new Date(cfg.endISO).getTime();
  const t     = at.getTime();
  const started = t >= start;
  const ended   = t >= end;
  const msLeft  = Math.max(0, end - t);
  return {
    ...cfg,
    now:      at.toISOString(),
    started,
    ended,
    active:   cfg.enabled && started && !ended,
    msLeft,
    daysLeft: Math.max(0, Math.ceil(msLeft / 86_400_000)),
  };
}

/** Env/default config only — no DB. Safe to call from any runtime. */
export function freeAccessConfigFromEnv(): FreeAccessConfig {
  const envEnd     = normalizeDate(envStr("AXTO_FREE_ACCESS_END"));
  const envStart   = normalizeDate(envStr("AXTO_FREE_ACCESS_START"));
  const envEnabled = envStr("AXTO_FREE_ACCESS_ENABLED");
  return {
    enabled:  envEnabled ? envEnabled !== "false" && envEnabled !== "0" : true,
    startISO: envStart || FREE_ACCESS_DEFAULT_START,
    endISO:   envEnd   || FREE_ACCESS_DEFAULT_END,
    source:   envEnd ? "env" : "default",
  };
}

// ── DB-aware resolution (admin override) with graceful fallback ──────────────
async function readConfigRow(db: any, key: string): Promise<string | null> {
  try {
    const row = await dbFirst<{ value: string }>(
      db, `SELECT value FROM platform_config WHERE key = ?`, [key]
    );
    return row?.value ?? null;
  } catch {
    // Table may not exist yet (pre-migration) — treat as "no override".
    return null;
  }
}

/**
 * Resolve the effective config, honouring an admin override in platform_config
 * and always falling back to env/compiled defaults. Never throws — on any DB
 * problem it returns the env/default config, so the program can never
 * accidentally lock everyone out because a lookup failed.
 */
export async function resolveFreeAccess(req?: NextRequest): Promise<FreeAccessConfig> {
  const base = freeAccessConfigFromEnv();
  let db: any;
  try { db = getDB(req); } catch { return base; }

  const dbEnd     = normalizeDate(await readConfigRow(db, CFG_END));
  const dbStart   = normalizeDate(await readConfigRow(db, CFG_START));
  const dbEnabled = await readConfigRow(db, CFG_ENABLED);

  return {
    enabled:  dbEnabled != null ? dbEnabled !== "false" && dbEnabled !== "0" : base.enabled,
    startISO: dbStart || base.startISO,
    endISO:   dbEnd   || base.endISO,
    source:   dbEnd ? "db" : base.source,
  };
}

export async function getFreeAccessStatus(req?: NextRequest, at: Date = new Date()): Promise<FreeAccessStatus> {
  return computeFreeAccess(await resolveFreeAccess(req), at);
}

/** Admin: persist a new end date (and optionally start / enabled). */
export async function setFreeAccessConfig(
  patch: { endISO?: string | null; startISO?: string | null; enabled?: boolean },
  req?: NextRequest
): Promise<FreeAccessConfig> {
  const db = getDB(req);
  const upsert = async (key: string, value: string) => {
    await dbRun(
      db,
      `INSERT INTO platform_config (key, value, updated_at) VALUES (?,?,?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
      [key, value, now()]
    );
  };
  if (patch.endISO !== undefined && patch.endISO !== null) {
    const e = normalizeDate(patch.endISO);
    if (!e) throw new Error("Invalid end date");
    await upsert(CFG_END, e);
  }
  if (patch.startISO !== undefined && patch.startISO !== null) {
    const s = normalizeDate(patch.startISO);
    if (!s) throw new Error("Invalid start date");
    await upsert(CFG_START, s);
  }
  if (patch.enabled !== undefined) {
    await upsert(CFG_ENABLED, patch.enabled ? "true" : "false");
  }
  return resolveFreeAccess(req);
}

// ── Free licence keys ────────────────────────────────────────────────────────
// While the program is open, every install ships with a per-product "free"
// key. It is a real, recognisable key (correct product prefix) so the existing
// signed-validation security model is unchanged — the server still signs the
// grant with Ed25519 and a MITM still cannot forge it. The key simply carries
// no paid entitlement of its own; the entitlement comes from the program.
export const PRODUCT_PREFIXES: Record<string, string> = {
  guardian: "GUARD", orchestra: "ORCH", vault: "VAULT", edge: "EDGE",
  soc: "SOC", compliance: "CMPL", sentinel: "SNTL", antivirus: "AV",
  studio: "STUD", legal: "LEGL", yp: "YP",
};

// Top-tier package code per product, so buildFeatures() unlocks the full set.
const FREE_TOP_PACKAGE: Record<string, string> = {
  guardian: "aegis",
  orchestra: "orchestra_unlimited",
  vault: "vault_enterprise",
  edge: "edge_enterprise",
  soc: "soc_enterprise",
  compliance: "compliance_enterprise",
  sentinel: "sentinel_enterprise",
  antivirus: "antivirus_enterprise",
  studio: "studio_enterprise",
  legal: "legal_enterprise",
  yp: "yp_enterprise",
};

export function freeTopPackage(product: string): string {
  return FREE_TOP_PACKAGE[(product || "").toLowerCase()] || "enterprise_free";
}

export function freeKeyForProduct(product: string): string {
  const p = (product || "").toLowerCase();
  const prefix = PRODUCT_PREFIXES[p] || "GUARD";
  return `${prefix}-FREE-ACCESS-2026`;
}

/** True for any key of the form <PREFIX>-FREE-ACCESS-... (case-insensitive). */
export function isFreeAccessKey(key: string): boolean {
  const parts = (key || "").trim().toUpperCase().split("-");
  return parts.length >= 3 && parts[1] === "FREE" && parts[2] === "ACCESS";
}
