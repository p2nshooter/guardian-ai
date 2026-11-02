/* PROMPT LIBRARY v4 — the prompt runner: fill {{variables}} (with the active
 * profile), preview, run on the member's own model with streaming, follow up,
 * compare up to three models side by side, save the result, add to a
 * collection or workflow, or open in AI Chat. */
"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { api } from "@/lib/client";
import { Spinner } from "@/components/ui";
import Markdown from "@/components/Markdown";
import ModelPicker, { type AiChoice } from "@/components/ai/ModelPicker";
import { CopyBtn } from "@/components/security/shared";
import { extractVars, fill, labelOf, withProfile, type LibraryState, type Ref } from "@/lib/prompts/library";
import type { PromptsDict } from "@/lib/i18n-pages/prompts";
import { streamRun, type Msg } from "./stream";

export interface RunnablePrompt { ref: Ref; title: string; summary?: string; body: string; variables: { key: string; label: string; placeholder?: string }[]; catalogId?: string; level?: string }
type Lane = { id: string; ai: AiChoice; out: string; meta: string; running: boolean; err?: { msg: string; needKey?: boolean } };
const blankAi = (): AiChoice => ({ provider: "", model: "", research: false });

export default function Runner({ t, lang, p, state, onState, onClose }: {
  t: PromptsDict; lang: Lang; p: RunnablePrompt; state: LibraryState; onState: (u: (s: LibraryState) => LibraryState) => void; onClose: () => void;
}) {
  const router = useRouter();
  const profile = state.profiles.find((x) => x.id === state.activeProfile);
  const keys = useMemo(() => { const k = p.variables.map((v) => v.key); for (const x of extractVars(p.body)) if (!k.includes(x) && x !== "previous") k.push(x); return k; }, [p]);
  const [values, setValues] = useState<Record<string, string>>(() => withProfile(keys, {}, profile));
  const [lanes, setLanes] = useState<Lane[]>([{ id: "a", ai: blankAi(), out: "", meta: "", running: false }]);
  const [thread, setThread] = useState<Msg[]>([]);
  const [follow, setFollow] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [added, setAdded] = useState("");
  const ctrls = useRef<Record<string, AbortController>>({});
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; Object.values(ctrls.current).forEach((c) => c.abort()); }, []);
  const filled = fill(p.body, values);
  const label = (k: string) => p.variables.find((v) => v.key === k)?.label || labelOf(k);
  const setLane = (id: string, patch: Partial<Lane>) => { if (alive.current) setLanes((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))); };

  async function runLane(l: Lane, messages: Msg[]) {
    if (!l.ai.provider) return null;
    const cc = new AbortController(); ctrls.current[l.id] = cc;
    setLane(l.id, { running: true, out: "", err: undefined });
    const r = await streamRun({ ai: l.ai, mode: "run", messages, promptId: p.catalogId, values, signal: cc.signal, onText: (x) => setLane(l.id, { out: x }) });
    setLane(l.id, { running: false, out: r.text, meta: r.meta, err: r.ok ? undefined : { msg: r.error || "", needKey: r.needKey } });
    return r;
  }
  async function runAll() {
    setSaved(false);
    const first: Msg[] = [{ role: "user", content: p.catalogId ? p.title : filled }];
    const results = await Promise.all(lanes.map((l) => runLane(l, first)));
    const main = results[0];
    setThread(main?.ok && main.text ? [...first, { role: "assistant", content: main.text }] : []);
  }
  async function sendFollow() {
    const q = follow.trim(); if (!q || !thread.length) return;
    const msgs: Msg[] = [...thread, { role: "user", content: q }];
    setFollow(""); setThread(msgs);
    const r = await runLane(lanes[0], msgs);
    if (r?.ok && r.text) setThread([...msgs, { role: "assistant", content: r.text }]);
  }
  async function saveRun() {
    const out = lanes[0].out; if (!out) return;
    const r = await api("/api/history/prompts", { body: { title: p.title.slice(0, 200), body: { kind: "run", ref: p.ref, title: p.title, prompt: p.catalogId ? "" : filled, values, output: out, thread, model: lanes[0].meta }, meta: { kind: "run", model: lanes[0].meta.slice(0, 80) } } });
    if (r.ok) { setSaved(true); setSaveErr(""); } else setSaveErr(r.error);
  }
  function addToCollection(id: string) {
    if (id === "fav") onState((s) => ({ ...s, favorites: s.favorites.includes(p.ref) ? s.favorites : [...s.favorites, p.ref] }));
    else onState((s) => ({ ...s, collections: s.collections.map((c) => (c.id === id && !c.items.includes(p.ref) ? { ...c, items: [...c.items, p.ref] } : c)) }));
    setAdded(t.added);
  }
  function addToChain(id: string) {
    onState((s) => ({ ...s, chains: s.chains.map((c) => (c.id === id ? { ...c, steps: [...c.steps, { id: `st${Date.now().toString(36)}`, title: p.title, ref: p.ref, values }].slice(0, 12) } : c)) }));
    setAdded(t.added);
  }
  function openStudio() { try { sessionStorage.setItem("axto_studio_prefill", filled); } catch { /* private mode */ } router.push("/app/studio?from=prompt"); }
  const anyRunning = lanes.some((l) => l.running);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink-950/30" onClick={onClose}>
      <aside className="h-full w-full max-w-5xl overflow-y-auto bg-white p-5 shadow-lift" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={p.title} data-testid="pl-runner">
        <div className="flex items-start gap-2">
          <div className="min-w-0"><h2 className="text-lg font-bold text-slate-900">{p.title}</h2>{p.summary ? <p className="text-sm text-slate-600">{p.summary}</p> : null}</div>
          <button type="button" className="btn-ghost btn-sm ml-auto" onClick={onClose} aria-label={t.close}>✕</button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-w-0">
          <section>
            <div className="flex items-center gap-2"><h3 className="font-semibold text-slate-900">{t.variables}</h3>
              {profile ? <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => setValues(withProfile(keys, {}, profile))} data-testid="pl-fill-profile">⤵ {t.fromProfile}</button> : null}</div>
            {profile ? <p className="text-xs text-slate-500">{t.profileActive.replace("{name}", profile.name)}</p> : null}
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {keys.map((k) => (
                <label key={k} className="text-sm"><span className="font-medium text-slate-700">{label(k)}</span>
                  <input className="input mt-1 w-full" placeholder={p.variables.find((v) => v.key === k)?.placeholder} value={values[k] || ""} onChange={(e) => setValues({ ...values, [k]: e.target.value })} data-testid={`pl-var-${k}`} /></label>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2"><h3 className="font-semibold text-slate-900">{t.preview}</h3>
              <span className="ml-auto flex gap-1"><CopyBtn text={filled} label={`📋 ${t.copy}`} done={t.copied} /><button type="button" className="btn-ghost btn-sm" onClick={openStudio}>↗ {t.runStudio}</button></span></div>
            <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-800" data-testid="pl-preview">{filled}</pre>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select className="select w-auto py-1 text-sm" value="" onChange={(e) => e.target.value && addToCollection(e.target.value)} aria-label={t.addToCollection} data-testid="pl-add-collection">
                <option value="">＋ {t.addToCollection}</option><option value="fav">★ {t.favorites}</option>
                {state.collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {state.chains.length ? (
                <select className="select w-auto py-1 text-sm" value="" onChange={(e) => e.target.value && addToChain(e.target.value)} aria-label={t.addToChain}>
                  <option value="">＋ {t.addToChain}</option>{state.chains.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : null}
              {added ? <span className="text-xs text-emerald-700">{added}</span> : null}
            </div>
          </section>
          <section>
            <div className="flex items-center gap-2"><h3 className="font-semibold text-slate-900">{t.output}</h3>
              {lanes.length < 3 ? <button type="button" className="btn-ghost btn-sm ml-auto" title={t.compareHint} onClick={() => setLanes((ls) => [...ls, { id: `l${ls.length}${Date.now().toString(36)}`, ai: blankAi(), out: "", meta: "", running: false }])} data-testid="pl-add-model">⇆ {t.addModel}</button> : null}</div>
            <div className={`mt-2 grid gap-3 ${lanes.length > 1 ? "md:grid-cols-2" : ""} [&>*]:min-w-0`}>
              {lanes.map((l, i) => (
                <div key={l.id} className="rounded-xl border border-slate-200 p-3" data-testid="pl-lane">
                  <div className="flex items-start gap-1"><div className="min-w-0 flex-1"><ModelPicker lang={lang} value={l.ai} onChange={(ai) => setLane(l.id, { ai })} showResearch={i === 0} /></div>
                    {i > 0 ? <button type="button" className="btn-ghost btn-sm" onClick={() => setLanes((ls) => ls.filter((x) => x.id !== l.id))} aria-label={t.removeModel}>✕</button> : null}</div>
                  <div className="mt-2 max-h-[55vh] min-h-[120px] overflow-y-auto" data-testid="pl-output">
                    {l.out ? <Markdown text={l.out} className="prose-axto text-sm" /> : l.running ? <span className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> {t.running}</span> : null}
                  </div>
                  {l.err ? <p className="mt-1 text-xs text-rose-700">⚠️ {l.err.msg}{l.err.needKey ? <Link href="/app/settings?tab=ai" className="ml-1 font-semibold underline">{t.addKey}</Link> : null}</p> : null}
                  {l.out && !l.running ? <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2"><CopyBtn text={l.out} label={`📋 ${t.copyOut}`} done={t.copied} />{l.meta ? <span className="ml-auto truncate text-[11px] text-slate-500">{t.answeredBy} {l.meta}</span> : null}</div> : null}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {anyRunning ? <button type="button" className="btn-secondary" onClick={() => Object.values(ctrls.current).forEach((c) => c.abort())}>■ {t.stop}</button>
                : <button type="button" className="btn-primary" onClick={runAll} disabled={!lanes[0].ai.provider} data-testid="pl-run">▶ {lanes.length > 1 ? t.runAll : t.run}</button>}
              {lanes[0].out && !anyRunning ? <button type="button" className="btn-secondary" onClick={saveRun} data-testid="pl-save-run">💾 {saved ? t.savedRun : t.saveRun}</button> : null}
            </div>
            {saveErr ? <p className="mt-2 text-xs text-rose-700" data-testid="pl-save-err">⚠️ {saveErr} <Link href="/app/billing" className="font-semibold underline">{t.upgrade}</Link></p> : null}
            {thread.length ? (
              <div className="mt-3 flex gap-2"><input className="input flex-1" placeholder={t.followUp} value={follow} onChange={(e) => setFollow(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendFollow(); }} data-testid="pl-follow" />
                <button type="button" className="btn-secondary" onClick={sendFollow} disabled={!follow.trim() || anyRunning}>{t.send}</button></div>
            ) : null}
          </section>
        </div>
      </aside>
    </div>
  );
}
