/* Admin → Managed AI. The optional product line where AXTO supplies the models
 * (separate from members' own BYOX keys, which are never visible here). */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PageHeader, Alert, LoadingBlock, Spinner, Section } from "@/components/ui";

interface KeyRow { id: string; provider: string; key_name: string; is_active: number; updated_at: string }
interface View { enabled: boolean; settings: { provider?: string; workersModel?: string; effort?: string; models?: Record<string, string> }; keys: KeyRow[] }
const PROVIDERS = ["workers", "anthropic", "openai", "google", "groq", "openrouter"];

export default function AdminManagedPage() {
  const [v, setV] = useState<View | null>(null);
  const [provider, setProvider] = useState("workers");
  const [workersModel, setWorkersModel] = useState("");
  const [effort, setEffort] = useState("");
  const [newKey, setNewKey] = useState({ provider: "anthropic", value: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const apply = (d: View) => { setV(d); setProvider(d.settings?.provider || "workers"); setWorkersModel(d.settings?.workersModel || ""); setEffort(d.settings?.effort || ""); };
  useEffect(() => { api<View>("/api/admin/managed").then((r) => (r.ok ? apply(r.data) : setMsg({ tone: "error", text: r.error || "Could not load." }))); }, []);

  async function call(method: "PUT" | "POST" | "DELETE", body?: unknown, q = "", ok = "Saved.") {
    setBusy(true); setMsg(null);
    const r = await api<View>(`/api/admin/managed${q}`, { method, body });
    setBusy(false);
    if (r.ok) { apply(r.data); setMsg({ tone: "success", text: ok }); } else setMsg({ tone: "error", text: r.error || "Request failed." });
  }

  if (!v) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  return (
    <>
      <PageHeader eyebrow="AI" title="Managed AI"
        description="Optional plan where AXTO provides the AI (no member keys). Keep it off until you are ready to sell it — BYOX is unaffected either way." />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Status">
          <p className="text-sm text-slate-600">Managed AI is currently <b>{v.enabled ? "ON" : "OFF (locked)"}</b>.</p>
          <button className={v.enabled ? "btn-secondary mt-3" : "btn-primary mt-3"} disabled={busy} onClick={() => call("PUT", { enabled: !v.enabled }, "", v.enabled ? "Managed AI locked." : "Managed AI enabled.")}>
            {busy ? <Spinner /> : null} {v.enabled ? "Lock Managed AI" : "Enable Managed AI"}
          </button>
        </Section>
        <Section title="Model routing">
          <div className="grid gap-3">
            <label><span className="label">Provider</span>
              <select className="select" value={provider} onChange={(e) => setProvider(e.target.value)}>{PROVIDERS.map((p) => <option key={p} value={p}>{p === "workers" ? "Cloudflare Workers AI" : p}</option>)}</select></label>
            {provider === "workers" ? <label><span className="label">Workers AI model</span><input className="input font-mono text-xs" value={workersModel} placeholder="@cf/meta/llama-3.3-70b-instruct-fp8-fast" onChange={(e) => setWorkersModel(e.target.value)} /></label> : null}
            <label><span className="label">Effort (Claude)</span>
              <select className="select" value={effort} onChange={(e) => setEffort(e.target.value)}><option value="">default</option>{["low", "medium", "high", "xhigh", "max"].map((x) => <option key={x}>{x}</option>)}</select></label>
            <button className="btn-primary w-fit" disabled={busy} onClick={() => call("PUT", { settings: { provider, workersModel, effort: effort || undefined, models: v.settings?.models || {} } })}>{busy ? <Spinner /> : "Save routing"}</button>
          </div>
        </Section>
      </div>
      <div className="mt-5">
        <Section title={`AXTO provider keys (${v.keys.length})`}>
          <p className="text-sm text-slate-600">Keys AXTO pays for, used only by Managed AI. Stored encrypted; only the last 4 characters are shown.</p>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {v.keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-2 py-2">
                <span><b>{k.provider}</b> <span className="font-mono text-xs text-slate-500">{k.key_name}</span> {k.is_active ? <span className="badge-green">active</span> : <span className="badge-gray">off</span>}</span>
                <button className="btn-ghost btn-sm text-rose-600" disabled={busy} onClick={() => { if (confirm(`Delete the ${k.provider} key ${k.key_name}?`)) call("DELETE", undefined, `?id=${encodeURIComponent(k.id)}`, "Key deleted."); }}>Delete</button>
              </li>
            ))}
            {!v.keys.length ? <li className="py-2 text-slate-500">No keys yet.</li> : null}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <select className="select w-auto" value={newKey.provider} onChange={(e) => setNewKey({ ...newKey, provider: e.target.value })}>{PROVIDERS.filter((p) => p !== "workers").map((p) => <option key={p}>{p}</option>)}</select>
            <input className="input flex-1 font-mono text-xs" type="password" placeholder="Paste API key" value={newKey.value} onChange={(e) => setNewKey({ ...newKey, value: e.target.value })} />
            <button className="btn-secondary" disabled={busy || newKey.value.length < 8} onClick={() => { call("POST", newKey, "", "Key added."); setNewKey({ ...newKey, value: "" }); }}>Add key</button>
          </div>
        </Section>
      </div>
    </>
  );
}
