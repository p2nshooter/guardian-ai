/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * LEGAL AI v4 — REDLINE, on the device: split two versions of a document into
 * clauses, align them (by number, heading, then text similarity), diff each
 * pair word by word (Myers), and flag the changes a lawyer must look at
 * (numbers, obligations, negations, liability language). Pure.
 * ============================================================================ */

export interface Clause { id: string; number: string; heading: string; text: string }
export type Op = { t: "eq" | "ins" | "del"; s: string };
export type ClauseStatus = "same" | "changed" | "added" | "removed";
export interface ClauseDiff { status: ClauseStatus; a?: Clause; b?: Clause; ops: Op[]; similarity: number; flags: string[]; moved?: boolean }
export interface Redline { clauses: ClauseDiff[]; stats: { same: number; changed: number; added: number; removed: number; wordsAdded: number; wordsRemoved: number; material: number } }

const NUM = /^\s*((?:(?:article|art\.|section|sec\.|clause|pasal|bab|chapter|schedule|annex)\s+)?(?:\d+(?:\.\d+)*[.)]?|[ivxlcdm]+[.)]|\([a-z0-9]{1,4}\)|[a-z][.)]))(?:\s+(.*))?$/i;

/** Split text into clauses: a new clause starts at a numbered line (1., 1.1, Article 5, Pasal 5, (a)…) or after a blank line. */
export function splitClauses(text: string): Clause[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: Clause[] = [];
  let cur: string[] = [], number = "", heading = "";
  const flush = () => {
    const body = cur.join("\n").trim();
    if (body) out.push({ id: `c${out.length + 1}`, number: number.replace(/[.)]$/, "").toLowerCase(), heading: heading.slice(0, 120), text: body });
    cur = []; number = ""; heading = "";
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    const m = line.match(NUM);
    const numberedStart = m && (/\d|\(|^[ivxlcdm]+[.)]$/i.test(m[1]) || /^(article|art\.|section|sec\.|clause|pasal|bab|chapter|schedule|annex)/i.test(m[1]));
    if (numberedStart && cur.length) flush();
    if (numberedStart && !cur.length) { number = m![1].replace(/^(?:article|art\.|section|sec\.|clause|pasal|bab|chapter|schedule|annex)\s+/i, "").trim(); heading = (m![2] || "").split(/[.:—-]\s/)[0]; }
    else if (cur.length === 1 && !heading && number) heading = line.trim().split(/[.:]\s/)[0];
    else if (!cur.length) heading = line.trim().split(/[.:]\s/)[0];
    cur.push(line);
  }
  flush();
  return out;
}

const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
function jaccard(a: string, b: string): number {
  const A = new Set(words(a)), B = new Set(words(b));
  if (!A.size && !B.size) return 1;
  let n = 0; for (const x of A) if (B.has(x)) n++;
  return n / (A.size + B.size - n);
}

/** Myers O((N+M)·D) diff over token arrays. */
export function diffTokens(a: string[], b: string[]): Op[] {
  const N = a.length, M = b.length, max = N + M;
  if (!N) return b.length ? [{ t: "ins", s: b.join("") }] : [];
  if (!M) return [{ t: "del", s: a.join("") }];
  if (N * M > 4_000_000) return [{ t: "del", s: a.join("") }, { t: "ins", s: b.join("") }]; // too large for token diff
  const v = new Map<number, number>([[1, 0]]);
  const trace: Map<number, number>[] = [];
  outer: for (let d = 0; d <= max; d++) {
    trace.push(new Map(v));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1)) ? v.get(k + 1) ?? 0 : (v.get(k - 1) ?? 0) + 1;
      let y = x - k;
      while (x < N && y < M && a[x] === b[y]) { x++; y++; }
      v.set(k, x);
      if (x >= N && y >= M) break outer;
    }
  }
  // Backtrack
  const ops: Op[] = [];
  let x = N, y = M;
  for (let d = trace.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
    const vv = trace[d], k = x - y;
    const prevK = k === -d || (k !== d && (vv.get(k - 1) ?? -1) < (vv.get(k + 1) ?? -1)) ? k + 1 : k - 1;
    const prevX = vv.get(prevK) ?? 0, prevY = prevX - prevK;
    while (x > prevX && y > prevY) { ops.push({ t: "eq", s: a[x - 1] }); x--; y--; }
    if (d > 0) { if (x === prevX) ops.push({ t: "ins", s: b[y - 1] }); else ops.push({ t: "del", s: a[x - 1] }); }
    x = prevX; y = prevY;
  }
  ops.reverse();
  // Merge runs
  const merged: Op[] = [];
  for (const o of ops) { const last = merged[merged.length - 1]; if (last && last.t === o.t) last.s += o.s; else merged.push({ ...o }); }
  return merged;
}
const tokenize = (s: string) => s.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu) || [];
export const diffWords = (a: string, b: string) => diffTokens(tokenize(a), tokenize(b));

