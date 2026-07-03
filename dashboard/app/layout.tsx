/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocaleProvider } from "@/lib/locale-provider";
import VisitTracker from "./visit-tracker";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "AXTO — AI eXecution & Tools Orchestration",
    template: "%s | AXTO",
  },
  description:
    "Protect your servers and orchestrate AI workloads with AXTO. 100% self-hosted, BYOK (Bring Your Own Keys), zero data exposure. Guardian AI detects threats in real time. Orchestra AI routes jobs across GPU clusters intelligently.",
  keywords: [
    "AI security platform", "server security AI", "self-hosted security",
    "AI orchestration", "GPU cluster management", "BYOK AI",
    "enterprise cybersecurity", "behavioral threat detection",
    "Guardian AI", "Orchestra AI", "AXTO",
    "AI server security", "enterprise AI platform", "self-hosted",
    "AI workflow orchestration", "multi-provider AI routing",
  ],
  authors: [{ name: "AXTO", url: APP_URL }],
  creator: "AXTO",
  publisher: "AXTO",
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website", locale: "en_US", alternateLocale: ["id_ID"],
    url: APP_URL, siteName: "AXTO",
    title: "AXTO — AI eXecution & Tools Orchestration",
    description: "Protect servers and orchestrate AI workloads. 100% self-hosted, BYOK. Your data never leaves your infrastructure.",
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: "AXTO — AI eXecution & Tools Orchestration" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AXTO — AI eXecution & Tools Orchestration",
    description: "100% self-hosted AI security + orchestration. BYOK. Your data stays on your servers.",
    images: [`${APP_URL}/og-image.png`],
  },
  alternates: { canonical: APP_URL },
  other: { "google-site-verification": "YOUR_VERIFICATION_CODE" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 5,
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#060c14" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6371903555702163" crossOrigin="anonymous" />
        <script async src="//www.ezojs.com/ezoic/sa.min.js" />
        <script dangerouslySetInnerHTML={{ __html: "window.ezstandalone = window.ezstandalone || {}; ezstandalone.cmd = ezstandalone.cmd || [];" }} />
        <script src="//ezoicanalytics.com/analytics.js" />
      </head>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
        <VisitTracker />
      </body>
    </html>
  );
}
