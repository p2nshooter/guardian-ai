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
import { pickUnusedTemplate, autoFillTemplate } from "@/lib/autopost/generator";
import { ALL_CLASSIFIED_SITES, type ClassifiedSite } from "@/lib/classified-sites";

/**
 * AutoPost Cron — FULLY AUTOPILOT
 * ────────────────────────────────
 * Triggered by CF Cron Worker (default: every 6 hours)
 * Auth: CRON_SECRET
 *
 * What it does automatically:
 *   1. Pick random English template (no duplicates in 30 days)
 *   2. Push to ALL 1000+ classified sites (all regions, all categories)
 *   3. Auto-rotate templates each run
 *   4. If social media (Ayrshare) connected → push there too
 *   5. Log everything to DB
 *
 * Admin only sets the interval (via cron schedule or DB).
 * Everything else is autopilot.
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

// ── Push single classified site ──────────────────────────────
async function pushToSite(
  site: ClassifiedSite,
  ad: { title: string; description: string; website: string }
): Promise<{ site: string; success: boolean; error?: string }> {
  try {
    if (site.method === "ping") {
      const r = await fetch(site.url + encodeURIComponent(ad.website + "/sitemap.xml"), {
        method: "GET",
        signal: AbortSignal.timeout(10_000),
      });
      return { site: site.name, success: r.ok || r.status < 400 };
    }

    const params = new URLSearchParams();
    const map: Record<string, string> = {
      title: ad.title,
      description: ad.description,
      category: "software",
      website: ad.website,
    };
    for (const [ourField, theirField] of Object.entries(site.fields || {})) {
      if (map[ourField]) params.set(theirField, map[ourField]);
    }
    if (!site.fields?.website) {
      params.set("url", ad.website);
      params.set("website", ad.website);
    }

    const r = await fetch(site.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; AXTO/2.0; +https://axto.io)",
        Accept: "text/html,*/*",
      },
      body: params.toString(),
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });

    return { site: site.name, success: r.ok || r.status === 302 || r.status === 301 };
  } catch (e: any) {
    return { site: site.name, success: false, error: e.message?.slice(0, 60) || "timeout" };
  }
}

