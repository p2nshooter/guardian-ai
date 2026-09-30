/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * AI STUDIO — a fenced code block: syntax highlighting (highlight.js, loaded on
 * demand), the language, copy, download, and ▶ Preview for html / svg / mermaid
 * artifacts (rendered in a sandboxed iframe with no access to the app).
 * ============================================================================ */
"use client";
import { useEffect, useState } from "react";
import { artifactKind, type Artifact } from "@/lib/studio/model";

let hl: Promise<any> | null = null;
const loadHl = () => (hl ||= import("highlight.js/lib/common").then((m) => m.default));
const EXT: Record<string, string> = { javascript: "js", typescript: "ts", python: "py", bash: "sh", shell: "sh", markdown: "md", yaml: "yml", html: "html", css: "css", json: "json", sql: "sql", go: "go", rust: "rs", java: "java", csharp: "cs", cpp: "cpp", php: "php", ruby: "rb", svg: "svg", mermaid: "mmd", xml: "xml", kotlin: "kt", swift: "swift" };

export default function CodeBlock({ lang, code, labels, onPreview }: { lang: string; code: string; labels: { copy: string; copied: string; preview: string; download: string }; onPreview?: (a: Artifact) => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const kind = artifactKind(lang, code);
  useEffect(() => {
    let live = true;
    if (code.length > 60_000) return;
    loadHl().then((h) => {
      if (!live) return;
      try {
        const r = lang && h.getLanguage(lang) ? h.highlight(code, { language: lang, ignoreIllegals: true }) : h.highlightAuto(code);
        setHtml(r.value);   // highlight.js escapes the source; output is span markup only
      } catch { setHtml(null); }
    }).catch(() => {});
    return () => { live = false; };
  }, [lang, code]);
  const name = `snippet.${EXT[lang.toLowerCase()] || lang.toLowerCase() || "txt"}`;
  return (
    <div className="code-card group my-3 overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117]">
      <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-1.5 text-[11px] text-slate-400">
        <span className="font-mono uppercase tracking-wide">{lang || "code"}</span>
        <span className="ml-auto flex gap-1">
          {kind && onPreview ? <button type="button" className="rounded px-2 py-0.5 font-semibold text-emerald-300 hover:bg-slate-800" onClick={() => onPreview({ kind, code })}>▶ {labels.preview}</button> : null}
          <button type="button" className="rounded px-2 py-0.5 hover:bg-slate-800 hover:text-slate-200" onClick={() => { const u = URL.createObjectURL(new Blob([code], { type: "text/plain" })); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 3000); }}>⬇ {labels.download}</button>
          <button type="button" className="rounded px-2 py-0.5 hover:bg-slate-800 hover:text-slate-200" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {} }}>{copied ? `✓ ${labels.copied}` : `⧉ ${labels.copy}`}</button>
        </span>
      </div>
      <pre className="hljs m-0 overflow-x-auto p-4 text-[13px] leading-relaxed text-slate-100"><code dangerouslySetInnerHTML={html !== null ? { __html: html } : undefined}>{html === null ? code : undefined}</code></pre>
    </div>
  );
}

/** Full-screen preview of an artifact in a sandboxed iframe (scripts allowed, no same-origin). */
export function ArtifactModal({ doc, title, onClose, labels }: { doc: string; title: string; onClose: () => void; labels: { close: string; openTab: string } }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/70 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[calc(100dvh-3rem)]">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
          <span className="font-semibold text-slate-800">{title}</span>
          <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => { const w = window.open("", "_blank", "noopener"); if (w) { w.document.open(); w.document.write(doc); w.document.close(); } }}>↗ {labels.openTab}</button>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>{labels.close}</button>
        </div>
        <iframe title={title} sandbox="allow-scripts allow-forms allow-modals" srcDoc={doc} className="min-h-0 w-full flex-1 bg-white" />
      </div>
    </div>
  );
}
