/* "One Ecosystem" — every AXTO app on one screen, like the owner's "AXTO Digital
 * Global" picture (docs/BLUEPRINT-V4.md §18.3): the 7 cloud apps and the 10
 * self-hosted apps (Docker for Windows & Linux), each in its own colour. */
import Link from "next/link";
import AppIcon from "@/components/site/AppIcon";
import Reveal from "@/components/site/Reveal";
import ShTagline from "@/components/site/ShTagline";
import T from "@/components/site/T";
import { ECOSYSTEM_CLOUD, ECOSYSTEM_SELF, type EcoApp } from "@/lib/ecosystem";
import { PRODUCT_CATALOG } from "@/lib/product-catalog";

export function EcoTile({ app, i, wide = false }: { app: EcoApp; i: number; wide?: boolean }) {
  const tagline = PRODUCT_CATALOG.find((p) => p.slug === app.slug)?.tagline || "";
  return (
    <Reveal delay={(i % 5) * 50} className={`h-full ${wide ? "lg:col-span-2" : ""}`}>
      <Link href={app.href} className="crystal-card group flex h-full flex-col overflow-hidden" data-testid={`eco-${app.kind}-${app.slug}`}>
        <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${app.color}, transparent)` }} />
        <span className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl transition-opacity duration-500 group-hover:opacity-50" style={{ background: app.color }} />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/10" style={{ background: `${app.color}1f`, color: app.color, boxShadow: `0 0 24px -6px ${app.color}` }}>
          <AppIcon slug={app.slug} kind={app.kind} size={24} />
        </span>
        <h3 className="relative mt-4 text-[17px] font-bold text-white">{app.name}</h3>
        <p className="relative mt-1.5 flex-1 text-[13.5px] leading-relaxed text-slate-400">
          {app.kind === "cloud" ? <T k={`app.short.${app.slug}`} /> : <ShTagline slug={app.slug} fallback={tagline} />}
        </p>
        {app.kind === "self" ? (
          <span className="relative mt-4 self-start rounded-md border border-white/10 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Docker · Windows · Linux</span>
        ) : (
          <span className="relative mt-4 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400"><T k="lp.eco.inBrowser" /></span>
        )}
        <span className="relative mt-4 text-sm font-semibold text-brand-300 transition-colors group-hover:text-gold-200"><T k="app.learn" /></span>
      </Link>
    </Reveal>
  );
}

export default function Ecosystem() {
  return (
    <section id="ecosystem" className="palace py-20 sm:py-28" data-testid="home-ecosystem">
      <div className="palace-sky" /><div className="palace-stars" />
      <div className="container-page relative">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="eyebrow-palace">✦ <T k="lp.eco.eyebrow" /></span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl"><T k="lp.eco.h" /></h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-300"><T k="lp.eco.lead" /></p>
        </Reveal>

        <div className="mt-14 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white"><T k="lp.eco.cloud" /> <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 align-middle text-xs font-bold text-slate-300">{ECOSYSTEM_CLOUD.length}</span></h3>
            <p className="mt-1 text-sm text-slate-400"><T k="lp.eco.cloudSub" /></p>
          </div>
          <Link href="/apps" className="text-sm font-semibold text-brand-300 hover:text-gold-200"><T k="lp.eco.allCloud" /> →</Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ECOSYSTEM_CLOUD.map((a, i) => <EcoTile key={a.slug} app={a} i={i} wide={i === 0} />)}
        </div>

        <div className="gilded-rule my-14" />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white"><T k="lp.eco.self" /> <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 align-middle text-xs font-bold text-slate-300">{ECOSYSTEM_SELF.length}</span></h3>
            <p className="mt-1 text-sm text-slate-400"><T k="lp.eco.selfSub" /></p>
          </div>
          <Link href="/self-hosted" className="text-sm font-semibold text-brand-300 hover:text-gold-200"><T k="lp.eco.allSelf" /> →</Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ECOSYSTEM_SELF.map((a, i) => <EcoTile key={a.slug} app={a} i={i} />)}
        </div>
      </div>
    </section>
  );
}
