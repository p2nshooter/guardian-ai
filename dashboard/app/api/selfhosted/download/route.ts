/* AXTO — GET|HEAD /api/selfhosted/download?product=…&file=<image>[-arm64] | offline[-arm64]
 * Streams a Docker image, or the app's offline package (AXTO Setup + every image,
 * builds/latest/offline/), from R2 (axto-builds) to a member who holds an active
 * licence for that product: a subscription licence (Business/Enterprise) or a
 * lifetime licence whose included-updates period has not ended. Range requests
 * resume a multi-GB download where it stopped. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { loadSession, effectiveTier } from "@/lib/auth";
import { getSelfHosted } from "@/lib/selfhosted";
import { limitsFor } from "@/lib/plans";
import { audit } from "@/lib/http";
import { lifetimeCovers } from "@/lib/lifetime-service";
import { offlineKey, serveBuild } from "@/lib/builds";

async function serve(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return NextResponse.redirect(new URL("/login?redirect=/app/self-hosted", req.url));
  const url = new URL(req.url);
  const p = getSelfHosted(url.searchParams.get("product") || "");
  const file = url.searchParams.get("file") || "";
  if (!p) return new NextResponse("Unknown product", { status: 404 });
  const s = ctx.session;
  const db = getData(req);
  if (s.role !== "admin" && !(await lifetimeCovers(db, s.sub, p.slug))) {
    if (limitsFor(effectiveTier(s)).selfHostedApps === 0) return new NextResponse("Your plan does not include self-hosted apps.", { status: 402 });
    const lic = (await db.shLicenses.listAllDocs("user", s.sub)).find((l) => l.product === p.slug && l.status === "active");
    if (!lic) return new NextResponse("Issue a licence for this app first.", { status: 403 });
  }
  // <image> = x86-64 build, <image>-arm64 = ARM build, offline[-arm64] = the whole app in one .zip.
  let key: string, name: string, type: string;
  if (file === "offline" || file === "offline-arm64") {
    key = offlineKey(p.slug, file === "offline" ? "amd64" : "arm64");
    name = key.slice(key.lastIndexOf("/") + 1);
    type = "application/zip";
  } else {
    const img = p.images.find((i) => i.name === file.replace(/-arm64$/, ""));
    if (!img) return new NextResponse("Unknown file", { status: 404 });
    key = `builds/latest/raw/${file}.tar.gz`;
    name = `${file}.tar.gz`;
    type = "application/gzip";
  }
  const res = await serveBuild(req, key, { filename: name, type });
  if (!res) return new NextResponse("This build is being prepared. Please try again later.", { status: 404 });
  // One audit entry per download, not one per resumed chunk.
  if (req.method === "GET" && !/^bytes=[1-9]/.test(req.headers.get("range") || "")) await audit(db, s, "selfhosted.download", "build", key, {}, req);
  return res;
}

export const GET = serve;
export const HEAD = serve;
