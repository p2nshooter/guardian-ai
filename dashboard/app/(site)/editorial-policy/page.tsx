/* /editorial-policy — how the guides on axto.io are written and kept current. */
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LegalDoc } from "@/components/site/LegalDoc";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({ title: "Editorial Policy", description: `How ${SITE.name} researches, writes, reviews and corrects the guides and help articles published on this site.`, path: "/editorial-policy" });
const UPDATED = "October 2026";

export default function EditorialPolicyPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Editorial Policy", path: "/editorial-policy" }])} />
      <LegalDoc title="Editorial Policy" updated={UPDATED} contactEmail={SITE.email}
        intro="Our guides and help articles explain how each AXTO app works and how to use AI responsibly at work. These are the standards behind them."
        sections={[
          { h: "Our standards", p: ["Useful first: each guide answers a question users actually ask and shows the steps to do it.", "Accurate: instructions are checked against the current release, and screenshots and menu names are kept in step with the product.", "Honest: we explain limits, risks and when human review is essential, especially for legal and security work.", "Plain language: technical terms are explained the first time they appear."] },
          { h: "Sources", p: ["The product itself and its release notes; official documentation from AI providers and standards bodies; and published laws, regulations and guidance where a guide discusses legal or compliance topics."] },
          { h: "Review and updates", p: ["Guides are written by our team and reviewed before publication. They are updated with each release that changes a feature, and the date of the last update is shown on the page."] },
          { h: "Corrections", p: [`If a guide is wrong or out of date, tell us at ${SITE.email}. We correct errors promptly.`] },
          { h: "Independence", p: ["Public pages may carry ads served by Google AdSense, kept separate from our guides. Advertisers and partners have no influence on what we write."] },
        ]} />
    </>
  );
}
