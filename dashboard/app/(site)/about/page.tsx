/* /about — who AXTO is, what the apps do and how the site is run. */
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LegalDoc } from "@/components/site/LegalDoc";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({ title: "About AXTO", description: `Who is behind ${SITE.name}, what the AI workspace does, how it protects your data and how the guides on this site are written.`, path: "/about" });
const UPDATED = "October 2026";

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])} />
      <LegalDoc title="About AXTO" updated={UPDATED} contactEmail={SITE.email}
        intro={`${SITE.name} — AI eXpert Toolkit Online — is an AI workspace for legal, security and business teams. It brings together focused apps that run on your own AI keys, keep your work encrypted and never use your content to train models.`}
        sections={[
          { h: "What AXTO does", p: ["AXTO combines several professional tools in one workspace: Legal AI with expert workspaces for contract review, research and drafting; a prompt library organized by profession; AI Studio for building and testing prompts; Clipper for capturing and summarizing sources; Privacy Vault for redacting sensitive text in the browser; a Compliance Center; and a Security Analyst.", "Teams can use the cloud apps at axto.io or run self-hosted editions on their own infrastructure, so that no data leaves their environment."] },
          { h: "How we think about data", p: ["The apps are built privacy-first. Requests use the AI provider keys you choose, saved work is encrypted per member, and Privacy Vault processes text locally in your browser. We do not sell personal data or use customer content for training. Details are in our privacy policy, security page and list of subprocessors."] },
          { h: "Guides and help", p: ["Alongside the apps, this site publishes guides that explain every menu and feature of each app, the self-hosted installation and how to use AI responsibly at work. They are written and reviewed by our team, kept up to date with each release and are free to read. Our standards are described in the editorial policy."] },
          { h: "Who runs AXTO", p: [`${SITE.legalName} develops and operates the platform. You can reach the team at ${SITE.email} for sales, support, security reports or press questions.`] },
          { h: "Advertising", p: ["Public pages of this website may show ads served by Google AdSense. Ads never appear inside the member portal or the admin area, and advertisers have no influence on our guides or our product."] },
        ]} />
    </>
  );
}
