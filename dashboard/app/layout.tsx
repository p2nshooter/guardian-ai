/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - AI workspace for legal, security & business teams
 * ==============================================================================
 * Root layout: site-wide metadata, verification tags (Google AdSense +
 * Search Console + Bing), viewport and global styles. Public, member and admin
 * areas add their own layouts on top.
 * ============================================================================ */
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SITE, absoluteUrl } from "@/lib/site";
import { AD_ACCOUNTS } from "@/lib/adsense";
import { PwaRegister } from "@/components/pwa/Pwa";
import { PWA_EARLY } from "@/components/pwa/early";

// "Crystal Palace" type (docs/BLUEPRINT-V4.md §18.1), served from our own origin:
// Inter for reading, Playfair Display for the large public headings.
const sans = localFont({ src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", variable: "--font-sans", weight: "100 900", display: "swap" });
const display = localFont({ src: "../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2", variable: "--font-display", weight: "400 900", display: "swap" });

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
  appleWebApp: { capable: true, title: "AXTO", statusBarStyle: "black-translucent" },
  other: { "mobile-web-app-capable": "yes" },
  ...(SITE.isPreview ? { robots: { index: false, follow: false } } : {}),
  icons: { icon: [{ url: "/favicon.svg?v=2", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-touch-icon.png" },
  openGraph: { type: "website", siteName: SITE.name, url: SITE.url, locale: SITE.locale, images: [{ url: absoluteUrl(SITE.ogImage), width: 1200, height: 630, alt: SITE.name }] },
  twitter: { card: "summary_large_image", site: SITE.twitter, images: [absoluteUrl(SITE.ogImage)] },
  verification: {
    ...(SITE.gscVerification ? { google: SITE.gscVerification } : {}),
    other: {
      // Google AdSense site ownership (keep on every page, including the homepage): one meta tag per authorised
      // account, the primary first (lib/adsense.ts, owner 7 Nov 2026).
      "google-adsense-account": [...AD_ACCOUNTS],
      ...(SITE.bingVerification ? { "msvalidate.01": SITE.bingVerification } : {}),
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#04060c" }, { media: "(prefers-color-scheme: dark)", color: "#04060c" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <head>
        {/* Catches the browser's install offer before React starts (components/pwa/early.ts). */}
        <script dangerouslySetInnerHTML={{ __html: PWA_EARLY }} />
      </head>
      <body>
        {SITE.isPreview ? (
          <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
            Preview of the next AXTO release — test data only. The live site is axto.io.
          </div>
        ) : null}
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
