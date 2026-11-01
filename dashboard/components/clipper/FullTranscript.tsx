/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * CLIPPER — the whole transcript: paragraphs by speaker and pause, search with
 * highlights, download as .txt / .srt, and "make a clip from the selection".
 * ============================================================================ */
"use client";
import { useMemo, useState } from "react";
import { fmtTime, buildCaptions, type Word } from "@/lib/clipper/options";
import { download } from "@/lib/clipper/media";
import type { ClipperDict } from "@/lib/i18n-pages/clipper";

interface Para { speaker?: number; start: number; items: { w: Word; i: number }[] }

function paragraphs(words: Word[]): Para[] {
  const out: Para[] = [];
  let cur: Para | null = null;
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const brk = !cur || w.speaker !== cur.speaker || (prev && w.start - prev.end > 1.5) || (cur.items.length > 60 && prev && /[.!?。！？]$/.test(prev.word));
    if (brk) { cur = { speaker: w.speaker, start: w.start, items: [] }; out.push(cur); }
    cur!.items.push({ w, i });
  });
  return out;
}

interface Props { t: ClipperDict; words: Word[]; title: string; now: number; onSeek: (t: number) => void; onMakeClip: (start: number, end: number) => void }

export default function FullTranscript({ t, words, title, now, onSeek, onMakeClip }: Props) {
  const paras = useMemo(() => paragraphs(words), [words]);
  const [q, setQ] = useState("");
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const needle = q.trim().toLowerCase();
  const hits = useMemo(() => (needle ? words.filter((w) => w.word.toLowerCase().includes(needle)).length : 0), [needle, words]);
  const lo = a !== null && b !== null ? Math.min(a, b) : a, hi = a !== null && b !== null ? Math.max(a, b) : a;
  const text = () => paras.map((p) => `[${fmtTime(p.start)}]${p.speaker !== undefined ? ` ${t.speaker.replace("{n}", String(p.speaker + 1))}:` : ""} ${p.items.map((x) => x.w.word).join(" ")}`).join("\n\n");
  const base = (title || "transcript").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="input min-w-[200px] flex-1 py-2" placeholder={t.searchTranscript} value={q} onChange={(e) => setQ(e.target.value)} />
        {needle ? <span className="text-xs text-slate-500">{t.matches.replace("{n}", String(hits))}</span> : null}
        <button type="button" className="btn-ghost btn-sm" onClick={() => download(`${base}.txt`, text())}>{t.downloadTxt}</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => download(`${base}.srt`, buildCaptions(words, 0, Infinity, "srt", 9))}>{t.downloadSrt}</button>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{t.selectHint}</span>
        <button type="button" className="btn-primary btn-sm" disabled={lo === null || hi === null || lo === hi}
          onClick={() => { if (lo !== null && hi !== null) { onMakeClip(words[lo].start, words[hi].end); setA(null); setB(null); } }}>＋ {t.makeClip}</button>
      </div>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-[15px] leading-7">
        {paras.map((p, k) => (
          <p key={k}>
            <button type="button" className="mr-2 font-mono text-xs text-brand-700 hover:underline" onClick={() => onSeek(p.start)}>{fmtTime(p.start)}</button>
            {p.speaker !== undefined ? <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{t.speaker.replace("{n}", String(p.speaker + 1))}</span> : null}
            {p.items.map(({ w, i }) => {
              const hit = needle && w.word.toLowerCase().includes(needle);
              const inSel = lo !== null && hi !== null && i >= lo && i <= hi;
              const active = now >= w.start && now <= w.end + 0.05;
              return (
                <span key={i} role="button" tabIndex={-1}
                  onClick={(e) => { if (e.shiftKey && a !== null) setB(i); else if (a !== null && b === null && i !== a) setB(i); else { setA(i); setB(null); } onSeek(w.start); }}
                  className={`cursor-pointer rounded px-0.5 ${inSel ? "bg-brand-100" : ""} ${hit ? "bg-yellow-200" : ""} ${active ? "bg-amber-200" : ""} hover:bg-slate-100`}>{w.word} </span>
              );
            })}
          </p>
        ))}
      </div>
    </div>
  );
}
