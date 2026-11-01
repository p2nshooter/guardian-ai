/* The partner programmes on the public site (docs/BUSINESS-MASTER-BLUEPRINT.md §2–§4,
 * §7): the hub (/partners) and the affiliate, reseller and white-label pages, with
 * the live terms from Admin → Programs, a worked example or calculator, the steps
 * and the FAQ, and — for reseller and white label — the application form.
 * English renders on the server (SEO); the other nine languages load on demand.
 * Only public terms reach this page (lib/programs.ts publicPrograms). Motion is
 * decorative and switched off under prefers-reduced-motion (Reveal). */
"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/i18n";
import { LOCALE } from "@/lib/i18n-shared";
import { Spinner } from "@/components/ui";
import Reveal from "@/components/site/Reveal";
import { affiliateVars, maxTier, resellerVars, whitelabelVars, type PartnersCopy } from "@/lib/partners-copy";
import { fill, usePartnersCopy } from "@/components/site/partners-i18n";
import type { PublicPrograms, Tier } from "@/lib/programs";

type Aff = NonNullable<PublicPrograms["affiliate"]>;
type Res = NonNullable<PublicPrograms["reseller"]>;
type WL = NonNullable<PublicPrograms["whitelabel"]>;

function Hero({ eyebrow, title, lead, icon, children }: { eyebrow: string; title: string; lead: string; icon: string; children?: React.ReactNode }) {
  return (
    <section className="acq-hero relative isolate overflow-hidden border-b border-slate-800 bg-ink-950 py-20 text-white sm:py-24">
      <div className="acq-aurora pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="acq-grid pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
      <span className="acq-orb acq-orb-a pointer-events-none absolute -z-10" aria-hidden="true" />
      <div className="container-page relative">
        <p className="anim-in inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200">{icon} {eyebrow}</p>
        <h1 className="anim-in anim-delay-1 mt-6 max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="anim-in anim-delay-2 mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">{lead}</p>
        {children}
      </div>
    </section>
  );
}

