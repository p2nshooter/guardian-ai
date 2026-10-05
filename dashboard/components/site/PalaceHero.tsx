/* Home hero — "One ecosystem. Endless possibilities." (owner's AXTO Digital
 * Global picture, docs/BLUEPRINT-V4.md §18.3): obsidian sky, the turning globe
 * and the ten self-hosted apps floating around it in their own colours. */
import Link from "next/link";
import { Cpu, Globe2, KeyRound, Languages, MonitorSmartphone } from "lucide-react";
import AppIcon from "@/components/site/AppIcon";
import PalaceGlobe from "@/components/site/PalaceGlobe";
import T from "@/components/site/T";
import { ECOSYSTEM_COUNT, ECOSYSTEM_SELF } from "@/lib/ecosystem";

const PILLARS = [
  { icon: KeyRound, k: "lp.hero.p1" },
  { icon: MonitorSmartphone, k: "lp.hero.p2" },
  { icon: Cpu, k: "lp.hero.p3" },
  { icon: Languages, k: "lp.hero.p4" },
  { icon: Globe2, k: "lp.hero.p5" },
];

export default function PalaceHero() {
  return (
    <section className="palace" data-testid="home-hero">
      <div className="palace-sky" /><div className="palace-stars" /><div className="palace-floor" />
      <div className="container-page relative grid items-center gap-10 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div>
          <span className="eyebrow-palace palace-rise">✦ AXTO Digital Global</span>
          <h1 className="palace-rise mt-6 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.2rem]" style={{ ["--i" as string]: 1 }}>
            <T k="lp.hero.h1a" /> <span className="sapphire-text"><T k="lp.hero.h1b" /></span>
          </h1>
          <p className="palace-rise mt-6 max-w-xl text-lg leading-relaxed text-slate-300" style={{ ["--i" as string]: 2 }}><T k="lp.hero.sub" /></p>
          <div className="palace-rise mt-8 flex flex-wrap gap-3" style={{ ["--i" as string]: 3 }}>
            <Link href="/register" className="btn-royal btn-lg"><T k="site.getstarted" /></Link>
            <Link href="#ecosystem" className="btn-crystal btn-lg" data-testid="hero-explore"><T k="lp.hero.explore" /> <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{ECOSYSTEM_COUNT}</span></Link>
          </div>
          <ul className="palace-rise mt-10 grid max-w-xl grid-cols-1 gap-x-6 gap-y-3 text-sm text-slate-300 sm:grid-cols-2" style={{ ["--i" as string]: 4 }}>
            {PILLARS.map(({ icon: Icon, k }) => (
              <li key={k} className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gold-400/25 bg-gold-400/10 text-gold-200"><Icon size={15} strokeWidth={1.8} aria-hidden="true" /></span>
                <T k={k} />
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[540px]">
          <PalaceGlobe className="absolute inset-[9%] h-[82%] w-[82%]" />
          <ul aria-label="AXTO self-hosted apps" className="absolute inset-0">
            {ECOSYSTEM_SELF.map((a, i) => {
              const ang = ((-90 + i * 36) * Math.PI) / 180;
              const left = 50 + 46 * Math.cos(ang);
              const top = 50 + 46 * Math.sin(ang);
              return (
                <li key={a.slug} className="absolute" style={{ left: `${left.toFixed(2)}%`, top: `${top.toFixed(2)}%`, transform: "translate(-50%,-50%)" }}>
                  <Link href={a.href} title={a.name} className="palace-float group flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-ink-900/80 no-underline backdrop-blur transition-colors duration-300 hover:border-gold-300/70 hover:bg-ink-800 sm:h-12 sm:w-12"
                    style={{ ["--i" as string]: i, color: a.color, boxShadow: `0 0 26px -6px ${a.color}` }}>
                    <AppIcon slug={a.slug} kind="self" size={20} />
                    <span className="sr-only">{a.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
