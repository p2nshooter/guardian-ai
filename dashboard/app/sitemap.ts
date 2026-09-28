/* sitemap.xml — every public, indexable page (static routes + generated pages). */
import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { CLOUD_APPS } from "@/lib/apps";
import { COUNTRIES } from "@/lib/legal/jurisdictions";

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
    page("/contact", 0.5, "monthly"),
  ];
}
