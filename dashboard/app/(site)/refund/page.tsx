/* /refund — Refund Policy. */
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LegalDoc } from "@/components/site/LegalDoc";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({ title: "Refund Policy", description: `${SITE.name}'s refund policy for subscriptions and lifetime licences.`, path: "/refund" });
const UPDATED = "September 2026";

export default function RefundPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Refund Policy", path: "/refund" }])} />
      <LegalDoc title="Refund Policy" updated={UPDATED} contactEmail={SITE.email}
        intro={`We want you to be satisfied with ${SITE.name}. This policy explains when refunds are available for subscriptions and lifetime licences.`}
        sections={[
          { h: "Try before you pay", p: ["Every account includes a free tier so you can evaluate the platform (Basic prompts and the essentials) before purchasing. We recommend testing on the free tier first."] },
          { h: "Subscriptions", p: ["Monthly and yearly subscriptions can be cancelled anytime; cancellation stops the next renewal and you keep access until the end of the paid period. If you were charged in error or experienced a problem that prevented use, contact us within 14 days of the charge and we will work with you on a fair resolution, including a refund where appropriate."] },
          { h: "Lifetime self-hosted licences", p: ["Because a lifetime licence delivers the software and its licence key immediately, it is generally non-refundable once the key has been issued and downloaded. If you have not yet activated or downloaded the software, contact us within 14 days of purchase for a refund.", "If the software does not work as described and we cannot resolve it, we will provide a refund."] },
          { h: "Third-party AI costs", p: [`${SITE.name} runs on your own AI provider keys (BYOX). Any fees charged by your AI or infrastructure providers are between you and them and are not refundable by us.`] },
          { h: "How to request a refund", p: [`Email ${SITE.email} from your account address with your order details and the reason. We aim to respond within a few business days.`] },
          { h: "Chargebacks", p: ["Please contact us first — we can usually resolve issues faster than a chargeback. Fraudulent chargebacks may result in account termination."] },
        ]} />
    </>
  );
}
