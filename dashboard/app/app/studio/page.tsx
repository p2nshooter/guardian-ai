/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * AI STUDIO v4 — one private workspace for every leading model, on the member's
 * own keys (BYOX):
 *   chat       streaming Markdown · highlighted code with copy/download ·
 *              html / svg / mermaid artifacts in a sandboxed preview ·
 *              regenerate with answer versions · edit & resend · read aloud
 *   input      files (PDF, DOCX, code, text — extracted on the device) · images
 *              (vision) · paste & drag-drop · voice dictation · "/" prompts ·
 *              token estimate
 *   compare    one message to up to 3 models side by side; keep the best
 *   control    assistants (saved personas) · per-chat instructions ·
 *              creativity · answer length
 *   organise   search · pinned · folders · rename · duplicate · delete
 *   export     Markdown · Word · JSON · print / PDF
 * Everything is saved to the member's encrypted history.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n, pick } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, Modal, Spinner } from "@/components/ui";
import ModelPicker, { type AiChoice } from "@/components/ai/ModelPicker";
import Markdown from "@/components/Markdown";
import CodeBlock, { ArtifactModal } from "@/components/studio/CodeBlock";
import Composer from "@/components/studio/Composer";
import MessageView from "@/components/studio/Message";
import Sidebar, { type ChatEntry } from "@/components/studio/Sidebar";
import AssistantsModal from "@/components/studio/Assistants";
import PromptPicker from "@/components/studio/PromptPicker";
import { stripStatus } from "@/lib/markdown";
import { markdownToDocx } from "@/lib/export/docx";
import {
  artifactDoc, conversationTokens, DEFAULT_SETTINGS, newMsgId, pickVersion, snippetOf, titleOf, toApi, toJson, toMarkdown, upgrade, withVersion,
  type Artifact, type Assistant, type ChatSettings, type FileText, type Img, type Msg, type Version,
} from "@/lib/studio/model";
import { L } from "@/lib/i18n-pages/studio";
import { aiFetch } from "@/lib/ai/client-run";

const ASSISTANTS_ID = "assistants-v1";
type Err = { msg: string; needKey?: boolean; upgrade?: boolean } | null;

function download(name: string, data: Blob | string, mime = "text/plain") {
  const blob = typeof data === "string" ? new Blob([data], { type: mime }) : data;
  const u = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}

