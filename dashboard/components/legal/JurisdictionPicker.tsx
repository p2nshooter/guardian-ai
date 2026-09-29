/* Country → state/province/special regime → city picker for Legal AI.
 * Country names are localised by the browser (Intl.DisplayNames). */
"use client";
import { pick, type Lang } from "@/lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { flag, type Country, type Subdivision } from "@/lib/legal/jurisdictions";
import { T } from "@/lib/i18n-pages/jurisdiction";

export interface JurValue { country: string; sub?: string; city?: string }

const REGIONS: Record<string, [string, string]> = {
  supranational: ["International & EU", "Internasional & UE"], asia: ["Asia", "Asia"], "middle-east": ["Middle East", "Timur Tengah"],
  europe: ["Europe", "Eropa"], americas: ["Americas", "Amerika"], africa: ["Africa", "Afrika"], oceania: ["Oceania", "Oseania"],
};
export function countryName(c: Country, lang: Lang): string {
  if (c.code.length !== 2 || c.code === "XK" && lang === "en") return c.name;
  try {
    const n = new Intl.DisplayNames([lang], { type: "region" }).of(c.code);
    return n && n !== c.code ? n : c.name;
  } catch { return c.name; }
}

export default function JurisdictionPicker({ countries, subdivisions, value, onChange, lang, locked = false }: {
  countries: Country[]; subdivisions: Record<string, Subdivision[]>; value: JurValue; onChange: (v: JurValue) => void; lang: Lang; locked?: boolean;
}) {
  const t = pick(T, lang);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const current = countries.find((c) => c.code === value.country);
  const subs = subdivisions[value.country] || [];
  const sub = subs.find((s) => s.code === value.sub);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const named = countries.map((c) => ({ c, label: countryName(c, lang) }));
    const hits = needle ? named.filter((x) => x.label.toLowerCase().includes(needle) || x.c.name.toLowerCase().includes(needle) || x.c.code.toLowerCase() === needle) : named;
    const by: Record<string, typeof hits> = {};
    for (const h of hits) (by[h.c.region] ||= []).push(h);
    return Object.entries(REGIONS).map(([id, names]) => ({ id, name: names[lang === "id" ? 1 : 0], items: (by[id] || []).sort((a, b) => a.label.localeCompare(b.label)) })).filter((g) => g.items.length);
  }, [countries, q, lang]);

  if (locked) {
    const label = [value.city, sub?.name, current ? countryName(current, lang) : value.country].filter(Boolean).join(", ");
    return (
      <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-sm">
        <span aria-hidden="true">🔒</span>
        <span className="font-semibold text-slate-900">{current ? flag(current.code) : ""} {label || "—"}</span>
        <span className="ml-auto text-xs text-slate-500">{t.locked}</span>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div ref={box} className="relative">
        <span className="label">{t.country}</span>
        <button type="button" className="input flex items-center justify-between text-left" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
          <span className="truncate">{current ? `${flag(current.code)}  ${countryName(current, lang)}` : "—"}</span>
          <span className="text-slate-400">▾</span>
        </button>
        {open ? (
          <div className="absolute z-30 mt-1 w-[min(22rem,90vw)] rounded-xl border border-slate-200 bg-white p-2 shadow-lift">
            <input autoFocus className="input mb-2" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="max-h-72 overflow-y-auto" role="listbox">
              {groups.length ? groups.map((g) => (
                <div key={g.id} className="mb-1">
                  <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.name}</div>
                  {g.items.map(({ c, label }) => (
                    <button key={c.code} type="button" role="option" aria-selected={c.code === value.country}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${c.code === value.country ? "bg-brand-50 text-brand-800" : "hover:bg-slate-50"}`}
                      onClick={() => { onChange({ country: c.code }); setOpen(false); setQ(""); }}>
                      <span className="w-6 text-center">{flag(c.code)}</span>
                      <span className="flex-1 truncate">{label}</span>
                      {(subdivisions[c.code] || []).length ? <span className="text-[10px] font-semibold text-slate-400">{subdivisions[c.code].length}</span> : null}
                    </button>
                  ))}
                </div>
              )) : <div className="px-2 py-3 text-sm text-slate-500">{t.none}</div>}
            </div>
          </div>
        ) : null}
      </div>
      <label>
        <span className="label">{t.sub}</span>
        <select className="select" value={value.sub || ""} disabled={!subs.length} onChange={(e) => onChange({ ...value, sub: e.target.value || undefined })}>
          <option value="">{t.allSub}</option>
          {subs.map((s) => <option key={s.code} value={s.code}>{s.name}{s.note ? " ★" : ""}</option>)}
        </select>
      </label>
      <label>
        <span className="label">{t.city}</span>
        <input className="input" value={value.city || ""} maxLength={80} placeholder={t.cityPh} onChange={(e) => onChange({ ...value, city: e.target.value || undefined })} />
      </label>
      {sub?.note ? <p className="text-xs text-amber-800 sm:col-span-3">★ {sub.note}</p> : null}
    </div>
  );
}
