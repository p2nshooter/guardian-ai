/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PROMPT LIBRARY v4 —
 *   library      240 expert prompts in 24 fields × 4 levels: search, filters,
 *                favourites; fill {{variables}} (from a profile), run here with
 *                streaming, follow up, compare up to 3 models, save results
 *   my prompts   write / edit / duplicate / delete your own prompts; AI optimiser
 *   collections  your own lists plus Favourites
 *   workflows    chains of steps; each step gets the previous output
 *   profiles     saved values that fill matching {{variables}}
 *   history      saved results; export / import the whole library as JSON
 * Catalogue bodies are served only for the levels the plan unlocks, and a
 * catalogue prompt is filled on the server when run. The member's library is
 * one encrypted history item; results are separate items.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n, pick } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, Spinner } from "@/components/ui";
import { STATE_ID, emptyState, extractVars, labelOf, sanitizeState, type CustomPrompt, type LibraryState, type Ref } from "@/lib/prompts/library";
import Runner, { type RunnablePrompt } from "@/components/prompts/Runner";
import Mine from "@/components/prompts/Mine";
import Collections from "@/components/prompts/Collections";
import Chains, { type PickItem } from "@/components/prompts/Chains";
import Profiles from "@/components/prompts/Profiles";
import History from "@/components/prompts/History";
import { L } from "@/lib/i18n-pages/prompts";

type Tab = "library" | "mine" | "collections" | "chains" | "profiles" | "history";
const TAB_ICON: Record<Tab, string> = { library: "📚", mine: "✍️", collections: "🗂️", chains: "⛓️", profiles: "🪪", history: "🕘" };
type Level = "basic" | "pro" | "premium" | "elite";
interface PPrompt { id: string; field: string; level: Level; title: string; summary: string; variables: { key: string; label: string; placeholder?: string }[]; locked?: boolean }
interface Catalog { fields: { id: string; name: string; icon: string; blurb: string }[]; levels: { id: Level; name: string; blurb: string }[]; prompts: PPrompt[]; unlocked: string[] }
const LEVEL_BADGE: Record<Level, string> = { basic: "badge-gray", pro: "badge-brand", premium: "badge-amber", elite: "badge-green" };

