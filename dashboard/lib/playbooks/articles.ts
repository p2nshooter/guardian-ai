/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * Playbooks as ARTICLES. The AI-prompt playbooks are no longer sold or
 * downloaded — each one is a free, ad-supported article at /playbooks/<slug>.
 * These helpers turn the master catalog (lib/playbooks/catalog.ts) into
 * article-shaped data: categories, lookups, related posts, and a computed
 * read-time. No pricing, no checkout — content only.
 * ============================================================================ */
import { PLAYBOOK_CATALOG, type PlaybookSeed } from "@/lib/playbooks/catalog";

export type { PlaybookSeed };
export const PLAYBOOKS = PLAYBOOK_CATALOG;

// ── Human-readable category labels (fallback: title-case the slug) ───────────
const CATEGORY_LABELS: Record<string, string> = {
  copywriting: "Copywriting & Marketing",
  business: "Business & Strategy",
  "legal-hr": "Legal & HR",
  ecommerce: "E-Commerce",
  "saas-startup": "SaaS & Startup",
  career: "Career",
  "data-analytics": "Data & Analytics",
  education: "Education",
  "real-estate": "Real Estate",
  content: "Content & SEO",
};

export function categoryLabel(slug: string): string {
  return (
    CATEGORY_LABELS[slug] ||
    slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}

export interface CategoryInfo {
  slug: string;
  label: string;
  count: number;
  icon: string;
}

/** All categories present in the catalog, with counts and a representative icon. */
export function getCategories(): CategoryInfo[] {
  const map = new Map<string, { count: number; icon: string }>();
  for (const p of PLAYBOOKS) {
    const cur = map.get(p.category_slug);
    if (cur) cur.count += 1;
    else map.set(p.category_slug, { count: 1, icon: p.icon });
  }
  return Array.from(map.entries())
    .map(([slug, v]) => ({ slug, label: categoryLabel(slug), count: v.count, icon: v.icon }))
    .sort((a, b) => b.count - a.count);
}

export function getPlaybook(slug: string): PlaybookSeed | undefined {
  return PLAYBOOKS.find((p) => p.slug === slug);
}

export function getPlaybooksByCategory(categorySlug: string): PlaybookSeed[] {
  return PLAYBOOKS.filter((p) => p.category_slug === categorySlug);
}

export function getFeaturedPlaybooks(limit = 12): PlaybookSeed[] {
  return PLAYBOOKS.filter((p) => p.is_featured).slice(0, limit);
}

/** Related = same category first, then padded with other featured posts. */
export function relatedPlaybooks(slug: string, limit = 4): PlaybookSeed[] {
  const current = getPlaybook(slug);
  if (!current) return [];
  const sameCat = PLAYBOOKS.filter((p) => p.category_slug === current.category_slug && p.slug !== slug);
  const pool = [...sameCat];
  if (pool.length < limit) {
    for (const p of PLAYBOOKS) {
      if (p.slug !== slug && !pool.some((x) => x.slug === p.slug)) pool.push(p);
      if (pool.length >= limit) break;
    }
  }
  return pool.slice(0, limit);
}

/** Rough read-time: ~200 wpm over the article body we render. */
export function readMinutes(p: PlaybookSeed): number {
  const words =
    (p.long_description || "").split(/\s+/).length +
    (p.description || "").split(/\s+/).length +
    (p.preview_text || "").split(/\s+/).length +
    p.prompt_count * 12; // each prompt line contributes to the guide
  return Math.max(4, Math.round(words / 200));
}

const PROVIDER_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  llama: "Llama",
  mistral: "Mistral",
  grok: "Grok",
};
export function providerLabel(id: string): string {
  return PROVIDER_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1);
}
