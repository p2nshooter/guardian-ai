/* AXTO — Legal AI v4: ask the matter — BM25 search over every document, then an AI answer from the best passages only. */
"use client";
import { useMemo, useState } from "react";
import type { LegalToolsDict } from "@/lib/i18n-pages/legaltools";
import { buildIndex, search, excerptBundle, highlight, type Hit } from "@/lib/legal/retrieve";
import { Alert } from "@/components/ui";
import { AiButton, ToolIntro, type Handoff, type ToolDoc } from "./shared";

export default function AskMatter({ t, docs, matterTitle, onHandoff }: { t: LegalToolsDict; docs: ToolDoc[]; matterTitle?: string; onHandoff: (h: Handoff) => void }) {
  const ix = useMemo(() => buildIndex(docs.map((d) => ({ name: d.name, text: d.text }))), [docs]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const run = () => setHits(q.trim() ? search(ix, q, 12) : null);

  function toAi() {
    if (!hits?.length) return;
    onHandoff({
      ws: "ask", onlyDocs: true,
      request: `${t.ask.aiRequest}\n\n${t.ask.question}: ${q.trim()}`,
      docs: [{ name: `${matterTitle || "Matter"} — ${t.ask.results.replace("{n}", String(hits.length))}`, text: excerptBundle(hits) }],
    });
  }

  return (
    <section className="card-pad" data-testid="tool-ask">
      <ToolIntro t={t} hint={t.hints.ask} />
      {!docs.length ? <Alert tone="info">{t.ask.needDocs}</Alert> : (
        <>
          <p className="mb-2 text-xs text-slate-500" data-testid="ask-scope">{t.ask.docsIn.replace("{n}", String(docs.length)).replace("{p}", String(ix.passages.length))}</p>
          <label className="label" htmlFor="ask-q">{t.ask.question}</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="ask-q" className="input min-w-0 flex-1" value={q} placeholder={t.ask.questionPh} maxLength={500} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }} data-testid="ask-q" />
            <button type="button" className="btn-primary shrink-0" onClick={run} disabled={!q.trim()} data-testid="ask-search">🔎 {t.ask.search}</button>
          </div>
          {hits ? (
            <div className="mt-5" data-testid="ask-result">
              {!hits.length ? <p className="text-sm text-slate-500">{t.ask.none}</p> : (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{t.ask.results.replace("{n}", String(hits.length))}</p>
                    <AiButton t={t} onClick={toAi} label={t.ask.askAi} />
                  </div>
                  <ol className="space-y-2">
                    {hits.map((h) => (
                      <li key={`${h.doc}-${h.n}`} className="rounded-xl border border-slate-200 p-3" data-testid="ask-hit">
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="rounded bg-ink-900 px-1.5 py-0.5 font-mono font-semibold text-white">{t.ask.passage.replace("{doc}", String(h.doc)).replace("{n}", String(h.n))}</span>
                          <span className="min-w-0 truncate font-semibold text-slate-600">📄 {h.docName}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                          {highlight(h.text, h.terms).map((p, i) => (p.hit ? <mark key={i} className="rounded bg-amber-100 px-0.5">{p.s}</mark> : <span key={i}>{p.s}</span>))}
                        </p>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
