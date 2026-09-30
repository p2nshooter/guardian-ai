/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Floating live-support chat (public site + member portal).
 *   1. Visitor picks a topic from the dropdown (offer, lifetime licence
 *      negotiation, crypto, bank transfer, …), writes a message.
 *   2. An admin answers live when online; otherwise the AXTO Assistant answers
 *      from public information and the team follows up by e-mail.
 * The conversation id + token stay in this browser (localStorage) so the chat
 * survives reloads; polling pauses while the panel is closed or hidden.
 * ============================================================================ */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { pick, useI18n, type Lang } from "@/lib/i18n";
import { T } from "@/lib/i18n-pages/chat";

interface Topic { id: string; label: Partial<Record<Lang, string>>; hint: Partial<Record<Lang, string>>; handoff: boolean }
interface Msg { id: string; from: "visitor" | "admin" | "ai" | "system"; name: string; text: string; at: string }

const STORE = "axto_support_v1";
function load(): { id: string; token: string } | null {
  try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch { return null; }
}
function save(v: { id: string; token: string } | null) {
  try { v ? localStorage.setItem(STORE, JSON.stringify(v)) : localStorage.removeItem(STORE); } catch {}
}

export default function ChatWidget({ lang: forced, defaultName = "", defaultEmail = "", raised = false }: { lang?: Lang; defaultName?: string; defaultEmail?: string; raised?: boolean }) {
  const { lang: siteLang } = useI18n();
  const lang: Lang = forced || siteLang;   // follows the visitor's language (all 10)
  const t = pick(T, lang);
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [online, setOnline] = useState(false);
  const [conv, setConv] = useState<{ id: string; token: string } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [form, setForm] = useState({ topic: "", name: defaultName, email: defaultEmail, message: "" });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const etag = useRef("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConv(load());
    const onOpen = (e: Event) => {
      setOpen(true);
      const topic = (e as CustomEvent).detail?.topic;
      if (topic) setForm((f) => ({ ...f, topic }));
    };
    window.addEventListener("axto:support", onOpen);
    return () => window.removeEventListener("axto:support", onOpen);
  }, [forced]);

  useEffect(() => {
    if (!open || topics.length) return;
    fetch("/api/support").then((r) => r.json()).then((j) => {
      setTopics(j.topics || []);
      setOnline(!!j.adminOnline);
      setForm((f) => ({ ...f, topic: f.topic || j.topics?.[0]?.id || "other" }));
    }).catch(() => {});
  }, [open, topics.length]);

  const poll = useCallback(async () => {
    if (!conv) return;
    const r = await fetch(`/api/support/${conv.id}`, { headers: { "x-support-token": conv.token, ...(etag.current ? { "if-none-match": etag.current } : {}) } }).catch(() => null);
    if (!r) return;
    if (r.status === 404) { save(null); setConv(null); setMsgs([]); return; }
    if (r.status !== 200) return;
    etag.current = r.headers.get("etag") || "";
    const j = await r.json();
    setMsgs(j.messages || []);
    setOnline(!!j.adminOnline);
  }, [conv]);

  useEffect(() => {
    if (!open || !conv) return;
    poll();
    const iv = setInterval(() => { if (document.visibilityState === "visible") poll(); }, 4000);
    return () => clearInterval(iv);
  }, [open, conv, poll]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, busy]);

  const topic = topics.find((x) => x.id === form.topic);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || t.err);
      const c = { id: j.id, token: j.token };
      save(c); setConv(c); setMsgs(j.messages || []); etag.current = "";
      setForm((f) => ({ ...f, message: "" }));
    } catch (err: any) { setError(err.message || t.err); } finally { setBusy(false); }
  }

  async function send(body: Record<string, unknown>) {
    if (!conv) return;
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/support/${conv.id}`, { method: "POST", headers: { "Content-Type": "application/json", "x-support-token": conv.token }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || t.err);
      setMsgs(j.messages || []); etag.current = "";
    } catch (err: any) { setError(err.message || t.err); } finally { setBusy(false); }
  }

  // Workspace apps keep a composer at the bottom-right: dock the launcher as a small icon above it.
  const path = usePathname() || "";
  const dock = raised && /^\/app\/(studio|legal|compliance|security|clipper|prompts|vault)(\/|$)/.test(path);
  const btnPos = dock ? "bottom-52 lg:bottom-36 h-11 px-3 opacity-80 hover:opacity-100" : raised ? "bottom-20 lg:bottom-5 h-14 px-5" : "bottom-5 h-14 px-5";
  const panelPos = dock ? "bottom-[16rem] lg:bottom-48 max-h-[min(560px,calc(100dvh-18rem))]" : raised ? "bottom-36 lg:bottom-24 max-h-[min(640px,calc(100dvh-10rem))]" : "bottom-24 max-h-[min(640px,calc(100dvh-10rem))]";

  const who = (m: Msg) => (m.from === "visitor" ? t.you : m.from === "ai" ? t.ai : m.from === "admin" ? `${m.name || t.team} · ${t.team}` : "");

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? t.close : t.open}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        className={`fixed ${btnPos} right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-ink-900 text-sm font-semibold text-white shadow-lift transition hover:bg-ink-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 sm:right-5`}>
        <span aria-hidden="true" className="relative text-lg">💬{online ? <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-ink-900" /> : null}</span>
        <span className={dock ? "sr-only" : "hidden sm:inline"}>{open ? t.close : t.open}</span>
      </button>

      {open ? (
        <section role="dialog" aria-label={t.title}
          className={`fixed ${panelPos} right-3 z-[60] flex w-[calc(100vw-1.5rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift sm:right-5`}>
          <header className="flex items-center gap-3 bg-ink-900 px-4 py-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 font-bold">A</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{t.title}</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-slate-400"}`} />{online ? t.online : t.offline}
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label={t.close} className="rounded px-2 py-1 text-slate-300 hover:bg-white/10">✕</button>
          </header>

          {!conv ? (
            <form onSubmit={start} className="flex flex-col gap-3 overflow-y-auto p-4">
              <label className="text-sm font-semibold text-slate-800" htmlFor="sup-topic">{t.topic}</label>
              <select id="sup-topic" className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                {topics.map((x) => <option key={x.id} value={x.id}>{x.label[lang]}</option>)}
              </select>
              {topic ? <p className="-mt-1 text-xs text-slate-500">{topic.hint[lang]}</p> : null}
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder={t.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} autoComplete="name" />
                <input className="input" type="email" placeholder={topic?.handoff ? t.emailReq : t.email} value={form.email} required={!!topic?.handoff}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={254} autoComplete="email" />
              </div>
              <textarea className="input min-h-[110px]" placeholder={t.message} value={form.message} required minLength={2} maxLength={4000}
                onChange={(e) => setForm({ ...form, message: e.target.value })} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
              {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
              <button className="btn-primary" disabled={busy}>{busy ? t.typing : t.start}</button>
              <p className="text-center text-[11px] text-slate-400">{t.privacy}</p>
            </form>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
                {msgs.map((m) => m.from === "system" ? (
                  <p key={m.id} className="mx-auto max-w-[90%] rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">{m.text}</p>
                ) : (
                  <div key={m.id} className={`flex flex-col ${m.from === "visitor" ? "items-end" : "items-start"}`}>
                    <span className="mb-0.5 px-1 text-[11px] font-medium text-slate-400">{who(m)}</span>
                    <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.from === "visitor" ? "rounded-br-sm bg-brand-600 text-white" : m.from === "admin" ? "rounded-bl-sm bg-ink-900 text-white" : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"}`}>{m.text}</div>
                  </div>
                ))}
                {busy ? <div className="text-xs text-slate-400">{t.typing}</div> : null}
                <div ref={endRef} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); const v = text.trim(); if (v) { setText(""); send({ text: v }); } }} className="border-t border-slate-200 bg-white p-3">
                {error ? <p className="mb-2 text-xs font-medium text-rose-600">{error}</p> : null}
                <div className="flex gap-2">
                  <textarea className="input min-h-[42px] flex-1 resize-none py-2" rows={1} value={text} placeholder={t.message} maxLength={4000}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }} />
                  <button className="btn-primary px-4" disabled={busy || !text.trim()}>{t.send}</button>
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => send({ action: "human" })} disabled={busy}>🙋 {t.human}</button>
                  <button type="button" className="text-slate-500 hover:underline" onClick={() => { save(null); setConv(null); setMsgs([]); }}>{t.newChat}</button>
                </div>
              </form>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}

/** Opens the chat from anywhere, optionally pre-selecting a topic (e.g. "lifetime"). */
export function openSupport(topic?: string) {
  window.dispatchEvent(new CustomEvent("axto:support", { detail: { topic } }));
}
