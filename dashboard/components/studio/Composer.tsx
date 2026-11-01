/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * AI STUDIO — the message composer: auto-growing input, files (PDF, DOCX, code,
 * text — extracted on the device) and images (resized on the device) by button,
 * paste or drag & drop, voice dictation, "/" for the Prompt Library, a token
 * estimate, send and stop.
 * ============================================================================ */
"use client";
import { useEffect, useRef, useState } from "react";
import { extractFile, ACCEPT } from "@/lib/legal/extract";
import { estimateTokens, type FileText, type Img } from "@/lib/studio/model";
import type { StudioDict } from "@/lib/i18n-pages/studio";

const CODE_EXT = /\.(js|jsx|ts|tsx|py|go|rs|java|kt|swift|c|h|cpp|hpp|cs|php|rb|sh|bash|zsh|ps1|sql|yaml|yml|toml|ini|env|css|scss|vue|svelte|dart|r|lua|pl|ex|exs|scala|tf|dockerfile|gradle|txt|md|log|csv|json|xml|html|htm)$/i;
const IMG = /^image\/(png|jpeg|webp|gif)$/;
const MAX_TEXT = 400_000;

async function toImage(file: File): Promise<Img> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const s = Math.min(1, 1568 / Math.max(img.naturalWidth, img.naturalHeight));   // vision models downscale beyond this anyway
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const png = file.type === "image/png" && c.width * c.height < 900_000;
    const data = c.toDataURL(png ? "image/png" : "image/jpeg", 0.86);
    return { mime: png ? "image/png" : "image/jpeg", data: data.slice(data.indexOf(",") + 1), name: file.name };
  } finally { URL.revokeObjectURL(url); }
}

interface Props {
  t: StudioDict; value: string; onChange: (v: string) => void;
  files: FileText[]; images: Img[]; onFiles: (f: FileText[]) => void; onImages: (i: Img[]) => void;
  busy: boolean; canSend: boolean; onSend: () => void; onStop: () => void; onSlash: () => void;
  contextTokens: number; lang: string; notice?: string;
}

export default function Composer({ t, value, onChange, files, images, onFiles, onImages, busy, canSend, onSend, onStop, onSlash, contextTokens, lang, notice }: Props) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const [drag, setDrag] = useState(false);
  const [reading, setReading] = useState("");
  const [err, setErr] = useState("");
  const [listening, setListening] = useState(false);
  const rec = useRef<any>(null);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(260, el.scrollHeight)}px`;
  }, [value]);

  async function add(list: FileList | File[]) {
    setErr("");
    const nf = [...files], ni = [...images];
    for (const f of Array.from(list)) {
      if (IMG.test(f.type)) {
        if (f.size > 25 * 1024 * 1024) { setErr(t.fileTooBig.replace("{name}", f.name)); continue; }
        try { ni.push(await toImage(f)); } catch { setErr(t.fileTooBig.replace("{name}", f.name)); }
        continue;
      }
      setReading(t.reading.replace("{name}", f.name));
      try {
        let text = "";
        if (/\.(pdf|docx|odt|rtf|eml)$/i.test(f.name)) text = (await extractFile(f)).text;
        else if (CODE_EXT.test(f.name) || f.type.startsWith("text/") || !f.type) text = await f.text();
        else text = (await extractFile(f)).text;
        if (text.length > MAX_TEXT) { setErr(t.fileTooBig.replace("{name}", f.name)); text = text.slice(0, MAX_TEXT); }
        nf.push({ name: f.name, text, size: f.size });
      } catch { setErr(t.fileTooBig.replace("{name}", f.name)); }
    }
    setReading("");
    onFiles(nf); onImages(ni);
  }

  function voice() {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setErr(t.voiceUnsupported); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new SR();
    r.lang = { id: "id-ID", ms: "ms-MY", de: "de-DE", fr: "fr-FR", it: "it-IT", zh: "zh-CN", ja: "ja-JP", hi: "hi-IN", ar: "ar-SA" }[lang] || "en-US";
    r.interimResults = true; r.continuous = true;
    const base = value ? value.replace(/\s*$/, " ") : "";
    r.onresult = (e: any) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      onChange(base + s);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }

  const draft = estimateTokens(value + files.map((f) => f.text).join(""), images.length);

  return (
    <div className={`card relative p-2.5 transition ${drag ? "ring-2 ring-brand-400" : ""}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { if (e.dataTransfer.files?.length) { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); } }}>
      {drag ? <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-brand-50/90 text-sm font-semibold text-brand-800">{t.dropHere}</div> : null}
      {files.length || images.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {images.map((im, i) => (
            <span key={`i${i}`} className="relative">
              <img src={`data:${im.mime};base64,${im.data}`} alt={im.name || ""} className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200" />
              <button type="button" aria-label={t.del} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] text-white" onClick={() => onImages(images.filter((_, k) => k !== i))}>✕</button>
            </span>
          ))}
          {files.map((f, i) => (
            <span key={`f${i}`} className="flex max-w-[220px] items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
              📄 <span className="truncate">{f.name}</span><span className="text-slate-400">{t.tokens.replace("{n}", String(estimateTokens(f.text)))}</span>
              <button type="button" aria-label={t.del} className="ml-0.5 text-slate-400 hover:text-rose-600" onClick={() => onFiles(files.filter((_, k) => k !== i))}>✕</button>
            </span>
          ))}
        </div>
      ) : null}
      <textarea ref={ta} rows={1} className="block max-h-[260px] min-h-[44px] w-full resize-none border-0 bg-transparent px-2 py-2 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400" placeholder={t.ask} value={value}
        onChange={(e) => { const v = e.target.value; if (v === "/" && !value) { onSlash(); return; } onChange(v); }}
        onPaste={(e) => { const fs = Array.from(e.clipboardData.files || []); if (fs.length) { e.preventDefault(); add(fs); } }}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (canSend && !busy) onSend(); } }} />
      <div className="mt-1 flex items-center gap-1">
        <label className="btn-ghost btn-sm cursor-pointer px-2" title={t.attach} aria-label={t.attach}>📎
          <input type="file" multiple className="hidden" accept={`${ACCEPT},image/png,image/jpeg,image/webp,image/gif,.js,.ts,.tsx,.py,.go,.rs,.java,.sql,.yaml,.yml,.sh,.css`} onChange={(e) => { if (e.target.files?.length) add(e.target.files); e.currentTarget.value = ""; }} />
        </label>
        <button type="button" className={`btn-sm px-2 ${listening ? "btn-primary animate-pulse" : "btn-ghost"}`} title={listening ? t.listening : t.voice} aria-label={t.voice} onClick={voice}>🎙️</button>
        <button type="button" className="btn-ghost btn-sm px-2" title={t.prompts} aria-label={t.prompts} onClick={onSlash}>📚</button>
        <span className="ml-1 hidden truncate text-[11px] text-slate-400 sm:block">{reading || err || notice || t.shortcuts}</span>
        <span className="ml-auto whitespace-nowrap text-[11px] tabular-nums text-slate-400" title="context + draft">{t.tokens.replace("{n}", (contextTokens + draft).toLocaleString())}</span>
        {busy
          ? <button type="button" className="btn-secondary btn-sm ml-2" onClick={onStop}>■ {t.stop}</button>
          : <button type="button" className="btn-primary btn-sm ml-2" onClick={onSend} disabled={!canSend}>{t.send} ↵</button>}
      </div>
      {(reading || err || notice) ? <p className="mt-1 px-2 text-[11px] text-slate-500 sm:hidden">{reading || err || notice}</p> : null}
    </div>
  );
}
