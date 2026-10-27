/* The homepage's auction strip (§26.5: "winners and their packages on the
 * homepage"): the recent winners with the name they chose and the package they
 * won — or, before the first win, the running auction's lots and countdown.
 * Renders nothing when the auction is switched off and nobody has won yet. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Countdown, fill, useAucCopy, type Board } from "@/components/site/auction-ui";

export default function AuctionWinners() {
  const { t, money } = useAucCopy();
  const [b, setB] = useState<Board | null>(null);
  useEffect(() => { fetch("/api/auction", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (j && Array.isArray(j.lots)) setB(j); }).catch(() => {}); }, []);
  if (!b || (!b.winners.length && (!b.enabled || !b.lots.length))) return null;
  const items = b.winners.length
    ? b.winners.slice(0, 6).map((w) => ({ k: `${w.cycle}-${w.title}`, head: `🏆 ${w.name}`, sub: w.title, price: `${fill(t.paidFor, { amount: money(w.amountUsd), normal: money(w.normalUsd) })} · ${w.paid ? t.paid : t.unpaid}` }))
    : b.lots.slice(0, 3).map((l) => ({ k: l.id, head: l.title, sub: `${t.lot.normal} ${money(l.normalUsd)}`, price: `${l.bidsCount ? t.lot.current : t.lot.opening} ${money(l.bidsCount ? l.highUsd : l.openUsd)}` }));
  return (
    <section className="border-y border-slate-200 bg-white py-16" data-testid="home-auction">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow">🔨 {t.home.title}</p>
            <h2 className="h-section mt-3">{b.winners.length ? t.winnersTitle : t.title}</h2>
            <p className="lead mt-3">{t.home.lead}</p>
          </div>
          {b.enabled && b.cycleEnd ? <div className="text-right text-sm text-slate-500"><div className="mb-1">{t.endsIn}</div><Countdown to={b.cycleEnd} /></div> : null}
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => (
            <li key={x.k} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="font-bold text-slate-900">{x.head}</div>
              <div className="mt-1 text-sm text-slate-600">{x.sub}</div>
              <div className="mt-3 text-sm font-semibold text-slate-900">{x.price}</div>
            </li>
          ))}
        </ul>
        <p className="mt-6"><Link href="/auction" className="font-semibold">{t.home.link}</Link></p>
      </div>
    </section>
  );
}
