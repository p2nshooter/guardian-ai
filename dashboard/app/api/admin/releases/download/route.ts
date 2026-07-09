/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Streams a real build artifact straight out of R2 for the admin to download.
 * Takes the exact R2 key (builds/latest/raw/<name>.tar.gz or
 * builds/latest/exe/<name>-windows.exe) — this used to reconstruct a
 * "releases/<channel>/<product>-<type>-<arch>.zip" key that no workflow has
 * ever written to, so every download 404'd regardless of what R2 held.
 * ============================================================================ */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getR2Builds } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const ALLOWED_PREFIXES = ["builds/latest/raw/", "builds/latest/exe/"];

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";

  if (!key || !ALLOWED_PREFIXES.some(p => key.startsWith(p)))
    return NextResponse.json({ error: "Valid key required (builds/latest/raw/ or builds/latest/exe/)" }, { status: 400 });

  let r2: any;
  try { r2 = getR2Builds(req); } catch {
    return NextResponse.json({ error: "R2 not available" }, { status: 503 });
  }

  try {
    const obj = await r2.get(key);
    if (!obj) return NextResponse.json({ error: "File not found in R2" }, { status: 404 });

    const fname = key.split("/").pop() || "download";
    return new NextResponse(obj.body, {
      status: 200,
      headers: {
        "Content-Type":        "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fname}"`,
        "Content-Length":      String(obj.size || ""),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Download failed" }, { status: 500 });
  }
}
