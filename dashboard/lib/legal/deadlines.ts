/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * LEGAL AI — DEADLINE & LIMITATION CALCULATOR (runs in the browser).
 *
 * A period is counted from a trigger date (the day of the event is not
 * counted), in calendar days, business days, weeks, months, years or hours.
 * If it ends on a weekend or public holiday it can roll to the next (or
 * previous) business day. Public holidays that follow a fixed rule are
 * computed for ID, US, GB (England & Wales), SG and AU; holidays set each year
 * by decree (lunar and religious dates, collective leave) are added by the
 * member as custom dates — we never guess them.
 * ============================================================================ */

export type Unit = "days" | "business" | "weeks" | "months" | "years" | "hours";
export type Roll = "following" | "preceding" | "modified" | "none";
export type Direction = "after" | "before";
export type HolidayCountry = "ID" | "US" | "GB" | "SG" | "AU" | "none";

export const UNITS: Unit[] = ["days", "business", "weeks", "months", "years", "hours"];
export const ROLLS: Roll[] = ["following", "preceding", "modified", "none"];
export const HOLIDAY_COUNTRIES: HolidayCountry[] = ["ID", "US", "GB", "SG", "AU", "none"];

export interface Rule {
  id: string; country: string; name: string; amount: number; unit: Unit; direction: Direction; roll: Roll;
  trigger: string; source: string; note?: string;
}
export interface Deadline {
  id: string; title: string; trigger: string; amount: number; unit: Unit; direction: Direction; roll: Roll;
  country: HolidayCountry; due: string; source?: string; notes?: string; done?: boolean; remind: number[]; ruleId?: string;
}
export interface Computed { due: string; unrolled: string; rolled: boolean; reason?: string; counted: number }

// ── dates (UTC, ISO yyyy-mm-dd) ──
const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const parseIso = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(String(s || "").trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
};
const ymd = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const dow = (d: Date) => d.getUTCDay();
/** n-th weekday (0=Sun) of a month; n = -1 for the last one. */
function nthWeekday(y: number, m: number, weekday: number, n: number): Date {
  if (n > 0) { const first = ymd(y, m, 1); return addDays(first, ((weekday - dow(first) + 7) % 7) + (n - 1) * 7); }
  const last = ymd(y, m + 1, 0);
  return addDays(last, -((dow(last) - weekday + 7) % 7));
}

/** Western (Gregorian) Easter Sunday — anonymous Gregorian algorithm. */
export function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(y, month, day);
}

