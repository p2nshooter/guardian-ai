export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, now } from "@/lib/db";
import { getR2 } from "@/lib/db";
import { getUser, requireAdmin } from "@/lib/auth";


export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const isAdmin = url.searchParams.get("admin") === "1";

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  // Admin download — no purchase check
  if (isAdmin) {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else {
    // Client download — must be authenticated and have purchased
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Please login to download" }, { status: 401 });

    const purchase = await dbFirst<any>(db,
      `SELECT id, download_count, max_downloads FROM playbook_purchases WHERE (playbook_id = ? OR bundle_id IN (SELECT id FROM playbook_bundles WHERE playbook_ids LIKE '%' || ? || '%')) AND client_email = ? AND status = 'completed'`,
      [id, id, user.email]
    );

    if (!purchase) {
      return NextResponse.json({ error: "You haven't purchased this playbook. Please purchase first." }, { status: 403 });
    }

    if (purchase.max_downloads > 0 && purchase.download_count >= purchase.max_downloads) {
      return NextResponse.json({ error: "Download limit reached. Contact hallo@axto.io for assistance." }, { status: 403 });
    }

    // Increment download count
    await dbRun(db, `UPDATE playbook_purchases SET download_count = download_count + 1 WHERE id = ?`, [purchase.id]).catch(() => {});
  }

  // Get playbook R2 key
  const pb = await dbFirst<any>(db, `SELECT r2_key, name, slug, file_format FROM playbooks WHERE id = ?`, [id]);
  if (!pb || !pb.r2_key) {
    return NextResponse.json({ error: "File not available. Contact hallo@axto.io" }, { status: 404 });
  }

  // Fetch from R2
  try {
    const r2 = getR2(req);
    const object = await r2.get(pb.r2_key);
    if (!object) return NextResponse.json({ error: "File not found in storage" }, { status: 404 });

    const headers = new Headers();
    const ext = pb.file_format || "pdf";
    const filename = `${pb.slug}.${ext}`;
    headers.set("Content-Type", ext === "pdf" ? "application/pdf" : "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    if (object.size) headers.set("Content-Length", String(object.size));
    headers.set("Cache-Control", "private, no-cache");

    // Update download count on playbook
    await dbRun(db, `UPDATE playbooks SET download_count = download_count + 1, updated_at = ? WHERE id = ?`, [now(), id]).catch(() => {});

    return new NextResponse(object.body as ReadableStream, { headers });
  } catch (e: any) {
    return NextResponse.json({ error: "Download failed: " + (e.message || "Unknown error") }, { status: 500 });
  }
}
