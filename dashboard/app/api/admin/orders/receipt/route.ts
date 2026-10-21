/* AXTO — GET /api/admin/orders/receipt?id=<orderId> (admin only)
 * Streams the member's bank-transfer receipt (photo/PDF) from private R2 storage. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { readMeta } from "@/lib/data/meta";
import { requireAdmin } from "@/lib/auth";
import { readReceipt } from "@/lib/billing/receipt";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const o = await getData(req).orders.get(id);
  const key = String(readMeta(o?.meta).bank_proof?.receipt?.key || "");
  const obj = key ? await readReceipt(key) : null;
  if (!obj) return NextResponse.json({ error: "No receipt for this order." }, { status: 404 });
  return new NextResponse(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
