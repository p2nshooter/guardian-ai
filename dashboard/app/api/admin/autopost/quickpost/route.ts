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
import { getDB, dbFirst, dbRun, dbQuery, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getRandomTemplate, autoFillTemplate } from "@/lib/autopost/generator";
import { postToClassifiedSite, buildClassifiedPost } from "@/lib/autopost/classified-poster";
import { postViaAyrshare } from "@/lib/autopost/ayrshare";
import { publishToplatform } from "@/lib/autopost/publisher";


/**
 * POST /api/admin/autopost/quickpost
 *
 * Actions:
 * 1. prepare  — generate post content + quicklinks for all enabled platforms
 * 2. post_now — actually post to a specific platform (social or classified)
 * 3. batch    — post to all enabled platforms at once
 */
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

  const { action, platform, language = "id", template_id } = body;

  // ── ACTION: prepare ───────────────────────────────────────────────────────
  // Generates post content + quicklinks for all enabled classified sites
  if (action === "prepare") {
    const platforms = await dbQuery<any>(db,
      `SELECT platform, credentials, is_active, oauth_connected FROM autopost_platform_configs WHERE is_active = 1`
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
    const contactEmail = body.contact_email || "hello@axto.io";
    const contactPhone = body.contact_phone || "";
    const location = body.location || (language === "id" ? "Jakarta, Indonesia" : "Remote");

    // Get a template
    const tmpl = getRandomTemplate({ language: language as "id" | "en" });
    const filledText = tmpl ? autoFillTemplate(tmpl?.body_text || "", { appUrl, language }) : "AXTO AI Platform — Enterprise AI for your servers. axto.io";

    const classifiedPlatforms = [
      "olx","craigslist","locanto","gumtree","adpost",
      "classifiedads","vivastreet","hoobly","trovit","oodle","freeads",
    ];

    const results: any[] = [];

    for (const cp of classifiedPlatforms) {
      const cfg = platforms.find((p: any) => p.platform === cp);
      const creds = cfg ? ((): Record<string,string> => {
        try { return JSON.parse(cfg.credentials || "{}"); } catch { return {}; }
      })() : {};

      const postContent = buildClassifiedPost(filledText, language as "id"|"en", {
        contactEmail, contactPhone, location,
      });

      const result = await postToClassifiedSite({ platform: cp, credentials: creds, post: postContent });

      results.push({
        platform: cp,
        enabled: !!cfg,
        ...result,
        post_content: postContent,
      });
    }

    return NextResponse.json({
      ok: true,
      template_used: tmpl?.id || "default",
      template_text: filledText,
      results,
    });
  }

  // ── ACTION: post_now ──────────────────────────────────────────────────────
  // Post to one specific platform immediately
  if (action === "post_now" && platform) {
    const cfg = await dbFirst<any>(db,
      `SELECT platform, credentials, is_active, oauth_connected FROM autopost_platform_configs WHERE platform = ?`,
      [platform]
    );

    let creds: Record<string, string> = {};
    if (cfg?.credentials) {
      try { creds = JSON.parse(cfg.credentials); } catch {}
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
    const tmpl = getRandomTemplate({ language: language as "id"|"en" });
    const filledText = tmpl ? autoFillTemplate(tmpl?.body_text || "", { appUrl, language }) : "AXTO AI Platform. axto.io";

    const classifiedList = [
      "olx","craigslist","locanto","gumtree","adpost",
      "classifiedads","vivastreet","hoobly","trovit","oodle","freeads",
    ];

    let result: any;

    if (classifiedList.includes(platform)) {
      // Classified site
      const contactEmail = body.contact_email || creds.email || "hello@axto.io";
      const contactPhone = body.contact_phone || creds.phone || "";
      const location = body.location || creds.location || (language === "id" ? "Jakarta" : "Remote");

      const postContent = buildClassifiedPost(filledText, language as "id"|"en", {
        contactEmail, contactPhone, location,
      });

      result = await postToClassifiedSite({ platform, credentials: creds, post: postContent });
    } else {
      // Social media platform
      const hashtags = language === "id"
        ? ["#GuardianAI", "#AIKeamanan", "#CyberSecurity", "#OrchestraAI", "#axto"]
        : ["#GuardianAI", "#CyberSecurity", "#AIInfrastructure", "#OrchestraAI", "#axto"];

      // Try Ayrshare first (from DB or env)
      const ayrshareRow = await dbFirst<any>(db,
        `SELECT credentials FROM autopost_platform_configs WHERE platform = 'ayrshare' AND is_active = 1`
      );
      const ayrshareKey = ayrshareRow?.credentials
        ? (() => { try { return JSON.parse(ayrshareRow.credentials).api_key || ""; } catch { return ""; } })()
        : process.env.AYRSHARE_API_KEY || "";

      if (ayrshareKey) {
        const aResult = await postViaAyrshare(ayrshareKey, {
          post: `${filledText}

${appUrl}`,
          platforms: [platform],
          hashtags,
          mediaUrls: body.image_url ? [body.image_url] : undefined,
        });
        result = { success: aResult.success, error: aResult.error,
                   platform_post_id: aResult.postIds?.[platform] || aResult.id };
      } else {
        result = await publishToplatform({
          platform, credentials: creds,
          post: { title: "AXTO AI Platform", body_text: filledText, hashtags, cta_text: appUrl, image_url: body.image_url || "" },
        });
      }
    }

    // Log to DB
    const postId = newId();
    await dbRun(db,
      `INSERT INTO autopost_posts (id, template_id, platform, category, title, body_text, status, error_msg, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [postId, tmpl?.id || "", platform, "general", tmpl?.title || "", filledText,
       result.success ? "published" : "failed",
       result.error || result.note || "",
       result.success ? now() : null,
       now()]
    ).catch(() => {});

    return NextResponse.json({
      ok: result.success,
      platform,
      method: result.method,
      platform_url: result.platform_url,
      quicklink_url: result.quicklink_url,
      note: result.note,
      error: result.error,
      post_id: postId,
    });
  }

  // ── ACTION: batch ─────────────────────────────────────────────────────────
  // Post to ALL active platforms at once
  if (action === "batch") {
    const activePlatforms = await dbQuery<any>(db,
      `SELECT platform, credentials FROM autopost_platform_configs WHERE is_active = 1`
    );

    if (!activePlatforms.length) {
      return NextResponse.json({ ok: false, error: "No active platforms configured" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
    const tmpl = getRandomTemplate({ language: language as "id"|"en" });
    const filledText = tmpl ? autoFillTemplate(tmpl?.body_text || "", { appUrl, language }) : "AXTO AI Platform. axto.io";

    const classifiedList = [
      "olx","craigslist","locanto","gumtree","adpost",
      "classifiedads","vivastreet","hoobly","trovit","oodle","freeads",
    ];

    const results: any[] = [];

    for (const cfg of activePlatforms) {
      let creds: Record<string, string> = {};
      try { creds = JSON.parse(cfg.credentials || "{}"); } catch {}

      let res: any;

      if (classifiedList.includes(cfg.platform)) {
        const postContent = buildClassifiedPost(filledText, language as "id"|"en", {
          contactEmail: creds.email || "hello@axto.io",
          contactPhone: creds.phone || "",
          location: creds.location || (language === "id" ? "Jakarta" : "Remote"),
        });
        res = await postToClassifiedSite({ platform: cfg.platform, credentials: creds, post: postContent });
      } else {
        const hashtags = language === "id"
          ? ["#GuardianAI", "#AIKeamanan", "#CyberSecurity", "#OrchestraAI"]
          : ["#GuardianAI", "#CyberSecurity", "#AIInfrastructure", "#OrchestraAI"];

        res = await publishToplatform({
          platform: cfg.platform, credentials: creds,
          post: { title: "AXTO", body_text: filledText, hashtags, cta_text: appUrl, image_url: "" },
        });
      }

      results.push({ platform: cfg.platform, ...res });

      // Log
      await dbRun(db,
        `INSERT INTO autopost_posts (id, template_id, platform, category, title, body_text, status, error_msg, published_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), tmpl?.id || "", cfg.platform, "general", tmpl?.title || "", filledText,
         res.success ? "published" : "failed", res.error || res.note || "",
         res.success ? now() : null, now()]
      ).catch(() => {});
    }

    const success = results.filter(r => r.success).length;
    const quicklinks = results.filter(r => r.quicklink_url);

    return NextResponse.json({
      ok: true,
      posted: success,
      total: results.length,
      quicklinks: quicklinks.length,
      results,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
