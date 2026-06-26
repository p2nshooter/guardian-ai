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
import { getDB, dbRun, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getRandomTemplate, autoFillTemplate } from "@/lib/autopost/generator";
import {
  getClassifiedSites,
  ALL_CLASSIFIED_SITES,
  type ClassifiedSite,
} from "@/lib/classified-sites";

/**
 * AXTO AutoPost — Free Classified Mass Push API (1000+ sites)
 *
 * POST /api/admin/autopost/classified-push
 *
 * ✅ 100% FREE — no registration, no login, no API key
 * ✅ Direct HTTP POST to form endpoints
 * ✅ Parallel execution (up to 50 concurrent)
 * ✅ Region → language mapping (English default, ID for Indonesia)
 * ✅ Filter by region, category, priority
 */

// ── Region → template language mapping ────────────────────────
// Default = English. Only explicitly Indonesian regions use "id".
function regionToLanguage(region: string): "en" | "id" {
  const idRegions = ["Indonesia"];
  return idRegions.includes(region) ? "id" : "en";
}

// ── Build ad content per language ─────────────────────────────
function buildAd(
  filledText: string,
  language: "en" | "id",
  appUrl: string
): { title: string; description: string; website: string; category: string } {
  const title =
    language === "id"
      ? "AXTO AI Platform — Enterprise Server Security & AI Orchestration"
      : "AXTO AI Platform — Enterprise Server Security & AI Orchestration";
  return {
    title,
    description: `${filledText}\n\n🔗 ${appUrl}`,
    website: appUrl,
    category: "software",
  };
}

// ── Generate template text for a given language ───────────────
function generateTemplateText(
  language: "en" | "id",
  appUrl: string
): { filledText: string; templateId: string } {
  const tmpl = getRandomTemplate({ language });
  if (tmpl) {
    return {
      filledText: autoFillTemplate(tmpl.body_text || "", {
        appUrl,
        language,
      }),
      templateId: tmpl.id,
    };
  }
  // Fallback — always English-first, elegant & readable
  const fallbacks: Record<string, string> = {
    en: [
      "Protect your infrastructure with AI-powered threat detection. AXTO Guardian AI monitors your servers around the clock — behavioral analysis, automated incident response, and full compliance reporting. Self-hosted, zero data exposure. Start your free evaluation today.",
      "Reduce your AI costs by up to 60% with intelligent routing. AXTO Orchestra AI automatically directs each request to the optimal provider — balancing cost, speed, and quality across OpenAI, Claude, Gemini, and your own GPUs.",
      "Enterprise cybersecurity shouldn't require a dedicated SOC team. AXTO Guardian AI delivers 7-layer threat detection, automated quarantine, and one-click compliance reports — all self-hosted on your infrastructure.",
      "One platform for AI orchestration: route workloads across 8+ providers, manage GPU clusters, set budget caps, and auto-failover — all from a single dashboard. AXTO Orchestra AI.",
      "400+ professionally tested AI prompts for business, legal, marketing, and more. AXTO Playbooks work with ChatGPT, Claude, and Gemini. Instant download, lifetime access.",
    ][Math.floor(Math.random() * 5)],
    id: [
      "Lindungi infrastruktur Anda dengan deteksi ancaman berbasis AI. AXTO Guardian AI memantau server Anda 24/7 — analisis perilaku, respons insiden otomatis, dan laporan kepatuhan lengkap. Self-hosted, tanpa paparan data.",
      "Kurangi biaya AI hingga 60% dengan routing cerdas. AXTO Orchestra AI secara otomatis mengarahkan setiap request ke provider optimal — menyeimbangkan biaya, kecepatan, dan kualitas.",
    ][Math.floor(Math.random() * 2)],
  };
  return {
    filledText: fallbacks[language] || fallbacks.en,
    templateId: "fallback",
  };
}

interface PushResult {
  site: string;
  success: boolean;
  method: string;
  statusCode?: number;
  error?: string;
  region?: string;
  category?: string;
}