function Terms({ title, rows, testid }: { title: string; rows: [string, string][]; testid: string }) {
  return (
    <Reveal className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm sm:p-7">
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">{title}</h2>
      <dl className="mt-4 divide-y divide-white/10" data-testid={testid}>
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-4">
            <dt className="text-sm text-slate-400">{k}</dt>
            <dd className="font-bold text-white sm:max-w-[60%] sm:text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}

function Steps({ title, steps }: { title: string; steps: string[][] }) {
  return (
    <section className="border-y border-slate-800 bg-ink-950 py-20 text-white">
      <div className="container-page">
        <Reveal><h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h2></Reveal>
        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([h, d], i) => (
            <Reveal as="li" key={h} delay={(i % 4) * 90} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-base font-black text-ink-950">{i + 1}</span>
              <h3 className="mt-4 text-lg font-bold text-white">{h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{d}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FaqBlock({ title, items }: { title: string; items: string[][] }) {
  return (
    <section className="py-20">
      <div className="container-page max-w-3xl">
        <Reveal><h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h2></Reveal>
        <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white" data-testid="partners-faq">
          {items.map(([q, a]) => (
            <details key={q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-start justify-between gap-4 font-semibold text-slate-900">{q}<span className="mt-0.5 text-slate-400 transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function List({ title, items, mark = "✓", tone = "emerald" }: { title: string; items: string[]; mark?: string; tone?: "emerald" | "amber" }) {
  return (
    <Reveal className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      <ul className="mt-5 space-y-2.5">{items.map((x) => <li key={x} className="flex gap-2.5 text-[15px] text-slate-700"><span className={`mt-0.5 ${tone === "amber" ? "text-amber-600" : "text-emerald-600"}`} aria-hidden="true">{mark}</span>{x}</li>)}</ul>
    </Reveal>
  );
}

const Back = ({ label }: { label: string }) => (
  <Link href="/partners" prefetch={false} className="mt-8 inline-flex text-sm font-semibold text-amber-200 no-underline hover:text-amber-100">← {label}</Link>
);

function Notice({ open, portal, t }: { open: boolean; portal: boolean; t: PartnersCopy }) {
  if (open && portal) return null;
  return (
    <div className="anim-in anim-delay-3 mt-8 max-w-2xl rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100" data-testid="partners-notice">
      {open ? t.common.portalLater : t.common.closed}
    </div>
  );
}

/* ── The hub ─────────────────────────────────────────────────────────────── */

export function PartnersHub({ programs }: { programs: PublicPrograms }) {
  const { t, money } = usePartnersCopy();
  const a = programs.affiliate, r = programs.reseller, w = programs.whitelabel;
  type Card = { key: string; href: string; icon: string; c: PartnersCopy["hub"]["cards"][number]; v: Record<string, string> };
  const cards: Card[] = [];
  if (a) cards.push({ key: "affiliate", href: "/affiliate", icon: "🔗", c: t.hub.cards[0]!, v: affiliateVars(a, money) });
  if (r) cards.push({ key: "reseller", href: "/resellers", icon: "🏪", c: t.hub.cards[1]!, v: { max: String(maxTier(r.tiers)), entry: money(r.entryUsd), credit: money(r.includedCreditUsd) } });
  if (w) cards.push({ key: "whitelabel", href: "/white-label", icon: "👑", c: t.hub.cards[2]!, v: { max: String(maxTier(w.tiers)) } });
  const cols = [true, !!a, !!r, !!w];
  const vars = { rEntry: r ? money(r.entryUsd) : "", wEntry: w ? money(w.entryUsd) : "" };
  return (
    <div data-testid="partners-hub">
      <Hero eyebrow={t.hub.eyebrow} title={t.hub.title} lead={t.hub.lead} icon="🤝" />
      <section className="py-20">
        <div className={`container-page grid gap-6 ${cards.length === 3 ? "lg:grid-cols-3" : cards.length === 2 ? "md:grid-cols-2" : ""}`}>
          {cards.map((x, i) => (
            <Reveal key={x.key} delay={i * 90} className="flex flex-col rounded-3xl border border-amber-200/60 bg-gradient-to-b from-white to-amber-50/40 p-7 shadow-card" >
              <div className="text-3xl" aria-hidden="true">{x.icon}</div>
              <h2 className="mt-4 text-2xl font-extrabold text-slate-900">{x.c.name}</h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">{x.c.tag}</p>
              <ul className="mt-5 flex-1 space-y-2.5">{x.c.points.map((p) => <li key={p} className="flex gap-2.5 text-[15px] text-slate-700"><span className="mt-0.5 text-amber-600" aria-hidden="true">◆</span>{fill(p, x.v)}</li>)}</ul>
              <Link href={x.href} prefetch={false} className="btn-primary mt-7 justify-center" data-testid={`partners-card-${x.key}`}>{x.c.cta} →</Link>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="border-y border-slate-200 bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="container-page">
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t.hub.compareTitle}</h2></Reveal>
          <Reveal className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-card">
            <table className="table min-w-[640px]" data-testid="partners-compare">
              <thead><tr>{t.hub.compareHead.map((h, i) => (cols[i] ? <th key={i}>{h}</th> : null))}</tr></thead>
              <tbody>{t.hub.compare.map((row) => <tr key={row[0]}>{row.map((c, i) => (cols[i] ? <td key={i} className={i === 0 ? "font-semibold text-slate-900" : ""}>{fill(c, vars)}</td> : null))}</tr>)}</tbody>
            </table>
          </Reveal>
        </div>
      </section>
      <section className="py-20">
        <div className="container-page">
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t.hub.promiseTitle}</h2></Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {t.hub.promises.map(([h, d], i) => (
              <Reveal key={h} delay={i * 70} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h3 className="font-bold text-slate-900">{h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <FaqBlock title={t.common.faqTitle} items={t.hub.faq} />
    </div>
  );
}

/* ── Affiliate ───────────────────────────────────────────────────────────── */

export function AffiliateOffer({ terms }: { terms: Aff }) {
  const { t, lang, money } = usePartnersCopy();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => { api<{ user: unknown }>("/api/auth/me?optional=1").then((r) => setSignedIn(!!(r.ok && r.data.user))); }, []);
  const v = affiliateVars(terms, money);
  const [customers, setCustomers] = useState(10);
  const [spend, setSpend] = useState(49);
  const earn = Math.round(customers * spend * terms.months * terms.commissionPct) / 100;
  const cta = signedIn ? "/app/affiliate" : `/register?next=${encodeURIComponent("/app/affiliate")}`;
  return (
    <div data-testid="affiliate-page">
      <Hero eyebrow={t.affiliate.eyebrow} title={fill(t.affiliate.title, v)} lead={fill(t.affiliate.lead, v)} icon="🔗">
        <Notice open={terms.open} portal={terms.portal} t={t} />
        <div className="anim-in anim-delay-3 mt-10 flex flex-wrap gap-3">
          {terms.open || signedIn ? <Link href={cta} prefetch={false} className="acq-cta rounded-xl bg-gradient-to-r from-amber-200 to-amber-400 px-7 py-4 text-base font-extrabold text-ink-950 no-underline shadow-lg shadow-amber-500/20 transition hover:brightness-110" data-testid="affiliate-cta">{signedIn ? t.affiliate.portal : t.affiliate.join} →</Link> : null}
        </div>
        <div className="mt-12 max-w-2xl"><Terms title={t.common.termsTitle} rows={t.affiliate.terms.map(([k, x]) => [k!, fill(x!, v)])} testid="affiliate-terms" /></div>
        <Back label={t.common.back} />
      </Hero>
      <section className="py-20">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <Reveal className="rounded-3xl border border-slate-200 bg-white p-7 shadow-card">
            <h2 className="text-2xl font-bold text-slate-900">{t.affiliate.calcTitle}</h2>
            <label htmlFor="aff-customers" className="mt-6 block text-sm font-semibold text-slate-700">{t.affiliate.calcCustomers}: <span className="font-black text-slate-900">{customers.toLocaleString(LOCALE[lang] || "en-US")}</span></label>
            <input id="aff-customers" type="range" min={1} max={500} value={customers} onChange={(e) => setCustomers(Number(e.target.value))} className="mt-2 w-full accent-amber-600" data-testid="aff-calc-customers" />
            <label htmlFor="aff-spend" className="mt-5 block text-sm font-semibold text-slate-700">{t.affiliate.calcSpend}: <span className="font-black text-slate-900">{money(spend)}</span></label>
            <input id="aff-spend" type="range" min={19} max={999} step={1} value={spend} onChange={(e) => setSpend(Number(e.target.value))} className="mt-2 w-full accent-amber-600" />
            <div className="mt-6 rounded-2xl bg-amber-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">{fill(t.affiliate.calcResult, v)}</div>
              <div className="mt-1 text-3xl font-black text-amber-900" data-testid="aff-calc-result">{money(earn)}</div>
            </div>
            <p className="mt-4 text-xs text-slate-500">{fill(t.affiliate.calcNote, v)}</p>
          </Reveal>
          <List title={t.affiliate.rulesTitle} items={t.affiliate.rules} mark="⚖" tone="amber" />
        </div>
      </section>
      <Steps title={t.affiliate.howTitle} steps={t.affiliate.steps.map(([h, d]) => [h!, fill(d!, v)])} />
      <FaqBlock title={t.common.faqTitle} items={t.affiliate.faq.map(([q, a]) => [q!, fill(a!, v)])} />
    </div>
  );
}

/* ── Reseller and white label ────────────────────────────────────────────── */

function TierList({ tiers, t, money }: { tiers: Tier[]; t: PartnersCopy; money: (n: number) => string }) {
  return (
    <ul className="space-y-1.5 text-sm text-slate-200" data-testid="partner-tiers">
      {tiers.map((x, i) => <li key={x.fromUsd}>{fill(t.common.tierRow, { name: t.common.tierNames[i] || `#${i + 1}`, pct: String(x.pct), from: money(x.fromUsd) })}</li>)}
    </ul>
  );
}

export function ResellerOffer({ terms, proMonthlyUsd }: { terms: Res; proMonthlyUsd: number }) {
  const { t, money } = usePartnersCopy();
  const v = resellerVars(terms, money, proMonthlyUsd);
  return (
    <div data-testid="reseller-page">
      <Hero eyebrow={t.reseller.eyebrow} title={fill(t.reseller.title, v)} lead={t.reseller.lead} icon="🏪">
        <Notice open={terms.open} portal={terms.portal} t={t} />
        {terms.open ? <div className="anim-in anim-delay-3 mt-10"><a href="#apply" className="acq-cta rounded-xl bg-gradient-to-r from-amber-200 to-amber-400 px-7 py-4 text-base font-extrabold text-ink-950 no-underline shadow-lg shadow-amber-500/20 transition hover:brightness-110" data-testid="reseller-cta">{t.common.apply} →</a></div> : null}
        <div className="mt-12 grid max-w-4xl gap-6 lg:grid-cols-2">
          <Terms title={t.common.termsTitle} rows={t.reseller.terms.map(([k, x]) => [k!, fill(x!, v)])} testid="reseller-terms" />
          <Reveal className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm sm:p-7">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">{t.common.tiersTitle}</h2>
            <div className="mt-4"><TierList tiers={terms.tiers} t={t} money={money} /></div>
          </Reveal>
        </div>
        <Back label={t.common.back} />
      </Hero>
      <section className="py-20">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <List title={t.reseller.includesTitle} items={t.reseller.includes} />
          <List title={t.reseller.yoursTitle} items={t.reseller.yours} mark="◆" tone="amber" />
        </div>
        <div className="container-page mt-8">
          <Reveal className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-7 shadow-card" >
            <h2 className="text-2xl font-bold text-slate-900">{t.reseller.exampleTitle}</h2>
            <p className="mt-3 text-lg leading-relaxed text-slate-700" data-testid="reseller-example">{fill(t.reseller.example, v)}</p>
            <p className="mt-3 text-xs text-slate-500">{t.reseller.exampleNote}</p>
          </Reveal>
        </div>
      </section>
      <Steps title={t.reseller.stepsTitle} steps={t.reseller.steps.map(([h, d]) => [h!, fill(d!, v)])} />
      {terms.open ? <ApplyForm program="reseller" /> : null}
      <FaqBlock title={t.common.faqTitle} items={t.reseller.faq.map(([q, a]) => [q!, fill(a!, v)])} />
    </div>
  );
}

export function WhiteLabelOffer({ terms, businessYearlyUsd }: { terms: WL; businessYearlyUsd: number }) {
  const { t, money } = usePartnersCopy();
  const v = whitelabelVars(terms, money, businessYearlyUsd);
  return (
    <div data-testid="whitelabel-page">
      <Hero eyebrow={t.whitelabel.eyebrow} title={t.whitelabel.title} lead={t.whitelabel.lead} icon="👑">
        <Notice open={terms.open} portal={terms.portal} t={t} />
        {terms.open ? <div className="anim-in anim-delay-3 mt-10"><a href="#apply" className="acq-cta rounded-xl bg-gradient-to-r from-amber-200 to-amber-400 px-7 py-4 text-base font-extrabold text-ink-950 no-underline shadow-lg shadow-amber-500/20 transition hover:brightness-110" data-testid="whitelabel-cta">{t.common.apply} →</a></div> : null}
        <div className="mt-12 grid max-w-4xl gap-6 lg:grid-cols-2">
          <Terms title={t.common.termsTitle} rows={t.whitelabel.terms.map(([k, x]) => [k!, fill(x!, v)])} testid="whitelabel-terms" />
          <Reveal className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-sm sm:p-7">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">{t.common.tiersTitle}</h2>
            <div className="mt-4"><TierList tiers={terms.tiers} t={t} money={money} /></div>
          </Reveal>
        </div>
        <Back label={t.common.back} />
      </Hero>
      <section className="py-20">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <List title={t.whitelabel.brandTitle} items={t.whitelabel.brand} />
          <List title={t.whitelabel.includedTitle} items={t.whitelabel.included.map((x) => fill(x, v))} mark="◆" tone="amber" />
        </div>
        <div className="container-page mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <Reveal className="rounded-3xl border border-amber-300 bg-gradient-to-br from-ink-950 to-ink-900 p-7 text-white shadow-card">
            <h2 className="text-2xl font-bold text-amber-200">✦ {t.whitelabel.manageTitle}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-200" data-testid="whitelabel-manage">{t.whitelabel.manageBody}</p>
          </Reveal>
          <List title={t.whitelabel.ownTitle} items={t.whitelabel.own} mark="◆" tone="amber" />
        </div>
        <div className="container-page mt-8">
          <Reveal className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-7 shadow-card">
            <h2 className="text-2xl font-bold text-slate-900">{t.whitelabel.exampleTitle}</h2>
            <p className="mt-3 text-lg leading-relaxed text-slate-700" data-testid="whitelabel-example">{fill(t.whitelabel.example, v)}</p>
            <p className="mt-3 text-xs text-slate-500">{t.whitelabel.exampleNote}</p>
          </Reveal>
        </div>
      </section>
      <Steps title={t.whitelabel.stepsTitle} steps={t.whitelabel.steps.map(([h, d]) => [h!, fill(d!, v)])} />
      {terms.open ? <ApplyForm program="whitelabel" /> : null}
      <FaqBlock title={t.common.faqTitle} items={t.whitelabel.faq.map(([q, a]) => [q!, fill(a!, v)])} />
    </div>
  );
}

/* ── The application ─────────────────────────────────────────────────────── */

type AppState = { status: "new" | "contacted" | "invited" | "declined"; createdAt: string } | null;
const ERR = ["name", "company", "country", "ack", "closed", "admin", "rate"] as const;

function ApplyForm({ program }: { program: "reseller" | "whitelabel" }) {
  const { t, lang } = usePartnersCopy();
  const [me, setMe] = useState<{ email: string; name: string } | null | undefined>(undefined);
  const [mine, setMine] = useState<AppState>(null);
  const [f, setF] = useState({ name: "", company: "", country: "", website: "", languages: "", volume: "", message: "", ack: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    api<{ user: { email: string; name: string } | null }>("/api/auth/me?optional=1").then((r) => {
      const u = r.ok ? r.data.user : null;
      setMe(u);
      if (u) {
        setF((x) => ({ ...x, name: x.name || u.name || "" }));
        api<{ applications: Record<string, AppState> }>("/api/partners/apply").then((a) => { if (a.ok) setMine(a.data.applications[program] || null); });
      }
    });
  }, [program]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const programName = t.form.programs[program];
  const here = useMemo(() => (typeof window === "undefined" ? `/${program === "reseller" ? "resellers" : "white-label"}` : window.location.pathname), [program]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.ack) { setErr(t.form.err.ack); return; }
    setBusy(true); setErr("");
    const r = await api<{ status: NonNullable<AppState>["status"]; createdAt: string; code?: string }>("/api/partners/apply", { body: { ...f, program } });
    setBusy(false);
    if (r.ok) { setSent(true); setMine({ status: r.data.status || "new", createdAt: r.data.createdAt }); return; }
    const code = (ERR as readonly string[]).includes(r.data?.code || "") ? (r.data.code as (typeof ERR)[number]) : "other";
    setErr(t.form.err[code]);
  }

  return (
    <section id="apply" className="scroll-mt-24 border-b border-slate-200 bg-gradient-to-b from-amber-50/60 to-white py-20">
      <div className="container-page max-w-3xl">
        <Reveal>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{fill(t.form.title, { program: programName })}</h2>
          <p className="mt-3 text-slate-600">{t.form.lead}</p>
        </Reveal>
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8" data-testid="partner-apply">
          {me === undefined ? <div className="flex justify-center py-8"><Spinner /></div>
            : !me ? (
              <div className="text-center">
                <p className="text-slate-700">{t.form.signIn}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link href={`/login?redirect=${encodeURIComponent(`${here}#apply`)}`} prefetch={false} className="btn-primary">{t.common.signIn}</Link>
                  <Link href={`/register?next=${encodeURIComponent(`${here}#apply`)}`} prefetch={false} className="btn-secondary">{t.common.register}</Link>
                </div>
              </div>
            ) : mine ? (
              <div className="text-center" data-testid="partner-applied">
                {sent ? <p className="text-lg font-bold text-emerald-700">✓ {t.form.ok}</p> : null}
                {sent ? <p className="mt-2 text-slate-600">{fill(t.form.okB, { email: me.email })}</p> : null}
                <p className={`${sent ? "mt-4 text-sm" : ""} text-slate-700`}>{fill(t.form.already, { date: formatDate(mine.createdAt, lang), status: t.form.statuses[mine.status] })}</p>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
                <label className="block text-sm font-semibold text-slate-700">{t.form.name}<input className="input mt-1" value={f.name} onChange={set("name")} autoComplete="name" required maxLength={120} data-testid="apply-name" /></label>
                <label className="block text-sm font-semibold text-slate-700">{t.form.company}<input className="input mt-1" value={f.company} onChange={set("company")} autoComplete="organization" required maxLength={160} data-testid="apply-company" /></label>
                <label className="block text-sm font-semibold text-slate-700">{t.form.country}<input className="input mt-1" value={f.country} onChange={set("country")} autoComplete="country-name" required maxLength={60} data-testid="apply-country" /></label>
                <label className="block text-sm font-semibold text-slate-700">{t.form.website}<input className="input mt-1" value={f.website} onChange={set("website")} inputMode="url" maxLength={200} /></label>
                {program === "whitelabel" ? (
                  <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">{t.form.languages}<input className="input mt-1" value={f.languages} onChange={set("languages")} maxLength={80} data-testid="apply-languages" /><span className="mt-1 block text-xs font-normal text-slate-500">{t.form.languagesHint}</span></label>
                ) : null}
                <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">{t.form.volume}<input className="input mt-1" value={f.volume} onChange={set("volume")} maxLength={120} /></label>
                <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">{t.form.message}<textarea className="input mt-1 min-h-[110px]" value={f.message} onChange={set("message")} maxLength={2000} /></label>
                <label className="flex items-start gap-2.5 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" className="mt-0.5" checked={f.ack} onChange={(e) => setF((x) => ({ ...x, ack: e.target.checked }))} data-testid="apply-ack" />{t.form.ack}</label>
                {err ? <p className="text-sm font-semibold text-rose-700 sm:col-span-2" role="alert" data-testid="apply-error">{err}</p> : null}
                <div className="sm:col-span-2"><button type="submit" className="btn-primary" disabled={busy} data-testid="apply-send">{busy ? t.form.sending : t.form.send}</button></div>
              </form>
            )}
        </div>
      </div>
    </section>
  );
}
