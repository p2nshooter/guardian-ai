/* AXTO — Legal AI v4: deadline & limitation calculator with a per-matter list and calendar export. */
"use client";
import { useEffect, useMemo, useState } from "react";
import type { LegalToolsDict } from "@/lib/i18n-pages/legaltools";
import type { Lang } from "@/lib/i18n-shared";
import { LOCALE } from "@/lib/i18n-shared";
import {
  RULES, UNITS, ROLLS, HOLIDAY_COUNTRIES, compute, daysUntil, deadlinesCsv, getRule, parseIso, ruleCalendar, toIcs,
  type Deadline, type Direction, type HolidayCountry, type Roll, type Unit,
} from "@/lib/legal/deadlines";
import { localRule } from "@/lib/legal/catalog";
import { useLegalCatalog } from "@/lib/legal/use-catalog";
import { Alert } from "@/components/ui";
import { AiButton, ToolIntro, badge, download, fileSafe, type Handoff } from "./shared";

const HOLIDAYS_KEY = "axto_legal_holidays_v1";
const today = () => new Date().toISOString().slice(0, 10);

/** "2026-03-20 Idul Fitri" lines → { date: name } (invalid lines are ignored). */
function parseCustom(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of s.split("\n")) {
    const m = /^\s*(\d{4}-\d{2}-\d{2})\s*(.*)$/.exec(line);
    if (m && parseIso(m[1])) out[m[1]] = m[2].trim() || "Holiday";
  }
  return out;
}

