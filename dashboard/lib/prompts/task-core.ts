/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * PROMPT LIBRARY — the task builder without the catalogue, so it can run in the
 * browser (Local Mode) as well as on the server. The server passes getPrompt;
 * Local Mode passes the one template it downloaded (plan-gated) from
 * GET /api/prompts/:id, so premium templates are never bundled into the page.
 *   run       a catalogue prompt filled from its id + the member's values, or the member's own prompt
 *   optimize  a prompt engineer improves the member's prompt, keeping {{vars}}
 *   chain     one step of a workflow; the previous step's output is context
 * ============================================================================ */
import type { BuiltTask, TaskInput } from "../ai/tasks";
import { limitsFor, type Tier } from "../plans";

export const PROMPT_MODES = ["run", "optimize", "chain"] as const;
export type PromptMode = (typeof PROMPT_MODES)[number];
export interface PromptTemplate { id: string; level: string; title: string; template: string }
export type PromptLookup = (id: string) => PromptTemplate | undefined;

const RUN = "You are a world-class professional assistant. Follow the user's prompt exactly: respect the requested role, steps and output format. Use Markdown with clear headings and tables where the prompt asks for them. If information is missing, state a reasonable assumption and mark it [ASSUMPTION] instead of stopping. Never invent facts, figures, citations or legal/medical specifics — mark anything to check as [VERIFY].";
const OPTIMIZE = [
  "You are an expert prompt engineer. Improve the user's prompt so any capable model produces a better, more reliable result.",
  "Keep the user's intent and every {{variable}} placeholder exactly as written (you may add new {{snake_case}} variables where they clearly help).",
  "Improve: role and context, the task broken into steps, constraints, the output format, quality criteria, and what to do when information is missing.",
  "Reply in this exact structure:\n## Improved prompt\n```\n<the improved prompt>\n```\n## What changed\n- <bullet per change and why>\n## Variables\n- <each {{variable}} and what to put in it>",
].join("\n");
const CHAIN = "You are executing one step of a multi-step workflow. The output of the previous step is provided as context. Do exactly what this step asks, building on that context; don't repeat it unless asked. Use Markdown.";

export function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, k) => (values[k] ?? "").trim() || `[${k}]`);
}

/** The catalogue prompt a request refers to (null for own prompts and for optimize). */
export function promptIdOf(input: Pick<TaskInput, "task" | "options">): string | null {
  const raw = String(input.task || input.options?.mode || "");
  const mode = (PROMPT_MODES as readonly string[]).includes(raw) ? raw : "run";
  const id = (input.options?.promptId || "").trim();
  return id && mode !== "optimize" ? id : null;
}

export function buildPromptTask(input: TaskInput, tier: Tier, lookup: PromptLookup): BuiltTask | { error: string; status?: number } {
  const raw = String(input.task || input.options?.mode || "");
  const mode: PromptMode = (PROMPT_MODES as readonly string[]).includes(raw) ? (raw as PromptMode) : "run";
  const messages = input.messages.map((m) => ({ ...m }));
  const previous = (input.options?.previous || "").slice(0, 24000);
  const base = mode === "optimize" ? OPTIMIZE : mode === "chain" ? `${CHAIN}\n\n${RUN}${previous ? `\n\nPREVIOUS STEP OUTPUT:\n${previous}` : ""}` : RUN;
  const id = promptIdOf(input);
  if (id) {
    // A catalogue prompt: the FIRST user turn is replaced by the template filled here.
    const p = lookup(id);
    if (!p) return { error: "Prompt not found.", status: 404 };
    if (!limitsFor(tier).promptLevels.includes(p.level as any)) return { error: `This ${p.level} prompt needs a higher plan.`, status: 402 };
    let values: Record<string, string> = {};
    try { const v = JSON.parse(input.options?.values || "{}"); if (v && typeof v === "object") values = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x).slice(0, 4000)])); } catch { /* keep empty */ }
    const text = fillTemplate(p.template, values);
    const first = messages.findIndex((m) => m.role === "user");
    if (first >= 0) messages[first].content = text; else messages.push({ role: "user", content: text });
    return { system: base, messages, research: !!input.research, maxOutputTokens: 6000, title: p.title };
  }
  const first = input.messages.find((m) => m.role === "user")?.content || "Prompt";
  return { system: base, messages, research: !!input.research, maxOutputTokens: mode === "optimize" ? 3000 : 6000, title: first.replace(/\s+/g, " ").slice(0, 60) };
}
