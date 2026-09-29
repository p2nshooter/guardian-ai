/* AXTO — GET /api/download/guide?product=<slug>&lang=en|id
 * Public download of a self-hosted installation guide PDF (R2 axto-builds,
 * builds/latest/guides/ — built by CI from lib/product-guides.ts). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getR2Builds } from "@/lib/db";
import { GUIDE_PRODUCTS, GUIDE_LANGS, type GuideLang } from "@/lib/product-guides";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams;
  const product = q.get("product") || "";
  const lang = (q.get("lang") || "en") as GuideLang;
  if (!GUIDE_PRODUCTS.includes(product) || !GUIDE_LANGS.includes(lang)) return new NextResponse("Unknown guide.", { status: 404 });
  const name = `axto-${product}-guide-${lang}.pdf`;
  const obj = await getR2Builds(req).get(`builds/latest/guides/${name}`);
  if (!obj) return NextResponse.redirect(new URL(`/self-hosted/${product}/guide`, req.url));   // the web guide is always there
  return new NextResponse(obj.body, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "public, max-age=3600",
      ...(obj.size ? { "Content-Length": String(obj.size) } : {}) },
  });
}
