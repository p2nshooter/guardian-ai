/* /resellers — the AXTO reseller programme (docs/BUSINESS-MASTER-BLUEPRINT.md §4.1 C,
 * §7.2): sell AXTO under the AXTO brand at a wholesale discount from prepaid credit.
 * Until the reseller portal ships (P4) the page takes applications. Live terms from
 * Admin → Programs; a noindex 404 while the programme is hidden. */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getData } from "@/lib/db";
import { getPrograms, publicPrograms } from "@/lib/programs";
import { PLANS, getPlanPrices } from "@/lib/plans";
import { ResellerOffer } from "@/components/site/PartnerPages";
import { JsonLd } from "@/components/JsonLd";
import { HIDDEN_META, partnerJsonLd, partnerMeta } from "@/lib/partner-seo";
import { PARTNERS_EN, fillCopy, maxTier, resellerVars, usd } from "@/lib/partners-copy";

async function load() {
  const db = getData();
  const [p, prices] = await Promise.all([getPrograms(db).catch(() => null), getPlanPrices(db).catch(() => null)]);
  return { r: p ? publicPrograms(p).reseller : null, pro: prices?.pro.monthly ?? PLANS.pro.monthly };
}

export async function generateMetadata(): Promise<Metadata> {
  const { r } = await load();
  if (!r) return HIDDEN_META;
  return partnerMeta({
    title: `Become an AXTO reseller — up to ${maxTier(r.tiers)}% off list price`,
    description: `Resell AXTO's AI platform to your clients: a wholesale discount of up to ${maxTier(r.tiers)}% from prepaid credit, entry ${usd(r.entryUsd)} including ${usd(r.includedCreditUsd)} of credit, your own prices and your own clients.`,
    path: "/resellers",
    keywords: ["AI software reseller program", "SaaS reseller program", "become an AI reseller", "wholesale AI licences", "reseller software AI", "program reseller"],
  });
}

export default async function ResellersPage() {
  const { r, pro } = await load();
  if (!r) notFound();
  const v = resellerVars(r, usd, pro);
  return (
    <>
      <JsonLd data={partnerJsonLd({ name: "AXTO reseller programme", description: PARTNERS_EN.reseller.lead, path: "/resellers", faq: PARTNERS_EN.reseller.faq.map(([q, x]) => [q!, fillCopy(x!, v)]), offer: { name: "Reseller entry", priceUsd: r.entryUsd } })} />
      <ResellerOffer terms={r} proMonthlyUsd={pro} />
    </>
  );
}
