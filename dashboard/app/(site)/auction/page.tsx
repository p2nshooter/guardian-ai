/* /auction — the licence auction (components/site/AuctionBoard, §26.5): every
 * two weeks, every package, ending Friday 07:00 WIB (the next auction starts at once), bidding from 25 % of the normal price.
 * SEO: metadata + JSON-LD (the page, its FAQ, breadcrumbs). The page itself is
 * static; the lots come from /api/auction in the browser. */
import type { Metadata } from "next";
import AuctionBoard from "@/components/site/AuctionBoard";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { absoluteUrl, SITE } from "@/lib/site";
import { AUC_EN } from "@/lib/auction-copy";

const DESCRIPTION = "Bid on AXTO self-hosted licences every two weeks: bidding opens at 25 % of the normal price, every auction ends on Friday at 07:00 WIB (UTC+7) and the next starts at once; the licence activates by itself once the winner pays.";

export const metadata: Metadata = pageMeta({
  title: "Licence auction — AXTO apps from 25 % of the price",
  description: DESCRIPTION,
  path: "/auction",
  keywords: ["software licence auction", "license auction", "self-hosted software deal", "AI security software discount", "AXTO auction", "lelang lisensi software", "lelang lisensi"],
});

export default function AuctionPage() {
  const page = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "AXTO licence auction",
    description: DESCRIPTION,
    url: absoluteUrl("/auction"),
    about: { "@id": `${SITE.url}/#organization` },
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
  };
  return (
    <>
      <JsonLd data={[page, faqJsonLd(AUC_EN.faq.map(([q, a]) => ({ q, a }))), breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Licence auction", path: "/auction" }])]} />
      <AuctionBoard />
    </>
  );
}
