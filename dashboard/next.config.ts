/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
import type { NextConfig } from "next";

if (process.env.NODE_ENV === "development") {
  const { setupDevPlatform } = require("@cloudflare/next-on-pages/next-dev");
  setupDevPlatform().catch(() => {});
}

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
  // v3 is type-checked in CI: type errors now fail the build.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      { source: "/:path*", headers: process.env.NEXT_PUBLIC_PREVIEW === "1" ? [...SECURITY_HEADERS, { key: "X-Robots-Tag", value: "noindex, nofollow" }] : SECURITY_HEADERS },
      { source: "/_next/static/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  async rewrites() {
    // Public guide URL → its static page (see app/(site)/self-hosted-guide/[slug]).
    return [{ source: "/self-hosted/:slug/guide", destination: "/self-hosted-guide/:slug" }];
  },
  async redirects() {
    // Old URLs → their v3 homes (permanent, so search engines transfer ranking).
    return [
      { source: "/auth/login", destination: "/login", permanent: true },
      { source: "/portal", destination: "/app", permanent: true },
      { source: "/portal/:path*", destination: "/app", permanent: true },
      { source: "/studio/:path*", destination: "/app/studio", permanent: true },
      { source: "/products/:slug", destination: "/self-hosted/:slug", permanent: true },
      { source: "/playbooks", destination: "/prompts", permanent: true },
      { source: "/playbooks/:slug", destination: "/prompts", permanent: true },
      { source: "/guide", destination: "/self-hosted", permanent: true },
      { source: "/promo", destination: "/pricing", permanent: true },
      { source: "/acquire", destination: "/", permanent: true },
      { source: "/reseller/:path*", destination: "/contact", permanent: true },
    ];
  },
};

export default nextConfig;
