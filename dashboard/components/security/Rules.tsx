/* SECURITY ANALYST v4 — detection rules generated from the case: Sigma, KQL,
 * SPL, YARA and Suricata, with copy / download and "ask the AI to improve". */
"use client";
import { useMemo, useState } from "react";
import type { Case, Computed } from "@/lib/security/case";
import { RULE_LANGS, generate, type RuleLang } from "@/lib/security/rules";
import type { SecurityDict } from "@/lib/i18n-pages/security";
import { CopyBtn, download, slugName } from "./shared";

const EXT: Record<RuleLang, string> = { sigma: "yml", kql: "kql", spl: "spl", yara: "yar", suricata: "rules" };
const NAME: Record<RuleLang, string> = { sigma: "Sigma", kql: "KQL", spl: "SPL", yara: "YARA", suricata: "Suricata" };

export default function Rules({ t, c, k, onAsk }: { t: SecurityDict; c: Case; k: Computed; onAsk: (text: string) => void }) {
  const [lang, setLang] = useState<RuleLang>("sigma");
  const text = useMemo(() => generate(lang, { title: c.title || t.untitled, iocs: k.iocs, detections: k.detections }), [lang, c.title, k.iocs, k.detections, t.untitled]);
  return (
    <div className="card-pad">
      <p className="text-sm text-slate-600">{t.rulesSub}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        {RULE_LANGS.map((l) => <button key={l} type="button" onClick={() => setLang(l)} data-testid={`sec-rule-${l}`} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${lang === l ? "bg-ink-950 text-white" : "bg-slate-100 text-slate-700"}`}>{NAME[l]}</button>)}
        <span className="ml-auto flex gap-2">
          <CopyBtn text={text} label={`📋 ${t.copy}`} done={t.copied} className="btn-secondary btn-sm" />
          <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${slugName(c.title)}.${EXT[lang]}`, text)}>⬇️ {t.download}</button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => onAsk(`Improve and extend this ${NAME[lang]} detection content for the case. Keep it defensive and explain false positives:\n\n\`\`\`\n${text}\n\`\`\``)}>🤖 {t.improveAi}</button>
        </span>
      </div>
      <pre className="mt-3 max-h-[65vh] overflow-auto rounded-lg bg-ink-950 p-4 font-mono text-xs leading-relaxed text-emerald-100" data-testid="sec-rule-text">{text}</pre>
    </div>
  );
}
