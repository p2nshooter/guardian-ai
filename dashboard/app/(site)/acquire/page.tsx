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
import { DEFAULT_PRICE_USD } from "@/lib/acquisition";
import { ACQ } from "@/lib/acquire-copy";

const DESCRIPTION = "Buy AXTO outright: the axto.io domain, full source code, seven live cloud AI apps (Legal AI, AI Studio, Clipper, Privacy Vault, Compliance Center, Security Analyst, Prompt Library), ten self-hosted products, worldwide payments and licensing, ten languages and the brand. Administrator access is granted the moment the payment is verified.";

export const metadata: Metadata = pageMeta({
  title: "Acquire AXTO — the whole AI software company is for sale",
  description: DESCRIPTION,
  path: "/acquire",
  keywords: ["buy AI SaaS business", "AI startup for sale", "SaaS acquisition", "buy software company", "AI platform for sale", "turnkey AI business", "jual beli website AI", "akuisisi startup AI"],
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
      "@type": "Offer", price: DEFAULT_PRICE_USD.toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock", url: absoluteUrl("/acquire#checkout"),
      seller: { "@id": `${SITE.url}/#organization` }, acceptedPaymentMethod: ["PayPal", "Cryptocurrency", "Bank transfer"].map((name) => ({ "@type": "PaymentMethod", name })),
    },
  };
  return (
    <>
      <JsonLd data={[product, faqJsonLd(ACQ.en.faq.map(([q, a]) => ({ q, a }))), breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Acquire AXTO", path: "/acquire" }])]} />
      <AcquireOffer apps={apps} products={products}
        stats={{ apps: apps.length, selfHosted: products.length, langs: LANGS.length, gateways: GATEWAYS.length, jurisdictions: "200+", tests: "190+" }} />
    </>
  );
}
