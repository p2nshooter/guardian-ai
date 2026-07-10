/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Single source of truth for /robots.txt (Next.js generates it from this).
 * Every public marketing/docs page is crawlable; the private, auth-gated
 * surfaces (/api, /admin, /portal, /auth) are disallowed for every crawler.
 *
 * Google's crawlers are listed explicitly — including Mediapartners-Google
 * (the AdSense content crawler) and AdsBot-Google (ad-quality crawler) — so
 * AdSense can read every public page it will serve ads on. They inherit the
 * same public-allow / private-disallow policy; naming them removes any doubt.
 * ============================================================================ */
import { MetadataRoute } from "next";

const PRIVATE = ["/api/", "/admin/", "/portal/", "/auth/"];

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  const googleBots = [
    "Googlebot", "Googlebot-Image", "Googlebot-News", "Googlebot-Mobile",
    "AdsBot-Google", "AdsBot-Google-Mobile", "Mediapartners-Google",
  ];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      // Explicit Google/AdSense crawlers — same policy, spelled out so there is
      // zero ambiguity that AdSense may crawl and monetize every public page.
      ...googleBots.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
