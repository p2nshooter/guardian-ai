export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, now } from "@/lib/db";
import { publishToplatform } from "@/lib/autopost/publisher";
import { pickUnusedTemplate, autoFillTemplate } from "@/lib/autopost/generator";


/**
 * AutoPost Cron — triggered by Cloudflare Cron or external scheduler.
 * Auth: CRON_SECRET header or ?secret= query param.
 * 
 * Interval frequency map (hours):
 *   10min=0.166  30min=0.5  hourly=1  2hours=2  6hours=6  12hours=12  daily=24  weekly=168
 */

const FREQ_HOURS: Record<string, number> = {
  "10min":  10 / 60,
  "30min":  0.5,
  "hourly": 1,
  "2hours": 2,
  "6hours": 6,
  "12hours": 12,
  "daily":  24,
  "weekly": 168,
};

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  let published = 0, generated = 0, errors = 0;

  // ── Step 1: Publish any posts with status='scheduled' and due ──────────
  const duePosts = await dbQuery<any>(db, `
    SELECT p.*, pc.credentials, pc.is_active
    FROM autopost_posts p
    JOIN autopost_platform_configs pc ON pc.id = p.platform_config_id
    WHERE p.status = 'scheduled'
      AND p.scheduled_at <= datetime('now')
    LIMIT 30
  `);

  for (const post of duePosts) {
    if (!post.is_active || !post.credentials) {
      await dbRun(db, `UPDATE autopost_posts SET status='failed', error_message='Platform config inactive', updated_at=? WHERE id=?`, [now(), post.id]);
      errors++;
      continue;
    }
    try {
      const creds = JSON.parse(post.credentials);
      const result = await publishToplatform({
        platform: post.platform,
        credentials: creds,
        post: {
          body_text: post.body_text,
          hashtags: JSON.parse(post.hashtags || "[]"),
          image_url: post.image_url || "",
          cta_text: post.cta_text || "",
        },
      });
      await dbRun(db,
        `UPDATE autopost_posts SET status=?, published_at=?, platform_post_id=?, platform_url=?, error_message=?, updated_at=? WHERE id=?`,
        [result.success ? "published" : "failed", result.success ? now() : null,
         result.platform_post_id || "", result.platform_url || "", result.error || "", now(), post.id]
      );
      if (result.success) published++; else errors++;
    } catch (e: any) {
      await dbRun(db, `UPDATE autopost_posts SET status='failed', error_message=?, updated_at=? WHERE id=?`,
        [e.message || "Unknown error", now(), post.id]);
      errors++;
    }
  }

  // ── Step 2: Auto-generate + publish for active schedules ──────────────
  const schedules = await dbQuery<any>(db, `
    SELECT s.*, pc.id as config_id, pc.credentials, pc.is_active as config_active
    FROM autopost_schedules s
    JOIN autopost_platform_configs pc ON pc.platform = s.platform
    WHERE s.is_active = 1 AND pc.is_active = 1
  `);

  for (const sched of schedules) {
    if (!sched.config_active || !sched.credentials) continue;

    // Check if enough time has passed since last run
    const intervalHours = FREQ_HOURS[sched.frequency] ?? 24;
    if (sched.last_run) {
      const elapsed = (Date.now() - new Date(sched.last_run).getTime()) / 3_600_000;
      if (elapsed < intervalHours) continue;
    }

    // Get recently used template IDs (last 30 days) to avoid repeats
    const recentPosts = await dbQuery<{ template_id: string }>(db,
      `SELECT template_id FROM autopost_posts WHERE platform = ? AND created_at > datetime('now', '-30 days')`,
      [sched.platform]
    );
    const usedIds = recentPosts.map(p => p.template_id).filter(Boolean);

    // Pick template & generate post
    const tmpl = pickUnusedTemplate(usedIds, sched.platform, sched.language || "id");
    const text = autoFillTemplate(tmpl.body_text);
    const hashtags = tmpl.hashtags || [];

    try {
      const creds = JSON.parse(sched.credentials);
      const result = await publishToplatform({
        platform: sched.platform,
        credentials: creds,
        post: { body_text: text, hashtags, cta_text: tmpl.cta_text, image_url: "" },
      });

      const postId = crypto.randomUUID();
      await dbRun(db,
        `INSERT INTO autopost_posts (id, template_id, platform, platform_config_id, body_text, hashtags, status, published_at, platform_post_id, platform_url, error_message, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [postId, tmpl.id, sched.platform, sched.config_id, text, JSON.stringify(hashtags),
         result.success ? "published" : "failed", result.success ? now() : null,
         result.platform_post_id || "", result.platform_url || "", result.error || "", now(), now()]
      );

      await dbRun(db, `UPDATE autopost_schedules SET last_run=?, updated_at=? WHERE id=?`, [now(), now(), sched.id]);

      if (result.success) { published++; generated++; } else errors++;
    } catch (e: any) {
      errors++;
      console.error(`[autopost cron] ${sched.platform} error:`, e.message);
    }
  }

  return NextResponse.json({
    ok: true,
    summary: { published, generated, errors, scheduled_processed: duePosts.length, schedules_checked: schedules.length },
    timestamp: now(),
  });
}
