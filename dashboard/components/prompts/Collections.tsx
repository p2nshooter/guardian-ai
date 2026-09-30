/* PROMPT LIBRARY v4 — collections (and the built-in Favourites). */
"use client";
import { useState } from "react";
import { newId, type LibraryState, type Ref } from "@/lib/prompts/library";
import type { PromptsDict } from "@/lib/i18n-pages/prompts";

export default function Collections({ t, state, onState, titleOf, onOpen }: {
  t: PromptsDict; state: LibraryState; onState: (u: (s: LibraryState) => LibraryState) => void; titleOf: (r: Ref) => string | null; onOpen: (r: Ref) => void;
}) {
  const [name, setName] = useState("");
  const lists = [{ id: "fav", name: `★ ${t.favorites}`, items: state.favorites }, ...state.collections];
  const remove = (cid: string, r: Ref) => onState((s) => (cid === "fav" ? { ...s, favorites: s.favorites.filter((x) => x !== r) } : { ...s, collections: s.collections.map((c) => (c.id === cid ? { ...c, items: c.items.filter((x) => x !== r) } : c)) }));
  return (
    <div className="space-y-4">
      <section className="card-pad flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 text-sm">{t.collectionName}<input className="input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} data-testid="pl-col-name" /></label>
        <button type="button" className="btn-primary" disabled={!name.trim()} onClick={() => { onState((s) => ({ ...s, collections: [...s.collections, { id: newId("col"), name: name.trim(), items: [] }] })); setName(""); }} data-testid="pl-col-add">＋ {t.newCollection}</button>
      </section>
      {lists.length === 1 && !state.favorites.length ? <p className="text-sm text-slate-500">{t.collectionsEmpty}</p> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0" data-testid="pl-collections">
        {lists.map((c) => (
          <section key={c.id} className="card-pad">
            <div className="flex items-center gap-2"><h3 className="min-w-0 flex-1 truncate font-bold text-slate-900">{c.name}</h3><span className="text-xs text-slate-500">{t.itemsN.replace("{n}", String(c.items.length))}</span>
              {c.id !== "fav" ? <button type="button" className="btn-ghost btn-sm text-rose-700" onClick={() => { if (window.confirm(t.confirmDel)) onState((s) => ({ ...s, collections: s.collections.filter((x) => x.id !== c.id) })); }} aria-label={`${t.del} ${c.name}`}>✕</button> : null}</div>
            <ul className="mt-2 space-y-1 text-sm">{c.items.map((r) => { const title = titleOf(r); return (
              <li key={r} className="flex items-center gap-2"><button type="button" className="min-w-0 flex-1 truncate text-left text-slate-700 hover:underline" onClick={() => title && onOpen(r)}>{title || t.unknownPrompt}</button>
                <button type="button" className="text-xs text-slate-400 hover:text-rose-600" onClick={() => remove(c.id, r)} aria-label={t.removeFromCollection}>✕</button></li>
            ); })}</ul>
          </section>
        ))}
      </div>
    </div>
  );
}
