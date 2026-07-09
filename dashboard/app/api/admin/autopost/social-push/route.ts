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
import { getDB, dbFirst, dbRun, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getRandomTemplate, autoFillTemplate } from "@/lib/autopost/generator";
import { postViaAyrshare, getAyrshareProfiles } from "@/lib/autopost/ayrshare";

/**
 * AXTO AutoPost — Social Media Push API
 * 
 * POST /api/admin/autopost/social-push
 * 
 * Push iklan ke semua social media yang terhubung via Ayrshare.
 * ✅ 1 API key untuk SEMUA platform (Facebook, Instagram, Twitter, LinkedIn, dll)
 * ✅ Tidak perlu App ID, App Secret, OAuth setup per platform
 * ✅ Ayrshare handles semua OAuth
 */

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { 
    db = getDB(req); 
  } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}

  const language = body.language || "id";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

  // Get Ayrshare API key from DB
  const ayrshareRow = await dbFirst<any>(db,
    `SELECT credentials FROM autopost_platform_configs WHERE platform = 'ayrshare' AND is_active = 1`
  );
  
  let ayrshareKey = "";
  if (ayrshareRow?.credentials) {
    try { 
      ayrshareKey = JSON.parse(ayrshareRow.credentials).api_key || ""; 
    } catch {}
  }
  
  // Fallback to env var
  if (!ayrshareKey) {
    ayrshareKey = process.env.AYRSHARE_API_KEY || "";
  }

  if (!ayrshareKey) {
    return NextResponse.json({ 
      ok: false, 
      error: "Ayrshare belum terhubung. Klik Connect untuk menghubungkan social media." 
    }, { status: 400 });
  }

  // Get random template
  const tmpl = getRandomTemplate({ language: language as "id" | "en" });
  const filledText = tmpl 
    ? autoFillTemplate(tmpl.body_text || "", { appUrl, language })
    : (language === "id" 
        ? "AXTO AI Platform — Keamanan server enterprise dengan Guardian AI. Gratis trial 7 hari! axto.io"
        : "AXTO AI Platform — Enterprise server security with Guardian AI. Free 7-day trial! axto.io"
      );

  // Build hashtags
  const hashtags = language === "id"
    ? ["#GuardianAI", "#AIKeamanan", "#CyberSecurity", "#OrchestraAI", "#axto", "#ServerSecurity"]
    : ["#GuardianAI", "#CyberSecurity", "#AIInfrastructure", "#OrchestraAI", "#axto", "#ServerSecurity"];

  // Only post to platforms actually connected in this Ayrshare account --
  // posting to an unconnected platform guarantees a per-platform failure
  // on every single push, which previously made "publish to all" always
  // come back partial-success even when everything was configured right.
  const profileData = await getAyrshareProfiles(ayrshareKey);
  const targetPlatforms = body.platforms?.length ? body.platforms : profileData.connected;

  if (!targetPlatforms.length) {
    return NextResponse.json({
      ok: false,
      error: "No social accounts are connected in Ayrshare yet. Connect at least one platform in the Ayrshare dashboard first.",
    }, { status: 400 });
  }

  // Post via Ayrshare
  const result = await postViaAyrshare(ayrshareKey, {
    post: `${filledText}\n\n🔗 ${appUrl}`,
    platforms: targetPlatforms,
    hashtags,
    mediaUrls: body.image_url ? [body.image_url] : ["https://axto.io/social-square.png"],
    title: language === "id" 
      ? "AXTO AI Platform — Keamanan Server Enterprise"
      : "AXTO AI Platform — Enterprise Server Security",
  });

  // Log to database
  const postId = newId();
  const successPlatforms = Object.keys(result.postIds || {});
  
  await dbRun(db,
    `INSERT INTO autopost_posts (id, template_id, platform, category, title, body_text, status, error_msg, published_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      postId, 
      tmpl?.id || "default", 
      "social_batch", 
      "social",
      tmpl?.title || "AXTO AI Platform", 
      filledText,
      result.success ? "published" : "failed",
      result.error || `Posted to: ${successPlatforms.join(", ")}`,
      result.success ? now() : null,
      now()
    ]
  ).catch(() => {});

  if (result.success) {
    return NextResponse.json({
      ok: true,
      platforms: successPlatforms,
      post_ids: result.postIds,
      ayrshare_id: result.id,
      template_used: tmpl?.id || "default",
    });
  } else {
    return NextResponse.json({
      ok: false,
      error: result.error,
      partial_success: result.postIds ? Object.keys(result.postIds) : [],
      errors: result.errors,
    }, { status: result.postIds && Object.keys(result.postIds).length > 0 ? 200 : 400 });
  }
}
