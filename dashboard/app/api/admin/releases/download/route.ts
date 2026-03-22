export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getR2Builds } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url     = new URL(req.url);
  const product = url.searchParams.get("product");
  const type    = url.searchParams.get("type");
  const arch    = url.searchParams.get("arch");
  const channel = url.searchParams.get("channel") || "latest";

  if (!product || !type || !arch)
    return NextResponse.json({ error: "product, type, arch required" }, { status: 400 });

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error: "R2 not available" }, { status: 503 });
  }

  const key = `releases/${channel}/${product}-${type}-${arch}.zip`;

  try {
    const obj = await r2.get(key);
    if (!obj) return NextResponse.json({ error: "File not found in R2" }, { status: 404 });

    const blob   = await obj.arrayBuffer();
    const fname  = `${product}-${type}-${arch}.zip`;

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type":        "application/zip",
        "Content-Disposition": `attachment; filename="${fname}"`,
        "Content-Length":      String(blob.byteLength),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Download failed" }, { status: 500 });
  }
}
