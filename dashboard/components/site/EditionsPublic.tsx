/* Editions of one self-hosted app on its public page (docs/AXTO-APPS-BLUEPRINT.md
 * §3–§4): monthly / yearly prices from the live (admin-editable) table, the
 * translated feature lines, and the trial pool with the real number left.
 * Buying and trials happen in the member portal (sign-in first). */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n, formatMoney } from "@/lib/i18n";
import { ED } from "@/lib/i18n-pages/editions";
import { featureText } from "@/lib/editions-text";
import { loadEditions, type EditionsPayload } from "@/lib/editions-client";
import { hasOwnName } from "@/lib/editions";

export default function EditionsPublic({ slug, name, color }: { slug: string; name: string; color: string }) {
  const { lang } = useI18n();
  const t = ED[lang].ui;
  const [d, setD] = useState<EditionsPayload | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  useEffect(() => { loadEditions().then(setD); }, []);
  const list = (d?.editions || []).filter((e) => e.app === slug);
  const trial = d?.trials.open ? d.trials.apps[slug] : undefined;
  if (!d || !list.length) return null;
  return (
    <section className="palace py-16" data-testid="sh-editions">
      <div className="palace-sky opacity-70" />
      <div className="container-page relative">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow-palace">✦ {t.editionsTitle}</span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">{t.editionsOn.replace("{name}", name)}</h2>
            <p className="mt-3 max-w-2xl text-slate-300">{t.editionsLead}</p>
          </div>
          <div className="inline-flex rounded-xl border border-white/15 bg-white/5 p-1" role="tablist">
            {(["monthly", "yearly"] as const).map((c) => (
              <button key={c} type="button" role="tab" aria-selected={cycle === c} onClick={() => setCycle(c)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors duration-300 ${cycle === c ? "bg-white text-ink-950" : "text-slate-300 hover:text-white"}`}>
                {c === "monthly" ? t.monthly : t.yearly}{c === "yearly" ? <span className="ml-1.5 rounded bg-gold-400/20 px-1 text-[10px] font-bold text-gold-200">{t.save}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className={`mt-8 grid gap-4 ${list.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
          {list.map((e, i) => {
            const top = e.tier === "enterprise";
            return (
              <div key={e.code} className={`crystal-card flex flex-col palace-rise ${top ? "shadow-regal" : ""}`} style={{ ["--i" as string]: i }} data-testid={`pub-edition-${e.code}`}>
                <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${top ? "#e0b44d" : color}, transparent)` }} />
                <span className={`text-xs font-bold uppercase tracking-[0.16em] ${top ? "text-gold-200" : "text-slate-400"}`}>{hasOwnName(e) ? e.name : t.tiers[e.tier]}</span>
                <span className={`mt-3 text-3xl font-extrabold ${top ? "gold-text" : "text-white"}`}>{formatMoney(cycle === "yearly" ? e.yearly : e.monthly, "USD", lang)}</span>
                <span className="text-xs text-slate-400">{cycle === "yearly" ? t.perYear : t.perMonth}</span>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
                  {e.features.map((f) => <li key={f} className="flex gap-2"><span className="text-gold-300" aria-hidden="true">✓</span>{featureText(lang, f)}</li>)}
                </ul>
                <Link href={`/register?next=${encodeURIComponent("/app/self-hosted")}`} className={`${top ? "btn-royal" : "btn-crystal"} mt-5`}>{t.buyEdition}</Link>
              </div>
            );
          })}
        </div>

        {trial && trial.total > 0 ? (
          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-gold-400/30 bg-gold-400/[.07] p-5" data-testid="sh-trial">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold-300/50 bg-ink-950 text-center text-[11px] font-extrabold leading-tight text-gold-100 shadow-regal">100<br />TRIAL</span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl font-bold text-white">{t.trialBadge}</div>
              <p className="text-sm text-slate-300">{t.trialLead.replace("{days}", String(d.trials.days)).replace("{edition}", trial.edition).replace("{max}", String(d.trials.maxProducts))}</p>
              <p className="mt-1 text-xs font-semibold text-gold-200">{trial.available > 0 ? t.trialLeft.replace("{n}", String(trial.available)).replace("{total}", String(trial.total)) : t.trialSoldOut}</p>
            </div>
            {trial.available > 0 ? <Link href={`/register?next=${encodeURIComponent("/app/self-hosted")}`} className="btn-royal">{t.trialPortal}</Link> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
