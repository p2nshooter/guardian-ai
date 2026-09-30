/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * CLIPPER — the clip inspector: Captions · Reframe · Trim & cut · Hook & text ·
 * Brand · Render. Every control edits the ClipEdit the preview draws.
 * ============================================================================ */
"use client";
import { useMemo, useState } from "react";
import TranscriptEditor from "./TranscriptEditor";
import Timeline from "./Timeline";
import { jobPieces, analyzeFaces, recorderMime, canRecord } from "@/lib/clipper/media";
import { parseLines, FONTS, TEMPLATES, styleFromTemplate, type BrandKit, type CaptionStyle, type Clip, type ClipEdit, type Word } from "@/lib/clipper/options";
import { runAi } from "@/lib/clipper/client";
import type { ClipperDict } from "@/lib/i18n-pages/clipper";
import type { AiChoice } from "@/components/ai/ModelPicker";

export type InspectorTab = "captions" | "reframe" | "edit" | "text" | "brand" | "export";
export interface ExportState { id: string; phase: "render" | "convert" | "done" | "error"; p: number; message?: string }

const TARGETS: [string, string][] = [
  ["English", "English"], ["Indonesian", "Bahasa Indonesia"], ["Malay", "Bahasa Melayu"], ["Spanish", "Español"], ["Portuguese", "Português"],
  ["French", "Français"], ["German", "Deutsch"], ["Italian", "Italiano"], ["Dutch", "Nederlands"], ["Turkish", "Türkçe"], ["Russian", "Русский"],
  ["Arabic", "العربية"], ["Hindi", "हिन्दी"], ["Chinese (Simplified)", "中文"], ["Japanese", "日本語"], ["Korean", "한국어"], ["Thai", "ไทย"],
  ["Vietnamese", "Tiếng Việt"], ["Filipino", "Filipino"],
];

function Swatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <input type="color" className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0" value={hex} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Slider({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex justify-between text-slate-600"><span>{label}</span><span className="font-mono text-xs text-slate-500">{fmt ? fmt(value) : value}</span></span>
      <input type="range" className="w-full accent-brand-600" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
      <input type="checkbox" className="h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
