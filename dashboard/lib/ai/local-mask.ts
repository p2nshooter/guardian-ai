/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * LOCAL MODE — placeholders. Legal AI's expert workspace instructions stay on
 * the server, so in Local Mode the browser asks the server to assemble them
 * (POST /api/byox/prepare) with every piece of the member's content replaced by
 * a placeholder: messages, document names and texts, free-text fields and the
 * city. Only configuration travels in clear (workspace, country / state codes,
 * area, audience, depth, citation style, language, date, and select-type
 * field values the page marks as plain). The browser then puts the real text
 * back and sends the whole prompt to the model on this device.
 * ============================================================================ */

export const MARK_RE = /@@AXTO_LOCAL_(\d{4})@@/g;
const mark = (n: number) => `@@AXTO_LOCAL_${String(n).padStart(4, "0")}@@`;

/** Option keys that are configuration, never content. */
export const PLAIN_OPTIONS = ["ws", "area", "audience", "depth", "citation", "lang", "asOf", "research", "mode", "framework"];
const SLUG = /^[\w.:\- ]{0,80}$/;

export interface LocalImage { mime: string; data: string }
export interface MaskedRequest {
  body: { app: string; task?: string; messages: { role: string; content: string }[]; options: Record<string, string>; documents?: { name: string; text: string; pages?: number }[] };
  values: string[];
  images: Record<number, LocalImage[]>;     // placeholder index of a message → its images (never sent)
}

/**
 * Replace the member's content with placeholders. `plain` lists extra option keys the page
 * knows are configuration (e.g. Legal select fields); their values must look like a slug.
 */
export function maskRequest(b: any, plain: string[] = []): MaskedRequest {
  const values: string[] = [];
  const images: Record<number, LocalImage[]> = {};
  const m = (s: unknown) => { values.push(String(s ?? "")); return mark(values.length - 1); };
  const messages = (Array.isArray(b?.messages) ? b.messages : []).map((x: any) => {
    const content = m(x?.content);
    if (Array.isArray(x?.images) && x.images.length) images[values.length - 1] = x.images;
    return { role: String(x?.role || "user"), content };
  });
  const options: Record<string, string> = {};
  for (const [k, raw] of Object.entries((b?.options && typeof b.options === "object") ? b.options : {})) {
    const v = String(raw ?? "");
    if (k === "jurisdiction") {
      // Country and state are codes from fixed lists; the city is typed by the member.
      try { const j = JSON.parse(v || "{}"); options[k] = JSON.stringify({ country: String(j?.country || ""), sub: String(j?.sub || ""), ...(j?.city ? { city: m(j.city) } : {}) }); }
      catch { options[k] = "{}"; }
    } else if (PLAIN_OPTIONS.includes(k) || (plain.includes(k) && SLUG.test(v))) options[k] = v;
    else options[k] = m(v);
  }
  const documents = Array.isArray(b?.documents)
    ? b.documents.map((d: any) => ({ name: m(d?.name || "document"), text: m(d?.text), ...(Number(d?.pages) > 0 ? { pages: Math.floor(Number(d.pages)) } : {}) }))
    : undefined;
  return { body: { app: String(b?.app || ""), ...(b?.task ? { task: String(b.task) } : {}), messages, options, ...(documents ? { documents } : {}) }, values, images };
}

export const unmask = (s: string, values: string[]) => s.replace(MARK_RE, (_m, n) => values[Number(n)] ?? "");

/** Put the member's content back into a prompt the server assembled with placeholders. */
export function unmaskBuilt<T extends { system: string; messages: { role: string; content: string }[]; title?: string }>(built: T, masked: MaskedRequest): T & { messages: { role: string; content: string; images?: LocalImage[] }[] } {
  return {
    ...built,
    system: unmask(built.system, masked.values),
    title: built.title ? unmask(built.title, masked.values).replace(/\s+/g, " ").slice(0, 140) : built.title,
    messages: built.messages.map((msg) => {
      const ids = Array.from(msg.content.matchAll(MARK_RE), (x) => Number(x[1]));
      const img = ids.map((i) => masked.images[i]).find(Boolean);
      return { ...msg, content: unmask(msg.content, masked.values), ...(img ? { images: img } : {}) };
    }),
  };
}

