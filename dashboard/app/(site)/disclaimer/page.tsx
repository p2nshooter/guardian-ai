/* /disclaimer — limits of the guides and of AI output. */
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LegalDoc } from "@/components/site/LegalDoc";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({ title: "Disclaimer", description: `The limits of ${SITE.name}'s guides and of AI-generated output: not legal advice, verify before relying, and keep human review in the loop.`, path: "/disclaimer" });
const UPDATED = "October 2026";

export default function DisclaimerPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Disclaimer", path: "/disclaimer" }])} />
      <LegalDoc title="Disclaimer" updated={UPDATED} contactEmail={SITE.email}
        intro={`${SITE.name} provides software tools and publishes guides about using them. This page explains the limits of both.`}
        sections={[
          { h: "Not legal or professional advice", p: ["Legal AI and the other apps help professionals work faster, but they do not provide legal, tax, financial, security or other professional advice, and using them does not create a lawyer–client or advisory relationship. Decisions remain the responsibility of qualified people who review the output."] },
          { h: "AI output can be wrong", p: ["AI models can produce inaccurate, incomplete or outdated results, including invented citations. Always verify important output against primary sources, check citations and apply your own professional judgment before relying on it or sharing it."] },
          { h: "Guides are general information", p: ["The guides on this site describe features and good practice in general terms. Features change between releases; the in-app documentation for your version takes precedence."] },
          { h: "Security", p: ["Security guidance and the Security Analyst are aids, not a guarantee that a system is secure or a substitute for a professional audit."] },
          { h: "Third parties", p: ["When you connect your own AI provider, your requests are processed under that provider's terms. We are not responsible for third-party services, and trademarks belong to their owners."] },
          { h: "Advertising", p: ["Ads on public pages are served by Google AdSense. We do not choose individual advertisers and are not responsible for their offers."] },
        ]} />
    </>
  );
}
