// ============================================================
// AXTO AutoPost — Template Variation Engine
// Murni berbasis template dari templates.ts — TANPA Anthropic API.
// Semua konten adalah fakta produk Guardian AI & Orchestra AI.
// Tidak ada berita palsu, tidak ada klaim menyesatkan.
// ============================================================

import {
  ALL_TEMPLATES,
  getRandomTemplate,
  type AutoPostTemplate,
} from "./templates";
export { getRandomTemplate };

export interface VariationRequest {
  original_text: string;
  platform:      string;
  char_limit?:   number;
  language?:     string;
  tone?:         "professional" | "casual" | "urgent" | "inspiring" | "educational";
  variation_level?: "light" | "medium" | "heavy";
  product_focus?:   "guardian_ai" | "orchestra_ai" | "both";
}

export interface VariationResult {
  text:     string;
  hashtags: string[];
  cta_text: string;
}

// ── Rotasi teks CTA berdasarkan produk ────────────────────────
const CTA_GUARDIAN = [
  "🔐 Coba Guardian AI: axto.io",
  "🛡️ Pelajari lebih lanjut: axto.io",
  "🔗 Deploy sekarang: axto.io",
  "🛡️ Lindungi server Anda: axto.io",
  "🔒 Mulai proteksi: axto.io",
];

const CTA_ORCHESTRA = [
  "⚡ Coba Orchestra AI: axto.io",
  "🔗 Scale AI Anda: axto.io",
  "⚡ Kurangi biaya AI: axto.io",
  "🚀 Orchestrate sekarang: axto.io",
  "💡 Pelajari Orchestra: axto.io",
];

const CTA_GENERAL = [
  "🔗 axto.io",
  "🌐 axto.io — AI eXecution & Tools Orchestration",
  "📩 hallo@axto.io",
  "🚀 axto.io/register",
];

function pickCTA(text: string): string {
  const isGuardian  = text.toLowerCase().includes("guardian");
  const isOrchestra = text.toLowerCase().includes("orchestra");
  if (isGuardian && !isOrchestra) return CTA_GUARDIAN[Math.floor(Math.random() * CTA_GUARDIAN.length)];
  if (isOrchestra && !isGuardian) return CTA_ORCHESTRA[Math.floor(Math.random() * CTA_ORCHESTRA.length)];
  return CTA_GENERAL[Math.floor(Math.random() * CTA_GENERAL.length)];
}

// ── Light variation: ganti CTA + shuffle hashtags ────────────
function lightVariation(tmpl: AutoPostTemplate): VariationResult {
  const text = tmpl.body_text.replace(/\{\{cta\}\}/g, pickCTA(tmpl.body_text));
  const hashtags = [...tmpl.hashtags].sort(() => Math.random() - 0.5).slice(0, 6);
  return { text, hashtags, cta_text: pickCTA(tmpl.body_text) };
}

// ── Medium variation: ambil template lain dari kategori yang sama ──
function mediumVariation(tmpl: AutoPostTemplate, platform: string): VariationResult {
  const sameCategory = ALL_TEMPLATES.filter(
    t => t.category === tmpl.category && t.id !== tmpl.id && t.language === tmpl.language
  );
  const altTmpl = sameCategory.length > 0
    ? sameCategory[Math.floor(Math.random() * sameCategory.length)]
    : tmpl;
  return lightVariation(altTmpl);
}

// ── Heavy variation: ambil template random dari produk yang sama ──
function heavyVariation(tmpl: AutoPostTemplate, platform: string): VariationResult {
  const isGuardian = tmpl.category.includes("guardian") ||
    tmpl.body_text.toLowerCase().includes("guardian");
  const isOrchestra = tmpl.category.includes("orchestra") ||
    tmpl.body_text.toLowerCase().includes("orchestra");

  const categoryFilter = isGuardian && !isOrchestra
    ? (t: AutoPostTemplate) => t.body_text.toLowerCase().includes("guardian")
    : isOrchestra && !isGuardian
    ? (t: AutoPostTemplate) => t.body_text.toLowerCase().includes("orchestra")
    : () => true;

  const pool = ALL_TEMPLATES.filter(t =>
    t.id !== tmpl.id &&
    t.language === tmpl.language &&
    categoryFilter(t) &&
    (t.platforms.includes(platform) || platform === "all")
  );

  const altTmpl = pool.length > 0
    ? pool[Math.floor(Math.random() * pool.length)]
    : ALL_TEMPLATES[Math.floor(Math.random() * ALL_TEMPLATES.length)];

  return lightVariation(altTmpl);
}

