/* PROMPT LIBRARY v4 — workflows: ordered steps (catalogue prompts, your own
 * prompts or written instructions); each step receives the previous step's
 * output, as {{previous}} or as context. Runs step by step with streaming. */
"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { Spinner } from "@/components/ui";
import Markdown from "@/components/Markdown";
import ModelPicker, { type AiChoice } from "@/components/ai/ModelPicker";
import { CopyBtn } from "@/components/security/shared";
import { SAMPLE_CHAIN, extractVars, fill, labelOf, newId, withProfile, type Chain, type ChainStep, type LibraryState, type Ref } from "@/lib/prompts/library";
import type { PromptsDict } from "@/lib/i18n-pages/prompts";
import { streamRun } from "./stream";

export interface PickItem { ref: Ref; title: string; group: string; vars: string[]; body?: string; locked?: boolean }

export default function Chains({ t, lang, state, onState, items }: { t: PromptsDict; lang: Lang; state: LibraryState; onState: (u: (s: LibraryState) => LibraryState) => void; items: PickItem[] }) {
  const [openId, setOpenId] = useState("");
  const [name, setName] = useState("");
  const c = state.chains.find((x) => x.id === openId);
  const add = (ch: Chain) => { onState((s) => ({ ...s, chains: [...s.chains, ch] })); setOpenId(ch.id); };
  if (c) return <Editor key={c.id} t={t} lang={lang} c={c} state={state} onState={onState} items={items} onBack={() => setOpenId("")} />;
  return (
    <div className="space-y-4">
      <section className="card-pad flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 text-sm">{t.chainName}<input className="input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} data-testid="pl-chain-name" /></label>
        <button type="button" className="btn-primary" disabled={!name.trim()} onClick={() => { add({ id: newId("ch"), name: name.trim(), steps: [] }); setName(""); }} data-testid="pl-chain-add">＋ {t.newChain}</button>
        <button type="button" className="btn-secondary" onClick={() => add(SAMPLE_CHAIN())} data-testid="pl-chain-sample">✨ {t.sampleChain}</button>
      </section>
      {state.chains.length ? (
        <ul className="card-pad divide-y divide-slate-100" data-testid="pl-chains">{state.chains.map((x) => (
          <li key={x.id} className="flex items-center gap-2 py-2 text-sm">
            <button type="button" className="min-w-0 flex-1 truncate text-left font-semibold text-slate-800 hover:underline" onClick={() => setOpenId(x.id)}>{x.name}</button>
            <span className="text-xs text-slate-500">{x.steps.length} × {t.step.replace("{n}", "").trim()}</span>
            <button type="button" className="btn-ghost btn-sm text-rose-700" onClick={() => { if (window.confirm(t.confirmDel)) onState((s) => ({ ...s, chains: s.chains.filter((y) => y.id !== x.id) })); }} aria-label={`${t.del} ${x.name}`}>✕</button>
          </li>
        ))}</ul>
      ) : <p className="text-sm text-slate-500">{t.chainsEmpty}</p>}
    </div>
  );
}

