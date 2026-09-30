/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * CLIPPER — live preview. Plays the clip exactly as it will be rendered: only
 * the kept pieces (cuts are skipped), reframed, with animated captions, hook,
 * progress bar and logo — drawn by the same renderer the export uses.
 * ============================================================================ */
"use client";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { drawFrame, ensureFonts } from "@/lib/clipper/render";
import { jobPieces } from "@/lib/clipper/media";
import { segmentAt, toOut, toSrc, totalDuration } from "@/lib/clipper/edit";
import { fmtPrecise, outputSize, type Aspect, type BrandKit, type ClipEdit, type Word } from "@/lib/clipper/options";
import type { ClipperDict } from "@/lib/i18n-pages/clipper";

export interface PreviewHandle { seek: (sourceTime: number) => void; pause: () => void }

interface Props {
  url: string | null; words: Word[]; edit: ClipEdit; brand: BrandKit; aspect: Aspect;
  logo: HTMLImageElement | null; emojis?: Record<string, string>; t: ClipperDict;
  onTime?: (sourceTime: number) => void;
}

const Preview = forwardRef<PreviewHandle, Props>(function Preview({ url, words, edit, brand, aspect, logo, emojis, t, onTime }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratch = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [outT, setOutT] = useState(0);
  const [ready, setReady] = useState(false);
  const { segs, pages } = useMemo(() => jobPieces({ edit, words }), [edit, words]);
  const total = totalDuration(segs);
  const [W, H] = outputSize(aspect, "720");
  const live = useRef({ edit, brand, pages, segs, logo, emojis });
  live.current = { edit, brand, pages, segs, logo, emojis };
  const lastReport = useRef(0);
  const dirty = useRef(true);
  dirty.current = true;            // any prop change redraws the paused frame

  const draw = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (!scratch.current) scratch.current = document.createElement("canvas");
    const L = live.current;
    drawFrame(ctx, { video: v, edit: L.edit, brand: L.brand, pages: L.pages, segs: L.segs, t: v.currentTime, W, H, logo: L.logo, emojis: L.emojis, scratch: scratch.current });
  };

  useEffect(() => { ensureFonts().then(() => { dirty.current = true; }); }, []);

  // Keep playback inside the kept pieces: skip cuts, stop at the end.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const v = videoRef.current;
      if (v) {
        const S = live.current.segs;
        const tt = v.currentTime;
        if (S.length && !v.paused) {
          const i = segmentAt(S, tt);
          if (i === -1) { v.pause(); v.currentTime = S[0].start; }
          else if (tt < S[i].start - 0.03) v.currentTime = S[i].start;
        }
        if (!v.paused || dirty.current) { draw(); dirty.current = false; }
        const o = toOut(S, v.currentTime);
        if (o !== null) setOutT(o);
        const now = performance.now();
        if (onTime && now - lastReport.current > 120) { lastReport.current = now; onTime(v.currentTime); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [W, H]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new clip window: park at its first kept frame.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !segs.length || !ready) return;
    const o = toOut(segs, v.currentTime);
    if (o === null) v.currentTime = segs[0].start;
  }, [edit.start, edit.end, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    seek: (s: number) => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, s); },
    pause: () => videoRef.current?.pause(),
  }));

  const toggle = async () => {
    const v = videoRef.current;
    if (!v || !segs.length) return;
    if (v.paused) {
      if (toOut(segs, v.currentTime) === null || v.currentTime >= segs[segs.length - 1].end - 0.05) v.currentTime = segs[0].start;
      try { await v.play(); } catch {}
    } else v.pause();
  };

  return (
    <div className="w-full">
      <div className="relative mx-auto overflow-hidden rounded-xl bg-slate-900 shadow-lg ring-1 ring-black/10" style={{ aspectRatio: `${W} / ${H}`, maxHeight: "68vh" }}>
        <canvas ref={canvasRef} width={W} height={H} className="h-full w-full cursor-pointer" onClick={toggle} />
        {!url ? <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-300">{t.noVideo}</div> : null}
        {url && !playing ? (
          <button type="button" onClick={toggle} aria-label={t.play} className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-2xl text-white backdrop-blur transition hover:bg-black/70">▶</button>
        ) : null}
      </div>
      {url ? (
        <video ref={videoRef} src={url} playsInline muted={muted} preload="auto" aria-hidden
          className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onLoadedData={() => { setReady(true); dirty.current = true; }} onSeeked={() => { dirty.current = true; }} />
      ) : null}
      <div className="mt-2 flex items-center gap-2">
        <button type="button" className="btn-secondary btn-sm w-10 justify-center" onClick={toggle} disabled={!url} aria-label={playing ? t.pause : t.play}>{playing ? "❚❚" : "▶"}</button>
        <input type="range" className="min-w-0 flex-1 accent-brand-600" min={0} max={Math.max(0.1, total)} step={0.05} value={Math.min(outT, total)} disabled={!url}
          onChange={(e) => { const v = videoRef.current; if (v) v.currentTime = toSrc(segs, +e.target.value); }} aria-label="Seek" />
        <span className="w-24 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-500">{fmtPrecise(outT)} / {fmtPrecise(total)}</span>
        <button type="button" className="btn-ghost btn-sm px-2" onClick={() => setMuted((m) => !m)} disabled={!url} aria-label={muted ? t.unmute : t.mute}>{muted ? "🔇" : "🔊"}</button>
      </div>
    </div>
  );
});

export default Preview;
