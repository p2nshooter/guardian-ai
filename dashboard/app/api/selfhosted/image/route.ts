/* AXTO — GET|HEAD /api/selfhosted/image?name=&lic=&exp=&sig=
 * Streams a self-hosted Docker image (builds/latest/raw/<name>.tar.gz in R2)
 * for a signed installer link. Supports Range requests (lib/builds.ts serveBuild)
 * so interrupted downloads resume. The licence must still be active:
 *   lic=<sh_licenses.id>   subscription licence (not expired)
 *   lic=lt:<licence id>    lifetime licence (active, updates still included)
 * name may carry the -arm64 suffix of an ARM build. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { verifyImageUrl } from "@/lib/download-links";
import { SELF_HOSTED } from "@/lib/selfhosted";
import { productsOf } from "@/lib/lifetime";
import { serveBuild } from "@/lib/builds";

const bad = (msg: string, status: number) => new NextResponse(msg, { status, headers: { "Cache-Control": "no-store" } });

async function serve(req: NextRequest) {
  const u = new URL(req.url);
  const name = u.searchParams.get("name") || "", lic = u.searchParams.get("lic") || "";
  if (!(await verifyImageUrl(name, lic, u.searchParams.get("exp") || "", u.searchParams.get("sig") || ""))) {
    return bad("This download link is invalid or has expired. Run the installer again to get a fresh one.", 403);
  }
  const base = name.replace(/-arm64$/, "");
  const db = getData(req);
  let products: string[] = [];
  if (lic.startsWith("lt:")) {
    const row = await db.lifetimeLicenses.get(lic.slice(3));
    if (!row || row.status !== "active" || !(row.updates_until > new Date().toISOString())) return bad("The licence is no longer active.", 403);
    products = productsOf(row);
  } else {
    const row = await db.shLicenses.get(lic);
    if (!row || row.status !== "active" || !(new Date(row.expires_at).getTime() > Date.now())) return bad("The licence is no longer active.", 403);
    products = [row.product];
  }
  if (!SELF_HOSTED.some((p) => products.includes(p.slug) && p.images.some((i) => i.name === base))) return bad("This image does not belong to the licence.", 403);

  const res = await serveBuild(req, `builds/latest/raw/${name}.tar.gz`, { filename: `${name}.tar.gz`, type: "application/gzip" });
  return res || bad("This build is being prepared. Please try again later.", 404);
}

export const GET = serve;
export const HEAD = serve;
