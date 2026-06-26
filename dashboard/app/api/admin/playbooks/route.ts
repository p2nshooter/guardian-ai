/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, dbFirst, newId, now } from "@/lib/db";
import { getR2 } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";


// GET — list all playbooks, categories, bundles, purchases
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
  const categories = await dbQuery(db, `SELECT * FROM playbook_categories ORDER BY sort_order`);
  const playbooks = await dbQuery(db, `SELECT p.*, c.name as category_name FROM playbooks p LEFT JOIN playbook_categories c ON c.id = p.category_id ORDER BY p.sort_order, p.created_at DESC`);
  const bundles = await dbQuery(db, `SELECT * FROM playbook_bundles ORDER BY sort_order`);
  const purchases = await dbQuery(db, `SELECT pp.*, p.name as playbook_name, pb.name as bundle_name FROM playbook_purchases pp LEFT JOIN playbooks p ON p.id = pp.playbook_id LEFT JOIN playbook_bundles pb ON pb.id = pp.bundle_id ORDER BY pp.created_at DESC LIMIT 100`);
  const stats = await dbFirst<any>(db, `SELECT COUNT(*) as total_playbooks, SUM(download_count) as total_downloads, (SELECT COUNT(*) FROM playbook_purchases WHERE status='completed') as total_purchases, (SELECT SUM(amount_usd) FROM playbook_purchases WHERE status='completed') as total_revenue FROM playbooks`);

  return NextResponse.json({ categories, playbooks, bundles, purchases, stats });
}

// POST — CRUD actions
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
  const { action } = body;

  // ── Create playbook ──
  if (action === "create_playbook") {
    const id = newId();
    const slug = (body.slug || body.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `playbook-${id.slice(0, 8)}`;
    
    await dbRun(db, `INSERT INTO playbooks (id, category_id, slug, name, subtitle, description, long_description, price_usd, original_price, prompt_count, file_format, icon, badge, compatible_with, language, tags, preview_text, is_featured, is_active, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      id, body.category_id || "", slug, body.name || "", body.subtitle || "", body.description || "", body.long_description || "",
      body.price_usd || 0, body.original_price || 0, body.prompt_count || 1, body.file_format || "pdf",
      body.icon || "📄", body.badge || "", JSON.stringify(body.compatible_with || ["chatgpt","claude","gemini"]),
      body.language || "en", JSON.stringify(body.tags || []), body.preview_text || "",
      body.is_featured ? 1 : 0, 1, body.sort_order || 0, now(), now(),
    ]);
    return NextResponse.json({ ok: true, id, slug });
  }

  // ── Update playbook ──
  if (action === "update_playbook") {
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    
    const sets: string[] = [];
    const params: any[] = [];
    const allowed = ["name","subtitle","description","long_description","price_usd","original_price","prompt_count","icon","badge","preview_text","is_featured","is_active","sort_order","category_id","compatible_with","tags","language","file_format"];
    
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        const val = (key === "compatible_with" || key === "tags") ? JSON.stringify(fields[key]) : (key === "is_featured" || key === "is_active") ? (fields[key] ? 1 : 0) : fields[key];
        sets.push(`${key}=?`);
        params.push(val);
      }
    }
    if (sets.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    sets.push("updated_at=?");
    params.push(now());
    params.push(id);
    
    await dbRun(db, `UPDATE playbooks SET ${sets.join(",")} WHERE id=?`, params);
    return NextResponse.json({ ok: true });
  }

  // ── Delete playbook ──
  if (action === "delete_playbook") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const pb = await dbFirst<any>(db, `SELECT r2_key FROM playbooks WHERE id=?`, [body.id]);
    if (pb?.r2_key) {
      try { const r2 = getR2(req); await r2.delete(pb.r2_key); } catch {}
    }
    await dbRun(db, `DELETE FROM playbooks WHERE id=?`, [body.id]);
    return NextResponse.json({ ok: true });
  }

  // ── Upload file to R2 ──
  if (action === "set_file_key") {
    const { id, r2_key, file_size_bytes } = body;
    if (!id || !r2_key) return NextResponse.json({ error: "id and r2_key required" }, { status: 400 });
    await dbRun(db, `UPDATE playbooks SET r2_key=?, file_size_bytes=?, updated_at=? WHERE id=?`, [r2_key, file_size_bytes || 0, now(), id]);
    return NextResponse.json({ ok: true });
  }

  // ── Get R2 upload URL (presigned) ──
  if (action === "get_upload_url") {
    const { id, filename } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const pb = await dbFirst<any>(db, `SELECT slug FROM playbooks WHERE id=?`, [id]);
    if (!pb) return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    const ext = (filename || "file.pdf").split(".").pop() || "pdf";
    const r2Key = `playbooks/${pb.slug}.${ext}`;
    return NextResponse.json({ ok: true, r2_key: r2Key, upload_endpoint: `/api/admin/playbooks/upload` });
  }

  // ── Create/update bundle ──
  if (action === "create_bundle" || action === "update_bundle") {
    const id = body.id || newId();
    const slug = (body.slug || body.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || `bundle-${id.slice(0, 8)}`;
    if (action === "create_bundle") {
      await dbRun(db, `INSERT INTO playbook_bundles (id,slug,name,description,price_usd,original_price,playbook_ids,badge,is_featured,is_active,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        id, slug, body.name || "", body.description || "", body.price_usd || 0, body.original_price || 0,
        JSON.stringify(body.playbook_ids || []), body.badge || "", body.is_featured ? 1 : 0, 1, body.sort_order || 0, now(), now(),
      ]);
    } else {
      await dbRun(db, `UPDATE playbook_bundles SET name=?,description=?,price_usd=?,original_price=?,playbook_ids=?,badge=?,is_featured=?,is_active=?,updated_at=? WHERE id=?`, [
        body.name, body.description, body.price_usd, body.original_price, JSON.stringify(body.playbook_ids || []),
        body.badge || "", body.is_featured ? 1 : 0, body.is_active ? 1 : 0, now(), id,
      ]);
    }
    return NextResponse.json({ ok: true, id, slug });
  }

  // ── Download file from R2 (admin) ──
  if (action === "get_download_url") {
    const { id } = body;
    const pb = await dbFirst<any>(db, `SELECT r2_key, name FROM playbooks WHERE id=?`, [id]);
    if (!pb?.r2_key) return NextResponse.json({ error: "No file uploaded" }, { status: 404 });
    return NextResponse.json({ ok: true, download_url: `/api/playbooks/download?id=${id}&admin=1` });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
