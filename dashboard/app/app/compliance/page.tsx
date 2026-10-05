/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * COMPLIANCE CENTER v4 — a compliance PROGRAMME workspace:
 *   overview   readiness per framework and domain, overdue controls, risks,
 *              policy and vendor status
 *   profile    organisation, systems, data, frameworks in scope
 *   controls   342 real controls (ISO 27001:2022 Annex A, SOC 2 TSC, NIST CSF
 *              2.0, PCI DSS v4.0.1, HIPAA Security Rule, GDPR, UU PDP) with
 *              status, owner, due date, notes, N/A justification, encrypted
 *              evidence files and cross-framework mapping
 *   risks      register with 5×5 inherent / residual heat map
 *   policies   26 templates, AI drafts, versions, review and approval
 *   vendors    weighted questionnaire, score and tiers
 *   ai         the member's own model with a programme briefing
 *   reports    readiness report, controls CSV, Statement of Applicability,
 *              risk / vendor CSVs, JSON backup and import
 * Scores, mappings and exports are computed in this browser; the programme is
 * saved automatically to the member's encrypted history.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n, pick } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { LoadingBlock, Spinner } from "@/components/ui";
import { FRAMEWORKS, type CompMode, type FrameworkId } from "@/lib/compliance/frameworks";
import { newWorkspace, sampleWorkspace, score, upgradeWorkspace, type Workspace } from "@/lib/compliance/workspace";
import { CompCatalogContext, useCompCatalog } from "@/components/compliance/catalog-context";
import Overview from "@/components/compliance/Overview";
import Profile from "@/components/compliance/Profile";
import Controls, { downloadEvidence } from "@/components/compliance/Controls";
import Risks from "@/components/compliance/Risks";
import Policies from "@/components/compliance/Policies";
import Vendors from "@/components/compliance/Vendors";
import Advisor from "@/components/compliance/Advisor";
import Reports from "@/components/compliance/Reports";
import type { WsUpdate } from "@/components/compliance/shared";
import { L } from "@/lib/i18n-pages/compliance";

type Tab = "overview" | "profile" | "controls" | "risks" | "policies" | "vendors" | "ai" | "reports";
const TAB_ICON: Record<Tab, string> = { overview: "📊", profile: "🏢", controls: "✅", risks: "🎯", policies: "📝", vendors: "🤝", ai: "🤖", reports: "📄" };
interface Entry { id: string; title: string; updatedAt: string; meta?: Record<string, string | number | boolean> }

const hasContent = (w: Workspace) => !!(w.name.trim() || w.org.name.trim() || Object.keys(w.controls).length || w.risks.length || w.policies.length || w.vendors.length || w.messages.length);

