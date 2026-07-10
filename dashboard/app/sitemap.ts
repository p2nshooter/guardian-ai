/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Single source of truth for /sitemap.xml. Next.js generates the XML from this
 * at build time (auto-updates the lastModified stamp and base URL). Only PUBLIC,
 * crawlable pages belong here — never /portal, /admin, /auth, or /api, which are
 * private/auth-gated and are also disallowed in robots.ts.
 * ============================================================================ */
import { MetadataRoute } from "next";

// Every self-hosted product with a public /products/[slug] marketing page.
const PRODUCT_SLUGS = [
  "guardian", "orchestra", "vault", "edge", "soc",
  "compliance", "sentinel", "antivirus", "studio", "legal",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: base,               lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/promo`,    lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/playbooks`,lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/guide`,    lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/reseller/register`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`,  lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terms`,    lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  for (const slug of PRODUCT_SLUGS) {
    entries.push({
      url: `${base}/products/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