const cache = new Map<string, Map<string, string>>();
/** Public holidays with a fixed rule (date → name). Decreed dates come from `custom`. */
export function holidays(country: HolidayCountry, year: number): Map<string, string> {
  const key = `${country}:${year}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = new Map<string, string>();
  const add = (d: Date, name: string) => { if (!out.has(iso(d))) out.set(iso(d), name); };
  const e = easter(year);
  // Substitute day for a weekend holiday: the next weekday that is not already a holiday.
  const substitute = (d: Date, name: string, satToFri = false) => {
    if (dow(d) === 6 && satToFri) { add(addDays(d, -1), `${name} (observed)`); return; }
    if (dow(d) !== 0 && dow(d) !== 6) return;
    let s = addDays(d, 1);
    while (dow(s) === 0 || dow(s) === 6 || out.has(iso(s))) s = addDays(s, 1);
    add(s, `${name} (substitute)`);
  };
  if (country === "ID") {
    add(ymd(year, 1, 1), "Tahun Baru Masehi");
    add(addDays(e, -2), "Wafat Yesus Kristus (Jumat Agung)");
    add(e, "Kebangkitan Yesus Kristus (Paskah)");
    add(ymd(year, 5, 1), "Hari Buruh Internasional");
    add(addDays(e, 39), "Kenaikan Yesus Kristus");
    add(ymd(year, 6, 1), "Hari Lahir Pancasila");
    add(ymd(year, 8, 17), "Hari Kemerdekaan RI");
    add(ymd(year, 12, 25), "Hari Raya Natal");
  } else if (country === "US") {
    // Federal holidays (5 U.S.C. § 6103); a Saturday holiday is observed on Friday, a Sunday one on Monday.
    const fixed: [number, number, string][] = [[1, 1, "New Year's Day"], [6, 19, "Juneteenth"], [7, 4, "Independence Day"], [11, 11, "Veterans Day"], [12, 25, "Christmas Day"]];
    for (const [m, d, n] of fixed) { const x = ymd(year, m, d); add(x, n); if (dow(x) === 6) add(addDays(x, -1), `${n} (observed)`); if (dow(x) === 0) add(addDays(x, 1), `${n} (observed)`); }
    add(nthWeekday(year, 1, 1, 3), "Martin Luther King Jr. Day");
    add(nthWeekday(year, 2, 1, 3), "Washington's Birthday");
    add(nthWeekday(year, 5, 1, -1), "Memorial Day");
    add(nthWeekday(year, 9, 1, 1), "Labor Day");
    add(nthWeekday(year, 10, 1, 2), "Columbus Day");
    add(nthWeekday(year, 11, 4, 4), "Thanksgiving Day");
    // New Year's Day of next year observed on 31 Dec when it falls on a Saturday.
    if (dow(ymd(year + 1, 1, 1)) === 6) add(ymd(year, 12, 31), "New Year's Day (observed)");
  } else if (country === "GB") {
    // England & Wales bank holidays (Banking and Financial Dealings Act 1971 + royal proclamation).
    add(ymd(year, 1, 1), "New Year's Day"); substitute(ymd(year, 1, 1), "New Year's Day");
    add(addDays(e, -2), "Good Friday");
    add(addDays(e, 1), "Easter Monday");
    add(nthWeekday(year, 5, 1, 1), "Early May bank holiday");
    add(nthWeekday(year, 5, 1, -1), "Spring bank holiday");
    add(nthWeekday(year, 8, 1, -1), "Summer bank holiday");
    add(ymd(year, 12, 25), "Christmas Day"); add(ymd(year, 12, 26), "Boxing Day");
    substitute(ymd(year, 12, 25), "Christmas Day"); substitute(ymd(year, 12, 26), "Boxing Day");
  } else if (country === "SG") {
    // Holidays Act 1998: a Sunday holiday moves to Monday. Lunar and religious dates are gazetted yearly.
    for (const [d, n] of [[ymd(year, 1, 1), "New Year's Day"], [ymd(year, 5, 1), "Labour Day"], [ymd(year, 8, 9), "National Day"], [ymd(year, 12, 25), "Christmas Day"]] as [Date, string][]) {
      add(d, n); if (dow(d) === 0) add(addDays(d, 1), `${n} (observed)`);
    }
    add(addDays(e, -2), "Good Friday");
  } else if (country === "AU") {
    // National public holidays; each state adds its own (add them as custom dates).
    add(ymd(year, 1, 1), "New Year's Day"); substitute(ymd(year, 1, 1), "New Year's Day");
    add(ymd(year, 1, 26), "Australia Day"); substitute(ymd(year, 1, 26), "Australia Day");
    add(addDays(e, -2), "Good Friday");
    add(addDays(e, 1), "Easter Monday");
    add(ymd(year, 4, 25), "Anzac Day");
    add(ymd(year, 12, 25), "Christmas Day"); add(ymd(year, 12, 26), "Boxing Day");
    substitute(ymd(year, 12, 25), "Christmas Day"); substitute(ymd(year, 12, 26), "Boxing Day");
  }
  cache.set(key, out);
  return out;
}

export interface Calendar { country: HolidayCountry; custom?: Record<string, string>; weekend?: number[] }

/** Why a date is not a business day ("" when it is one). */
export function closedReason(d: Date, cal: Calendar): string {
  const k = iso(d);
  if (cal.custom?.[k] !== undefined) return cal.custom[k] || "Holiday";
  if ((cal.weekend || [0, 6]).includes(dow(d))) return "Weekend";
  return cal.country === "none" ? "" : holidays(cal.country, d.getUTCFullYear()).get(k) || "";
}
export const isBusinessDay = (d: Date, cal: Calendar) => !closedReason(d, cal);

/** Add months keeping the day, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb). */
function addMonths(d: Date, n: number): Date {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + n, day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, last), d.getUTCHours(), d.getUTCMinutes()));
}

/** Move a closed day to a business day. "modified" = following unless that crosses into the next month. */
function rollDate(d: Date, roll: Roll, cal: Calendar): Date {
  if (roll === "none" || isBusinessDay(d, cal)) return d;
  const step = (x: Date, dir: 1 | -1) => { let y = x; for (let i = 0; i < 60 && !isBusinessDay(y, cal); i++) y = addDays(y, dir); return y; };
  if (roll === "preceding") return step(d, -1);
  const f = step(d, 1);
  return roll === "modified" && f.getUTCMonth() !== d.getUTCMonth() ? step(d, -1) : f;
}

export const MAX_AMOUNT: Record<Unit, number> = { days: 20000, business: 5000, weeks: 3000, months: 1200, years: 100, hours: 20000 };

/** Compute a due date. The trigger day itself is not counted. */
export function compute(input: { trigger: string; amount: number; unit: Unit; direction?: Direction; roll?: Roll } & Calendar): Computed | { error: string } {
  const start = parseIso(input.trigger);
  if (!start) return { error: "Enter a valid trigger date." };
  const n = Math.floor(Number(input.amount));
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT[input.unit]) return { error: "Enter a valid period." };
  const sign = input.direction === "before" ? -1 : 1;
  const cal: Calendar = { country: input.country, custom: input.custom, weekend: input.weekend };
  let end: Date;
  let counted = n;
  if (input.unit === "hours") end = new Date(start.getTime() + sign * n * 3_600_000);
  else if (input.unit === "days") end = addDays(start, sign * n);
  else if (input.unit === "weeks") { end = addDays(start, sign * n * 7); counted = n * 7; }
  else if (input.unit === "months") end = addMonths(start, sign * n);
  else if (input.unit === "years") end = addMonths(start, sign * n * 12);
  else {
    end = start;
    for (let left = n; left > 0;) { end = addDays(end, sign); if (isBusinessDay(end, cal)) left--; }
  }
  const fmt = (d: Date) => (input.unit === "hours" ? `${iso(d)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : iso(d));
  const roll = input.unit === "hours" || input.unit === "business" ? "none" : input.roll || "following";
  const rolled = rollDate(end, roll, cal);
  const moved = rolled.getTime() !== end.getTime();
  return { due: fmt(rolled), unrolled: fmt(end), rolled: moved, reason: moved ? closedReason(end, cal) : undefined, counted };
}