const MODAL = /\b(shall|must|will|may|should|can|wajib|harus|dapat|boleh|berhak)\b/gi;
const RISK = /\b(liab\w*|indemn\w*|warrant\w*|terminat\w*|penalt\w*|exclusiv\w*|non-?compet\w*|confidential\w*|governing law|jurisdiction|arbitrat\w*|assign\w*|intellectual property|data protection|personal data|ganti rugi|tanggung jawab|denda|pemutusan|kerahasiaan)\b/i;
/** Why a change matters: numbers, obligation words, negation, risk topics. */
export function flagsFor(d: ClauseDiff): string[] {
  const out: string[] = [];
  const changed = d.ops.filter((o) => o.t !== "eq").map((o) => o.s).join(" ");
  const before = d.a?.text || "", after = d.b?.text || "";
  const nums = (s: string) => (s.match(/\d[\d.,]*\s*(?:%|days?|months?|years?|hari|bulan|tahun|x|times)?/gi) || []).map((x) => x.trim()).sort().join("|");
  if (d.status === "changed" && nums(before) !== nums(after)) out.push("numbers");
  const modal = (s: string) => (s.match(MODAL) || []).map((x) => x.toLowerCase()).sort().join("|");
  if (d.status === "changed" && modal(before) !== modal(after)) out.push("obligation");
  if (/\b(not|no|never|tidak|bukan|tanpa)\b/i.test(changed)) out.push("negation");
  if (RISK.test(before + after)) out.push("risk-topic");
  if (d.status === "removed") out.push("removed");
  if (d.status === "added") out.push("added");
  return Array.from(new Set(out));
}