export default function ComplianceApp() {
  const { lang } = useI18n();
  // The catalogue (controls, policies, sample …) in the member's language, shared with every screen.
  const compCat = useCompCatalog(lang);
  const { me } = useMe();
  const t = pick(L, lang);
  const access = !!me && me.limits.apps.includes("compliance");

  const [items, setItems] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [w, setW] = useState<Workspace>(() => newWorkspace());
  const [id, setId] = useState<string | null>(null);
  const [gen, setGen] = useState(0);
  const [tab, setTab] = useState<Tab>("overview");
  const [fw, setFw] = useState<FrameworkId>("iso27001");
  const [openCtl, setOpenCtl] = useState("");
  const [focus, setFocus] = useState<{ fw: FrameworkId; id: string } | null>(null);
  const [prefill, setPrefill] = useState<{ mode: CompMode; text: string } | null>(null);
  const [save, setSave] = useState<{ state: "idle" | "saving" | "saved" | "error"; msg?: string }>({ state: "idle" });
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState("");
  const [sidebar, setSidebar] = useState(false);

  const latest = useRef(w);
  const idRef = useRef<string | null>(null);
  const genRef = useRef(0);
  const dirty = useRef(false);
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => { const r = await api<{ items: Entry[] }>("/api/history/compliance"); if (r.ok) setItems(r.data.items.filter((x) => x.meta?.kind !== "evidence")); }, []);
  const setUrl = (cid: string | null) => { const u = new URL(window.location.href); if (cid) u.searchParams.set("open", cid); else u.searchParams.delete("open"); window.history.replaceState(null, "", u.toString()); };

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (saving.current) { await saving.current; if (!dirty.current) return; }
    if (!dirty.current || !hasContent(latest.current)) return;
    const cur = latest.current, g = genRef.current;
    dirty.current = false;
    let failed = false;
    setSave({ state: "saving" });
    saving.current = (async () => {
      const readiness = cur.frameworks.map((f) => `${FRAMEWORKS.find((x) => x.id === f)?.name} ${score(cur, f).pct}%`).join(" · ");
      const r = await api<{ item: Entry }>("/api/history/compliance", { body: {
        id: idRef.current || undefined, title: (cur.name.trim() || cur.org.name.trim() || t.untitled).slice(0, 200), body: cur,
        meta: { kind: "programme", readiness: readiness.slice(0, 200), risks: cur.risks.length, policies: cur.policies.length },
      } });
      if (g !== genRef.current) return;
      if (r.ok) { if (!idRef.current) { idRef.current = r.data.item.id; setId(r.data.item.id); setUrl(r.data.item.id); } setSave({ state: "saved" }); reload(); }
      else { failed = true; dirty.current = true; setSave({ state: "error", msg: r.error }); }
    })();
    try { await saving.current; } finally { saving.current = null; }
    if (dirty.current && !failed && g === genRef.current) timer.current = setTimeout(() => { flush(); }, 1200);
  }, [reload, t.untitled]);

  const onWs = useCallback((u: WsUpdate) => {
    const next = typeof u === "function" ? u(latest.current) : u;
    latest.current = next; setW(next); dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { flush(); }, 1200);
  }, [flush]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty.current && hasContent(latest.current)) { flush(); e.preventDefault(); } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [flush]);

  function switchTo(next: Workspace, nextId: string | null) {
    genRef.current += 1; setGen(genRef.current);
    latest.current = next; idRef.current = nextId; dirty.current = false;
    setW(next); setId(nextId); setOpenCtl(""); setFocus(null); setPrefill(null); setNotice("");
    setFw(next.frameworks[0] || "iso27001"); setSave({ state: nextId ? "saved" : "idle" }); setSidebar(false); setUrl(nextId);
  }
  async function open(cid: string) {
    await flush();
    setOpening(true);
    const r = await api<{ item: { title: string; body: any; meta?: Record<string, unknown> } }>(`/api/history/compliance/${cid}`);
    setOpening(false);
    if (!r.ok) { setSave({ state: "error", msg: r.error }); return; }
    const b = r.data.item.body;
    if (b?.kind === "evidence") { await downloadEvidence({ id: cid, name: String(b.name || "evidence"), size: Number(b.size) || 0, type: String(b.type || ""), addedAt: "" }); setNotice(t.evidenceOpened); return; }
    const next = upgradeWorkspace(b, r.data.item.title);
    switchTo(next, cid);
    setTab(b?.v === 4 ? "overview" : "ai");
  }
  async function create() { await flush(); switchTo(newWorkspace(), null); setTab("profile"); }
  async function rename(cid: string, cur: string) {
    const title = window.prompt(t.renamePrompt, cur);
    if (title == null || !title.trim()) return;
    if (cid === idRef.current) { onWs((p) => ({ ...p, name: title.trim().slice(0, 200) })); await flush(); return; }
    await api(`/api/history/compliance/${cid}/rename`, { body: { title } }); reload();
  }
  async function duplicate(cid: string) { await flush(); await api(`/api/history/compliance/${cid}/duplicate`, { body: {} }); reload(); }
  async function del(cid: string) {
    if (!window.confirm(t.confirmDel)) return;
    await api(`/api/history/compliance/${cid}`, { method: "DELETE" });
    if (cid === idRef.current) switchTo(newWorkspace(), null);
    reload();
  }
  function loadSample() { const s = sampleWorkspace(compCat.sample); onWs({ ...s, name: t.sampleName }); setFw(s.frameworks[0]); }

  useEffect(() => {
    if (!access) return;
    reload();
    const oid = new URLSearchParams(window.location.search).get("open");
    if (oid) open(oid);
  }, [access]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!w.frameworks.includes(fw) && w.frameworks[0]) setFw(w.frameworks[0]); }, [w.frameworks, fw]);

  const shown = useMemo(() => { const n = q.trim().toLowerCase(); return n ? items.filter((x) => x.title.toLowerCase().includes(n)) : items; }, [items, q]);
  const onPrefillUsed = useCallback(() => setPrefill(null), []);
  const openControl = useCallback((f: FrameworkId, cid: string) => { setFw(f); setOpenCtl(cid); setTab("controls"); }, []);
  const askControl = useCallback((f: FrameworkId, cid: string) => { setFocus({ fw: f, id: cid }); setOpenCtl(""); setPrefill({ mode: "control", text: `How do we implement ${cid} for our organisation, and what evidence will the auditor accept?` }); setTab("ai"); }, []);

  if (!me) return <LoadingBlock />;
  if (!access) return (
    <div className="surface-ink relative overflow-hidden rounded-2xl p-8"><div className="glow pointer-events-none absolute inset-0" />
      <div className="relative"><div className="text-4xl">📋</div><h1 className="mt-3 text-2xl font-extrabold text-white">{t.noPlan}</h1>
        <p className="mt-2 max-w-xl text-slate-300">{t.sub}</p>
        <Link href="/app/billing?plan=pro" className="btn-primary btn-lg mt-5">{t.upgrade} →</Link></div></div>
  );

  const counts: Partial<Record<Tab, number>> = { risks: w.risks.length, policies: w.policies.length, vendors: w.vendors.length, ai: w.messages.filter((m) => m.role === "assistant").length,
    controls: w.frameworks.reduce((n, f) => n + score(w, f).implemented, 0) };
  const saveLabel = save.state === "saving" ? <span className="flex items-center gap-1 text-slate-500"><Spinner /> {t.saving}</span>
    : save.state === "saved" ? <span className="text-emerald-700">✓ {t.saved}</span>
    : save.state === "error" ? <span className="text-rose-700" title={save.msg}>⚠️ {t.saveError.replace("{msg}", save.msg || "")}</span> : null;

  const aside = (
    <div className="flex h-full flex-col">
      <button type="button" className="btn-primary btn-sm mb-3" onClick={create} data-testid="comp-new">＋ {t.newProgramme}</button>
      <input className="input mb-2 py-1.5 text-sm" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.search} />
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.programmes}</div>
      <div className="min-h-0 flex-1 overflow-y-auto" data-testid="comp-programmes">
        {shown.length ? shown.map((x) => (
          <div key={x.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${x.id === id ? "bg-brand-50" : "hover:bg-slate-50"}`}>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => open(x.id)}>
              <div className="truncate">{x.title}</div>
              {x.meta?.readiness ? <div className="truncate text-[10px] text-slate-500">{String(x.meta.readiness)}</div> : null}
            </button>
            <div className="hidden shrink-0 gap-0.5 group-hover:flex">
              <button type="button" className="rounded px-1 text-xs text-slate-400 hover:text-slate-700" title={t.rename} aria-label={t.rename} onClick={() => rename(x.id, x.title)}>✎</button>
              <button type="button" className="rounded px-1 text-xs text-slate-400 hover:text-slate-700" title={t.duplicate} aria-label={t.duplicate} onClick={() => duplicate(x.id)}>⧉</button>
              <button type="button" className="rounded px-1 text-xs text-slate-400 hover:text-rose-600" title={t.del} aria-label={t.del} onClick={() => del(x.id)}>✕</button>
            </div>
          </div>
        )) : <p className="px-2 py-3 text-xs text-slate-400">{t.empty}</p>}
      </div>
    </div>
  );

  return (
    <CompCatalogContext.Provider value={compCat}>
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="no-print hidden lg:block"><div className="card sticky top-20 h-[calc(100vh-6rem)] p-3">{aside}</div></aside>
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary btn-sm lg:hidden" onClick={() => setSidebar(true)}>☰ {t.programmes}</button>
          <div className="min-w-0"><div className="eyebrow">📋 {t.title}</div><p className="text-sm text-slate-600">{t.sub}</p></div>
        </div>
        <section className="card-pad mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <input className="input min-w-[220px] flex-1 text-lg font-bold" placeholder={t.namePh} value={w.name} aria-label={t.namePh}
              onChange={(e) => onWs((p) => ({ ...p, name: e.target.value.slice(0, 200) }))} data-testid="comp-name" />
            <div className="text-xs" data-testid="comp-save">{opening ? <span className="flex items-center gap-1 text-slate-500"><Spinner /> {t.loading}</span> : saveLabel}</div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">{w.frameworks.map((f) => <span key={f} className="badge-gray">{FRAMEWORKS.find((x) => x.id === f)?.name} · {score(w, f).pct}%</span>)}</div>
          {notice ? <p className="mt-2 text-sm text-slate-700" data-testid="comp-notice">{notice}</p> : null}
        </section>

        <div className="no-print mb-3 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist">
          {(Object.keys(t.tabs) as Tab[]).map((x) => (
            <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)} data-testid={`comp-tab-${x}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === x ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
              <span>{TAB_ICON[x]}</span>{t.tabs[x]}
              {counts[x] ? <span className="rounded-full bg-brand-100 px-1.5 text-[11px] text-brand-800">{counts[x]}</span> : null}
            </button>
          ))}
        </div>

        {tab === "overview" ? <Overview t={t} w={w} onSample={loadSample} onGo={setTab} onOpenControl={openControl} /> : null}
        {tab === "profile" ? <Profile t={t} w={w} onWs={onWs} /> : null}
        {tab === "controls" ? <Controls t={t} w={w} onWs={onWs} fw={fw} setFw={setFw} open={openCtl} setOpen={setOpenCtl} onAsk={askControl} /> : null}
        {tab === "risks" ? <Risks t={t} w={w} onWs={onWs} onAskAi={() => { setPrefill({ mode: "risk", text: "Propose the most material risks for our organisation, scored and mapped to controls." }); setTab("ai"); }} /> : null}
        <div hidden={tab !== "policies"}><Policies key={`p${gen}`} t={t} lang={lang} w={w} onWs={onWs} /></div>
        {tab === "vendors" ? <Vendors t={t} w={w} onWs={onWs} onAskAi={(v) => { setPrefill({ mode: "vendor", text: `Review this vendor: ${v.name} (${v.service}); criticality ${v.criticality}, data ${v.data}. Answers: ${Object.entries(v.answers).map(([k, a]) => `${k}=${a}`).join(", ") || "none yet"}.` }); setTab("ai"); }} /> : null}
        <div hidden={tab !== "ai"}><Advisor key={`a${gen}`} t={t} lang={lang} w={w} onWs={onWs} focus={focus} onClearFocus={() => setFocus(null)} prefill={prefill} onPrefillUsed={onPrefillUsed} /></div>
        {tab === "reports" ? <Reports t={t} w={w} onWs={onWs} /> : null}
        <p className="mt-4 text-xs text-slate-500">{t.notAdvice} {t.onDevice}</p>
      </div>

      {sidebar ? <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebar(false)}><div className="absolute inset-0 bg-ink-950/40" /><aside className="absolute inset-y-0 left-0 w-72 bg-white p-3 shadow-lift" onClick={(e) => e.stopPropagation()}>{aside}</aside></div> : null}
    </div>
    </CompCatalogContext.Provider>
  );
}
