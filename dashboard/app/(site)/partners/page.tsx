/* /partners — the hub of the partner programmes (docs/BUSINESS-MASTER-BLUEPRINT.md §2–§3):
 * affiliate, reseller and white label side by side, each only while it is shown
 * (Admin → Programs, all shown by default). With every programme hidden the hub is a
 * noindex 404. Rendered per request so a switch in Admin takes effect at once. */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getData } from "@/lib/db";
import { anyShown, getPrograms, publicPrograms } from "@/lib/programs";
import { PartnersHub } from "@/components/site/PartnerPages";
import { JsonLd } from "@/components/JsonLd";
import { HIDDEN_META, partnerJsonLd, partnerMeta } from "@/lib/partner-seo";
import { PARTNERS_EN } from "@/lib/partners-copy";

const DESCRIPTION = "AXTO partner programmes: earn a commission as an affiliate, resell AXTO at a wholesale discount from prepaid credit, or run the whole AI platform under your own brand with white label. Clear, published terms for every partner.";
const programs = () => getPrograms(getData()).catch(() => null);

export async function generateMetadata(): Promise<Metadata> {
  const p = await programs();
  if (!p || !anyShown(p)) return HIDDEN_META;
  return partnerMeta({ title: "AXTO partner programmes — affiliate, reseller and white label", description: DESCRIPTION, path: "/partners",
    keywords: ["AI partner program", "software reseller program", "white label AI platform", "affiliate program SaaS", "program mitra AI", "reseller software AI", "white label AI"] });
}

export default async function PartnersPage() {
  const p = await programs();
  if (!p || !anyShown(p)) notFound();
  return (
    <>
      <JsonLd data={partnerJsonLd({ name: "AXTO partner programmes", description: DESCRIPTION, path: "/partners", faq: PARTNERS_EN.hub.faq })} />
      <PartnersHub programs={publicPrograms(p)} />
    </>
  );
}
