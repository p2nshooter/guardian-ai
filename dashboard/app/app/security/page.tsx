/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * SECURITY ANALYST — paste logs/alerts, pick a mode, and get triage, IOC
 * extraction, MITRE ATT&CK mapping or an incident report on your own AI keys.
 * Indicators are extracted locally in the browser first and handed to the model
 * as verified context. Investigations are saved to encrypted history (CRUD).
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n, pick } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, Spinner } from "@/components/ui";
import Markdown from "@/components/Markdown";
import ModelPicker, { type AiChoice } from "@/components/ai/ModelPicker";
import { stripStatus } from "@/lib/markdown";
import { SEC_MODES, type SecMode, extractIocs, iocBlock, iocCount } from "@/lib/security/modes";

interface Msg { role: "user" | "assistant"; content: string }
interface Entry { id: string; title: string; updatedAt: string }

const L = {
  en: { title: "Security Analyst", sub: "Triage, IOCs, MITRE mapping & incident reports — on your own keys.",
    mode: "Analysis", context: "Context (optional)", contextPh: "e.g. Windows server, external-facing, SOC tier-1 alert",
    newCase: "New investigation", history: "Saved investigations", empty: "No saved investigations yet.",
    paste: "Paste logs, an alert, a command or a suspicious script…", run: "Analyze", stop: "Stop", thinking: "Analyzing…",
    copy: "Copy", copied: "Copied", rename: "Rename", duplicate: "Duplicate", del: "Delete", confirmDel: "Delete this investigation?",
    addKey: "Add an AI key", answeredBy: "via", iocsFound: "indicators found locally", renamePrompt: "New title:",
    noPlan: "Security Analyst is included from the Pro plan.", upgrade: "See plans", defensive: "Defensive use only. Analyze systems you are authorised to." },
  id: { title: "Security Analyst", sub: "Triase, IOC, pemetaan MITRE & laporan insiden — pakai kunci Anda.",
    mode: "Analisis", context: "Konteks (opsional)", contextPh: "mis. server Windows, terekspos internet, alert SOC tier-1",
    newCase: "Investigasi baru", history: "Investigasi tersimpan", empty: "Belum ada investigasi tersimpan.",
    paste: "Tempel log, alert, perintah, atau skrip mencurigakan…", run: "Analisis", stop: "Berhenti", thinking: "Menganalisis…",
    copy: "Salin", copied: "Tersalin", rename: "Ganti nama", duplicate: "Duplikat", del: "Hapus", confirmDel: "Hapus investigasi ini?",
    addKey: "Tambah kunci AI", answeredBy: "via", iocsFound: "indikator ditemukan lokal", renamePrompt: "Judul baru:",
    noPlan: "Security Analyst termasuk mulai paket Pro.", upgrade: "Lihat paket", defensive: "Hanya untuk pertahanan. Analisis sistem yang Anda berwenang." },
};

