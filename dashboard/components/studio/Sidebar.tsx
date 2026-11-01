/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * AI STUDIO — the chat list: search (titles + snippets), pinned chats, folders,
 * recent, and per-chat actions (rename, pin, move to folder, duplicate, delete).
 * ============================================================================ */
"use client";
import { useMemo, useState } from "react";
import type { StudioDict } from "@/lib/i18n-pages/studio";

export interface ChatEntry { id: string; title: string; updatedAt: string; meta?: Record<string, unknown> }

interface Props {
  t: StudioDict; items: ChatEntry[]; activeId: string | null;
  onNew: () => void; onOpen: (id: string) => void; onRename: (id: string, title: string) => void; onDuplicate: (id: string) => void;
  onDelete: (id: string) => void; onPin: (id: string, pinned: boolean) => void; onFolder: (id: string) => void; onAssistants: () => void;
}

export default function Sidebar({ t, items, activeId, onNew, onOpen, onRename, onDuplicate, onDelete, onPin, onFolder, onAssistants }: Props) {
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const needle = q.trim().toLowerCase();
  const list = useMemo(() => items.filter((i) => !needle || i.title.toLowerCase().includes(needle) || String(i.meta?.snippet || "").toLowerCase().includes(needle)), [items, needle]);
  const pinned = list.filter((i) => i.meta?.pinned === true || i.meta?.pinned === "1");
  const folders = Array.from(new Set(list.filter((i) => !pinned.includes(i) && i.meta?.folder).map((i) => String(i.meta!.folder)))).sort();
  const recent = list.filter((i) => !pinned.includes(i) && !i.meta?.folder);

  const row = (c: ChatEntry) => {
    const isPinned = c.meta?.pinned === true || c.meta?.pinned === "1";
    return (
      <div key={c.id} className={`group relative flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${c.id === activeId ? "bg-brand-50 text-brand-900" : "hover:bg-slate-50"}`}>
        <button className="min-w-0 flex-1 truncate text-left" onClick={() => onOpen(c.id)} title={c.title}>{c.title}</button>
        <button className="shrink-0 rounded px-1 text-slate-400 opacity-100 hover:text-slate-700 lg:opacity-0 lg:group-hover:opacity-100" aria-label="⋯" onClick={() => setMenu(menu === c.id ? null : c.id)}>⋯</button>
        {menu === c.id ? (
          <div className="absolute right-1 top-8 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg" onMouseLeave={() => setMenu(null)}>
            {[
              [t.rename, () => onRename(c.id, c.title)], [isPinned ? t.unpin : t.pin, () => onPin(c.id, !isPinned)],
              [t.moveTo, () => onFolder(c.id)], [t.duplicate, () => onDuplicate(c.id)], [t.del, () => onDelete(c.id)],
            ].map(([label, fn]) => (
              <button key={label as string} className={`block w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-50 ${label === t.del ? "text-rose-600" : ""}`} onClick={() => { setMenu(null); (fn as () => void)(); }}>{label as string}</button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };
  const head = (s: string) => <div className="mb-1 mt-3 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{s}</div>;

  return (
    <div className="flex h-full flex-col">
      <button className="btn-primary btn-sm mb-2" onClick={onNew}>＋ {t.newChat}</button>
      <button className="btn-secondary btn-sm mb-2" onClick={onAssistants}>🧩 {t.assistants}</button>
      <input className="input py-1.5 text-sm" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
        {!list.length ? <p className="px-2 py-3 text-xs text-slate-400">{needle ? t.noMatch : t.empty}</p> : null}
        {pinned.length ? <>{head(`📌 ${t.pinned}`)}{pinned.map(row)}</> : null}
        {folders.map((f) => <div key={f}>{head(`📁 ${f}`)}{list.filter((i) => !pinned.includes(i) && String(i.meta?.folder || "") === f).map(row)}</div>)}
        {recent.length ? <>{head(t.recent)}{recent.map(row)}</> : null}
      </div>
    </div>
  );
}
