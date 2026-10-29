/* /affiliate — the AXTO affiliate programme (docs/BUSINESS-MASTER-BLUEPRINT.md §4.1 B,
 * §7.1): free to join, a commission on every paid order of the customers you refer.
 * Live terms from Admin → Programs; a noindex 404 while the programme is hidden. */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getData } from "@/lib/db";
import { getPrograms, publicPrograms } from "@/lib/programs";
import { AffiliateOffer } from "@/components/site/PartnerPages";
import { JsonLd } from "@/components/JsonLd";
import { HIDDEN_META, partnerJsonLd, partnerMeta } from "@/lib/partner-seo";
import { PARTNERS_EN, affiliateVars, fillCopy, usd } from "@/lib/partners-copy";

const terms = () => getPrograms(getData()).then((p) => publicPrograms(p).affiliate).catch(() => null);

export async function generateMetadata(): Promise<Metadata> {
  const a = await terms();
  if (!a) return HIDDEN_META;
  return partnerMeta({
    title: `AXTO affiliate programme — earn ${a.commissionPct}% for ${a.months} months`,
    description: `Join the AXTO affiliate programme for free: ${a.commissionPct}% of every paid order of the customers you refer for ${a.months} months, ${a.partnerFeePct}% of a referred partner's entry fee, monthly payouts by PayPal, USDT or bank wire.`,
    path: "/affiliate",
    keywords: ["AI affiliate program", "SaaS affiliate program", "recurring commission affiliate", "affiliate program high commission", "program afiliasi AI", "afiliasi SaaS"],
  });
}

export default async function AffiliatePage() {
  const a = await terms();
  if (!a) notFound();
  const v = affiliateVars(a, usd);
  return (
    <>
      <JsonLd data={partnerJsonLd({ name: "AXTO affiliate programme", description: fillCopy(PARTNERS_EN.affiliate.lead, v), path: "/affiliate", faq: PARTNERS_EN.affiliate.faq.map(([q, x]) => [q!, fillCopy(x!, v)]) })} />
      <AffiliateOffer terms={a} />
    </>
  );
}
