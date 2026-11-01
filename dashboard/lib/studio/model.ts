/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * AI STUDIO — the conversation model, pure (no DOM): messages with answer
 * versions (regenerate / compare), attached files as text + images, token
 * estimates, artifacts (html / svg / mermaid) and Markdown / JSON export.
 * ============================================================================ */

export interface Img { mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string; name?: string }
export interface FileText { name: string; text: string; size: number }
export interface Version { content: string; provider?: string; model?: string; at: string }
export interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;               // user: the typed text · assistant: the chosen version
  files?: FileText[];            // user: attached documents (already text)
  images?: Img[];                // user: attached images
  versions?: Version[];          // assistant: every answer (regenerate / compare)
  vi?: number;                   // assistant: the version shown
  provider?: string; model?: string;
}
export interface Assistant { id: string; name: string; icon: string; instructions: string; provider?: string; model?: string; temperature?: number }
export interface ChatSettings { instructions: string; temperature: number | null; maxTokens: number | null; assistantId?: string }
export interface Conversation { v: 2; messages: Msg[]; settings: ChatSettings; folder?: string; pinned?: boolean }

export const newMsgId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const DEFAULT_SETTINGS: ChatSettings = { instructions: "", temperature: null, maxTokens: null };

/** The text of a message as sent to the model: files first (clearly delimited), then the request. */
export function composeUser(m: Pick<Msg, "content" | "files">): string {
  const files = (m.files || []).map((f) => `«file: ${f.name}»\n${f.text}\n«/file»`).join("\n\n");
  return files ? `${files}\n\n${m.content}` : m.content;
}

export function shown(m: Msg): string {
  if (m.role !== "assistant" || !m.versions?.length) return m.content;
  return m.versions[Math.max(0, Math.min(m.versions.length - 1, m.vi ?? m.versions.length - 1))].content;
}

/** Conversation → the API's messages (text + images; the chosen answer version). */
export function toApi(msgs: Msg[]): { role: "user" | "assistant"; content: string; images?: { mime: Img["mime"]; data: string }[] }[] {
  return msgs.map((m) => m.role === "user"
    ? { role: "user" as const, content: composeUser(m), ...(m.images?.length ? { images: m.images.map((i) => ({ mime: i.mime, data: i.data })) } : {}) }
    : { role: "assistant" as const, content: shown(m) })
    .filter((m) => m.content.trim() || ("images" in m && m.images?.length));
}

/** Add an answer as a new version of an assistant message (or create the message). */
export function withVersion(m: Msg | null, v: Version): Msg {
  const versions = [...(m?.versions || (m?.content ? [{ content: m.content, provider: m.provider, model: m.model, at: "" }] : [])), v];
  return { id: m?.id || newMsgId(), role: "assistant", content: v.content, versions, vi: versions.length - 1, provider: v.provider, model: v.model };
}
export function pickVersion(m: Msg, vi: number): Msg {
  const n = m.versions?.length || 0;
  if (!n) return m;
  const i = ((vi % n) + n) % n;
  const v = m.versions![i];
  return { ...m, vi: i, content: v.content, provider: v.provider, model: v.model };
}

/** Rough token estimate: ~4 characters per token for Latin text, ~1 per CJK character, ~1.3k per image. */
export function estimateTokens(s: string, images = 0): number {
  const cjk = (s.match(/[぀-ヿ㐀-鿿가-힯]/g) || []).length;
  return Math.ceil((s.length - cjk) / 4 + cjk) + images * 1300;
}
export function conversationTokens(msgs: Msg[], instructions = ""): number {
  return estimateTokens(instructions) + msgs.reduce((n, m) => n + estimateTokens(m.role === "user" ? composeUser(m) : shown(m), m.images?.length || 0), 0);
}

// ── Artifacts ────────────────────────────────────────────────────────────────
export type ArtifactKind = "html" | "svg" | "mermaid";
export interface Artifact { kind: ArtifactKind; code: string }
export function artifactKind(lang: string, code: string): ArtifactKind | null {
  const l = lang.toLowerCase().trim();
  if (l === "html" || l === "htm") return "html";
  if (l === "svg" || (l === "xml" && /^\s*<svg[\s>]/i.test(code))) return "svg";
  if (l === "mermaid") return "mermaid";
  return null;
}
export function extractArtifacts(md: string): Artifact[] {
  const out: Artifact[] = [];
  const re = /```([\w-]*)[^\n]*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) { const k = artifactKind(m[1], m[2]); if (k) out.push({ kind: k, code: m[2] }); }
  return out;
}
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
/** A self-contained document for a sandboxed iframe (no same-origin access). */
export function artifactDoc(a: Artifact, origin = ""): string {
  if (a.kind === "html") return /<html[\s>]/i.test(a.code) ? a.code : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${a.code}</body></html>`;
  if (a.kind === "svg") return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;display:flex;align-items:center;justify-content:center;background:#fff}svg{max-width:100%;max-height:100%}</style></head><body>${a.code}</body></html>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:16px;font-family:system-ui,sans-serif;background:#fff}</style></head><body><pre class="mermaid">${escapeHtml(a.code)}</pre><script src="${origin}/vendor/mermaid/mermaid.min.js"></script><script>mermaid.initialize({startOnLoad:true,securityLevel:"strict"});</script></body></html>`;
}

// ── Export ───────────────────────────────────────────────────────────────────
export function toMarkdown(title: string, msgs: Msg[], s?: ChatSettings): string {
  const head = [`# ${title || "Conversation"}`, ""];
  if (s?.instructions) head.push(`> **Instructions:** ${s.instructions.replace(/\n/g, " ")}`, "");
  const body = msgs.map((m) => {
    if (m.role === "user") {
      const att = [...(m.files || []).map((f) => `📎 ${f.name}`), ...(m.images || []).map((i) => `🖼 ${i.name || "image"}`)];
      return `## 🧑 You\n\n${att.length ? att.join(" · ") + "\n\n" : ""}${m.content}`;
    }
    return `## 🤖 ${m.model ? `AI · ${m.model}` : "AI"}\n\n${shown(m)}`;
  });
  return [...head, ...body].join("\n\n") + "\n";
}
export function toJson(title: string, c: Conversation): string {
  return JSON.stringify({ title, exportedAt: new Date().toISOString(), ...c, messages: c.messages.map((m) => ({ ...m, images: m.images?.map((i) => ({ mime: i.mime, name: i.name, bytes: Math.round((i.data.length * 3) / 4) })) })) }, null, 2);
}

/** Title from the first request (no file dumps). */
export const titleOf = (msgs: Msg[]) => (msgs.find((m) => m.role === "user")?.content || "New chat").replace(/\s+/g, " ").trim().slice(0, 80) || "New chat";
/** A short searchable snippet for the list. */
export const snippetOf = (msgs: Msg[]) => msgs.map((m) => (m.role === "user" ? m.content : shown(m))).join(" ").replace(/\s+/g, " ").slice(0, 280);

/** Legacy v1 conversation {role, messages:[{role, content}]} → v2. */
export function upgrade(body: any): Conversation {
  if (body?.v === 2) return { ...body, settings: { ...DEFAULT_SETTINGS, ...(body.settings || {}) } };
  const messages: Msg[] = (body?.messages || []).map((m: any) => ({ id: newMsgId(), role: m.role, content: String(m.content || "") }));
  return { v: 2, messages, settings: { ...DEFAULT_SETTINGS, instructions: String(body?.role || "") } };
}