/** Compare two versions clause by clause. */
export function redline(original: string, revised: string): Redline {
  const A = splitClauses(original), B = splitClauses(revised);
  const usedB = new Set<number>();
  const pairs: { ai: number; bi: number; sim: number }[] = [];
  // 1) same number + reasonably similar; 2) best text similarity ≥ 0.35
  A.forEach((a, ai) => {
    let best = -1, bestSim = 0;
    B.forEach((b, bi) => {
      if (usedB.has(bi)) return;
      const sim = jaccard(a.text, b.text) + (a.number && a.number === b.number ? 0.25 : 0) + (a.heading && jaccard(a.heading, b.heading) > 0.6 ? 0.15 : 0);
      if (sim > bestSim) { bestSim = sim; best = bi; }
    });
    if (best >= 0 && bestSim >= 0.35) { usedB.add(best); pairs.push({ ai, bi: best, sim: Math.min(1, jaccard(a.text, B[best].text)) }); }
  });
  const byA = new Map(pairs.map((p) => [p.ai, p]));
  const out: ClauseDiff[] = [];
  let lastB = -1;
  // Walk the revised order, inserting removed clauses where they were.
  const pendingRemoved = A.map((_, i) => i).filter((i) => !byA.has(i));
  const pairsByB = new Map(pairs.map((p) => [p.bi, p]));
  B.forEach((b, bi) => {
    const p = pairsByB.get(bi);
    if (p) {
      while (pendingRemoved.length && pendingRemoved[0] < p.ai) { const i = pendingRemoved.shift()!; out.push({ status: "removed", a: A[i], ops: [{ t: "del", s: A[i].text }], similarity: 0, flags: [] }); }
      const ops = diffWords(A[p.ai].text, b.text);
      const same = ops.every((o) => o.t === "eq");
      out.push({ status: same ? "same" : "changed", a: A[p.ai], b, ops, similarity: p.sim, flags: [], moved: bi < lastB });
      lastB = Math.max(lastB, bi);
    } else out.push({ status: "added", b, ops: [{ t: "ins", s: b.text }], similarity: 0, flags: [] });
  });
  for (const i of pendingRemoved) out.push({ status: "removed", a: A[i], ops: [{ t: "del", s: A[i].text }], similarity: 0, flags: [] });
  for (const d of out) d.flags = d.status === "same" ? [] : flagsFor(d);
  const count = (re: RegExp, t: Op["t"]) => out.reduce((n, d) => n + d.ops.filter((o) => o.t === t).reduce((m, o) => m + (o.s.match(re) || []).length, 0), 0);
  return {
    clauses: out,
    stats: {
      same: out.filter((d) => d.status === "same").length, changed: out.filter((d) => d.status === "changed").length,
      added: out.filter((d) => d.status === "added").length, removed: out.filter((d) => d.status === "removed").length,
      wordsAdded: count(/[\p{L}\p{N}]+/gu, "ins"), wordsRemoved: count(/[\p{L}\p{N}]+/gu, "del"),
      material: out.filter((d) => d.flags.some((f) => f !== "added" && f !== "removed") || d.status !== "same" && d.flags.includes("risk-topic")).length,
    },
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Printable HTML redline (<del>/<ins>). */
export function redlineHtml(r: Redline, title: string): string {
  const body = r.clauses.filter((d) => d.status !== "same").map((d) => {
    const label = d.b?.number || d.a?.number || "";
    return `<section><h3>${esc(label ? `${label} ` : "")}${esc(d.b?.heading || d.a?.heading || "")} <small>(${d.status}${d.flags.length ? ` · ${d.flags.join(", ")}` : ""})</small></h3><p>${d.ops.map((o) => (o.t === "eq" ? esc(o.s) : o.t === "ins" ? `<ins>${esc(o.s)}</ins>` : `<del>${esc(o.s)}</del>`)).join("").replace(/\n/g, "<br>")}</p></section>`;
  }).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:14px/1.6 Georgia,serif;max-width:860px;margin:32px auto;padding:0 16px;color:#111}ins{background:#dcfce7;color:#166534;text-decoration:underline}del{background:#fee2e2;color:#991b1b}h3{font:600 15px system-ui;margin-top:24px}small{color:#64748b;font-weight:400}</style></head><body><h1>${esc(title)}</h1>${body || "<p>No differences.</p>"}</body></html>`;
}
/** Markdown change table + redline (~~deleted~~ **inserted**) for Word export and the AI. */
export function redlineMarkdown(r: Redline, title: string, maxChars = 60_000): string {
  const L = [`# ${title}`, "", `Changed ${r.stats.changed} · added ${r.stats.added} · removed ${r.stats.removed} · unchanged ${r.stats.same} · words +${r.stats.wordsAdded} / −${r.stats.wordsRemoved}`, "",
    "| Clause | Change | Flags |", "|---|---|---|",
    ...r.clauses.filter((d) => d.status !== "same").map((d) => `| ${(d.b?.number || d.a?.number || "—")} ${(d.b?.heading || d.a?.heading || "").replace(/\|/g, "/").slice(0, 60)} | ${d.status} | ${d.flags.join(", ") || "—"} |`), ""];
  for (const d of r.clauses.filter((x) => x.status !== "same")) {
    L.push(`## ${d.b?.number || d.a?.number || ""} ${d.b?.heading || d.a?.heading || ""} — ${d.status}`, "", d.ops.map((o) => (o.t === "eq" ? o.s : o.t === "ins" ? `**${o.s.trim()}** ` : `~~${o.s.trim()}~~ `)).join(""), "");
  }
  const out = L.join("\n");
  return out.length > maxChars ? `${out.slice(0, maxChars)}\n[…truncated]` : out;
}