/** Whole days from `today` to `due` (negative = overdue). */
export function daysUntil(due: string, today: string): number {
  const a = parseIso(today.slice(0, 10)), b = parseIso(due.slice(0, 10));
  return a && b ? Math.round((b.getTime() - a.getTime()) / 86_400_000) : 0;
}

// ── presets (starting points — always check the current rule and any court order) ──
export const RULES: Rule[] = [
  // Indonesia
  { id: "id-banding-perdata", country: "ID", name: "Appeal — civil case (banding)", amount: 14, unit: "days", direction: "after", roll: "following", trigger: "Judgment pronounced or served", source: "UU No. 20 Tahun 1947 Pasal 7 ayat (1)" },
  { id: "id-kasasi-perdata", country: "ID", name: "Cassation — civil case (kasasi)", amount: 14, unit: "days", direction: "after", roll: "following", trigger: "Appeal judgment served", source: "UU No. 14 Tahun 1985 jo. UU No. 5 Tahun 2004 Pasal 46 ayat (1)" },
  { id: "id-pk", country: "ID", name: "Case review (peninjauan kembali)", amount: 180, unit: "days", direction: "after", roll: "following", trigger: "Judgment becomes final / new evidence (novum) found", source: "UU No. 14 Tahun 1985 Pasal 69", note: "The start depends on the ground for review (Article 67)." },
  { id: "id-verzet", country: "ID", name: "Opposition to a default judgment (verzet)", amount: 14, unit: "days", direction: "after", roll: "following", trigger: "Default judgment served", source: "HIR Pasal 129 ayat (2)" },
  { id: "id-ptun", country: "ID", name: "Administrative court claim (gugatan TUN)", amount: 90, unit: "days", direction: "after", roll: "following", trigger: "Administrative decision received or announced", source: "UU No. 5 Tahun 1986 Pasal 55" },
  { id: "id-pdp-breach", country: "ID", name: "Personal-data breach notification (UU PDP)", amount: 72, unit: "hours", direction: "after", roll: "none", trigger: "Data-protection failure discovered", source: "UU No. 27 Tahun 2022 (PDP) Pasal 46 ayat (1) — 3 × 24 jam" },
  { id: "id-daluwarsa-30", country: "ID", name: "General limitation of civil claims (daluwarsa)", amount: 30, unit: "years", direction: "after", roll: "none", trigger: "Right of action arises", source: "KUHPerdata Pasal 1967" },
  // United States (federal)
  { id: "us-answer", country: "US", name: "Answer to complaint", amount: 21, unit: "days", direction: "after", roll: "following", trigger: "Service of summons and complaint", source: "Fed. R. Civ. P. 12(a)(1)(A)(i); time computed under Rule 6(a)", note: "60 days if service was waived (Rule 12(a)(1)(A)(ii))." },
  { id: "us-new-trial", country: "US", name: "Motion for a new trial / to alter judgment", amount: 28, unit: "days", direction: "after", roll: "following", trigger: "Entry of judgment", source: "Fed. R. Civ. P. 59(b), 59(e)" },
  { id: "us-appeal", country: "US", name: "Notice of appeal (civil)", amount: 30, unit: "days", direction: "after", roll: "following", trigger: "Entry of judgment or order", source: "Fed. R. App. P. 4(a)(1)(A)", note: "60 days when the United States is a party (Rule 4(a)(1)(B))." },
  // England & Wales
  { id: "gb-aos", country: "GB", name: "Acknowledgment of service", amount: 14, unit: "days", direction: "after", roll: "following", trigger: "Service of particulars of claim", source: "CPR 10.3(1)" },
  { id: "gb-defence", country: "GB", name: "Defence (acknowledgment filed)", amount: 28, unit: "days", direction: "after", roll: "following", trigger: "Service of particulars of claim", source: "CPR 15.4(1)(b)" },
  { id: "gb-appeal", country: "GB", name: "Appellant's notice", amount: 21, unit: "days", direction: "after", roll: "following", trigger: "Date of the decision", source: "CPR 52.12(2)(b)", note: "Unless the lower court directs another period." },
  { id: "gb-limitation-contract", country: "GB", name: "Limitation — simple contract / tort", amount: 6, unit: "years", direction: "after", roll: "none", trigger: "Cause of action accrues", source: "Limitation Act 1980, ss 2 and 5" },
  { id: "gb-limitation-pi", country: "GB", name: "Limitation — personal injury", amount: 3, unit: "years", direction: "after", roll: "none", trigger: "Accrual or date of knowledge", source: "Limitation Act 1980, s 11" },
  // Singapore
  { id: "sg-limitation", country: "SG", name: "Limitation — contract / tort", amount: 6, unit: "years", direction: "after", roll: "none", trigger: "Cause of action accrues", source: "Limitation Act 1959, s 6(1)" },
  // European Union
  { id: "eu-gdpr-breach", country: "EU", name: "GDPR breach notification to the authority", amount: 72, unit: "hours", direction: "after", roll: "none", trigger: "Controller becomes aware of the breach", source: "Regulation (EU) 2016/679, Art. 33(1)" },
  { id: "eu-gdpr-dsar", country: "EU", name: "GDPR data subject request", amount: 1, unit: "months", direction: "after", roll: "following", trigger: "Receipt of the request", source: "Regulation (EU) 2016/679, Art. 12(3)", note: "Extendable by two further months for complex requests." },
  { id: "eu-nis2-warning", country: "EU", name: "NIS2 early warning of a significant incident", amount: 24, unit: "hours", direction: "after", roll: "none", trigger: "Becoming aware of the incident", source: "Directive (EU) 2022/2555, Art. 23(4)(a)" },
];
export const getRule = (id: string) => RULES.find((r) => r.id === id);
/** Holiday calendar that fits a preset's jurisdiction. */
export const ruleCalendar = (r: Rule): HolidayCountry => (["ID", "US", "GB", "SG", "AU"].includes(r.country) ? (r.country as HolidayCountry) : "none");

