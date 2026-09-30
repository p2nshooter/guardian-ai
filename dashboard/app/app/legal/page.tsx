/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * LEGAL AI — the member app. Everything the AI sees is assembled on the server
 * (/api/byox/run → lib/legal/prompt.ts); this page only collects choices,
 * extracts document text in the browser, streams the answer, and saves to
 * encrypted matters (/api/legal/matters).
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n, pick } from "@/lib/i18n";
import { LOCALE } from "@/lib/i18n-shared";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, Modal, Spinner } from "@/components/ui";
import Markdown from "@/components/Markdown";
import ModelPicker, { type AiChoice } from "@/components/ai/ModelPicker";
import JurisdictionPicker, { countryName, type JurValue } from "@/components/legal/JurisdictionPicker";
import DocumentsPanel, { MAX_RUN_TOKENS, type RunDoc } from "@/components/legal/DocumentsPanel";
import { stripStatus } from "@/lib/markdown";
import { markdownToDocx } from "@/lib/export/docx";
import { estimateTokens } from "@/lib/legal/extract";
import { flag, type Country, type Subdivision } from "@/lib/legal/jurisdictions";
import { L } from "@/lib/i18n-pages/legal";
import { LT } from "@/lib/i18n-pages/legaltools";
import type { Deadline } from "@/lib/legal/deadlines";
import { EMPTY_LIBRARY, type CiteChecks, type LegalLibrary } from "@/lib/legal/library";
import type { Handoff, ToolDoc } from "@/components/legal/tools/shared";
import Redline from "@/components/legal/tools/Redline";
import PlaybookTool from "@/components/legal/tools/Playbook";
import ClausesTool from "@/components/legal/tools/Clauses";
import DeadlinesTool from "@/components/legal/tools/Deadlines";
import CitationsTool from "@/components/legal/tools/Citations";
import AskMatter from "@/components/legal/tools/AskMatter";

interface WsField { id: string; label: string; labelId: string; type: "text" | "textarea" | "select"; options?: [string, string, string][]; placeholder?: string }
interface Ws { id: string; group: string; icon: string; core: boolean; name: string; nameId: string; desc: string; descId: string; docs: string; fields: WsField[]; starters: [string, string][] }
interface Catalog {
  access: boolean; unlocked: string[]; groups: { id: string; name: string; nameId: string }[]; workspaces: Ws[];
  areas: { id: string; name: string; nameId: string; group: string }[]; countries: Country[]; subdivisions: Record<string, Subdivision[]>;
  citationStyles: { id: string; name: string }[];
}
interface Msg { role: "user" | "assistant"; content: string }
interface MatterEntry { id: string; title: string; client: string; country: string; status: string; updatedAt: string; docs: number; runs: number }
interface Matter { id: string; title: string; client: string; opponent: string; reference: string; jurisdiction: JurValue; area: string; status: string; notes: string; docs: { id: string; name: string; pages?: number; chars: number }[]; runs: { id: string; workspace: string; title: string; provider: string; model: string; research: boolean; createdAt: string }[]; deadlines?: Deadline[]; citeChecks?: CiteChecks }
const TOOLS = ["ai", "redline", "playbook", "clauses", "deadlines", "citations", "ask"] as const;
type Tool = (typeof TOOLS)[number];
const TOOL_ICON: Record<Tool, string> = { ai: "⚡", redline: "🆚", playbook: "📋", clauses: "📚", deadlines: "🗓️", citations: "✅", ask: "💬" };
const NO_DEADLINES: Deadline[] = [];
const NO_CHECKS: CiteChecks = {};

const LANGS = ["auto", "English", "Bahasa Indonesia", "Bahasa Melayu", "中文", "日本語", "한국어", "Español", "Português", "Français", "Deutsch", "Italiano", "Nederlands", "العربية", "Türkçe", "Русский", "हिन्दी", "ไทย", "Tiếng Việt", "Filipino"];
const today = () => new Date().toISOString().slice(0, 10);
const PREFS = "axto_legal_prefs_v1";

function loadPrefs(): any { try { return JSON.parse(localStorage.getItem(PREFS) || "{}"); } catch { return {}; } }
function savePrefs(p: any) { try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch {} }

function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
const fileSafe = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "legal-ai";

