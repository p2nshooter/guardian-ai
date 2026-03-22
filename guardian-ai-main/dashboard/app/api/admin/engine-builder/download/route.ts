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
    `SELECT id, label, product, build_type, arch, r2_key, file_size, status
     FROM engine_builds WHERE id=? AND deleted_at=''`,
    [id]
  );
  if (!build) return NextResponse.json({ error: "Build not found" }, { status: 404 });
  if (build.status !== "ready") return NextResponse.json({ error: "Build not ready" }, { status: 400 });

  const archSlug = build.arch === "windows/amd64" ? "windows"
                 : build.arch === "linux/arm64"   ? "linux-arm64"
                 : "linux";
  const filename = `axto-${build.product}-${build.build_type}-${archSlug}.zip`;

  // ── Jika ada file di R2, stream langsung ─────────────────────────────────
  if (build.r2_key) {
    let r2: any;
    try { r2 = getR2Builds(req); } catch {
      return NextResponse.json({ error: "R2 binding not available" }, { status: 503 });
    }
    const obj = await r2.get(build.r2_key);
    if (obj) {
      return new NextResponse(obj.body, {
        headers: {
          "Content-Type":        "application/zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length":      String(build.file_size || obj.size || ""),
          "Cache-Control":       "no-store",
        },
      });
    }
  }

  // ── Fallback: tidak ada file di R2 (build config-only / GH Actions belum jalan)
  // Kembalikan info yang jelas ke admin
  return NextResponse.json({
    error: "Build binary belum tersedia di R2.",
    reason: build.r2_key
      ? "File ada di DB tapi tidak ditemukan di R2 — mungkin sudah dihapus."
      : "Build ini adalah config-only (GitHub Actions belum trigger). Set GITHUB_REPO & GITHUB_TOKEN di CF Pages, lalu buat build baru.",
    build_id: build.id,
    has_r2_key: !!build.r2_key,
  }, { status: 404 });
}
