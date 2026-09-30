/* AXTO — Legal AI v4: review a contract against a playbook (built-in or the member's own), on the device. */
"use client";
import { useMemo, useState } from "react";
import type { LegalToolsDict } from "@/lib/i18n-pages/legaltools";
import { CLAUSE_TYPES, PLAYBOOKS, review, playbookMarkdown, findingsMarkdown, type Check, type Finding, type Playbook as PB, type Position } from "@/lib/legal/playbook";
import { sanitizePlaybook, type LegalLibrary } from "@/lib/legal/library";
import { markdownToDocx } from "@/lib/export/docx";
import { Alert, Modal, Spinner } from "@/components/ui";
import { AiButton, DocPicker, EMPTY_SEL, ToolIntro, badge, download, fileSafe, type DocSel, type Handoff, type ToolDoc } from "./shared";

const STATUS_TONE: Record<Finding["status"], string> = {
  missing: "bg-rose-100 text-rose-800", deviation: "bg-orange-100 text-orange-900", review: "bg-amber-100 text-amber-900", ok: "bg-emerald-100 text-emerald-800",
};
const SEV_TONE: Record<Finding["severity"], string> = { high: "text-rose-700", medium: "text-amber-700", low: "text-slate-500" };
const CHECK_KINDS: Check["kind"][] = ["maxYears", "maxMonths", "minDays", "maxDays", "minCapMonths", "lawIn", "mustMention"];
const isList = (k: Check["kind"]) => k === "lawIn" || k === "mustMention";
const csvCell = (s: unknown) => { const v = String(s ?? ""); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };

