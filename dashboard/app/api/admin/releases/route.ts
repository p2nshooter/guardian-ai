export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getR2Builds, dbRun, dbFirst, dbQuery, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const PRODUCTS = [
  "guardian-core","guardian-node","guardian-clamav","guardian-core-node","guardian-bundle",
  "orchestra-core","orchestra-worker-cpu","orchestra-worker-gpu","orchestra-core-cpu","orchestra-bundle",
  "full-bundle",
];
const TYPES   = ["docker","exe"];
const ARCHES  = ["linux","arm64","windows"];
const CHANNELS = ["latest"];

// ── GET: list releases from R2 ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const url     = new URL(req.url);
  const channel = url.searchParams.get("channel") || "latest";

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error:"R2 not available", hasR2:false });
  }

  // Read manifest
  let manifest: any = null;
  try {
    const mObj = await r2.get(`releases/${channel}/manifest.json`);
    if (mObj) manifest = JSON.parse(await mObj.text());
  } catch {}

  // List all files in channel
  let files: any[] = [];
  try {
    const list = await r2.list({ prefix:`releases/${channel}/`, limit:200 });
    files = (list.objects || []).map((o: any) => ({
      key:      o.key,
      size:     o.size,
      size_mb:  o.size ? Math.round(o.size / 1024 / 1024) : 0,
      uploaded: o.uploaded,
      name:     o.key.replace(`releases/${channel}/`, ""),
    })).filter((f:any) => f.name !== "manifest.json");
  } catch {}

  // Parse files into structured product list
  const parsed = files.map(f => {
    // guardian-bundle-docker-linux.zip
    const m = f.name.match(/^(.+)-(docker|exe)-(linux|arm64|windows)\.zip$/);
    return m ? { ...f, product:m[1], type:m[2], arch:m[3] } : { ...f, product:"unknown", type:"?", arch:"?" };
  });

  return NextResponse.json({ channel, manifest, files: parsed, total: files.length, hasR2: true });
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