export default function PromptsApp() {
  const { lang } = useI18n();
  const t = pick(L, lang);
  const { me } = useMe();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [state, setState] = useState<LibraryState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("library");
  const [field, setField] = useState("");
  const [level, setLevel] = useState<Level | "">("");
  const [favOnly, setFavOnly] = useState(false);
  const [q, setQ] = useState("");
  const [runner, setRunner] = useState<RunnablePrompt | null>(null);
  const [opening, setOpening] = useState("");
  const [err, setErr] = useState<{ msg: string; need?: boolean } | null>(null);
  const [sync, setSync] = useState<{ s: "idle" | "saving" | "saved" | "error"; msg?: string }>({ s: "idle" });
  const [historyOpen, setHistoryOpen] = useState("");
  const latest = useRef(state);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    api<Catalog>("/api/prompts").then((r) => { if (r.ok) setCat(r.data); });
    api<{ item: { body: unknown } }>(`/api/history/prompts/${STATE_ID}`).then((r) => { if (r.ok && r.data.item?.body) { const s = sanitizeState(r.data.item.body); latest.current = s; setState(s); } setLoaded(true); });
    const oid = new URLSearchParams(window.location.search).get("open");
    if (oid && oid !== STATE_ID) { setTab("history"); setHistoryOpen(oid); }
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (saving.current || !dirty.current) return;
    saving.current = true; dirty.current = false; setSync({ s: "saving" });
    const s = latest.current;
    const r = await api("/api/history/prompts", { body: { id: STATE_ID, title: "Prompt Library — my library", body: s, meta: { kind: "library", prompts: s.custom.length, workflows: s.chains.length } } });
    saving.current = false;
    if (r.ok) setSync({ s: "saved" }); else { dirty.current = true; setSync({ s: "error", msg: r.error }); return; }
    if (dirty.current) timer.current = setTimeout(() => { flush(); }, 1200);
  }, []);
  const onState = useCallback((u: (s: LibraryState) => LibraryState) => {
    const next = u(latest.current); latest.current = next; setState(next); dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { flush(); }, 1200);
  }, [flush]);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirty.current) { flush(); e.preventDefault(); } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [flush]);

  const shown = useMemo(() => {
    if (!cat) return [];
    const n = q.trim().toLowerCase();
    return cat.prompts.filter((p) => (!field || p.field === field) && (!level || p.level === level) && (!favOnly || state.favorites.includes(`c:${p.id}`))
      && (!n || `${p.title} ${p.summary}`.toLowerCase().includes(n)));
  }, [cat, field, level, favOnly, q, state.favorites]);

  const toggleFav = (r: Ref) => onState((s) => ({ ...s, favorites: s.favorites.includes(r) ? s.favorites.filter((x) => x !== r) : [...s.favorites, r] }));
  async function openCatalog(p: PPrompt) {
    setErr(null);
    if (p.locked) { setErr({ msg: t.locked, need: true }); return; }
    setOpening(p.id);
    const r = await api<{ prompt: { template: string } }>(`/api/prompts/${p.id}`);
    setOpening("");
    if (!r.ok) { setErr({ msg: r.error, need: r.status === 402 }); return; }
    setRunner({ ref: `c:${p.id}`, title: p.title, summary: p.summary, body: r.data.prompt.template, variables: p.variables, catalogId: p.id, level: p.level });
  }
  const openCustom = (p: CustomPrompt) => setRunner({ ref: `u:${p.id}`, title: p.title, summary: p.notes, body: p.body, variables: extractVars(p.body).map((k) => ({ key: k, label: labelOf(k) })) });
  const openRef = (r: Ref) => {
    if (r.startsWith("c:")) { const p = cat?.prompts.find((x) => x.id === r.slice(2)); if (p) openCatalog(p); }
    else { const p = state.custom.find((x) => x.id === r.slice(2)); if (p) openCustom(p); }
  };
  const titleOf = (r: Ref) => (r.startsWith("c:") ? cat?.prompts.find((x) => x.id === r.slice(2))?.title : state.custom.find((x) => x.id === r.slice(2))?.title) || null;
  const pickItems: PickItem[] = useMemo(() => [
    ...state.custom.map((p): PickItem => ({ ref: `u:${p.id}`, title: p.title, group: t.tabs.mine, vars: extractVars(p.body), body: p.body })),
    ...(cat?.prompts || []).map((p): PickItem => ({ ref: `c:${p.id}`, title: `${p.title} · ${p.level}`, group: cat!.fields.find((f) => f.id === p.field)?.name || p.field, vars: p.variables.map((v) => v.key), locked: p.locked })),
  ], [state.custom, cat, t.tabs.mine]);

  if (!cat || !me || !loaded) return <LoadingBlock />;
  const counts: Partial<Record<Tab, number>> = { library: cat.prompts.length, mine: state.custom.length, collections: state.collections.length + (state.favorites.length ? 1 : 0), chains: state.chains.length };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0"><div className="eyebrow">📚 {t.title}</div><p className="text-sm text-slate-600">{t.sub}</p></div>
        <div className="ml-auto text-xs" data-testid="pl-sync">{sync.s === "saving" ? <span className="flex items-center gap-1 text-slate-500"><Spinner /> {t.syncing}</span> : sync.s === "saved" ? <span className="text-emerald-700">✓ {t.synced}</span> : sync.s === "error" ? <span className="text-rose-700">⚠️ {t.syncError.replace("{msg}", sync.msg || "")}</span> : null}</div>
      </div>
      <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist">
        {(Object.keys(t.tabs) as Tab[]).map((x) => (
          <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)} data-testid={`pl-tab-${x}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === x ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            <span>{TAB_ICON[x]}</span>{t.tabs[x]}{counts[x] ? <span className="rounded-full bg-brand-100 px-1.5 text-[11px] text-brand-800">{counts[x]}</span> : null}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input className="input w-full sm:w-auto sm:max-w-xs sm:flex-1" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} data-testid="pl-search" />
            <select className="select w-auto" value={field} onChange={(e) => setField(e.target.value)} aria-label={t.all} data-testid="pl-field">
              <option value="">{t.all}</option>{cat.fields.map((f) => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
            </select>
            <select className="select w-auto" value={level} onChange={(e) => setLevel(e.target.value as Level | "")} aria-label={t.allLevels} data-testid="pl-level">
              <option value="">{t.allLevels}</option>{cat.levels.map((l) => <option key={l.id} value={l.id}>{t.levels[l.id]}{cat.unlocked.includes(l.id) ? "" : " 🔒"}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-slate-700"><input type="checkbox" className="accent-brand-600" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} data-testid="pl-fav-only" />★ {t.favoritesOnly}</label>
            <span className="ml-auto text-xs text-slate-500" data-testid="pl-count">{t.countShown.replace("{n}", String(shown.length))}</span>
          </div>
          {err ? <div className="mb-3"><Alert tone={err.need ? "warn" : "error"}>{err.msg}{err.need ? <Link href="/app/billing" className="ml-2 font-semibold underline">{t.upgrade} →</Link> : null}</Alert></div> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0" data-testid="pl-grid">
            {shown.map((p) => { const f = cat.fields.find((x) => x.id === p.field); const fav = state.favorites.includes(`c:${p.id}`); return (
              <div key={p.id} className="card-pad flex flex-col transition hover:shadow-lift" data-testid="pl-card">
                <div className="flex items-center gap-2"><span className="text-lg" aria-hidden="true">{f?.icon}</span><span className={LEVEL_BADGE[p.level]}>{t.levels[p.level]}{p.locked ? " 🔒" : ""}</span>
                  <button type="button" className={`ml-auto text-lg ${fav ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`} onClick={() => toggleFav(`c:${p.id}`)} aria-label={fav ? t.unfavorite : t.favorite} aria-pressed={fav} data-testid="pl-fav">★</button></div>
                <button type="button" className="mt-2 flex flex-1 flex-col text-left" onClick={() => openCatalog(p)}>
                  <h3 className="font-semibold text-slate-900">{p.title}</h3>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-600">{p.summary}</p>
                  <span className="mt-3 text-xs font-semibold text-brand-700">{opening === p.id ? <Spinner /> : null}{p.locked ? t.locked : t.fill} →</span>
                </button>
              </div>
            ); })}
          </div>
          {!shown.length ? <p className="mt-6 text-sm text-slate-500">{t.none}</p> : null}
        </>
      ) : null}
      {tab === "mine" ? <Mine t={t} lang={lang} state={state} onState={onState} fields={cat.fields} onRun={openCustom} /> : null}
      {tab === "collections" ? <Collections t={t} state={state} onState={onState} titleOf={titleOf} onOpen={openRef} /> : null}
      {tab === "chains" ? <Chains t={t} lang={lang} state={state} onState={onState} items={pickItems} /> : null}
      {tab === "profiles" ? <Profiles t={t} state={state} onState={onState} /> : null}
      {tab === "history" ? <History t={t} state={state} onState={onState} openId={historyOpen} /> : null}

      {runner ? <Runner key={runner.ref} t={t} lang={lang} p={runner} state={state} onState={onState} onClose={() => setRunner(null)} /> : null}
    </div>
  );
}
