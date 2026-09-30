/* Member: Lifetime licences — perpetual, OFFLINE self-hosted licences.
 * Buy (one app or the suite, 1–100 devices per app), then activate each device
 * with the machine id the app shows on first start: the portal returns a
 * signed .axto-license file the engine verifies locally, with no internet. */
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

interface Tier { devices: number; label: string; app: number; suite: number }
interface Activation { id: string; product: string; machine_id: string; label: string; created_at: string; revoked_at: string }
interface Licence {
  id: string; scope: "app" | "suite"; product: string; name: string; devices: number; updates_until: string; status: string; created_at: string; install_key?: string;
  updatesActive: boolean; activations: Activation[]; products: { slug: string; name: string; used: number; files?: { images: string[]; arm64?: string[] } }[];
}
interface Data { licenses: Licence[]; tiers: Tier[]; cardMaxUsd: number }
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

  const load = useCallback(async () => { const r = await api<Data>("/api/lifetime"); if (r.ok) setD(r.data); }, []);
  useEffect(() => { load(); api<Options>("/api/billing/options").then((r) => r.ok && setOpts(r.data)); }, [load]);

  const tier = d?.tiers.find((x) => x.devices === devices) || d?.tiers[0];
  const amount = tier ? tier[scope] : 0;
  const methods = useMemo(() => (opts?.gateways || []).filter((g) => opts!.lifetime.gateways.includes(g.id) && (g.id !== "stripe" || amount <= opts!.lifetime.cardMaxUsd) && (g.id !== "paypal" || amount <= (opts!.lifetime.paypalMaxUsd ?? 0))), [opts, amount]);
  useEffect(() => { if (!methods.some((m) => m.id === gateway)) setGateway(methods[0]?.id || ""); }, [methods, gateway]);

  async function checkout() {
    setBusy(true); setErr("");
    const r = await api<any>("/api/billing/checkout", { body: { kind: "lifetime", scope, product: scope === "app" ? product : undefined, devices, gateway } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    if (r.data.url) { window.location.href = r.data.url; return; }
    setPay(payFromCheckout(r.data));
    setTimeout(() => document.getElementById("pay-panel")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  if (!d) return <LoadingBlock />;
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

        <Section title={t("lt.buy")}>
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
                <div className="mt-1 text-lg font-extrabold text-slate-900">{formatMoney(x[scope], "USD", lang)}</div>
              </button>
            ))}
          </div>
          <ul className="mt-4 grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
            {(["lt.inc1", "lt.inc2", "lt.inc3", "lt.inc4", "lt.inc5"] as const).map((k) => <li key={k} className="flex gap-2"><span className="text-brand-600">✓</span>{t(k)}</li>)}
          </ul>

          <div className="mt-5 text-sm font-semibold text-slate-900">{t("lt.payMethod")}</div>
          {methods.length ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {methods.map((g) => (
                <label key={g.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${gateway === g.id ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-slate-200"}`}>
                  <input type="radio" name="lt-gw" className="mt-1" checked={gateway === g.id} onChange={() => { setGateway(g.id); setPay(null); }} />
                  <span><span className="block font-semibold text-slate-900">{g.label}</span><span className="block text-xs text-slate-500">{g.methods}</span>{g.test ? <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">{t("pay.testMode")}</span> : null}</span>
                </label>
              ))}
            </div>
          ) : <div className="mt-2"><Alert tone="warn">{t("lt.noMethods")}</Alert></div>}
          {opts && amount > opts.lifetime.cardMaxUsd ? <p className="mt-2 text-xs text-slate-500">{t("lt.cardLimit", { max: formatMoney(opts.lifetime.cardMaxUsd, "USD", lang) })}</p> : null}
          {err ? <div className="mt-3"><Alert tone="error">{err}</Alert></div> : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button className="btn-ghost" onClick={() => openSupport("lifetime")}>💬 {t("lt.quote")} {t("lt.talk")} →</button>
            {!pay ? (
              <button className="btn-primary btn-lg" onClick={checkout} disabled={busy || !gateway}>
                {busy ? <Spinner /> : null} {t("lt.pay", { amount: formatMoney(amount, "USD", lang) })} →
              </button>
            ) : null}
          </div>
        </Section>

        {pay ? <PayPanel pay={pay} onBack={() => setPay(null)} onPaid={load} paidText={t("lt.paid")} /> : null}

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
