/* The first thing on the homepage (28 Oct 2026, REQUESTS 112): AXTO is for sale at
 * its asking price, and the running licence auction, visible the moment the page
 * opens — above the hero, not at the bottom. The price is read live from the sale
 * settings (/api/acquire), so the admin's change shows at once; nothing is hard-coded.
 * The band hides itself once the sale is sold. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n, formatMoney } from "@/lib/i18n";
import T from "@/components/site/T";
import { Countdown, useAucCopy, type Board } from "@/components/site/auction-ui";

export default function HomeSaleBand() {
  const { lang } = useI18n();
  const { t } = useAucCopy();
  const [sale, setSale] = useState<{ status: string; priceUsd: number } | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  useEffect(() => {
    fetch("/api/acquire", { cache: "no-store" }).then((r) => r.json())
      .then((j) => { if (j && typeof j.priceUsd === "number") setSale({ status: j.status, priceUsd: j.priceUsd }); })
      .catch(() => {});
    fetch("/api/auction", { cache: "no-store" }).then((r) => r.json())
      .then((j) => { if (j && Array.isArray(j.lots)) setBoard(j); })
      .catch(() => {});
  }, []);
  if (sale?.status === "sold") return null;
  const running = board && board.enabled && board.cycleEnd ? board : null;
  return (
    <section className="relative overflow-hidden border-b border-gold-400/25 bg-ink-950" data-testid="home-sale">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_0%,rgba(201,162,74,.16),transparent_70%)]" />
      <div className="container-page relative flex flex-wrap items-center gap-4 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-xl" aria-hidden="true">🏛️</span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold text-gold-100">
            <T k="lp.sale" /> · <span data-testid="home-sale-price">{sale ? formatMoney(sale.priceUsd, "USD", lang) : "…"}</span>
          </div>
          <div className="text-sm text-slate-400"><T k="lp.saleSub" /></div>
          {running ? (
            <div className="mt-1 text-sm text-gold-100/90" data-testid="home-sale-auction">
              <Link href="/auction" className="font-semibold underline-offset-4 hover:underline">🔨 {t.home.title}</Link>
              <span className="text-slate-400"> · {t.endsIn} </span><Countdown to={running.cycleEnd} />
            </div>
          ) : null}
        </div>
        <Link href="/acquire" className="btn-royal"><T k="lp.saleCta" /> →</Link>
      </div>
    </section>
  );
}
