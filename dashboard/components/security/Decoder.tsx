/* SECURITY ANALYST v4 — Decoder (CyberChef-style): a recipe of operations
 * over the input, Magic auto-detection, text / hex output, and "add the
 * output as evidence". Decoding only — nothing is executed. */
"use client";
import { useEffect, useState } from "react";
import { OPS, magic, runRecipe, utf8, type Op, type OpId, type Step } from "@/lib/security/decode";
import type { SecurityDict } from "@/lib/i18n-pages/security";
import { CopyBtn } from "./shared";

export default function Decoder({ t, onEvidence }: { t: SecurityDict; onEvidence: (name: string, text: string) => void }) {
  const [input, setInput] = useState("");
  const [recipe, setRecipe] = useState<Op[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [hex, setHex] = useState(false);
  const [adding, setAdding] = useState<OpId>("fromBase64");

  useEffect(() => { let live = true; runRecipe(input, recipe).then((s) => { if (live) setSteps(s); }); return () => { live = false; }; }, [input, recipe]);
  const last = steps.length ? steps[steps.length - 1] : null;
  const failed = steps.find((s) => !s.ok);
  const outBytes = last ? (failed ? steps[steps.length - 1].output : last.output) : new TextEncoder().encode(input);
  const out = hex ? Array.from(outBytes.slice(0, 20000), (b) => b.toString(16).padStart(2, "0")).join(" ") : utf8(outBytes);
  const add = () => { const def = OPS.find((o) => o.id === adding); setRecipe([...recipe, { id: adding, arg: def?.argDefault }]); };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)]">
      <section className="card-pad min-w-0">
        <div className="flex items-center gap-2"><h3 className="font-bold text-slate-900">{t.decoderInput}</h3>
          <button type="button" className="btn-primary btn-sm ml-auto" title={t.magicHint} data-testid="sec-magic" onClick={async () => { const m = await magic(input); setRecipe(m.recipe); }}>✨ {t.magic}</button></div>
        <textarea className="textarea mt-2 min-h-[320px] w-full font-mono text-xs" placeholder={t.decoderPh} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} data-testid="sec-decoder-in" />
      </section>
      <section className="card-pad min-w-0">
        <h3 className="font-bold text-slate-900">{t.recipe}</h3>
        <ol className="mt-2 space-y-1.5" data-testid="sec-recipe">
          {recipe.map((op, i) => {
            const def = OPS.find((o) => o.id === op.id);
            const st = steps[i];
            return (
              <li key={i} className={`rounded-lg border px-2 py-1.5 text-sm ${st && !st.ok ? "border-rose-300 bg-rose-50" : "border-slate-200"}`}>
                <div className="flex items-center gap-2"><span className="font-semibold text-slate-800">{i + 1}. {(t.opNames as Record<string, string>)[op.id] || op.id}</span>
                  <button type="button" className="ml-auto text-slate-400 hover:text-rose-600" onClick={() => setRecipe(recipe.filter((_, j) => j !== i))} aria-label={t.remove}>✕</button></div>
                {def?.arg ? <input className="input mt-1 py-1 font-mono text-xs" value={op.arg || ""} onChange={(e) => setRecipe(recipe.map((x, j) => (j === i ? { ...x, arg: e.target.value } : x)))} aria-label={def.arg} /> : null}
                {st && !st.ok ? <div className="mt-1 text-xs text-rose-700">{t.stepFailed.replace("{msg}", st.error || "")}</div> : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex gap-2">
          <select className="select flex-1 text-sm" value={adding} onChange={(e) => setAdding(e.target.value as OpId)} aria-label={t.addOp}>
            {OPS.map((o) => <option key={o.id} value={o.id}>{(t.opNames as Record<string, string>)[o.id] || o.id}</option>)}
          </select>
          <button type="button" className="btn-secondary btn-sm" onClick={add} data-testid="sec-add-op">＋</button>
        </div>
      </section>
      <section className="card-pad min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-slate-900">{t.output}</h3>
          <div className="ml-auto inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
            <button type="button" className={`rounded px-2 py-0.5 ${!hex ? "bg-slate-900 text-white" : ""}`} onClick={() => setHex(false)}>{t.asText}</button>
            <button type="button" className={`rounded px-2 py-0.5 ${hex ? "bg-slate-900 text-white" : ""}`} onClick={() => setHex(true)}>{t.asHex}</button>
          </div>
        </div>
        <pre className="mt-2 min-h-[320px] max-h-[60vh] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800" data-testid="sec-decoder-out">{out}</pre>
        <div className="mt-2 flex flex-wrap gap-2">
          <CopyBtn text={out} label={`📋 ${t.copy}`} done={t.copied} />
          <button type="button" className="btn-secondary btn-sm" disabled={!out.trim()} onClick={() => onEvidence(`decoded-${Date.now().toString(36)}.txt`, utf8(outBytes))}>＋ {t.toEvidence}</button>
        </div>
      </section>
    </div>
  );
}