function Seg<T extends string>({ value, items, onChange }: { value: T; items: { id: T; label: string; hint?: string; disabled?: boolean }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((i) => (
        <button key={i.id} type="button" disabled={i.disabled} onClick={() => onChange(i.id)} title={i.hint}
          className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold transition disabled:opacity-40 ${value === i.id ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
          {i.label}{i.hint ? <span className="mt-0.5 block text-[10px] font-normal text-slate-500">{i.hint}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** A template chip styled like the caption it produces. */
function TemplateChip({ s, active, onClick }: { s: (typeof TEMPLATES)[number]; active: boolean; onClick: () => void }) {
  const stroke = s.stroke && s.strokeWidth ? { WebkitTextStroke: `${Math.max(1, s.strokeWidth * 8)}px ${s.stroke}`, paintOrder: "stroke fill" as any } : {};
  return (
    <button type="button" onClick={onClick}
      className={`flex h-16 flex-col items-center justify-center rounded-lg border bg-slate-800 px-1 transition ${active ? "border-brand-400 ring-2 ring-brand-400" : "border-slate-700 hover:border-slate-500"}`}>
      <span className="whitespace-nowrap" style={{ fontFamily: `"${s.font}", sans-serif`, fontWeight: s.weight, fontSize: 14, color: s.color, textShadow: s.shadow ? `0 0 ${s.anim === "glow" ? 8 : 3}px ${s.shadow}` : undefined, background: s.box || undefined, padding: s.box ? "0 4px" : undefined, borderRadius: 4, ...stroke }}>
        {s.uppercase ? "THE " : "The "}
        <span style={{ color: s.anim === "box" ? "#fff" : s.highlight, background: s.anim === "box" ? s.highlight : undefined, padding: s.anim === "box" ? "0 3px" : undefined, borderRadius: 3 }}>{s.uppercase ? "BEST" : "best"}</span>
        {s.emoji ? " 🔥" : ""}
      </span>
      <span className="mt-1 truncate text-[10px] font-medium text-slate-300">{s.name}</span>
    </button>
  );
}

interface Props {
  t: ClipperDict; tab: InspectorTab; onTab: (t: InspectorTab) => void;
  clip: Clip; onClip: (c: Clip) => void;
  edit: ClipEdit; onEdit: (e: ClipEdit) => void;
  words: Word[]; duration: number; now: number; onSeek: (t: number) => void;
  brand: BrandKit; onBrand: (b: BrandKit) => void; onSaveBrand: () => void; brandSaved: boolean;
  onApplyAll: (s: CaptionStyle) => void;
  url: string | null; ai: AiChoice;
  quality: "720" | "1080"; onQuality: (q: "720" | "1080") => void;
  onExport: (convert: boolean) => void; onCancelExport: () => void; exportState: ExportState | null;
  onCaptionsFile: (fmt: "srt" | "vtt") => void; onThumbnail: () => void; onClipText: () => void;
  onLogoFile: (f: File) => void;
}

export default function Inspector(p: Props) {
  const { t, edit, onEdit } = p;
  const cap = edit.captions;
  const setCap = (c: Partial<CaptionStyle>) => onEdit({ ...edit, captions: { ...cap, ...c } });
  const { segs, pages } = useMemo(() => jobPieces({ edit, words: p.words }), [edit, p.words]);
  const [faceState, setFaceState] = useState<{ busy: boolean; p: number; msg: string }>({ busy: false, p: 0, msg: "" });
  const [tl, setTl] = useState<{ busy: boolean; target: string; err: string }>({ busy: false, target: "Indonesian", err: "" });
  const [copied, setCopied] = useState(false);
  const mime = useMemo(() => (typeof window !== "undefined" ? recorderMime() : { mime: "", ext: "webm" as const }), []);
  const [convert, setConvert] = useState(true);
  const recordable = typeof window !== "undefined" && canRecord();

  async function trackFaces() {
    if (!p.url) return;
    setFaceState({ busy: true, p: 0, msg: "" });
    try {
      const r = await analyzeFaces(p.url, { start: edit.start, end: edit.end }, { fps: 3, onProgress: (x) => setFaceState((s) => ({ ...s, p: x })) });
      const msg = r.found < 0.05 ? t.noFaces
        : t.faces.replace("{p}", String(Math.round(r.found * 100))) + (r.twoFaces > 0.3 ? " " + t.twoFaces.replace("{p}", String(Math.round(r.twoFaces * 100))) : "");
      onEdit({ ...edit, track: r.track, twoFaces: r.twoFaces, reframe: r.found < 0.05 ? edit.reframe : "auto" });
      setFaceState({ busy: false, p: 1, msg });
    } catch {
      setFaceState({ busy: false, p: 0, msg: t.mpFail });
    }
  }

  async function translate() {
    const lines = pages.map((pg) => pg.lines.flat().map((w) => w.text).join(" "));
    if (!lines.length || !p.ai.provider) return;
    setTl((s) => ({ ...s, busy: true, err: "" }));
    const r = await runAi({ options: { mode: "translate", target: tl.target }, content: JSON.stringify(lines), provider: p.ai.provider, model: p.ai.model });
    const out = r.error ? null : parseLines(r.text, lines.length);
    if (!out) { setTl((s) => ({ ...s, busy: false, err: r.error || t.detectFail })); return; }
    onEdit({ ...edit, translated: { lang: tl.target, lines: pages.map((pg, i) => ({ start: pg.start, end: pg.end, text: out[i] })) } });
    setTl((s) => ({ ...s, busy: false }));
  }

  const tabs: { id: InspectorTab; label: string }[] = [
    { id: "captions", label: t.tCaptions }, { id: "reframe", label: t.tReframe }, { id: "edit", label: t.tEdit },
    { id: "text", label: t.tText }, { id: "brand", label: t.tBrand }, { id: "export", label: t.tExport },
  ];
  const ex = p.exportState;
  const exporting = !!ex && (ex.phase === "render" || ex.phase === "convert");

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
        {tabs.map((x) => (
          <button key={x.id} role="tab" aria-selected={p.tab === x.id} type="button" onClick={() => p.onTab(x.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${p.tab === x.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{x.label}</button>
        ))}
      </div>

      {p.tab === "captions" ? (
        <div className="space-y-3">
          <Toggle label={t.showCaptions} checked={cap.show} onChange={(v) => setCap({ show: v })} />
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.template}</div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))" }}>
              {TEMPLATES.map((s) => <TemplateChip key={s.id} s={s} active={cap.template === s.id} onClick={() => onEdit({ ...edit, captions: styleFromTemplate(s.id, cap) })} />)}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-sm"><span className="mb-1 block text-slate-600">{t.font}</span>
              <select className="select py-2" value={cap.font} onChange={(e) => setCap({ font: e.target.value })}>{FONTS.map((f) => <option key={f} value={f}>{f}</option>)}</select>
            </label>
            <Slider label={t.size} value={Math.round(cap.size * 1000)} min={30} max={130} step={2} onChange={(v) => setCap({ size: v / 1000 })} />
            <Swatch label={t.color} value={cap.color} onChange={(v) => setCap({ color: v })} />
            <Swatch label={t.highlight} value={cap.highlight} onChange={(v) => setCap({ highlight: v })} />
            <Toggle label={t.outline} checked={!!cap.stroke && cap.strokeWidth > 0} onChange={(v) => setCap(v ? { stroke: "#000000", strokeWidth: 0.14 } : { stroke: "", strokeWidth: 0 })} />
            <Toggle label={t.uppercase} checked={cap.uppercase} onChange={(v) => setCap({ uppercase: v })} />
            <Slider label={t.wordsPerLine} value={cap.wordsPerLine} min={1} max={8} step={1} onChange={(v) => setCap({ wordsPerLine: v })} />
            <Slider label={t.lines} value={cap.lines} min={1} max={3} step={1} onChange={(v) => setCap({ lines: v })} />
            <Slider label={t.position} value={Math.round(cap.position * 100)} min={10} max={92} step={1} onChange={(v) => setCap({ position: v / 100 })} fmt={(v) => (v < 35 ? t.top : v > 65 ? t.bottom : "·")} />
            <Toggle label={`😀 ${t.emoji}`} checked={cap.emoji} onChange={(v) => setCap({ emoji: v })} />
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={() => p.onApplyAll(cap)}>⧉ {t.applyAll}</button>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 text-sm font-semibold text-slate-800">🌐 {t.translate}</div>
            {edit.translated ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="badge-green">{t.translatedTo.replace("{lang}", edit.translated.lang)}</span>
                <button type="button" className="btn-ghost btn-sm" onClick={() => onEdit({ ...edit, translated: undefined })}>{t.useOriginal}</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <select className="select w-auto py-2" value={tl.target} onChange={(e) => setTl((s) => ({ ...s, target: e.target.value }))} aria-label={t.translateTo}>
                  {TARGETS.map(([en, native]) => <option key={en} value={en}>{native}</option>)}
                </select>
                <button type="button" className="btn-secondary btn-sm" disabled={tl.busy || !p.ai.provider || !pages.length} onClick={translate}>{tl.busy ? t.translating : t.translateBtn}</button>
              </div>
            )}
            {tl.err ? <p className="mt-2 text-xs text-rose-600">{tl.err}</p> : null}
          </div>
        </div>
      ) : null}

      {p.tab === "reframe" ? (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.layout}</div>
            <Seg value={edit.layout} onChange={(v) => onEdit({ ...edit, layout: v })} items={[
              { id: "fill", label: t.fill, hint: t.fillHint }, { id: "fit", label: t.fit, hint: t.fitHint }, { id: "split", label: t.split, hint: t.splitHint },
            ]} />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.framing}</div>
            <Seg value={edit.reframe} onChange={(v) => onEdit({ ...edit, reframe: v })} items={[
              { id: "auto", label: t.auto, disabled: !edit.track?.length }, { id: "manual", label: t.manual }, { id: "center", label: t.center },
            ]} />
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <button type="button" className="btn-primary btn-sm" onClick={trackFaces} disabled={!p.url || faceState.busy}>
              🎯 {faceState.busy ? t.analyzing.replace("{p}", String(Math.round(faceState.p * 100))) : t.analyze}
            </button>
            {faceState.busy ? <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100"><div className="h-full bg-brand-500 transition-all" style={{ width: `${faceState.p * 100}%` }} /></div> : null}
            {faceState.msg ? <p className="mt-2 text-sm text-slate-600">{faceState.msg}</p> : null}
            {edit.twoFaces && edit.twoFaces > 0.3 && edit.layout !== "split" ? (
              <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => onEdit({ ...edit, layout: "split" })}>⬒ {t.split}</button>
            ) : null}
          </div>
          {edit.reframe === "manual" ? <Slider label={t.horizontal} value={Math.round(edit.manualX * 100)} min={0} max={100} step={1} onChange={(v) => onEdit({ ...edit, manualX: v / 100 })} fmt={(v) => `${v}%`} /> : null}
          <Slider label={t.zoom} value={Math.round(edit.zoom * 100)} min={100} max={180} step={2} onChange={(v) => onEdit({ ...edit, zoom: v / 100 })} fmt={(v) => `${v}%`} />
        </div>
      ) : null}

      {p.tab === "edit" ? (
        <div className="space-y-4">
          <Timeline duration={p.duration} words={p.words} start={edit.start} end={edit.end} segs={segs} now={p.now} t={t}
            onChange={(s, e) => onEdit({ ...edit, start: s, end: e })} onSeek={p.onSeek} />
          <TranscriptEditor words={p.words} edit={edit} now={p.now} t={t} onSeek={p.onSeek} onChange={onEdit} />
        </div>
      ) : null}

      {p.tab === "text" ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <Toggle label={t.hookShow} checked={edit.hook.show} onChange={(v) => onEdit({ ...edit, hook: { ...edit.hook, show: v } })} />
            <input className="input mt-2" value={edit.hook.text} maxLength={90} placeholder={t.hook} onChange={(e) => onEdit({ ...edit, hook: { ...edit.hook, text: e.target.value } })} />
            <div className="mt-2"><Slider label={t.hookSeconds.replace("{n}", String(edit.hook.seconds))} value={edit.hook.seconds} min={1} max={8} step={0.5} onChange={(v) => onEdit({ ...edit, hook: { ...edit.hook, seconds: v } })} /></div>
          </div>
          <Toggle label={t.progress} checked={edit.progress} onChange={(v) => onEdit({ ...edit, progress: v })} />
          <label className="block text-sm"><span className="mb-1 block font-semibold text-slate-700">{t.clipTitle}</span>
            <input className="input" value={p.clip.title} maxLength={120} onChange={(e) => p.onClip({ ...p.clip, title: e.target.value })} />
          </label>
          <label className="block text-sm"><span className="mb-1 block font-semibold text-slate-700">{t.caption}</span>
            <textarea className="input min-h-[96px]" value={p.clip.caption || ""} maxLength={2000} onChange={(e) => p.onClip({ ...p.clip, caption: e.target.value })} />
          </label>
          <label className="block text-sm"><span className="mb-1 block font-semibold text-slate-700">{t.hashtags}</span>
            <input className="input" value={(p.clip.hashtags || []).map((h) => `#${h}`).join(" ")} onChange={(e) => p.onClip({ ...p.clip, hashtags: e.target.value.split(/[\s,]+/).map((h) => h.replace(/^#/, "")).filter(Boolean).slice(0, 15) })} />
          </label>
          <button type="button" className="btn-secondary btn-sm" onClick={async () => {
            try { await navigator.clipboard.writeText(`${p.clip.caption || p.clip.title}${p.clip.hashtags?.length ? "\n\n" + p.clip.hashtags.map((h) => "#" + h).join(" ") : ""}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
          }}>{copied ? t.copied : `📋 ${t.copyCap}`}</button>
        </div>
      ) : null}

      {p.tab === "brand" ? (
        <div className="space-y-3">
          <div><div className="font-semibold text-slate-800">{t.brandTitle}</div><p className="text-xs text-slate-500">{t.brandHint}</p></div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              {p.brand.logo ? <img src={p.brand.logo} alt={t.logo} className="max-h-full max-w-full object-contain" /> : <span className="text-xl">🏷️</span>}
            </div>
            <label className="btn-secondary btn-sm cursor-pointer">{t.uploadLogo}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onLogoFile(f); e.currentTarget.value = ""; }} />
            </label>
            {p.brand.logo ? <button type="button" className="btn-ghost btn-sm" onClick={() => p.onBrand({ ...p.brand, logo: "" })}>{t.removeLogo}</button> : null}
          </div>
          {p.brand.logo ? (
            <>
              <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.logoPos}</div>
                <Seg value={p.brand.logoPos} onChange={(v) => p.onBrand({ ...p.brand, logoPos: v })} items={[{ id: "tl", label: t.tl }, { id: "tr", label: t.tr }, { id: "bl", label: t.bl }, { id: "br", label: t.br }]} />
              </div>
              <Slider label={t.logoSize} value={Math.round(p.brand.logoSize * 100)} min={6} max={40} step={1} onChange={(v) => p.onBrand({ ...p.brand, logoSize: v / 100 })} fmt={(v) => `${v}%`} />
              <Slider label={t.opacity} value={Math.round(p.brand.logoOpacity * 100)} min={20} max={100} step={5} onChange={(v) => p.onBrand({ ...p.brand, logoOpacity: v / 100 })} fmt={(v) => `${v}%`} />
            </>
          ) : null}
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.hookColors}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Swatch label={t.background} value={p.brand.hookBg} onChange={(v) => p.onBrand({ ...p.brand, hookBg: v })} />
            <Swatch label={t.textColor} value={p.brand.hookColor} onChange={(v) => p.onBrand({ ...p.brand, hookColor: v })} />
            <Swatch label={t.progressColor} value={p.brand.progressColor} onChange={(v) => p.onBrand({ ...p.brand, progressColor: v })} />
            <label className="block text-sm"><span className="mb-1 block text-slate-600">{t.defaultTemplate}</span>
              <select className="select py-2" value={p.brand.template} onChange={(e) => p.onBrand({ ...p.brand, template: e.target.value })}>{TEMPLATES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </label>
          </div>
          <button type="button" className="btn-primary btn-sm" onClick={p.onSaveBrand}>{p.brandSaved ? t.brandSaved : `💾 ${t.saveBrand}`}</button>
        </div>
      ) : null}

      {p.tab === "export" ? (
        <div className="space-y-3">
          {!recordable ? <div className="alert-error text-sm">{t.noRecord}</div> : null}
          <div><div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{t.quality}</div>
            <Seg value={p.quality} onChange={p.onQuality} items={[{ id: "720", label: t.q720 }, { id: "1080", label: t.q1080 }]} />
          </div>
          <div className="text-sm text-slate-600">{t.format}: <b>{mime.ext === "mp4" ? t.formatMp4 : t.formatWebm}</b></div>
          {mime.ext === "webm" ? <Toggle label="MP4" checked={convert} onChange={setConvert} /> : null}
          {exporting ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3">
              <div className="mb-1 text-sm font-semibold text-brand-800">{(ex!.phase === "convert" ? t.converting : t.exporting).replace("{p}", String(Math.round(ex!.p * 100)))}</div>
              <div className="h-2 overflow-hidden rounded bg-white"><div className="h-full bg-brand-500 transition-all" style={{ width: `${ex!.p * 100}%` }} /></div>
              <p className="mt-2 text-xs text-slate-500">{t.keepVisible}</p>
              <button type="button" className="btn-ghost btn-sm mt-1" onClick={p.onCancelExport}>{t.cancel}</button>
            </div>
          ) : (
            <button type="button" className="btn-primary" disabled={!p.url || !recordable || !segs.length} onClick={() => p.onExport(mime.ext === "webm" && convert)}>🎬 {t.exportVideo}</button>
          )}
          {ex?.phase === "done" ? <p className="text-sm font-semibold text-emerald-700">{t.exportDone}</p> : null}
          {ex?.phase === "error" ? <p className="text-sm text-rose-600">{ex.message}</p> : null}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <button type="button" className="btn-ghost btn-sm" onClick={() => p.onCaptionsFile("srt")} disabled={!pages.length}>{t.captionsFile} .srt</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => p.onCaptionsFile("vtt")} disabled={!pages.length}>{t.captionsFile} .vtt</button>
            <button type="button" className="btn-ghost btn-sm" onClick={p.onThumbnail} disabled={!p.url}>🖼 {t.thumbnailBtn}</button>
            <button type="button" className="btn-ghost btn-sm" onClick={p.onClipText}>{t.transcriptTxt}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
