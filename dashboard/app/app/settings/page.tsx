/* ==============================================================================
 * Member settings: My AI keys (BYOK / BYOM / BYOE) and Local Mode (a model on
 * this device), profile, password.
 * ============================================================================ */
"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useI18n, pick, type Lang } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { Alert, Field, LoadingBlock, PageHeader, Section, Spinner, Tabs } from "@/components/ui";
import { PasswordInput } from "@/components/auth/AuthFrame";
import type { ProviderEntry } from "@/components/ai/ModelPicker";
import { L } from "@/lib/i18n-pages/settings";
import LocalModeSettings from "@/components/ai/LocalModeSettings";

interface Saved { provider: string; hint: string; model: string; baseUrl: string; createdAt: string }
interface KeysData { keys: Saved[]; preferred: string; providers: (ProviderEntry & { keyHint: string; keyUrl: string })[] }

function AiKeys({ lang }: { lang: Lang }) {
  const t = pick(L, lang);
  const { t: tg } = useI18n();
  const [data, setData] = useState<KeysData | null>(null);
  const [form, setForm] = useState({ provider: "google", value: "", model: "", baseUrl: "" });
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [tests, setTests] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [edit, setEdit] = useState<Record<string, string>>({});

  const load = async () => { const r = await api<KeysData>("/api/byox/keys"); if (r.ok) setData(r.data); };
  useEffect(() => { load(); }, []);
  if (!data) return <LoadingBlock />;
  const info = (id: string) => data.providers.find((p) => p.id === id);
  const sel = info(form.provider);

  async function save() {
    setBusy("save"); setMsg(null);
    const r = await api<KeysData>("/api/byox/keys", { body: form });
    setBusy("");
    if (!r.ok) { setMsg({ tone: "error", text: r.error }); return; }
    setData(r.data);
    const saved = form.provider;
    setForm({ provider: form.provider, value: "", model: "", baseUrl: "" });
    setMsg({ tone: "success", text: `${info(saved)?.name}: ${t.saved}` });
    test(saved);
  }
  async function test(provider: string) {
    setBusy(`test-${provider}`);
    const r = await api<{ ok: boolean; message: string }>("/api/byox/test", { body: { provider } });
    setTests((x) => ({ ...x, [provider]: { ok: !!r.data?.ok, message: r.data?.message || r.error } }));
    setBusy("");
  }
  async function loadModels(provider: string) {
    setBusy(`models-${provider}`);
    const r = await api<{ models: string[] }>("/api/byox/models", { body: { provider } });
    setModels((m) => ({ ...m, [provider]: r.data?.models || [] }));
    setBusy("");
  }
  async function setModel(provider: string) {
    const model = edit[provider];
    if (model === undefined) return;
    const r = await api<KeysData>("/api/byox/keys", { method: "PATCH", body: { provider, model } });
    if (r.ok) { setData(r.data); setEdit((e) => { const n = { ...e }; delete n[provider]; return n; }); } else setMsg({ tone: "error", text: r.error });
  }
  async function makeDefault(provider: string) {
    const r = await api<KeysData>("/api/byox/keys", { method: "PATCH", body: { preferred: provider } });
    if (r.ok) setData(r.data);
  }
  async function remove(provider: string) {
    if (!confirm(t.confirmRemove)) return;
    const r = await api<KeysData>(`/api/byox/keys?provider=${encodeURIComponent(provider)}`, { method: "DELETE" });
    if (r.ok) setData(r.data);
  }

  return (
    <div className="space-y-5">
      <Alert tone="info">{t.aiIntro}</Alert>
      <Section title={`🔑 ${t.saved}`} description={t.secure}>
        {data.keys.length ? (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {data.keys.map((k) => {
              const p = info(k.provider);
              const tr = tests[k.provider];
              return (
                <li key={k.provider} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{p?.name || k.provider}</span>
                    <code className="rounded bg-slate-100 px-1.5 text-xs">{k.hint}</code>
                    {data.preferred === k.provider ? <span className="badge-brand">★ {t.def}</span> : null}
                    {p?.research ? <span className="badge-green">🌐 {t.research}</span> : null}
                    {k.baseUrl ? <span className="truncate text-xs text-slate-500">{k.baseUrl}</span> : null}
                    <div className="ml-auto flex flex-wrap gap-1.5">
                      {p?.chat ? <button className="btn-secondary btn-sm" onClick={() => test(k.provider)} disabled={busy === `test-${k.provider}`}>{busy === `test-${k.provider}` ? <><Spinner className="h-3 w-3" /> {t.testing}</> : `⚡ ${t.test}`}</button> : null}
                      {p?.chat && data.preferred !== k.provider ? <button className="btn-ghost btn-sm" onClick={() => makeDefault(k.provider)}>{t.makeDef}</button> : null}
                      <button className="btn-ghost btn-sm text-rose-600" onClick={() => remove(k.provider)}>{t.remove}</button>
                    </div>
                  </div>
                  {p?.chat ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input className="input max-w-sm py-1.5" list={`m-${k.provider}`} value={edit[k.provider] ?? (k.model || p.defaultModel)} onChange={(e) => setEdit({ ...edit, [k.provider]: e.target.value })} aria-label={t.model} />
                      <datalist id={`m-${k.provider}`}>{Array.from(new Set([...(models[k.provider] || []), ...(p.models || [])])).map((m) => <option key={m} value={m} />)}</datalist>
                      <button className="btn-ghost btn-sm" onClick={() => loadModels(k.provider)} disabled={busy === `models-${k.provider}`}>{busy === `models-${k.provider}` ? <Spinner className="h-3 w-3" /> : "↻"} {t.models}</button>
                      {edit[k.provider] !== undefined ? <button className="btn-primary btn-sm" onClick={() => setModel(k.provider)}>{t.changeModel}</button> : null}
                      {models[k.provider]?.length ? <span className="text-xs text-slate-500">{models[k.provider].length} models</span> : null}
                    </div>
                  ) : null}
                  {tr ? <p className={`text-xs font-medium ${tr.ok ? "text-emerald-700" : "text-rose-600"}`}>{tr.ok ? "✓" : "✕"} {tr.message}</p> : null}
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-slate-600">{t.none}</p>}
      </Section>

      <Section title={`＋ ${t.add}`}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.provider} htmlFor="prov">
            <select id="prov" className="select" value={form.provider} onChange={(e) => setForm({ provider: e.target.value, value: "", model: "", baseUrl: "" })}>
              {data.providers.map((p) => <option key={p.id} value={p.id}>{p.name}{p.freeTier ? ` — ${t.free}` : ""}{p.research ? " 🌐" : ""}</option>)}
            </select>
          </Field>
          <Field label={`${t.key}${form.provider === "custom" ? ` (${t.keyOptional})` : ""}`} hint={sel?.freeTier || undefined} htmlFor="key">
            <div className="flex gap-2">
              <input id="key" className="input" type="password" autoComplete="off" value={form.value} placeholder={sel?.keyHint} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              {sel?.keyUrl ? <a href={sel.keyUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary shrink-0">{t.getKey} ↗</a> : null}
            </div>
          </Field>
          {form.provider === "custom" ? (
            <Field label={t.baseUrl} hint={t.baseHint} htmlFor="base">
              <input id="base" className="input" value={form.baseUrl} placeholder="https://llm.example.com/v1" onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
            </Field>
          ) : null}
          <Field label={t.model} hint={sel?.defaultModel ? tg("keys.leaveEmpty", { model: sel.defaultModel }) : undefined} htmlFor="model">
            <input id="model" className="input" list="add-models" value={form.model} placeholder={sel?.defaultModel || "llama3.1:70b"} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <datalist id="add-models">{(sel?.models || []).map((m) => <option key={m} value={m} />)}</datalist>
          </Field>
        </div>
        {msg ? <div className="mt-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
        <div className="mt-4 flex justify-end">
          <button className="btn-primary" onClick={save} disabled={busy === "save" || (form.provider !== "custom" && form.value.length < 8) || (form.provider === "custom" && !form.baseUrl)}>
            {busy === "save" ? <Spinner /> : null} {t.save}
          </button>
        </div>
      </Section>
      <LocalModeSettings lang={lang} />
    </div>
  );
}

function Profile({ lang }: { lang: Lang }) {
  const t = pick(L, lang);
  const { me, reload } = useMe();
  const [f, setF] = useState({ name: "", organization: "", country: "" });
  const [state, setState] = useState<{ busy: boolean; msg?: string; err?: string }>({ busy: false });
  useEffect(() => { if (me) setF({ name: me.user.name, organization: me.user.organization, country: me.user.country }); }, [me]);
  if (!me) return <LoadingBlock />;
  return (
    <Section title={t.tabProfile}>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t.name}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label={t.org}><input className="input" value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} /></Field>
        <Field label={t.country}><input className="input" maxLength={2} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value.toUpperCase() })} /></Field>
      </div>
      <p className="mt-3 text-sm text-slate-500">Email: <strong>{me.user.email}</strong></p>
      {state.err ? <div className="mt-3"><Alert tone="error">{state.err}</Alert></div> : state.msg ? <div className="mt-3"><Alert tone="success">{state.msg}</Alert></div> : null}
      <div className="mt-4 flex justify-end">
        <button className="btn-primary" disabled={state.busy} onClick={async () => {
          setState({ busy: true });
          const r = await api("/api/account", { method: "PATCH", body: f });
          setState({ busy: false, ...(r.ok ? { msg: t.savedOk } : { err: r.error }) });
          if (r.ok) reload();
        }}>{t.saveProfile}</button>
      </div>
    </Section>
  );
}

function Password({ lang }: { lang: Lang }) {
  const t = pick(L, lang);
  const [f, setF] = useState({ current: "", next: "" });
  const [state, setState] = useState<{ busy: boolean; msg?: string; err?: string }>({ busy: false });
  return (
    <Section title={t.tabPw}>
      <div className="grid max-w-xl gap-4">
        <Field label={t.current} htmlFor="cur"><PasswordInput id="cur" value={f.current} onChange={(v) => setF({ ...f, current: v })} autoComplete="current-password" /></Field>
        <Field label={t.next} htmlFor="nxt"><PasswordInput id="nxt" value={f.next} onChange={(v) => setF({ ...f, next: v })} autoComplete="new-password" /></Field>
      </div>
      {state.err ? <div className="mt-3"><Alert tone="error">{state.err}</Alert></div> : state.msg ? <div className="mt-3"><Alert tone="success">{state.msg}</Alert></div> : null}
      <div className="mt-4">
        <button className="btn-primary" disabled={state.busy || !f.current || !f.next} onClick={async () => {
          setState({ busy: true });
          const r = await api("/api/account", { body: { action: "password", ...f } });
          setState({ busy: false, ...(r.ok ? { msg: t.changed } : { err: r.error }) });
          if (r.ok) setF({ current: "", next: "" });
        }}>{t.change}</button>
      </div>
    </Section>
  );
}

function SettingsInner() {
  const { lang } = useI18n();
  const t = pick(L, lang);
  const q = useSearchParams();
  const [tab, setTab] = useState<"ai" | "profile" | "password">((q.get("tab") as any) === "profile" ? "profile" : (q.get("tab") as any) === "password" ? "password" : "ai");
  return (
    <>
      <PageHeader title={t.title} description={t.sub} />
      <div className="mb-5 overflow-x-auto"><Tabs value={tab} onChange={setTab} items={[{ id: "ai", label: `🔑 ${t.tabAi}` }, { id: "profile", label: `👤 ${t.tabProfile}` }, { id: "password", label: `🔒 ${t.tabPw}` }]} /></div>
      {tab === "ai" ? <AiKeys lang={lang} /> : tab === "profile" ? <Profile lang={lang} /> : <Password lang={lang} />}
    </>
  );
}

export default function SettingsPage() {
  return <Suspense fallback={<LoadingBlock />}><SettingsInner /></Suspense>;
}
