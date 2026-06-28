/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * /api/admin/build-availability
 *
 * GET  → returns { availability: Record<"product:format", boolean> }
 *        e.g. { "vault:docker": true, "vault:exe-linux": false, "vault:exe-windows": false }
 *
 * POST → { product: string, format: "docker"|"exe-linux"|"exe-windows", enabled: boolean }
 *        saves the toggle to the DB and returns { success: true }
 *
 * Formats:
 *   docker      — tar.gz Docker image for Linux servers
 *   exe-linux   — standalone EXE/binary for Linux (systemd service)
 *   exe-windows — Windows self-extracting installer
 *
 * Default (table empty / row missing): ALL formats for Guardian & Orchestra enabled,
 * everything else disabled (Coming Soon) until admin explicitly enables them.
 */
export const runtime  = "edge";
export const dynamic  = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// All products that have downloadable builds
const ALL_PRODUCTS = [
  "guardian", "orchestra", "vault", "edge",
  "soc", "compliance", "sentinel", "antivirus", "studio",
];
const ALL_FORMATS = ["docker", "exe-linux", "exe-windows"] as const;
type Format = typeof ALL_FORMATS[number];

// Products enabled by default (builds already shipped)
const DEFAULT_ENABLED: Record<string, Format[]> = {
  guardian:   ["docker", "exe-linux", "exe-windows"],
  orchestra:  ["docker"],
  antivirus:  ["docker"],
  studio:     ["docker"],
  // everything else: all formats disabled (Coming Soon)
};

function defaultEnabled(product: string, format: Format): boolean {
  return (DEFAULT_ENABLED[product] ?? []).includes(format);
}

/** Ensure the table exists — runs once per cold start, idempotent */
async function ensureTable(db: any) {
  await dbRun(db,
    `CREATE TABLE IF NOT EXISTS build_formats (
       product TEXT NOT NULL,
       format  TEXT NOT NULL,
       enabled INTEGER NOT NULL DEFAULT 0,
       updated_at TEXT NOT NULL DEFAULT (datetime('now')),
       PRIMARY KEY (product, format)
     )`,
    []
  );
}

/** Read all rows, fill in defaults for missing ones */
async function readAll(db: any): Promise<Record<string, boolean>> {
  await ensureTable(db);

  const rows = await dbQuery<{ product: string; format: string; enabled: number }>(
    db,
    `SELECT product, format, enabled FROM build_formats`
  );

  const result: Record<string, boolean> = {};

  for (const prod of ALL_PRODUCTS) {
    for (const fmt of ALL_FORMATS) {
      const key = `${prod}:${fmt}`;
      const row = rows.find(r => r.product === prod && r.format === fmt);
      result[key] = row !== undefined ? row.enabled === 1 : defaultEnabled(prod, fmt);
    }
  }

  return result;
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    // DB not available — return defaults
    const result: Record<string, boolean> = {};
    for (const p of ALL_PRODUCTS)
      for (const f of ALL_FORMATS)
        result[`${p}:${f}`] = defaultEnabled(p, f);
    return NextResponse.json({ availability: result, source: "defaults" });
  }

  try {
    const availability = await readAll(db);
    return NextResponse.json({ availability });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { product?: string; format?: string; enabled?: boolean };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { product, format, enabled } = body;

  if (!product || !ALL_PRODUCTS.includes(product))
    return NextResponse.json({ error: `Unknown product: ${product}` }, { status: 400 });

  if (!format || !ALL_FORMATS.includes(format as Format))
    return NextResponse.json({ error: `Unknown format: ${format}. Must be docker, exe-linux, or exe-windows.` }, { status: 400 });

  if (typeof enabled !== "boolean")
    return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB not available" }, { status: 503 });
  }

  try {
    await ensureTable(db);
    await dbRun(db,
      `INSERT INTO build_formats (product, format, enabled, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(product, format) DO UPDATE SET
         enabled    = excluded.enabled,
         updated_at = excluded.updated_at`,
      [product, format, enabled ? 1 : 0]
    );
    return NextResponse.json({ success: true, product, format, enabled });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
