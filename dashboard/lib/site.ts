/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * Site-wide constants — the ONE place for brand, URLs and contact details.
 * ============================================================================ */

/** Platform release — shown by /api/health and the status page. Keep in step with package.json. */
export const VERSION = "3.2.1";

export const SITE = {
  name: "AXTO",
  legalName: "AXTO (Axto AI)",
  url: (process.env.NEXT_PUBLIC_APP_URL || "https://axto.io").replace(/\/$/, ""),
  tagline: "AI workspace for legal, security & business teams",
  description:
    "AXTO is a subscription AI workspace: Legal AI with 36 expert workspaces across 200+ jurisdictions, a premium prompt library for every profession, AI Studio, Clipper, Privacy Vault, Compliance Center and Security Analyst — all in your browser, no installation. Self-hosted Docker editions included on Business and Enterprise.",
  email: "hello@axto.io",
  supportEmail: "hello@axto.io",
  twitter: "@axto_ai",
  logo: "/axto-logo.jpg",
  ogImage: "/og-image.png",
  locale: "en_US",
  // Google — AdSense publisher (verification meta + loader) and Search Console.
  adsenseClient: "ca-pub-5693981744147503",
  gscVerification: process.env.NEXT_PUBLIC_GSC_VERIFICATION || "",
  bingVerification: process.env.NEXT_PUBLIC_BING_VERIFICATION || "",
  // Preview deployments (axto-preview.pages.dev): noindex, no ads, visible banner.
  isPreview: process.env.NEXT_PUBLIC_PREVIEW === "1",
} as const;

export function absoluteUrl(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}