// ── Push to Ayrshare (social media) ──────────────────────────
async function pushToAyrshare(
  apiKey: string,
  text: string
): Promise<{ success: boolean; platforms?: string[]; error?: string }> {
  try {
    const res = await fetch("https://app.ayrshare.com/api/post", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post: text,
        platforms: ["facebook", "twitter", "linkedin", "instagram", "telegram"],
        shorten_links: true,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data: any = await res.json();
    if (res.ok && !data.error) {
      return { success: true, platforms: data.postIds ? Object.keys(data.postIds) : [] };
    }
    return { success: false, error: data.error || data.message || "Ayrshare error" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  const secret =
    req.headers.get("x-cron-secret") ||
    new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let db: any;
  try {
    db = getDB(req);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  const t0 = Date.now();

  // ══════════════════════════════════════════════════════════
  // STEP 1: CLASSIFIED SITES — FULLY AUTOPILOT
  // ══════════════════════════════════════════════════════════
  let classifiedSuccess = 0;
  let classifiedFailed = 0;
  let classifiedSkipped = false;
  let classifiedTemplateId = "";

  try {
    // Check interval from DB (default 6hours)
    const schedRow = await dbFirst<any>(db,
      `SELECT frequency, is_active, last_run FROM autopost_schedules WHERE platform = 'classified_all'`
    );

    const isActive = schedRow ? schedRow.is_active === 1 : true; // default ON
    const frequency = schedRow?.frequency || "6hours";
    const lastRun = schedRow?.last_run || "";
    const intervalHours = FREQ_HOURS[frequency] ?? 6;

    const elapsed = lastRun
      ? (Date.now() - new Date(lastRun).getTime()) / 3_600_000
      : 999;

    if (!isActive) {
      classifiedSkipped = true;
    } else if (elapsed < intervalHours) {
      classifiedSkipped = true;
    } else {
      // Pick unused English template
      const recentPosts = await dbQuery<{ template_id: string }>(db,
        `SELECT template_id FROM autopost_posts WHERE platform = 'classified_batch' AND created_at > datetime('now', '-30 days')`
      );
      const usedIds = recentPosts.map((p) => p.template_id).filter(Boolean);

      const tmpl = pickUnusedTemplate(usedIds, "classifiedads", "en");
      classifiedTemplateId = tmpl.id;
      const text = autoFillTemplate(tmpl.body_text || "", { appUrl, language: "en" });

      const ad = {
        title: "AXTO AI Platform — Enterprise Server Security & AI Orchestration",
        description: `${text}\n\n🔗 ${appUrl}`,
        website: appUrl,
      };

      // Shuffle all sites and push
      const allSites = [...ALL_CLASSIFIED_SITES].sort(() => Math.random() - 0.5);
      const concurrency = 30;

      for (let i = 0; i < allSites.length; i += concurrency) {
        const batch = allSites.slice(i, i + concurrency);
        const results = await Promise.allSettled(
          batch.map((site) => pushToSite(site, ad))
        );
        for (const r of results) {
          if (r.status === "fulfilled" && r.value.success) classifiedSuccess++;
          else classifiedFailed++;
        }
      }

      // Update last_run
      if (schedRow) {
        await dbRun(db,
          `UPDATE autopost_schedules SET last_run = ?, updated_at = ? WHERE platform = 'classified_all'`,
          [now(), now()]
        );
      } else {
        // Create schedule row if not exists
        await dbRun(db,
          `INSERT OR IGNORE INTO autopost_schedules (id, platform, frequency, language, is_active, last_run, created_at, updated_at)
           VALUES (?, 'classified_all', '6hours', 'en', 1, ?, ?, ?)`,
          [newId(), now(), now(), now()]
        );
      }

      // Log to DB
      await dbRun(db,
        `INSERT INTO autopost_posts (id, template_id, platform, category, title, body_text, status, error_msg, published_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId(),
          tmpl.id,
          "classified_batch",
          "classified",
          ad.title,
          ad.description.slice(0, 500),
          classifiedSuccess > 0 ? "published" : "failed",
          `${classifiedSuccess}/${allSites.length} sites (${((Date.now() - t0) / 1000).toFixed(1)}s)`,
          classifiedSuccess > 0 ? now() : null,
          now(),
        ]
      );
    }
  } catch (e: any) {
    console.error("[cron] classified push error:", e.message);
  }

  // ══════════════════════════════════════════════════════════
  // STEP 2: SOCIAL MEDIA VIA AYRSHARE — AUTOPILOT
  // ══════════════════════════════════════════════════════════
  let socialSuccess = false;
  let socialPlatforms: string[] = [];
  let socialSkipped = false;

  try {
    const socialSched = await dbFirst<any>(db,
      `SELECT frequency, is_active, last_run FROM autopost_schedules WHERE platform = 'social_all'`
    );

    const socialActive = socialSched ? socialSched.is_active === 1 : false;
    const socialFreq = socialSched?.frequency || "daily";
    const socialLast = socialSched?.last_run || "";
    const socialInterval = FREQ_HOURS[socialFreq] ?? 24;
    const socialElapsed = socialLast
      ? (Date.now() - new Date(socialLast).getTime()) / 3_600_000
      : 999;

    if (!socialActive || socialElapsed < socialInterval) {
      socialSkipped = true;
    } else {
      // Get Ayrshare key
      const ayrRow = await dbFirst<any>(db,
        `SELECT credentials FROM autopost_platform_configs WHERE platform = 'ayrshare' AND is_active = 1`
      );
      let apiKey = "";
      try {
        apiKey = JSON.parse(ayrRow?.credentials || "{}").api_key || "";
      } catch {}

      if (!apiKey) apiKey = process.env.AYRSHARE_API_KEY || "";

      if (apiKey) {
        // Pick unused English template
        const recentSocial = await dbQuery<{ template_id: string }>(db,
          `SELECT template_id FROM autopost_posts WHERE platform IN ('social_all','ayrshare') AND created_at > datetime('now', '-30 days')`
        );
        const usedIds = recentSocial.map((p) => p.template_id).filter(Boolean);

        const tmpl = pickUnusedTemplate(usedIds, "linkedin", "en");
        const text = autoFillTemplate(tmpl.body_text || "", { appUrl, language: "en" });
        const hashtags = (tmpl.hashtags || []).slice(0, 5).join(" ");
        const fullPost = `${text}\n\n${hashtags}`.trim();

        const result = await pushToAyrshare(apiKey, fullPost);
        socialSuccess = result.success;
        socialPlatforms = result.platforms || [];

        // Update last_run
        await dbRun(db,
          `UPDATE autopost_schedules SET last_run = ?, updated_at = ? WHERE platform = 'social_all'`,
          [now(), now()]
        );

        // Log
        await dbRun(db,
          `INSERT INTO autopost_posts (id, template_id, platform, category, title, body_text, status, error_msg, published_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId(),
            tmpl.id,
            "social_all",
            "social",
            tmpl.title || "Social Auto-Post",
            fullPost.slice(0, 500),
            result.success ? "published" : "failed",
            result.success
              ? `Posted to: ${socialPlatforms.join(", ")}`
              : result.error || "Failed",
            result.success ? now() : null,
            now(),
          ]
        );
      } else {
        socialSkipped = true;
      }
    }
  } catch (e: any) {
    console.error("[cron] social push error:", e.message);
  }

  const duration_ms = Date.now() - t0;

  return NextResponse.json({
    ok: true,
    autopilot: true,
    duration_ms,
    classified: {
      success: classifiedSuccess,
      failed: classifiedFailed,
      total_sites: ALL_CLASSIFIED_SITES.length,
      skipped: classifiedSkipped,
      template: classifiedTemplateId,
    },
    social: {
      success: socialSuccess,
      platforms: socialPlatforms,
      skipped: socialSkipped,
    },
    timestamp: now(),
  });
}
