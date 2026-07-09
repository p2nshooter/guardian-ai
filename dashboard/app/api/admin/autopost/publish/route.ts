/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, dbFirst, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { publishToplatform } from "@/lib/autopost/publisher";


export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json() as any; } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
  const { mode, platform_config_ids, body_text, hashtags, image_url, scheduled_at } = body;

  // ── Retry failed posts ───────────────────────────────────────────────
  if (mode === "retry_failed") {
    const failed = await dbQuery<any>(db, `
      SELECT p.*, pc.credentials, pc.is_active
      FROM autopost_posts p JOIN autopost_platform_configs pc ON pc.id=p.platform_config_id
      WHERE p.status='failed' LIMIT 10`);
    let retried = 0, succeeded = 0;
    for (const post of failed) {
      if (!post.is_active || !post.credentials) continue;
      retried++;
      const result = await publishToplatform({
        platform: post.platform,
        credentials: JSON.parse(post.credentials),
        post: { body_text: post.body_text, hashtags: JSON.parse(post.hashtags||"[]"), image_url: post.image_url },
      });
      await dbRun(db, `UPDATE autopost_posts SET status=?,published_at=?,error_message=?,updated_at=? WHERE id=?`,
        [result.success?"published":"failed", result.success?now():null, result.error||"", now(), post.id]);
      if (result.success) succeeded++;
    }
    return NextResponse.json({ success: true, retried, succeeded });
  }

  // ── Publish immediately to selected platform configs ─────────────────
  if (!body_text) return NextResponse.json({ error: "body_text required" }, { status: 400 });

  const configIds: string[] = platform_config_ids || [];
  const results: any[] = [];

  for (const configId of configIds) {
    const cfg = await dbFirst<any>(db, `SELECT * FROM autopost_platform_configs WHERE id=?`, [configId]);
    if (!cfg || !cfg.is_active) { results.push({ configId, success: false, error: "Config not found or inactive" }); continue; }

    let creds: Record<string, string> = {};
    try { creds = JSON.parse(cfg.credentials); } catch { results.push({ configId, success: false, error: "Invalid credentials" }); continue; }

    const postStatus = scheduled_at ? "scheduled" : "publishing";
    const postId = newId();
    await dbRun(db,
      `INSERT INTO autopost_posts (id,platform,platform_config_id,body_text,hashtags,image_url,status,scheduled_at,metadata,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [postId, cfg.platform, configId, body_text, JSON.stringify(hashtags||[]), image_url||"", postStatus, scheduled_at||null, "{}", now(), now()]
    );

    if (!scheduled_at) {
      const result = await publishToplatform({
        platform: cfg.platform, credentials: creds,
        post: { body_text, hashtags: hashtags||[], image_url },
      });
      await dbRun(db,
        `UPDATE autopost_posts SET status=?,published_at=?,platform_post_id=?,platform_url=?,error_message=?,updated_at=? WHERE id=?`,
        [result.success?"published":"failed", result.success?now():null,
         result.platform_post_id||"", result.platform_url||"", result.error||"", now(), postId]
      );
      results.push({ configId, platform: cfg.platform, ...result });
    } else {
      results.push({ configId, platform: cfg.platform, success: true, scheduled: true });
    }
  }

  return NextResponse.json({ success: true, results });
}
