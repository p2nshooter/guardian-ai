/* robots.txt — public pages indexable; portals, auth and APIs are not.
 * Preview deployments block everything (they also send X-Robots-Tag). */
import type { MetadataRoute } from "next";
import { SITE, absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (SITE.isPreview) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app/", "/app$", "/admin", "/api/", "/login", "/register", "/forgot-password", "/reset-password", "/offline", "/self-hosted-guide/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
