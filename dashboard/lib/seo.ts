/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * SEO helpers: per-page metadata (canonical, Open Graph, Twitter) and
 * schema.org JSON-LD builders. Every public page uses these so titles,
 * canonicals and structured data are consistent.
 * ============================================================================ */
import type { Metadata } from "next";
import { SITE, absoluteUrl } from "./site";

// Search titles and snippets (owner, 27 Oct 2026: "perbaiki dulu seluruh SEO websitenya, perkata").
// Google shows about 60 characters of a title and 160 of a description. Every title here puts its
// keyword first ("Licence auction — AXTO self-hosted apps …"), so a long one is cut at its last
// clause break that fits, keeping " | AXTO" when there is room; Open Graph and the page keep the
// full text. The same rule as the article sites (ulyah.com sites/_engine/build.mjs).
export const MAX_TITLE = 60;
export const MAX_DESCRIPTION = 160;
const TRAILING = new Set([" ", ",", ";", ":", ".", "–", "—", "|", "-"]);
const trimTrailing = (t: string) => {
  let end = t.length;
  while (end > 0 && TRAILING.has(t[end - 1])) end -= 1;
  return t.slice(0, end).trim();
};
/** Every prefix of `title` that ends at one of `marks`, longest first ("?" and "!" are kept). */
const cutsAt = (title: string, marks: RegExp) =>
  [...title.matchAll(marks)].map((m) => trimTrailing(title.slice(0, (m.index ?? 0) + (m[0][0] === "?" || m[0][0] === "!" ? 1 : 0)))).filter(Boolean).reverse();

/** The <title> for a page title: as it is when it fits with " | AXTO", otherwise the longest clause that fits. */
export function searchTitle(title: string): string {
  // A title that already names AXTO does not get it twice.
  const branded = (t: string) => (t.includes(SITE.name) ? t : `${t} | ${SITE.name}`);
  const fits = (t: string) => t.length >= 10 && t.length <= MAX_TITLE;
  if (fits(branded(title))) return branded(title);
  if (fits(title)) return title;
  const clauses = cutsAt(title, /[:?!.](?=\s)|\s[–—|-]\s/g);
  const commas = cutsAt(title, /,(?=\s)/g);
  for (const group of [clauses, commas]) {
    const withBrand = group.find((c) => fits(branded(c)));
    if (withBrand) return branded(withBrand);
    const alone = group.find(fits);
    if (alone) return alone;
  }
  const head = title.slice(0, MAX_TITLE - 1);
  return `${trimTrailing(head.slice(0, head.lastIndexOf(" ")))}…`;
}

/** The meta description: as it is up to 160 characters, otherwise cut at the last sentence that fits. */
export function snippet(description: string): string {
  const d = description.replace(/\s+/g, " ").trim();
  if (d.length <= MAX_DESCRIPTION) return d;
  const ends = [...d.matchAll(/[.!?](?=\s)/g)].map((m) => (m.index ?? 0) + 1).filter((i) => i >= 70 && i <= MAX_DESCRIPTION);
  if (ends.length) return d.slice(0, ends[ends.length - 1]);
  const head = d.slice(0, MAX_DESCRIPTION - 1);
  return `${trimTrailing(head.slice(0, head.lastIndexOf(" ")))}…`;
}

export function pageMeta(o: { title: string; description: string; path: string; image?: string; noindex?: boolean; type?: "website" | "article"; keywords?: string[] }): Metadata {
  const url = absoluteUrl(o.path);
  const image = absoluteUrl(o.image || SITE.ogImage);
  return {
    title: { absolute: searchTitle(o.title) },
    description: snippet(o.description),
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
