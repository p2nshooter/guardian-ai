/* PROMPT LIBRARY v4 — saved results (encrypted history), plus library
 * export / import. */
"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { LoadingBlock } from "@/components/ui";
import Markdown from "@/components/Markdown";
import { CopyBtn, download } from "@/components/security/shared";
import { STATE_ID, exportJson, mergeImport, sanitizeState, type LibraryState } from "@/lib/prompts/library";
import type { PromptsDict } from "@/lib/i18n-pages/prompts";

interface Entry { id: string; title: string; updatedAt: string; meta?: Record<string, unknown> }

export default function History({ t, state, onState, openId }: { t: PromptsDict; state: LibraryState; onState: (u: (s: LibraryState) => LibraryState) => void; openId?: string }) {
  const [items, setItems] = useState<Entry[] | null>(null);
  const [open, setOpen] = useState<{ id: string; title: string; body: any } | null>(null);
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const reload = () => api<{ items: Entry[] }>("/api/history/prompts").then((r) => { if (r.ok) setItems(r.data.items.filter((x) => x.id !== STATE_ID)); });
  useEffect(() => { reload(); }, []);
  useEffect(() => { if (openId) show(openId); }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function show(id: string) { const r = await api<{ item: { id: string; title: string; body: any } }>(`/api/history/prompts/${id}`); if (r.ok) setOpen(r.data.item); }
  async function del(id: string) { if (!window.confirm(t.confirmDel)) return; await api(`/api/history/prompts/${id}`, { method: "DELETE" }); if (open?.id === id) setOpen(null); reload(); }
  async function importFile(f: File) {
    try { const j = JSON.parse(await f.text()); if (j?.app !== "axto-prompts" && j?.v !== 4) throw new Error("bad"); onState((s) => mergeImport(s, sanitizeState(j))); setMsg(t.importDone); }
    catch { setMsg(t.importBad); }
  }
  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="card-pad">
        <p className="text-xs text-slate-500">{t.historySub}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => download("axto-prompt-library.json", exportJson(state), "application/json")} data-testid="pl-export">⬇️ {t.exportJson}</button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => file.current?.click()}>⬆️ {t.importJson}</button>
          <input ref={file} type="file" accept=".json,application/json" className="hidden" data-testid="pl-import" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
        </div>
        {msg ? <p className="mt-2 text-sm text-slate-700" data-testid="pl-import-msg">{msg}</p> : null}
        {!items ? <LoadingBlock /> : items.length ? (
          <ul className="mt-3 divide-y divide-slate-100" data-testid="pl-history">{items.map((x) => (
            <li key={x.id} className="flex items-center gap-2 py-1.5 text-sm">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => show(x.id)}><div className="truncate font-medium text-slate-800">{x.title}</div><div className="text-[11px] text-slate-500">{x.updatedAt.slice(0, 16).replace("T", " ")}{x.meta?.model ? ` · ${String(x.meta.model)}` : ""}</div></button>
              <button type="button" className="text-xs text-slate-400 hover:text-rose-600" onClick={() => del(x.id)} aria-label={`${t.del} ${x.title}`}>✕</button>
            </li>
          ))}</ul>
        ) : <p className="mt-3 text-sm text-slate-500">{t.historyEmpty}</p>}
      </section>
      <section className="card-pad" data-testid="pl-history-view">
        {open ? (
          <>
            <div className="flex items-center gap-2"><h3 className="min-w-0 flex-1 truncate font-bold text-slate-900">{open.title}</h3><CopyBtn text={String(open.body?.output || open.body?.filled || "")} label={`📋 ${t.copyOut}`} done={t.copied} /></div>
            {open.body?.values && Object.keys(open.body.values).length ? <p className="mt-1 text-xs text-slate-500">{Object.entries(open.body.values as Record<string, string>).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p> : null}
            {open.body?.output ? <div className="mt-3"><Markdown text={String(open.body.output)} className="prose-axto text-sm" /></div>
              : <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs">{String(open.body?.filled || "")}</pre>}
          </>
        ) : null}
      </section>
    </div>
  );
}
