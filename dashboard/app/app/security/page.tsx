/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * SECURITY ANALYST v4 — an investigation workspace built around the CASE:
 *   overview   counts, severity mix, timeline, top entities, detections,
 *              brute force, summary and notes
 *   evidence   logs (JSON, CloudTrail, Windows XML, syslog, CEF, LEEF, web,
 *              CSV), alerts, raw e-mails (.eml), text; other files are hashed
 *   events     normalised table with search and severity / source / detection
 *              filters · iocs  extraction, verdicts, lookups, CSV / STIX 2.1 /
 *              blocklist · attack  MITRE ATT&CK matrix (rules, analyst, AI)
 *   phishing   header, authentication, link and attachment analysis
 *   decoder    CyberChef-style recipes with Magic · rules  Sigma, KQL, SPL,
 *              YARA, Suricata · ai  the member's own model with a compact
 *              briefing · report  Markdown, Word, STIX, print / PDF
 * Parsing, detection, decoding and extraction run in this browser. Cases are
 * saved automatically to the member's encrypted history (full CRUD).
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n, pick } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { LoadingBlock, Spinner } from "@/components/ui";
import { CASE_STATUSES, aiContext, compute, newCase, upgradeCase, type Case, type CaseStatus } from "@/lib/security/case";
import { SEVERITIES, type Severity } from "@/lib/security/attack";
import { SAMPLE_CLOUD, SAMPLE_EMAIL, SAMPLE_WEB, SAMPLE_WINDOWS } from "@/lib/security/sample";
import Overview from "@/components/security/Overview";
import Evidence, { makeArtifact } from "@/components/security/Evidence";
import Events from "@/components/security/Events";
import Iocs from "@/components/security/Iocs";
import Attack from "@/components/security/Attack";
import Phishing from "@/components/security/Phishing";
import Decoder from "@/components/security/Decoder";
import Rules from "@/components/security/Rules";
import Analyst from "@/components/security/Analyst";
import Report from "@/components/security/Report";
import { SEV_BADGE, type CaseUpdate } from "@/components/security/shared";
import { L } from "@/lib/i18n-pages/security";

type Tab = "overview" | "evidence" | "events" | "iocs" | "attack" | "phishing" | "decoder" | "rules" | "ai" | "report";
const TAB_ICON: Record<Tab, string> = { overview: "📊", evidence: "🗂️", events: "📜", iocs: "🔎", attack: "🧭", phishing: "🎣", decoder: "🧪", rules: "📐", ai: "🤖", report: "📄" };
interface Entry { id: string; title: string; updatedAt: string; meta?: Record<string, string | number | boolean> }

const hasContent = (c: Case) => !!(c.artifacts.length || c.notes.length || c.messages.length || c.summary.trim() || c.title.trim());
const titleOf = (c: Case, fallback: string) => (c.title.trim() || c.artifacts[0]?.email?.subject || c.artifacts[0]?.name || fallback).replace(/\s+/g, " ").slice(0, 120);

