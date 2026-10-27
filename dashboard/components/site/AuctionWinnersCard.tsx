/* The auction's winners in the portals (§27.4: "pemenangnya tampilkan di
 * homepage, portal member dan portal admin") — the member home and the admin
 * overview: the recent winners with the name each chose, the running
 * auction's countdown and a link to bid (member) or to the desk (admin). */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Countdown, WinnersList, fill, useAucCopy, type Board } from "@/components/site/auction-ui";

export default function AuctionWinnersCard({ href, admin = false }: { href: string; admin?: boolean }) {
  const { t, when } = useAucCopy();
  const [b, setB] = useState<Board | null>(null);
  useEffect(() => { fetch("/api/auction", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (j && Array.isArray(j.lots)) setB(j); }).catch(() => {}); }, []);
  if (!b) return null;
  return (
    <section className="card-pad" data-testid="portal-auction-winners">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">🔨 {admin ? "Licence auction — winners" : t.home.title}</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {b.enabled && b.cycleEnd ? fill(t.endsAt, { date: when(b.cycleEnd) }) : t.offT}
            {admin ? ` · ${b.lots.length} lots live${b.upcoming ? ` · ${b.upcoming} of the next auction ready` : ""}` : ""}
          </p>
        </div>
        {b.enabled && b.cycleEnd ? <Countdown to={b.cycleEnd} /> : null}
      </div>
      <div className="mt-4"><WinnersList winners={b.winners} limit={5} compact /></div>
      <p className="mt-3 text-sm"><Link href={href} className="font-semibold">{admin ? "Open the auction desk →" : t.home.link}</Link></p>
    </section>
  );
}
