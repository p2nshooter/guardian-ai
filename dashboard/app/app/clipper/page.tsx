/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * CLIPPER — turn a long video into short, captioned, vertical clips. The video
 * is processed on the member's own device (ffmpeg.wasm, loaded on demand); the
 * audio track is transcribed on their own speech-to-text key and the best
 * moments are found with their own AI key. Projects save to encrypted history.
 *
 * Graceful path: small videos are transcribed directly (no ffmpeg); larger ones
 * have their audio extracted in-browser. MP4 export and captions (.srt/.vtt) are
 * produced locally — nothing but the audio ever leaves the device.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n, pick } from "@/lib/i18n";
import { useMe } from "@/components/app/Shell";
import { api } from "@/lib/client";
import { Alert, LoadingBlock, Spinner } from "@/components/ui";
import ModelPicker, { type AiChoice } from "@/components/ai/ModelPicker";
import { PLATFORMS, getPlatform, type Aspect, type Clip, type Word, fmtTime, transcriptForModel, parseClips, buildCaptions } from "@/lib/clipper/options";

interface Entry { id: string; title: string; updatedAt: string }
type Step = "idle" | "loading" | "extracting" | "transcribing" | "detecting" | "ready" | "exporting";
const DIRECT_LIMIT = 24 * 1024 * 1024; // send video straight to STT below this; extract audio above it
// CDN specifiers as variables so the bundler/TS leaves these runtime-only (webpackIgnore) imports alone.
const FF_MAIN = "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js";
const FF_UTIL = "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js";
const FF_CORE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";

const L = {
  en: { title: "Clipper", sub: "Long video → short viral clips, on your own keys.",
    upload: "Upload a video", drop: "MP4, MOV or WebM · processed on your device", platform: "Platform", clips: "Clips to find",
    newProj: "New project", history: "Saved projects", empty: "No saved projects yet.",
    loading: "Loading video engine…", extracting: "Extracting audio…", transcribing: "Transcribing on your key…", detecting: "Finding the best moments…", exporting: "Exporting clip…",
    transcript: "Transcript", srt: "Captions (.srt)", vtt: "Captions (.vtt)", copyCap: "Copy caption", copied: "Copied", exportMp4: "Export MP4", download: "Download",
    score: "Score", noKeyStt: "Add a speech-to-text key (OpenAI, Groq or Deepgram) in Settings.", noKeyAi: "Add an AI key in Settings to find clips.", addKey: "Add a key",
    save: "Save project", saved: "Saved ✓", del: "Delete", rename: "Rename", confirmDel: "Delete this project?", renamePrompt: "New title:",
    noPlan: "Clipper is included from the Starter plan.", upgrade: "See plans", tooBig: "This video is too large to process in the browser. Try a shorter clip.",
    ffFail: "In-browser video processing isn't available in this browser. You can still transcribe smaller videos and download captions & timestamps.",
    reframe: "Aspect", again: "Re-detect", quota: "videos left this month", onDevice: "Your video stays on your device — only the audio is sent to your transcription provider." },
  id: { title: "Clipper", sub: "Video panjang → klip viral pendek, pakai kunci Anda.",
    upload: "Unggah video", drop: "MP4, MOV atau WebM · diproses di perangkat Anda", platform: "Platform", clips: "Jumlah klip",
    newProj: "Proyek baru", history: "Proyek tersimpan", empty: "Belum ada proyek tersimpan.",
    loading: "Memuat mesin video…", extracting: "Mengekstrak audio…", transcribing: "Transkripsi dengan kunci Anda…", detecting: "Mencari momen terbaik…", exporting: "Mengekspor klip…",
    transcript: "Transkrip", srt: "Teks (.srt)", vtt: "Teks (.vtt)", copyCap: "Salin caption", copied: "Tersalin", exportMp4: "Ekspor MP4", download: "Unduh",
    score: "Skor", noKeyStt: "Tambahkan kunci speech-to-text (OpenAI, Groq, atau Deepgram) di Pengaturan.", noKeyAi: "Tambahkan kunci AI di Pengaturan untuk mencari klip.", addKey: "Tambah kunci",
    save: "Simpan proyek", saved: "Tersimpan ✓", del: "Hapus", rename: "Ganti nama", confirmDel: "Hapus proyek ini?", renamePrompt: "Judul baru:",
    noPlan: "Clipper termasuk mulai paket Starter.", upgrade: "Lihat paket", tooBig: "Video ini terlalu besar untuk diproses di browser. Coba klip lebih pendek.",
    ffFail: "Pemrosesan video di browser tidak tersedia. Anda tetap bisa mentranskrip video kecil dan mengunduh teks & timestamp.",
    reframe: "Rasio", again: "Deteksi ulang", quota: "video tersisa bulan ini", onDevice: "Video Anda tetap di perangkat — hanya audio yang dikirim ke penyedia transkripsi." },
};

