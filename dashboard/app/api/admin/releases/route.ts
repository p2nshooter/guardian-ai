/* AXTO — GET /api/admin/releases · self-hosted builds present in R2 (axto-builds). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getR2Builds } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const r2 = getR2Builds(req);
  const files: { key: string; size: number; uploaded: string }[] = [];
  for (const prefix of ["builds/latest/raw/", "builds/latest/exe/", "builds/latest/guides/"]) {
    let cursor: string | undefined;
    do {
      const res: any = await r2.list({ prefix, limit: 500, cursor });
      for (const o of res.objects || []) files.push({ key: o.key, size: o.size, uploaded: o.uploaded ? new Date(o.uploaded).toISOString() : "" });
      cursor = res.truncated ? res.cursor : undefined;
    } while (cursor);
  }
  return respond({ files }, ctx);
}