// ── saved list: validation ──
const txt = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
export const MAX_DEADLINES = 300;
export function sanitizeDeadlines(v: unknown): Deadline[] {
  if (!Array.isArray(v)) return [];
  const out: Deadline[] = [];
  for (const x of v.slice(0, MAX_DEADLINES)) {
    if (!x || typeof x !== "object") continue;
    const d = x as any;
    const unit: Unit = UNITS.includes(d.unit) ? d.unit : "days";
    const trigger = txt(d.trigger, 16), due = txt(d.due, 16);
    if (!parseIso(trigger) || !parseIso(due)) continue;
    out.push({
      id: /^[a-zA-Z0-9_-]{4,40}$/.test(d.id) ? d.id : Math.random().toString(36).slice(2, 12),
      title: txt(d.title, 200) || "Deadline", trigger, due, unit,
      amount: Math.max(0, Math.min(MAX_AMOUNT[unit], Math.floor(Number(d.amount) || 0))),
      direction: d.direction === "before" ? "before" : "after",
      roll: ROLLS.includes(d.roll) ? d.roll : "following",
      country: HOLIDAY_COUNTRIES.includes(d.country) ? d.country : "none",
      source: txt(d.source, 300) || undefined, notes: txt(d.notes, 2000) || undefined, done: !!d.done,
      remind: Array.isArray(d.remind) ? Array.from(new Set(d.remind.map((n: any) => Math.floor(Number(n))).filter((n: number) => n >= 0 && n <= 365))).slice(0, 5) as number[] : [],
      ruleId: typeof d.ruleId === "string" && getRule(d.ruleId) ? d.ruleId : undefined,
    });
  }
  return out;
}

