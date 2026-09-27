/* Admin → Support inbox: live chats + contact-form messages in one place.
 * Go "Online" to answer live (the AI steps back); while nobody is online the
 * AXTO Assistant answers visitors from public information only. */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { PageHeader, Tabs, EmptyState, LoadingBlock, Alert } from "@/components/ui";
import { TOPICS, getTopic } from "@/lib/support/topics";

interface Thread {
  id: string; name: string; email: string; topic: string; source: string; status: string; needs_admin: number; ai_enabled: number;
  subject: string; last_from: string; last_preview: string; unread_admin: number; message_count: number; last_message_at: string; created_at: string;
}
interface Msg { id: string; from: "visitor" | "admin" | "ai" | "system"; name: string; text: string; at: string }
interface Presence { online: boolean; name: string; at: number }

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  return s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
};

const QUICK: Record<string, string> = {
  lifetime: "Thanks for your interest in a lifetime licence! To prepare your proposal, could you confirm: 1) which apps, 2) number of devices, 3) company name and country, 4) preferred payment (wire / crypto / card)? We'll send a formal quotation within one business day.",
  quote: "Thank you! We'll prepare a quotation. Could you share the number of users, the apps you need and your target start date?",
  crypto: "You can pay in USDT (TRC20/ERC20/BEP20), USDC, BTC, ETH or SOL. Start the checkout with “Crypto — direct wallet transfer” to get the exact address and amount, then send us the transaction hash here.",
  bank: "You can pay by bank transfer to our BNI account. Start the checkout with “Bank transfer” to get the account details and your order reference, then send us the receipt here.",
};

export default function SupportInboxPage() {
  const [tab, setTab] = useState<"inbox" | "ai">("inbox");
  return (
    <>
      <PageHeader eyebrow="Support" title="Support inbox" description="Live chats and contact-form messages. Go online to answer live — while nobody is online the AXTO Assistant answers from public information only." />
      <div className="mb-5"><Tabs value={tab} onChange={setTab} items={[{ id: "inbox", label: "💬 Inbox" }, { id: "ai", label: "🤖 AI assistant" }]} /></div>
      {tab === "inbox" ? <Inbox /> : <AiSettings />}
    </>
  );
}

