/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getR2Builds, dbRun, dbFirst, dbQuery, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const TYPES   = ["docker","exe"];
const ARCHES  = ["linux","arm64","windows"];

// ── GET: list real builds from R2 ─────────────────────────────────────────────
// CI writes to builds/latest/raw/<name>.tar.gz (docker) and
// builds/latest/exe/<name>-windows.exe (Windows EXE) — this must list from
// those exact prefixes, matching r2ImageKey()/r2ExeKey() in the admin UI.
// (An earlier version listed a "releases/<channel>/*.zip" prefix that no
// workflow has ever written to, so every product always showed "Not Built"
// regardless of what was actually in R2.)
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error:"R2 not available", hasR2:false });
  }

  let files: any[] = [];
  try {
    const [rawList, exeList] = await Promise.all([
      r2.list({ prefix: "builds/latest/raw/", limit: 200 }),
      r2.list({ prefix: "builds/latest/exe/", limit: 200 }),
    ]);
    const objects = [...(rawList.objects || []), ...(exeList.objects || [])];
    files = objects.map((o: any) => ({
      key:      o.key,
      size:     o.size,
      size_mb:  o.size ? Math.round(o.size / 1024 / 1024) : 0,
      uploaded: o.uploaded,
      name:     o.key.split("/").pop(),
    }));
  } catch {}

  return NextResponse.json({ files, total: files.length, hasR2: true });
}

// ── POST: actions (delete, webhook callback) ─────────────────────────────────
export async function POST(req: NextRequest) {
  const body: any = await req.json().catch(() => ({}));
  const { action } = body;

  // ── Webhook from GitHub Actions (no admin session) ────────────────────────
  if (action === "auto_build_complete") {
    const secret    = process.env.BUILD_WEBHOOK_SECRET || "";
    const reqSecret = req.headers.get("X-Build-Secret") || "";
    if (secret && reqSecret !== secret)
      return NextResponse.json({ error:"Unauthorized" }, { status:401 });

    let db: any;
    try { db = getDB(req); } catch {
      return NextResponse.json({ error:"DB unavailable" }, { status:503 });
    }

    const { channel, tag, commit, run_url, status } = body;
    await dbRun(db,
      `INSERT OR REPLACE INTO auto_releases (id,channel,tag,commit_sha,run_url,status,built_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [newId(), channel||"latest", tag||"", commit||"", run_url||"", status||"success",
       now(), now(), now()]
    );
    return NextResponse.json({ ok:true });
  }

  // ── Admin-only actions ────────────────────────────────────────────────────
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error:"R2 not available" }, { status:503 });
  }

  // ── delete_file: delete specific file ────────────────────────────────────
  if (action === "delete_file") {
    const { key } = body;
    if (!key) return NextResponse.json({ error:"key required" }, { status:400 });
    await r2.delete(key);
    return NextResponse.json({ ok:true, deleted:key });
  }

  // ── delete_channel: delete ALL files in a channel ────────────────────────
  if (action === "delete_channel") {
    const { channel } = body;
    if (!channel || channel === "latest")
      return NextResponse.json({ error:"Cannot delete 'latest' channel entirely — delete files individually" }, { status:400 });
    try {
      const list = await r2.list({ prefix:`releases/${channel}/`, limit:1000 });
      const keys = (list.objects || []).map((o:any) => o.key);
      for (const k of keys) await r2.delete(k);
      return NextResponse.json({ ok:true, deleted:keys.length });
    } catch(e:any) {
      return NextResponse.json({ error:e.message }, { status:500 });
    }
  }

  // ── delete_product: delete all variants of one product ───────────────────
  if (action === "delete_product") {
    const { product, channel = "latest" } = body;
    if (!product) return NextResponse.json({ error:"product required" }, { status:400 });
    const deleted: string[] = [];
    for (const t of TYPES) {
      for (const a of ARCHES) {
        const key = `releases/${channel}/${product}-${t}-${a}.zip`;
        try { await r2.delete(key); deleted.push(key); } catch {}
      }
    }
    return NextResponse.json({ ok:true, deleted_count: deleted.length, deleted });
  }

  return NextResponse.json({ error:"Unknown action" }, { status:400 });
}

// ── PUT: upload a build file to R2 (multipart form) ──────────────────────────
export async function PUT(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error:"R2 not available" }, { status:503 });
  }

  let product: string, type: string, arch: string, file: File | null = null;
  try {
    const form = await req.formData();
    product = (form.get("product") as string)||"";
    type    = (form.get("type")    as string)||"";
    arch    = (form.get("arch")    as string)||"";
    file    = form.get("file") as File;
  } catch {
    return NextResponse.json({ error:"Invalid form data" }, { status:400 });
  }

  if (!product || !type || !arch || !file)
    return NextResponse.json({ error:"product, type, arch, file required" }, { status:400 });

  const VALID_PRODUCTS = [
    "guardian-core","guardian-node","guardian-clamav","guardian-core-node","guardian-bundle",
    "orchestra-core","orchestra-worker-cpu","orchestra-worker-gpu","orchestra-core-cpu","orchestra-bundle",
    "full-bundle",
  ];
  const VALID_TYPES  = ["docker","exe"];
  const VALID_ARCHES = ["linux","arm64","windows"];

  if (!VALID_PRODUCTS.includes(product)) return NextResponse.json({ error:"Invalid product" }, { status:400 });
  if (!VALID_TYPES.includes(type))       return NextResponse.json({ error:"Invalid type" },    { status:400 });
  if (!VALID_ARCHES.includes(arch))      return NextResponse.json({ error:"Invalid arch" },    { status:400 });

  const key = `releases/latest/${product}-${type}-${arch}.zip`;
  try {
    const buf = await file.arrayBuffer();
    await r2.put(key, buf, {
      httpMetadata: { contentType:"application/zip" },
      customMetadata: {
        product, type, arch,
        uploaded_by: (user as any).email || "admin",
        source: "manual_upload",
        size: String(buf.byteLength),
      },
    });
    return NextResponse.json({ ok:true, key, size_mb: Math.round(buf.byteLength/1024/1024) });
  } catch(e:any) {
    return NextResponse.json({ error: e.message||"Upload failed" }, { status:500 });
  }
}

// ── DELETE: remove one R2 file ────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error:"R2 not available" }, { status:503 });
  }

  const body: any = await req.json().catch(() => ({}));
  const { product, type, arch, channel = "latest" } = body;

  if (!product || !type || !arch)
    return NextResponse.json({ error:"product, type, arch required" }, { status:400 });

  const key = `releases/${channel}/${product}-${type}-${arch}.zip`;
  try {
    await r2.delete(key);
    return NextResponse.json({ ok:true, key });
  } catch(e:any) {
    return NextResponse.json({ error: e.message||"Delete failed" }, { status:500 });
  }
}
