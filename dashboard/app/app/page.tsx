/* Member home: onboarding checklist (plan → AI key → first run), app launcher,
 * this month's usage, and the next best action. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n, formatBytes } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { CLOUD_APPS } from "@/lib/apps";
import { LoadingBlock, Progress, Stat, Steps } from "@/components/ui";
import { InstallButton } from "@/components/pwa/Pwa";

export default function MemberHome() {
  const { t, lang } = useI18n();
  const { me } = useMe();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  useEffect(() => { api<{ keys: unknown[] }>("/api/byox/keys").then((r) => setHasKey(r.ok ? r.data.keys.length > 0 : false)); }, []);
  if (!me) return <LoadingBlock />;

  const paid = me.tier !== "none";
  const unlimited = (n: number) => (n < 0 ? t("home.unlimited") : String(n));
  const id = lang === "id";

  return (
    <div className="space-y-6">
      <div className="surface-ink relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="glow pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{t("home.hello", { name: me.user.name.split(" ")[0] || me.user.email })}</h1>
            <p className="mt-1 text-slate-300">{t("home.sub")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/app/legal" className="btn-primary">⚖️ Legal AI</Link>
            <InstallButton lang={lang} className="btn-secondary" />
          </div>
        </div>
      </div>

      {!paid || hasKey === false ? (
        <section className="card-pad">
          <h2 className="mb-4 text-base font-semibold">{t("home.start")}</h2>
          <Steps steps={[
            { title: t("home.step1"), done: paid, body: paid ? undefined : <Link href="/app/billing" className="btn-primary btn-sm mt-2">{t("plan.choose")} →</Link> },
            { title: t("home.step2"), done: !!hasKey, body: hasKey ? undefined : <><span>{t("home.noKey")}</span><br /><Link href="/app/settings?tab=ai" className="btn-secondary btn-sm mt-2">🔑 {id ? "Tambah kunci AI" : "Add an AI key"}</Link></> },
            { title: t("home.step3"), done: false, body: <Link href="/app/legal" className="btn-ghost btn-sm mt-1">{id ? "Buka Legal AI" : "Open Legal AI"} →</Link> },
          ]} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-base font-semibold">{t("home.appsTitle")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CLOUD_APPS.map((a) => {
            const unlocked = me.limits.apps.includes(a.slug);
            return (
              <Link key={a.slug} href={a.live ? `/app/${a.slug}` : `/apps/${a.slug}`} className="card-pad group flex gap-3 no-underline transition hover:shadow-lift">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: `${a.color}14` }} aria-hidden="true">{a.icon}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-semibold text-slate-900">{a.name}
                    {!a.live ? <span className="badge-gray">{t("common.comingSoon")}</span> : !unlocked ? <span className="badge-amber">🔒</span> : null}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-sm text-slate-600">{a.short}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">{t("home.usage")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label={t("home.requests")} value={me.usage.requests.toLocaleString()} hint="BYOX" />
          <Stat label={t("home.clipper")} value={`${me.usage.clipperVideos} / ${unlimited(me.usage.clipperLimit)}`}>
            {me.usage.clipperLimit > 0 ? <Progress value={me.usage.clipperVideos} max={me.usage.clipperLimit} /> : null}
          </Stat>
          <Stat label={t("home.storage")} value={`${formatBytes(me.usage.storageBytes)} / ${formatBytes(me.usage.storageLimit)}`}>
            {me.usage.storageLimit > 0 ? <Progress value={me.usage.storageBytes} max={me.usage.storageLimit} /> : null}
          </Stat>
        </div>
      </section>

      {me.tier === "starter" || me.tier === "pro" ? (
        <section className="card-pad flex flex-col gap-3 border-brand-200 bg-brand-50/40 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="font-semibold text-slate-900">{me.tier === "starter" ? (id ? "Buka semua 36 workspace Legal AI, Compliance & Security" : "Unlock all 36 Legal AI workspaces, Compliance & Security") : (id ? "Jalankan aplikasi di server Anda sendiri" : "Run the apps on your own servers")}</div>
            <div className="text-sm text-slate-600">{me.tier === "starter" ? (id ? "Upgrade ke Pro — sisa masa paket Anda dihitung otomatis." : "Upgrade to Pro — unused time on your plan is credited automatically.") : (id ? "Business mencakup 3 aplikasi self-hosted dengan lisensi bertanda tangan." : "Business includes 3 self-hosted apps with signed licences.")}</div>
          </div>
          <Link href={`/app/billing?plan=${me.tier === "starter" ? "pro" : "business"}`} className="btn-primary">{t("plan.upgrade")} →</Link>
        </section>
      ) : null}
    </div>
  );
}
