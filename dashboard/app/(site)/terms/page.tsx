/* /terms — Terms of Service. */
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LegalDoc } from "@/components/site/LegalDoc";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({ title: "Terms of Service", description: `The terms for using ${SITE.name}: accounts, your own AI keys, acceptable use, plans, billing and self-hosted licences, your content, liability and termination.`, path: "/terms" });
const UPDATED = "September 2026";

export default function TermsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Terms of Service", path: "/terms" }])} />
      <LegalDoc title="Terms of Service" updated={UPDATED} contactEmail={SITE.email}
        intro={`These Terms of Service ("Terms") govern your access to and use of ${SITE.legalName}'s websites, cloud applications and self-hosted software (together, the "Services"). By creating an account or using the Services, you agree to these Terms.`}
        sections={[
          { h: "1. Accounts", p: ["You must provide accurate information and keep your credentials secure. You are responsible for activity under your account. You must be legally able to enter a contract in your jurisdiction."] },
          { h: "2. Bring-your-own-key (BYOX)", p: [`The Services run on AI credentials you provide (your own API keys, models or endpoints). You are responsible for your use of those third-party providers and for any fees they charge. ${SITE.name} does not resell third-party AI and is not responsible for third-party availability, output or billing.`, "You must not use the Services to violate any third-party provider's terms."] },
          { h: "3. Acceptable use", p: ["You agree not to use the Services to break the law, infringe others' rights, attack or probe systems you are not authorised to test, generate malware or abusive content, or attempt to disrupt or reverse-engineer the Services beyond what the law permits.", "Security tooling in the Services (e.g. Security Analyst) is provided for defensive and authorised use only."] },
          { h: "4. Plans, billing and licences", p: ["Paid plans and lifetime self-hosted licences are billed as described at checkout. Subscription plans renew for the period selected unless cancelled before renewal. Lifetime licences grant use of the licensed edition under the licence terms delivered with it.", "Prices may change for future terms; your current term is not affected."] },
          { h: "5. Your content", p: ["You retain all rights to the content and data you submit. You grant us only the limited rights needed to operate the Services for you (for example, to store your encrypted work so you can retrieve it). We do not use your content to train models.", "You are responsible for having the rights to the content you process."] },
          { h: "6. Intellectual property", p: [`The Services, software and brand are owned by ${SITE.legalName} and protected by law. Except for rights expressly granted, no licence is transferred to you. You may not copy, resell or redistribute the software except as a licence expressly allows.`] },
          { h: "7. Disclaimers", p: ["The Services are provided “as is” without warranties of any kind to the extent permitted by law. AI output can be inaccurate; you are responsible for reviewing it before relying on it. The Services do not provide legal, financial, medical or other professional advice."] },
          { h: "8. Limitation of liability", p: ["To the maximum extent permitted by law, our aggregate liability arising from the Services is limited to the amount you paid us in the 12 months before the claim. We are not liable for indirect, incidental or consequential damages."] },
          { h: "9. Termination", p: ["You may stop using the Services at any time. We may suspend or terminate access for breach of these Terms or to comply with the law. On termination, sections that by their nature should survive will survive."] },
          { h: "10. Changes", p: ["We may update these Terms; material changes will be posted here with a new date. Continued use after changes means you accept them."] },
        ]} />
    </>
  );
}
