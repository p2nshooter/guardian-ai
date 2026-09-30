/* AXTO — Developers → Webhooks: signed HTTPS callbacks, delivery log, test, secret rotation. */
"use client";
import { useState } from "react";
import type { DevelopersDict } from "@/lib/i18n-pages/developers";
import { api } from "@/lib/client";
import { Alert, Modal, Spinner } from "@/components/ui";
import { Code, Copy, badge, fmt, type HookRow } from "./shared";

interface Delivery { id: string; eventId: number; attempt: number; status: number | null; durationMs: number | null; error: string | null; done: boolean; nextAt: string | null; createdAt: string }

const VERIFY = `// Node.js — verify X-AXTO-Signature (t=<unix>,v1=<hex>)
import crypto from "node:crypto";
function verify(rawBody, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;          // replay window
  const mac = crypto.createHmac("sha256", secret).update(\`\${t}.\${rawBody}\`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(v1));
}`;

export default function Webhooks({ t, locale, hooks, max, reload }: { t: DevelopersDict; locale: string; hooks: HookRow[]; max: number; reload: () => Promise<void> }) {
  const [form, setForm] = useState<{ url: string; channels: string; types: string } | null>(null);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Record<string, Delivery[] | undefined>>({});
  const [showVerify, setShowVerify] = useState(false);

  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  async function create() {
    if (!form) return;
    setBusy(true); setErr("");
    const r = await api<{ secret: string }>("/api/connect/webhooks", { body: { url: form.url.trim(), channels: list(form.channels || "*"), types: list(form.types || "*") } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setSecret(r.data.secret); setForm(null); await reload();
  }
  async function act(h: HookRow, what: "test" | "rotate" | "toggle" | "delete" | "deliveries") {
    setErr("");
    if (what === "delete") { if (!confirm(t.hooks.confirmDel)) return; const r = await api(`/api/connect/webhooks/${h.id}`, { method: "DELETE" }); if (!r.ok) setErr(r.error); await reload(); return; }
    if (what === "toggle") { const r = await api(`/api/connect/webhooks/${h.id}`, { method: "PATCH", body: { active: !h.active } }); if (!r.ok) setErr(r.error); await reload(); return; }
    if (what === "rotate") { const r = await api<{ secret: string }>(`/api/connect/webhooks/${h.id}/rotate`, { body: {} }); if (r.ok) setSecret(r.data.secret); else setErr(r.error); return; }
    if (what === "deliveries") {
      if (open[h.id]) { setOpen({ ...open, [h.id]: undefined }); return; }
      const r = await api<{ deliveries: Delivery[] }>(`/api/connect/webhooks/${h.id}/deliveries`);
      if (r.ok) setOpen({ ...open, [h.id]: r.data.deliveries }); else setErr(r.error);
      return;
    }
    setNote({ ...note, [h.id]: "…" });
    const r = await api<{ result: { status: number; error: string | null; ms: number } }>(`/api/connect/webhooks/${h.id}/test`, { body: {} });
    setNote({ ...note, [h.id]: r.ok ? (r.data.result.status ? t.hooks.testResult.replace("{status}", String(r.data.result.status)).replace("{ms}", String(r.data.result.ms)) : `⚠️ ${r.data.result.error}`) : r.error });
    await reload();
  }

  return (
    <section className="card-pad" data-testid="dev-hooks">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">{hooks.length} / {max}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={() => setShowVerify((v) => !v)}>🔏 {t.hooks.verify}</button>
          <button type="button" className="btn-primary btn-sm" disabled={hooks.length >= max} onClick={() => { setErr(""); setForm({ url: "", channels: "*", types: "*" }); }} data-testid="hook-new">＋ {t.hooks.new}</button>
        </div>
      </div>
      {showVerify ? <div className="mb-4"><Code t={t} code={VERIFY} label="Node.js" /></div> : null}
      {err ? <div className="mb-3"><Alert tone="error">{err}</Alert></div> : null}
      {secret ? (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3" data-testid="hook-secret">
          <p className="mb-2 text-sm font-semibold text-amber-900">🔏 {t.hooks.secretOnce}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1.5 font-mono text-xs">{secret}</code>
            <Copy t={t} text={secret} />
            <button type="button" className="btn-ghost btn-sm" onClick={() => setSecret("")}>{t.keys.done}</button>
          </div>
        </div>
      ) : null}
      {hooks.length ? (
        <ul className="space-y-2" data-testid="hook-list">
          {hooks.map((h) => (
            <li key={h.id} className="rounded-xl border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 break-all font-mono text-xs font-semibold">{h.url}</code>
                <span className={`${badge} ${h.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{h.active ? t.hooks.active : t.hooks.paused}</span>
                {h.failures ? <span className={`${badge} bg-rose-100 text-rose-800`}>{t.hooks.failures.replace("{n}", String(h.failures))}</span> : null}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{h.channels.join(", ")} · {h.types.join(", ")}{h.lastStatus !== null ? ` · ${t.hooks.lastStatus.replace("{status}", h.lastStatus ? `HTTP ${h.lastStatus}` : h.lastError || "—")} ${fmt(h.lastDeliveryAt, locale)}` : ""}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" className="btn-secondary btn-sm" onClick={() => act(h, "test")} data-testid="hook-test">⚡ {t.hooks.test}</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => act(h, "deliveries")}>📜 {t.hooks.deliveries}</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => act(h, "toggle")}>{h.active ? t.hooks.disable : t.hooks.enable}</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => act(h, "rotate")}>🔁 {t.hooks.rotate}</button>
                <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => act(h, "delete")}>{t.hooks.del}</button>
              </div>
              {note[h.id] ? <p className="mt-2 text-xs text-slate-600" data-testid="hook-note">{note[h.id]}</p> : null}
              {open[h.id] ? (
                open[h.id]!.length ? (
                  <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100 text-[11px]">
                    {open[h.id]!.map((d) => (
                      <li key={d.id} className="flex flex-wrap gap-2 px-2 py-1.5">
                        <span className={d.status && d.status < 300 ? "text-emerald-700" : "text-rose-700"}>{d.status ? `HTTP ${d.status}` : d.error || "—"}</span>
                        <span className="text-slate-500">#{d.eventId} · {t.hooks.attempt.replace("{n}", String(d.attempt))} · {d.durationMs ?? "—"} ms · {fmt(d.createdAt, locale)}</span>
                        {!d.done && d.nextAt ? <span className="text-amber-700">{t.hooks.retryAt.replace("{at}", fmt(d.nextAt, locale))}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-xs text-slate-500">{t.hooks.noDeliveries}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-500">{t.hooks.none}</p>}

      <Modal open={!!form} onClose={() => setForm(null)} title={t.hooks.new}
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t.keys.cancel}</button><button className="btn-primary" onClick={create} disabled={busy || !form?.url.trim()} data-testid="hook-save">{busy ? <Spinner /> : null} {t.hooks.create}</button></>}>
        {form ? (
          <div className="space-y-3">
            <label className="block"><span className="label">{t.hooks.url}</span><input className="input font-mono text-sm" value={form.url} placeholder="https://api.example.com/axto/webhook" onChange={(e) => setForm({ ...form, url: e.target.value })} data-testid="hook-url" /></label>
            <label className="block"><span className="label">{t.hooks.channels}</span><input className="input font-mono text-sm" value={form.channels} onChange={(e) => setForm({ ...form, channels: e.target.value })} /></label>
            <label className="block"><span className="label">{t.hooks.types}</span><input className="input font-mono text-sm" value={form.types} onChange={(e) => setForm({ ...form, types: e.target.value })} /></label>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
