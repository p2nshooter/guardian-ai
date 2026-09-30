/* AXTO — Legal AI v4: citation list — extract, open the source, mark each one checked. */
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LegalToolsDict } from "@/lib/i18n-pages/legaltools";
import { extractCitations, citationsCsv, citationsMarkdown, summary, CITE_STATUSES, type Citation, type CheckState, type CiteStatus } from "@/lib/legal/citations";
import type { CiteChecks } from "@/lib/legal/library";
import { Alert } from "@/components/ui";
import { AiButton, DocPicker, EMPTY_SEL, ToolIntro, badge, download, fileSafe, type DocSel, type Handoff, type ToolDoc } from "./shared";

const TONE: Record<CiteStatus, string> = { unchecked: "bg-slate-100 text-slate-700", verified: "bg-emerald-100 text-emerald-800", wrong: "bg-rose-100 text-rose-800", notfound: "bg-amber-100 text-amber-900" };

export default function Citations({ t, docs, lastAnswer, saved, canSave, onSave, onHandoff }: {
  t: LegalToolsDict; docs: ToolDoc[]; lastAnswer?: string; saved: CiteChecks; canSave: boolean;
  onSave: (checks: CiteChecks) => Promise<string | null>; onHandoff: (h: Handoff) => void;
}) {
  const [src, setSrc] = useState<DocSel>(lastAnswer ? { key: "__answer", name: t.lastAnswer, text: lastAnswer } : EMPTY_SEL);
  const [list, setList] = useState<Citation[] | null>(null);
  const [checks, setChecks] = useState<Record<string, CheckState>>(saved);
  const [filter, setFilter] = useState<CiteStatus | "">("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setChecks(saved); }, [saved]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function scan() { setList(extractCitations(src.text)); setFilter(""); }
  function setCheck(c: Citation, patch: Partial<CheckState>) {
    const next = { ...checks, [c.key]: { ...(checks[c.key] || { status: "unchecked" as const }), ...patch } };
    setChecks(next);
    if (!canSave) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus({ ok: true, msg: t.saving });
      const payload: CiteChecks = {};
      for (const [k, v] of Object.entries(next)) payload[k] = { ...v, text: list?.find((x) => x.key === k)?.text || (v as any).text };
      const e = await onSave(payload);
      setStatus(e ? { ok: false, msg: t.saveErr.replace("{msg}", e) } : { ok: true, msg: t.saved });
    }, 700);
  }
  const s = useMemo(() => (list ? summary(list, checks) : null), [list, checks]);
  const shown = (list || []).filter((c) => !filter || (checks[c.key]?.status || "unchecked") === filter);
  const title = `${t.tabs.citations}${src.name ? ` — ${src.name}` : ""}`;

  function toAi() {
    if (!list?.length) return;
    onHandoff({
      ws: "citation-check", fallback: "research", onlyDocs: true,
      request: `${t.citations.aiRequest}\n\n${list.map((c, i) => `${i + 1}. ${c.text} — ${c.context}`).join("\n").slice(0, 12_000)}`,
      docs: src.text.trim() ? [{ key: src.key && src.key !== "__answer" ? src.key : undefined, name: src.name || "Draft", text: src.text }] : [],
    });
  }

  return (
    <section className="card-pad" data-testid="tool-citations">
      <ToolIntro t={t} hint={t.hints.citations} />
      <DocPicker t={t} id="ct-src" label={t.source} docs={docs} lastAnswer={lastAnswer} value={src} onChange={setSrc} rows={7} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={scan} disabled={!src.text.trim()} data-testid="ct-scan">🔎 {t.citations.scan}</button>
      </div>
      <div className="mt-3"><Alert tone="warn">{t.citations.warn}</Alert></div>

      {list ? (
        <div className="mt-5 border-t border-slate-100 pt-5" data-testid="ct-result">
          {!list.length ? <p className="text-sm text-slate-500">{t.citations.none}</p> : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold" data-testid="ct-count">{t.citations.found.replace("{n}", String(list.length))}</p>
                  {s ? <p className="text-xs text-slate-500" data-testid="ct-summary">{t.citations.summary.replace("{verified}", String(s.verified)).replace("{wrong}", String(s.wrong)).replace("{notfound}", String(s.notfound)).replace("{unchecked}", String(s.unchecked))}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <select className="select py-1.5 text-xs" value={filter} onChange={(e) => setFilter(e.target.value as CiteStatus | "")} aria-label={t.citations.filter}>
                    <option value="">{t.redline.filterAll}</option>
                    {CITE_STATUSES.map((st) => <option key={st} value={st}>{t.citations.status[st]}</option>)}
                  </select>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${fileSafe(title)}.csv`, citationsCsv(list, checks), "text/csv;charset=utf-8")}>⬇️ {t.csv}</button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${fileSafe(title)}.md`, citationsMarkdown(list, checks, title), "text/markdown;charset=utf-8")}>⬇️ {t.md}</button>
                  <AiButton t={t} onClick={toAi} />
                </div>
              </div>
              {!canSave ? <p className="mt-2 text-xs text-amber-800">💾 {t.saveNeedsMatter}</p> : null}
              {status ? <p className={`mt-2 text-xs ${status.ok ? "text-emerald-700" : "text-rose-700"}`} data-testid="ct-status">{status.msg}</p> : null}
              <ul className="mt-3 space-y-2">
                {shown.map((c) => {
                  const st = checks[c.key]?.status || "unchecked";
                  return (
                    <li key={c.key} className="rounded-xl border border-slate-200 p-3" data-testid="ct-item">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 text-[13px] font-semibold text-slate-900">{c.text}</code>
                        <span className={`${badge} bg-sky-100 text-sky-800`}>{t.citations.kind[c.kind]}</span>
                        <span className={`${badge} bg-slate-100 text-slate-600`}>{c.jurisdiction}</span>
                        {c.count > 1 ? <span className="text-[11px] text-slate-500">{t.citations.times.replace("{n}", String(c.count))}</span> : null}
                        <span className={`${badge} ml-auto ${TONE[st]}`}>{t.citations.status[st]}</span>
                      </div>
                      <p className="mt-1 break-words text-xs text-slate-600">…{c.context}…</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">{t.citations.open}:</span>
                        {c.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-50">{l.label} ↗</a>)}
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
                        <select className="select py-1.5 text-sm" value={st} onChange={(e) => setCheck(c, { status: e.target.value as CiteStatus })} data-testid="ct-status-pick" aria-label={c.text}>
                          {CITE_STATUSES.map((x) => <option key={x} value={x}>{t.citations.status[x]}</option>)}
                        </select>
                        <input className="input py-1.5 text-sm" placeholder={t.citations.note} maxLength={500} value={checks[c.key]?.note || ""} onChange={(e) => setCheck(c, { note: e.target.value })} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <p className="mt-4 text-xs text-slate-500">{t.notAdvice}</p>
        </div>
      ) : null}
    </section>
  );
}
