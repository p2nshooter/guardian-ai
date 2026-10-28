/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Which self-hosted builds exist in R2 right now (Docker images amd64 + arm64,
 * offline packages), cached in KV for 10 minutes — the portal only links files
 * that exist — and the one way every build file is streamed to a browser or
 * AXTO Setup (serveBuild).
 * ============================================================================ */
import { NextResponse, type NextRequest } from "next/server";
import { getEnv, getR2Builds } from "./db";
import { parseRange } from "./byte-range";

const LISTED = ["builds/latest/raw/", "builds/latest/offline/"];

/** Published build files (key → size in bytes), cached in KV for 10 minutes. */
export async function availableBuilds(req: NextRequest): Promise<Map<string, number>> {
  const kv = getEnv(req).KV;
  try {
    const hit = kv ? await kv.get("builds:available:v2") : null;
    if (hit) return new Map(JSON.parse(hit));
  } catch {}
  const files: [string, number][] = [];
  try {
    const r2 = getR2Builds(req);
    for (const prefix of LISTED) {
      let cursor: string | undefined;
      do {
        const res: any = await r2.list({ prefix, limit: 500, cursor });
        for (const o of res.objects || []) files.push([o.key, o.size || 0]);
        cursor = res.truncated ? res.cursor : undefined;
      } while (cursor);
    }
  } catch {}
  try { if (kv) await kv.put("builds:available:v2", JSON.stringify(files), { expirationTtl: 600 }); } catch {}
  return new Map(files);
}

/** Offline package of one app: AXTO Setup + every image (incl. optional ones), one .zip per architecture. */
export const offlineKey = (slug: string, arch: "amd64" | "arm64" = "amd64") => `builds/latest/offline/axto-${slug}-offline-${arch}.zip`;

/**
 * Streams a file of the builds bucket with what large downloads need: HEAD,
 * Range (resume after a dropped connection — 206 / 416), ETag + If-Range, and
 * Content-Length. null = the file does not exist.
 */
export async function serveBuild(req: NextRequest, key: string, o: { filename: string; type: string; cache?: string }): Promise<NextResponse | null> {
  const r2 = getR2Builds(req);
  const head = await r2.head(key);
  if (!head) return null;
  const size: number = head.size;
  const etag: string = head.httpEtag || `"${head.etag}"`;
  const modified = head.uploaded ? new Date(head.uploaded).toUTCString() : "";
  const headers: Record<string, string> = {
    "Content-Type": o.type,
    "Content-Disposition": `attachment; filename="${o.filename}"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": o.cache || "private, no-store",
    "X-Content-Type-Options": "nosniff",
    ETag: etag,
    ...(modified ? { "Last-Modified": modified } : {}),
  };
  let range = parseRange(req.headers.get("range"), size);
  const ifRange = req.headers.get("if-range");
  if (range && ifRange && ifRange !== etag && ifRange !== modified) range = null; // the file changed: send all of it
  if (range === "unsatisfiable") {
    return new NextResponse(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  }
  const length = range ? range.end - range.start + 1 : size;
  headers["Content-Length"] = String(length);
  if (range) headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
  if (req.method === "HEAD") return new NextResponse(null, { status: range ? 206 : 200, headers });
  // Same version as the HEAD above, or the sizes in the headers would be wrong.
  const obj = await r2.get(key, { onlyIf: { etagMatches: head.etag }, ...(range ? { range: { offset: range.start, length } } : {}) });
  if (!obj || !("body" in obj) || !obj.body) {
    return new NextResponse("This build was just replaced by a newer one — please start the download again.", { status: 503, headers: { "Retry-After": "5", "Cache-Control": "no-store" } });
  }
  return new NextResponse(obj.body, { status: range ? 206 : 200, headers });
}

export const imageKey = (name: string) => `builds/latest/raw/${name}.tar.gz`;

/** Docker engine architecture as the installer reports it → "amd64" | "arm64" ("" = unsupported). Default amd64. */
export function normArch(a: unknown): "amd64" | "arm64" | "" {
  const s = String(a ?? "").trim().toLowerCase();
  if (!s || s === "amd64" || s === "x86_64") return "amd64";
  if (s === "arm64" || s === "aarch64") return "arm64";
  return "";
}

/** R2 file base for an image: amd64 keeps the historical name, arm64 builds are <name>-arm64. */
export const archImageName = (name: string, arch: string) => (arch === "arm64" ? `${name}-arm64` : name);
