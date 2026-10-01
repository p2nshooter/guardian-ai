/* ==============================================================================
 * Settings → My AI keys → Local Mode: connect a model server on this device
 * (Ollama, LM Studio or any OpenAI-compatible server), pick a model, test it.
 * Everything here happens in the browser; the settings stay in this browser.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { pick, type Lang } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { Alert, Section, Spinner } from "@/components/ui";
import { LOCALAI } from "@/lib/i18n-pages/localai";
import { LOCAL_KINDS, clearLocal, describeLocalError, isOnDevice, loadLocal, localChat, localModels, localUrlProblem, saveLocal, type LocalKind, type LocalSettings } from "@/lib/ai/local";

const KINDS = Object.keys(LOCAL_KINDS) as LocalKind[];

export default function LocalModeSettings({ lang }: { lang: Lang }) {
  const t = pick(LOCALAI, lang);
  const { me } = useMe();
  const [saved, setSaved] = useState<LocalSettings | null>(null);
  const [form, setForm] = useState<{ kind: LocalKind; baseUrl: string; model: string; preferred: boolean }>({ kind: "ollama", baseUrl: LOCAL_KINDS.ollama.base, model: "", preferred: true });
  const [models, setModels] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<"" | "detect" | "test">("");
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [origin, setOrigin] = useState("https://axto.io");

  useEffect(() => {
    setOrigin(window.location.origin);
    const v = loadLocal();
    setSaved(v);
    if (v) setForm({ kind: v.kind, baseUrl: v.baseUrl, model: v.model, preferred: v.preferred });
  }, []);

  const planOk = !!me?.limits?.localMode;
  const available = !!me?.localMode;
  const urlError = (() => { const p = localUrlProblem(form.baseUrl); return p ? t.errors[p] : ""; })();
  const fail = (e: unknown) => setMsg({ tone: "error", text: describeLocalError(e, form, t.errors, origin) });

  async function detect() {
    if (urlError) return setMsg({ tone: "error", text: urlError });
    setBusy("detect"); setMsg(null);
    try {
      const list = await localModels(form.baseUrl, AbortSignal.timeout(8000));
      setModels(list);
      if (list.length && !list.includes(form.model)) setForm((f) => ({ ...f, model: list[0] }));
      setMsg(list.length ? { tone: "success", text: t.found.replace("{n}", String(list.length)) } : { tone: "info", text: t.noModels });
    } catch (e) { fail(e); }
    setBusy("");
  }
  async function test() {
    if (urlError) return setMsg({ tone: "error", text: urlError });
    setBusy("test"); setMsg(null);
    const t0 = performance.now();
    let out = "";
    try {
      for await (const c of localChat(form, { system: "You are a helpful assistant. Reply briefly.", messages: [{ role: "user", content: "Say hello in five words." }], maxOutputTokens: 40 }, AbortSignal.timeout(60000))) {
        out += c;
        if (out.length > 160) break;
      }
      setMsg({ tone: "success", text: t.testOk.replace("{ms}", String(Math.round(performance.now() - t0))).replace("{text}", out.trim().slice(0, 160)) });
    } catch (e) { fail(e); }
    setBusy("");
  }
  function save() {
    if (urlError) return setMsg({ tone: "error", text: urlError });
    if (!form.model.trim()) return setMsg({ tone: "error", text: t.errors.model.replace("{model}", "—") });
    setSaved(saveLocal(form));
    setMsg({ tone: "success", text: t.saved });
  }
  function off() { clearLocal(); setSaved(null); setMsg({ tone: "info", text: t.off }); }

  const badge = saved
    ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800" data-testid="local-state">🖥️ {t.on.replace("{model}", saved.model)}</span>
    : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600" data-testid="local-state">{t.offBadge}</span>;

  return (
    <Section title={`🖥️ ${t.title}`} description={t.sub} actions={badge}>
      <div data-testid="local-mode">
        {me && !planOk ? <div className="mb-4"><Alert tone="info">{t.needPlan} <Link href="/app/billing?plan=starter" className="ml-1 font-semibold underline">→</Link></Alert></div> : null}
        {me && planOk && !available ? <div className="mb-4"><Alert tone="warn">{t.unavailable}</Alert></div> : null}
        <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] [&>*]:min-w-0">
          <label className="block"><span className="label">{t.kind}</span>
            <select className="select" value={form.kind} data-testid="local-kind"
              onChange={(e) => { const k = e.target.value as LocalKind; setForm((f) => ({ ...f, kind: k, baseUrl: LOCAL_KINDS[k].base })); setModels(null); }}>
              {KINDS.map((k) => <option key={k} value={k}>{t.kinds[k]}</option>)}
            </select></label>
          <label className="block"><span className="label">{t.baseUrl} <span className="ml-1 text-[11px] font-normal text-slate-500">{!urlError ? (isOnDevice(form.baseUrl) ? t.deviceOnly : t.network) : ""}</span></span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="input min-w-0 flex-1 font-mono text-sm" value={form.baseUrl} spellCheck={false} data-testid="local-url"
                onChange={(e) => { setForm((f) => ({ ...f, baseUrl: e.target.value })); setModels(null); }} />
              <button type="button" className="btn-secondary shrink-0" onClick={detect} disabled={!!busy} data-testid="local-detect">{busy === "detect" ? <><Spinner /> {t.detecting}</> : `🔍 ${t.detect}`}</button>
            </div>
            {urlError ? <span className="mt-1 block text-xs text-rose-600">{urlError}</span> : null}
          </label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end [&>*]:min-w-0">
          <label className="block"><span className="label">{t.model}</span>
            {models?.length ? (
              <select className="select font-mono text-sm" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} data-testid="local-model">
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input className="input font-mono text-sm" value={form.model} placeholder={t.modelPh} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} data-testid="local-model" />
            )}
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={form.preferred} onChange={(e) => setForm((f) => ({ ...f, preferred: e.target.checked }))} /> {t.preferred}</label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={save} disabled={!!busy || !planOk} data-testid="local-save">{t.save}</button>
          <button type="button" className="btn-secondary" onClick={test} disabled={!!busy || !form.model.trim()} data-testid="local-test">{busy === "test" ? <><Spinner /> {t.testing}</> : `⚡ ${t.test}`}</button>
          {saved ? <button type="button" className="btn-ghost text-rose-600" onClick={off} data-testid="local-off">{t.turnOff}</button> : null}
        </div>
        {msg ? <div className="mt-3" data-testid="local-msg"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="text-sm font-semibold text-emerald-900">🔒 {t.privacyTitle}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">{t.privacy.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold">🧰 {t.setupTitle} · {LOCAL_KINDS[form.kind].name}</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {t.setup[form.kind].map((p) => <li key={p} className="break-words">{p.replace(/\{origin\}/g, origin)}</li>)}
            </ol>
            {LOCAL_KINDS[form.kind].site ? <a href={LOCAL_KINDS[form.kind].site} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">{LOCAL_KINDS[form.kind].site.replace(/^https:\/\//, "")} ↗</a> : null}
          </div>
        </div>
        <details className="mt-4 text-sm text-slate-600">
          <summary className="cursor-pointer font-semibold">{t.notesTitle}</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">{t.notes.map((n) => <li key={n}>{n.replace(/\{origin\}/g, origin)}</li>)}</ul>
        </details>
      </div>
    </Section>
  );
}