export default function SecurityApp() {
  const { lang } = useI18n();
  const { me } = useMe();
  const t = pick(L, lang);
  const [items, setItems] = useState<Entry[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [mode, setMode] = useState<SecMode>("triage");
  const [context, setContext] = useState("");
  const [thread, setThread] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [live, setLive] = useState("");
  const [running, setRunning] = useState(false);
  const [ai, setAi] = useState<AiChoice>({ provider: "", model: "", research: false });
  const [err, setErr] = useState<{ msg: string; needKey?: boolean } | null>(null);
  const [meta, setMeta] = useState<{ provider: string; model: string } | null>(null);
  const [copied, setCopied] = useState(-1);
  const [sidebar, setSidebar] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const access = !!me && me.limits.apps.includes("security");

  const liveIocs = useMemo(() => iocCount(extractIocs(input)), [input]);
  const reload = useCallback(async () => { const r = await api<{ items: Entry[] }>("/api/history/security"); if (r.ok) setItems(r.data.items); }, []);
  useEffect(() => { if (access) reload(); }, [access, reload]);
  // Deep link from My files: /app/security?open=<id>
  useEffect(() => { const oid = new URLSearchParams(window.location.search).get("open"); if (access && oid) open(oid); }, [access]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 40); }, [thread, live]);

  async function open(cid: string) {
    const r = await api<{ item: { body: { mode: SecMode; context: string; messages: Msg[] } } }>(`/api/history/security/${cid}`);
    if (r.ok) { setId(cid); setThread(r.data.item.body.messages || []); setMode(r.data.item.body.mode || "triage"); setContext(r.data.item.body.context || ""); setMeta(null); setErr(null); setSidebar(false); }
  }
  function newCase() { setId(null); setThread([]); setInput(""); setMeta(null); setErr(null); setSidebar(false); }

  async function persist(next: Msg[]) {
    const title = (next.find((m) => m.role === "user")?.content || t.newCase).replace(/\s+/g, " ").slice(0, 80);
    const r = await api<{ item: Entry }>("/api/history/security", { body: { id: id || undefined, title, body: { mode, context, messages: next.map((m) => ({ ...m, content: m.role === "assistant" ? stripStatus(m.content) : m.content })) }, meta: { mode } } });
    if (r.ok) { if (!id) setId(r.data.item.id); reload(); }
  }

  async function run(messages: Msg[]) {
    const ctrl = new AbortController(); abortRef.current = ctrl;
    setRunning(true); setLive(""); setErr(null); setThread(messages);
    const allUserText = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
    const iocs = iocBlock(extractIocs(allUserText));
    let acc = "";
    try {
      const res = await fetch("/api/byox/run", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", signal: ctrl.signal,
        body: JSON.stringify({ app: "security", task: mode, messages, provider: ai.provider, model: ai.model, options: { mode, context, iocs, research: ai.research ? "1" : "0" } }),
      });
      if (!res.ok || !res.body) {
        const j: any = await res.json().catch(() => ({}));
        setErr({ msg: j.error || `Request failed (${res.status})`, needKey: j.needKey });
        setThread(messages.slice(0, -1)); setInput(messages[messages.length - 1]?.content || ""); setRunning(false); return;
      }
      setMeta({ provider: res.headers.get("X-AI-Provider") || "", model: decodeURIComponent(res.headers.get("X-AI-Model") || "") });
      const reader = res.body.getReader(); const dec = new TextDecoder(); let last = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); if (Date.now() - last > 50) { setLive(acc); last = Date.now(); } }
    } catch (e: any) { acc += e?.name === "AbortError" ? "" : `\n\n⚠️ ${String(e?.message || e)}`; }
    const next = [...messages, { role: "assistant" as const, content: acc }];
    setThread(next); setLive(""); setRunning(false); abortRef.current = null;
    if (acc.trim()) persist(next);
  }
  function send() { const text = input.trim(); if (!text || running) return; setInput(""); run([...thread, { role: "user", content: text }]); }
  async function rename(cid: string, cur: string) { const title = prompt(t.renamePrompt, cur); if (title == null) return; await api(`/api/history/security/${cid}/rename`, { body: { title } }); reload(); }
  async function duplicate(cid: string) { await api(`/api/history/security/${cid}/duplicate`, { body: {} }); reload(); }
  async function del(cid: string) { if (!confirm(t.confirmDel)) return; await api(`/api/history/security/${cid}`, { method: "DELETE" }); if (cid === id) newCase(); reload(); }

  if (!me) return <LoadingBlock />;
  if (!access) return (
    <div className="surface-ink relative overflow-hidden rounded-2xl p-8"><div className="glow pointer-events-none absolute inset-0" />
      <div className="relative"><div className="text-4xl">🛡️</div><h1 className="mt-3 text-2xl font-extrabold text-white">{t.noPlan}</h1>
        <Link href="/app/billing?plan=pro" className="btn-primary btn-lg mt-5">{t.upgrade} →</Link></div></div>
  );

  const aside = (
    <div className="flex h-full flex-col">
      <button className="btn-primary btn-sm mb-3" onClick={newCase}>＋ {t.newCase}</button>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.history}</div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length ? items.map((c) => (
          <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${c.id === id ? "bg-brand-50" : "hover:bg-slate-50"}`}>
            <button className="min-w-0 flex-1 truncate text-left" onClick={() => open(c.id)}>{c.title}</button>
            <div className="hidden shrink-0 gap-0.5 group-hover:flex">
              <button className="rounded px-1 text-xs text-slate-400 hover:text-slate-700" title={t.rename} onClick={() => rename(c.id, c.title)}>✎</button>
              <button className="rounded px-1 text-xs text-slate-400 hover:text-slate-700" title={t.duplicate} onClick={() => duplicate(c.id)}>⧉</button>
              <button className="rounded px-1 text-xs text-slate-400 hover:text-rose-600" title={t.del} onClick={() => del(c.id)}>✕</button>
            </div>
          </div>
        )) : <p className="px-2 py-3 text-xs text-slate-400">{t.empty}</p>}
      </div>
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="no-print hidden lg:block"><div className="card sticky top-20 h-[calc(100vh-6rem)] p-3">{aside}</div></aside>
      <div className="min-w-0">
        <div className="mb-4 flex items-center gap-2">
          <button className="btn-secondary btn-sm lg:hidden" onClick={() => setSidebar(true)}>☰ {t.history}</button>
          <div><div className="eyebrow">🛡️ {t.sub}</div><h1 className="text-2xl font-bold">{t.title}</h1></div>
        </div>

        <section className="card-pad mb-4">
          <div className="mb-1 text-sm font-semibold text-slate-700">{t.mode}</div>
          <div className="flex flex-wrap gap-2">
            {SEC_MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)} title={m.blurb}
                className={`rounded-lg border px-3 py-1.5 text-sm ${mode === m.id ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                {m.icon} {m.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{SEC_MODES.find((m) => m.id === mode)!.blurb}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <input className="input" placeholder={t.contextPh} value={context} onChange={(e) => setContext(e.target.value)} aria-label={t.context} />
            <ModelPicker lang={lang} value={ai} onChange={setAi} showResearch />
          </div>
        </section>

        <section className="space-y-4">
          {thread.map((m, i) => m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-ink-900 px-4 py-3 font-mono text-xs text-white">{m.content}</div>
          ) : (
            <article key={i} className="card-pad">
              <Markdown text={m.content} />
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <button className="btn-ghost btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(stripStatus(m.content)); setCopied(i); setTimeout(() => setCopied(-1), 1500); } catch {} }}>📋 {copied === i ? t.copied : t.copy}</button>
                {i === thread.length - 1 && meta ? <span className="ml-auto text-xs text-slate-500">{t.answeredBy} {meta.provider} · {meta.model}</span> : null}
              </div>
            </article>
          ))}
          {running ? <article className="card-pad">{live ? <Markdown text={live} /> : <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> {t.thinking}</div>}<div className="mt-3 border-t border-slate-100 pt-2"><button className="btn-secondary btn-sm" onClick={() => abortRef.current?.abort()}>■ {t.stop}</button></div></article> : null}
          {err ? <Alert tone="error">{err.msg}{err.needKey ? <Link href="/app/settings?tab=ai" className="ml-2 font-semibold underline">{t.addKey}</Link> : null}</Alert> : null}
          <div ref={endRef} />
        </section>

        <div className="sticky bottom-20 mt-4 lg:bottom-4">
          <div className="card-pad">
            <div className="flex items-end gap-2">
              <textarea className="textarea max-h-56 min-h-[64px] flex-1 font-mono text-xs" placeholder={t.paste} value={input}
                onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }} />
              <button className="btn-primary" onClick={send} disabled={running || !input.trim() || !ai.provider}>{running ? <Spinner /> : t.run}</button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{t.defensive}</span>
              {liveIocs > 0 ? <span className="badge-brand">🔎 {liveIocs} {t.iocsFound}</span> : null}
            </div>
          </div>
        </div>
      </div>

      {sidebar ? <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebar(false)}><div className="absolute inset-0 bg-ink-950/40" /><aside className="absolute inset-y-0 left-0 w-72 bg-white p-3 shadow-lift" onClick={(e) => e.stopPropagation()}>{aside}</aside></div> : null}
    </div>
  );
}