function Inbox() {
  const [status, setStatus] = useState("open");
  const [topic, setTopic] = useState("");
  const [q, setQ] = useState("");
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [presence, setPresence] = useState<Presence>({ online: false, name: "", at: 0 });
  const [sel, setSel] = useState<string>("");

  const load = useCallback(async () => {
    const r = await api<any>(`/api/admin/support?status=${status}&topic=${topic}&q=${encodeURIComponent(q)}`);
    if (r.ok) { setThreads(r.data.threads); setCounts(r.data.counts || {}); setPresence(r.data.presence); }
  }, [status, topic, q]);

  useEffect(() => { load(); const iv = setInterval(load, 10_000); return () => clearInterval(iv); }, [load]);
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("t"); if (t) { setSel(t); setStatus("all"); } }, []);

  // Presence heartbeat while online and this page is open.
  useEffect(() => {
    if (!presence.online) return;
    const iv = setInterval(() => api("/api/admin/support", { method: "PUT", body: { online: true } }), 60_000);
    return () => clearInterval(iv);
  }, [presence.online]);

  async function toggleOnline() {
    const r = await api<any>("/api/admin/support", { method: "PUT", body: { online: !presence.online } });
    if (r.ok) setPresence(r.data.presence);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="card flex min-h-[560px] flex-col overflow-hidden">
        <div className="space-y-3 border-b border-slate-200 p-4">
          <button onClick={toggleOnline} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold ${presence.online ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-700"}`}>
            <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${presence.online ? "bg-emerald-500" : "bg-slate-400"}`} />{presence.online ? "You're online — answering live" : "Away — AI assistant answers"}</span>
            <span className="text-xs underline">{presence.online ? "Go away" : "Go online"}</span>
          </button>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[["open", `Open ${counts.open ?? ""}`], ["answered", `Answered ${counts.answered ?? ""}`], ["closed", "Closed"], ["all", "All"]].map(([id, label]) => (
              <button key={id} onClick={() => setStatus(id)} className={`rounded-full px-3 py-1 font-semibold ${status === id ? "bg-ink-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>
            ))}
            {counts.handoff ? <span className="badge-amber">🙋 {counts.handoff} need a person</span> : null}
          </div>
          <div className="flex gap-2">
            <select className="input py-2 text-xs" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">All topics</option>
              {TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label.en}</option>)}
            </select>
            <input className="input py-2 text-xs" placeholder="Search name, e-mail, text…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads === null ? <LoadingBlock /> : threads.length === 0 ? (
            <div className="p-6"><EmptyState icon="📭" title="No conversations">New chats and contact messages appear here.</EmptyState></div>
          ) : threads.map((t) => (
            <button key={t.id} onClick={() => setSel(t.id)}
              className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition ${sel === t.id ? "bg-brand-50" : "hover:bg-slate-50"}`}>
              <div className="flex items-center gap-2">
                <span className={`truncate font-semibold ${t.unread_admin ? "text-slate-900" : "text-slate-700"}`}>{t.name || t.email || "Visitor"}</span>
                {t.unread_admin ? <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{t.unread_admin}</span> : null}
                <span className="ml-auto shrink-0 text-xs text-slate-400">{ago(t.last_message_at)}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                <span className="badge-gray">{getTopic(t.topic).label.en}</span>
                {t.source !== "chat" ? <span className="badge-brand">{t.source === "contact" ? "✉️ contact form" : t.source}</span> : null}
                {t.needs_admin ? <span className="badge-amber">🙋 person</span> : null}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{t.last_from === "ai" ? "🤖 " : t.last_from === "admin" ? "↩︎ " : ""}{t.last_preview}</p>
            </button>
          ))}
        </div>
      </div>
      {sel ? <ThreadView id={sel} onChange={load} /> : (
        <div className="card flex items-center justify-center p-10"><EmptyState icon="💬" title="Pick a conversation">Replies appear in the visitor's chat and are e-mailed to them.</EmptyState></div>
      )}
    </div>
  );
}

function ThreadView({ id, onChange }: { id: string; onChange: () => void }) {
  const [data, setData] = useState<{ thread: Thread; messages: Msg[] } | null>(null);
  const [text, setText] = useState("");
  const [email, setEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await api<any>(`/api/admin/support/${id}`);
    if (r.ok) setData(r.data); else setError(r.error || "Could not load the conversation.");
  }, [id]);
  useEffect(() => { setData(null); setError(""); load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView(); }, [data?.messages.length]);

  async function act(body: Record<string, unknown>) {
    setBusy(true); setError("");
    const r = await api<any>(`/api/admin/support/${id}`, { method: "POST", body });
    setBusy(false);
    if (!r.ok) { setError(r.error || "Failed."); return; }
    setData(r.data); onChange();
  }

  if (error && !data) return <div className="card-pad"><Alert tone="error">{error}</Alert></div>;
  if (!data) return <div className="card-pad"><LoadingBlock /></div>;
  const t = data.thread;
  const topic = getTopic(t.topic);

  return (
    <div className="card flex min-h-[560px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-start gap-3 border-b border-slate-200 p-4">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900">{t.name || "Visitor"} {t.email ? <a href={`mailto:${t.email}`} className="ml-1 text-sm font-normal text-brand-700">{t.email}</a> : <span className="ml-1 text-sm font-normal text-slate-400">no e-mail</span>}</div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
            <span className="badge-gray">{topic.label.en}</span><span className="badge-gray">via {t.source}</span><span className="badge-gray">{t.status}</span>
            {t.needs_admin ? <span className="badge-amber">🙋 needs a person</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {t.needs_admin ? <button className="btn-secondary btn-sm" disabled={busy} onClick={() => act({ action: "resolve_handoff" })}>Mark handled</button> : null}
          <button className="btn-secondary btn-sm" disabled={busy} onClick={() => act({ action: t.ai_enabled ? "ai_off" : "ai_on" })}>{t.ai_enabled ? "🤖 AI on" : "🤖 AI off"}</button>
          {t.status === "closed"
            ? <button className="btn-secondary btn-sm" disabled={busy} onClick={() => act({ action: "reopen" })}>Reopen</button>
            : <button className="btn-secondary btn-sm" disabled={busy} onClick={() => act({ action: "close" })}>Close</button>}
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
        {data.messages.map((m) => m.from === "system" ? (
          <p key={m.id} className="mx-auto max-w-[85%] rounded-lg bg-amber-50 px-3 py-1.5 text-center text-xs text-amber-800">{m.text}</p>
        ) : (
          <div key={m.id} className={`flex flex-col ${m.from === "visitor" ? "items-start" : "items-end"}`}>
            <span className="mb-0.5 px-1 text-[11px] text-slate-400">{m.from === "ai" ? "🤖 AXTO Assistant" : m.from === "admin" ? `↩︎ ${m.name}` : m.name || "Visitor"} · {new Date(m.at).toLocaleString()}</span>
            <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${m.from === "visitor" ? "rounded-bl-sm border border-slate-200 bg-white text-slate-800" : m.from === "admin" ? "rounded-br-sm bg-ink-900 text-white" : "rounded-br-sm bg-brand-50 text-slate-800 ring-1 ring-brand-100"}`}>{m.text}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="border-t border-slate-200 bg-white p-3" onSubmit={(e) => { e.preventDefault(); if (text.trim()) act({ action: "reply", text, email }).then(() => setText("")); }}>
        {error ? <p className="mb-2 text-xs text-rose-600">{error}</p> : null}
        {QUICK[t.topic] ? <button type="button" className="mb-2 text-xs font-medium text-brand-700 hover:underline" onClick={() => setText(QUICK[t.topic])}>Insert quick reply for “{topic.label.en}”</button> : null}
        <textarea className="input min-h-[90px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply… (Ctrl/⌘ + Enter to send)" maxLength={4000}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); }} />
        <div className="mt-2 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} disabled={!t.email} /> Also e-mail this reply{t.email ? "" : " (no e-mail)"}</label>
          <button className="btn-primary btn-sm" disabled={busy || !text.trim()}>Send reply</button>
        </div>
      </form>
    </div>
  );
}

