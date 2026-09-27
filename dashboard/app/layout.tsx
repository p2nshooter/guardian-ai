/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 * Root layout: site-wide metadata, verification tags (Google AdSense +
 * Search Console + Bing), viewport and global styles. Public, member and admin
 * areas add their own layouts on top.
 * ============================================================================ */
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.legalName, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "technology",
  formatDetection: { telephone: false },
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
  openGraph: { type: "website", siteName: SITE.name, url: SITE.url, locale: SITE.locale, images: [{ url: absoluteUrl(SITE.ogImage), width: 1200, height: 630, alt: SITE.name }] },
  twitter: { card: "summary_large_image", site: SITE.twitter, images: [absoluteUrl(SITE.ogImage)] },
  verification: {
    ...(SITE.gscVerification ? { google: SITE.gscVerification } : {}),
    other: {
      // Google AdSense site ownership (keep on every page, including the homepage).
      "google-adsense-account": SITE.adsenseClient,
      ...(SITE.bingVerification ? { "msvalidate.01": SITE.bingVerification } : {}),
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#07090d" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
