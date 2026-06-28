/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, now } from "@/lib/db";
import { getR2 } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";


// Upload playbook file to R2
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const playbookId = formData.get("playbook_id") as string | null;

  if (!file || !playbookId) {
    return NextResponse.json({ error: "file and playbook_id are required" }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
  const pb = await dbFirst<any>(db, `SELECT slug, file_format FROM playbooks WHERE id = ?`, [playbookId]);
  if (!pb) return NextResponse.json({ error: "Playbook not found" }, { status: 404 });

  // Determine R2 key
  const ext = file.name.split(".").pop() || pb.file_format || "pdf";
  const r2Key = `playbooks/${pb.slug}.${ext}`;

  // Upload to R2
  try {
    const r2 = getR2(req);
    const arrayBuffer = await file.arrayBuffer();
    await r2.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || "application/pdf",
        contentDisposition: `attachment; filename="${pb.slug}.${ext}"`,
      },
    });

    // Update DB
    await dbRun(db, `UPDATE playbooks SET r2_key = ?, file_size_bytes = ?, file_format = ?, updated_at = ? WHERE id = ?`,
      [r2Key, file.size, ext, now(), playbookId]);

    return NextResponse.json({ ok: true, r2_key: r2Key, size: file.size });
  } catch (e: any) {
    return NextResponse.json({ error: "Upload failed: " + (e.message || "Unknown error") }, { status: 500 });
  }
}
