/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
import { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog-posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...BLOG_POSTS.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${base}/auth/login`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/acquire`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
