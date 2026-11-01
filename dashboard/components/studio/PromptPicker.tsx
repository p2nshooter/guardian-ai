/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * AI STUDIO — insert a Prompt Library prompt into the composer ("/" or 📚).
 * Locked levels show but can't be inserted; the full template is fetched from
 * the plan-gated endpoint only when chosen.
 * ============================================================================ */
"use client";
import { useEffect, useMemo, useState } from "react";
import { Modal, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import type { StudioDict } from "@/lib/i18n-pages/studio";

interface P { id: string; field: string; level: string; title: string; summary: string; locked: boolean }
interface F { id: string; name: string; icon: string }

export default function PromptPicker({ t, open, onClose, onInsert }: { t: StudioDict; open: boolean; onClose: () => void; onInsert: (text: string) => void }) {
  const [data, setData] = useState<{ prompts: P[]; fields: F[] } | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => { if (open && !data) api<{ prompts: P[]; fields: F[] }>("/api/prompts").then((r) => r.ok && setData(r.data)); }, [open, data]);
  const needle = q.trim().toLowerCase();
  const list = useMemo(() => (data?.prompts || []).filter((p) => !needle || `${p.title} ${p.summary} ${p.field}`.toLowerCase().includes(needle)).slice(0, 80), [data, needle]);
  const field = (id: string) => data?.fields.find((f) => f.id === id);
  async function pick(p: P) {
    if (p.locked) return;
    setBusy(p.id);
    const r = await api<{ prompt: { template: string } }>(`/api/prompts/${p.id}`);
    setBusy("");
    if (r.ok) { onInsert(r.data.prompt.template); onClose(); }
  }
  return (
    <Modal open={open} onClose={onClose} title={`📚 ${t.prompts}`} wide>
      <input className="input mb-3" placeholder={t.promptSearch} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      {!data ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <div className="max-h-[55vh] space-y-1.5 overflow-y-auto">
          {list.map((p) => (
            <button key={p.id} type="button" disabled={p.locked || !!busy} onClick={() => pick(p)}
              className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${p.locked ? "border-slate-100 opacity-60" : "border-slate-200 hover:border-brand-400 hover:bg-brand-50/40"}`}>
              <span className="text-lg">{field(p.field)?.icon || "📝"}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><span className="font-semibold text-slate-900">{p.title}</span><span className="rounded bg-slate-100 px-1.5 text-[10px] font-bold uppercase text-slate-500">{p.level}</span></span>
                <span className="line-clamp-1 text-xs text-slate-500">{p.summary}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-brand-700">{busy === p.id ? <Spinner /> : p.locked ? `🔒 ${t.promptLocked}` : t.insert}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
