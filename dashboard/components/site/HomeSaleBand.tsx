/* The first thing on the homepage (28 Oct 2026, REQUESTS 112): AXTO is for sale and
 * the running licence auction, visible the moment the page opens — above the hero,
 * not at the bottom. Since the sale itself became an auction (REQUESTS 120, §34)
 * the band shows that auction live: the opening or current bid and its countdown.
 * At a fixed price it shows the asking price. Everything is read live
 * (/api/acquire, /api/auction) — nothing is hard-coded. The band hides itself once
 * the site is sold. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n, formatMoney } from "@/lib/i18n";
import T from "@/components/site/T";
import { Countdown, useAucCopy, type Board } from "@/components/site/auction-ui";
import { useSaleAucCopy } from "@/components/site/SaleAuctionPanel";

interface Sale { status: string; mode: string; priceUsd: number; auction: { round: { status: string; openUsd: number; weeklyUsd: number; nextRiseAt: string; highUsd: number; bidsCount: number; endsAt: string } | null } | null }

export default function HomeSaleBand() {
  const { lang } = useI18n();
  const { t } = useAucCopy();
  const { t: ts, riseDate } = useSaleAucCopy();
  const [sale, setSale] = useState<Sale | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  useEffect(() => {
    fetch("/api/acquire", { cache: "no-store" }).then((r) => r.json())
      .then((j) => { if (j && typeof j.priceUsd === "number") setSale(j); })
      .catch(() => {});
    fetch("/api/auction", { cache: "no-store" }).then((r) => r.json())
      .then((j) => { if (j && Array.isArray(j.lots)) setBoard(j); })
      .catch(() => {});
  }, []);
  if (sale?.status === "sold") return null;
  const running = board && board.enabled && board.cycleEnd ? board : null;
  const round = sale?.mode === "auction" && sale.auction?.round?.status === "open" ? sale.auction.round : null;
  const money = (n: number) => formatMoney(n, "USD", lang);
  return (
    <section className="relative overflow-hidden border-b border-gold-400/25 bg-ink-950" data-testid="home-sale">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_0%,rgba(201,162,74,.16),transparent_70%)]" />
      <div className="container-page relative flex flex-wrap items-center gap-4 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-xl" aria-hidden="true">{round ? "🔨" : "🏛️"}</span>
        <div className="min-w-0 flex-1">
          {round ? (
            <>
              <div className="font-display text-lg font-bold text-gold-100">
                {ts.homeTitle} · <span data-testid="home-sale-price">{(round.bidsCount ? ts.homeCurrent : ts.homeOpening).replace("{amount}", money(round.bidsCount ? round.highUsd : round.openUsd))}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400" data-testid="home-sale-round">
                <span>{ts.endsIn}</span><Countdown to={round.endsAt} dark />
                {round.nextRiseAt ? <span className="font-semibold text-gold-200" data-testid="home-sale-rise"><span className="hidden sm:inline">· </span>▲ {ts.rises.replace("{next}", money(round.openUsd + round.weeklyUsd)).replace("{date}", riseDate(round.nextRiseAt))}</span> : null}
                <span className="hidden sm:inline">· {ts.noReserve}</span>
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-lg font-bold text-gold-100">
                {sale?.mode === "auction" ? ts.homeTitle : <><T k="lp.sale" /> · <span data-testid="home-sale-price">{sale ? money(sale.priceUsd) : "…"}</span></>}
              </div>
              <div className="text-sm text-slate-400"><T k="lp.saleSub" /></div>
            </>
          )}
          {running ? (
            <div className="mt-1 text-sm text-gold-100/90" data-testid="home-sale-auction">
              <Link href="/auction" className="font-semibold underline-offset-4 hover:underline">🔨 {t.home.title}</Link>
              <span className="text-slate-400"> · {t.endsIn} </span><Countdown to={running.cycleEnd} />
            </div>
          ) : null}
        </div>
        <Link href={round ? "/acquire#bid" : "/acquire"} className="btn-royal">{round ? ts.homeCta : <T k="lp.saleCta" />} →</Link>
      </div>
    </section>
  );
}
