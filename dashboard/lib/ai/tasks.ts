/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 * AI TASK REGISTRY — every cloud app declares how its requests are turned into
 * a system prompt + messages, and which plan it needs. System prompts are
 * built on the server only; the browser can never inject its own.
 * ============================================================================ */
import type { ChatMessage } from "./providers";
import type { Tier } from "../plans";

export interface TaskInput {
  task?: string;               // app-specific sub-task (e.g. a Legal workspace id)
  messages: ChatMessage[];     // conversation (last message = the new request)
  options?: Record<string, string>;
  documents?: unknown;         // app-specific attachments (already text, e.g. Legal uploads)
  research?: boolean;          // live web research is available on the resolved connection
}

export interface BuiltTask { system: string; messages: ChatMessage[]; title: string; research?: boolean; maxOutputTokens?: number }

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

export function sanitizeMessages(raw: unknown, maxTurns = 40): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const msgs = raw
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string" && m.content.trim())
    .map((m: any) => ({ role: m.role, content: String(m.content) })) as ChatMessage[];
  // Must start with a user turn and end with one.
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs.slice(-maxTurns);
}

// ── Generic assistant (AI Studio) — registered here so the pipeline is testable end to end.
registerTask({
  app: "studio",
  build(input) {
    const role = (input.options?.role || "").trim().slice(0, 4000);
    const system = [
      "You are AXTO AI Studio, a precise, honest and helpful assistant for professionals.",
      "Answer in the language the user writes in. Use Markdown for structure (headings, lists, tables) when it helps readability.",
      "If you are unsure, say so and explain what would resolve the uncertainty. Never invent facts, citations or numbers.",
      role ? `\nThe user has set this role for you:\n${role}` : "",
    ].join("\n");
    const first = input.messages.find((m) => m.role === "user")?.content || "New chat";
    return { system, messages: input.messages, title: first.slice(0, 80) };
  },
});
