/**
 * GET /api/admin/engine-builder/download?id=BUILD_ID
 * Streams build artifact directly from CF R2 binding — no presign needed.
 * Admin only.
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getR2Builds, dbFirst } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id  = url.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }

  const build = await dbFirst<any>(db,
    `SELECT id, label, product, build_type, arch, r2_key, file_size FROM engine_builds
     WHERE id=? AND status='ready' AND deleted_at=''`,
    [id]
  );
  if (!build)    return NextResponse.json({ error: "Build not found" }, { status: 404 });
  if (!build.r2_key) return NextResponse.json({ error: "No artifact file. Build may be config-only." }, { status: 404 });

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error: "R2 binding not available" }, { status: 503 });
  }

  const obj = await r2.get(build.r2_key);
  if (!obj) return NextResponse.json({ error: "File not found in R2" }, { status: 404 });

  const archSlug = build.arch === "windows/amd64" ? "windows"
                 : build.arch === "linux/arm64"   ? "linux-arm64"
                 : "linux";
  const filename = `axto-${build.product}-${build.build_type}-${archSlug}.zip`;

  // Stream directly from R2 to browser
  return new NextResponse(obj.body, {
    headers: {
      "Content-Type":        "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      String(build.file_size || obj.size || ""),
      "Cache-Control":       "no-store",
    },
  });
}
