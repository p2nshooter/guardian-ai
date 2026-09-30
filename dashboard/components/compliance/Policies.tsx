/* COMPLIANCE CENTER v4 — Policy center: 26 templates mapped to the controls
 * they evidence, drafts written by the member's own AI from the organisation
 * profile, versions with notes, and a draft → review → approved lifecycle. */
"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { Spinner } from "@/components/ui";
import Markdown from "@/components/Markdown";
import ModelPicker, { type AiChoice } from "@/components/ai/ModelPicker";
import { stripStatus } from "@/lib/markdown";
import { markdownToDocx } from "@/lib/export/docx";
import { POLICY_TEMPLATES } from "@/lib/compliance/library";
import { aiContext, newId, policyControls, type Policy, type Workspace } from "@/lib/compliance/workspace";
import type { ComplianceDict } from "@/lib/i18n-pages/compliance";
import { download, slugName, type WsUpdate } from "./shared";

export default function Policies({ t, lang, w, onWs }: { t: ComplianceDict; lang: Lang; w: Workspace; onWs: (u: WsUpdate) => void }) {
  const [openId, setOpenId] = useState("");
  const p = w.policies.find((x) => x.id === openId);
  function create(tid: string) {
    const tpl = POLICY_TEMPLATES.find((x) => x.id === tid)!;
    const content = [`# ${tpl.name}`, "", `_${tpl.purpose}_`, "", ...tpl.sections.flatMap((s) => [`## ${s}`, "", "", ""])].join("\n");
    const np: Policy = { id: newId("p"), template: tid, title: tpl.name, status: "draft", owner: "", version: 1, content, history: [] };
    onWs((x) => ({ ...x, policies: [...x.policies, np] }));
    setOpenId(np.id);
  }
  if (p) return <Editor key={p.id} t={t} lang={lang} w={w} p={p} onWs={onWs} onBack={() => setOpenId("")} />;
  return (
    <div className="space-y-4">
      <section className="card-pad">
        <h3 className="font-bold text-slate-900">{t.yourPolicies} <span className="font-normal text-slate-500">· {w.policies.length}</span></h3>
        {w.policies.length ? (
          <ul className="mt-2 divide-y divide-slate-100" data-testid="comp-policies">{w.policies.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <button type="button" className="min-w-0 flex-1 truncate text-left font-semibold text-slate-800 hover:underline" onClick={() => setOpenId(x.id)}>{x.title}</button>
              <span className="text-xs text-slate-500">v{x.version}</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${x.status === "approved" ? "bg-emerald-100 text-emerald-800" : x.status === "review" ? "bg-amber-100 text-amber-900" : x.status === "retired" ? "bg-slate-100 text-slate-400" : "bg-slate-100 text-slate-700"}`}>{t.policyStatuses[x.status]}</span>
              {x.reviewDue ? <span className="text-xs text-slate-500">{t.reviewDue}: {x.reviewDue}</span> : null}
            </li>
          ))}</ul>
        ) : <p className="mt-2 text-sm text-slate-500">{t.noPolicies}</p>}
      </section>
      <section className="card-pad">
        <h3 className="font-bold text-slate-900">{t.templates}</h3>
        <p className="text-xs text-slate-500">{t.templatesSub.replace("{n}", String(POLICY_TEMPLATES.length))}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3" data-testid="comp-templates">
          {POLICY_TEMPLATES.map((tpl) => { const n = policyControls(w, tpl.id).length; return (
            <div key={tpl.id} className="flex flex-col rounded-xl border border-slate-200 p-3">
              <div className="font-semibold text-slate-900">{tpl.name}</div>
              <p className="mt-1 flex-1 text-xs text-slate-600">{tpl.purpose}</p>
              <div className="mt-2 flex items-center gap-2"><span className="text-[11px] text-slate-500">{t.evidences}: {n}</span>
                <button type="button" className="btn-secondary btn-sm ml-auto" onClick={() => create(tpl.id)} data-testid={`comp-tpl-${tpl.id}`}>＋ {t.create}</button></div>
            </div>
          ); })}
        </div>
      </section>
    </div>
  );
}

function Editor({ t, lang, w, p, onWs, onBack }: { t: ComplianceDict; lang: Lang; w: Workspace; p: Policy; onWs: (u: WsUpdate) => void; onBack: () => void }) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [note, setNote] = useState("");
  const [approver, setApprover] = useState(p.approver || "");
  const [ai, setAi] = useState<AiChoice>({ provider: "", model: "", research: false });
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<{ msg: string; needKey?: boolean } | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; ctrl.current?.abort(); }, []);
  const tpl = POLICY_TEMPLATES.find((x) => x.id === p.template);
  const mapped = policyControls(w, p.template);
  const set = (patch: Partial<Policy>) => onWs((x) => ({ ...x, policies: x.policies.map((y) => (y.id === p.id ? { ...y, ...patch } : y)) }));

  async function draft() {
    if (!ai.provider || running) return;
    setErr(null); setRunning(true);
    const fw = (Object.keys(tpl?.controls || {}).find((f) => w.frameworks.includes(f as never)) || w.frameworks[0] || "iso27001");
    const ask = [`Draft the "${p.title}" for ${w.org.name || "the organisation"}.`, tpl ? `Purpose: ${tpl.purpose}` : "", tpl ? `Use exactly these sections: ${tpl.sections.join("; ")}.` : "",
      mapped.length ? `Map each section to these controls: ${mapped.map((m) => `${m.fw} ${m.id}`).join(", ")}.` : "", "Return only the policy in Markdown, starting with a level-1 heading. Mark organisation-specific values as [placeholders]."].filter(Boolean).join("\n");
    const cc = new AbortController(); ctrl.current = cc;
    let acc = "";
    try {
      const res = await fetch("/api/byox/run", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", signal: cc.signal,
        body: JSON.stringify({ app: "compliance", task: "policy", messages: [{ role: "user", content: ask }], provider: ai.provider, model: ai.model, options: { framework: fw, mode: "policy", briefing: aiContext(w), research: ai.research ? "1" : "0" } }) });
      if (!res.ok || !res.body) { const j: any = await res.json().catch(() => ({})); if (alive.current) { setErr({ msg: j.error || `Request failed (${res.status})`, needKey: j.needKey }); setRunning(false); } return; }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let last = 0;
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); if (alive.current && Date.now() - last > 120) { set({ content: stripStatus(acc) }); last = Date.now(); } }
    } catch (e: any) { if (e?.name !== "AbortError") acc += `\n\n⚠️ ${String(e?.message || e)}`; }
    if (!alive.current) return;
    const out = stripStatus(acc).trim();
    if (out) set({ content: out });
    setRunning(false); setTab("preview");
  }
  function saveVersion() {
    set({ history: [...p.history, { version: p.version, at: new Date().toISOString(), content: p.content, note: note.trim() || undefined }].slice(-20), version: p.version + 1, status: p.status === "approved" ? "draft" : p.status, approvedAt: p.status === "approved" ? undefined : p.approvedAt });
    setNote("");
  }
  function approve() {
    if (!approver.trim()) { setErr({ msg: t.needsName }); return; }
    const due = p.reviewDue || new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
    set({ status: "approved", approver: approver.trim().slice(0, 120), approvedAt: new Date().toISOString(), reviewDue: due }); setErr(null);
  }
  const name = slugName(p.title);

  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1fr)_340px]" data-testid="comp-policy-editor">
      <section className="card-pad min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-ghost btn-sm" onClick={onBack}>← {t.tabs.policies}</button>
          <input className="input min-w-[200px] flex-1 font-semibold" value={p.title} onChange={(e) => set({ title: e.target.value.slice(0, 200) })} aria-label={t.tabs.policies} />
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
            <button type="button" className={`rounded px-2 py-1 ${tab === "edit" ? "bg-slate-900 text-white" : ""}`} onClick={() => setTab("edit")}>{t.editTab}</button>
            <button type="button" className={`rounded px-2 py-1 ${tab === "preview" ? "bg-slate-900 text-white" : ""}`} onClick={() => setTab("preview")} data-testid="comp-policy-preview">{t.preview}</button>
          </div>
        </div>
        {tab === "edit" ? <textarea className="textarea mt-3 min-h-[480px] w-full font-mono text-xs" placeholder={t.contentPh} value={p.content} onChange={(e) => set({ content: e.target.value.slice(0, 200_000) })} data-testid="comp-policy-content" />
          : <div className="mt-3 min-h-[480px] rounded-xl border border-slate-200 p-5"><Markdown text={p.content} className="prose-axto" /></div>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-v${p.version}.md`, p.content, "text/markdown;charset=utf-8")}>⬇️ {t.exportMd}</button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${name}-v${p.version}.docx`, markdownToDocx(p.content, { title: p.title, subtitle: `${w.org.name || ""} · v${p.version} · ${t.policyStatuses[p.status]}` }))} data-testid="comp-policy-docx">⬇️ {t.exportDocx}</button>
        </div>
      </section>
      <aside className="space-y-4">
        <section className="card-pad">
          <div className="text-sm"><span className="font-semibold">{t.version}</span> v{p.version} · <span className="font-semibold">{t.status}</span> <span data-testid="comp-policy-status">{t.policyStatuses[p.status]}</span></div>
          {p.approvedAt ? <p className="mt-1 text-xs text-emerald-700">{t.approvedOn.replace("{date}", p.approvedAt.slice(0, 10)).replace("{name}", p.approver || "—")}</p> : null}
          <label className="mt-2 block text-sm">{t.owner}<input className="input mt-1 w-full py-1" placeholder={t.ownerPh} value={p.owner} onChange={(e) => set({ owner: e.target.value.slice(0, 120) })} /></label>
          <label className="mt-2 block text-sm">{t.reviewDue}<input type="date" className="input mt-1 w-full py-1" value={p.reviewDue || ""} onChange={(e) => set({ reviewDue: e.target.value })} /></label>
          <label className="mt-2 block text-sm">{t.approver}<input className="input mt-1 w-full py-1" placeholder={t.approverPh} value={approver} onChange={(e) => setApprover(e.target.value)} data-testid="comp-policy-approver" /></label>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.status === "draft" ? <button type="button" className="btn-secondary btn-sm" onClick={() => set({ status: "review" })} data-testid="comp-policy-review">{t.submitReview}</button> : null}
            {p.status === "draft" || p.status === "review" ? <button type="button" className="btn-primary btn-sm" onClick={approve} data-testid="comp-policy-approve">✓ {t.approve}</button> : null}
            {p.status === "approved" ? <button type="button" className="btn-ghost btn-sm" onClick={() => set({ status: "retired" })}>{t.retire}</button> : null}
          </div>
          <div className="mt-3 flex gap-2"><input className="input flex-1 py-1 text-sm" placeholder={t.versionNote} value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="button" className="btn-secondary btn-sm" onClick={saveVersion} data-testid="comp-policy-version">{t.saveVersion}</button></div>
          {err ? <p className="mt-2 text-xs text-rose-700">⚠️ {err.msg}{err.needKey ? <Link href="/app/settings?tab=ai" className="ml-1 font-semibold underline">{t.addKey}</Link> : null}</p> : null}
        </section>
        <section className="card-pad">
          <div className="text-sm font-semibold text-slate-900">🤖 {t.draftAi}</div>
          <div className="mt-2"><ModelPicker lang={lang} value={ai} onChange={setAi} /></div>
          {running ? <button type="button" className="btn-secondary btn-sm mt-2 w-full" onClick={() => ctrl.current?.abort()}><Spinner /> {t.drafting} ■</button>
            : <button type="button" className="btn-primary btn-sm mt-2 w-full" disabled={!ai.provider} onClick={draft} data-testid="comp-policy-draft">{t.draftAi}</button>}
        </section>
        <section className="card-pad">
          <div className="text-sm font-semibold text-slate-900">{t.evidences} · {mapped.length}</div>
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-600">{mapped.map((m) => `${m.fw}:${m.id}`).join(" · ") || "—"}</p>
        </section>
        {p.history.length ? (
          <section className="card-pad">
            <div className="text-sm font-semibold text-slate-900">{t.history}</div>
            <ul className="mt-1 space-y-1 text-xs" data-testid="comp-policy-history">{[...p.history].reverse().map((h) => (
              <li key={h.version} className="flex items-center gap-2"><span className="font-semibold">v{h.version}</span><span className="text-slate-500">{h.at.slice(0, 10)}</span><span className="min-w-0 flex-1 truncate text-slate-600">{h.note || ""}</span>
                <button type="button" className="btn-ghost btn-sm" onClick={() => set({ content: h.content })}>{t.restore}</button></li>
            ))}</ul>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
