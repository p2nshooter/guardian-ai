/* AXTO — GET /api/admin/releases · self-hosted builds present in R2 (axto-builds).
 * GET|HEAD /api/admin/releases?key=builds/latest/… streams one of them to the admin
 * (resumable, like the member download). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getR2Builds } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { serveBuild } from "@/lib/builds";

const RELEASE_PREFIXES = ["builds/latest/installer/", "builds/latest/offline/", "builds/latest/raw/", "builds/latest/guides/", "builds/latest/exe/"];

const TYPES: Record<string, string> = { ".gz": "application/gzip", ".zip": "application/zip", ".exe": "application/vnd.microsoft.portable-executable", ".txt": "text/plain; charset=utf-8", ".pdf": "application/pdf" };

async function file(req: NextRequest, key: string) {
  if (!RELEASE_PREFIXES.some((p) => key.startsWith(p)) || key.includes("..")) return NextResponse.json({ error: "Unknown file" }, { status: 404 });
  const name = key.slice(key.lastIndexOf("/") + 1);
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const res = await serveBuild(req, key, { filename: name, type: TYPES[ext] || "application/octet-stream" });
  return res || NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const key = new URL(req.url).searchParams.get("key");
  if (key) return file(req, key);
  const r2 = getR2Builds(req);
  const files: { key: string; size: number; uploaded: string }[] = [];
  for (const prefix of RELEASE_PREFIXES) {
    let cursor: string | undefined;
    do {
      const res: any = await r2.list({ prefix, limit: 500, cursor });
      for (const o of res.objects || []) files.push({ key: o.key, size: o.size, uploaded: o.uploaded ? new Date(o.uploaded).toISOString() : "" });
      cursor = res.truncated ? res.cursor : undefined;
    } while (cursor);
  }
  return respond({ files }, ctx);
}

export async function HEAD(req: NextRequest) {
  const ctx = await requireAdmin(req);
  const key = new URL(req.url).searchParams.get("key");
  if (!ctx || !key) return new NextResponse(null, { status: ctx ? 400 : 403 });
  return file(req, key);
}
