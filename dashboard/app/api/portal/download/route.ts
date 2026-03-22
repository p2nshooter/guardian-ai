export const runtime  = "edge";
export const dynamic  = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, getR2Builds, dbFirst } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const VALID_PRODUCTS = [
  "guardian-core","guardian-node","guardian-clamav",
  "guardian-core-node","guardian-bundle",
  "orchestra-core","orchestra-worker-cpu","orchestra-worker-gpu",
  "orchestra-core-cpu","orchestra-bundle","full-bundle",
];

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const url       = new URL(req.url);
  const licenseId = url.searchParams.get("license_id") || "";
  const product   = url.searchParams.get("product")    || "";
  const buildType = url.searchParams.get("type")       || "docker";
  const arch      = url.searchParams.get("arch")       || "linux";
  const channel   = url.searchParams.get("channel")    || "latest";

  if (!licenseId && !product)
    return NextResponse.json({ error:"license_id or product required" }, { status:400 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error:"DB unavailable" }, { status:503 });
  }

  let resolvedProduct = product;
  let licenseKey = "";

  if (licenseId) {
    const lic = await dbFirst<any>(db,
      `SELECT l.id, l.product, l.license_key, l.status
       FROM licenses l JOIN clients c ON c.id=l.client_id
       WHERE l.id=? AND c.email=?`,
      [licenseId, user.email]
    );
    if (!lic) return NextResponse.json({ error:"License not found" }, { status:404 });
    if (lic.status === "revoked")   return NextResponse.json({ error:"License revoked" }, { status:403 });
    if (lic.status === "suspended") return NextResponse.json({ error:"License suspended" }, { status:403 });
    licenseKey = lic.license_key;
    if (!resolvedProduct)
      resolvedProduct = lic.product === "orchestra" ? "orchestra-bundle" : "guardian-bundle";
  }

  if (!VALID_PRODUCTS.includes(resolvedProduct))
    return NextResponse.json({ error:`Invalid product` }, { status:400 });

  const r2Key   = `releases/${channel}/${resolvedProduct}-${buildType}-${arch}.zip`;
  const filename = `axto-${resolvedProduct}-${buildType}-${arch}.zip`;

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error:"Storage not available" }, { status:503 });
  }

  const obj = await r2.get(r2Key);
  if (!obj) {
    const manifest = await r2.get(`releases/${channel}/manifest.json`).catch(() => null);
    return NextResponse.json({
      error:"Build not available yet",
      hint: manifest
        ? "This product/type/arch combo is not yet built."
        : `No builds in channel '${channel}'. Push to main to trigger auto-build.`,
      product: resolvedProduct, type: buildType, arch, channel,
    }, { status:404 });
  }

  const headers: Record<string,string> = {
    "Content-Type":        "application/zip",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control":       "no-store",
    "X-Product":           resolvedProduct,
    "X-Channel":           channel,
  };
  if (obj.size)   headers["Content-Length"] = String(obj.size);
  if (licenseKey) headers["X-License-Key"]  = licenseKey;

  return new NextResponse(obj.body, { headers });
}
