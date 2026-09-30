/* Admin → Connect (developer API & realtime): switch it on/off, retention,
 * Cloudflare Realtime TURN for WebRTC, 24-hour stats, every key (revoke) and
 * failing webhooks (pause). Member keys and signing secrets are never shown. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PageHeader, Alert, LoadingBlock, Spinner, Section, Stat } from "@/components/ui";

interface View {
  settings: { enabled: boolean; retentionDays: number };
  turn: { keyId: string; apiToken: string; configured: boolean };
  stats: { activeKeys: number; events24h: number; bytes24h: number; activeWebhooks: number; deliveries24h: { ok: number; failed: number; pending: number } };
  keys: { id: string; name: string; prefix: string; scopes: string[]; origins: string[]; email: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }[];
  failing: { id: string; url: string; email: string; failures: number; lastStatus: number | null; lastError: string | null; lastDeliveryAt: string | null; active: boolean }[];
}
const when = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");

export default function AdminConnectPage() {
  const [v, setV] = useState<View | null>(null);
  const [retention, setRetention] = useState(7);
  const [turn, setTurn] = useState({ keyId: "", apiToken: "" });
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function load() {
    const r = await api<View>("/api/admin/connect");
    if (!r.ok) { setMsg({ tone: "error", text: r.error }); return; }
    setV(r.data); setRetention(r.data.settings.retentionDays); setTurn({ keyId: r.data.turn.keyId, apiToken: r.data.turn.apiToken });
  }
  useEffect(() => { load(); }, []);

  async function put(body: unknown, ok: string) {
    setBusy(true); setMsg(null);
    const r = await api("/api/admin/connect", { method: "PUT", body });
    setBusy(false);
    if (r.ok) { setMsg({ tone: "success", text: ok }); load(); } else setMsg({ tone: "error", text: r.error });
  }
  async function post(body: unknown, ok: string) {
    setMsg(null);
    const r = await api("/api/admin/connect", { body });
    if (r.ok) { setMsg({ tone: "success", text: ok }); load(); } else setMsg({ tone: "error", text: r.error });
  }

  if (!v) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const keys = v.keys.filter((k) => !q || `${k.email} ${k.name} ${k.prefix}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div data-testid="admin-connect">
      <PageHeader eyebrow="Platform" title="Connect (developer API)"
        description="REST, SSE, WebSocket, long polling, NDJSON streaming, Connect (gRPC-compatible), WebRTC signalling, signed webhooks and MCP — every call runs on the member's own plan limits and AI keys." />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5 [&>*]:min-w-0">
        <Stat label="Active keys" value={v.stats.activeKeys} />
        <Stat label="Events (24 h)" value={v.stats.events24h.toLocaleString()} hint={`${Math.round(v.stats.bytes24h / 1024)} KB`} />
        <Stat label="Active webhooks" value={v.stats.activeWebhooks} />
        <Stat label="Deliveries OK (24 h)" value={v.stats.deliveries24h.ok} />
        <Stat label="Failed / pending" value={`${v.stats.deliveries24h.failed} / ${v.stats.deliveries24h.pending}`} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Section title="Status & retention">
          <p className="text-sm text-slate-600">The developer API is <b data-testid="connect-state">{v.settings.enabled ? "ON" : "OFF"}</b>. Switching it off answers every /api/v1 call with 503 at once; keys stay valid for later.</p>
          <button className={v.settings.enabled ? "btn-secondary mt-3" : "btn-primary mt-3"} disabled={busy} data-testid="connect-toggle"
            onClick={() => put({ settings: { enabled: !v.settings.enabled } }, v.settings.enabled ? "Developer API switched off." : "Developer API switched on.")}>
            {v.settings.enabled ? "Switch off" : "Switch on"}
          </button>
          <label className="mt-4 block"><span className="label">Keep events for (days, 1–90)</span>
            <input type="number" min={1} max={90} className="input w-32" value={retention} onChange={(e) => setRetention(Number(e.target.value) || 7)} /></label>
          <button className="btn-secondary btn-sm mt-2" disabled={busy} onClick={() => put({ settings: { retentionDays: retention } }, "Retention saved.")}>Save retention</button>
        </Section>
        <Section title="WebRTC TURN (Cloudflare Realtime)">
          <p className="text-sm text-slate-600">STUN (stun.cloudflare.com) is always offered. Add a TURN key so calls also connect behind strict NATs; credentials are minted per room and expire. Status: <b>{v.turn.configured ? "configured" : "not configured"}</b>.</p>
          <label className="mt-3 block"><span className="label">TURN key id</span><input className="input font-mono text-sm" value={turn.keyId} onChange={(e) => setTurn({ ...turn, keyId: e.target.value })} /></label>
          <label className="mt-2 block"><span className="label">TURN API token (stored encrypted)</span><input className="input font-mono text-sm" value={turn.apiToken} onChange={(e) => setTurn({ ...turn, apiToken: e.target.value })} autoComplete="off" /></label>
          <button className="btn-primary btn-sm mt-3" disabled={busy} onClick={() => put({ turn }, "TURN settings saved.")}>{busy ? <Spinner /> : null} Save TURN</button>
        </Section>
      </div>
      <Section title="API keys">
        <input className="input mb-3 max-w-sm" placeholder="Search e-mail, name or prefix…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">Member</th><th className="pr-3">Key</th><th className="pr-3">Scopes</th><th className="pr-3">Last used</th><th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {keys.map((k) => (
                <tr key={k.id} className={k.revokedAt ? "opacity-50" : ""}>
                  <td className="py-2 pr-3">{k.email}<div className="text-xs text-slate-500">{k.name}</div></td>
                  <td className="pr-3 font-mono text-xs">{k.prefix}…</td>
                  <td className="pr-3 text-xs">{k.scopes.join(" ")}</td>
                  <td className="pr-3 text-xs">{when(k.lastUsedAt)}</td>
                  <td className="text-right">{k.revokedAt ? <span className="text-xs text-slate-500">revoked</span> : <button className="btn-ghost btn-sm text-rose-600" onClick={() => confirm(`Revoke ${k.prefix}… of ${k.email}?`) && post({ action: "revoke", id: k.id }, "Key revoked.")}>Revoke</button>}</td>
                </tr>
              ))}
              {!keys.length ? <tr><td colSpan={5} className="py-3 text-sm text-slate-500">No keys.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Failing webhooks">
        {v.failing.length ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {v.failing.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1 break-all font-mono text-xs">{w.url}</span>
                <span className="text-xs text-slate-500">{w.email} · {w.failures} failures · {w.lastStatus ? `HTTP ${w.lastStatus}` : w.lastError || "—"} · {when(w.lastDeliveryAt)}</span>
                {w.active ? <button className="btn-ghost btn-sm" onClick={() => post({ action: "disable-webhook", id: w.id }, "Webhook paused.")}>Pause</button> : <span className="text-xs text-slate-500">paused</span>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500">No failing webhooks.</p>}
      </Section>
    </div>
  );
}
