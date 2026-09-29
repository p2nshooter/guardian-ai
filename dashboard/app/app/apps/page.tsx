/* Member: every cloud app with what it does, whether the plan includes it, and how to start. */
"use client";
import Link from "next/link";
import { useI18n, type Key } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { CLOUD_APPS } from "@/lib/apps";
import { planForApp, PLANS, isPlanId } from "@/lib/plans";
import { LoadingBlock, PageHeader } from "@/components/ui";
import { APP_FEATURES } from "@/lib/i18n-pages/appfeatures";

export default function AppsPage() {
  const { t, lang } = useI18n();
  const { me } = useMe();
  if (!me) return <LoadingBlock />;
  return (
    <>
      <PageHeader title={t("nav.apps")} description={t("apps.subAll")} />
      <div className="grid gap-4 lg:grid-cols-2">
        {CLOUD_APPS.map((a) => {
          const unlocked = me.limits.apps.includes(a.slug);
          const need = planForApp(a.slug);
          return (
            <article key={a.slug} className="card-pad flex flex-col">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: `${a.color}14` }} aria-hidden="true">{a.icon}</span>
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">{a.name}
                    {!a.live ? <span className="badge-gray">{t("common.comingSoon")}</span> : unlocked ? <span className="badge-green">✓ {t("apps.inPlan")}</span> : <span className="badge-amber">🔒 {isPlanId(need) ? PLANS[need].name : ""}+</span>}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{t(`app.short.${a.slug}` as Key)}</p>
                </div>
              </div>
              <ul className="mt-4 grid flex-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                {(APP_FEATURES[lang][a.slug] || APP_FEATURES.en[a.slug] || []).map(([title, desc]) => <li key={title}><strong className="text-slate-900">{title}.</strong> {desc}</li>)}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                {a.live && unlocked ? <Link href={`/app/${a.slug}`} className="btn-primary">{t("apps.openApp", { name: a.name })} →</Link>
                  : a.live ? <Link href={`/app/billing?plan=${need}`} className="btn-primary">{t("plan.upgrade")} →</Link> : null}
                <Link href={`/apps/${a.slug}`} className="btn-ghost">{t("apps.guide")}</Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
