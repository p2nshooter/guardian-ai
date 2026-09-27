/* AXTO — GET /api/selfhosted/download?product=…&file=<image|exe> · stream a build from R2
 * (axto-builds) to a member who holds an active licence for that product. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getR2Builds, dbFirst } from "@/lib/db";
import { loadSession, effectiveTier } from "@/lib/auth";
import { getSelfHosted } from "@/lib/selfhosted";
import { limitsFor } from "@/lib/plans";
import { audit } from "@/lib/http";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return NextResponse.redirect(new URL("/login?redirect=/app/self-hosted", req.url));
  const url = new URL(req.url);
  const p = getSelfHosted(url.searchParams.get("product") || "");
  const file = url.searchParams.get("file") || "";
  if (!p) return new NextResponse("Unknown product", { status: 404 });
  const s = ctx.session;
  const db = getDB(req);
  if (s.role !== "admin") {
    if (limitsFor(effectiveTier(s)).selfHostedApps === 0) return new NextResponse("Your plan does not include self-hosted apps.", { status: 402 });
    const lic = await dbFirst(db, `SELECT id FROM sh_licenses WHERE user_id = ? AND product = ? AND status = 'active'`, [s.sub, p.slug]);
    if (!lic) return new NextResponse("Issue a licence for this app first.", { status: 403 });
  }
  let key = "";
  let name = "";
  if (file === "exe" && p.exe) { key = `builds/latest/exe/${p.exe}-windows.exe`; name = `${p.exe}-windows.exe`; }
  else {
    const img = p.images.find((i) => i.name === file);
    if (!img) return new NextResponse("Unknown file", { status: 404 });
    key = `builds/latest/raw/${img.name}.tar.gz`; name = `${img.name}.tar.gz`;
  }
  const obj = await getR2Builds(req).get(key);
  if (!obj) return new NextResponse("This build is being prepared. Please try again later.", { status: 404 });
  await audit(db, s, "selfhosted.download", "build", key, {}, req);
  return new NextResponse(obj.body, {
    headers: {
      "Content-Type": file === "exe" ? "application/vnd.microsoft.portable-executable" : "application/gzip",
      "Content-Disposition": `attachment; filename="${name}"`,
      ...(obj.size ? { "Content-Length": String(obj.size) } : {}),
      "Cache-Control": "private, no-store",
    },
  });
}
