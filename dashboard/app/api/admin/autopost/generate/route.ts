import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateVariation, generateBatchVariations, pickUnusedTemplate, autoFillTemplate } from "@/lib/autopost/generator";
import { getRandomTemplate, ALL_TEMPLATES } from "@/lib/autopost/templates";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { original_text, platform, language, variation_level, product_focus, count, auto_publish } = body;

  // ── "Push Now" — generate + immediately publish to platform ────────────
  if (auto_publish && platform) {
    try {
      const { getDB, dbQuery, dbRun, newId, now } = await import("@/lib/db");
      const { publishToplatform } = await import("@/lib/autopost/publisher");

      let db: any;
      try { db = getDB(req); } catch {
        return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
      }

      // Get platform config
      const cfg = await (await import("@/lib/db")).dbFirst<any>(db,
        `SELECT id, credentials, is_active FROM autopost_platform_configs WHERE platform = ?`, [platform]
      );
      if (!cfg || !cfg.is_active) {
        return NextResponse.json({ error: `Platform "${platform}" is not configured or inactive. Configure it in the Platforms tab first.` }, { status: 400 });
      }

      // Get recently used template IDs to avoid repeat
      const recent = await dbQuery<{ template_id: string }>(db,
        `SELECT template_id FROM autopost_posts WHERE platform = ? AND created_at > datetime('now', '-7 days')`,
        [platform]
      );
      const usedIds = recent.map(p => p.template_id).filter(Boolean);

      // Pick fresh template
      const tmpl = pickUnusedTemplate(usedIds, platform, language || "id");
      const text = autoFillTemplate(tmpl.body_text);
      const hashtags = tmpl.hashtags || [];

      // Publish immediately
      const creds = JSON.parse(cfg.credentials || "{}");
      const result = await publishToplatform({
        platform,
        credentials: creds,
        post: { body_text: text, hashtags, cta_text: tmpl.cta_text, image_url: "" },
      });

      // Save post record
      const postId = newId();
      await dbRun(db,
        `INSERT INTO autopost_posts (id, template_id, platform, platform_config_id, body_text, hashtags, status, published_at, platform_post_id, platform_url, error_message, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [postId, tmpl.id, platform, cfg.id, text, JSON.stringify(hashtags),
         result.success ? "published" : "failed", result.success ? now() : null,
         result.platform_post_id || "", result.platform_url || "", result.error || "", now(), now()]
      );

      return NextResponse.json({
        ok: result.success,
        success: result.success,
        platform_post_id: result.platform_post_id,
        platform_url: result.platform_url,
        error: result.error,
        template: { id: tmpl.id, title: tmpl.title },
        preview: text.substring(0, 200),
      });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message || "Push failed" }, { status: 500 });
    }
  }

  // ── Batch generate (preview) ───────────────────────────────────────────
  if (count && count > 1) {
    const results = await generateBatchVariations(
      original_text || "", Math.min(count, 10),
      platform || "facebook", language || "id"
    );
    return NextResponse.json({ results });
  }

  // ── Single template pick (preview) ────────────────────────────────────
  if (!original_text) {
    const tmpl = getRandomTemplate({
      language: language || "id",
      platform: platform || "facebook",
      category: product_focus === "orchestra_ai" ? "orchestra_ai" : "guardian_ai",
    });
    return NextResponse.json({
      text:     tmpl.body_text.replace(/\{\{cta\}\}/g, "🔗 axto.io"),
      hashtags: tmpl.hashtags,
      cta_text: tmpl.cta_text,
      template: { id: tmpl.id, title: tmpl.title, category: tmpl.category },
    });
  }

  // ── Generate variation from custom text ──────────────────────────────
  const result = await generateVariation({
    original_text, platform: platform || "facebook",
    language: language || "id", variation_level, product_focus,
  });
  return NextResponse.json(result);
}

// GET — list all templates for preview in admin
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url      = new URL(req.url);
  const category = url.searchParams.get("category") || "";
  const language = url.searchParams.get("language") || "";
  const platform = url.searchParams.get("platform") || "";

  let pool = [...ALL_TEMPLATES];
  if (language) pool = pool.filter(t => t.language === language);
  if (category) pool = pool.filter(t => t.category === category);
  if (platform) pool = pool.filter(t => t.platforms.includes(platform));

  return NextResponse.json({
    total: pool.length,
    templates: pool.map(t => ({
      id: t.id, title: t.title, category: t.category,
      platforms: t.platforms, language: t.language,
      preview: t.body_text,
      hashtags: t.hashtags,
      cta_text: t.cta_text,
    })),
  });
}