// ── export ──
const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** RFC 5545 line folding at 75 octets. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let cur = "", size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length ? 74 : 75)) { parts.push(cur); cur = ""; size = 0; }
    cur += ch; size += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** iCalendar file: all-day events (timed for hour periods) with reminders. */
export function toIcs(list: Deadline[], calName: string, now = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AXTO//Legal AI deadlines//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEscape(calName)}`];
  for (const d of list) {
    const dt = parseIso(d.due);
    if (!dt) continue;
    const timed = d.due.includes("T");
    const date = d.due.slice(0, 10).replace(/-/g, "");
    const next = iso(addDays(dt, 1)).replace(/-/g, "");
    const desc = [d.source ? `Source: ${d.source}` : "", `Trigger: ${d.trigger}`, `Period: ${d.amount} ${d.unit} ${d.direction}`, d.notes || "", "Computed by AXTO Legal AI — verify against the current rule and any court order."].filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:${d.id}@legal.axto.io`, `DTSTAMP:${stamp(now)}`,
      timed ? `DTSTART:${d.due.replace(/[-:]/g, "")}00` : `DTSTART;VALUE=DATE:${date}`,
      timed ? `DTEND:${d.due.replace(/[-:]/g, "")}00` : `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${icsEscape(`⚖️ ${d.title}`)}`, `DESCRIPTION:${icsEscape(desc)}`, d.done ? "STATUS:CANCELLED" : "STATUS:CONFIRMED", "TRANSP:TRANSPARENT");
    for (const days of d.remind) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(d.title)}`, `TRIGGER:-P${days}D`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

const csvCell = (s: unknown) => { const v = String(s ?? ""); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
export function deadlinesCsv(list: Deadline[]): string {
  const rows = [["Title", "Due", "Trigger", "Amount", "Unit", "Direction", "Roll", "Calendar", "Source", "Done", "Notes"]];
  for (const d of list) rows.push([d.title, d.due, d.trigger, String(d.amount), d.unit, d.direction, d.roll, d.country, d.source || "", d.done ? "yes" : "no", d.notes || ""]);
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}
