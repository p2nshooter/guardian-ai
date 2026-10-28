/* The homepage spotlight for Orchestra AI and its GPU worker (REQUESTS 115,
 * BLUEPRINT-V4 §31): what it is, the GPU worker in plain words, and the editions
 * with their live list prices (/api/editions, the same table the product pages use). */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n, formatMoney } from "@/lib/i18n";
import { ED } from "@/lib/i18n-pages/editions";
import { featureText } from "@/lib/editions-text";
import { loadEditions, type EditionsPayload } from "@/lib/editions-client";
import { hasOwnName } from "@/lib/editions";
import { orchSpot } from "@/lib/orchestra-copy";

export default function OrchestraSpotlight() {
  const { lang } = useI18n();
  const s = orchSpot(lang);
  const t = ED[lang].ui;
  const [d, setD] = useState<EditionsPayload | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  useEffect(() => { loadEditions().then(setD); }, []);
  const list = (d?.editions || []).filter((e) => e.app === "orchestra");
  return (
    <section className="border-y border-slate-200 bg-white py-20" id="orchestra" data-testid="home-orchestra">
      <div className="container-page">
        <div className="max-w-3xl">
          <p className="eyebrow">🎼 Orchestra AI · GPU</p>
          <h2 className="h-section mt-3">{s.title}</h2>
          <p className="lead mt-4">{s.lead}</p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="card-pad flex flex-col" data-testid="home-gpu-worker">
            <h3 className="text-xl font-bold text-slate-900">🖥️ {s.gpuTitle}</h3>
            <p className="mt-2 text-slate-600">{s.gpuLead}</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {[s.perk1, s.perk2, s.perk3, s.perk4].map((p) => <li key={p} className="flex gap-2"><span className="text-brand-600" aria-hidden="true">✓</span>{p}</li>)}
            </ul>
            <img src="/guides/orchestra/05-gpu-pool.png" alt="Orchestra GPU Pool with a detected NVIDIA card" width={1280} height={800} loading="lazy"
              className="mt-6 w-full rounded-xl border border-slate-200 shadow-sm" />
          </div>

          <div className="card-pad" data-testid="home-orchestra-prices">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">{s.priceTitle}</h3>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist">
                {(["monthly", "yearly"] as const).map((c) => (
                  <button key={c} type="button" role="tab" aria-selected={cycle === c} onClick={() => setCycle(c)}
                    className={`rounded-lg px-3 py-1 text-sm font-semibold transition-colors duration-300 ${cycle === c ? "bg-ink-900 text-white" : "text-slate-700 hover:text-slate-900"}`}>
                    {c === "monthly" ? t.monthly : t.yearly}
                  </button>
                ))}
              </div>
            </div>
            {!d ? <p className="mt-6 text-sm text-slate-500">{s.loading}</p> : (
              <div className="mt-5 grid gap-3">
                {list.map((e) => {
                  const top = e.tier === "enterprise";
                  return (
                    <div key={e.code} className={`rounded-xl border p-4 ${top ? "border-brand-600/40 bg-brand-50/40" : "border-slate-200 bg-white"}`} data-testid={`home-orchestra-${e.tier}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-bold text-slate-900">{hasOwnName(e) ? e.name : t.tiers[e.tier]}</span>
                        <span className="text-2xl font-extrabold text-slate-900">{formatMoney(cycle === "yearly" ? e.yearly : e.monthly, "USD", lang)}
                          <span className="ml-1 text-xs font-medium text-slate-500">{cycle === "yearly" ? s.perYear : s.perMonth}</span></span>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        {e.features.map((f) => <li key={f} className="flex gap-2"><span className="text-brand-600" aria-hidden="true">✓</span>{featureText(lang, f)}</li>)}
                      </ul>
                    </div>
                  );
                })}
                <p className="text-xs text-slate-500">{s.gpuIncluded}</p>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/register?next=${encodeURIComponent("/app/self-hosted")}`} className="btn-primary">{s.buy}</Link>
              <Link href="/self-hosted/orchestra#guide" className="btn border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">{s.guide} →</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
