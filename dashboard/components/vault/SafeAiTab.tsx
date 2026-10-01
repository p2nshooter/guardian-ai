/* PRIVACY VAULT — Safe AI: a conversation with the member's own AI in which
 * every message is redacted on the device first (one key for the whole
 * conversation), and every answer is restored on the device afterwards.
 * The server and the AI provider only ever see placeholders. */
"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { Spinner } from "@/components/ui";
import ModelPicker, { type AiChoice } from "@/components/ai/ModelPicker";
import Markdown from "@/components/Markdown";
import { stripStatus } from "@/lib/markdown";
import { createRedactor, restore, type Finding } from "@/lib/vault/pii";
import { aiStyle, engineOptions, type VaultSettings } from "@/lib/vault/settings";
import type { VaultDict } from "@/lib/i18n-pages/vault";
import { aiFetch } from "@/lib/ai/client-run";

interface Turn { role: "user" | "assistant"; sent: string; shown: string }
type Redactor = ReturnType<typeof createRedactor>;

export const firstMessage = (request: string, doc: string) =>
  `${request.trim()}\n\n<document>\n${doc}\n</document>`;

export default function SafeAiTab({ t, lang, source, settings, onMap, onGoText }: {
  t: VaultDict; lang: Lang;
  source: { text: string; findings: Finding[] } | null;
  settings: VaultSettings; onMap: (m: Record<string, string>) => void; onGoText: () => void;
}) {
  const [ai, setAi] = useState<AiChoice>({ provider: "", model: "", research: false });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [live, setLive] = useState("");
  const [running, setRunning] = useState(false);
  const [raw, setRaw] = useState<Record<number, boolean>>({});
  const [err, setErr] = useState<{ msg: string; needKey?: boolean; upgrade?: boolean } | null>(null);
  const red = useRef<Redactor | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const style = aiStyle(settings.style);

  // A preview of what the AI will receive for the first message.
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (turns.length || !source) { setPreview(""); return; }
    const { enabled, options } = engineOptions(settings);
    setPreview(createRedactor(style, enabled, options).apply(source.text, source.findings).redacted);
  }, [source, settings, style, turns.length]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [turns.length, live]);

  function reset() { ctrl.current?.abort(); red.current = null; setTurns([]); setLive(""); setErr(null); onMap({}); }

  async function send(text: string) {
    const ask = text.trim();
    if (!ask || running || !ai.provider) return;
    const { enabled, options } = engineOptions(settings);
    let content: string;
    if (!red.current) {
      if (!source?.text.trim()) return;
      red.current = createRedactor(style, enabled, options);
      const doc = red.current.apply(source.text, source.findings).redacted;
      content = firstMessage(red.current.redact(ask).redacted, doc);
    } else content = red.current.redact(ask).redacted;
    const r = red.current;
    const history: Turn[] = [...turns, { role: "user", sent: content, shown: ask }];
    setTurns(history); setQ(""); setErr(null); setRunning(true); setLive("");
    onMap({ ...r.map });
    const c = new AbortController(); ctrl.current = c;
    let acc = "";
    try {
      const res = await aiFetch({
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", signal: c.signal,
        body: JSON.stringify({ app: "vault", provider: ai.provider, model: ai.model, messages: history.map((h) => ({ role: h.role, content: h.sent })), options: {} }),
      });
      if (!res.ok || !res.body) {
        const j: any = await res.json().catch(() => ({}));
        setErr({ msg: j.error || `Request failed (${res.status})`, needKey: j.needKey, upgrade: j.upgrade });
        setTurns(turns); setQ(ask); if (!turns.length) red.current = null;
        setRunning(false); return;
      }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let last = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        if (Date.now() - last > 50) { last = Date.now(); setLive(stripStatus(acc)); }
      }
    } catch (e: any) { if (e?.name !== "AbortError") acc += `\n\n⚠️ ${String(e?.message || e)}`; }
    const answer = stripStatus(acc);
    setTurns(answer ? [...history, { role: "assistant", sent: answer, shown: restore(answer, r.map) }] : history);
    setLive(""); setRunning(false); ctrl.current = null;
  }

  const map = red.current?.map || {};
  if (!source?.text.trim() && !turns.length) {
    return (
      <div className="card-pad text-center">
        <div className="text-3xl">🤖</div>
        <h2 className="mt-2 text-base font-bold text-slate-900">{t.aiTitle}</h2>
        <p className="mx-auto mt-1 max-w-xl text-sm text-slate-600">{t.aiSub}</p>
        <p className="mt-4 text-sm font-semibold text-amber-700">{t.aiNoText}</p>
        <button type="button" className="btn-primary mt-3" onClick={onGoText}>← {t.tabs.text}</button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="card-pad flex min-h-[520px] min-w-0 flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1"><ModelPicker lang={lang} value={ai} onChange={setAi} showResearch={false} /></div>
          {turns.length ? <button type="button" className="btn-ghost btn-sm" onClick={reset} data-testid="vault-ai-new">＋ {t.newChat}</button> : null}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto" data-testid="vault-ai-thread">
          {!turns.length ? (
            <div className="rounded-xl bg-slate-50 p-4">
              <h2 className="text-sm font-bold text-slate-900">{t.aiTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">{t.aiSub}</p>
              {style !== settings.style ? <p className="mt-2 text-xs text-amber-700">{t.aiStyleNote}</p> : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.quick.map((label, i) => (
                  <button key={i} type="button" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-400" onClick={() => setQ(t.quickPrompts[i])}>{label}</button>
                ))}
              </div>
            </div>
          ) : null}
          {turns.map((m, i) => (
            <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white" : "max-w-full"} data-testid={m.role === "user" ? "vault-ai-user" : "vault-ai-answer"}>
              {m.role === "user" ? (
                <div className="whitespace-pre-wrap break-words">{m.shown}</div>
              ) : (
                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                    🤖 {t.aiName}
                    <label className="ml-auto flex cursor-pointer items-center gap-1 font-normal">
                      <input type="checkbox" className="accent-brand-600" checked={!!raw[i]} onChange={() => setRaw((r) => ({ ...r, [i]: !r[i] }))} />{t.asSent}
                    </label>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(raw[i] ? m.sent : m.shown).catch(() => {})}>📋</button>
                  </div>
                  <Markdown text={raw[i] ? m.sent : m.shown} className="prose-axto text-sm" />
                </div>
              )}
            </div>
          ))}
          {running ? (
            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
              {live ? <Markdown text={restore(live, map)} className="prose-axto text-sm" /> : <span className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> {t.thinking}</span>}
            </div>
          ) : null}
          <div ref={end} />
        </div>
        {err ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
            <span>⚠️ {err.msg}</span>
            {err.needKey ? <Link href="/app/settings?tab=ai" className="btn-secondary btn-sm">🔑</Link> : null}
            {err.upgrade ? <Link href="/app/billing" className="btn-secondary btn-sm">{t.upgrade}</Link> : null}
          </div>
        ) : null}
        <form className="mt-3 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(q); }}>
          <textarea className="textarea min-h-[52px] flex-1 text-sm" rows={2} value={q} onChange={(e) => setQ(e.target.value)} data-testid="vault-ai-input"
            placeholder={turns.length ? t.followPh : t.questionPh}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(q); } }} />
          {running
            ? <button type="button" className="btn-secondary" onClick={() => ctrl.current?.abort()}>■ {t.stop}</button>
            : <button type="submit" className="btn-primary" disabled={!q.trim() || !ai.provider} data-testid="vault-ai-send">{t.send}</button>}
        </form>
      </section>

      <aside className="card-pad min-w-0">
        <div className="text-sm font-bold text-slate-900">{t.aiSource}</div>
        <p className="mt-1 text-xs text-emerald-700">🛡️ {t.onDevice}</p>
        <pre className="mt-2 max-h-[440px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-700" data-testid="vault-ai-preview">
          {turns.length ? turns[0].sent : preview}
        </pre>
      </aside>
    </div>
  );
}