export default function StudioApp() {
  const { lang } = useI18n();
  const { me } = useMe();
  const t = pick(L, lang);
  const access = !!me && me.limits.apps.includes("studio");

  const [items, setItems] = useState<ChatEntry[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [folder, setFolder] = useState("");
  const [pinned, setPinned] = useState(false);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileText[]>([]);
  const [images, setImages] = useState<Img[]>([]);
  const [ai, setAi] = useState<AiChoice>({ provider: "", model: "", research: false });
  const [compare, setCompare] = useState<{ on: boolean; choices: AiChoice[] }>({ on: false, choices: [] });
  const [comparing, setComparing] = useState<string | null>(null);   // message id shown as columns
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState<string[]>([]);
  const [err, setErr] = useState<Err>(null);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [assistantId, setAssistantId] = useState<string | undefined>(undefined);
  const [panel, setPanel] = useState<"" | "assistants" | "prompts" | "settings" | "export">("");
  const [artifact, setArtifact] = useState<{ doc: string; title: string } | null>(null);
  const [drawer, setDrawer] = useState(false);
  const aborts = useRef<AbortController[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const assistant = assistants.find((a) => a.id === assistantId);

  const reload = useCallback(async (): Promise<ChatEntry[]> => {
    const r = await api<{ items: ChatEntry[] }>("/api/history/studio");
    if (!r.ok) return [];
    setItems(r.data.items.filter((i) => i.id !== ASSISTANTS_ID && i.meta?.kind !== "assistants"));
    return r.data.items;
  }, []);
  useEffect(() => {
    if (!access) return;
    // Saved assistants are read only when the member has saved some (no request that can only answer 404).
    reload().then((all) => {
      if (all.some((i) => i.id === ASSISTANTS_ID)) api<{ item: { body: Assistant[] } }>(`/api/history/studio/${ASSISTANTS_ID}`).then((r) => { if (r.ok && Array.isArray(r.data.item?.body)) setAssistants(r.data.item.body); });
    });
    const oid = new URLSearchParams(window.location.search).get("open");
    if (oid) openChat(oid);
    try { const pre = sessionStorage.getItem("axto_studio_prefill"); if (pre) { setInput(pre); sessionStorage.removeItem("axto_studio_prefill"); } } catch {}
  }, [access]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 30); }, [messages.length, live]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape" && running) stop();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") { e.preventDefault(); newChat(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persistence ─────────────────────────────────────────────────────────────
  async function persist(next: Msg[], extra: { folder?: string; pinned?: boolean; title?: string } = {}) {
    const f = extra.folder ?? folder, p = extra.pinned ?? pinned;
    const ttl = extra.title || title || titleOf(next);
    const body = { v: 2, messages: next.map((m) => (m.role === "assistant" ? { ...m, content: stripStatus(m.content), versions: m.versions?.map((v) => ({ ...v, content: stripStatus(v.content) })) } : m)), settings: { ...settings, assistantId }, folder: f, pinned: p };
    const meta = { snippet: snippetOf(next), folder: f, pinned: p ? "1" : "", model: next.filter((m) => m.role === "assistant").at(-1)?.model || "" };
    let r = await api<{ item: ChatEntry }>("/api/history/studio", { body: { id: id || undefined, title: ttl, body, meta } });
    if (!r.ok && /large|storage|size/i.test(r.error || "")) {   // too big with images: keep the text, drop the pixels
      const slim = { ...body, messages: body.messages.map((m) => (m.images ? { ...m, images: m.images.map((i) => ({ ...i, data: "" })) } : m)) };
      r = await api<{ item: ChatEntry }>("/api/history/studio", { body: { id: id || undefined, title: ttl, body: slim, meta } });
    }
    if (r.ok) { if (!id) setId(r.data.item.id); if (!title) setTitle(ttl); reload(); }
  }
  async function openChat(cid: string) {
    const r = await api<{ item: { id: string; title: string; body: any } }>(`/api/history/studio/${cid}`);
    if (!r.ok) return;
    const c = upgrade(r.data.item.body);
    stop();
    setId(cid); setTitle(r.data.item.title); setMessages(c.messages); setSettings(c.settings); setFolder(c.folder || ""); setPinned(!!c.pinned);
    setAssistantId(c.settings.assistantId); setErr(null); setComparing(null); setDrawer(false); setFiles([]); setImages([]);
  }
  function newChat() {
    stop();
    setId(null); setTitle(""); setMessages([]); setSettings({ ...DEFAULT_SETTINGS }); setFolder(""); setPinned(false);
    setInput(""); setFiles([]); setImages([]); setErr(null); setComparing(null); setDrawer(false);
  }
  async function saveAssistants(list: Assistant[]) {
    setAssistants(list);
    await api("/api/history/studio", { body: { id: ASSISTANTS_ID, title: "Assistants", body: list, meta: { kind: "assistants" } } });
  }
  async function patchChat(cid: string, change: { folder?: string; pinned?: boolean }) {
    if (cid === id) { if (change.folder !== undefined) setFolder(change.folder); if (change.pinned !== undefined) setPinned(change.pinned); await persist(messages, change); return; }
    const r = await api<{ item: { title: string; body: any } }>(`/api/history/studio/${cid}`);
    if (!r.ok) return;
    const c = upgrade(r.data.item.body);
    const f = change.folder ?? c.folder ?? "", p = change.pinned ?? !!c.pinned;
    await api("/api/history/studio", { body: { id: cid, title: r.data.item.title, body: { ...c, folder: f, pinned: p }, meta: { snippet: snippetOf(c.messages), folder: f, pinned: p ? "1" : "" } } });
    reload();
  }

  // ── Generation ──────────────────────────────────────────────────────────────
  function stop() { aborts.current.forEach((a) => a.abort()); aborts.current = []; }
  const instructions = [assistant?.instructions, settings.instructions].filter(Boolean).join("\n\n");
  const temperature = settings.temperature ?? assistant?.temperature;

  async function stream(choice: AiChoice, thread: Msg[], i: number): Promise<Version | null> {
    const ctrl = new AbortController();
    aborts.current.push(ctrl);
    let acc = "", provider = choice.provider, model = choice.model;
    try {
      const res = await aiFetch({
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", signal: ctrl.signal,
        body: JSON.stringify({ app: "studio", messages: toApi(thread), provider: choice.provider, model: choice.model, options: {
          role: instructions, ...(typeof temperature === "number" ? { temperature: String(temperature) } : {}), ...(settings.maxTokens ? { maxTokens: String(settings.maxTokens) } : {}),
        } }),
      });
      if (!res.ok || !res.body) {
        const j: any = await res.json().catch(() => ({}));
        setErr({ msg: j.error || `Request failed (${res.status})`, needKey: j.needKey, upgrade: j.upgrade });
        return null;
      }
      provider = res.headers.get("X-AI-Provider") || provider;
      model = decodeURIComponent(res.headers.get("X-AI-Model") || "") || model;
      const reader = res.body.getReader(); const dec = new TextDecoder(); let last = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        if (Date.now() - last > 45) { last = Date.now(); const s = acc; setLive((l) => { const n = [...l]; n[i] = s; return n; }); }
      }
    } catch (e: any) { if (e?.name !== "AbortError") acc += `\n\n⚠️ ${String(e?.message || e)}`; }
    return acc.trim() ? { content: acc, provider, model, at: new Date().toISOString() } : null;
  }

  async function run(thread: Msg[], regenerate?: Msg) {
    const choices = compare.on ? compare.choices.filter((c) => c.provider) : [ai];
    if (!choices.length || !choices[0].provider) return;
    setErr(null); setRunning(true); setLive(choices.map(() => ""));
    setMessages(regenerate ? [...thread, regenerate] : thread);
    const results = await Promise.all(choices.map((c, i) => stream(c, thread, i)));
    aborts.current = [];
    const got = results.filter(Boolean) as Version[];
    setRunning(false); setLive([]);
    if (!got.length) {
      // Nothing came back: keep the old answer, or put the request back in the composer.
      if (regenerate) setMessages([...thread, regenerate]);
      else {
        const u = thread[thread.length - 1];
        setInput(u.content === "(image)" ? "" : u.content); setFiles(u.files || []); setImages(u.images || []);
        setMessages(thread.slice(0, -1));
      }
      return;
    }
    let a: Msg | null = regenerate || null;
    for (const v of got) a = withVersion(a, v);
    if (got.length > 1) { a = pickVersion(a!, a!.versions!.length - got.length); setComparing(a!.id); } else setComparing(null);
    const next = [...thread, a!];
    setMessages(next);
    persist(next);
  }

  function send() {
    const text = input.trim();
    if ((!text && !images.length && !files.length) || running) return;
    const u: Msg = { id: newMsgId(), role: "user", content: text || (images.length ? "(image)" : ""), ...(files.length ? { files } : {}), ...(images.length ? { images } : {}) };
    setInput(""); setFiles([]); setImages([]);
    run([...messages, u]);
  }
  function editAt(i: number, text: string) {
    const u = { ...messages[i], content: text };
    run([...messages.slice(0, i), u]);
  }
  function regenerate() {
    const lastA = messages[messages.length - 1];
    if (!lastA || lastA.role !== "assistant") return;
    run(messages.slice(0, -1), lastA);
  }
  function chooseVersion(i: number, vi: number) {
    const next = messages.map((m, k) => (k === i ? pickVersion(m, vi) : m));
    setMessages(next); persist(next);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const tokens = useMemo(() => conversationTokens(messages, instructions), [messages, instructions]);
  const hasVisionHint = images.length > 0 && /groq|deepseek|cerebras|perplexity/.test(ai.provider);
  if (!me) return <LoadingBlock />;
  if (!access) {
    return (
      <div className="surface-ink relative overflow-hidden rounded-2xl p-8">
        <div className="glow pointer-events-none absolute inset-0" />
        <div className="relative"><div className="text-4xl">🧠</div>
          <h1 className="mt-3 text-2xl font-extrabold text-white">{t.noPlan}</h1>
          <Link href="/app/billing?plan=starter" className="btn-primary btn-lg mt-5">{t.upgrade} →</Link>
        </div>
      </div>
    );
  }

  const sidebar = (
    <Sidebar t={t} items={items} activeId={id} onNew={newChat} onOpen={openChat} onAssistants={() => setPanel("assistants")}
      onRename={async (cid, cur) => { const v = prompt(t.renamePrompt, cur); if (v == null) return; await api(`/api/history/studio/${cid}/rename`, { body: { title: v } }); if (cid === id) setTitle(v); reload(); }}
      onDuplicate={async (cid) => { await api(`/api/history/studio/${cid}/duplicate`, { body: {} }); reload(); }}
      onDelete={async (cid) => { if (!confirm(t.confirmDel)) return; await api(`/api/history/studio/${cid}`, { method: "DELETE" }); if (cid === id) newChat(); reload(); }}
      onPin={(cid, p) => patchChat(cid, { pinned: p })}
      onFolder={(cid) => { const cur = cid === id ? folder : String(items.find((i) => i.id === cid)?.meta?.folder || ""); const v = prompt(t.folderPrompt, cur); if (v == null) return; patchChat(cid, { folder: v.trim().slice(0, 40) }); }} />
  );
  const lastIdx = messages.length - 1;
  const cmpMsg = comparing ? messages.find((m) => m.id === comparing) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="no-print hidden lg:block"><div className="card sticky top-20 h-[calc(100vh-6rem)] p-3">{sidebar}</div></aside>

      <div className="flex min-h-[calc(100vh-9rem)] min-w-0 flex-col">
        <div className="no-print mb-3 flex flex-wrap items-center gap-2">
          <button className="btn-secondary btn-sm lg:hidden" onClick={() => setDrawer(true)}>☰ {t.chats}</button>
          <div className="min-w-0 flex-1"><div className="eyebrow">🧠 {t.sub}</div><h1 className="truncate text-2xl font-bold">{title || t.title}</h1></div>
          <button className={`btn-sm ${assistant ? "btn-primary" : "btn-ghost"}`} onClick={() => setPanel("assistants")}>{assistant ? `${assistant.icon} ${assistant.name}` : `🧩 ${t.assistants}`}</button>
          <button className={`btn-sm ${compare.on ? "btn-primary" : "btn-ghost"}`} title={t.compareHint} onClick={() => setCompare((c) => ({ on: !c.on, choices: c.choices.length ? c.choices : [ai, { ...ai }] }))}>⚖️ {t.compare}</button>
          <button className="btn-ghost btn-sm" onClick={() => setPanel("settings")}>⚙️ {t.settings}</button>
          {messages.length ? <button className="btn-ghost btn-sm" onClick={() => setPanel("export")}>⬇ {t.export}</button> : null}
        </div>

        <section className="no-print card-pad mb-4">
          {compare.on ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500">{t.compareOn} · {t.compareHint}</div>
              {compare.choices.map((c, i) => (
                <div key={i} className="flex items-end gap-2">
                  <span className="mb-2.5 w-5 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                  <div className="min-w-0 flex-1"><ModelPicker lang={lang} value={c} onChange={(v) => setCompare((s) => ({ ...s, choices: s.choices.map((x, k) => (k === i ? v : x)) }))} showResearch={false} /></div>
                  {compare.choices.length > 2 ? <button className="btn-ghost btn-sm mb-0.5" onClick={() => setCompare((s) => ({ ...s, choices: s.choices.filter((_, k) => k !== i) }))}>{t.removeModel}</button> : null}
                </div>
              ))}
              {compare.choices.length < 3 ? <button className="btn-ghost btn-sm" onClick={() => setCompare((s) => ({ ...s, choices: [...s.choices, { ...ai }] }))}>＋ {t.addModel}</button> : null}
            </div>
          ) : <ModelPicker lang={lang} value={ai} onChange={setAi} showResearch={false} />}
        </section>

        <section className="flex-1 space-y-6 pb-4">
          {!messages.length && !running ? (
            <div className="mx-auto max-w-2xl py-8 text-center">
              <div className="text-4xl">✦</div>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">{t.welcomeTitle}</h2>
              <p className="mt-1 text-sm text-slate-500">{t.welcomeSub}</p>
              <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
                {t.suggestions.map((s) => <button key={s} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-brand-400 hover:bg-brand-50/40" onClick={() => setInput(s)}>{s}</button>)}
              </div>
            </div>
          ) : null}
          {messages.map((m, i) => (cmpMsg && m.id === cmpMsg.id && !running) ? (
            <div key={m.id} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(3, cmpMsg.versions!.length)}, minmax(0, 1fr))` }}>
              {cmpMsg.versions!.slice(-Math.min(3, cmpMsg.versions!.length)).map((v, k, arr) => {
                const vi = cmpMsg.versions!.length - arr.length + k;
                return (
                  <article key={k} className={`card-pad min-w-0 ${cmpMsg.vi === vi ? "ring-2 ring-brand-400" : ""}`}>
                    <div className="mb-2 truncate text-xs font-bold text-brand-700">{v.model || v.provider}</div>
                    <Markdown text={v.content} renderCode={(l, code, key) => <CodeBlock key={key} lang={l} code={code} labels={{ copy: t.copy, copied: t.copied, preview: t.preview, download: t.download }} onPreview={(a) => setArtifact({ doc: artifactDoc(a, location.origin), title: t.artifact })} />} />
                    <button className="btn-primary btn-sm mt-3" onClick={() => { chooseVersion(i, vi); setComparing(null); }}>✓ {t.useThis}</button>
                  </article>
                );
              })}
            </div>
          ) : (
            <MessageView key={m.id} t={t} m={m} last={i === lastIdx} busy={running} lang={lang}
              onEdit={m.role === "user" ? (text) => editAt(i, text) : undefined}
              onRegenerate={m.role === "assistant" && i === lastIdx ? regenerate : undefined}
              onVersion={m.role === "assistant" ? (vi) => chooseVersion(i, vi) : undefined}
              onPreview={(a: Artifact) => setArtifact({ doc: artifactDoc(a, location.origin), title: t.artifact })} />
          ))}
          {running ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, live.length)}, minmax(0, 1fr))` }}>
              {live.map((s, k) => (
                <article key={k} className="card-pad min-w-0">
                  {compare.on ? <div className="mb-2 truncate text-xs font-bold text-brand-700">{compare.choices.filter((c) => c.provider)[k]?.model}</div> : null}
                  {s ? <Markdown text={s} /> : <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> {t.thinking}</div>}
                </article>
              ))}
            </div>
          ) : null}
          {err ? <Alert tone="error">{err.msg}{err.needKey ? <Link href="/app/settings?tab=ai" className="ml-2 font-semibold underline">{t.addKey}</Link> : null}{err.upgrade ? <Link href="/app/billing" className="ml-2 font-semibold underline">{t.upgrade}</Link> : null}</Alert> : null}
          <div ref={endRef} />
        </section>

        <div className="no-print sticky bottom-20 z-10 lg:bottom-4">
          <Composer t={t} lang={lang} value={input} onChange={setInput} files={files} images={images} onFiles={setFiles} onImages={setImages}
            busy={running} canSend={!!(compare.on ? compare.choices.some((c) => c.provider) : ai.provider) && !!(input.trim() || files.length || images.length)}
            onSend={send} onStop={stop} onSlash={() => setPanel("prompts")} contextTokens={tokens} notice={hasVisionHint ? t.imagesNeedVision : undefined} />
        </div>
      </div>

      {drawer ? <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setDrawer(false)}><div className="absolute inset-0 bg-ink-950/40" /><aside className="absolute inset-y-0 left-0 w-72 bg-white p-3 shadow-lift" onClick={(e) => e.stopPropagation()}>{sidebar}</aside></div> : null}
      <AssistantsModal t={t} open={panel === "assistants"} list={assistants} activeId={assistantId} onClose={() => setPanel("")} onSave={saveAssistants}
        onUse={(a) => { setAssistantId(a?.id); if (a && messages.length) newChat(); setAssistantId(a?.id); }} />
      <PromptPicker t={t} open={panel === "prompts"} onClose={() => setPanel("")} onInsert={(s) => setInput(s)} />
      <Modal open={panel === "settings"} onClose={() => setPanel("")} title={`⚙️ ${t.settings}`}>
        <div className="space-y-4">
          <label className="block text-sm"><span className="mb-1 block font-semibold text-slate-700">{t.chatInstructions}</span>
            <textarea className="textarea min-h-[120px]" maxLength={8000} placeholder={t.instructionsPh} value={settings.instructions} onChange={(e) => setSettings({ ...settings, instructions: e.target.value })} />
          </label>
          <label className="block text-sm"><span className="mb-1 flex justify-between font-semibold text-slate-700"><span>{t.temperature}</span><span className="font-mono text-xs text-slate-500">{settings.temperature ?? t.modelDefault}</span></span>
            <input type="range" min={-1} max={20} value={settings.temperature === null ? -1 : Math.round(settings.temperature * 10)} className="w-full accent-brand-600"
              onChange={(e) => { const v = +e.target.value; setSettings({ ...settings, temperature: v < 0 ? null : v / 10 }); }} />
            <span className="mt-1 block text-xs text-slate-500">{t.tempNote}</span>
          </label>
          <label className="block text-sm"><span className="mb-1 block font-semibold text-slate-700">{t.maxTokens}</span>
            <select className="select" value={settings.maxTokens ?? ""} onChange={(e) => setSettings({ ...settings, maxTokens: e.target.value ? +e.target.value : null })}>
              <option value="">{t.modelDefault}</option>
              {[1000, 2000, 4000, 8000, 16000, 32000, 64000].map((n) => <option key={n} value={n}>{n.toLocaleString()}</option>)}
            </select>
          </label>
          <div className="flex justify-end"><button className="btn-primary btn-sm" onClick={() => { setPanel(""); if (messages.length) persist(messages); }}>{t.close}</button></div>
        </div>
      </Modal>
      <Modal open={panel === "export"} onClose={() => setPanel("")} title={`⬇ ${t.export}`}>
        <div className="grid gap-2">
          {(() => { const name = (title || titleOf(messages)).replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 50) || "chat"; const md = toMarkdown(title || titleOf(messages), messages, settings); return (
            <>
              <button className="btn-secondary" onClick={() => { download(`${name}.md`, md, "text/markdown"); setPanel(""); }}>{t.exportMd}</button>
              <button className="btn-secondary" onClick={() => { download(`${name}.docx`, markdownToDocx(md, { title: title || titleOf(messages), subtitle: "AXTO AI Chat" })); setPanel(""); }}>{t.exportDocx}</button>
              <button className="btn-secondary" onClick={() => { download(`${name}.json`, toJson(title || titleOf(messages), { v: 2, messages, settings, folder, pinned }), "application/json"); setPanel(""); }}>{t.exportJson}</button>
              <button className="btn-secondary" onClick={() => { setPanel(""); setTimeout(() => window.print(), 100); }}>{t.print}</button>
            </>
          ); })()}
        </div>
      </Modal>
      {artifact ? <ArtifactModal doc={artifact.doc} title={artifact.title} onClose={() => setArtifact(null)} labels={{ close: t.close, openTab: t.openTab }} /> : null}
    </div>
  );
}
