/* sitemap.xml — every public, indexable page (static routes + generated pages). */
import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { CLOUD_APPS } from "@/lib/apps";
import { COUNTRIES } from "@/lib/legal/jurisdictions";
import { FIELDS, PROMPTS } from "@/lib/prompts/catalog";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { PRODUCT_CATALOG } from "@/lib/product-catalog";

const BUILT = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" = "weekly") =>
    ({ url: absoluteUrl(path), lastModified: BUILT, changeFrequency, priority });
  return [
    page("/", 1, "daily"),
    page("/pricing", 0.9),
    page("/apps", 0.9),
    ...CLOUD_APPS.map((a) => page(`/apps/${a.slug}`, a.slug === "legal" ? 0.9 : 0.8)),
    page("/legal-ai", 0.8),
    ...COUNTRIES.map((c) => page(`/legal-ai/${c.code.toLowerCase()}`, ["ID", "US", "GB", "SG", "MY", "IN", "AU", "AE", "EU"].includes(c.code) ? 0.8 : 0.6, "monthly")),
    page("/prompts", 0.9),
    ...FIELDS.map((f) => page(`/prompts/${f.id}`, 0.7)),
    ...PROMPTS.map((p) => page(`/prompts/${p.field}/${p.id}`, 0.6, "monthly")),
    page("/self-hosted", 0.8),
    ...PRODUCT_CATALOG.map((p) => page(`/self-hosted/${p.slug}`, 0.7)),
    ...PRODUCT_CATALOG.map((p) => page(`/self-hosted/${p.slug}/guide`, 0.6, "monthly")),
    page("/blog", 0.7, "daily"),
    ...BLOG_POSTS.map((p) => page(`/blog/${p.slug}`, 0.6, "monthly")),
    page("/help", 0.6, "monthly"),
    page("/security", 0.5, "monthly"),
    page("/contact", 0.5, "monthly"),
    page("/terms", 0.3, "monthly"),
    page("/privacy", 0.3, "monthly"),
    page("/refund", 0.3, "monthly"),
    page("/dpa", 0.3, "monthly"),
    page("/subprocessors", 0.3, "monthly"),
    page("/status", 0.3, "daily"),
  ];
}