function download(name: string, data: Blob | string, mime = "text/plain") {
  const blob = typeof data === "string" ? new Blob([data], { type: mime }) : data;
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function ClipperApp() {
  const { lang } = useI18n();
  const { me } = useMe();
  const t = pick(L, lang);
  const [items, setItems] = useState<Entry[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [platform, setPlatform] = useState("tiktok");
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [count, setCount] = useState(6);
  const [ai, setAi] = useState<AiChoice>({ provider: "", model: "", research: false });
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState(0);
  const [words, setWords] = useState<Word[]>([]);
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [clips, setClips] = useState<Clip[]>([]);
  const [err, setErr] = useState<{ msg: string; needKey?: boolean } | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(-1);
  const [ffReady, setFfReady] = useState<boolean | null>(null);
  const fileRef = useRef<File | null>(null);
  const ffRef = useRef<any>(null);
  const access = !!me && me.limits.apps.includes("clipper");
  const busy = step !== "idle" && step !== "ready";

  const reload = useCallback(async () => { const r = await api<{ items: Entry[] }>("/api/history/clipper"); if (r.ok) setItems(r.data.items); }, []);
  useEffect(() => { if (access) reload(); }, [access, reload]);
  useEffect(() => { setAspect(getPlatform(platform).aspect); }, [platform]);

  async function ensureFfmpeg(): Promise<any | null> {
    if (ffRef.current) return ffRef.current;
    try {
      const { FFmpeg } = await import(/* webpackIgnore: true */ FF_MAIN);
      const { toBlobURL } = await import(/* webpackIgnore: true */ FF_UTIL);
      const ff = new FFmpeg();
      ff.on("progress", (p: any) => setProgress(Math.round((p?.progress || 0) * 100)));
      await ff.load({ coreURL: await toBlobURL(`${FF_CORE}/ffmpeg-core.js`, "text/javascript"), wasmURL: await toBlobURL(`${FF_CORE}/ffmpeg-core.wasm`, "application/wasm") });
      ffRef.current = ff; setFfReady(true); return ff;
    } catch { setFfReady(false); return null; }
  }

  async function onFile(file: File) {
    setErr(null); setClips([]); setSaved(false); setId(null); fileRef.current = file;
    // Probe duration cheaply via a <video> element.
    try { const v = document.createElement("video"); v.preload = "metadata"; v.src = URL.createObjectURL(file); await new Promise((res) => { v.onloadedmetadata = () => res(0); v.onerror = () => res(0); setTimeout(res, 4000); }); if (v.duration && isFinite(v.duration)) setDuration(v.duration); URL.revokeObjectURL(v.src); } catch {}

    let audio: Blob = file; let filename = file.name;
    if (file.size > DIRECT_LIMIT) {
      setStep("loading");
      const ff = await ensureFfmpeg();
      if (!ff) { setErr({ msg: t.ffFail }); setStep("idle"); return; }
      try {
        setStep("extracting"); setProgress(0);
        const { fetchFile } = await import(/* webpackIgnore: true */ FF_UTIL);
        await ff.writeFile("in", await fetchFile(file));
        await ff.exec(["-i", "in", "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", "out.mp3"]);
        const data = await ff.readFile("out.mp3");
        audio = new Blob([data], { type: "audio/mpeg" }); filename = "audio.mp3";
        if (audio.size > DIRECT_LIMIT) { setErr({ msg: t.tooBig }); setStep("idle"); return; }
      } catch { setErr({ msg: t.tooBig }); setStep("idle"); return; }
    } else { ensureFfmpeg(); } // warm up in the background for export

    // Transcribe on the member's STT key.
    setStep("transcribing");
    const fd = new FormData(); fd.append("audio", audio, filename); if (lang !== "en") fd.append("language", lang);
    const res = await fetch("/api/clipper/transcribe", { method: "POST", body: fd, credentials: "include" });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) { setErr({ msg: j.error || `Transcription failed (${res.status})`, needKey: j.needKey }); setStep("idle"); return; }
    setWords(j.words || []); setTranscript(j.text || ""); if (j.duration) setDuration(j.duration);
    await detect(j.words || [], j.duration || duration);
  }

  async function detect(w: Word[], dur: number) {
    setStep("detecting"); setClips([]);
    const tScript = transcriptForModel(w) || transcript;
    let acc = "";
    try {
      const res = await fetch("/api/byox/run", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ app: "clipper", messages: [{ role: "user", content: tScript }], provider: ai.provider, model: ai.model, options: { platform, count: String(count), maxSec: String(getPlatform(platform).maxSec), language: lang !== "en" ? lang : "" } }),
      });
      if (!res.ok || !res.body) { const j: any = await res.json().catch(() => ({})); setErr({ msg: j.error || `Failed (${res.status})`, needKey: j.needKey }); setStep("ready"); return; }
      const reader = res.body.getReader(); const dec = new TextDecoder();
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); }
    } catch (e: any) { setErr({ msg: String(e?.message || e) }); setStep("ready"); return; }
    setClips(parseClips(acc, dur || Infinity)); setStep("ready");
  }

  async function exportClip(c: Clip) {
    const file = fileRef.current; if (!file) return;
    const ff = await ensureFfmpeg(); if (!ff) { setErr({ msg: t.ffFail }); return; }
    setStep("exporting"); setProgress(0); setErr(null);
    try {
      const { fetchFile } = await import(/* webpackIgnore: true */ FF_UTIL);
      await ff.writeFile("src", await fetchFile(file));
      const [w, h] = aspect === "9:16" ? [1080, 1920] : aspect === "1:1" ? [1080, 1080] : [1920, 1080];
      const vf = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`;
      await ff.exec(["-ss", String(c.start), "-to", String(c.end), "-i", "src", "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "clip.mp4"]);
      const data = await ff.readFile("clip.mp4");
      download(`${(c.title || "clip").replace(/[^\w-]+/g, "_").slice(0, 40)}.mp4`, new Blob([data], { type: "video/mp4" }), "video/mp4");
    } catch { setErr({ msg: t.ffFail }); }
    setStep("ready"); setProgress(0);
  }

  async function open(cid: string) {
    const r = await api<{ item: { body: { platform: string; count: number; transcript: string; words: Word[]; duration: number; clips: Clip[] } } }>(`/api/history/clipper/${cid}`);
    if (r.ok) { const b = r.data.item.body; setId(cid); setPlatform(b.platform || "tiktok"); setCount(b.count || 6); setTranscript(b.transcript || ""); setWords(b.words || []); setDuration(b.duration || 0); setClips(b.clips || []); setStep("ready"); setErr(null); }
  }
  function newProject() { setId(null); setClips([]); setTranscript(""); setWords([]); setDuration(0); setStep("idle"); setErr(null); fileRef.current = null; }
  async function save() {
    if (!clips.length && !transcript) return;
    const title = clips[0]?.title ? `${getPlatform(platform).name} · ${clips[0].title}`.slice(0, 80) : `Clipper · ${new Date().toLocaleDateString()}`;
    const r = await api<{ item: Entry }>("/api/history/clipper", { body: { id: id || undefined, title, body: { platform, count, transcript, words, duration, clips }, meta: { clips: String(clips.length) } } });
    if (r.ok) { if (!id) setId(r.data.item.id); setSaved(true); reload(); }
  }
  async function rename(cid: string, cur: string) { const title = prompt(t.renamePrompt, cur); if (title == null) return; await api(`/api/history/clipper/${cid}/rename`, { body: { title } }); reload(); }
  async function del(cid: string) { if (!confirm(t.confirmDel)) return; await api(`/api/history/clipper/${cid}`, { method: "DELETE" }); if (cid === id) newProject(); reload(); }

  if (!me) return <LoadingBlock />;
  if (!access) return (
    <div className="surface-ink relative overflow-hidden rounded-2xl p-8"><div className="glow pointer-events-none absolute inset-0" />
      <div className="relative"><div className="text-4xl">🎬</div><h1 className="mt-3 text-2xl font-extrabold text-white">{t.noPlan}</h1>
        <Link href="/app/billing?plan=starter" className="btn-primary btn-lg mt-5">{t.upgrade} →</Link></div></div>
  );

  const stepLabel: Record<Step, string> = { idle: "", loading: t.loading, extracting: t.extracting, transcribing: t.transcribing, detecting: t.detecting, ready: "", exporting: t.exporting };

  const aside = (
    <div className="flex h-full flex-col">
      <button className="btn-primary btn-sm mb-3" onClick={newProject}>＋ {t.newProj}</button>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.history}</div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length ? items.map((c) => (
          <div key={c.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${c.id === id ? "bg-brand-50" : "hover:bg-slate-50"}`}>
            <button className="min-w-0 flex-1 truncate text-left" onClick={() => open(c.id)}>{c.title}</button>
            <div className="hidden shrink-0 gap-0.5 group-hover:flex">
              <button className="rounded px-1 text-xs text-slate-400 hover:text-slate-700" title={t.rename} onClick={() => rename(c.id, c.title)}>✎</button>
              <button className="rounded px-1 text-xs text-slate-400 hover:text-rose-600" title={t.del} onClick={() => del(c.id)}>✕</button>
            </div>
          </div>
        )) : <p className="px-2 py-3 text-xs text-slate-400">{t.empty}</p>}
      </div>
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="no-print hidden lg:block"><div className="card sticky top-20 h-[calc(100vh-6rem)] p-3">{aside}</div></aside>
      <div className="min-w-0">
        <div className="mb-4"><div className="eyebrow">🎬 {t.sub}</div><h1 className="text-2xl font-bold">{t.title}</h1></div>

        <section className="card-pad mb-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-semibold text-slate-700">{t.platform}</div>
              <select className="select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.aspect}</option>)}
              </select>
            </div>
            <div>
              <div className="mb-1 text-sm font-semibold text-slate-700">{t.clips}: {count}</div>
              <input type="range" min={1} max={12} value={count} onChange={(e) => setCount(+e.target.value)} className="w-full accent-brand-600" />
            </div>
          </div>
          <ModelPicker lang={lang} value={ai} onChange={setAi} showResearch={false} />
          <label className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center ${busy ? "pointer-events-none opacity-60" : "border-slate-300 hover:border-brand-400"}`}>
            <input type="file" accept="video/*" className="hidden" disabled={busy || !ai.provider} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
            <div className="text-3xl">⬆️</div>
            <div className="mt-2 font-semibold text-slate-800">{t.upload}</div>
            <div className="text-xs text-slate-500">{t.drop}</div>
            {!ai.provider ? <div className="mt-2 text-xs text-amber-600">{t.noKeyAi}</div> : null}
          </label>
          <p className="text-xs text-emerald-700">🔒 {t.onDevice}</p>
          {me.usage ? <p className="text-xs text-slate-500">{me.limits.clipperVideosPerMonth < 0 ? "∞" : Math.max(0, me.limits.clipperVideosPerMonth - me.usage.clipperVideos)} {t.quota}</p> : null}
        </section>

        {busy ? (
          <div className="card-pad mb-4 flex items-center gap-3"><Spinner /><div className="flex-1"><div className="text-sm font-medium text-slate-700">{stepLabel[step]}</div>{(step === "extracting" || step === "exporting") && progress ? <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-slate-100"><div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} /></div> : null}</div></div>
        ) : null}
        {err ? <Alert tone="error">{err.msg}{err.needKey ? <Link href="/app/settings?tab=ai" className="ml-2 font-semibold underline">{t.addKey}</Link> : null}</Alert> : null}

        {clips.length ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-bold">{clips.length} clips</h2>
              <select className="select w-auto" value={aspect} onChange={(e) => setAspect(e.target.value as Aspect)} aria-label={t.reframe}>
                {(["9:16", "1:1", "16:9"] as Aspect[]).map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <button className="btn-ghost btn-sm" onClick={() => detect(words, duration)} disabled={busy || !words.length}>↻ {t.again}</button>
              <button className="btn-secondary btn-sm ml-auto" onClick={save}>{saved ? t.saved : `💾 ${t.save}`}</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {clips.map((c, i) => (
                <article key={i} className="card-pad">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{c.title}</h3>
                    {typeof c.score === "number" ? <span className="badge-green shrink-0">{c.score}</span> : null}
                  </div>
                  <div className="mt-1 text-xs font-medium text-brand-700">{fmtTime(c.start)} – {fmtTime(c.end)} · {Math.round(c.end - c.start)}s</div>
                  {c.hook ? <p className="mt-2 text-sm italic text-slate-700">“{c.hook}”</p> : null}
                  {c.summary ? <p className="mt-1 text-sm text-slate-600">{c.summary}</p> : null}
                  {c.caption ? <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{c.caption}</p> : null}
                  {c.hashtags?.length ? <div className="mt-2 flex flex-wrap gap-1">{c.hashtags.map((h) => <span key={h} className="rounded bg-brand-50 px-1.5 py-0.5 text-[11px] text-brand-700">#{h}</span>)}</div> : null}
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <button className="btn-primary btn-sm" onClick={() => exportClip(c)} disabled={busy || !fileRef.current}>🎬 {t.exportMp4}</button>
                    <button className="btn-ghost btn-sm" disabled={!words.length} onClick={() => download(`${(c.title || "clip").replace(/[^\w-]+/g, "_").slice(0, 40)}.srt`, buildCaptions(words, c.start, c.end, "srt"))}>{t.srt}</button>
                    <button className="btn-ghost btn-sm" disabled={!words.length} onClick={() => download(`${(c.title || "clip").replace(/[^\w-]+/g, "_").slice(0, 40)}.vtt`, buildCaptions(words, c.start, c.end, "vtt"), "text/vtt")}>{t.vtt}</button>
                    {c.caption ? <button className="btn-ghost btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(`${c.caption}${c.hashtags?.length ? "\n\n" + c.hashtags.map((h) => "#" + h).join(" ") : ""}`); setCopied(i); setTimeout(() => setCopied(-1), 1500); } catch {} }}>{copied === i ? t.copied : t.copyCap}</button> : null}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : transcript && step === "ready" ? (
          <div className="card-pad"><div className="mb-1 text-sm font-semibold text-slate-700">{t.transcript}</div><p className="max-h-64 overflow-auto whitespace-pre-wrap text-sm text-slate-600">{transcript}</p></div>
        ) : null}
      </div>
    </div>
  );
}
