/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - AI workspace for legal, security & business teams
 * ==============================================================================
 * AI TASK REGISTRY — every cloud app declares how its requests are turned into
 * a system prompt + messages, and which plan it needs. System prompts are
 * built on the server only; the browser can never inject its own.
 * ============================================================================ */
import type { ChatImage, ChatMessage } from "./providers";
import type { Tier } from "../plans";

export interface TaskInput {
  task?: string;               // app-specific sub-task (e.g. a Legal workspace id)
  messages: ChatMessage[];     // conversation (last message = the new request)
  options?: Record<string, string>;
  documents?: unknown;         // app-specific attachments (already text, e.g. Legal uploads)
  research?: boolean;          // live web research is available on the resolved connection
}

/** Largest prompt one request may carry (about 150,000 tokens). */
export const MAX_INPUT_CHARS = 600_000;
export function inputSize(system: string, messages: ChatMessage[]): number {
  return system.length + messages.reduce((n, m) => n + m.content.length, 0);   // images are capped separately (sanitizeMessages)
}

export interface BuiltTask { system: string; messages: ChatMessage[]; title: string; research?: boolean; maxOutputTokens?: number; temperature?: number }

export interface AppTaskHandler {
  app: string;
  build(input: TaskInput, tier: Tier): BuiltTask | { error: string; status?: number };
}

const handlers: Record<string, AppTaskHandler> = {};

export function registerTask(h: AppTaskHandler) {
  handlers[h.app] = h;
}

export function getTask(app: string): AppTaskHandler | undefined {
  return handlers[app];
}

const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const MAX_IMAGES = 6;                 // per request
export const MAX_IMAGE_B64 = 7_000_000;      // ~5 MB decoded, per image

/** Images on USER turns only: known types, base64 only, capped in count and size (newest kept). */
function cleanImages(list: unknown, budget: { left: number }): ChatImage[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const out: ChatImage[] = [];
  for (const i of list) {
    if (budget.left <= 0) break;
    const mime = String((i as any)?.mime || ""), data = String((i as any)?.data || "");
    if (!IMAGE_MIME.has(mime) || !data || data.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/=]+$/.test(data.slice(0, 200))) continue;
    out.push({ mime: mime as ChatImage["mime"], data });
    budget.left--;
  }
  return out.length ? out : undefined;
}

export function sanitizeMessages(raw: unknown, maxTurns = 40): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const budget = { left: MAX_IMAGES };
  const kept = raw
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string" && (m.content.trim() || (m.role === "user" && Array.isArray(m.images) && m.images.length)));
  // Walk newest → oldest so the image budget goes to the latest turns.
  const msgs = kept.slice().reverse().map((m: any) => {
    const images = m.role === "user" ? cleanImages(m.images, budget) : undefined;
    return { role: m.role, content: String(m.content || (images ? "(image)" : "")), ...(images ? { images } : {}) };
  }).reverse() as ChatMessage[];
  // Must start with a user turn and end with one.
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs.slice(-maxTurns);
}

// ── Generic assistant (AI Studio) — registered here so the pipeline is testable end to end.
registerTask({
  app: "studio",
  build(input) {
    const o = input.options || {};
    // "role" = the member's own instructions for this chat or assistant (their system prompt).
    const role = (o.role || "").trim().slice(0, 8000);
    const system = [
      "You are AXTO AI Studio, a precise, honest and helpful assistant for professionals.",
      "Answer in the language the user writes in. Use Markdown for structure (headings, lists, tables) when it helps readability.",
      "Put code in fenced blocks with the language name. When the user asks for a web page, component, chart or diagram, return one self-contained ```html (or ```svg) block that renders on its own.",
      "Attached files arrive as text between «file» markers; images arrive as images. Quote the file when you rely on it.",
      "If you are unsure, say so and explain what would resolve the uncertainty. Never invent facts, citations or numbers.",
      role ? `\nThe user has set these instructions for you:\n${role}` : "",
    ].join("\n");
    const temp = Number(o.temperature);
    const max = parseInt(o.maxTokens || "", 10);
    const first = input.messages.find((m) => m.role === "user")?.content || "New chat";
    return {
      system, messages: input.messages, title: first.slice(0, 80),
      ...(isFinite(temp) && o.temperature !== "" && o.temperature !== undefined ? { temperature: Math.max(0, Math.min(2, temp)) } : {}),
      ...(max > 0 ? { maxOutputTokens: Math.max(256, Math.min(64000, max)) } : {}),
    };
  },
});
