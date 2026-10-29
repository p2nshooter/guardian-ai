/* SEO for the partner programme pages (CLAUDE.md §2): metadata, the page, its FAQ and
 * breadcrumbs as JSON-LD, and for the paid programmes a Service with its entry offer.
 * A hidden programme answers with a noindex 404 (Admin → Programs). */
import type { Metadata } from "next";
import { pageMeta, faqJsonLd, breadcrumbJsonLd } from "./seo";
import { absoluteUrl, SITE } from "./site";

export const HIDDEN_META: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

export function partnerMeta(o: { title: string; description: string; path: string; keywords: string[] }): Metadata {
  return pageMeta(o);
}

export function partnerJsonLd(o: { name: string; description: string; path: string; faq: string[][]; offer?: { name: string; priceUsd: number } }) {
  const page = {
    "@context": "https://schema.org", "@type": "WebPage", name: o.name, description: o.description, url: absoluteUrl(o.path),
    about: { "@id": `${SITE.url}/#organization` }, isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
  };
  const crumbs = [{ name: "Home", path: "/" }, { name: "Partner programmes", path: "/partners" }, ...(o.path === "/partners" ? [] : [{ name: o.name, path: o.path }])];
  const service = o.offer ? {
    "@context": "https://schema.org", "@type": "Service", name: o.name, description: o.description, url: absoluteUrl(o.path),
    provider: { "@id": `${SITE.url}/#organization` }, areaServed: "Worldwide",
    offers: { "@type": "Offer", name: o.offer.name, price: o.offer.priceUsd, priceCurrency: "USD", url: absoluteUrl(o.path), availability: "https://schema.org/InStock" },
  } : null;
  return [page, faqJsonLd(o.faq.map(([q, a]) => ({ q: q!, a: a! }))), breadcrumbJsonLd(crumbs), ...(service ? [service] : [])];
}
