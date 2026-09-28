/* /legal-ai — hub of every legal order Legal AI covers (links to each country page). */
import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { COUNTRIES, SUBDIVISIONS, flag } from "@/lib/legal/jurisdictions";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: `Legal AI for ${COUNTRIES.length} jurisdictions — every country, state and province`,
  description: "Choose your country, state or province: AXTO Legal AI analyses cases, researches the law, reviews contracts and drafts court documents under local law — with sources and current-law checks.",
  path: "/legal-ai",
  keywords: ["legal AI by country", "AI lawyer", "international legal research AI", "AI legal assistant"],
});

const REGIONS: [string, string][] = [["supranational", "International & EU"], ["asia", "Asia"], ["middle-east", "Middle East"], ["europe", "Europe"], ["americas", "Americas"], ["africa", "Africa"], ["oceania", "Oceania"]];

export default function LegalHub() {
  const subCount = Object.values(SUBDIVISIONS).reduce((n, l) => n + l.length, 0);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Legal AI", path: "/apps/legal" }, { name: "By jurisdiction", path: "/legal-ai" }])} />
      <section className="surface-ink relative overflow-hidden py-16">
        <div className="glow pointer-events-none absolute inset-0" />
        <div className="container-page relative">
          <h1 className="h-display max-w-4xl text-white">Legal AI for {COUNTRIES.length} legal orders and {subCount} states, provinces & special regimes</h1>
          <p className="lead mt-5 max-w-3xl text-slate-300">Pick the jurisdiction — Legal AI applies its hierarchy of laws, checks recent changes, and cites the official sources.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/register?plan=pro&next=%2Fapp%2Flegal" className="btn-primary btn-lg">Start now →</Link><Link href="/apps/legal" className="btn-secondary btn-lg">How Legal AI works</Link></div>
        </div>
      </section>
      <section className="py-14">
        <div className="container-page space-y-10">
          {REGIONS.map(([id, name]) => {
            const list = COUNTRIES.filter((c) => c.region === id).sort((a, b) => a.name.localeCompare(b.name));
            return (
              <div key={id}>
                <h2 className="text-xl font-bold">{name}</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {list.map((c) => (
                    <Link key={c.code} href={`/legal-ai/${c.code.toLowerCase()}`} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm no-underline hover:border-brand-300 hover:bg-brand-50/40">
                      <span aria-hidden="true">{flag(c.code)}</span><span className="flex-1 truncate text-slate-800">{c.name}</span>
                      {SUBDIVISIONS[c.code]?.length ? <span className="text-xs text-slate-400">{SUBDIVISIONS[c.code].length}</span> : null}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
