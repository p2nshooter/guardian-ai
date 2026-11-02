/* /acquire — AXTO is for sale: the offer, the privacy guarantee, everything
 * included, the handover and a secure checkout (components/site/AcquireOffer).
 * SEO: metadata + JSON-LD (the business as a Product with an Offer, FAQ,
 * breadcrumbs). No bank details or other private data on the public page. */
import type { Metadata } from "next";
import AcquireOffer, { type OfferApp, type OfferProduct } from "@/components/site/AcquireOffer";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { absoluteUrl, SITE } from "@/lib/site";
import { CLOUD_APPS } from "@/lib/apps";
import { PRODUCT_CATALOG } from "@/lib/product-catalog";
import { GATEWAYS } from "@/lib/billing/gateways";
import { LANGS } from "@/lib/i18n-shared";
import { OPEN_MIN_USD } from "@/lib/sale-auction-terms";
import { ACQ_EN } from "@/lib/acquire-copy";
import { DEVCOPY } from "@/lib/developers-copy";

const DESCRIPTION = "Acquire AXTO outright: the axto.io domain, full source code, seven live cloud AI apps (Legal AI, AI Chat, Clipper, Privacy Vault, Compliance Center, Security Analyst, Prompt Library), ten self-hosted products, the AXTO Connect real-time developer platform, Local Mode, worldwide payments and licensing, ten languages and the brand — with a buyer's guide, escrow option and an automatic administrator handover.";

export const metadata: Metadata = pageMeta({
  title: "Acquire AXTO — enterprise AI platform for sale by auction (offers from US$500,000)",
  description: DESCRIPTION,
  path: "/acquire",
  keywords: ["buy AI SaaS business", "AI platform for sale", "AI startup acquisition", "SaaS acquisition", "buy software company", "enterprise AI platform", "legal AI platform for sale", "turnkey AI business", "jual beli website AI", "akuisisi startup AI"],
});

export default function AcquirePage() {
  const apps: OfferApp[] = CLOUD_APPS.filter((a) => a.live).map((a) => ({ slug: a.slug, name: a.name, icon: a.icon, short: a.short, features: a.features.map((f) => f.title) }));
  const products: OfferProduct[] = PRODUCT_CATALOG.map((p) => ({ slug: p.slug, name: p.name, emoji: p.emoji, tagline: p.tagline }));
  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${SITE.name} — complete AI software business (acquisition)`,
    description: DESCRIPTION,
    url: absoluteUrl("/acquire"),
    brand: { "@type": "Brand", name: SITE.name },
    category: "Business / Software company acquisition",
    offers: {
      // Sold by auction (§34, REQUESTS 132): offers start at US$500,000 (the admin may add a weekly rise); a static
      // page states that floor, and the live minimum is on the page and in /api/acquire.
      "@type": "Offer", priceCurrency: "USD", priceSpecification: { "@type": "PriceSpecification", minPrice: OPEN_MIN_USD, priceCurrency: "USD" },
      availability: "https://schema.org/InStock", url: absoluteUrl("/acquire#bid"),
      seller: { "@id": `${SITE.url}/#organization` }, acceptedPaymentMethod: ["PayPal", "Cryptocurrency", "Bank transfer"].map((name) => ({ "@type": "PaymentMethod", name })),
    },
  };
  return (
    <>
      <JsonLd data={[product, faqJsonLd(ACQ_EN.faq.map(([q, a]) => ({ q, a }))), breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Acquire AXTO", path: "/acquire" }])]} />
      <AcquireOffer apps={apps} products={products}
        stats={{ apps: apps.length, selfHosted: products.length, langs: LANGS.length, gateways: GATEWAYS.length, jurisdictions: "200+", tests: "270+", transports: DEVCOPY.en.transports.length }} />
    </>
  );
}
