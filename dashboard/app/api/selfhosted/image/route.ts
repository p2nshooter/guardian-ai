/* AXTO — GET /api/selfhosted/image?name=&lic=&exp=&sig=
 * Streams a self-hosted Docker image (builds/latest/raw/<name>.tar.gz in R2)
 * for a signed installer link. Supports `Range: bytes=N-` so interrupted
 * downloads resume. The licence must still be active. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getR2Builds, dbFirst } from "@/lib/db";
import { verifyImageUrl } from "@/lib/download-links";
import { SELF_HOSTED } from "@/lib/selfhosted";

const bad = (msg: string, status: number) => new NextResponse(msg, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const name = u.searchParams.get("name") || "", lic = u.searchParams.get("lic") || "";
  if (!(await verifyImageUrl(name, lic, u.searchParams.get("exp") || "", u.searchParams.get("sig") || ""))) {
    return bad("This download link is invalid or has expired. Run the installer again to get a fresh one.", 403);
  }
  const row = await dbFirst<any>(getDB(req), `SELECT product, status, expires_at FROM sh_licenses WHERE id = ?`, [lic]);
  const product = SELF_HOSTED.find((p) => p.slug === row?.product);
  if (!row || row.status !== "active" || !(new Date(row.expires_at).getTime() > Date.now())) return bad("The licence is no longer active.", 403);
  if (!product?.images.some((i) => i.name === name)) return bad("This image does not belong to the licence.", 403);

  const key = `builds/latest/raw/${name}.tar.gz`;
  const m = /^bytes=(\d+)-$/.exec(req.headers.get("range") || "");
  const r2 = getR2Builds(req);
  const obj = await r2.get(key, m ? { range: { offset: Number(m[1]) } } : undefined);
  if (!obj) return bad("This build is being prepared. Please try again later.", 404);
  const headers: Record<string, string> = {
    "Content-Type": "application/gzip",
    "Content-Disposition": `attachment; filename="${name}.tar.gz"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    ETag: obj.httpEtag || `"${obj.etag}"`,
  };
  if (m) {
    const start = Number(m[1]);
    if (start >= obj.size) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${obj.size}` } });
    headers["Content-Range"] = `bytes ${start}-${obj.size - 1}/${obj.size}`;
    headers["Content-Length"] = String(obj.size - start);
    return new NextResponse(obj.body, { status: 206, headers });
  }
  headers["Content-Length"] = String(obj.size);
  return new NextResponse(obj.body, { status: 200, headers });
}
