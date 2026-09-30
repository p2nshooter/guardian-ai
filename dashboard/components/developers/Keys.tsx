/* AXTO — Developers → API keys: create (shown once), scopes, allowed origins, revoke. */
"use client";
import { useState } from "react";
import type { DevelopersDict } from "@/lib/i18n-pages/developers";
import { api } from "@/lib/client";
import { Alert, Modal, Spinner } from "@/components/ui";
import { Copy, SCOPES, badge, fmt, type KeyRow } from "./shared";

export default function Keys({ t, locale, keys, max, reload }: { t: DevelopersDict; locale: string; keys: KeyRow[]; max: number; reload: () => Promise<void> }) {
  const [form, setForm] = useState<{ id?: string; name: string; scopes: string[]; origins: string } | null>(null);
  const [created, setCreated] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const active = keys.filter((k) => !k.revokedAt);

  async function save() {
    if (!form) return;
    setBusy(true); setErr("");
    const body = { name: form.name, scopes: form.scopes, origins: form.origins.split(/\s+/).filter(Boolean) };
    const r = form.id ? await api(`/api/connect/keys/${form.id}`, { method: "PATCH", body }) : await api<{ apiKey: string }>("/api/connect/keys", { body });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    if (!form.id) setCreated((r.data as any).apiKey);
    setForm(null);
    await reload();
  }
  async function revoke(id: string) {
    if (!confirm(t.keys.confirmRevoke)) return;
    const r = await api(`/api/connect/keys/${id}`, { method: "DELETE" });
    if (!r.ok) setErr(r.error);
    await reload();
  }

  return (
    <section className="card-pad" data-testid="dev-keys">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">{active.length} / {max}</p>
        <button type="button" className="btn-primary btn-sm" disabled={active.length >= max} onClick={() => { setErr(""); setForm({ name: "", scopes: [...SCOPES], origins: "" }); }} data-testid="key-new">＋ {t.keys.new}</button>
      </div>
      {err ? <div className="mb-3"><Alert tone="error">{err}</Alert></div> : null}
      {created ? (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3" data-testid="key-created">
          <p className="mb-2 text-sm font-semibold text-amber-900">🔑 {t.keys.shownOnce}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1.5 font-mono text-xs" data-testid="key-value">{created}</code>
            <Copy t={t} text={created} />
            <button type="button" className="btn-ghost btn-sm" onClick={() => setCreated("")}>{t.keys.done}</button>
          </div>
        </div>
      ) : null}
      {keys.length ? (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200" data-testid="key-list">
          {keys.map((k) => (
            <li key={k.id} className={`flex flex-col gap-2 px-3 py-3 text-sm sm:flex-row sm:items-center ${k.revokedAt ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{k.name}</span>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">{k.prefix}…</code>
                  {k.revokedAt ? <span className={`${badge} bg-rose-100 text-rose-800`}>{t.keys.revoked}</span> : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">{k.scopes.map((s) => <span key={s} className={`${badge} bg-sky-50 text-sky-800`}>{(t.keys.scopeNames as Record<string, string>)[s] || s}</span>)}</div>
                <div className="mt-1 text-[11px] text-slate-500">{t.keys.created} {fmt(k.createdAt, locale)} · {t.keys.lastUsed} {k.lastUsedAt ? fmt(k.lastUsedAt, locale) : t.keys.never}{k.origins.length ? ` · ${k.origins.join(", ")}` : ""}</div>
              </div>
              {!k.revokedAt ? (
                <div className="flex shrink-0 gap-2">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setForm({ id: k.id, name: k.name, scopes: k.scopes, origins: k.origins.join("\n") })}>{t.keys.edit}</button>
                  <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => revoke(k.id)} data-testid="key-revoke">{t.keys.revoke}</button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-500">{t.keys.none}</p>}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? t.keys.edit : t.keys.new}
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t.keys.cancel}</button><button className="btn-primary" onClick={save} disabled={busy} data-testid="key-save">{busy ? <Spinner /> : null} {form?.id ? t.keys.save : t.keys.create}</button></>}>
        {form ? (
          <div className="space-y-3">
            <label className="block"><span className="label">{t.keys.name}</span><input className="input" value={form.name} maxLength={80} placeholder={t.keys.namePh} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="key-name" /></label>
            <fieldset>
              <legend className="label">{t.keys.scopes}</legend>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {SCOPES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.scopes.includes(s)} onChange={(e) => setForm({ ...form, scopes: e.target.checked ? [...form.scopes, s] : form.scopes.filter((x) => x !== s) })} />
                    {t.keys.scopeNames[s]} <code className="text-[11px] text-slate-400">{s}</code>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block"><span className="label">{t.keys.origins}</span><textarea className="textarea font-mono text-xs" rows={3} value={form.origins} placeholder="https://shop.example.com" onChange={(e) => setForm({ ...form, origins: e.target.value })} data-testid="key-origins" /></label>
            <p className="text-xs text-slate-500">{t.keys.originsHint}</p>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
