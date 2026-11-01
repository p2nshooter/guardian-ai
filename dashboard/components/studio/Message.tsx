/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * AI STUDIO — one message: the member's request (files, images, edit & resend)
 * or an answer (rich Markdown with highlighted code and artifact previews,
 * answer versions ◀ 1/3 ▶, regenerate, copy, read aloud, the model that
 * answered).
 * ============================================================================ */
"use client";
import { memo, useState } from "react";
import Markdown from "@/components/Markdown";
import CodeBlock from "./CodeBlock";
import { stripStatus } from "@/lib/markdown";
import { shown, type Artifact, type Msg } from "@/lib/studio/model";
import type { StudioDict } from "@/lib/i18n-pages/studio";

interface Props {
  t: StudioDict; m: Msg; last: boolean; busy: boolean; lang: string;
  onEdit?: (text: string) => void; onRegenerate?: () => void; onVersion?: (vi: number) => void; onPreview: (a: Artifact) => void;
}

function speakable(md: string) {
  return stripStatus(md).replace(/```[\s\S]*?```/g, " ").replace(/[#*_>`|~-]+/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
}

function MessageImpl({ t, m, last, busy, lang, onEdit, onRegenerate, onVersion, onPreview }: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);
  const [speaking, setSpeaking] = useState(false);
  const labels = { copy: t.copy, copied: t.copied, preview: t.preview, download: t.download };

  if (m.role === "user") {
    return (
      <div className="group ml-auto flex max-w-[88%] flex-col items-end gap-1.5">
        {m.images?.length ? <div className="flex flex-wrap justify-end gap-1.5">{m.images.map((im, i) => <img key={i} src={`data:${im.mime};base64,${im.data}`} alt={im.name || ""} className="h-28 max-w-[200px] rounded-xl object-cover ring-1 ring-slate-200" />)}</div> : null}
        {m.files?.length ? <div className="flex flex-wrap justify-end gap-1.5">{m.files.map((f, i) => <span key={i} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">📄 {f.name}</span>)}</div> : null}
        {editing ? (
          <div className="w-full min-w-[260px] rounded-2xl border border-brand-300 bg-white p-2">
            <textarea className="textarea min-h-[90px] w-full" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => { setEditing(false); setDraft(m.content); }}>{t.cancel}</button>
              <button type="button" className="btn-primary btn-sm" disabled={!draft.trim() || busy} onClick={() => { setEditing(false); onEdit?.(draft.trim()); }}>{t.saveResend}</button>
            </div>
          </div>
        ) : m.content && m.content !== "(image)" ? (
          <div className="whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink-900 px-4 py-3 text-[15px] leading-relaxed text-white">{m.content}</div>
        ) : null}
        {!editing && onEdit ? <button type="button" className="text-[11px] text-slate-400 opacity-0 transition hover:text-slate-700 group-hover:opacity-100" onClick={() => setEditing(true)} disabled={busy}>✎ {t.edit}</button> : null}
      </div>
    );
  }

  const text = shown(m);
  const n = m.versions?.length || 1, vi = m.vi ?? n - 1;
  return (
    <article className="group">
      <div className="flex gap-3">
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-teal-600 text-xs text-white">✦</div>
        <div className="min-w-0 flex-1">
          <Markdown text={text} renderCode={(lang2, code, key) => <CodeBlock key={key} lang={lang2} code={code} labels={labels} onPreview={onPreview} />} />
          <div className="mt-2 flex flex-wrap items-center gap-1 text-slate-500">
            {n > 1 ? (
              <span className="mr-1 flex items-center gap-0.5 text-xs">
                <button type="button" className="rounded px-1.5 py-0.5 hover:bg-slate-100" aria-label={t.prevVersion} onClick={() => onVersion?.(vi - 1)} disabled={busy}>◀</button>
                <span className="tabular-nums">{t.version.replace("{i}", String(vi + 1)).replace("{n}", String(n))}</span>
                <button type="button" className="rounded px-1.5 py-0.5 hover:bg-slate-100" aria-label={t.nextVersion} onClick={() => onVersion?.(vi + 1)} disabled={busy}>▶</button>
              </span>
            ) : null}
            <button type="button" className="btn-ghost btn-sm px-2 text-xs" onClick={async () => { try { await navigator.clipboard.writeText(stripStatus(text)); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {} }}>{copied ? `✓ ${t.copied}` : `⧉ ${t.copy}`}</button>
            {last && onRegenerate ? <button type="button" className="btn-ghost btn-sm px-2 text-xs" onClick={onRegenerate} disabled={busy}>↻ {t.regenerate}</button> : null}
            <button type="button" className="btn-ghost btn-sm px-2 text-xs" onClick={() => {
              const s = window.speechSynthesis;
              if (!s) return;
              if (speaking) { s.cancel(); setSpeaking(false); return; }
              const u = new SpeechSynthesisUtterance(speakable(text));
              u.lang = { id: "id-ID", ms: "ms-MY", de: "de-DE", fr: "fr-FR", it: "it-IT", zh: "zh-CN", ja: "ja-JP", hi: "hi-IN", ar: "ar-SA" }[lang] || "en-US";
              u.onend = () => setSpeaking(false);
              s.cancel(); s.speak(u); setSpeaking(true);
            }}>{speaking ? `■ ${t.stopReading}` : `🔊 ${t.readAloud}`}</button>
            {m.model ? <span className="ml-auto truncate text-[11px] text-slate-400">{t.via.replace("{model}", m.model)}</span> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(MessageImpl);