export default function Deadlines({ t, lang, matterTitle, saved, canSave, onSave, onHandoff }: {
  t: LegalToolsDict; lang: Lang; matterTitle?: string; saved: Deadline[]; canSave: boolean;
  onSave: (list: Deadline[]) => Promise<string | null>; onHandoff: (h: Handoff) => void;
}) {
  const [ruleId, setRuleId] = useState("");
  const [f, setF] = useState({ title: "", trigger: today(), time: "09:00", amount: 14, unit: "days" as Unit, direction: "after" as Direction, roll: "following" as Roll, country: "ID" as HolidayCountry, remind: "7, 1", source: "" });
  const [customText, setCustomText] = useState("");
  const [list, setList] = useState<Deadline[]>(saved);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  useEffect(() => { setList(saved); }, [saved]);
  useEffect(() => { try { setCustomText(localStorage.getItem(HOLIDAYS_KEY) || ""); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(HOLIDAYS_KEY, customText); } catch {} }, [customText]);
  const custom = useMemo(() => parseCustom(customText), [customText]);
  // Rule names, triggers and notes in the member's language (the statute references stay as cited).
  const cat = useLegalCatalog(lang);
  const ruleOf = (id: string) => { const r = getRule(id); return r ? localRule(r, cat) : undefined; };
  const rule = ruleOf(ruleId);

  const result = useMemo(() => compute({
    trigger: f.unit === "hours" ? `${f.trigger}T${f.time || "00:00"}` : f.trigger,
    amount: f.amount, unit: f.unit, direction: f.direction, roll: f.roll, country: f.country, custom,
  }), [f, custom]);
  const ok = !("error" in result);

  function pickRule(id: string) {
    setRuleId(id);
    const r = ruleOf(id);
    if (r) setF((x) => ({ ...x, title: r.name, amount: r.amount, unit: r.unit, direction: r.direction, roll: r.roll, country: ruleCalendar(r), source: r.source }));
  }
  const fmt = (due: string) => {
    const d = parseIso(due);
    if (!d) return due;
    const date = d.toLocaleDateString(LOCALE[lang], { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    return due.includes("T") ? `${date}, ${due.slice(11, 16)}` : date;
  };
  const unitName = (u: Unit) => t.deadlines.units[u];

  async function persist(next: Deadline[]) {
    setList(next);
    if (!canSave) return;
    setStatus({ ok: true, msg: t.saving });
    const e = await onSave(next);
    setStatus(e ? { ok: false, msg: t.saveErr.replace("{msg}", e) } : { ok: true, msg: t.saved });
  }
  function add() {
    if (!ok || !("due" in result)) return;
    const d: Deadline = {
      id: `dl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title: f.title.trim() || rule?.name || t.deadlines.due,
      trigger: f.unit === "hours" ? `${f.trigger}T${f.time}` : f.trigger, amount: f.amount, unit: f.unit, direction: f.direction, roll: f.roll, country: f.country,
      due: result.due, source: f.source || undefined, remind: Array.from(new Set(f.remind.split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 365))).slice(0, 5),
      ruleId: rule?.id,
    };
    persist([...list, d].sort((a, b) => a.due.localeCompare(b.due)));
  }
  function toAi() {
    if (!ok || !("due" in result)) return;
    const lines = [
      `${f.title || rule?.name || "Deadline"}`, `Trigger: ${f.trigger}${f.unit === "hours" ? ` ${f.time}` : ""}`,
      `Period: ${f.amount} ${f.unit} ${f.direction}; closed-day rule: ${f.roll}; calendar: ${f.country}`,
      rule ? `Rule: ${rule.source}` : f.source ? `Source: ${f.source}` : "", `Computed due date: ${result.due}${result.rolled ? ` (period ends ${result.unrolled}, ${result.reason})` : ""}`,
    ].filter(Boolean).join("\n");
    onHandoff({ ws: "research", request: `${t.deadlines.aiRequest}\n\n${lines}` });
  }
  const left = (due: string) => {
    const n = daysUntil(due, today());
    if (n < 0) return { text: t.deadlines.overdue.replace("{n}", String(-n)), tone: "bg-rose-100 text-rose-800" };
    if (n === 0) return { text: t.deadlines.today, tone: "bg-rose-100 text-rose-800" };
    return { text: t.deadlines.left.replace("{n}", String(n)), tone: n <= 7 ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700" };
  };
  const byCountry = useMemo(() => Array.from(new Set(RULES.map((r) => r.country))), []);
  const name = matterTitle || t.deadlines.list;

  return (
    <section className="card-pad" data-testid="tool-deadlines">
      <ToolIntro t={t} hint={t.hints.deadlines} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <div className="space-y-3">
          <label className="block"><span className="label">{t.deadlines.preset}</span>
            <select className="select" value={ruleId} onChange={(e) => pickRule(e.target.value)} data-testid="dl-rule">
              <option value="">{t.deadlines.presetNone}</option>
              {byCountry.map((c) => <optgroup key={c} label={t.deadlines.regions[c as keyof typeof t.deadlines.regions] || c}>{RULES.filter((r) => r.country === c).map((r) => <option key={r.id} value={r.id}>{localRule(r, cat).name} — {r.amount} {unitName(r.unit)}</option>)}</optgroup>)}
            </select></label>
          {rule ? <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">📜 {rule.source}<br />⏱ {rule.trigger}{rule.note ? <><br />ℹ️ {rule.note}</> : null}</p> : null}
          <p className="text-[11px] text-slate-500">{t.deadlines.presetHint}</p>
          <label className="block"><span className="label">{t.deadlines.title}</span><input className="input" value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="dl-title" /></label>
          <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
            <label className="block"><span className="label">{t.deadlines.trigger}</span><input type="date" className="input" value={f.trigger} onChange={(e) => setF({ ...f, trigger: e.target.value })} data-testid="dl-trigger" /></label>
            {f.unit === "hours" ? <label className="block"><span className="label">{t.deadlines.triggerTime}</span><input type="time" className="input" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label> : null}
          </div>
          <div className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)] gap-3">
            <label className="block"><span className="label">{t.deadlines.amount}</span><input type="number" min={0} className="input" value={f.amount} onChange={(e) => setF({ ...f, amount: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} data-testid="dl-amount" /></label>
            <label className="block"><span className="label">&nbsp;</span><select className="select" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value as Unit })} data-testid="dl-unit">{UNITS.map((u) => <option key={u} value={u}>{unitName(u)}</option>)}</select></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
            <label className="block"><span className="label">{t.deadlines.direction}</span><select className="select" value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value as Direction })}>{(["after", "before"] as const).map((d) => <option key={d} value={d}>{t.deadlines.directions[d]}</option>)}</select></label>
            <label className="block"><span className="label">{t.deadlines.calendar}</span><select className="select" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value as HolidayCountry })} data-testid="dl-calendar">{HOLIDAY_COUNTRIES.map((c) => <option key={c} value={c}>{t.deadlines.calendars[c]}</option>)}</select></label>
          </div>
          {f.unit !== "hours" && f.unit !== "business" ? (
            <label className="block"><span className="label">{t.deadlines.roll}</span><select className="select" value={f.roll} onChange={(e) => setF({ ...f, roll: e.target.value as Roll })} data-testid="dl-roll">{ROLLS.map((r) => <option key={r} value={r}>{t.deadlines.rolls[r]}</option>)}</select></label>
          ) : null}
          <details className="rounded-lg border border-slate-200 p-2 text-sm" open={!!customText}>
            <summary className="cursor-pointer font-semibold">{t.deadlines.custom}</summary>
            <textarea className="textarea mt-2 font-mono text-xs" rows={4} value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder={"2026-03-20 Idul Fitri\n2026-03-21 Idul Fitri"} data-testid="dl-custom" />
            <p className="mt-1 text-[11px] text-slate-500">{t.deadlines.customHint}</p>
          </details>
        </div>

        <div>
          {ok && "due" in result ? (
            <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4" data-testid="dl-result">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{t.deadlines.due}</div>
              <div className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl" data-testid="dl-due">{fmt(result.due)}</div>
              <div className="mt-0.5 font-mono text-xs text-slate-500">{result.due}</div>
              {result.rolled ? <p className="mt-2 text-sm text-amber-900">↪ {t.deadlines.unrolled.replace("{date}", fmt(result.unrolled)).replace("{reason}", result.reason === "Weekend" ? t.deadlines.weekendReason : result.reason === "Holiday" ? t.deadlines.holidayReason : result.reason || "")}</p> : null}
              <p className="mt-2 text-xs text-slate-600">{t.deadlines.counted.replace("{n}", String(result.counted)).replace("{unit}", unitName(f.unit === "weeks" ? "days" : f.unit))}</p>
              <label className="mt-3 block"><span className="label">{t.deadlines.remind}</span><input className="input" value={f.remind} onChange={(e) => setF({ ...f, remind: e.target.value })} /></label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-primary btn-sm" onClick={add} data-testid="dl-add">＋ {t.deadlines.addToList}</button>
                <AiButton t={t} onClick={toAi} />
              </div>
            </div>
          ) : <Alert tone="warn">{t.deadlines.invalid}</Alert>}

          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">🗓️ {t.deadlines.list} {matterTitle ? <span className="font-normal text-slate-500">· {matterTitle}</span> : null}</h3>
              {list.length ? (
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${fileSafe(name)}-deadlines.ics`, toIcs(list, name), "text/calendar;charset=utf-8")} data-testid="dl-ics">📅 {t.ics}</button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => download(`${fileSafe(name)}-deadlines.csv`, deadlinesCsv(list), "text/csv;charset=utf-8")}>⬇️ {t.csv}</button>
                </div>
              ) : null}
            </div>
            {!canSave ? <p className="mb-2 text-xs text-amber-800">💾 {t.saveNeedsMatter}</p> : null}
            {status ? <p className={`mb-2 text-xs ${status.ok ? "text-emerald-700" : "text-rose-700"}`} data-testid="dl-status">{status.msg}</p> : null}
            {list.length ? (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200" data-testid="dl-list">
                {list.map((d) => {
                  const l = left(d.due);
                  return (
                    <li key={d.id} className={`flex items-start gap-3 px-3 py-2 text-sm ${d.done ? "opacity-60" : ""}`}>
                      <input type="checkbox" className="mt-1" checked={!!d.done} aria-label={t.deadlines.done} onChange={(e) => persist(list.map((x) => (x.id === d.id ? { ...x, done: e.target.checked } : x)))} />
                      <div className="min-w-0 flex-1">
                        <div className={`break-words font-medium ${d.done ? "line-through" : ""}`}>{d.title}</div>
                        <div className="text-xs text-slate-500">{fmt(d.due)}{d.source ? ` · ${d.source}` : ""}</div>
                      </div>
                      {!d.done ? <span className={`${badge} shrink-0 ${l.tone}`}>{l.text}</span> : null}
                      <button type="button" className="btn-ghost btn-sm text-rose-600" aria-label={t.del} onClick={() => persist(list.filter((x) => x.id !== d.id))}>✕</button>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-slate-500">{t.deadlines.empty}</p>}
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">{t.notAdvice}</p>
    </section>
  );
}
