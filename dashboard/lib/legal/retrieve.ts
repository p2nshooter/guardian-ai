/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * LEGAL AI — ASK THE MATTER: search across every document of a matter
 * (runs in the browser). Documents are cut into overlapping passages and ranked
 * with BM25; only the best passages go to the AI, each labelled with its
 * document and passage number so the answer can cite "[Doc 2 ¶14]". A large
 * bundle therefore fits the model's context, and nothing else leaves the device.
 * ============================================================================ */

export interface SourceDoc { name: string; text: string }
export interface Passage { doc: number; docName: string; n: number; text: string; start: number }
export interface Hit extends Passage { score: number; terms: string[] }
export interface Index { passages: Passage[]; tf: Map<string, number>[]; len: number[]; df: Map<string, number>; avg: number }

// Small EN + ID stop lists: function words that carry no meaning for search.
const STOP = new Set(("a an and are as at be been but by can could did do does for from had has have he her his i if in into is it its may me more " +
  "must my no not of on or our shall she should so such than that the their them then there these they this those to under upon us was we were " +
  "what when where which who whom will with would you your ada adalah agar akan antara apa atas atau bagi bahwa banyak belum bila dalam dan " +
  "dapat dari dengan di ini itu jika juga kami karena ke kepada lain maka masih mereka namun oleh pada para saat sebagai secara sedang sejak " +
  "serta setiap sudah tanpa telah tentang tersebut untuk yaitu yang").split(" "));

/** Lower-case word tokens (letters/digits, any script), light stemming for plurals. */
export function tokenize(s: string): string[] {
  const out: string[] = [];
  for (const m of String(s).toLowerCase().normalize("NFKC").matchAll(/[\p{L}\p{N}]+(?:[.'’\-][\p{L}\p{N}]+)*/gu)) {
    let w = m[0].replace(/['’]s$/, "");
    if (w.length < 2 || STOP.has(w)) continue;
    if (/^[a-z]+$/.test(w) && w.length > 4) w = w.replace(/(ies)$/, "y").replace(/([^s])s$/, "$1");
    out.push(w);
  }
  return out;
}

/** Passages of ~`size` characters on paragraph / sentence boundaries, with a small overlap. */
export function chunk(text: string, size = 900, overlap = 150): { text: string; start: number }[] {
  const src = String(text || "").replace(/\r\n?/g, "\n");
  const out: { text: string; start: number }[] = [];
  let i = 0;
  while (i < src.length) {
    let end = Math.min(src.length, i + size);
    if (end < src.length) {
      const para = src.lastIndexOf("\n\n", end);
      const sent = Math.max(src.lastIndexOf(". ", end), src.lastIndexOf(".\n", end));
      if (para > i + size * 0.5) end = para;
      else if (sent > i + size * 0.5) end = sent + 1;
    }
    const piece = src.slice(i, end).trim();
    if (piece) out.push({ text: piece, start: i });
    if (end >= src.length) break;
    i = Math.max(end - overlap, i + 1);
    // start the next passage at a word boundary
    while (i < end && /\S/.test(src[i - 1] || "")) i++;
  }
  return out;
}

export function buildIndex(docs: SourceDoc[], maxPassages = 20000): Index {
  const passages: Passage[] = [];
  docs.forEach((d, di) => chunk(d.text).forEach((c, ci) => { if (passages.length < maxPassages) passages.push({ doc: di + 1, docName: d.name, n: ci + 1, text: c.text, start: c.start }); }));
  const tf: Map<string, number>[] = [], len: number[] = [], df = new Map<string, number>();
  for (const p of passages) {
    const m = new Map<string, number>();
    const toks = tokenize(p.text);
    for (const t of toks) m.set(t, (m.get(t) || 0) + 1);
    for (const t of m.keys()) df.set(t, (df.get(t) || 0) + 1);
    tf.push(m); len.push(toks.length);
  }
  const avg = len.reduce((a, b) => a + b, 0) / Math.max(1, len.length);
  return { passages, tf, len, df, avg };
}

/** BM25 (k1 = 1.4, b = 0.75) with a bonus for exact quoted phrases. */
export function search(ix: Index, query: string, k = 8): Hit[] {
  const terms = Array.from(new Set(tokenize(query)));
  const phrases = Array.from(query.matchAll(/"([^"]{3,120})"/g), (m) => m[1].toLowerCase());
  if (!terms.length && !phrases.length) return [];
  const N = ix.passages.length, k1 = 1.4, b = 0.75;
  const scored: Hit[] = [];
  ix.passages.forEach((p, i) => {
    let score = 0;
    const found: string[] = [];
    for (const t of terms) {
      const f = ix.tf[i].get(t);
      if (!f) continue;
      const n = ix.df.get(t) || 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * ix.len[i]) / (ix.avg || 1))));
      found.push(t);
    }
    const low = phrases.length ? p.text.toLowerCase() : "";
    for (const ph of phrases) if (low.includes(ph)) score += 3;
    if (score > 0) scored.push({ ...p, score, terms: found });
  });
  scored.sort((a, b2) => b2.score - a.score || a.doc - b2.doc || a.n - b2.n);
  // At most 3 passages from the same document in a row of results, so every relevant document gets a voice.
  const perDoc = new Map<number, number>();
  const out: Hit[] = [];
  for (const h of scored) {
    const c = perDoc.get(h.doc) || 0;
    if (c >= Math.max(3, Math.ceil(k / 2))) continue;
    perDoc.set(h.doc, c + 1);
    out.push(h);
    if (out.length >= k) break;
  }
  return out;
}

/** The passages as one labelled source bundle for the AI (fits `maxChars`). */
export function excerptBundle(hits: Hit[], maxChars = 60_000): string {
  const parts: string[] = [];
  let used = 0;
  for (const h of hits) {
    const block = `[Doc ${h.doc} ¶${h.n}] ${h.docName}\n${h.text}`;
    if (used + block.length > maxChars) break;
    parts.push(block);
    used += block.length + 2;
  }
  return parts.join("\n\n");
}

/** Split `text` into plain / highlighted pieces for the query terms. */
export function highlight(text: string, terms: string[]): { s: string; hit: boolean }[] {
  if (!terms.length) return [{ s: text, hit: false }];
  const out: { s: string; hit: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(/[\p{L}\p{N}]+(?:[.'’\-][\p{L}\p{N}]+)*/gu)) {
    const tok = tokenize(m[0])[0];
    if (!tok || !terms.includes(tok)) continue;
    if (m.index! > last) out.push({ s: text.slice(last, m.index), hit: false });
    out.push({ s: m[0], hit: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ s: text.slice(last), hit: false });
  return out;
}
