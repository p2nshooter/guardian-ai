/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * AI STUDIO — assistants: saved personas with their own instructions (system
 * prompt) and creativity. Start from a template or write your own; the list is
 * kept in the member's encrypted history.
 * ============================================================================ */
"use client";
import { useState } from "react";
import { Modal } from "@/components/ui";
import { newMsgId, type Assistant } from "@/lib/studio/model";
import type { StudioDict } from "@/lib/i18n-pages/studio";

export const PRESET_ASSISTANTS: Omit<Assistant, "id" | "name">[] = [
  { icon: "👩‍💻", instructions: "You are a senior software engineer and code reviewer. Give correct, idiomatic, production-ready code with brief explanations; point out bugs, security issues and edge cases; prefer simple designs. Ask for missing requirements only when they block you." },
  { icon: "📣", instructions: "You are a senior marketing strategist. Ground every recommendation in the audience, positioning and channels; give concrete messaging, campaign ideas and the metrics to track. Be specific — never generic." },
  { icon: "⚖️", instructions: "You are an experienced commercial contracts lawyer. Draft clear, balanced clauses, flag risks and missing terms, and explain trade-offs in plain language. Say that this is not legal advice and that local law may differ." },
  { icon: "📊", instructions: "You are a data analyst. Clarify the question, state assumptions, show the method (SQL, Python or spreadsheet formulas), interpret results carefully and flag data-quality issues." },
  { icon: "🎓", instructions: "You are a patient tutor. Explain step by step with simple examples, check understanding with one short question at the end, and adapt the level to the learner." },
  { icon: "🌐", instructions: "You are a professional translator. Translate faithfully and naturally, keep formatting, names and numbers, and briefly note any ambiguity or cultural nuance after the translation." },
];

interface Props { t: StudioDict; open: boolean; list: Assistant[]; activeId?: string; onClose: () => void; onSave: (list: Assistant[]) => void; onUse: (a: Assistant | null) => void }

export default function Assistants({ t, open, list, activeId, onClose, onSave, onUse }: Props) {
  const [edit, setEdit] = useState<Assistant | null>(null);
  const blank = (): Assistant => ({ id: newMsgId(), name: "", icon: "🤖", instructions: "" });
  return (
    <Modal open={open} onClose={() => { setEdit(null); onClose(); }} title={`🧩 ${t.assistants}`} wide>
      {edit ? (
        <div className="space-y-3">
          <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3">
            <label className="block text-sm"><span className="mb-1 block font-semibold text-slate-700">{t.assistantIcon}</span>
              <input className="input text-center text-xl" maxLength={4} value={edit.icon} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} />
            </label>
            <label className="block text-sm"><span className="mb-1 block font-semibold text-slate-700">{t.assistantName}</span>
              <input className="input" maxLength={60} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
            </label>
          </div>
          <label className="block text-sm"><span className="mb-1 block font-semibold text-slate-700">{t.instructions}</span>
            <textarea className="textarea min-h-[180px]" maxLength={8000} placeholder={t.instructionsPh} value={edit.instructions} onChange={(e) => setEdit({ ...edit, instructions: e.target.value })} />
          </label>
          <label className="block text-sm"><span className="mb-1 flex justify-between font-semibold text-slate-700"><span>{t.temperature}</span><span className="font-mono text-xs text-slate-500">{edit.temperature ?? t.modelDefault}</span></span>
            <input type="range" min={-1} max={20} value={edit.temperature === undefined ? -1 : Math.round(edit.temperature * 10)} className="w-full accent-brand-600"
              onChange={(e) => { const v = +e.target.value; setEdit({ ...edit, temperature: v < 0 ? undefined : v / 10 }); }} />
          </label>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost btn-sm" onClick={() => setEdit(null)}>{t.cancel}</button>
            <button className="btn-primary btn-sm" disabled={!edit.name.trim() || !edit.instructions.trim()} onClick={() => {
              const next = list.some((a) => a.id === edit.id) ? list.map((a) => (a.id === edit.id ? edit : a)) : [...list, edit];
              onSave(next); setEdit(null);
            }}>{t.saveAssistant}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary btn-sm" onClick={() => setEdit(blank())}>＋ {t.newAssistant}</button>
            <button className="btn-ghost btn-sm" onClick={() => { onUse(null); onClose(); }}>{t.noAssistant}</button>
          </div>
          {list.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((a) => (
                <div key={a.id} className={`rounded-xl border p-3 ${a.id === activeId ? "border-brand-500 bg-brand-50/50" : "border-slate-200"}`}>
                  <div className="flex items-center gap-2"><span className="text-xl">{a.icon}</span><span className="font-semibold text-slate-900">{a.name}</span></div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.instructions}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button className="btn-primary btn-sm" onClick={() => { onUse(a); onClose(); }}>{t.useAssistant}</button>
                    <button className="btn-ghost btn-sm" onClick={() => setEdit(a)}>{t.editAssistant}</button>
                    <button className="btn-ghost btn-sm text-rose-600" onClick={() => { if (confirm(t.confirmDelAssistant)) onSave(list.filter((x) => x.id !== a.id)); }}>{t.deleteAssistant}</button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t.presetsTitle}</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {PRESET_ASSISTANTS.map((p, i) => (
                <button key={i} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand-400 hover:bg-brand-50/40" onClick={() => setEdit({ ...p, id: newMsgId(), name: t.presets[i] })}>
                  <span className="text-xl">{p.icon}</span> <span className="font-semibold text-slate-800">{t.presets[i]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
