/* COMPLIANCE CENTER v4 — Controls: the library of the frameworks in scope,
 * with status, owner, due date, notes, N/A justification and evidence files
 * (encrypted in the member's history), plus the equivalent controls in the
 * other frameworks and "copy to mapped". */
"use client";
import { useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import { LIBRARY, controlKey, findControl, mappedControls } from "@/lib/compliance/controls";
import { CONTROL_STATUSES, applyToMapped, type ControlState, type ControlStatus, type EvidenceRef, type Workspace } from "@/lib/compliance/workspace";
import type { FrameworkId } from "@/lib/compliance/frameworks";
import type { ComplianceDict } from "@/lib/i18n-pages/compliance";
import { STATUS_TONE, download, type WsUpdate } from "./shared";

export const EVIDENCE_MAX_MB = 3;
const b64 = async (f: File) => { const b = new Uint8Array(await f.arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };

/** Fetch an evidence file from history and save it. */
export async function downloadEvidence(e: EvidenceRef): Promise<boolean> {
  const r = await api<{ item: { body: { data?: string; type?: string; name?: string } } }>(`/api/history/compliance/${e.id}`);
  const data = r.ok ? r.data.item?.body?.data : undefined;
  if (!data) return false;
  const bin = atob(data); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  download(e.name, new Blob([out], { type: e.type || "application/octet-stream" }));
  return true;
}

export default function Controls({ t, w, onWs, fw, setFw, open, setOpen, onAsk }: {
  t: ComplianceDict; w: Workspace; onWs: (u: WsUpdate) => void; fw: FrameworkId; setFw: (f: FrameworkId) => void;
  open: string; setOpen: (id: string) => void; onAsk: (fw: FrameworkId, id: string) => void;
}) {
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState<ControlStatus | "">("");
  const [q, setQ] = useState("");
  const lib = LIBRARY[fw];
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return lib.controls.filter((c) => (!domain || c.domain === domain) && (!status || (w.controls[controlKey(fw, c.id)]?.status || "not_started") === status)
      && (!n || `${c.id} ${c.title} ${w.controls[controlKey(fw, c.id)]?.owner || ""}`.toLowerCase().includes(n)));
  }, [lib, domain, status, q, w.controls, fw]);
  const setState = (id: string, patch: Partial<ControlState>) => onWs((p) => { const k = controlKey(fw, id); return { ...p, controls: { ...p.controls, [k]: { ...(p.controls[k] || { status: "not_started" as const }), ...patch, updatedAt: new Date().toISOString() } } }; });

  if (!w.frameworks.length) return <div className="card-pad text-sm text-slate-600">{t.getStarted}</div>;
  return (
    <div className="card-pad">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="tablist">
          {w.frameworks.map((f) => <button key={f} type="button" role="tab" aria-selected={fw === f} onClick={() => { setFw(f); setDomain(""); }} data-testid={`comp-ctl-fw-${f}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${fw === f ? "bg-ink-950 text-white" : "bg-slate-100 text-slate-700"}`}>{LIBRARY[f].version.split(" (")[0]}</button>)}
        </div>
        <select className="select w-auto py-1 text-sm" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label={t.allDomains}>
          <option value="">{t.allDomains}</option>{lib.domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="select w-auto py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value as ControlStatus | "")} aria-label={t.allStatuses}>
          <option value="">{t.allStatuses}</option>{CONTROL_STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
        </select>
        <input className="input max-w-xs flex-1 py-1 text-sm" placeholder={t.filterPh} value={q} onChange={(e) => setQ(e.target.value)} data-testid="comp-ctl-search" />
        <span className="ml-auto text-xs text-slate-500" data-testid="comp-ctl-count">{t.showing.replace("{n}", String(rows.length)).replace("{total}", String(lib.controls.length))}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{lib.note}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="px-2 py-1.5">ID</th><th className="px-2 py-1.5">{t.framework}</th><th className="px-2 py-1.5">{t.status}</th><th className="px-2 py-1.5">{t.owner}</th><th className="px-2 py-1.5">{t.due}</th><th className="px-2 py-1.5">{t.evidence}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => {
              const s = w.controls[controlKey(fw, c.id)];
              const st = s?.status || "not_started";
              const late = s?.due && s.due < new Date().toISOString().slice(0, 10) && st !== "implemented" && st !== "not_applicable";
              return (
                <tr key={c.id} className="hover:bg-slate-50" data-testid="comp-ctl-row">
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono text-xs text-slate-600">{c.id}</td>
                  <td className="px-2 py-1.5"><button type="button" className="text-left text-slate-800 hover:text-brand-700 hover:underline" onClick={() => setOpen(c.id)}>{c.title}</button>
                    <div className="text-[11px] text-slate-400">{lib.domains.find((d) => d.id === c.domain)?.name}</div></td>
                  <td className="px-2 py-1.5">
                    <select className={`select w-auto py-0.5 text-xs ${STATUS_TONE[st]}`} value={st} onChange={(e) => setState(c.id, { status: e.target.value as ControlStatus })} aria-label={`${t.status} ${c.id}`} data-testid="comp-ctl-status">
                      {CONTROL_STATUSES.map((x) => <option key={x} value={x}>{t.statuses[x]}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-slate-600">{s?.owner || "—"}</td>
                  <td className={`px-2 py-1.5 text-xs ${late ? "font-semibold text-rose-700" : "text-slate-600"}`}>{s?.due || "—"}</td>
                  <td className="px-2 py-1.5 text-xs text-slate-600">{s?.evidence?.length ? `📎 ${s.evidence.length}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {open && findControl(fw, open) ? <ControlDetail t={t} w={w} fw={fw} id={open} onWs={onWs} onClose={() => setOpen("")} onAsk={() => onAsk(fw, open)} /> : null}
    </div>
  );
}

function ControlDetail({ t, w, fw, id, onWs, onClose, onAsk }: { t: ComplianceDict; w: Workspace; fw: FrameworkId; id: string; onWs: (u: WsUpdate) => void; onClose: () => void; onAsk: () => void }) {
  const c = findControl(fw, id)!;
  const k = controlKey(fw, id);
  const s: ControlState = w.controls[k] || { status: "not_started" };
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const mapped = mappedControls(fw, id).filter((m) => w.frameworks.includes(m.fw));
  const set = (patch: Partial<ControlState>) => onWs((p) => ({ ...p, controls: { ...p.controls, [k]: { ...(p.controls[k] || { status: "not_started" as const }), ...patch, updatedAt: new Date().toISOString() } } }));

  async function upload(files: FileList) {
    setMsg("");
    for (const f of Array.from(files).slice(0, 10)) {
      if (f.size > EVIDENCE_MAX_MB * 1024 * 1024) { setMsg(t.tooLarge.replace("{name}", f.name).replace("{mb}", String(EVIDENCE_MAX_MB))); continue; }
      setBusy(f.name);
      const r = await api<{ item: { id: string } }>("/api/history/compliance", { body: { title: `Evidence · ${f.name}`.slice(0, 200), body: { kind: "evidence", name: f.name, type: f.type, size: f.size, data: await b64(f), control: k }, meta: { kind: "evidence", control: `${c.id}` } } });
      if (!r.ok) { setMsg(r.error); continue; }
      const ref: EvidenceRef = { id: r.data.item.id, name: f.name, size: f.size, type: f.type || "application/octet-stream", addedAt: new Date().toISOString() };
      onWs((p) => ({ ...p, controls: { ...p.controls, [k]: { ...(p.controls[k] || { status: "not_started" as const }), evidence: [...(p.controls[k]?.evidence || []), ref], updatedAt: new Date().toISOString() } } }));
    }
    setBusy("");
  }
  async function removeEvidence(e: EvidenceRef) {
    const stillUsed = Object.entries(w.controls).some(([key, st]) => key !== k && st.evidence?.some((x) => x.id === e.id));
    if (!stillUsed) await api(`/api/history/compliance/${e.id}`, { method: "DELETE" });
    set({ evidence: (s.evidence || []).filter((x) => x.id !== e.id) });
  }
  const eligible = mapped.filter((m) => (w.controls[controlKey(m.fw, m.control.id)]?.status || "not_started") === "not_started").length;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink-950/30" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-lift" onClick={(e) => e.stopPropagation()} data-testid="comp-ctl-detail" role="dialog" aria-label={`${c.id} ${c.title}`}>
        <div className="flex items-start gap-2">
          <div className="min-w-0"><div className="font-mono text-xs text-slate-500">{LIBRARY[fw].version} · {c.id}</div><h3 className="text-lg font-bold text-slate-900">{c.title}</h3>
            <div className="text-xs text-slate-500">{LIBRARY[fw].domains.find((d) => d.id === c.domain)?.name}</div></div>
          <button type="button" className="btn-ghost btn-sm ml-auto" onClick={onClose} aria-label={t.close}>✕</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm"><span className="font-semibold text-slate-700">{t.status}</span>
            <select className={`select mt-1 w-full text-sm ${STATUS_TONE[s.status]}`} value={s.status} onChange={(e) => set({ status: e.target.value as ControlStatus })} data-testid="comp-detail-status">
              {CONTROL_STATUSES.map((x) => <option key={x} value={x}>{t.statuses[x]}</option>)}
            </select></label>
          <label className="text-sm"><span className="font-semibold text-slate-700">{t.owner}</span><input className="input mt-1 w-full" placeholder={t.ownerPh} value={s.owner || ""} onChange={(e) => set({ owner: e.target.value.slice(0, 120) })} data-testid="comp-detail-owner" /></label>
          <label className="text-sm"><span className="font-semibold text-slate-700">{t.due}</span><input type="date" className="input mt-1 w-full" value={s.due || ""} onChange={(e) => set({ due: e.target.value })} data-testid="comp-detail-due" /></label>
        </div>
        {s.status === "not_applicable" ? (
          <label className="mt-3 block text-sm"><span className="font-semibold text-slate-700">{t.justification}</span>
            <textarea className="textarea mt-1 min-h-[70px] w-full text-sm" placeholder={t.justificationPh} value={s.justification || ""} onChange={(e) => set({ justification: e.target.value.slice(0, 2000) })} data-testid="comp-detail-justification" /></label>
        ) : null}
        <label className="mt-3 block text-sm"><span className="font-semibold text-slate-700">{t.notes}</span>
          <textarea className="textarea mt-1 min-h-[100px] w-full text-sm" placeholder={t.notesPh} value={s.notes || ""} onChange={(e) => set({ notes: e.target.value.slice(0, 8000) })} data-testid="comp-detail-notes" /></label>

        <div className="mt-4">
          <div className="flex items-center gap-2"><h4 className="font-semibold text-slate-900">{t.evidence}</h4>
            <button type="button" className="btn-secondary btn-sm ml-auto" onClick={() => input.current?.click()} disabled={!!busy} data-testid="comp-evidence-upload">{busy ? <Spinner /> : "📎"} {t.upload}</button></div>
          <input ref={input} type="file" multiple className="hidden" data-testid="comp-evidence-input" onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }} />
          <p className="mt-1 text-xs text-slate-500">{busy ? t.uploading.replace("{name}", busy) : t.uploadHint.replace("{mb}", String(EVIDENCE_MAX_MB))}</p>
          {msg ? <p className="mt-1 text-xs text-rose-700">{msg}</p> : null}
          {okMsg ? <p className="mt-1 text-xs text-emerald-700" data-testid="comp-ok-msg">{okMsg}</p> : null}
          <ul className="mt-2 divide-y divide-slate-100" data-testid="comp-evidence-list">
            {(s.evidence || []).map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">📄 {e.name}</span><span className="text-xs text-slate-400">{Math.max(1, Math.round(e.size / 1024))} KB</span>
                <button type="button" className="btn-ghost btn-sm" onClick={() => downloadEvidence(e)}>⬇️ {t.download}</button>
                <button type="button" className="btn-ghost btn-sm text-rose-700" onClick={() => removeEvidence(e)} aria-label={`${t.remove} ${e.name}`}>✕</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <h4 className="font-semibold text-slate-900">{t.mapped}</h4>
          {mapped.length ? (
            <ul className="mt-1 space-y-1 text-sm" data-testid="comp-mapped">{mapped.slice(0, 20).map((m) => { const ms = w.controls[controlKey(m.fw, m.control.id)]?.status || "not_started"; return (
              <li key={`${m.fw}:${m.control.id}`} className="flex items-center gap-2"><span className="w-24 shrink-0 truncate text-xs text-slate-500">{LIBRARY[m.fw].version.split(" ")[0]}</span><span className="font-mono text-xs">{m.control.id}</span><span className="min-w-0 flex-1 truncate text-slate-700">{m.control.title}</span><span className={`rounded px-1.5 text-[10px] ${STATUS_TONE[ms]}`}>{t.statuses[ms]}</span></li>
            ); })}</ul>
          ) : <p className="mt-1 text-sm text-slate-500">{t.noMapped}</p>}
          {(s.status === "implemented" || s.status === "in_progress") && eligible ? (
            <button type="button" className="btn-secondary btn-sm mt-2" data-testid="comp-apply-mapped" onClick={() => { const n = applyToMapped(w, fw, id).changed.length; onWs((p) => applyToMapped(p, fw, id).workspace); setOkMsg(t.applied.replace("{n}", String(n))); }}>⇄ {t.applyMapped.replace("{n}", String(eligible))}</button>
          ) : null}
        </div>
        <button type="button" className="btn-primary mt-5 w-full" onClick={onAsk} data-testid="comp-ask-control">🤖 {t.askAi}</button>
      </aside>
    </div>
  );
}
