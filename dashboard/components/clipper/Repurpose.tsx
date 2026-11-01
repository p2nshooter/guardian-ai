/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * CLIPPER — repurpose the whole video into written content on the member's own
 * AI: chapters, summary, blog, X thread, LinkedIn, newsletter, description,
 * quotes. Results are kept in the project; copy or download as .md / .docx.
 * ============================================================================ */
"use client";
import { useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { REPURPOSE, transcriptForModel, type RepurposeKind, type Word } from "@/lib/clipper/options";
import { runAi } from "@/lib/clipper/client";
import { download } from "@/lib/clipper/media";
import { markdownToDocx } from "@/lib/export/docx";
import type { ClipperDict } from "@/lib/i18n-pages/clipper";
import type { AiChoice } from "@/components/ai/ModelPicker";

interface Props {
  t: ClipperDict; words: Word[]; transcript: string; title: string; ai: AiChoice; language: string;
  results: Partial<Record<RepurposeKind, string>>; onResult: (kind: RepurposeKind, text: string) => void;
  onError: (msg: string, needKey?: boolean) => void;
}

export default function Repurpose({ t, words, transcript, title, ai, language, results, onResult, onError }: Props) {
  const [kind, setKind] = useState<RepurposeKind>("chapters");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState("");
  const [copied, setCopied] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const text = busy ? live : results[kind] || "";

  async function generate() {
    if (!ai.provider) return;
    ctrl.current = new AbortController();
    setBusy(true); setLive("");
    const r = await runAi({ options: { mode: "repurpose", kind, language }, content: transcriptForModel(words) || transcript, provider: ai.provider, model: ai.model }, setLive, ctrl.current.signal);
    setBusy(false);
    if (r.error && r.error !== "aborted") { onError(r.error, r.needKey); return; }
    if (r.text.trim()) onResult(kind, r.text.trim());
  }
  const base = `${(title || "clipper").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 36)}-${kind}`;

  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-slate-900">{t.repurposeTitle}</h2>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {REPURPOSE.map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} disabled={busy}
            className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${kind === k ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
            {t.kinds[k]}{results[k] ? <span className="ml-1 text-emerald-600">✓</span> : null}
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {busy ? <button type="button" className="btn-secondary btn-sm" onClick={() => ctrl.current?.abort()}>■ {t.cancel}</button>
          : <button type="button" className="btn-primary btn-sm" disabled={!ai.provider || !words.length && !transcript} onClick={generate}>✨ {results[kind] ? t.regenerate : t.generate}</button>}
        {text && !busy ? (
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}>{copied ? t.copied : `📋 ${t.copy}`}</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => download(`${base}.md`, text, "text/markdown")}>{t.downloadMd}</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => download(`${base}.docx`, markdownToDocx(text, { title: `${title} — ${t.kinds[kind]}`, subtitle: "AXTO Clipper" }))}>{t.downloadDocx}</button>
          </>
        ) : null}
      </div>
      {busy && !live ? <p className="text-sm text-slate-500">{t.generating}</p> : null}
      {text ? <div className="rounded-xl border border-slate-200 bg-white p-4"><Markdown text={text} /></div> : null}
    </div>
  );
}
