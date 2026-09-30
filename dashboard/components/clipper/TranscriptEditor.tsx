/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * CLIPPER — edit the clip by editing its words (Descript-style): click to jump,
 * shift-click to select, cut or restore the selection, correct a word's
 * caption text, and see filler words that are removed automatically.
 * ============================================================================ */
"use client";
import { useMemo, useState } from "react";
import { fillerIndices, isCut, toggleCut, wordsIn } from "@/lib/clipper/edit";
import type { ClipEdit, Word } from "@/lib/clipper/options";
import type { ClipperDict } from "@/lib/i18n-pages/clipper";

interface Props { words: Word[]; edit: ClipEdit; now: number; t: ClipperDict; onSeek: (t: number) => void; onChange: (e: ClipEdit) => void }

export default function TranscriptEditor({ words, edit, now, t, onSeek, onChange }: Props) {
  const list = useMemo(() => wordsIn(words, edit.start, edit.end), [words, edit.start, edit.end]);
  const fillers = useMemo(() => fillerIndices(words), [words]);
  const fillerCount = list.filter(({ i }) => fillers.has(i)).length;
  const [anchor, setAnchor] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [rangeMode, setRangeMode] = useState(false);   // touch screens: tap the first word, then the last
  const sel = anchor !== null && focus !== null ? [Math.min(anchor, focus), Math.max(anchor, focus)] : null;
  const selected = (k: number) => !!sel && k >= sel[0] && k <= sel[1];
  const range = () => {
    if (!sel) return null;
    return { start: list[sel[0]].w.start - 0.01, end: list[sel[1]].w.end + 0.01 };
  };
  const apply = (on: boolean) => {
    const r = range();
    if (!r) return;
    onChange({ ...edit, cuts: toggleCut(edit.cuts, r, on) });
    setAnchor(null); setFocus(null);
  };
  const correct = () => {
    if (!sel || sel[0] !== sel[1]) return;
    const { w, i } = list[sel[0]];
    const v = window.prompt(t.correctPrompt, edit.edits[i] ?? w.word);
    if (v === null) return;
    const edits = { ...edit.edits };
    if (v.trim() === w.word.trim()) delete edits[i]; else edits[i] = v.trim();
    onChange({ ...edit, edits });
  };
  const anyCutSelected = !!sel && list.slice(sel[0], sel[1] + 1).some(({ w }) => isCut(edit.cuts, w));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={edit.removeFillers} onChange={(e) => onChange({ ...edit, removeFillers: e.target.checked })} />
          {t.removeFillers.replace("{n}", String(fillerCount))}
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={edit.removeSilence} onChange={(e) => onChange({ ...edit, removeSilence: e.target.checked })} />
          {t.removeSilence}
        </label>
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary btn-sm" disabled={!sel} onClick={() => apply(true)}>✂ {t.cutSel}</button>
        <button type="button" className="btn-ghost btn-sm" disabled={!sel || !anyCutSelected} onClick={() => apply(false)}>↺ {t.restoreSel}</button>
        <button type="button" className="btn-ghost btn-sm" disabled={!sel || sel[0] !== sel[1]} onClick={correct}>✎ {t.correct}</button>
        <button type="button" className={`btn-sm ${rangeMode ? "btn-primary" : "btn-ghost"}`} aria-pressed={rangeMode} onClick={() => setRangeMode((m) => !m)}>⇔ {t.rangeMode}</button>
      </div>
      <p className="mb-2 text-xs text-slate-500">{t.editHint} <span className="ml-1 rounded bg-rose-50 px-1 text-rose-600 line-through">{t.legendCut}</span> <span className="rounded bg-slate-100 px-1 italic text-slate-400 line-through">{t.legendFiller}</span></p>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-[15px] leading-8">
        {list.map(({ w, i }, k) => {
          const cut = isCut(edit.cuts, w);
          const filler = edit.removeFillers && fillers.has(i);
          const active = now >= w.start && now <= w.end + 0.05;
          const text = edit.edits[i] ?? w.word;
          return (
            <button key={i} type="button"
              onClick={(e) => {
                if ((e.shiftKey || (rangeMode && focus === anchor)) && anchor !== null && k !== anchor) setFocus(k);
                else { setAnchor(k); setFocus(k); onSeek(w.start); }
              }}
              className={`mr-1 rounded px-0.5 transition ${selected(k) ? "bg-brand-100 ring-1 ring-brand-300" : ""} ${active ? "bg-amber-200" : ""} ${cut ? "text-rose-500 line-through decoration-2" : filler ? "italic text-slate-400 line-through" : "text-slate-800 hover:bg-slate-100"} ${edit.edits[i] !== undefined ? "underline decoration-dotted decoration-brand-500" : ""}`}>
              {text || <span className="text-slate-300">∅</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