function Editor({ t, lang, c, state, onState, items, onBack }: { t: PromptsDict; lang: Lang; c: Chain; state: LibraryState; onState: (u: (s: LibraryState) => LibraryState) => void; items: PickItem[]; onBack: () => void }) {
  const [ai, setAi] = useState<AiChoice>({ provider: "", model: "", research: false });
  const [outs, setOuts] = useState<Record<string, string>>({});
  const [runningIdx, setRunningIdx] = useState(-1);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<{ msg: string; needKey?: boolean } | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; ctrl.current?.abort(); }, []);
  const profile = state.profiles.find((p) => p.id === state.activeProfile);
  const setChain = (patch: Partial<Chain>) => onState((s) => ({ ...s, chains: s.chains.map((x) => (x.id === c.id ? { ...x, ...patch } : x)) }));
  const setStep = (id: string, patch: Partial<ChainStep>) => setChain({ steps: c.steps.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const move = (i: number, d: number) => { const s = [...c.steps]; const j = i + d; if (j < 0 || j >= s.length) return; [s[i], s[j]] = [s[j], s[i]]; setChain({ steps: s }); };
  const itemOf = (r?: Ref) => (r ? items.find((x) => x.ref === r) : undefined);

  async function run() {
    if (!ai.provider || runningIdx >= 0) return;
    setErr(null); setMsg(""); setOuts({});
    let previous = "";
    for (let i = 0; i < c.steps.length; i++) {
      const st = c.steps[i];
      if (!alive.current) return;
      setRunningIdx(i); setMsg(t.stepRunning.replace("{n}", String(i + 1)).replace("{total}", String(c.steps.length)));
      const it = itemOf(st.ref);
      const vars = it ? it.vars : extractVars(st.text || "");
      const values = { ...withProfile(vars.filter((v) => v !== "previous"), st.values || {}, profile), previous };
      const cc = new AbortController(); ctrl.current = cc;
      const onText = (x: string) => { if (alive.current) setOuts((o) => ({ ...o, [st.id]: x })); };
      let r;
      if (st.ref?.startsWith("c:")) r = await streamRun({ ai, mode: "chain", messages: [{ role: "user", content: st.title || it?.title || "Step" }], promptId: st.ref.slice(2), values, previous, signal: cc.signal, onText });
      else {
        const body = st.ref ? it?.body || "" : st.text || "";
        const text = fill(body, values);
        r = await streamRun({ ai, mode: "chain", messages: [{ role: "user", content: text }], previous: body.includes("{{previous}}") ? "" : previous, signal: cc.signal, onText });
      }
      if (!r.ok) { if (alive.current) { setErr({ msg: r.error || "", needKey: r.needKey }); setRunningIdx(-1); setMsg(""); } return; }
      previous = r.text;
    }
    if (alive.current) { setRunningIdx(-1); setMsg(t.chainDone); }
  }

  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1fr)_340px]" data-testid="pl-chain-editor">
      <section className="card-pad">
        <div className="flex flex-wrap items-center gap-2"><button type="button" className="btn-ghost btn-sm" onClick={onBack}>← {t.tabs.chains}</button>
          <input className="input min-w-[200px] flex-1 font-semibold" value={c.name} onChange={(e) => setChain({ name: e.target.value.slice(0, 80) })} aria-label={t.chainName} /></div>
        <p className="mt-2 text-xs text-slate-500">{t.chainHint}</p>
        <ol className="mt-3 space-y-3" data-testid="pl-steps">
          {c.steps.map((st, i) => { const it = itemOf(st.ref); const vars = (it ? it.vars : extractVars(st.text || "")).filter((v) => v !== "previous"); return (
            <li key={st.id} className={`rounded-xl border p-3 ${runningIdx === i ? "border-brand-400 bg-brand-50/40" : "border-slate-200"}`} data-testid="pl-step">
              <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-500">{t.step.replace("{n}", String(i + 1))}</span>
                <input className="input flex-1 py-1 text-sm" value={st.title} placeholder={t.stepTitle} onChange={(e) => setStep(st.id, { title: e.target.value.slice(0, 120) })} aria-label={t.stepTitle} />
                <button type="button" className="btn-ghost btn-sm" onClick={() => move(i, -1)} aria-label={t.moveUp}>↑</button><button type="button" className="btn-ghost btn-sm" onClick={() => move(i, 1)} aria-label={t.moveDown}>↓</button>
                <button type="button" className="btn-ghost btn-sm text-rose-700" onClick={() => setChain({ steps: c.steps.filter((x) => x.id !== st.id) })} aria-label={t.del}>✕</button></div>
              {st.ref ? <p className="mt-1 text-xs text-slate-600">↳ {it?.title || t.unknownPrompt}</p>
                : <textarea className="textarea mt-2 min-h-[70px] w-full text-xs" placeholder={t.stepText} value={st.text || ""} onChange={(e) => setStep(st.id, { text: e.target.value.slice(0, 20000) })} aria-label={t.stepText} />}
              {vars.length ? <div className="mt-2 grid gap-2 sm:grid-cols-2">{vars.map((k) => (
                <input key={k} className="input py-1 text-xs" placeholder={labelOf(k)} value={st.values?.[k] ?? ""} onChange={(e) => setStep(st.id, { values: { ...(st.values || {}), [k]: e.target.value } })} aria-label={labelOf(k)} />
              ))}</div> : null}
              {outs[st.id] ? <div className="mt-2 max-h-72 overflow-y-auto rounded-lg bg-slate-50 p-3" data-testid="pl-step-out"><Markdown text={outs[st.id]} className="prose-axto text-xs" /><div className="mt-1"><CopyBtn text={outs[st.id]} label={`📋 ${t.copyOut}`} done={t.copied} /></div></div>
                : runningIdx === i ? <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Spinner /> {t.running}</p> : null}
            </li>
          ); })}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <select className="select w-auto max-w-xs py-1 text-sm" value="" onChange={(e) => { const it = items.find((x) => x.ref === e.target.value); if (it) setChain({ steps: [...c.steps, { id: newId("st"), title: it.title, ref: it.ref, values: {} }].slice(0, 12) }); }} aria-label={t.addStep} data-testid="pl-step-add">
            <option value="">＋ {t.addStep}</option>
            {Array.from(new Set(items.map((x) => x.group))).map((g) => <optgroup key={g} label={g}>{items.filter((x) => x.group === g && !x.locked).map((x) => <option key={x.ref} value={x.ref}>{x.title}</option>)}</optgroup>)}
          </select>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setChain({ steps: [...c.steps, { id: newId("st"), title: "", text: "{{previous}}" }].slice(0, 12) })} data-testid="pl-step-text">＋ {t.addStepText}</button>
        </div>
      </section>
      <aside className="card-pad">
        <ModelPicker lang={lang} value={ai} onChange={setAi} />
        {runningIdx >= 0 ? <button type="button" className="btn-secondary mt-3 w-full" onClick={() => ctrl.current?.abort()}>■ {t.stop}</button>
          : <button type="button" className="btn-primary mt-3 w-full" disabled={!ai.provider || !c.steps.length} onClick={run} data-testid="pl-chain-run">▶ {t.runChain}</button>}
        {msg ? <p className="mt-2 text-xs text-slate-600" data-testid="pl-chain-msg">{msg}</p> : null}
        {err ? <p className="mt-2 text-xs text-rose-700">⚠️ {err.msg}{err.needKey ? <Link href="/app/settings?tab=ai" className="ml-1 font-semibold underline">{t.addKey}</Link> : null}</p> : null}
      </aside>
    </div>
  );
}
