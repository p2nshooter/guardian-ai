import { MetadataRoute } from "next";
export const runtime = "edge";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/portal/", "/auth/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
