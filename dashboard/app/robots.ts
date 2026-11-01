/* robots.txt — public pages indexable; portals, auth and APIs are not.
 * Preview deployments block everything (they also send X-Robots-Tag). */
import type { MetadataRoute } from "next";
import { SITE, absoluteUrl } from "@/lib/site";

/* Owner, 1 Nov 2026 (REQUESTS 133): "Matikan seluruh robot yg memblokir crawler google". Cloudflare's managed
 * robots.txt puts "Disallow: /" groups for Google-Extended, GoogleOther and Google-CloudVertexBot in front of this
 * file, and no Cloudflare token of the owner's has the permission to switch it off. Google merges every group that
 * names the same crawler and, when an Allow and a Disallow rule tie, follows the least restrictive one (Google's
 * robots.txt specification), so the second group re-opens the site to those crawlers with the same private paths
 * closed as for everyone. */
const GOOGLE_CRAWLERS_REOPENED = ["Google-Extended", "GoogleOther", "Google-CloudVertexBot"];
const PRIVATE = ["/app/", "/app$", "/admin", "/api/", "/login", "/register", "/forgot-password", "/reset-password", "/offline", "/self-hosted-guide/"];

export default function robots(): MetadataRoute.Robots {
  if (SITE.isPreview) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: GOOGLE_CRAWLERS_REOPENED, allow: "/", disallow: PRIVATE },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
