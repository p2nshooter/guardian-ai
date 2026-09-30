/* AXTO — Legal AI v4: redline two versions of a contract, clause by clause, on the device. */
"use client";
import { useMemo, useState } from "react";
import type { LegalToolsDict } from "@/lib/i18n-pages/legaltools";
import { redline, redlineHtml, redlineMarkdown, type ClauseDiff, type Redline as R } from "@/lib/legal/redline";
import { markdownToDocx } from "@/lib/export/docx";
import { Alert } from "@/components/ui";
import { AiButton, DocPicker, EMPTY_SEL, ToolIntro, badge, download, fileSafe, type DocSel, type Handoff, type ToolDoc } from "./shared";

const STATUS_TONE: Record<ClauseDiff["status"], string> = {
  same: "bg-slate-100 text-slate-600", changed: "bg-amber-100 text-amber-900", added: "bg-emerald-100 text-emerald-800", removed: "bg-rose-100 text-rose-800",
};

export default function Redline({ t, docs, lastAnswer, onHandoff }: { t: LegalToolsDict; docs: ToolDoc[]; lastAnswer?: string; onHandoff: (h: Handoff) => void }) {
  const [a, setA] = useState<DocSel>(EMPTY_SEL);
  const [b, setB] = useState<DocSel>(EMPTY_SEL);
  const [res, setRes] = useState<R | null>(null);
  const [filter, setFilter] = useState<"all" | "changed" | "material">("changed");
  const [err, setErr] = useState("");
  const title = `${a.name || t.redline.original} → ${b.name || t.redline.revised}`;

  function compare() {
    if (!a.text.trim() || !b.text.trim()) { setErr(t.redline.needBoth); setRes(null); return; }
    setErr("");
    setRes(redline(a.text, b.text));
  }
  const shown = useMemo(() => (res?.clauses || []).filter((d) =>
    filter === "all" || (filter === "changed" ? d.status !== "same" : d.flags.some((f) => f !== "added" && f !== "removed") || d.status === "added" || d.status === "removed")), [res, filter]);

  function toAi() {
    if (!res) return;
    onHandoff({
      ws: "doc-compare", fallback: "ask", onlyDocs: true,
      request: `${t.redline.aiRequest}\n\n${redlineMarkdown(res, title, 12_000)}`,
      docs: [{ key: a.key || undefined, name: `${t.redline.original}${a.name ? ` — ${a.name}` : ""}`, text: a.text }, { key: b.key || undefined, name: `${t.redline.revised}${b.name ? ` — ${b.name}` : ""}`, text: b.text }],
    });
  }

  return (
    <section className="card-pad" data-testid="tool-redline">
      <ToolIntro t={t} hint={t.hints.redline} />
      <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
        <DocPicker t={t} id="rl-a" label={`① ${t.redline.original}`} docs={docs} lastAnswer={lastAnswer} value={a} onChange={setA} />
        <DocPicker t={t} id="rl-b" label={`② ${t.redline.revised}`} docs={docs} lastAnswer={lastAnswer} value={b} onChange={setB} />
      </div>
      {!docs.length ? <p className="mt-2 text-xs text-slate-500">{t.noDocs}</p> : null}
      {err ? <div className="mt-3"><Alert tone="error">{err}</Alert></div> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={compare} data-testid="rl-compare">🆚 {t.redline.compare}</button>
        {res ? <button type="button" className="btn-ghost" onClick={() => { setRes(null); setA(EMPTY_SEL); setB(EMPTY_SEL); }}>{t.clear}</button> : null}
      </div>

      {res ? (
        <div className="mt-6 border-t border-slate-100 pt-5" data-testid="rl-result">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 [&>*]:min-w-0">
            {([["changed", res.stats.changed], ["added", res.stats.added], ["removed", res.stats.removed], ["material", res.stats.material], ["same", res.stats.same]] as const).map(([k, n]) => (
              <div key={k} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.redline[k]}</div>
                <div className="text-xl font-bold" data-testid={`rl-stat-${k}`}>{n}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t.redline.words.replace("{added}", String(res.stats.wordsAdded)).replace("{removed}", String(res.stats.wordsRemoved))}</p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              {(["changed", "material", "all"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-md px-2.5 py-1 ${filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
                  {f === "all" ? t.redline.filterAll : f === "changed" ? t.redline.filterChanged : t.redline.filterMaterial}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${fileSafe(title)}-redline.html`, redlineHtml(res, title), "text/html;charset=utf-8")}>⬇️ {t.redline.html}</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${fileSafe(title)}-redline.docx`, markdownToDocx(redlineMarkdown(res, title), { title, subtitle: t.tabs.redline, footer: t.notAdvice }))}>📝 {t.word}</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${fileSafe(title)}-redline.md`, redlineMarkdown(res, title), "text/markdown;charset=utf-8")}>⬇️ {t.md}</button>
              <AiButton t={t} onClick={toAi} />
            </div>
          </div>

          {!res.stats.changed && !res.stats.added && !res.stats.removed ? <div className="mt-4"><Alert tone="success">{t.redline.identical}</Alert></div> : null}
          <div className="mt-4 space-y-3">
            {shown.map((d, i) => {
              const c = d.b || d.a!;
              return (
                <article key={i} className="rounded-xl border border-slate-200 p-3 sm:p-4" data-testid="rl-clause">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <h3 className="mr-1 min-w-0 break-words text-sm font-semibold">{c.number ? `${c.number} ` : ""}{c.heading || c.text.slice(0, 60)}</h3>
                    <span className={`${badge} ${STATUS_TONE[d.status]}`}>{t.redline[d.status]}</span>
                    {d.moved ? <span className={`${badge} bg-sky-100 text-sky-800`}>↕ {t.redline.moved}</span> : null}
                    {d.flags.filter((f) => f !== "added" && f !== "removed").map((f) => <span key={f} className={`${badge} bg-violet-100 text-violet-800`}>⚑ {(t.redline.flags as Record<string, string>)[f] || f}</span>)}
                  </div>
                  <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${d.status === "same" ? "text-slate-500" : "text-slate-800"}`}>
                    {d.ops.map((o, j) => o.t === "eq" ? <span key={j}>{o.s}</span>
                      : o.t === "ins" ? <ins key={j} className="rounded bg-emerald-100 text-emerald-900 underline decoration-emerald-500">{o.s}</ins>
                        : <del key={j} className="rounded bg-rose-100 text-rose-900">{o.s}</del>)}
                  </p>
                </article>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate-500">{t.notAdvice}</p>
        </div>
      ) : null}
    </section>
  );
}
