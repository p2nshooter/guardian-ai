/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * SEO helpers: per-page metadata (canonical, Open Graph, Twitter) and
 * schema.org JSON-LD builders. Every public page uses these so titles,
 * canonicals and structured data are consistent.
 * ============================================================================ */
import type { Metadata } from "next";
import { SITE, absoluteUrl } from "./site";

export function pageMeta(o: { title: string; description: string; path: string; image?: string; noindex?: boolean; type?: "website" | "article"; keywords?: string[] }): Metadata {
  const url = absoluteUrl(o.path);
  const image = absoluteUrl(o.image || SITE.ogImage);
  return {
    title: o.title,
    description: o.description,
    keywords: o.keywords,
    alternates: { canonical: url },
    robots: o.noindex ? { index: false, follow: false } : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    openGraph: { type: o.type || "website", url, siteName: SITE.name, title: o.title, description: o.description, locale: SITE.locale, images: [{ url: image, width: 1200, height: 630, alt: o.title }] },
    twitter: { card: "summary_large_image", site: SITE.twitter, title: o.title, description: o.description, images: [image] },
  };
}

export const orgJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE.url}/#organization`,
  name: SITE.name,
  legalName: SITE.legalName,
  url: SITE.url,
  logo: absoluteUrl("/icon-512.png"),
  email: SITE.email,
  contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: SITE.supportEmail, availableLanguage: ["English", "Indonesian"] }],
});

export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE.url}/#website`,
  url: SITE.url,
  name: SITE.name,
  publisher: { "@id": `${SITE.url}/#organization` },
  inLanguage: "en",
  potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/prompts?q={search_term_string}` }, "query-input": "required name=search_term_string" },
});

export const breadcrumbJsonLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
});

export const faqJsonLd = (qa: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: qa.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
});

export function softwareJsonLd(o: { name: string; description: string; path: string; category?: string; features?: string[]; offers?: { name: string; price: number; period?: "month" | "year" }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: o.name,
    description: o.description,
    url: absoluteUrl(o.path),
    applicationCategory: o.category || "BusinessApplication",
    operatingSystem: "Web browser",
    publisher: { "@id": `${SITE.url}/#organization` },
    ...(o.features?.length ? { featureList: o.features } : {}),
    ...(o.offers?.length ? {
      offers: o.offers.map((f) => ({
        "@type": "Offer", name: f.name, price: f.price.toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock", url: absoluteUrl("/pricing"),
        ...(f.period ? { priceSpecification: { "@type": "UnitPriceSpecification", price: f.price.toFixed(2), priceCurrency: "USD", unitText: f.period === "month" ? "MONTH" : "YEAR" } } : {}),
      })),
    } : {}),
  };
}

/** Step-by-step instructions (installation guides) as schema.org HowTo. */
export const howToJsonLd = (o: { name: string; description: string; path: string; steps: { name: string; text: string }[] }) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: o.name,
  description: o.description,
  url: absoluteUrl(o.path),
  step: o.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
});
