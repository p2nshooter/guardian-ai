/* ==============================================================================
 * BYOK / BYOM picker shared by every cloud app: choose which of YOUR saved keys
 * answers, pick any model on your own account (loaded live from the provider,
 * or typed by hand), and switch live web research on when the provider has it.
 * "This device (Local Mode)" appears once a model server on this computer is
 * set up in Settings — runs then stay in the browser (lib/ai/client-run.ts).
 * ============================================================================ */
"use client";
import { pick, type Lang } from "@/lib/i18n";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Spinner } from "@/components/ui";
import { T } from "@/lib/i18n-pages/modelpicker";
import { LOCALAI } from "@/lib/i18n-pages/localai";
import { useMe } from "@/components/app/Shell";
import { LOCAL_EVENT, LOCAL_KINDS, LOCAL_PROVIDER, loadLocal, localModels, type LocalSettings } from "@/lib/ai/local";

/** The Local Mode set-up of this browser, if the member may use it (plan + operator switch). */
export function useLocalAi(): LocalSettings | null {
  const { me } = useMe();
  const [s, setS] = useState<LocalSettings | null>(null);
  useEffect(() => {
    const read = () => setS(loadLocal());
    read();
    window.addEventListener(LOCAL_EVENT, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(LOCAL_EVENT, read); window.removeEventListener("storage", read); };
  }, []);
  return s && me?.localMode ? s : null;
}

export interface ProviderEntry { id: string; name: string; chat: boolean; stt: boolean; defaultModel: string; models: string[]; research: boolean; freeTier: string }
export interface SavedKey { provider: string; hint: string; model: string; baseUrl: string }
export interface AiChoice { provider: string; model: string; research: boolean }

export function useAiKeys() {
  const [state, setState] = useState<{ loading: boolean; keys: SavedKey[]; preferred: string; providers: ProviderEntry[] }>({ loading: true, keys: [], preferred: "", providers: [] });
  const reload = useCallback(async () => {
    const r = await api<{ keys: SavedKey[]; preferred: string; providers: ProviderEntry[] }>("/api/byox/keys");
    if (r.ok) setState({ loading: false, keys: r.data.keys, preferred: r.data.preferred, providers: r.data.providers });
    else setState((s) => ({ ...s, loading: false }));
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

export default function ModelPicker({ lang, value, onChange, showResearch = true }: { lang: Lang; value: AiChoice; onChange: (v: AiChoice) => void; showResearch?: boolean }) {
  const t = pick(T, lang);
  const tl = pick(LOCALAI, lang);
  const { loading, keys, preferred, providers } = useAiKeys();
  const local = useLocalAi();
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const chatKeys = keys.filter((k) => providers.find((p) => p.id === k.provider)?.chat);
  const isLocal = value.provider === LOCAL_PROVIDER;
  const info = providers.find((p) => p.id === value.provider);

  useEffect(() => {
    if (loading || (!chatKeys.length && !local)) return;
    const valid = (isLocal && !!local) || chatKeys.some((k) => k.provider === value.provider);
    if (!value.provider || !valid) {
      if (local && (local.preferred || !chatKeys.length)) { onChange({ provider: LOCAL_PROVIDER, model: local.model, research: false }); return; }
      const p = chatKeys.find((k) => k.provider === preferred) || chatKeys[0];
      const pi = providers.find((x) => x.id === p.provider);
      onChange({ provider: p.provider, model: p.model || pi?.defaultModel || "", research: value.research && !!pi?.research });
    }
  }, [loading, chatKeys.length, preferred, local?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadModels() {
    if (!value.provider) return;
    setBusy(true);
    if (isLocal && local) {
      const list = await localModels(local.baseUrl, AbortSignal.timeout(8000)).catch(() => []);
      setModels((m) => ({ ...m, [LOCAL_PROVIDER]: list }));
    } else {
      const r = await api<{ models: string[] }>("/api/byox/models", { body: { provider: value.provider } });
      setModels((m) => ({ ...m, [value.provider]: r.data?.models || [] }));
    }
    setBusy(false);
  }

  if (loading) return <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> …</div>;
  if (!chatKeys.length && !local) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <span>🔑 {t.noKey}</span>
        <Link href="/app/settings?tab=ai" className="btn-primary btn-sm">{t.addKey}</Link>
      </div>
    );
  }
  const saved = chatKeys.find((k) => k.provider === value.provider);
  const list = Array.from(new Set([...(models[value.provider] || []), ...(isLocal ? [local?.model || ""] : info?.models || []), saved?.model || "", value.model].filter(Boolean)));
  const research = !isLocal && !!info?.research;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-[150px] flex-1">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.provider}</span>
        <select className="select py-2" value={value.provider} data-testid="ai-provider" onChange={(e) => {
          if (e.target.value === LOCAL_PROVIDER && local) { onChange({ provider: LOCAL_PROVIDER, model: local.model, research: false }); return; }
          const k = chatKeys.find((x) => x.provider === e.target.value)!;
          const pi = providers.find((x) => x.id === k.provider);
          onChange({ provider: k.provider, model: k.model || pi?.defaultModel || "", research: value.research && !!pi?.research });
        }}>
          {local ? <option value={LOCAL_PROVIDER}>🖥️ {tl.picker}</option> : null}
          {chatKeys.map((k) => <option key={k.provider} value={k.provider}>{providers.find((p) => p.id === k.provider)?.name || k.provider}</option>)}
        </select>
        {isLocal && local ? <span className="mt-1 block text-[11px] text-emerald-700" data-testid="ai-local-hint">🔒 {tl.pickerHint.replace("{name}", LOCAL_KINDS[local.kind].name)}</span> : null}
      </label>
      <label className="min-w-[180px] flex-[1.4]">
        <span className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {t.model}
          <button type="button" className="normal-case text-brand-700 hover:underline" onClick={loadModels} disabled={busy}>{busy ? t.loading : t.load}</button>
        </span>
        <input className="input py-2" list={`models-${value.provider}`} value={value.model} placeholder={t.custom}
          onChange={(e) => onChange({ ...value, model: e.target.value })} />
        <datalist id={`models-${value.provider}`}>{list.map((m) => <option key={m} value={m} />)}</datalist>
      </label>
      {showResearch ? (
        <label className={`flex h-[42px] items-center gap-2 rounded-lg border px-3 text-sm ${research ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50 text-slate-400"}`}
          title={isLocal ? tl.researchOff : research ? t.researchHint : t.noResearch}>
          <input type="checkbox" className="h-4 w-4" disabled={!research} checked={research && value.research}
            onChange={(e) => onChange({ ...value, research: e.target.checked })} />
          🌐 {t.research}
        </label>
      ) : null}
      <Link href="/app/settings?tab=ai" className="btn-ghost btn-sm h-[42px]">{t.manage}</Link>
    </div>
  );
}
