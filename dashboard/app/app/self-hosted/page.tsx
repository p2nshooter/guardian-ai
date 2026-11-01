/* ==============================================================================
 * Member: Self-hosted apps — the 10 apps of the owner's picture, each with the
 * member's licences (from the plan, a bought edition, or a trial), buying an
 * edition, the "100 trial licences per app" programme, AXTO Setup for
 * Windows/Linux/macOS, and manual Docker instructions per app.
 * docs/AXTO-APPS-BLUEPRINT.md §3–§4.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useI18n, formatDate, formatMoney, pick, statusLabel } from "@/lib/i18n";
import { Alert, CopyButton, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";
import AppIcon from "@/components/site/AppIcon";
import EditionPicker, { type PublicEdition } from "@/components/app/EditionPicker";
import { L } from "@/lib/i18n-pages/selfhosted";
import { SH_TAGLINES } from "@/lib/i18n-pages/shtaglines";
import { ED } from "@/lib/i18n-pages/editions";
import { APP_COLORS } from "@/lib/ecosystem";
import { buildSize } from "@/lib/byte-range";

interface Licence {
  id: string; source: "plan" | "edition" | "trial"; package_code: string; edition: string; license_key: string; status: string; expires_at: string;
  max_nodes: number; bound_machine_id: string; last_seen_at: string; last_version: string; held?: number;
}
interface Product {
  slug: string; name: string; emoji: string; tagline: string; port: number; compose: string; config: string; configTarget: string; licenseField: string;
  images: { name: string; label: string; optional?: boolean; gpu?: boolean; available: boolean; size: number; arm64?: boolean; arm64Size?: number }[];
  offline: number; // bytes of the offline package (AXTO Setup + every image), 0 = being built
  licenses: Licence[];
  trial: { available: number; total: number; used: boolean; rating: number; edition: string };
}
interface Data { tier: string; planName: string; allowance: number; nodes: number; used: number; periodEnd: string; products: Product[]; trials: { open: boolean; days: number; maxProducts: number; used: number } }

const SOURCE_STYLE: Record<string, string> = { plan: "badge-brand", edition: "badge-gold", trial: "badge-amber" };

function SelfHostedInner() {
  const { lang, t: tt } = useI18n();
  const t = pick(L, lang);
  const e = ED[lang].ui;
  const q = useSearchParams();
  const [d, setD] = useState<Data | null>(null);
  const [editions, setEditions] = useState<PublicEdition[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [open, setOpen] = useState("");
  const [picker, setPicker] = useState<Product | null>(null);
  const [rated, setRated] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const [r, ed] = await Promise.all([api<Data>("/api/selfhosted"), api<{ editions: PublicEdition[] }>("/api/editions")]);
    if (r.ok) setD(r.data); else setMsg({ tone: "error", text: r.error });
    if (ed.ok) setEditions(ed.data.editions);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(product: string, action: "issue" | "reset" | "release", source = "plan") {
    if (action === "release" && !confirm(t.confirmRelease)) return;
    setBusy(`${action}-${product}-${source}`); setMsg(null);
    const r = await api("/api/selfhosted", { body: { action, product, source } });
    setBusy("");
    setMsg(r.ok ? { tone: "success", text: t.done } : { tone: "error", text: r.error });
    load();
  }
  async function startTrial(product: string) {
    setBusy(`trial-${product}`); setMsg(null);
    const r = await api<{ trial: { key: string } }>("/api/selfhosted", { body: { action: "trial", product } });
    setBusy("");
    setMsg(r.ok ? { tone: "success", text: e.trialStarted } : { tone: "error", text: r.error });
    load();
  }
  async function rate(product: string, rating: number) {
    const r = await api("/api/selfhosted", { body: { action: "rate", product, rating } });
    if (r.ok) setRated({ ...rated, [product]: rating });
  }

  if (!d) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const slotsLeft = d.allowance < 0 ? Infinity : d.allowance - d.used;
  const anyActive = d.products.some((p) => p.licenses.some((l) => l.status === "active" && !l.held));
  const fromPrice = (slug: string) => {
    const list = editions.filter((x) => x.app === slug);
    return list.length ? Math.min(...list.map((x) => x.monthly)) : 0;
  };

  return (
    <>
      <PageHeader title={t.title} description={t.sub} />
      <div className="space-y-5">
        {q.get("paid") ? <Alert tone="success">{e.paid}</Alert> : null}
        {q.get("canceled") ? <Alert tone="warn">{tt("pay.canceled")}</Alert> : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card-pad"><div className="text-xs font-semibold uppercase text-slate-500">{t.allowance}</div><div className="mt-1 text-2xl font-bold">{d.allowance === 0 ? "—" : `${d.used} / ${d.allowance < 0 ? t.unlimited : d.allowance}`}</div>{d.allowance === 0 ? <Link href="/app/billing?plan=business" className="mt-1 block text-xs font-semibold">{t.upgrade} →</Link> : null}</div>
          <div className="card-pad"><div className="text-xs font-semibold uppercase text-slate-500">{e.trialBadge}</div><div className="mt-1 text-2xl font-bold">{d.trials.used} / {d.trials.maxProducts}</div><div className="mt-1 text-xs text-slate-500">{d.trials.open ? e.trialLead.replace("{days}", String(d.trials.days)).replace("{edition}", "Professional").replace("{max}", String(d.trials.maxProducts)) : e.trialClosed}</div></div>
          <div className="card-pad"><div className="text-xs font-semibold uppercase text-slate-500">{d.allowance === 0 ? e.editionsTitle : t.validUntil}</div><div className="mt-1 text-2xl font-bold">{d.allowance === 0 ? "10" : formatDate(d.periodEnd, lang)}</div>{d.allowance === 0 ? <div className="mt-1 text-xs text-slate-500">{e.editionsLead}</div> : null}</div>
        </div>
        {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}

        <Section title={t.appsTitle}>
          {d.allowance > 0 && slotsLeft <= 0 ? <div className="mb-3"><Alert tone="info">{t.noSlots}</Alert></div> : null}
          <div className="space-y-3">
            {d.products.map((p) => {
              const color = APP_COLORS[p.slug] || "#2f82ff";
              const lics = p.licenses.filter((l) => l.status !== "revoked" || l.held);
              const paid = lics.some((l) => l.source !== "trial" && l.status === "active");
              const plan = lics.find((l) => l.source === "plan");
              const ed = lics.find((l) => l.source === "edition");
              const canTrial = d.trials.open && !p.trial.used && !paid && p.trial.available > 0 && d.trials.used < d.trials.maxProducts;
              const low = fromPrice(p.slug);
              return (
                <article key={p.slug} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-shadow duration-300 hover:shadow-lift" data-testid={`sh-app-${p.slug}`}>
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${color}1a`, color }}><AppIcon slug={p.slug} kind="self" size={22} /></span>
                    <div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{p.name}</div><div className="text-sm text-slate-500">{SH_TAGLINES[lang][p.slug] || p.tagline}</div></div>
                    <div className="flex flex-wrap items-center gap-2">
                      {d.allowance !== 0 && !plan ? (
                        <button className="btn-primary btn-sm" onClick={() => act(p.slug, "issue")} disabled={!!busy || slotsLeft <= 0} data-testid={`sh-issue-${p.slug}`}>{busy === `issue-${p.slug}-plan` ? <><Spinner className="h-3 w-3" /> {t.issuing}</> : t.issue}</button>
                      ) : null}
                      {!plan || plan.status !== "active" ? (
                        <button className="btn-secondary btn-sm" onClick={() => setPicker(p)} data-testid={`sh-buy-${p.slug}`}>🧩 {ed ? e.compare : e.buyEdition}{low ? <span className="ml-1 text-xs font-normal text-slate-500">{e.from.replace("{amount}", `${formatMoney(low, "USD", lang)}${e.perMonth}`)}</span> : null}</button>
                      ) : null}
                      {canTrial ? (
                        <button className="btn-sm btn rounded-lg border border-gold-300 bg-gold-50 text-gold-700 hover:bg-gold-100" onClick={() => startTrial(p.slug)} disabled={!!busy} data-testid={`sh-trial-${p.slug}`}>
                          {busy === `trial-${p.slug}` ? <><Spinner className="h-3 w-3" /> {e.trialStarting}</> : <>🎟️ {e.trialStart.replace("{days}", String(d.trials.days))}</>}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {d.trials.open && !paid && !p.trial.used && p.trial.total ? (
                    <div className="mt-2 text-xs text-slate-500">{p.trial.available ? e.trialLeft.replace("{n}", String(p.trial.available)).replace("{total}", String(p.trial.total)) : e.trialSoldOut}</div>
                  ) : null}

                  {lics.map((l) => {
                    const held = !!l.held;
                    const live = l.status === "active" && !held;
                    return (
                      <div key={l.id} className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-sm" data-testid={`sh-lic-${p.slug}-${l.source}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={SOURCE_STYLE[l.source] || "badge-gray"}>{l.source === "plan" ? e.sourcePlan : l.source === "edition" ? e.sourceEdition : e.sourceTrial}</span>
                          {l.edition ? <span className="font-semibold text-slate-800">{l.edition}</span> : null}
                          {held ? <span className="badge-red">🔒 {tt("sh.held")}</span> : <StatusBadge status={l.status} label={statusLabel(tt, l.status)} />}
                          <span className="text-xs text-slate-500">{(l.source === "trial" ? e.trialEnds : e.validUntil).replace("{date}", formatDate(l.expires_at, lang))}</span>
                        </div>
                        {live ? (
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <div className="flex flex-wrap items-center gap-2 sm:col-span-2"><span className="text-slate-500">{t.key}:</span><code className="rounded bg-white px-2 py-1 text-xs font-bold">{l.license_key}</code><CopyButton text={l.license_key} /></div>
                            <div className="sm:col-span-2 text-xs text-slate-500">{e.keyHint} <code className="break-all">./axto-setup install {p.slug} --key {l.license_key}</code></div>
                            <div><span className="text-slate-500">{t.server}:</span> <span className="text-xs">{l.bound_machine_id ? l.bound_machine_id.slice(0, 16) + "…" : t.never}</span></div>
                            <div><span className="text-slate-500">{t.lastSeen}:</span> {l.last_seen_at ? `${formatDate(l.last_seen_at, lang)} · v${l.last_version || "?"}` : t.never}</div>
                            <div className="flex flex-wrap gap-2 sm:col-span-2">
                              {l.bound_machine_id ? <button className="btn-ghost btn-sm" onClick={() => act(p.slug, "reset", l.source)} disabled={!!busy}>↻ {t.reset}</button> : null}
                              <button className="btn-ghost btn-sm" onClick={() => setOpen(open === p.slug ? "" : p.slug)}>🐳 {t.manual}</button>
                              <Link href={`/self-hosted/${p.slug}/guide`} className="btn-ghost btn-sm">📘 {t.guide}</Link>
                              {l.source === "plan" && d.allowance > 0 ? <button className="btn-ghost btn-sm text-rose-600" onClick={() => act(p.slug, "release")} disabled={!!busy}>{t.release}</button> : null}
                            </div>
                          </div>
                        ) : null}
                        {l.source === "trial" ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span>{rated[p.slug] || p.trial.rating ? e.rateThanks : e.rateTitle}</span>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button key={n} type="button" aria-label={`${n}/5`} onClick={() => rate(p.slug, n)}
                                className={`text-lg leading-none transition-transform hover:scale-110 ${n <= (rated[p.slug] || p.trial.rating) ? "text-gold-500" : "text-slate-300"}`}>★</button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {lics.some((l) => l.status === "active" && !l.held) ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm" data-testid={`sh-offline-${p.slug}`}>
                      <div className="font-semibold text-slate-900">📦 {t.offlineTitle}</div>
                      {p.offline ? (
                        <>
                          <p className="mt-1 text-slate-600">{t.offlineBody.replace("{size}", buildSize(p.offline))}</p>
                          <a href={`/api/selfhosted/download?product=${p.slug}&file=offline`} className="btn-primary btn-sm mt-2 inline-flex" data-testid={`sh-offline-dl-${p.slug}`}>⬇ {t.offlineDl} · {buildSize(p.offline)}</a>
                        </>
                      ) : <p className="mt-1 text-slate-500">{t.offlinePreparing}</p>}
                      {p.images.filter((i) => i.gpu && i.available).map((i) => <p key={i.name} className="mt-2 text-xs text-slate-600">🎮 {t.gpuHint.replace("{label}", i.label).replace("{size}", buildSize(i.size))}</p>)}
                    </div>
                  ) : null}

                  {open === p.slug ? (
                    <div className="mt-3 rounded-lg bg-slate-50 p-4 text-sm">
                      <div className="font-semibold">{t.images}</div>
                      <ul className="mt-1 space-y-1">{p.images.map((i) => <li key={i.name}>{i.available ? <a href={`/api/selfhosted/download?product=${p.slug}&file=${i.name}`}>{i.label} — {i.name}.tar.gz{i.size ? ` (${buildSize(i.size)})` : ""}</a> : <span className="text-slate-400">{i.label} ({tt("sh.preparing")})</span>}{i.arm64 ? <> · <a href={`/api/selfhosted/download?product=${p.slug}&file=${i.name}-arm64`}>ARM64{i.arm64Size ? ` (${buildSize(i.arm64Size)})` : ""}</a></> : null}{i.optional ? ` · ${t.optional}` : ""}</li>)}</ul>
                      <p className="mt-1 text-xs text-slate-500">{t.resumeHint}</p>
                      <div className="mt-3 font-semibold">{t.configs}</div>
                      <ul className="mt-1 space-y-1"><li><a href={`/configs/${p.compose}`} download>{p.compose}</a></li><li><a href={`/configs/${p.config}`} download>{p.config}</a> → <code>{p.configTarget}</code></li></ul>
                      <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-700">
                        <li>{t.manualSteps[0]}</li><li>{t.manualSteps[1]} <code>{p.configTarget}</code></li><li>{t.manualSteps[2]} <code>{p.licenseField}</code></li><li>{t.manualSteps[3]}{p.port}</li>
                      </ol>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </Section>

        {anyActive || d.allowance !== 0 ? (
          <Section title={t.setupTitle} description={t.setupBody}>
            <div className="flex flex-wrap gap-2">
              <a href="/api/download/installer?os=windows" className="btn-primary">🪟 {t.win}</a>
              <a href="/api/download/installer?os=linux-amd64" className="btn-secondary">🐧 {t.linux}</a>
              <a href="/api/download/installer?os=linux-arm64" className="btn-secondary">🐧 {t.arm}</a>
              <a href="/api/download/installer?os=macos-arm64" className="btn-secondary">🍎 {t.mac}</a>
              <a href="/api/download/installer?os=sha256" className="btn-ghost">🔏 {t.sums}</a>
            </div>
            <p className="mt-4 text-sm text-slate-600">{t.linuxCmd}</p>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-slate-100">{`curl -fsSL -o axto-setup "https://axto.io/api/download/installer?os=linux-amd64"\nchmod +x axto-setup && ./axto-setup install legal --key YOUR-LICENCE-KEY`}</pre>
          </Section>
        ) : null}
      </div>

      {picker ? (
        <EditionPicker open onClose={() => setPicker(null)} app={picker.slug} appName={picker.name} editions={editions}
          currentCode={picker.licenses.find((l) => l.source === "edition" && l.status === "active")?.package_code}
          onPaid={() => { setPicker(null); setMsg({ tone: "success", text: e.paid }); load(); }} />
      ) : null}
    </>
  );
}

export default function SelfHostedPage() {
  return <Suspense fallback={<LoadingBlock />}><SelfHostedInner /></Suspense>;
}