async function pushToSite(
  site: ClassifiedSite,
  ad: { title: string; description: string; website: string; category: string }
): Promise<PushResult> {
  const base = {
    site: site.name,
    region: site.region,
    category: site.category,
  };
  try {
    if (site.method === "ping") {
      const pingUrl =
        site.url + encodeURIComponent(ad.website + "/sitemap.xml");
      const r = await fetch(pingUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10_000),
      });
      return {
        ...base,
        success: r.ok || r.status < 400,
        method: "ping",
        statusCode: r.status,
      };
    }

    // Build form data
    const params = new URLSearchParams();
    const fieldMap: Record<string, string> = {
      title: ad.title,
      description: ad.description,
      category: ad.category,
      website: ad.website,
    };
    for (const [ourField, theirField] of Object.entries(site.fields || {})) {
      if (fieldMap[ourField]) {
        params.set(theirField, fieldMap[ourField]);
      }
    }
    // Ensure website/url is always present
    if (!site.fields?.website) {
      params.set("url", ad.website);
      params.set("website", ad.website);
    }

    const r = await fetch(site.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (compatible; AXTO/2.0; +https://axto.io)",
        Accept: "text/html,*/*",
      },
      body: params.toString(),
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });

    const success = r.ok || r.status === 302 || r.status === 301;
    return { ...base, success, method: "form", statusCode: r.status };
  } catch (e: any) {
    return {
      ...base,
      success: false,
      method: site.method,
      error: e.message?.slice(0, 80) || "timeout",
    };
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const preferredLang = (body.language as string) || "en";
  const regions = body.regions as string[] | undefined;
  const categories = body.categories as string[] | undefined;
  const maxSites = Math.min(body.max_sites || 500, 1100);
  const concurrency = Math.min(body.concurrency || 30, 50);
  const randomize = body.randomize !== false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

  // ── Gather sites ──────────────────────────────────────────
  let sites: ClassifiedSite[];
  if (regions?.length || categories?.length) {
    sites = getClassifiedSites({ regions, categories });
  } else {
    sites = [...ALL_CLASSIFIED_SITES];
  }
  if (randomize) sites.sort(() => Math.random() - 0.5);
  sites = sites.slice(0, maxSites);

  if (sites.length === 0) {
    return NextResponse.json(
      { error: "No sites match the selected filters" },
      { status: 400 }
    );
  }

  // ── Pre-generate templates per language ────────────────────
  // Cache one template per language so we don't regenerate per site
  const templateCache: Record<
    string,
    { ad: ReturnType<typeof buildAd>; templateId: string }
  > = {};

  function getAdForRegion(region: string) {
    const lang = regionToLanguage(region);
    // If user explicitly chose a language, respect it for all regions
    const effectiveLang =
      preferredLang === "both"
        ? lang
        : preferredLang === "id"
        ? "id"
        : "en";
    const key = effectiveLang as string;

    if (!templateCache[key]) {
      const { filledText, templateId } = generateTemplateText(
        effectiveLang as "en" | "id",
        appUrl
      );
      templateCache[key] = {
        ad: buildAd(filledText, effectiveLang as "en" | "id", appUrl),
        templateId,
      };
    }
    return templateCache[key];
  }

  // ── Execute pushes ────────────────────────────────────────
  const t0 = Date.now();
  const results: PushResult[] = [];

  for (let i = 0; i < sites.length; i += concurrency) {
    const batch = sites.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((site) => {
        const { ad } = getAdForRegion(site.region);
        return pushToSite(site, ad);
      })
    );
    for (const r of settled) {
      results.push(
        r.status === "fulfilled"
          ? r.value
          : {
              site: "unknown",
              success: false,
              method: "error",
              error: r.reason?.message,
            }
      );
    }
  }

  const duration_ms = Date.now() - t0;
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  // ── Aggregate stats ───────────────────────────────────────
  const byRegion: Record<string, { success: number; failed: number }> = {};
  const byCategory: Record<string, { success: number; failed: number }> = {};
  for (const r of results) {
    const reg = r.region || "Unknown";
    const cat = r.category || "unknown";
    if (!byRegion[reg]) byRegion[reg] = { success: 0, failed: 0 };
    if (!byCategory[cat]) byCategory[cat] = { success: 0, failed: 0 };
    if (r.success) {
      byRegion[reg].success++;
      byCategory[cat].success++;
    } else {
      byRegion[reg].failed++;
      byCategory[cat].failed++;
    }
  }

  // ── Log to D1 ─────────────────────────────────────────────
  const usedTemplateId =
    Object.values(templateCache)[0]?.templateId || "fallback";
  try {
    const db = getDB(req);
    await dbRun(
      db,
      `INSERT INTO autopost_posts
        (id, template_id, platform, category, title, body_text, status, error_msg, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        usedTemplateId,
        "classified_batch",
        "classified",
        Object.values(templateCache)[0]?.ad.title || "AXTO AI Platform",
        Object.values(templateCache)[0]?.ad.description || "",
        successCount > 0 ? "published" : "failed",
        `${successCount}/${results.length} sites (${(
          duration_ms / 1000
        ).toFixed(1)}s)`,
        successCount > 0 ? now() : null,
        now(),
      ]
    );
  } catch {}

  return NextResponse.json({
    ok: true,
    total: results.length,
    success: successCount,
    failed: failedCount,
    duration_ms,
    template_used: usedTemplateId,
    language_used: Object.keys(templateCache),
    byRegion,
    byCategory,
    results: results.slice(0, 100),
  });
}

// ── GET endpoint for info ────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const regionCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  for (const s of ALL_CLASSIFIED_SITES) {
    regionCounts[s.region] = (regionCounts[s.region] || 0) + 1;
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    total_sites: ALL_CLASSIFIED_SITES.length,
    stats: { byRegion: regionCounts, byCategory: categoryCounts },
    description:
      "1000+ free classified sites — no registration, no login, no credentials needed. English templates by default; Indonesian only for ID-specific audiences.",
  });
}
