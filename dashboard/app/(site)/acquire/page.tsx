/* /acquire — AXTO is for sale: the offer, the privacy guarantee, everything
 * included, the handover and a secure checkout (components/site/AcquireOffer). */
import type { Metadata } from "next";
import AcquireOffer, { type OfferApp, type OfferProduct } from "@/components/site/AcquireOffer";
import { pageMeta } from "@/lib/seo";
import { CLOUD_APPS } from "@/lib/apps";
import { PRODUCT_CATALOG } from "@/lib/product-catalog";
import { GATEWAYS } from "@/lib/billing/gateways";
import { LANGS } from "@/lib/i18n-shared";

export const metadata: Metadata = pageMeta({
  title: "Acquire AXTO — the whole AI software company is for sale",
  description: "Buy AXTO outright: domain, source code, seven live cloud apps, ten self-hosted products, payments and licensing, ten languages and the brand. Administrator access is granted the moment the payment is verified.",
  path: "/acquire",
});

export default function AcquirePage() {
  const apps: OfferApp[] = CLOUD_APPS.filter((a) => a.live).map((a) => ({ slug: a.slug, name: a.name, icon: a.icon, short: a.short, features: a.features.map((f) => f.title) }));
  const products: OfferProduct[] = PRODUCT_CATALOG.map((p) => ({ slug: p.slug, name: p.name, emoji: p.emoji, tagline: p.tagline }));
  return <AcquireOffer apps={apps} products={products}
    stats={{ apps: apps.length, selfHosted: products.length, langs: LANGS.length, gateways: GATEWAYS.length, jurisdictions: "200+", tests: "190+" }} />;
}