export default function LegalApp() {
  const { lang, t: tg } = useI18n();
  const { me } = useMe();
  const t = pick(L, lang);
  const lt = pick(LT, lang);
  const [tool, setTool] = useState<Tool>("ai");
  const [library, setLibrary] = useState<LegalLibrary>(EMPTY_LIBRARY);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [catErr, setCatErr] = useState("");
  const [wsId, setWsId] = useState("case-builder");
  const [wsQuery, setWsQuery] = useState("");
  const [jur, setJur] = useState<JurValue>({ country: "ID" });
  const [jurLocked, setJurLocked] = useState(false);
  const [area, setArea] = useState("general");
  const [adv, setAdv] = useState({ audience: "lawyer", depth: "standard", lang: "auto", asOf: today(), factsDate: "", citation: "auto" });
  const [showAdv, setShowAdv] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [ai, setAi] = useState<AiChoice>({ provider: "", model: "", research: true });
  const [docs, setDocs] = useState<RunDoc[]>([]);
  const [request, setRequest] = useState("");
  const [thread, setThread] = useState<Msg[]>([]);
  const [live, setLive] = useState("");
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<{ msg: string; needKey?: boolean; upgrade?: boolean } | null>(null);
  const [meta, setMeta] = useState<{ provider: string; model: string; research: boolean; title: string } | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [lockedOpen, setLockedOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [copied, setCopied] = useState(-1);
  const [savedRun, setSavedRun] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // matters
  const [matters, setMatters] = useState<MatterEntry[]>([]);
  const [matter, setMatter] = useState<Matter | null>(null);
  const [newMatter, setNewMatter] = useState<{ title: string; client: string; opponent: string; reference: string } | null>(null);
  const [mBusy, setMBusy] = useState(false);

  // ── load catalogue + preferences ──
  useEffect(() => {
    (async () => {
      const r = await api<Catalog>("/api/legal/catalog");
      if (!r.ok) { setCatErr(r.error); return; }
      setCat(r.data);
      const p = loadPrefs();
      if (p.wsId && r.data.workspaces.some((w) => w.id === p.wsId)) setWsId(p.wsId);
      if (p.jur?.country && r.data.countries.some((c) => c.code === p.jur.country)) setJur(p.jur);
      if (typeof p.jurLocked === "boolean") setJurLocked(p.jurLocked);
      if (p.area) setArea(p.area);
      if (p.adv) setAdv((a) => ({ ...a, ...p.adv, asOf: today() }));
      if (p.ai?.provider) setAi(p.ai);
      const deep = new URLSearchParams(window.location.search).get("tool");
      if (deep && (TOOLS as readonly string[]).includes(deep)) setTool(deep as Tool);
      else if (p.tool && (TOOLS as readonly string[]).includes(p.tool)) setTool(p.tool);
      if (r.data.access) {
        const m = await api<{ matters: MatterEntry[] }>("/api/legal/matters");
        if (m.ok) setMatters(m.data.matters);
        const lib = await api<{ library: LegalLibrary }>("/api/legal/library");
        if (lib.ok) setLibrary(lib.data.library);
        // Deep link from My files: /app/legal?open=<matter id>
        const oid = new URLSearchParams(window.location.search).get("open");
        if (oid) openMatter(oid);
      }
    })();
  }, []);
  useEffect(() => { if (cat) savePrefs({ wsId, jur, jurLocked, area, adv: { ...adv, asOf: undefined }, ai, tool }); }, [cat, wsId, jur, jurLocked, area, adv, ai, tool]);

  const ws = cat?.workspaces.find((w) => w.id === wsId);
  const unlocked = useCallback((id: string) => !!cat?.unlocked.includes(id), [cat]);
  const included = docs.filter((d) => d.include && d.status === "ready");
  const reqTokens = estimateTokens(included.reduce((n, d) => n + d.text.length, 0) + request.length + thread.reduce((n, m) => n + m.content.length, 0));

  const wsGroups = useMemo(() => {
    if (!cat) return [];
    const q = wsQuery.trim().toLowerCase();
    return cat.groups.map((g) => ({
      ...g,
      items: cat.workspaces.filter((w) => w.group === g.id && (!q || `${w.name} ${w.nameId} ${w.desc} ${w.descId}`.toLowerCase().includes(q))),
    })).filter((g) => g.items.length);
  }, [cat, wsQuery]);

  function pickWorkspace(id: string) {
    if (!unlocked(id)) { setLockedOpen(true); return; }
    setWsId(id);
    setFields({});
    setErr(null);
  }

  // ── run ──
  async function run(messages: Msg[]) {
    if (!cat || !ws) return;
    if (ws.docs === "required" && !included.length) { setErr({ msg: t.needDocs }); return; }
    if (reqTokens > MAX_RUN_TOKENS) { setErr({ msg: t.tooBig }); return; }
    const options: Record<string, string> = {
      ws: ws.id, jurisdiction: JSON.stringify(jur), area, audience: adv.audience, depth: adv.depth, lang: adv.lang,
      asOf: adv.asOf, factsDate: adv.factsDate, citation: adv.citation, research: ai.research ? "1" : "0",
    };
    for (const [k, v] of Object.entries(fields)) if (v) options[`f_${k}`] = v;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRunning(true); setLive(""); setErr(null); setSavedRun(false);
    setThread(messages);
    let acc = "";
    try {
      const res = await fetch("/api/byox/run", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", signal: ctrl.signal,
        body: JSON.stringify({ app: "legal", task: ws.id, messages, provider: ai.provider, model: ai.model, options, documents: included.map((d) => ({ name: d.name, text: d.text, pages: d.pages })) }),
      });
      if (!res.ok || !res.body) {
        const j: any = await res.json().catch(() => ({}));
        setErr({ msg: j.error || `Request failed (${res.status})`, needKey: j.needKey, upgrade: j.upgrade });
        setThread(messages.slice(0, -1));
        if (messages.length === 1) setRequest(messages[0].content);
        setRunning(false);
        return;
      }
      setMeta({
        provider: res.headers.get("X-AI-Provider") || "", model: decodeURIComponent(res.headers.get("X-AI-Model") || ""),
        research: res.headers.get("X-AI-Research") === "1", title: decodeURIComponent(res.headers.get("X-Task-Title") || ws.name),
      });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let last = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        if (Date.now() - last > 60) { setLive(acc); last = Date.now(); }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") acc += `\n\n_${tg("legal.stopped")}_`;
      else acc += `\n\n⚠️ ${String(e?.message || e)}`;
    }
    setThread([...messages, { role: "assistant", content: acc }]);
    setLive("");
    setRunning(false);
    abortRef.current = null;
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  }

  function start() {
    const text = request.trim() || ws?.starters[0]?.[lang === "id" ? 1 : 0] || "";
    if (!text) return;
    setRequest("");
    run([{ role: "user", content: text }]);
  }
  function sendFollowUp() {
    const text = followUp.trim();
    if (!text || running) return;
    setFollowUp("");
    run([...thread, { role: "user", content: text }]);
  }

  // ── matters ──
  const reloadMatters = async () => { const m = await api<{ matters: MatterEntry[] }>("/api/legal/matters"); if (m.ok) setMatters(m.data.matters); };
  async function openMatter(id: string) {
    if (!id) { setMatter(null); setDocs((d) => d.filter((x) => !x.savedId)); return; }
    setMBusy(true);
    const r = await api<{ matter: Matter }>(`/api/legal/matters/${id}`);
    if (r.ok) {
      const m = r.data.matter;
      setMatter(m);
      if (m.jurisdiction?.country) setJur(m.jurisdiction);
      if (m.area) setArea(m.area);
      const loaded = await Promise.all(m.docs.map(async (d) => {
        const x = await api<{ document: { name: string; pages?: number; text: string } }>(`/api/legal/matters/${m.id}/documents/${d.id}`);
        return { key: `saved-${d.id}`, name: d.name, text: x.data?.document?.text || "", pages: d.pages, kind: "Saved", status: x.ok ? "ready" : "error", error: x.error, savedId: d.id, include: true } as RunDoc;
      }));
      setDocs((cur) => [...cur.filter((x) => !x.savedId), ...loaded]);
    }
    setMBusy(false);
  }
  async function createMatter() {
    if (!newMatter) return;
    setMBusy(true);
    const r = await api<{ matter: Matter }>("/api/legal/matters", { body: { ...newMatter, jurisdiction: jur, area } });
    setMBusy(false);
    if (!r.ok) { setErr({ msg: r.error }); return; }
    setNewMatter(null);
    await reloadMatters();
    setMatter(r.data.matter);
  }
  async function deleteMatter() {
    if (!matter || !confirm(t.confirmDel)) return;
    await api(`/api/legal/matters/${matter.id}`, { method: "DELETE" });
    setMatter(null);
    setDocs((d) => d.filter((x) => !x.savedId));
    await reloadMatters();
  }
  async function saveDoc(d: RunDoc) {
    if (!matter) return;
    const r = await api<{ document: { id: string } }>(`/api/legal/matters/${matter.id}/documents`, { body: { name: d.name, text: d.text, pages: d.pages } });
    if (r.ok) setDocs((all) => all.map((x) => (x.key === d.key ? { ...x, savedId: r.data.document.id } : x)));
    else setErr({ msg: r.error });
  }
  async function saveRun() {
    if (!matter || !ws || !thread.length) return;
    const r = await api(`/api/legal/matters/${matter.id}/runs`, {
      body: { workspace: ws.id, title: meta?.title || ws.name, messages: thread.map((m) => ({ ...m, content: m.role === "assistant" ? stripStatus(m.content) : m.content })), options: { jurisdiction: jur, area, ...adv }, provider: meta?.provider, model: meta?.model, research: meta?.research },
    });
    if (r.ok) { setSavedRun(true); openMatterRuns(); } else setErr({ msg: r.error });
  }
  async function openMatterRuns() {
    if (!matter) return;
    const r = await api<{ matter: Matter }>(`/api/legal/matters/${matter.id}`);
    if (r.ok) setMatter(r.data.matter);
    reloadMatters();
  }
  async function openRun(id: string) {
    if (!matter) return;
    const r = await api<{ run: { workspace: string; messages: Msg[] } }>(`/api/legal/matters/${matter.id}/runs/${id}`);
    if (r.ok) { if (unlocked(r.data.run.workspace)) setWsId(r.data.run.workspace); setThread(r.data.run.messages); setSavedRun(true); setMeta(null); }
  }
  async function deleteRun(id: string) {
    if (!matter) return;
    await api(`/api/legal/matters/${matter.id}/runs/${id}`, { method: "DELETE" });
    openMatterRuns();
  }

  // ── v4 tools ──
  function switchTool(next: Tool) {
    setTool(next);
    const u = new URL(window.location.href);
    if (next === "ai") u.searchParams.delete("tool"); else u.searchParams.set("tool", next);
    window.history.replaceState(null, "", u.toString());
  }
  /** A tool prepares an AI workspace (workspace, inputs, documents, request); the member reviews it and presses Run. */
  function handoff(h: Handoff) {
    const target = unlocked(h.ws) ? h.ws : h.fallback && unlocked(h.fallback) ? h.fallback : "";
    if (!target) { setLockedOpen(true); return; }
    setWsId(target);
    setFields(target === h.ws ? h.fields || {} : {});
    setErr(null); setThread([]); setMeta(null); setSavedRun(false);
    if (h.docs?.length || h.onlyDocs) {
      const keep = new Set((h.docs || []).map((d) => d.key).filter(Boolean) as string[]);
      setDocs((cur) => {
        const base = cur.filter((d) => !d.key.startsWith("tool-")).map((d) => (h.onlyDocs ? { ...d, include: keep.has(d.key) } : keep.has(d.key) ? { ...d, include: true } : d));
        const extra = (h.docs || []).filter((d) => !d.key || !cur.some((c) => c.key === d.key))
          .map((d, i) => ({ key: `tool-${Date.now()}-${i}`, name: d.name, text: d.text, kind: "Tool", status: "ready", include: true } as RunDoc));
        return [...base, ...extra];
      });
    }
    setRequest(h.request);
    switchTool("ai");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30);
  }
  async function saveLibrary(next: LegalLibrary): Promise<string | null> {
    const r = await api<{ library: LegalLibrary }>("/api/legal/library", { method: "PUT", body: next });
    if (!r.ok) return r.error;
    setLibrary(r.data.library);
    return null;
  }
  async function patchMatter(body: Record<string, unknown>): Promise<string | null> {
    if (!matter) return "no matter";
    const r = await api<{ matter: Matter }>(`/api/legal/matters/${matter.id}`, { method: "PATCH", body });
    if (!r.ok) return r.error;
    setMatter(r.data.matter);
    return null;
  }
  const toolDocs: ToolDoc[] = useMemo(() => docs.filter((d) => d.status === "ready" && d.text.trim() && !d.key.startsWith("tool-")).map((d) => ({ key: d.key, name: d.name, text: d.text })), [docs]);

  // ── export ──
  const lastAnswer = [...thread].reverse().find((m) => m.role === "assistant")?.content || "";
  const docTitle = matter?.title || meta?.title || ws?.name || "Legal AI";
  const subtitle = () => {
    const c = cat?.countries.find((x) => x.code === jur.country);
    return [ws?.name, c ? countryName(c, lang) : "", jur.city, new Date().toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long", year: "numeric" })].filter(Boolean).join(" · ");
  };
  function exportWord(text: string) { download(`${fileSafe(docTitle)}.docx`, markdownToDocx(text, { title: docTitle, subtitle: subtitle(), footer: t.disclaimer })); }
  function exportMd(text: string) { download(`${fileSafe(docTitle)}.md`, new Blob([`# ${docTitle}\n_${subtitle()}_\n\n${stripStatus(text)}\n`], { type: "text/markdown" })); }
  function exportPdf(index: number) {
    const el = document.getElementById(`answer-${index}`);
    if (!el) return;
    el.classList.add("print-target");
    document.body.classList.add("printing");
    setTimeout(() => { window.print(); el.classList.remove("print-target"); document.body.classList.remove("printing"); }, 50);
  }

  // ── render ──
  if (catErr) return <Alert tone="error">{catErr}</Alert>;
  if (!cat || !me) return <LoadingBlock />;

  if (!cat.access) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="surface-ink relative overflow-hidden rounded-2xl p-8 sm:p-10">
          <div className="glow pointer-events-none absolute inset-0" />
          <div className="relative">
            <div className="text-4xl">⚖️</div>
            <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">{t.noPlan}</h1>
            <p className="mt-2 max-w-xl text-slate-300">{t.noPlanBody}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/app/billing?plan=pro" className="btn-primary btn-lg">{t.upgrade} →</Link>
              <Link href="/apps/legal" className="btn-secondary btn-lg">Legal AI</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const wsName = (w: Ws) => (lang === "id" ? w.nameId : w.name);

  return (
    <div className="legal-app">
      {/* Header */}
      <div className="no-print mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow mb-1">⚖️ {t.sub}</div>
          <h1 className="text-2xl font-bold sm:text-[28px]">{t.title}</h1>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[220px]">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.matter}</span>
            <select className="select py-2" value={matter?.id || ""} onChange={(e) => openMatter(e.target.value)} disabled={mBusy}>
              <option value="">{t.noMatter}</option>
              {matters.map((m) => <option key={m.id} value={m.id}>{flag(m.country)} {m.title}{m.client ? ` — ${m.client}` : ""}</option>)}
            </select>
          </label>
          <button className="btn-secondary h-[42px]" onClick={() => setNewMatter({ title: "", client: "", opponent: "", reference: "" })}>＋ {t.newMatter}</button>
          <button className="btn-ghost h-[42px]" onClick={() => setHelp((h) => !h)}>📘 {t.how}</button>
        </div>
      </div>

      {help ? (
        <div className="no-print mb-5 card-pad">
          <h2 className="mb-3 font-semibold">{t.how}</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">{t.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </div>
      ) : null}

      {/* v4 tools */}
      <nav className="no-print -mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={lt.tabs.ai}>
        <div className="inline-flex min-w-full gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:min-w-0" role="tablist">
          {TOOLS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tool === k} onClick={() => switchTool(k)} data-testid={`legal-tab-${k}`}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${tool === k ? "bg-ink-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              <span aria-hidden="true">{TOOL_ICON[k]}</span>{lt.tabs[k]}
            </button>
          ))}
        </div>
      </nav>

      {tool === "redline" ? <Redline t={lt} docs={toolDocs} lastAnswer={lastAnswer} onHandoff={handoff} /> : null}
      {tool === "playbook" ? <PlaybookTool t={lt} docs={toolDocs} lastAnswer={lastAnswer} library={library} saveLibrary={saveLibrary} onHandoff={handoff} /> : null}
      {tool === "clauses" ? <ClausesTool t={lt} library={library} saveLibrary={saveLibrary} onHandoff={handoff} /> : null}
      {tool === "deadlines" ? (
        <DeadlinesTool t={lt} lang={lang} matterTitle={matter?.title} saved={matter?.deadlines || NO_DEADLINES} canSave={!!matter}
          onSave={(list) => patchMatter({ deadlines: list })} onHandoff={handoff} />
      ) : null}
      {tool === "citations" ? (
        <CitationsTool t={lt} docs={toolDocs} lastAnswer={lastAnswer} saved={matter?.citeChecks || NO_CHECKS} canSave={!!matter}
          onSave={(checks) => patchMatter({ citeChecks: checks })} onHandoff={handoff} />
      ) : null}
      {tool === "ask" ? <AskMatter t={lt} docs={toolDocs} matterTitle={matter?.title} onHandoff={handoff} /> : null}

      <div className={`grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] ${tool === "ai" ? "" : "hidden"}`}>
        {/* Workspace list */}
        <aside className="no-print hidden lg:block">
          <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-3">
            <input className="input mb-3" placeholder={t.search} value={wsQuery} onChange={(e) => setWsQuery(e.target.value)} />
            {wsGroups.map((g) => (
              <div key={g.id} className="mb-3">
                <div className="px-1.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{lang === "id" ? g.nameId : g.name}</div>
                {g.items.map((w) => (
                  <button key={w.id} onClick={() => pickWorkspace(w.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${w.id === wsId ? "bg-brand-50 font-semibold text-brand-800" : "text-slate-700 hover:bg-slate-50"}`}>
                    <span className="w-5 text-center" aria-hidden="true">{w.icon}</span>
                    <span className="flex-1 truncate">{wsName(w)}</span>
                    {!unlocked(w.id) ? <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">🔒 {t.locked}</span> : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          {/* Workspace + AI */}
          {ws ? (
            <section className="no-print card-pad">
              <label className="mb-3 block lg:hidden">
                <span className="label">{t.workspaces}</span>
                <select className="select" value={wsId} onChange={(e) => pickWorkspace(e.target.value)}>
                  {wsGroups.map((g) => (
                    <optgroup key={g.id} label={lang === "id" ? g.nameId : g.name}>
                      {g.items.map((w) => <option key={w.id} value={w.id}>{w.icon} {wsName(w)}{unlocked(w.id) ? "" : " 🔒"}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{ws.icon} {wsName(ws)}</h2>
                  <p className="mt-1 max-w-3xl text-sm text-slate-600">{lang === "id" ? ws.descId : ws.desc}</p>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-4"><ModelPicker lang={lang} value={ai} onChange={setAi} /></div>
            </section>
          ) : null}

          {/* Jurisdiction & context */}
          <section className="no-print card-pad">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">🌍 {t.context}</h2>
              <button type="button" onClick={() => setJurLocked((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${jurLocked ? "bg-brand-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                title={jurLocked ? t.jurUnlockHint : t.jurLockHint}>
                {jurLocked ? `🔒 ${t.jurLocked}` : `🔓 ${t.jurLock}`}
              </button>
            </div>
            <JurisdictionPicker countries={cat.countries} subdivisions={cat.subdivisions} value={jur} onChange={setJur} lang={lang} locked={jurLocked} />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="sm:col-span-2">
                <span className="label">{t.area}</span>
                <select className="select" value={area} onChange={(e) => setArea(e.target.value)}>
                  {Array.from(new Set(cat.areas.map((a) => a.group))).map((g) => (
                    <optgroup key={g} label={g}>{cat.areas.filter((a) => a.group === g).map((a) => <option key={a.id} value={a.id}>{lang === "id" ? a.nameId : a.name}</option>)}</optgroup>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">{t.factsDate}</span>
                <input className="input" value={adv.factsDate} maxLength={120} onChange={(e) => setAdv({ ...adv, factsDate: e.target.value })} placeholder={tg("legal.factsPh")} />
              </label>
            </div>
            <button type="button" className="mt-3 text-sm font-semibold text-brand-700" onClick={() => setShowAdv((s) => !s)}>{showAdv ? "▾" : "▸"} {t.advanced}</button>
            {showAdv ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label><span className="label">{t.audience}</span>
                  <select className="select" value={adv.audience} onChange={(e) => setAdv({ ...adv, audience: e.target.value })}>
                    {Object.entries(t.aud).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></label>
                <label><span className="label">{t.depth}</span>
                  <select className="select" value={adv.depth} onChange={(e) => setAdv({ ...adv, depth: e.target.value })}>
                    {Object.entries(t.dep).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></label>
                <label><span className="label">{t.outLang}</span>
                  <select className="select" value={adv.lang} onChange={(e) => setAdv({ ...adv, lang: e.target.value })}>
                    {LANGS.map((l) => <option key={l} value={l}>{l === "auto" ? t.auto : l}</option>)}
                  </select></label>
                <label><span className="label">{t.asOf}</span>
                  <input type="date" className="input" value={adv.asOf} onChange={(e) => setAdv({ ...adv, asOf: e.target.value || today() })} /></label>
                <label><span className="label">{t.citation}</span>
                  <select className="select" value={adv.citation} onChange={(e) => setAdv({ ...adv, citation: e.target.value })}>
                    {cat.citationStyles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></label>
              </div>
            ) : null}
          </section>

          {/* Workspace inputs */}
          {ws && ws.fields.length ? (
            <section className="no-print card-pad">
              <h2 className="mb-3 text-base font-semibold">🧾 {t.inputs}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {ws.fields.map((f) => (
                  <label key={f.id} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <span className="label">{lang === "id" ? f.labelId : f.label}</span>
                    {f.type === "select" ? (
                      <select className="select" value={fields[f.id] || ""} onChange={(e) => setFields({ ...fields, [f.id]: e.target.value })}>
                        <option value="">—</option>
                        {f.options!.map(([v, en, id]) => <option key={v} value={v}>{lang === "id" ? id : en}</option>)}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea className="textarea min-h-[90px]" value={fields[f.id] || ""} placeholder={f.placeholder} maxLength={4000} onChange={(e) => setFields({ ...fields, [f.id]: e.target.value })} />
                    ) : (
                      <input className="input" value={fields[f.id] || ""} placeholder={f.placeholder} maxLength={400} onChange={(e) => setFields({ ...fields, [f.id]: e.target.value })} />
                    )}
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {/* Documents */}
          {ws && ws.docs !== "none" ? (
            <div className="no-print">
              <DocumentsPanel lang={lang} docs={docs} setDocs={setDocs} required={ws.docs === "required"} canSave={!!matter} onSave={saveDoc} />
            </div>
          ) : null}

          {/* Request */}
          {!thread.length ? (
            <section className="no-print card-pad">
              <h2 className="mb-2 text-base font-semibold">✍️ {t.request}</h2>
              <textarea className="textarea min-h-[130px]" value={request} placeholder={t.requestPh} onChange={(e) => setRequest(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") start(); }} />
              {ws?.starters.length ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500">{t.starters}</span>
                  {ws.starters.map((s) => (
                    <button key={s[0]} type="button" className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:border-brand-300 hover:bg-brand-50"
                      onClick={() => setRequest(lang === "id" ? s[1] : s[0])}>{lang === "id" ? s[1] : s[0]}</button>
                  ))}
                </div>
              ) : null}
              {err ? (
                <div className="mt-3"><Alert tone="error">
                  {err.msg}
                  {err.needKey ? <Link href="/app/settings?tab=ai" className="ml-2 font-semibold underline">{t.errKey}</Link> : null}
                  {err.upgrade ? <Link href="/app/billing?plan=pro" className="ml-2 font-semibold underline">{t.upgrade}</Link> : null}
                </Alert></div>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">{t.tokens}: ~{reqTokens.toLocaleString()} tokens</span>
                <button className="btn-primary btn-lg" onClick={start} disabled={running || !ai.provider}>{running ? <><Spinner /> {t.running}</> : <>⚡ {t.run}</>}</button>
              </div>
            </section>
          ) : null}

          {/* Conversation */}
          {thread.length ? (
            <section className="space-y-4">
              {thread.map((m, i) => m.role === "user" ? (
                <div key={i} className="no-print ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink-900 px-4 py-3 text-sm text-white">{m.content}</div>
              ) : (
                <article key={i} id={`answer-${i}`} className="card-pad">
                  <div className="print-only mb-4 hidden border-b border-slate-200 pb-3">
                    <div className="text-xl font-bold">{docTitle}</div><div className="text-xs text-slate-500">{subtitle()}</div>
                  </div>
                  <Markdown text={m.content} />
                  <div className="no-print mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <button className="btn-secondary btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(stripStatus(m.content)); setCopied(i); setTimeout(() => setCopied(-1), 1500); } catch {} }}>📋 {copied === i ? t.copied : t.copy}</button>
                    <button className="btn-secondary btn-sm" onClick={() => exportWord(m.content)}>📝 {t.word}</button>
                    <button className="btn-secondary btn-sm" onClick={() => exportPdf(i)}>🖨️ {t.pdf}</button>
                    <button className="btn-secondary btn-sm" onClick={() => exportMd(m.content)}>⬇️ {t.md}</button>
                    {i === thread.length - 1 && matter ? (
                      <button className="btn-primary btn-sm" onClick={saveRun} disabled={savedRun}>💾 {savedRun ? t.savedRun : t.saveRun}</button>
                    ) : null}
                    {i === thread.length - 1 && meta ? (
                      <span className="ml-auto text-xs text-slate-500">{t.answeredBy} {meta.provider} · {meta.model}{meta.research ? ` · 🌐 ${t.withResearch}` : ""}</span>
                    ) : null}
                  </div>
                </article>
              ))}
              {running ? (
                <article className="card-pad">
                  {live ? <Markdown text={live} /> : <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> {t.running}</div>}
                  <div className="mt-4 border-t border-slate-100 pt-3"><button className="btn-secondary btn-sm" onClick={() => abortRef.current?.abort()}>■ {t.stop}</button></div>
                </article>
              ) : null}
              {err && thread.length ? <Alert tone="error">{err.msg}</Alert> : null}
              {!running ? (
                <div className="no-print card-pad">
                  <textarea className="textarea min-h-[80px]" value={followUp} placeholder={t.followUp} onChange={(e) => setFollowUp(e.target.value)}
                    onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") sendFollowUp(); }} />
                  <div className="mt-3 flex flex-wrap justify-between gap-2">
                    <button className="btn-ghost btn-sm" onClick={() => { setThread([]); setMeta(null); setSavedRun(false); setErr(null); }}>↺ {t.newRun}</button>
                    <button className="btn-primary" onClick={sendFollowUp} disabled={!followUp.trim()}>{t.send} →</button>
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </section>
          ) : null}

          {/* Matter panel */}
          {matter ? (
            <section className="no-print card-pad">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">📁 {matter.title}</h2>
                  <p className="text-xs text-slate-500">{[matter.client, matter.opponent && `v. ${matter.opponent}`, matter.reference].filter(Boolean).join(" · ")}</p>
                </div>
                <button className="btn-ghost btn-sm text-rose-600" onClick={deleteMatter}>{t.delMatter}</button>
              </div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">{t.results}</h3>
              {matter.runs.length ? (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {matter.runs.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <button className="min-w-0 flex-1 truncate text-left font-medium text-brand-800 hover:underline" onClick={() => openRun(r.id)}>{r.title}</button>
                      <span className="hidden text-xs text-slate-500 sm:inline">{new Date(r.createdAt).toLocaleString(LOCALE[lang])}</span>
                      <button className="btn-ghost btn-sm text-rose-600" onClick={() => deleteRun(r.id)} aria-label={t.del}>✕</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">{t.noResults}</p>}
            </section>
          ) : null}
        </div>
      </div>

      <Modal open={!!newMatter} onClose={() => setNewMatter(null)} title={t.newMatter}
        footer={<><button className="btn-ghost" onClick={() => setNewMatter(null)}>{t.cancel}</button><button className="btn-primary" onClick={createMatter} disabled={mBusy || !newMatter?.title.trim()}>{mBusy ? <Spinner /> : null} {t.create}</button></>}>
        {newMatter ? (
          <div className="space-y-3">
            <label className="block"><span className="label">{t.matterTitle}</span><input className="input" autoFocus value={newMatter.title} maxLength={160} onChange={(e) => setNewMatter({ ...newMatter, title: e.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="label">{t.client}</span><input className="input" value={newMatter.client} maxLength={160} onChange={(e) => setNewMatter({ ...newMatter, client: e.target.value })} /></label>
              <label className="block"><span className="label">{t.opponent}</span><input className="input" value={newMatter.opponent} maxLength={160} onChange={(e) => setNewMatter({ ...newMatter, opponent: e.target.value })} /></label>
            </div>
            <label className="block"><span className="label">{t.reference}</span><input className="input" value={newMatter.reference} maxLength={80} onChange={(e) => setNewMatter({ ...newMatter, reference: e.target.value })} /></label>
            <p className="text-xs text-slate-500">🔒 {tg("legal.encrypted")}</p>
          </div>
        ) : null}
      </Modal>

      <Modal open={lockedOpen} onClose={() => setLockedOpen(false)} title={`🔓 ${t.lockedTitle}`}
        footer={<><button className="btn-ghost" onClick={() => setLockedOpen(false)}>{t.cancel}</button><Link href="/app/billing?plan=pro" className="btn-primary">{t.upgrade} →</Link></>}>
        <p className="text-sm text-slate-700">{t.lockedBody}</p>
      </Modal>
    </div>
  );
}
