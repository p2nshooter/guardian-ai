/* /white-label — the AXTO white-label programme (docs/BUSINESS-MASTER-BLUEPRINT.md §4.1 D,
 * §5, §7.2): the whole AI platform under the partner's own brand, domain and two
 * languages, with Manage (AI provided, sold only inside white label). Until the
 * white-label portal ships (P5) the page takes applications. Live terms from Admin →
 * Programs; a noindex 404 while the programme is hidden. */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getData } from "@/lib/db";
import { getPrograms, publicPrograms } from "@/lib/programs";
import { PLANS, getPlanPrices } from "@/lib/plans";
import { WhiteLabelOffer } from "@/components/site/PartnerPages";
import { JsonLd } from "@/components/JsonLd";
import { HIDDEN_META, partnerJsonLd, partnerMeta } from "@/lib/partner-seo";
import { PARTNERS_EN, fillCopy, usd, whitelabelVars } from "@/lib/partners-copy";

async function load() {
  const db = getData();
  const [p, prices] = await Promise.all([getPrograms(db).catch(() => null), getPlanPrices(db).catch(() => null)]);
  return { w: p ? publicPrograms(p).whitelabel : null, business: prices?.business.yearly ?? PLANS.business.yearly };
}

export async function generateMetadata(): Promise<Metadata> {
  const { w } = await load();
  if (!w) return HIDDEN_META;
  return partnerMeta({
    title: "White-label AI platform — your brand, powered by AXTO",
    description: `Launch a complete AI platform under your own brand, domain and languages: cloud apps, self-hosted editions, licences and Manage AI for your clients. Entry ${usd(w.entryUsd)} for the first year, including ${usd(w.includedCreditUsd)} of wholesale credit.`,
    path: "/white-label",
    keywords: ["white label AI platform", "white label SaaS", "rebrandable AI software", "private label AI", "white label AI Indonesia", "platform AI white label"],
  });
}

export default async function WhiteLabelPage() {
  const { w, business } = await load();
  if (!w) notFound();
  const v = whitelabelVars(w, usd, business);
  return (
    <>
      <JsonLd data={partnerJsonLd({ name: "AXTO white-label programme", description: PARTNERS_EN.whitelabel.lead, path: "/white-label", faq: PARTNERS_EN.whitelabel.faq.map(([q, x]) => [q!, fillCopy(x!, v)]), offer: { name: "White-label entry (first year)", priceUsd: w.entryUsd } })} />
      <WhiteLabelOffer terms={w} businessYearlyUsd={business} />
    </>
  );
}