export default function Playbook({ t, docs, lastAnswer, library, saveLibrary, onHandoff }: {
  t: LegalToolsDict; docs: ToolDoc[]; lastAnswer?: string; library: LegalLibrary;
  saveLibrary: (next: LegalLibrary) => Promise<string | null>; onHandoff: (h: Handoff) => void;
}) {
  const all = useMemo(() => [...PLAYBOOKS, ...library.playbooks], [library]);
  const [pbId, setPbId] = useState(PLAYBOOKS[0].id);
  const pb = all.find((p) => p.id === pbId) || PLAYBOOKS[0];
  const mine = library.playbooks.some((p) => p.id === pb.id);
  const [doc, setDoc] = useState<DocSel>(EMPTY_SEL);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [err, setErr] = useState("");
  const [showPositions, setShowPositions] = useState(false);
  const [editing, setEditing] = useState<PB | null>(null);
  const [busy, setBusy] = useState(false);
  const [editErr, setEditErr] = useState("");
  const clauseName = (id: string) => CLAUSE_TYPES.find((c) => c.id === id)?.name || id;

  function run() {
    if (!doc.text.trim()) { setErr(t.playbook.needDoc); setFindings(null); return; }
    setErr("");
    setFindings(review(doc.text, pb).findings);
  }
  const count = (s: Finding["status"]) => (findings || []).filter((f) => f.status === s).length;
  const title = `${pb.name}${doc.name ? ` — ${doc.name}` : ""}`;

  function toAi() {
    if (!findings) return;
    const open = findings.filter((f) => f.status !== "ok").map((f) => `- ${f.name}: ${f.status} — ${f.detail}`).join("\n");
    onHandoff({
      ws: "contract-review", onlyDocs: true,
      fields: { playbook: playbookMarkdown(pb).slice(0, 3900), side: pb.side },
      request: `${t.playbook.aiRequest}\n${open || "- (none)"}`,
      docs: [{ key: doc.key || undefined, name: doc.name || "Contract", text: doc.text }],
    });
  }

  async function saveEdit() {
    if (!editing) return;
    const clean = sanitizePlaybook(editing);
    if (!clean) { setEditErr(t.playbook.needPosition); return; }
    setBusy(true);
    const list = library.playbooks.some((p) => p.id === clean.id) ? library.playbooks.map((p) => (p.id === clean.id ? clean : p)) : [...library.playbooks, clean];
    const e = await saveLibrary({ ...library, playbooks: list });
    setBusy(false);
    if (e) { setEditErr(t.saveErr.replace("{msg}", e)); return; }
    setEditing(null); setPbId(clean.id); setFindings(null);
  }
  async function remove() {
    if (!mine || !confirm(t.confirmDel)) return;
    const e = await saveLibrary({ ...library, playbooks: library.playbooks.filter((p) => p.id !== pb.id) });
    if (e) setErr(t.saveErr.replace("{msg}", e)); else { setPbId(PLAYBOOKS[0].id); setFindings(null); }
  }
  const copyOf = (p: PB): PB => ({ ...JSON.parse(JSON.stringify(p)), id: `pb-${Date.now().toString(36)}`, name: `${p.name} (${t.duplicate.toLowerCase()})` });
  const setPos = (i: number, patch: Partial<Position>) => setEditing((e) => (e ? { ...e, positions: e.positions.map((p, j) => (j === i ? { ...p, ...patch } : p)) } : e));

  return (
    <section className="card-pad" data-testid="tool-playbook">
      <ToolIntro t={t} hint={t.hints.playbook} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] [&>*]:min-w-0">
        <div>
          <label className="label" htmlFor="pb-pick">{t.playbook.choose}</label>
          <select id="pb-pick" className="select" value={pb.id} onChange={(e) => { setPbId(e.target.value); setFindings(null); }} data-testid="pb-pick">
            <optgroup label={t.playbook.builtIn}>{PLAYBOOKS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
            {library.playbooks.length ? <optgroup label={t.playbook.mine}>{library.playbooks.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup> : null}
          </select>
          <p className="mt-1 text-xs text-slate-500">{pb.side} · {pb.positions.length} {t.playbook.positions.toLowerCase()}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setShowPositions((s) => !s)}>{showPositions ? "▾" : "▸"} {t.playbook.viewPlaybook}</button>
            {mine ? <button type="button" className="btn-ghost btn-sm" onClick={() => { setEditErr(""); setEditing(JSON.parse(JSON.stringify(pb))); }}>✏️ {t.edit}</button> : null}
            <button type="button" className="btn-ghost btn-sm" onClick={() => { setEditErr(""); setEditing(copyOf(pb)); }} data-testid="pb-duplicate">⧉ {t.duplicate}</button>
            {mine ? <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={remove}>{t.del}</button> : null}
            <button type="button" className="btn-secondary btn-sm" onClick={() => { setEditErr(""); setEditing({ id: `pb-${Date.now().toString(36)}`, name: "", side: "", positions: [{ clause: "liability", required: true, standard: "", fallback: "", redFlags: [], checks: [] }] }); }} data-testid="pb-new">＋ {t.playbook.newPlaybook}</button>
          </div>
          {showPositions ? (
            <ul className="mt-3 space-y-2 text-xs">
              {pb.positions.map((p, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-2">
                  <div className="font-semibold">{clauseName(p.clause)}{p.required ? ` · ${t.playbook.required}` : ""}</div>
                  <div className="mt-0.5 text-slate-600">{p.standard}</div>
                  {p.fallback && p.fallback !== "—" ? <div className="mt-0.5 text-slate-500">↳ {p.fallback}</div> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div>
          <DocPicker t={t} id="pb-doc" label={t.source} docs={docs} lastAnswer={lastAnswer} value={doc} onChange={setDoc} rows={9} />
          {!docs.length ? <p className="mt-1 text-xs text-slate-500">{t.noDocs}</p> : null}
          <div className="mt-3"><button type="button" className="btn-primary" onClick={run} data-testid="pb-run">📋 {t.playbook.run}</button></div>
        </div>
      </div>
      {err ? <div className="mt-3"><Alert tone="error">{err}</Alert></div> : null}

      {findings ? (
        <div className="mt-6 border-t border-slate-100 pt-5" data-testid="pb-result">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold" data-testid="pb-summary">{t.playbook.summary.replace("{missing}", String(count("missing"))).replace("{deviation}", String(count("deviation"))).replace("{review}", String(count("review"))).replace("{ok}", String(count("ok")))}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${fileSafe(title)}-playbook.docx`, markdownToDocx(findingsMarkdown(findings, title), { title, subtitle: t.tabs.playbook, footer: t.notAdvice }))}>📝 {t.word}</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${fileSafe(title)}-playbook.md`, findingsMarkdown(findings, title), "text/markdown;charset=utf-8")}>⬇️ {t.md}</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${fileSafe(title)}-playbook.csv`, [["Clause", "Status", "Severity", "Detail", "Standard", "Fallback", "Evidence"], ...findings.map((f) => [f.name, f.status, f.severity, f.detail, f.standard, f.fallback, f.evidence || ""])].map((r) => r.map(csvCell).join(",")).join("\n") + "\n", "text/csv;charset=utf-8")}>⬇️ {t.csv}</button>
              <AiButton t={t} onClick={toAi} />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {findings.map((f, i) => (
              <article key={i} className="rounded-xl border border-slate-200 p-3 sm:p-4" data-testid="pb-finding">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{f.name}</h3>
                  <span className={`${badge} ${STATUS_TONE[f.status]}`}>{t.playbook.status[f.status]}</span>
                  {f.status !== "ok" ? <span className={`text-[11px] font-semibold ${SEV_TONE[f.severity]}`}>● {t.playbook.severity[f.severity]}</span> : null}
                </div>
                <p className="mt-1 break-words text-sm text-slate-700">{f.detail}</p>
                {f.status !== "ok" ? (
                  <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2 [&>*]:min-w-0">
                    <div className="rounded-lg bg-slate-50 p-2"><div className="font-semibold text-slate-600">{t.playbook.standard}</div><div className="mt-0.5 text-slate-700">{f.standard}</div></div>
                    <div className="rounded-lg bg-slate-50 p-2"><div className="font-semibold text-slate-600">{t.playbook.fallback}</div><div className="mt-0.5 text-slate-700">{f.fallback}</div></div>
                  </div>
                ) : null}
                {f.evidence ? <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-slate-600">{t.playbook.evidence}</summary><p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{f.evidence}</p></details> : null}
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">{t.notAdvice}</p>
        </div>
      ) : null}

      <Modal open={!!editing} onClose={() => setEditing(null)} wide title={editing && library.playbooks.some((p) => p.id === editing.id) ? t.playbook.editPlaybook : t.playbook.newPlaybook}
        footer={<><button className="btn-ghost" onClick={() => setEditing(null)}>{t.cancel}</button><button className="btn-primary" onClick={saveEdit} disabled={busy || !editing?.name.trim()} data-testid="pb-save">{busy ? <Spinner /> : null} {t.save}</button></>}>
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="label">{t.playbook.name}</span><input className="input" value={editing.name} maxLength={120} onChange={(e) => setEditing({ ...editing, name: e.target.value })} data-testid="pb-name" /></label>
              <label className="block"><span className="label">{t.playbook.side}</span><input className="input" value={editing.side} maxLength={80} onChange={(e) => setEditing({ ...editing, side: e.target.value })} /></label>
            </div>
            <h3 className="text-sm font-semibold">{t.playbook.positions}</h3>
            {editing.positions.map((p, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-[180px] flex-1"><span className="label">{t.playbook.clause}</span>
                    <select className="select" value={p.clause} onChange={(e) => setPos(i, { clause: e.target.value as Position["clause"] })}>{CLAUSE_TYPES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                  <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={p.required} onChange={(e) => setPos(i, { required: e.target.checked })} /> {t.playbook.required}</label>
                  <button type="button" className="btn-ghost btn-sm pb-2 text-rose-600" onClick={() => setEditing({ ...editing, positions: editing.positions.filter((_, j) => j !== i) })}>✕</button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block"><span className="label">{t.playbook.standard}</span><textarea className="textarea" rows={3} maxLength={1500} value={p.standard} onChange={(e) => setPos(i, { standard: e.target.value })} data-testid="pb-standard" /></label>
                  <label className="block"><span className="label">{t.playbook.fallback}</span><textarea className="textarea" rows={3} maxLength={1500} value={p.fallback} onChange={(e) => setPos(i, { fallback: e.target.value })} /></label>
                </div>
                <label className="block"><span className="label">{t.playbook.redFlags}</span><textarea className="textarea" rows={2} value={p.redFlags.join("\n")} onChange={(e) => setPos(i, { redFlags: e.target.value.split("\n").slice(0, 20) })} data-testid="pb-redflags" /></label>
                <div>
                  <span className="label">{t.playbook.checks}</span>
                  {p.checks.map((c, k) => (
                    <div key={k} className="mb-2 flex flex-wrap gap-2">
                      <select className="select min-w-[200px] flex-1" value={c.kind} onChange={(e) => { const kind = e.target.value as Check["kind"]; setPos(i, { checks: p.checks.map((x, j) => (j === k ? (isList(kind) ? { kind, value: [] } : { kind, value: 0 }) as Check : x)) }); }}>
                        {CHECK_KINDS.map((kind) => <option key={kind} value={kind}>{t.playbook.checkKinds[kind]}</option>)}
                      </select>
                      <input className="input w-full sm:w-48" placeholder={isList(c.kind) ? t.playbook.listHint : t.playbook.checkValue}
                        value={Array.isArray(c.value) ? c.value.join(", ") : String(c.value)}
                        onChange={(e) => setPos(i, { checks: p.checks.map((x, j) => (j === k ? { kind: c.kind, value: isList(c.kind) ? e.target.value.split(",").map((s) => s.trim()) : Number(e.target.value) || 0 } as Check : x)) })} />
                      <button type="button" className="btn-ghost btn-sm text-rose-600" onClick={() => setPos(i, { checks: p.checks.filter((_, j) => j !== k) })}>✕</button>
                    </div>
                  ))}
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setPos(i, { checks: [...p.checks, { kind: "maxDays", value: 30 }] })}>＋ {t.playbook.addCheck}</button>
                </div>
              </div>
            ))}
            <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing({ ...editing, positions: [...editing.positions, { clause: "termination", required: false, standard: "", fallback: "", redFlags: [], checks: [] }] })}>＋ {t.playbook.addPosition}</button>
            {editErr ? <Alert tone="error">{editErr}</Alert> : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
