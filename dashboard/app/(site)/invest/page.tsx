/* /invest — the AXTO investor round (components/site/InvestOffer): a monthly
 * share of every paid AXTO order until a full acquisition, when the capital is
 * returned. AXTO only — xaa.es raises separately. SEO: metadata + JSON-LD (FAQ,
 * breadcrumbs, the page). No bank details or other private data on the page. */
import type { Metadata } from "next";
import InvestOffer from "@/components/site/InvestOffer";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { absoluteUrl, SITE } from "@/lib/site";
import { INV_EN } from "@/lib/invest-copy";

const DESCRIPTION = "Invest in AXTO, the AI platform behind Legal AI, AI Studio, Clipper and a self-hosted product line for Linux and Windows: a proportional monthly share of every paid AXTO order, from the day your capital is verified until a full acquisition, when the capital is returned. Terms, risk notice and a private investor statement.";

export const metadata: Metadata = pageMeta({
  title: "Invest in AXTO — revenue-sharing investor round",
  description: DESCRIPTION,
  path: "/invest",
  keywords: ["invest in AI startup", "AI company investment", "revenue sharing investment", "revenue-based investment", "SaaS investment opportunity", "AXTO investor round", "investasi startup AI", "bagi hasil pendapatan"],
});

export default function InvestPage() {
  const page = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Invest in AXTO",
    description: DESCRIPTION,
    url: absoluteUrl("/invest"),
    about: { "@id": `${SITE.url}/#organization` },
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
  };
  return (
    <>
      <JsonLd data={[page, faqJsonLd(INV_EN.faq.map(([q, a]) => ({ q, a }))), breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Invest in AXTO", path: "/invest" }])]} />
      <InvestOffer />
    </>
  );
}
