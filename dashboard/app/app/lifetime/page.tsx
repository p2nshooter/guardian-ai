/* Member: Lifetime licences — perpetual, OFFLINE self-hosted licences.
 * Buy (one app or the suite, 1–100 devices per app) at the best valid price —
 * the list price, today's Friday deal (−30 %, −50 % on the last Friday of the
 * month) or a price the team agreed on the member's own offer (never stacked;
 * docs/AXTO-APPS-BLUEPRINT.md §15) — then activate each device with the machine
 * id the app shows on first start: the portal returns a signed .axto-license
 * file the engine verifies locally, with no internet. */
"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useI18n, formatDate, formatMoney, statusLabel } from "@/lib/i18n";
import { Alert, CopyButton, EmptyState, Field, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";
import PayPanel, { payFromCheckout, type Pay } from "@/components/app/PayPanel";
import { openSupport } from "@/components/support/ChatWidget";
import { SELF_HOSTED, catalogEntry } from "@/lib/selfhosted";
import { LTD } from "@/lib/i18n-pages/lifetimedeals";
import type { DealPayload } from "@/lib/lifetime-pricing";
import DealBanner, { DealPrice } from "@/components/lifetime/DealBanner";

interface Tier { devices: number; label: string; app: number; suite: number }
interface Activation { id: string; product: string; machine_id: string; label: string; created_at: string; revoked_at: string }
interface Licence {
  id: string; scope: "app" | "suite"; product: string; name: string; devices: number; updates_until: string; status: string; created_at: string; install_key?: string;
  updatesActive: boolean; activations: Activation[]; products: { slug: string; name: string; used: number; files?: { images: string[]; arm64?: string[] } }[];
}
interface Data { licenses: Licence[]; tiers: Tier[]; cardMaxUsd: number }
interface Offer {
  id: string; scope: "app" | "suite"; product: string; productName: string; devices: number; list_usd: number; offer_usd: number; note: string;
  status: "pending" | "accepted" | "countered" | "declined" | "withdrawn" | "expired" | "paid"; agreed_usd: number; admin_note: string; valid_until: string; created_at: string;
}
type Deals = DealPayload & { offers: Offer[] };

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const OFFER_BADGE: Record<Offer["status"], string> = {
  pending: "badge-amber", accepted: "badge-green", countered: "badge-gold", declined: "badge-red", withdrawn: "badge-gray", expired: "badge-gray", paid: "badge-green",
};
type Method = Options["gateways"][number];
const methodsFor = (opts: Options | null, amount: number): Method[] =>
  (opts?.gateways || []).filter((g) => opts!.lifetime.gateways.includes(g.id) && (g.id !== "stripe" || amount <= opts!.lifetime.cardMaxUsd) && (g.id !== "paypal" || amount <= (opts!.lifetime.paypalMaxUsd ?? 0)));

function MethodPicker({ methods, value, onChange, name }: { methods: Method[]; value: string; onChange: (id: string) => void; name: string }) {
  const { t } = useI18n();
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {methods.map((g) => (
        <label key={g.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${value === g.id ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-slate-200"}`}>
          <input type="radio" name={name} className="mt-1" checked={value === g.id} onChange={() => onChange(g.id)} />
          <span><span className="block font-semibold text-slate-900">{g.label}</span><span className="block text-xs text-slate-500">{g.methods}</span>{g.test ? <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">{t("pay.testMode")}</span> : null}</span>
        </label>
      ))}
    </div>
  );
}

/** One of the member's offers: status, the team's answer, and paying an agreed price. */
function OfferCard({ o, deals, opts, onPay, onChange }: { o: Offer; deals: Deals; opts: Options | null; onPay: (offerId: string, gateway: string) => Promise<string>; onChange: () => void }) {
  const { t: tr, lang } = useI18n();
  const T = LTD[lang];
  const [paying, setPaying] = useState(false);
  const [gw, setGw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const tier = deals.tiers.find((x) => x.devices === o.devices);
  const dealNow = tier ? (o.scope === "suite" ? tier.suiteDeal : tier.appDeal) : 0;
  const payable = o.status === "accepted" || o.status === "countered";
  const amount = payable && dealNow && dealNow < o.agreed_usd ? dealNow : o.agreed_usd;
  const methods = useMemo(() => methodsFor(opts, amount), [opts, amount]);
  useEffect(() => { if (!methods.some((m) => m.id === gw)) setGw(methods[0]?.id || ""); }, [methods, gw]);
  const what = `${o.scope === "suite" ? tr("lt.scopeSuite") : o.productName} · ${o.scope === "suite" ? tr("lt.devicesSuite", { n: o.devices }) : tr("lt.devicesApp", { n: o.devices })}`;

  async function withdraw() {
    if (!confirm(T.offer.withdrawAsk)) return;
    const r = await api("/api/lifetime/offers", { body: { action: "withdraw", id: o.id } });
    if (!r.ok) { setErr((T.err as Record<string, string>)[r.data?.code] || r.error); return; }
    onChange();
  }
  async function pay() {
    setBusy(true); setErr("");
    const e = await onPay(o.id, gw);
    setBusy(false);
    if (e) setErr(e);
  }

  return (
    <article className="rounded-xl border border-slate-200 p-4" data-testid="offer-card" data-status={o.status}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-900">{what}</span>
        <span className={OFFER_BADGE[o.status]}>{T.status[o.status]}</span>
        <span className="ml-auto text-xs text-slate-500">{formatDate(o.created_at, lang)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <span>{fill(T.offer.offered, { amount: formatMoney(o.offer_usd, "USD", lang) })}</span>
        <span className="text-slate-400">{fill(T.offer.listIs, { amount: formatMoney(o.list_usd, "USD", lang) })}</span>
        {o.agreed_usd ? <span className="font-semibold text-slate-900">{fill(T.offer.agreed, { amount: formatMoney(o.agreed_usd, "USD", lang) })}</span> : null}
        {payable && o.valid_until ? <span className="text-amber-700">{fill(T.offer.payBy, { date: formatDate(o.valid_until, lang) })}</span> : null}
      </div>
      {o.admin_note ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><b>{T.offer.answer}:</b> {o.admin_note}</p> : null}
      {payable && amount < o.agreed_usd ? <p className="mt-2 text-xs text-gold-700">✦ {T.offer.dealLower}</p> : null}
      {err ? <div className="mt-3"><Alert tone="error">{err}</Alert></div> : null}
      {payable && paying ? (
        <div className="mt-3">
          <div className="text-sm font-semibold text-slate-900">{tr("lt.payMethod")}</div>
          {methods.length ? <MethodPicker methods={methods} value={gw} onChange={setGw} name={`gw-${o.id}`} /> : <div className="mt-2"><Alert tone="warn">{tr("lt.noMethods")}</Alert></div>}
        </div>
      ) : null}
      {payable || o.status === "pending" ? (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button className="btn-ghost btn-sm" onClick={withdraw}>{T.offer.withdraw}</button>
          {payable ? (
            !paying
              ? <button className="btn-primary btn-sm" onClick={() => setPaying(true)} data-testid="offer-pay">{fill(T.offer.payAgreed, { amount: formatMoney(amount, "USD", lang) })} →</button>
              : <button className="btn-primary btn-sm" onClick={pay} disabled={busy || !gw} data-testid="offer-pay-go">{busy ? <Spinner /> : null} {fill(T.offer.payAgreed, { amount: formatMoney(amount, "USD", lang) })} →</button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
interface Options { gateways: { id: string; label: string; methods: string; currency: string; test?: boolean }[]; lifetime: { gateways: string[]; cardMaxUsd: number; paypalMaxUsd?: number } }

const APPS = SELF_HOSTED.map((p) => ({ slug: p.slug, name: catalogEntry(p.slug)?.name || p.slug }));

function save(file: string, filename: string) {
  const url = URL.createObjectURL(new Blob([file], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function LicenceCard({ lic, onChange }: { lic: Licence; onChange: () => void }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState("");
  const [form, setForm] = useState({ machineId: "", label: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function activate(product: string) {
    setBusy(true); setMsg(null);
    const r = await api<{ file: string; filename: string }>("/api/lifetime", { body: { action: "activate", licenseId: lic.id, product, ...form } });
    setBusy(false);
    if (!r.ok) { setMsg({ tone: "error", text: r.error }); return; }
    save(r.data.file, r.data.filename);
    setMsg({ tone: "success", text: t("lt.activated", { file: r.data.filename }) });
    setForm({ machineId: "", label: "" }); setOpen("");
    onChange();
  }

  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-bold text-slate-900">{lic.id}</span>
        <span className="font-semibold text-slate-900">· {lic.scope === "suite" ? t("lt.scopeSuite") : lic.name}</span>
        <StatusBadge status={lic.status} label={statusLabel(t, lic.status)} />
      </div>
      <div className="mt-1 text-sm text-slate-600">
        {lic.scope === "suite" ? t("lt.devicesSuite", { n: lic.devices }) : t("lt.devicesApp", { n: lic.devices })} ·{" "}
        {lic.updatesActive ? t("lt.updatesUntil", { date: formatDate(lic.updates_until, lang) }) : <span className="text-amber-700">{t("lt.updatesEnded")}</span>}
      </div>
      {lic.install_key && lic.status === "active" ? (
        <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/50 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{t("lt.installKey")}:</span>
            <code className="rounded bg-white px-2 py-1 text-xs font-bold">{lic.install_key}</code>
            <CopyButton text={lic.install_key} />
          </div>
          <p className="mt-1 text-xs text-slate-600">{t("lt.installHint")}</p>
          <code className="mt-1 block break-all text-[11px] text-slate-500">axto-setup install {lic.scope === "suite" ? "<app>" : lic.product} --key {lic.install_key}</code>
        </div>
      ) : null}
      {msg ? <div className="mt-3"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <div className="mt-3 space-y-2">
        {lic.products.map((p) => {
          const acts = lic.activations.filter((a) => a.product === p.slug && !a.revoked_at);
          return (
            <div key={p.slug} className="rounded-lg bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{p.name}</span>
                <span className="text-xs text-slate-500">{t("lt.used", { used: p.used, total: lic.devices })}</span>
                <span className="ml-auto flex flex-wrap gap-2">
                  <Link href={`/self-hosted/${p.slug}/guide`} className="btn-ghost btn-sm">📘 {t("lt.guide")}</Link>
                  {lic.status === "active" && p.used < lic.devices ? (
                    <button className="btn-primary btn-sm" onClick={() => { setOpen(open === p.slug ? "" : p.slug); setMsg(null); }}>🔑 {t("lt.activateBtn")}</button>
                  ) : null}
                </span>
              </div>
              {open === p.slug ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Field label={t("lt.machineId")} hint={t("lt.machineIdHint")}>
                    <input className="input font-mono" maxLength={32} placeholder="0123456789abcdef0123456789abcdef" value={form.machineId}
                      onChange={(e) => setForm({ ...form, machineId: e.target.value.trim().toLowerCase() })} />
                  </Field>
                  <Field label={t("lt.label")}>
                    <input className="input" maxLength={80} placeholder={t("lt.labelPh")} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                  </Field>
                  <button className="btn-primary" disabled={busy || !/^[0-9a-f]{32}$/.test(form.machineId)} onClick={() => activate(p.slug)}>
                    {busy ? <Spinner /> : null} {t("lt.activate")}
                  </button>
                </div>
              ) : null}
              {acts.length ? (
                <ul className="mt-2 divide-y divide-slate-200 text-sm">
                  {acts.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 py-1.5">
                      <span className="text-slate-900">{a.label || "—"}</span>
                      <code className="text-xs text-slate-500">{a.machine_id.slice(0, 12)}…</code>
                      <span className="text-xs text-slate-500">{formatDate(a.created_at, lang)}</span>
                      <a className="ml-auto text-sm font-semibold" href={`/api/lifetime/file?id=${a.id}`}>⬇ {t("lt.download")}</a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {lic.updatesActive && lic.status === "active" ? (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span className="text-slate-500">{t("lt.downloads")}:</span>
                  {(p.files?.images || []).map((name) => (
                    <a key={name} href={`/api/selfhosted/download?product=${p.slug}&file=${name}`}>🐳 {name}.tar.gz</a>
                  ))}
                  {(p.files?.arm64 || []).map((name) => (
                    <a key={name} href={`/api/selfhosted/download?product=${p.slug}&file=${name}`}>🐳 {name}.tar.gz (ARM64)</a>
                  ))}
                  {!p.files?.images.length ? <span className="text-slate-400">{t("sh.preparing")}</span> : null}
                  {/* Windows: the one installer (runs the same images in Docker Desktop / WSL 2). */}
                  <a href="/api/download/installer?os=windows">🪟 AXTO Setup (Windows)</a>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function LifetimeInner() {
  const { t, lang } = useI18n();
  const q = useSearchParams();
  const [d, setD] = useState<Data | null>(null);
  const [opts, setOpts] = useState<Options | null>(null);
  const [scope, setScope] = useState<"app" | "suite">("app");
  const [product, setProduct] = useState(APPS[0].slug);
  const [devices, setDevices] = useState(1);
  const [gateway, setGateway] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pay, setPay] = useState<Pay | null>(null);
  const [deals, setDeals] = useState<Deals | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerForm, setOfferForm] = useState({ price: "", note: "" });
  const [offerMsg, setOfferMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const T = LTD[lang];

  const load = useCallback(async () => { const r = await api<Data>("/api/lifetime"); if (r.ok) setD(r.data); }, []);
  const loadDeals = useCallback(async () => { const r = await api<Deals>("/api/lifetime/offers"); if (r.ok) setDeals(r.data); }, []);
  useEffect(() => { load(); loadDeals(); api<Options>("/api/billing/options").then((r) => r.ok && setOpts(r.data)); }, [load, loadDeals]);

  const tier = d?.tiers.find((x) => x.devices === devices) || d?.tiers[0];
  const list = tier ? tier[scope] : 0;
  // Today's price (server-computed deal); checkout recomputes it, the browser only displays it.
  const dt = deals?.tiers.find((x) => x.devices === devices);
  const pct = deals?.deal.active?.pct || 0;
  const amount = dt && pct ? Math.min(list, scope === "suite" ? dt.suiteDeal : dt.appDeal) : list;
  const methods = useMemo(() => methodsFor(opts, amount), [opts, amount]);
  useEffect(() => { if (!methods.some((m) => m.id === gateway)) setGateway(methods[0]?.id || ""); }, [methods, gateway]);
  const errText = (r: { error: string; data: any }) => (T.err as Record<string, string>)[r.data?.code] || r.error;

  async function startCheckout(body: Record<string, unknown>): Promise<string> {
    const r = await api<any>("/api/billing/checkout", { body: { kind: "lifetime", ...body } });
    if (!r.ok) return errText(r);
    if (r.data.url) { window.location.href = r.data.url; return ""; }
    setPay(payFromCheckout(r.data));
    setTimeout(() => document.getElementById("pay-panel")?.scrollIntoView({ behavior: "smooth" }), 50);
    return "";
  }
  async function checkout() {
    setBusy(true); setErr("");
    const e = await startCheckout({ scope, product: scope === "app" ? product : undefined, devices, gateway });
    setBusy(false);
    if (e) setErr(e);
  }
  async function sendOffer() {
    setBusy(true); setOfferMsg(null);
    const r = await api<{ offer: Offer }>("/api/lifetime/offers", { body: { action: "make", scope, product: scope === "app" ? product : undefined, devices, offerUsd: Number(offerForm.price), note: offerForm.note } });
    setBusy(false);
    if (!r.ok) { setOfferMsg({ tone: "error", text: errText(r) }); return; }
    setOfferMsg({ tone: "success", text: T.offer.sent });
    setOfferForm({ price: "", note: "" }); setOfferOpen(false);
    loadDeals();
  }

  if (!d) return <LoadingBlock />;
  const what = `${scope === "suite" ? t("lt.scopeSuite") : APPS.find((a) => a.slug === product)?.name || product} · ${scope === "suite" ? t("lt.devicesSuite", { n: devices }) : t("lt.devicesApp", { n: devices })}`;
  return (
    <>
      <PageHeader title={t("lt.title")} description={t("lt.sub")} />
      <div className="space-y-5">
        {q.get("paid") ? <Alert tone="success">{t("lt.paid")}</Alert> : null}
        {q.get("canceled") ? <Alert tone="warn">{t("pay.canceled")}</Alert> : null}
        {q.get("error") ? <Alert tone="error">{t("pay.error")}</Alert> : null}

        <Section title={t("lt.mine")}>
          {d.licenses.length ? (
            <div className="space-y-3">{d.licenses.map((l) => <LicenceCard key={l.id} lic={l} onChange={load} />)}</div>
          ) : <EmptyState icon="♾️" title={t("lt.none")} />}
        </Section>

        {deals?.offers.length ? (
          <section id="offers" className="scroll-mt-20">
            <Section title={T.offer.mine}>
              <div className="space-y-3">{deals.offers.map((o) => <OfferCard key={o.id} o={o} deals={deals} opts={opts} onChange={loadDeals} onPay={(offerId, gw) => startCheckout({ offerId, gateway: gw })} />)}</div>
            </Section>
          </section>
        ) : null}

        <Section title={t("lt.buy")}>
          {deals ? <div className="mb-5"><DealBanner deal={deals.deal} rules={deals.rules} onExpire={loadDeals} /></div> : null}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {(["app", "suite"] as const).map((s) => (
              <button key={s} onClick={() => { setScope(s); setPay(null); }} className={`rounded-md px-4 py-1.5 text-sm font-semibold ${scope === s ? "bg-ink-900 text-white" : "text-slate-600"}`}>
                {s === "app" ? t("lt.scopeApp") : t("lt.scopeSuite")}
              </button>
            ))}
          </div>
          {scope === "app" ? (
            <div className="mt-4 max-w-sm">
              <Field label={t("lt.chooseApp")}>
                <select className="select" value={product} onChange={(e) => { setProduct(e.target.value); setPay(null); }}>
                  {APPS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
                </select>
              </Field>
            </div>
          ) : null}
          <div className="mt-4 text-sm font-semibold text-slate-900">{t("lt.chooseDevices")}</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {d.tiers.map((x) => (
              <button key={x.devices} onClick={() => { setDevices(x.devices); setPay(null); }}
                className={`rounded-xl border p-3 text-left ${devices === x.devices ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-slate-200 bg-white"}`}>
                <div className="text-xs font-semibold text-slate-500">{scope === "suite" ? t("lt.devicesSuite", { n: x.devices }) : t("lt.devicesApp", { n: x.devices })}</div>
                <div className="mt-1"><DealPrice big list={x[scope]} price={(() => { const y = deals?.tiers.find((z) => z.devices === x.devices); return y ? (scope === "suite" ? y.suiteDeal : y.appDeal) : x[scope]; })()} pct={pct} /></div>
              </button>
            ))}
          </div>
          <ul className="mt-4 grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
            {(["lt.inc1", "lt.inc2", "lt.inc3", "lt.inc4", "lt.inc5"] as const).map((k) => <li key={k} className="flex gap-2"><span className="text-brand-600">✓</span>{t(k)}</li>)}
          </ul>

          <div className="mt-5 text-sm font-semibold text-slate-900">{t("lt.payMethod")}</div>
          {methods.length ? <MethodPicker methods={methods} value={gateway} onChange={(id) => { setGateway(id); setPay(null); }} name="lt-gw" />
            : <div className="mt-2"><Alert tone="warn">{t("lt.noMethods")}</Alert></div>}
          {opts && amount > opts.lifetime.cardMaxUsd ? <p className="mt-2 text-xs text-slate-500">{t("lt.cardLimit", { max: formatMoney(opts.lifetime.cardMaxUsd, "USD", lang) })}</p> : null}
          {err ? <div className="mt-3"><Alert tone="error">{err}</Alert></div> : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button className="btn-ghost" onClick={() => openSupport("lifetime")}>💬 {t("lt.quote")} {t("lt.talk")} →</button>
            {!pay ? (
              <span className="flex flex-col items-end gap-1">
                {amount < list ? <span className="text-xs font-semibold text-gold-700">✦ {fill(T.deal.save, { amount: formatMoney(list - amount, "USD", lang) })}</span> : null}
                <button className="btn-primary btn-lg" onClick={checkout} disabled={busy || !gateway} data-testid="lt-pay">
                  {busy ? <Spinner /> : null} {t("lt.pay", { amount: formatMoney(amount, "USD", lang) })} →
                </button>
              </span>
            ) : null}
          </div>

          {/* Customer offer: the team accepts, counters or declines it by hand. */}
          <div className="mt-6 border-t border-slate-200 pt-5" data-testid="offer-box">
            {offerMsg ? <div className="mb-3"><Alert tone={offerMsg.tone}>{offerMsg.text}</Alert></div> : null}
            {deals && !deals.offersEnabled ? <p className="text-sm text-slate-500">{T.offer.closed}</p> : !offerOpen ? (
              <button className="btn-secondary" onClick={() => { setOfferOpen(true); setOfferMsg(null); }} data-testid="offer-open">💬 {T.offer.open}</button>
            ) : (
              <div className="rounded-2xl border border-gold-200 bg-gold-50/40 p-4">
                <div className="font-display text-lg font-bold text-slate-900">{T.offer.title}</div>
                <p className="mt-1 text-sm text-slate-600">{fill(T.offer.lead, { days: deals?.offerValidDays ?? 7 })}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{fill(T.offer.forWhat, { what })} <span className="font-normal text-slate-500">· {fill(T.offer.listIs, { amount: formatMoney(list, "USD", lang) })}</span></p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[12rem_1fr]">
                  <Field label={T.offer.price}>
                    <input className="input" type="number" inputMode="numeric" min={1} step={1} value={offerForm.price} onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })} data-testid="offer-price" />
                  </Field>
                  <Field label={T.offer.note}>
                    <input className="input" maxLength={600} placeholder={T.offer.notePh} value={offerForm.note} onChange={(e) => setOfferForm({ ...offerForm, note: e.target.value })} />
                  </Field>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button className="btn-ghost" onClick={() => setOfferOpen(false)}>✕</button>
                  <button className="btn-primary" onClick={sendOffer} disabled={busy || !(Number(offerForm.price) >= 1)} data-testid="offer-send">{busy ? <Spinner /> : null} {T.offer.send}</button>
                </div>
              </div>
            )}
          </div>
        </Section>

        {pay ? <PayPanel pay={pay} onBack={() => setPay(null)} onPaid={() => { load(); loadDeals(); }} paidText={t("lt.paid")} /> : null}

        <Section title={t("lt.how")}>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
            {(["lt.how1", "lt.how2", "lt.how3", "lt.how4", "lt.how5"] as const).map((k) => <li key={k}>{t(k)}</li>)}
          </ol>
        </Section>
      </div>
    </>
  );
}

export default function LifetimePage() {
  return <Suspense fallback={<LoadingBlock />}><LifetimeInner /></Suspense>;
}
