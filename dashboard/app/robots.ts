/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
import { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/portal/", "/auth/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