// ── Main generate function ────────────────────────────────────
export async function generateVariation(req: VariationRequest): Promise<VariationResult> {
  const level    = req.variation_level || "medium";
  const lang     = req.language || "id";
  const platform = req.platform || "facebook";

  // Cari template yang paling cocok dengan teks asli
  const productHint = req.product_focus === "orchestra_ai" ? "orchestra"
    : req.product_focus === "guardian_ai" ? "guardian"
    : req.original_text.toLowerCase().includes("orchestra") ? "orchestra"
    : "guardian";

  const baseTmpl = getRandomTemplate({
    language: lang,
    platform,
    category: productHint === "orchestra" ? "orchestra_ai" : "guardian_ai",
  });

  switch (level) {
    case "light":  return lightVariation(baseTmpl);
    case "heavy":  return heavyVariation(baseTmpl, platform);
    default:       return mediumVariation(baseTmpl, platform);
  }
}

// ── Batch generate — untuk compose multi-post sekaligus ───────
export async function generateBatchVariations(
  original_text: string,
  count:          number,
  platform:       string,
  language:       string = "id"
): Promise<VariationResult[]> {
  const levels: Array<"light" | "medium" | "heavy"> = ["light", "medium", "heavy"];
  const results: VariationResult[] = [];

  // Pastikan tidak ada duplikat — pakai ID tracking
  const usedIds = new Set<string>();

  for (let i = 0; i < Math.min(count, 10); i++) {
    let tmpl: AutoPostTemplate;
    let attempts = 0;
    do {
      tmpl = getRandomTemplate({ language, platform });
      attempts++;
    } while (usedIds.has(tmpl.id) && attempts < 20);

    usedIds.add(tmpl.id);
    const level = levels[i % 3];
    results.push(level === "heavy" ? heavyVariation(tmpl, platform) : lightVariation(tmpl));
  }

  return results;
}

// ── Auto-fill template variables ─────────────────────────────
export function autoFillTemplate(
  templateText: string,
  variables: Record<string, string> = {}
): string {
  let result = templateText;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  // Default fills
  result = result.replace(/\{\{cta\}\}/g,     "🔗 axto.io");
  result = result.replace(/\{\{website\}\}/g, "axto.io");
  result = result.replace(/\{\{email\}\}/g,   "hallo@axto.io");
  result = result.replace(/\{\{product\}\}/g, "AXTO");
  return result;
}

// ── Pick template yang belum diposting ────────────────────────
export function pickUnusedTemplate(
  usedIds:  string[],
  platform: string,
  language: string = "id"
): AutoPostTemplate {
  const usedSet = new Set(usedIds);
  const pool    = ALL_TEMPLATES.filter(
    t => !usedSet.has(t.id) &&
         t.language === language &&
         (t.platforms.includes(platform) || t.platforms.length === 0)
  );

  if (pool.length === 0) {
    // Semua sudah dipakai — reset dan mulai dari awal
    return getRandomTemplate({ language, platform });
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// generatePromoImage — tidak butuh AI, return enhanced prompt string
export function generatePromoImage(prompt: string, platform: string): string {
  const sizes: Record<string, string> = {
    instagram:         "1080x1080 square",
    facebook:          "1200x630 landscape",
    pinterest:         "1000x1500 portrait",
    twitter:           "1600x900 landscape",
    linkedin:          "1200x627 landscape",
    youtube_community: "1280x720 landscape",
    default:           "1080x1080 square",
  };
  const size = sizes[platform] || sizes.default;
  return `${prompt}, AXTO brand colors (dark #060c14, cyan #22d3ee, blue #3b82f6), professional enterprise tech, ${size}, no text overlay, clean minimal, high quality`;
}
