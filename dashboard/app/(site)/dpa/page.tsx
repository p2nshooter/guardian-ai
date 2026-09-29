/* /dpa — Data Processing Addendum (GDPR Art. 28 / UU PDP): the terms under which
 * AXTO processes personal data on a customer's behalf. Static, indexable. */
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LegalDoc } from "@/components/site/LegalDoc";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({ title: "Data Processing Addendum (DPA)", description: `How ${SITE.name} processes personal data on your behalf — roles, security measures, sub-processors, transfers and your rights (GDPR Art. 28, UU PDP).`, path: "/dpa", keywords: ["AXTO DPA", "data processing agreement", "GDPR Article 28", "UU PDP", "sub-processors"] });
const UPDATED = "September 2026";

export default function DpaPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "DPA", path: "/dpa" }])} />
      <LegalDoc title="Data Processing Addendum" updated={UPDATED} contactEmail={SITE.email}
        intro={`This Data Processing Addendum ("DPA") forms part of the ${SITE.name} Terms of Service. It applies when you (the "Customer") use the cloud apps to process personal data, and describes how ${SITE.legalName} ("we") processes that data on your behalf. Self-hosted editions run entirely on your infrastructure, so we process none of their data.`}
        sections={[
          { h: "1. Roles", p: ["For the content you create or upload in the cloud apps (documents, matters, chats, reports), you are the controller and we are your processor. For your account and billing data we act as an independent controller, as described in the Privacy Policy.", "Requests you run with your own AI key (BYOX) are sent to the AI provider you chose, under your own agreement with that provider; that provider is not our sub-processor."] },
          { h: "2. Scope and instructions", p: ["We process personal data only to provide the Services you use, following your documented instructions — your use and configuration of the Services is that instruction. We do not use your content to train AI models, and we do not sell it.", "Categories of data are whatever you choose to put into the apps; data subjects are the people that content relates to."] },
          { h: "3. Security measures", p: ["Saved work is encrypted at rest with AES-256-GCM using a key derived per member; payment and platform secrets are encrypted separately and never shown again after entry. All traffic uses TLS with HSTS.", "Access to production systems is limited to authorised administrators, and account, payment, licence and administrative actions are recorded in an audit log.", "Privacy Vault detects and redacts personal data inside your browser, so the original text is never uploaded."] },
          { h: "4. Personnel", p: ["Anyone we authorise to process your data is bound by confidentiality obligations."] },
          { h: "5. Sub-processors", p: ["We use the sub-processors listed on the Sub-processors page (/subprocessors) and remain responsible for them. We will update that page before adding or replacing a sub-processor; you may object on reasonable data-protection grounds by contacting us."] },
          { h: "6. International transfers", p: ["Our infrastructure provider operates a global network. Where personal data is transferred out of the EEA, the UK or another jurisdiction with transfer rules, we rely on the transfer mechanisms in our providers' data processing terms, such as the EU Standard Contractual Clauses."] },
          { h: "7. Assistance and data-subject requests", p: ["You can access, export, correct and delete your saved work yourself at any time in My files and in each app. We will reasonably assist you with data-subject requests and data-protection impact assessments that relate to the Services."] },
          { h: "8. Personal-data breaches", p: ["We will notify you without undue delay after becoming aware of a personal-data breach affecting your data, with the information you reasonably need to meet your own obligations."] },
          { h: "9. Deletion and return", p: ["You may export your data at any time. When your account is deleted we delete your saved work, except records we must keep by law (for example invoices)."] },
          { h: "10. Audits", p: ["On reasonable written request we will provide the information necessary to demonstrate compliance with this DPA. For a countersigned copy of this DPA, contact us."] },
        ]} />
      <p className="container-page max-w-3xl pb-14 text-sm text-slate-500">See also: <Link href="/subprocessors">Sub-processors</Link> · <Link href="/privacy">Privacy Policy</Link> · <Link href="/security">Security</Link> · <Link href="/terms">Terms</Link></p>
    </>
  );
}
