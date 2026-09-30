/* AXTO — Developers → Live console: watch channels over SSE or long polling and publish events. */
"use client";
import { useEffect, useRef, useState } from "react";
import type { DevelopersDict } from "@/lib/i18n-pages/developers";
import { Alert } from "@/components/ui";
import { badge } from "./shared";

interface Ev { id: number; channel: string; type: string; data: unknown; createdAt: string }

export default function Console({ t }: { t: DevelopersDict }) {
  const [channels, setChannels] = useState("*");
  const [transport, setTransport] = useState<"sse" | "poll">("sse");
  const [live, setLive] = useState(false);
  const [events, setEvents] = useState<Ev[]>([]);
  const [pub, setPub] = useState({ channel: "demo.chat", type: "message", data: '{"text":"Hello from the console"}' });
  const [err, setErr] = useState("");
  const es = useRef<EventSource | null>(null);
  const stop = useRef(false);

  const push = (e: Ev) => setEvents((cur) => (cur.some((x) => x.id === e.id) ? cur : [e, ...cur].slice(0, 200)));
  function disconnect() { stop.current = true; es.current?.close(); es.current = null; setLive(false); }
  useEffect(() => () => disconnect(), []);

  async function connect() {
    disconnect(); stop.current = false; setErr("");
    const ch = encodeURIComponent(channels.trim() || "*");
    setLive(true);
    if (transport === "sse") {
      const src = new EventSource(`/api/v1/events/stream?channels=${ch}&after=now`, { withCredentials: true });
      src.onmessage = (m) => { try { push(JSON.parse(m.data)); } catch {} };
      src.onerror = () => { if (src.readyState === EventSource.CLOSED) { setLive(false); setErr(t.errors.generic.replace("{msg}", "SSE closed")); } };
      es.current = src;
      return;
    }
    let cursor = "now";
    while (!stop.current) {
      try {
        const r = await fetch(`/api/v1/events/poll?channels=${ch}&after=${cursor}&wait=25`, { credentials: "include" });
        const j = await r.json();
        if (!r.ok) { setErr(j?.error?.message || `HTTP ${r.status}`); break; }
        for (const e of j.events) push(e);
        cursor = String(j.cursor);
      } catch (e: any) { if (!stop.current) { setErr(String(e?.message || e)); await new Promise((res) => setTimeout(res, 2000)); } }
    }
    setLive(false);
  }

  async function publish() {
    setErr("");
    let data: unknown;
    try { data = pub.data.trim() ? JSON.parse(pub.data) : null; } catch { setErr(t.console.badJson); return; }
    const r = await fetch("/api/v1/events", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: pub.channel.trim(), type: pub.type.trim() || "message", data }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j?.error?.message || `HTTP ${r.status}`); }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] [&>*]:min-w-0" data-testid="dev-console">
      <div className="card-pad">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1"><span className="label">{t.console.channels}</span><input className="input font-mono text-sm" value={channels} onChange={(e) => setChannels(e.target.value)} disabled={live} data-testid="console-channels" /></label>
          <label className="block"><span className="label">{t.console.transport}</span>
            <select className="select" value={transport} onChange={(e) => setTransport(e.target.value as "sse" | "poll")} disabled={live} data-testid="console-transport">
              <option value="sse">Server-Sent Events</option><option value="poll">Long polling</option>
            </select></label>
          {live ? <button type="button" className="btn-secondary" onClick={disconnect}>{t.console.disconnect}</button>
            : <button type="button" className="btn-primary" onClick={connect} data-testid="console-connect">{t.console.connect}</button>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className={`${badge} ${live ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`} data-testid="console-status">{live ? `● ${t.console.live.replace("{n}", String(events.length))}` : t.console.idle}</span>
          {events.length ? <button type="button" className="btn-ghost btn-sm" onClick={() => setEvents([])}>{t.console.clear}</button> : null}
        </div>
        {err ? <div className="mt-3"><Alert tone="error">{err}</Alert></div> : null}
        <ol className="mt-3 max-h-[480px] space-y-2 overflow-y-auto" data-testid="console-events">
          {events.map((e) => (
            <li key={e.id} className="rounded-lg border border-slate-200 p-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-slate-500">#{e.id}</span>
                <span className={`${badge} bg-sky-100 text-sky-800`}>{e.channel}</span>
                <span className={`${badge} bg-violet-100 text-violet-800`}>{e.type}</span>
                <span className="ml-auto text-slate-400">{e.createdAt.slice(11, 19)}</span>
              </div>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-slate-700">{JSON.stringify(e.data, null, 1)}</pre>
            </li>
          ))}
          {!events.length ? <li className="text-sm text-slate-500">{t.console.empty}</li> : null}
        </ol>
      </div>
      <div className="card-pad">
        <h3 className="mb-3 text-sm font-semibold">{t.console.publish}</h3>
        <label className="mb-2 block"><span className="label">{t.console.channel}</span><input className="input font-mono text-sm" value={pub.channel} onChange={(e) => setPub({ ...pub, channel: e.target.value })} data-testid="console-pub-channel" /></label>
        <label className="mb-2 block"><span className="label">{t.console.type}</span><input className="input font-mono text-sm" value={pub.type} onChange={(e) => setPub({ ...pub, type: e.target.value })} /></label>
        <label className="mb-3 block"><span className="label">{t.console.data}</span><textarea className="textarea font-mono text-xs" rows={6} value={pub.data} onChange={(e) => setPub({ ...pub, data: e.target.value })} data-testid="console-pub-data" /></label>
        <button type="button" className="btn-primary w-full" onClick={publish} data-testid="console-publish">📤 {t.console.send}</button>
      </div>
    </section>
  );
}
