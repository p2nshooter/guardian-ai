/* /auction — the licence auction in public (docs/BLUEPRINT-V4.md §26.5, §27.4):
 * the running auction of every package with a live countdown to Friday 07:00
 * WIB (the next one starts the moment it ends), every lot (normal
 * price, current or opening bid, bids, the leader as a masked name), how it
 * works, the rules, recent winners with the name they chose, the last
 * auction's results and the questions people ask. Bidding happens in the
 * member portal (/app/auction). English renders statically (SEO); the other
 * nine languages load on demand. Motion is decorative and off under
 * prefers-reduced-motion. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import Reveal from "@/components/site/Reveal";
import { AUCTION_DEFAULTS } from "@/lib/auction-terms";
import { Countdown, LotCard, LotFilters, WinnersList, fill, useAucCopy, useLotFilter, type Board } from "@/components/site/auction-ui";

export default function AuctionBoard() {
  const { t, money, when } = useAucCopy();
  const [board, setBoard] = useState<Board | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    api<Board>("/api/auction").then((r) => { if (r.ok) setBoard(r.data); });
    api<{ user: unknown }>("/api/auth/me?optional=1").then((r) => setSignedIn(!!(r.ok && r.data.user)));
  }, []);
  const s = board || { ...AUCTION_DEFAULTS, cycleEnd: "", nextCycleEnd: "", lots: [], upcoming: 0, last: [], winners: [] };
  const f = useLotFilter(s.lots);
  const vars = { open: `${s.openPct} %`, step: `${s.stepPct} %`, snipe: s.snipeMinutes, hours: s.payHours };
  const cta = signedIn ? "/app/auction" : "/login?redirect=%2Fapp%2Fauction";

  return (
    <div data-testid="auction">
      {/* ── Hero ── */}
      <section className="acq-hero relative isolate overflow-hidden border-b border-slate-800 bg-ink-950 py-20 text-white sm:py-24">
        <div className="acq-aurora pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="acq-grid pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
        <span className="acq-orb acq-orb-a pointer-events-none absolute -z-10" aria-hidden="true" />
        <div className="container-page relative grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="anim-in inline-flex items-center gap-2 rounded-full border border-gold-300/40 bg-gold-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200">🔨 {t.eyebrow}</p>
            <h1 className="anim-in anim-delay-1 mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">{t.title}</h1>
            <p className="anim-in anim-delay-2 mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">{fill(t.lead, vars)}</p>
            <div className="anim-in anim-delay-3 mt-9 flex flex-wrap gap-3">
              <Link href={cta} prefetch={false} className="acq-cta anim-pulse-ring rounded-xl bg-gradient-to-r from-gold-300 to-amber-400 px-7 py-4 text-base font-extrabold text-ink-950 no-underline shadow-lg shadow-amber-500/20 transition hover:brightness-110" data-testid="auction-cta">{signedIn ? t.ctaMember : t.cta} →</Link>
              <a href="#lots" className="rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-base font-semibold text-white no-underline backdrop-blur transition hover:bg-white/10">{t.lot.current} ↓</a>
            </div>
          </div>
          <Reveal className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm sm:p-7">
            {s.enabled ? (
              <>
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-200">{t.endsIn}</h2>
                <div className="mt-4 text-2xl">{s.cycleEnd ? <Countdown to={s.cycleEnd} dark testid="auction-countdown" /> : null}</div>
                <p className="mt-3 text-sm text-slate-300">{s.cycleEnd ? fill(t.endsAt, { date: when(s.cycleEnd) }) : ""}</p>
                <p className="mt-1 text-xs text-slate-400">{s.nextCycleEnd ? fill(t.nextAuction, { date: when(s.nextCycleEnd) }) : ""}</p>
                {s.upcoming ? <p className="mt-2 text-xs font-semibold text-gold-200" data-testid="auction-next-ready">{fill(t.nextReady, { n: s.upcoming })}</p> : null}
              </>
            ) : (
              <><h2 className="text-lg font-bold text-white">{t.offT}</h2><p className="mt-2 text-sm text-slate-300">{t.offB}</p></>
            )}
          </Reveal>
        </div>
      </section>

      {/* ── Lots ── */}
      <section id="lots" className="scroll-mt-20 py-16">
        <div className="container-page">
          {s.lots.length ? <LotFilters f={f} total={s.lots.length} /> : null}
          {s.lots.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="auction-lots">
              {f.shown.map((l, i) => (
                <Reveal key={l.id} delay={Math.min(i, 5) * 60}>
                  <LotCard lot={l}>
                    {l.status === "open" ? <Link href={cta} prefetch={false} className="btn-primary w-full justify-center">{signedIn ? t.ctaMember : t.cta}</Link> : null}
                  </LotCard>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center" data-testid="auction-empty">
              <h2 className="text-xl font-bold text-slate-900">{board ? t.emptyT : "…"}</h2>
              <p className="mt-2 text-slate-600">{t.emptyB}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="container-page">
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t.howTitle}</h2></Reveal>
          <ol className="mt-10 grid gap-5 md:grid-cols-5">
            {t.how.map(([title, body], i) => (
              <Reveal key={i} delay={i * 70} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-950 text-sm font-black text-gold-300">{i + 1}</span>
                <h3 className="mt-3 font-bold text-slate-900">{fill(title, vars)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{fill(body, vars)}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Winners + last results ── */}
      <section className="py-16">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-2xl font-extrabold text-slate-900">{t.winnersTitle}</h2>
            <p className="mt-1 text-slate-600">{t.winnersLead}</p>
            <div className="mt-5"><WinnersList winners={s.winners} /></div>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="text-2xl font-extrabold text-slate-900">{t.rulesTitle}</h2>
            <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-slate-700">
              {t.rules.map((r, i) => <li key={i} className="flex gap-2"><span className="text-gold-600" aria-hidden="true">◆</span>{fill(r, vars)}</li>)}
            </ul>
            {s.last.length ? (
              <>
                <h3 className="mt-8 text-lg font-bold text-slate-900">{t.lastTitle}</h3>
                <ul className="mt-3 space-y-2 text-sm" data-testid="auction-last">
                  {s.last.map((l) => (
                    <li key={l.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5">
                      <span className="text-slate-700">{l.title}</span>
                      <span className="font-semibold text-slate-900">{l.status === "sold" ? `${l.winnerName} · ${money(l.winnerUsd)}` : l.status === "awaiting_payment" ? fill(t.lot.awaiting, { name: l.winnerName || "—" }) : t.lot.unsold}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* ── Questions ── */}
      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="container-page max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900">{t.faqTitle}</h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">
            {t.faq.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="cursor-pointer list-none font-semibold text-slate-900 marker:hidden">{q}<span className="float-right text-slate-400 transition group-open:rotate-45 motion-reduce:transition-none" aria-hidden="true">+</span></summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center"><Link href={cta} prefetch={false} className="btn-primary">{signedIn ? t.ctaMember : t.cta} →</Link></p>
        </div>
      </section>
    </div>
  );
}
