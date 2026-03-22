import type { NextConfig } from "next";
// @ts-ignore
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

if (process.env.NODE_ENV === "development") {
  setupDevPlatform().catch(() => {});
}

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  async headers() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
    return [
      // License-validate must stay open — called from client servers (any IP/domain)
      {
        source: "/api/license-validate",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Cache-Control",                value: "no-store" },
        ],
      },
      // All other API routes — restricted to own domain only
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: appUrl },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Cache-Control",                value: "no-store" },
        ],
      },
      {
        source: "/((?!api|_next/static|_next/image|favicon).*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
