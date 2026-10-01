/* COMPLIANCE CENTER v4 — the AI advisor on the member's own model. The AI
 * receives a programme briefing computed on the device (scores, open
 * controls, risks, policies, vendors, a focus control) — never evidence files. */
"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { Spinner } from "@/components/ui";
import Markdown from "@/components/Markdown";
import ModelPicker, { type AiChoice } from "@/components/ai/ModelPicker";
import { stripStatus } from "@/lib/markdown";
import { COMP_MODES, type CompMode, type FrameworkId } from "@/lib/compliance/frameworks";
import { LIBRARY } from "@/lib/compliance/controls";
import { aiContext, type Msg, type Workspace } from "@/lib/compliance/workspace";
import type { ComplianceDict } from "@/lib/i18n-pages/compliance";
import { CopyBtn, type WsUpdate } from "./shared";
import { aiFetch } from "@/lib/ai/client-run";

export default function Advisor({ t, lang, w, onWs, focus, onClearFocus, prefill, onPrefillUsed }: {
  t: ComplianceDict; lang: Lang; w: Workspace; onWs: (u: WsUpdate) => void; focus: { fw: FrameworkId; id: string } | null; onClearFocus: () => void; prefill: { mode: CompMode; text: string } | null; onPrefillUsed: () => void;
}) {
  const [ai, setAi] = useState<AiChoice>({ provider: "", model: "", research: false });
  const [fw, setFw] = useState<FrameworkId>(w.frameworks[0] || "iso27001");
  const [input, setInput] = useState("");
  const [live, setLive] = useState("");
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<{ msg: string; needKey?: boolean } | null>(null);
  const [meta, setMeta] = useState("");
  const [showBrief, setShowBrief] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const end = useRef<HTMLDivElement>(null);
  const mode = (COMP_MODES.some((m) => m.id === w.mode) ? w.mode : "gap") as CompMode;
  const briefing = aiContext(w, focus || undefined);
  useEffect(() => { alive.current = true; return () => { alive.current = false; ctrl.current?.abort(); }; }, []);
  useEffect(() => { if (focus) setFw(focus.fw); else if (!w.frameworks.includes(fw) && w.frameworks[0]) setFw(w.frameworks[0]); }, [focus, w.frameworks, fw]);
  useEffect(() => { if (prefill) { onWs((p) => ({ ...p, mode: prefill.mode })); setInput(prefill.text); onPrefillUsed(); } }, [prefill, onPrefillUsed, onWs]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [w.messages.length, live]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || running || !ai.provider) return;
    const before = w.messages;
    const messages: Msg[] = [...before, { role: "user", content: q }];
    onWs((p) => ({ ...p, messages }));
    setInput(""); setErr(null); setRunning(true); setLive("");
    const cc = new AbortController(); ctrl.current = cc;
    let acc = "";
    try {
      const res = await aiFetch({ method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", signal: cc.signal,
        body: JSON.stringify({ app: "compliance", task: mode, messages, provider: ai.provider, model: ai.model, options: { framework: fw, mode, briefing, org: w.org.description, region: w.org.country, research: ai.research ? "1" : "0" } }) });
      if (!res.ok || !res.body) {
        const j: any = await res.json().catch(() => ({}));
        if (alive.current) { setErr({ msg: j.error || `Request failed (${res.status})`, needKey: j.needKey }); onWs((p) => ({ ...p, messages: before })); setInput(q); setRunning(false); }
        return;
      }
      setMeta(`${res.headers.get("X-AI-Provider") || ""} · ${decodeURIComponent(res.headers.get("X-AI-Model") || "")}`);
      const reader = res.body.getReader(); const dec = new TextDecoder(); let last = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); if (Date.now() - last > 50) { setLive(stripStatus(acc)); last = Date.now(); } }
    } catch (e: any) { if (e?.name !== "AbortError") acc += `\n\n⚠️ ${String(e?.message || e)}`; }
    if (!alive.current) return;
    const answer = stripStatus(acc);
    onWs((p) => ({ ...p, messages: answer ? [...messages, { role: "assistant", content: answer }] : messages }));
    setLive(""); setRunning(false); ctrl.current = null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="card-pad flex min-h-[520px] min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{t.mode}</span>
          {COMP_MODES.map((m) => <button key={m.id} type="button" title={m.blurb} onClick={() => onWs((p) => ({ ...p, mode: m.id }))} data-testid={`comp-mode-${m.id}`}
            className={`rounded-lg border px-2.5 py-1 text-xs ${mode === m.id ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-slate-200 text-slate-600"}`}>{m.icon} {t.modes[m.id]}</button>)}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className="select w-auto py-1 text-sm" value={fw} onChange={(e) => setFw(e.target.value as FrameworkId)} aria-label={t.framework}>
            {(w.frameworks.length ? w.frameworks : (["iso27001"] as FrameworkId[])).map((f) => <option key={f} value={f}>{LIBRARY[f].version}</option>)}
          </select>
          {focus ? <span className="badge-brand">{t.focus.replace("{id}", `${focus.fw}:${focus.id}`)}<button type="button" className="ml-1" onClick={onClearFocus}>× {t.clearFocus}</button></span> : null}
        </div>
        <div className="mt-2"><ModelPicker lang={lang} value={ai} onChange={setAi} showResearch /></div>
        <div className="mt-3 flex-1 space-y-3 overflow-y-auto" data-testid="comp-ai-thread">
          {w.messages.map((m, i) => m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-ink-900 px-4 py-2.5 text-sm text-white">{m.content}</div>
          ) : (
            <article key={i} className="rounded-2xl border border-slate-200 bg-white p-4" data-testid="comp-ai-answer">
              <Markdown text={m.content} className="prose-axto text-sm" />
              <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2"><CopyBtn text={m.content} label={`📋 ${t.copy}`} done={t.copied} />{i === w.messages.length - 1 && meta ? <span className="ml-auto text-xs text-slate-500">{t.answeredBy} {meta}</span> : null}</div>
            </article>
          ))}
          {running ? <article className="rounded-2xl border border-slate-200 bg-white p-4">{live ? <Markdown text={live} className="prose-axto text-sm" /> : <span className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> {t.thinking}</span>}</article> : null}
          <div ref={end} />
        </div>
        {err ? <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">⚠️ {err.msg}{err.needKey ? <Link href="/app/settings?tab=ai" className="ml-2 font-semibold underline">{t.addKey}</Link> : null}</div> : null}
        {!w.messages.length ? <div className="mt-2 flex flex-wrap gap-1.5">{t.quickAsk.map((q) => <button key={q} type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:border-brand-400" onClick={() => setInput(q)}>{q}</button>)}</div> : null}
        <div className="mt-2 flex items-end gap-2">
          <textarea className="textarea min-h-[60px] flex-1 text-sm" placeholder={t.askPh} value={input} onChange={(e) => setInput(e.target.value)} data-testid="comp-ai-input"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(input); } }} />
          {running ? <button type="button" className="btn-secondary" onClick={() => ctrl.current?.abort()}>■ {t.stop}</button>
            : <button type="button" className="btn-primary" onClick={() => send(input)} disabled={!input.trim() || !ai.provider} data-testid="comp-ai-send">{t.send}</button>}
        </div>
        <p className="mt-2 text-xs text-slate-500">{t.notAdvice}</p>
      </section>
      <aside className="card-pad min-w-0">
        <button type="button" className="text-sm font-bold text-slate-900" onClick={() => setShowBrief((v) => !v)}>{showBrief ? "▾" : "▸"} {t.briefing}</button>
        <p className="mt-1 text-xs text-emerald-700">🛡️ {t.onDevice}</p>
        {showBrief ? <pre className="mt-2 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-mono text-[11px] text-slate-700" data-testid="comp-briefing">{briefing}</pre> : null}
      </aside>
    </div>
  );
}
