/* /privacy — Privacy Policy. */
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LegalDoc } from "@/components/site/LegalDoc";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({ title: "Privacy Policy", description: `How ${SITE.name} handles your data — encrypted, on your own AI keys, never used for training.`, path: "/privacy" });
const UPDATED = "September 2026";

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Privacy Policy", path: "/privacy" }])} />
      <LegalDoc title="Privacy Policy" updated={UPDATED} contactEmail={SITE.email}
        intro={`${SITE.legalName} is built privacy-first: the apps run on your own AI keys, your work is encrypted per member, and we never use your content to train models. This policy explains what we collect and why.`}
        sections={[
          { h: "What we collect", p: ["Account data: your email, name and authentication data so you can sign in.", "Billing data: plan, order and payment status. Card and bank details are handled by the payment method you choose; we store only what is needed to confirm an order.", "Usage data: minimal operational metrics (e.g. request counts and storage totals) to enforce plan limits and keep the Services running.", "Your work: the content you create in the apps, stored encrypted so you can retrieve it."] },
          { h: "What we do NOT do", p: ["We do not use your content to train any AI model. We do not sell your personal data. Your AI provider keys are stored encrypted and are used only to run your own requests — they are never shared.", "Privacy Vault runs entirely in your browser: the original text you redact is never uploaded."] },
          { h: "How your work is protected", p: ["Your saved work is encrypted at rest with a key derived per member (AES-256-GCM). Requests are made with your own AI credentials, so your prompts and data go to the provider you chose, under their terms.", "Self-hosted editions keep all data on your own infrastructure — nothing is sent to us."] },
          { h: "Third parties", p: ["We use infrastructure providers (e.g. Cloudflare) to host the Services, and the AI and payment providers you choose. Each processes data only to provide their service. We do not send your content to any AI provider other than the one your key belongs to."] },
          { h: "Data retention", p: ["We keep account and billing records while your account is active and as required by law. You can delete your saved work at any time from within the apps. On account deletion we remove your personal data except records we must keep for legal or accounting reasons."] },
          { h: "Your rights", p: ["Depending on your jurisdiction (including the EU GDPR and Indonesia's UU PDP), you may have rights to access, correct, export or delete your personal data. Contact us to exercise them."] },
          { h: "Cookies", p: ["We use essential cookies for sign-in and to remember your language and preferences. Public pages may show ads that use cookies; you can control these in your browser."] },
          { h: "Children", p: ["The Services are not directed to children under the age required to consent to data processing in their country."] },
          { h: "Changes", p: ["We may update this policy; material changes will be posted here with a new date."] },
        ]} />
    </>
  );
}