export default function SecurityApp() {
  const { lang } = useI18n();
  const { me } = useMe();
  const t = pick(L, lang);
  const access = !!me && me.limits.apps.includes("security");

  const [items, setItems] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [c, setC] = useState<Case>(() => newCase());
  const [id, setId] = useState<string | null>(null);
  const [gen, setGen] = useState(0); // bumps whenever another case is opened
  const [tab, setTab] = useState<Tab>("overview");
  const [detection, setDetection] = useState("");
  const [prefill, setPrefill] = useState("");
  const [save, setSave] = useState<{ state: "idle" | "saving" | "saved" | "error"; msg?: string }>({ state: "idle" });
  const [opening, setOpening] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [tagText, setTagText] = useState("");

  // Autosave: the latest case, its id and generation live in refs so async saves never cross cases.
  const latest = useRef(c);
  const idRef = useRef<string | null>(null);
  const genRef = useRef(0);
  const dirty = useRef(false);
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => { const r = await api<{ items: Entry[] }>("/api/history/security"); if (r.ok) setItems(r.data.items); }, []);

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (saving.current) { await saving.current; if (!dirty.current) return; }
    if (!dirty.current || !hasContent(latest.current)) return;
    const cur = latest.current, g = genRef.current;
    dirty.current = false;
    let failed = false;
    setSave({ state: "saving" });
    saving.current = (async () => {
      const r = await api<{ item: Entry }>("/api/history/security", { body: {
        id: idRef.current || undefined, title: titleOf(cur, t.untitled), body: cur,
        meta: { status: cur.status, severity: cur.severity, evidence: cur.artifacts.length },
      } });
      if (g !== genRef.current) return; // the member opened another case meanwhile
      if (r.ok) {
        if (!idRef.current) { idRef.current = r.data.item.id; setId(r.data.item.id); setUrl(r.data.item.id); }
        setSave({ state: "saved" }); reload();
      } else { failed = true; dirty.current = true; setSave({ state: "error", msg: r.error }); }
    })();
    try { await saving.current; } finally { saving.current = null; }
    // Changes made while saving are saved next; a failed save waits for the next edit.
    if (dirty.current && !failed && g === genRef.current) timer.current = setTimeout(() => { flush(); }, 1200);
  }, [reload, t.untitled]);

  const onCase = useCallback((u: CaseUpdate) => {
    const next = typeof u === "function" ? u(latest.current) : u;
    latest.current = next; setC(next); dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { flush(); }, 1200);
  }, [flush]);

  // Save before the tab closes.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty.current && hasContent(latest.current)) { flush(); e.preventDefault(); } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [flush]);

  /** Keep ?open=<id> in the address bar so a reload or a shared tab reopens the case. */
  function setUrl(cid: string | null) {
    const u = new URL(window.location.href);
    if (cid) u.searchParams.set("open", cid); else u.searchParams.delete("open");
    window.history.replaceState(null, "", u.toString());
  }
  function switchTo(next: Case, nextId: string | null) {
    genRef.current += 1; setGen(genRef.current);
    latest.current = next; idRef.current = nextId; dirty.current = false;
    setC(next); setId(nextId); setDetection(""); setPrefill(""); setSave({ state: nextId ? "saved" : "idle" }); setTagText(""); setSidebar(false);
    setUrl(nextId);
  }
  async function open(cid: string) {
    await flush();
    setOpening(true);
    const r = await api<{ item: { title: string; body: unknown } }>(`/api/history/security/${cid}`);
    setOpening(false);
    if (!r.ok) { setSave({ state: "error", msg: r.error }); return; }
    const body: any = r.data.item.body;
    const next = upgradeCase(body && typeof body === "object" ? { title: r.data.item.title, ...body } : { title: r.data.item.title });
    switchTo(next, cid);
    setTab(next.artifacts.length ? "overview" : next.messages.length ? "ai" : "overview");
  }
  async function create() { await flush(); switchTo(newCase(), null); setTab("overview"); }
  async function rename(cid: string, cur: string) {
    const title = window.prompt(t.renamePrompt, cur);
    if (title == null || !title.trim()) return;
    if (cid === idRef.current) { onCase((p) => ({ ...p, title: title.trim() })); await flush(); return; }
    await api(`/api/history/security/${cid}/rename`, { body: { title } }); reload();
  }
  async function duplicate(cid: string) { await flush(); await api(`/api/history/security/${cid}/duplicate`, { body: {} }); reload(); }
  async function del(cid: string) {
    if (!window.confirm(t.confirmDel)) return;
    await api(`/api/history/security/${cid}`, { method: "DELETE" });
    if (cid === idRef.current) switchTo(newCase(), null);
    reload();
  }

  async function loadSample() {
    const arts = await Promise.all([
      makeArtifact("DC01-Security.xml", SAMPLE_WINDOWS, "log"),
      makeArtifact("web-access.log", SAMPLE_WEB, "log"),
      makeArtifact("cloudtrail.json", SAMPLE_CLOUD, "log"),
      makeArtifact("unusual-sign-in.eml", SAMPLE_EMAIL, "email"),
    ]);
    onCase((p) => ({ ...p, title: p.title || t.sampleTitle, severity: "critical", status: "investigating", tags: Array.from(new Set([...p.tags, "sample", "rdp", "phishing"])), artifacts: [...p.artifacts, ...arts] }));
  }
  async function addEvidence(name: string, text: string) {
    const a = await makeArtifact(name, text);
    onCase((p) => ({ ...p, artifacts: [...p.artifacts, a] }));
    setTab("evidence");
  }

  useEffect(() => {
    if (!access) return;
    reload();
    const oid = new URLSearchParams(window.location.search).get("open");
    if (oid) open(oid);
  }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  // Everything below the case (events, detections, IOCs, techniques) is recomputed on the device.
  const k = useMemo(() => compute(c), [c.artifacts, c.iocState, c.attackManual, c.messages]); // eslint-disable-line react-hooks/exhaustive-deps
  const briefing = useMemo(() => aiContext(c, k), [c, k]);
  const shown = useMemo(() => { const n = q.trim().toLowerCase(); return n ? items.filter((x) => x.title.toLowerCase().includes(n)) : items; }, [items, q]);
  const onShowDetection = useCallback((rule: string) => { setDetection(rule); setTab("events"); }, []);
  const onPrefillUsed = useCallback(() => setPrefill(""), []);

  if (!me) return <LoadingBlock />;
  if (!access) return (
    <div className="surface-ink relative overflow-hidden rounded-2xl p-8"><div className="glow pointer-events-none absolute inset-0" />
      <div className="relative"><div className="text-4xl">🛡️</div><h1 className="mt-3 text-2xl font-extrabold text-white">{t.noPlan}</h1>
        <p className="mt-2 max-w-xl text-slate-300">{t.sub}</p>
        <Link href="/app/billing?plan=pro" className="btn-primary btn-lg mt-5">{t.upgrade} →</Link></div></div>
  );

  const counts: Partial<Record<Tab, number>> = {
    evidence: c.artifacts.length, events: k.stats.total, iocs: k.iocs.filter((x) => !x.private).length,
    attack: k.techniques.length, phishing: k.emails.length, ai: c.messages.filter((m) => m.role === "assistant").length,
  };
  const saveLabel = save.state === "saving" ? <span className="flex items-center gap-1 text-slate-500"><Spinner /> {t.saving}</span>
    : save.state === "saved" ? <span className="text-emerald-700">✓ {t.saved}</span>
    : save.state === "error" ? <span className="text-rose-700" title={save.msg}>⚠️ {t.saveError.replace("{msg}", save.msg || "")}</span> : null;

  const aside = (
    <div className="flex h-full flex-col">
      <button type="button" className="btn-primary btn-sm mb-3" onClick={create} data-testid="sec-new">＋ {t.newCase}</button>
      <input className="input mb-2 py-1.5 text-sm" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.search} />
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.cases}</div>
      <div className="min-h-0 flex-1 overflow-y-auto" data-testid="sec-cases">
        {shown.length ? shown.map((x) => {
          const sev = SEVERITIES.includes(x.meta?.severity as Severity) ? (x.meta!.severity as Severity) : null;
          const st = CASE_STATUSES.includes(x.meta?.status as CaseStatus) ? (x.meta!.status as CaseStatus) : null;
          return (
            <div key={x.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${x.id === id ? "bg-brand-50" : "hover:bg-slate-50"}`}>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => open(x.id)}>
                <div className="truncate">{x.title}</div>
                {sev || st ? <div className="mt-0.5 flex items-center gap-1 text-[10px]">{sev ? <span className={`rounded px-1 font-bold uppercase ${SEV_BADGE[sev]}`}>{t.severities[sev]}</span> : null}{st ? <span className="text-slate-500">{t.statuses[st]}</span> : null}</div> : null}
              </button>
              <div className="hidden shrink-0 gap-0.5 group-hover:flex">
                <button type="button" className="rounded px-1 text-xs text-slate-400 hover:text-slate-700" title={t.rename} aria-label={t.rename} onClick={() => rename(x.id, x.title)}>✎</button>
                <button type="button" className="rounded px-1 text-xs text-slate-400 hover:text-slate-700" title={t.duplicate} aria-label={t.duplicate} onClick={() => duplicate(x.id)}>⧉</button>
                <button type="button" className="rounded px-1 text-xs text-slate-400 hover:text-rose-600" title={t.del} aria-label={t.del} onClick={() => del(x.id)}>✕</button>
              </div>
            </div>
          );
        }) : <p className="px-2 py-3 text-xs text-slate-400">{t.empty}</p>}
      </div>
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="no-print hidden lg:block"><div className="card sticky top-20 h-[calc(100vh-6rem)] p-3">{aside}</div></aside>
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary btn-sm lg:hidden" onClick={() => setSidebar(true)}>☰ {t.cases}</button>
          <div className="min-w-0">
            <div className="eyebrow">🛡️ {t.title}</div>
            <p className="text-sm text-slate-600">{t.sub}</p>
          </div>
        </div>

        <section className="card-pad mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <input className="input min-w-[220px] flex-1 text-lg font-bold" placeholder={t.titlePh} value={c.title} aria-label={t.titlePh}
              onChange={(e) => onCase((p) => ({ ...p, title: e.target.value.slice(0, 200) }))} data-testid="sec-title" />
            <div className="text-xs" data-testid="sec-save">{opening ? <span className="flex items-center gap-1 text-slate-500"><Spinner /> {t.loadingCase}</span> : saveLabel}</div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-1.5"><span className="text-slate-600">{t.status}</span>
              <select className="select py-1 text-sm" value={c.status} onChange={(e) => onCase((p) => ({ ...p, status: e.target.value as CaseStatus }))} data-testid="sec-status">
                {CASE_STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
              </select></label>
            <label className="flex items-center gap-1.5"><span className="text-slate-600">{t.severity}</span>
              <select className={`select py-1 text-sm font-semibold ${c.severity === "critical" ? "text-rose-700" : ""}`} value={c.severity} onChange={(e) => onCase((p) => ({ ...p, severity: e.target.value as Severity }))} data-testid="sec-severity">
                {SEVERITIES.map((s) => <option key={s} value={s}>{t.severities[s]}</option>)}
              </select></label>
            {k.detections.length && k.worst !== c.severity ? (
              <button type="button" className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-900" onClick={() => onCase((p) => ({ ...p, severity: k.worst }))}>{t.suggestedSev.replace("{sev}", t.severities[k.worst])} ↵</button>
            ) : null}
            <div className="flex min-w-[200px] flex-1 flex-wrap items-center gap-1">
              <span className="text-slate-600">{t.tags}</span>
              {c.tags.map((g) => <span key={g} className="badge-brand">{g}<button type="button" className="ml-1" aria-label={`${t.remove} ${g}`} onClick={() => onCase((p) => ({ ...p, tags: p.tags.filter((x) => x !== g) }))}>×</button></span>)}
              <input className="input min-w-[120px] flex-1 py-1 text-sm" placeholder={t.tagsPh} value={tagText} aria-label={t.tags}
                onChange={(e) => setTagText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === ",") && tagText.trim()) {
                    e.preventDefault();
                    const add = tagText.split(",").map((s) => s.trim().toLowerCase().slice(0, 40)).filter(Boolean);
                    onCase((p) => ({ ...p, tags: Array.from(new Set([...p.tags, ...add])).slice(0, 30) })); setTagText("");
                  }
                }} />
            </div>
          </div>
        </section>

        <div className="no-print mb-3 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist">
          {(Object.keys(t.tabs) as Tab[]).map((x) => (
            <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)} data-testid={`sec-tab-${x}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === x ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
              <span>{TAB_ICON[x]}</span>{t.tabs[x]}
              {counts[x] ? <span className="rounded-full bg-brand-100 px-1.5 text-[11px] text-brand-800">{counts[x]!.toLocaleString()}</span> : null}
            </button>
          ))}
        </div>

        {tab === "overview" ? <Overview t={t} c={c} k={k} onCase={onCase} onShowDetection={onShowDetection} onSample={loadSample} onGoEvidence={() => setTab("evidence")} /> : null}
        {tab === "evidence" ? <Evidence t={t} c={c} k={k} onCase={onCase} /> : null}
        {tab === "events" ? <Events t={t} c={c} k={k} detection={detection} onDetection={setDetection} onCase={onCase} /> : null}
        {tab === "iocs" ? <Iocs t={t} c={c} k={k} onCase={onCase} /> : null}
        {tab === "attack" ? <Attack t={t} c={c} k={k} onCase={onCase} /> : null}
        {tab === "phishing" ? <Phishing t={t} k={k} /> : null}
        <div hidden={tab !== "decoder"}><Decoder t={t} onEvidence={addEvidence} /></div>
        {tab === "rules" ? <Rules t={t} c={c} k={k} onAsk={(text) => { setPrefill(text); setTab("ai"); }} /> : null}
        <div hidden={tab !== "ai"}><Analyst key={gen} t={t} lang={lang} c={c} briefing={briefing} onCase={onCase} prefill={prefill} onPrefillUsed={onPrefillUsed} /></div>
        {tab === "report" ? <Report t={t} c={c} k={k} /> : null}
        <p className="mt-4 text-xs text-slate-500">{t.defensive}</p>
      </div>

      {sidebar ? <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebar(false)}><div className="absolute inset-0 bg-ink-950/40" /><aside className="absolute inset-y-0 left-0 w-72 bg-white p-3 shadow-lift" onClick={(e) => e.stopPropagation()}>{aside}</aside></div> : null}
    </div>
  );
}