interface ProviderRow { label: string; provider: string; base_url: string; model: string; keys: string; keyCount?: number; masked?: string[] }

function AiSettings() {
  const [s, setS] = useState<{ enabled: boolean; use_workers_ai: boolean; providers: ProviderRow[] } | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Mirrors the chat providers in lib/ai/providers.ts (kept here so the SDK never ships to the browser).
  const chat = [
    { id: "custom", name: "OpenAI-compatible gateway (e.g. ulyah.com)", defaultModel: "" },
    { id: "anthropic", name: "Anthropic Claude", defaultModel: "claude-opus-5" },
    { id: "openai", name: "OpenAI", defaultModel: "gpt-5-mini" },
    { id: "google", name: "Google Gemini", defaultModel: "gemini-2.5-flash" },
    { id: "groq", name: "Groq", defaultModel: "llama-3.3-70b-versatile" },
    { id: "openrouter", name: "OpenRouter", defaultModel: "openrouter/auto" },
  ];

  useEffect(() => {
    api<any>("/api/admin/support/settings").then((r) => {
      if (r.ok) setS({ ...r.data, providers: r.data.providers.map((p: any) => ({ ...p, keys: "", masked: p.keys })) });
    });
  }, []);

  if (!s) return <LoadingBlock />;
  const upd = (i: number, patch: Partial<ProviderRow>) => setS({ ...s, providers: s.providers.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  async function save() {
    setBusy(true); setMsg(null);
    const r = await api("/api/admin/support/settings", { method: "PUT", body: { enabled: s!.enabled, use_workers_ai: s!.use_workers_ai, providers: s!.providers.map(({ label, provider, base_url, model, keys }) => ({ label, provider, base_url, model, keys })) } });
    setBusy(false);
    setMsg(r.ok ? { tone: "success", text: "Saved — keys are encrypted in R2 and never shown again." } : { tone: "error", text: r.error || "Could not save." });
  }
  async function test() {
    setBusy(true); setMsg(null);
    const r = await api<any>("/api/admin/support/settings", { method: "POST", body: { test: true } });
    setBusy(false);
    setMsg(r.ok ? { tone: "success", text: `Test answer: ${r.data.answer}` } : { tone: "error", text: r.error || "Test failed." });
  }

  return (
    <div className="grid gap-5">
      <Alert tone="info" title="Confidential by design">
        The assistant only receives public facts (plans, prices, apps, FAQ, the names of payment methods). Keys, bank accounts, wallets, customer data and internal settings are never sent to the model, and every answer passes a secret-redaction filter. It never negotiates prices or confirms payments — those conversations are flagged for you.
      </Alert>
      <div className="card-pad grid gap-4">
        <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} /> Let the AI assistant answer while no admin is online</label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={s.use_workers_ai} onChange={(e) => setS({ ...s, use_workers_ai: e.target.checked })} /> Use Cloudflare Workers AI as the last fallback</label>
      </div>
      {s.providers.map((p, i) => (
        <div key={i} className="card-pad grid gap-3">
          <div className="flex items-center justify-between"><h3 className="font-semibold">Provider #{i + 1} {i === 0 ? <span className="text-xs font-normal text-slate-500">(tried first)</span> : null}</h3>
            <button className="btn-ghost btn-sm text-rose-600" onClick={() => setS({ ...s, providers: s.providers.filter((_, j) => j !== i) })}>Remove</button></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label">Name</label><input className="input" value={p.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="e.g. ulyah.com gateway" /></div>
            <div><label className="label">Provider</label><select className="input" value={p.provider} onChange={(e) => upd(i, { provider: e.target.value })}>{chat.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label">Model</label><input className="input" value={p.model} onChange={(e) => upd(i, { model: e.target.value })} placeholder={chat.find((c) => c.id === p.provider)?.defaultModel || "model name"} /></div>
          </div>
          {p.provider === "custom" ? <div><label className="label">OpenAI-compatible base URL</label><input className="input" value={p.base_url} onChange={(e) => upd(i, { base_url: e.target.value })} placeholder="https://api.your-gateway.com/v1" /></div> : null}
          <div>
            <label className="label">API keys — one per line (up to 500; shuffled, failed keys skipped)</label>
            <textarea className="input min-h-[110px] font-mono text-xs" value={p.keys} onChange={(e) => upd(i, { keys: e.target.value })}
              placeholder={p.keyCount ? `${p.keyCount} key(s) saved (${(p.masked || []).join(", ")}…). Leave empty to keep them; paste to replace.` : "sk-…\nsk-…"} />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => setS({ ...s, providers: [...s.providers, { label: "", provider: "custom", base_url: "", model: "", keys: "" }] })}>+ Add provider</button>
        <button className="btn-primary" disabled={busy} onClick={save}>Save</button>
        <button className="btn-secondary" disabled={busy} onClick={test}>Test the assistant</button>
      </div>
      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
    </div>
  );
}
