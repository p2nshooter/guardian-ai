/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * The pure half of a run: validate the app, the plan and the inputs, and build
 * the prompt with the app's task handler. No keys, no network, no storage — so
 * the same code serves the server pipeline (lib/ai/run-core.ts), the Local Mode
 * placeholder endpoint (/api/byox/prepare) and Local Mode in the browser.
 * ============================================================================ */
import { getTask, sanitizeMessages, inputSize, MAX_INPUT_CHARS, type AppTaskHandler, type BuiltTask, type TaskInput } from "./tasks";
import { limitsFor, planForApp, PLANS, isPlanId, type Tier } from "../plans";
import { getCloudApp } from "../apps";

/** Longer option budgets: case / programme briefings, a workflow step's previous output, filled prompt values. */
export const OPTION_MAX: Record<string, number> = { briefing: 16000, previous: 24000, values: 16000 };

export interface RunRequest { app?: unknown; task?: unknown; messages?: unknown; provider?: unknown; model?: unknown; options?: unknown; documents?: unknown }
export type BuildFailure = { ok: false; status: number; error: string; extra?: Record<string, unknown> };
export type BuildResult = BuildFailure | { ok: true; app: string; handler: AppTaskHandler; input: TaskInput; probe: BuiltTask; wantResearch: boolean };

export function buildRun(tier: Tier, b: RunRequest): BuildResult {
  const app = String(b?.app || "");
  const handler = getTask(app);
  if (!handler) return { ok: false, status: 400, error: "Unknown app." };
  if (!getCloudApp(app)?.live) return { ok: false, status: 503, error: "This app is coming soon." };
  if (!limitsFor(tier).apps.includes(app)) {
    const need = planForApp(app);
    return { ok: false, status: 402, error: `This app needs the ${isPlanId(need) ? PLANS[need].name : "a paid"} plan or higher.`, extra: { upgrade: true } };
  }
  const messages = sanitizeMessages(b?.messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") return { ok: false, status: 400, error: "Write a request first." };
  const options = typeof b?.options === "object" && b.options
    ? Object.fromEntries(Object.entries(b.options as Record<string, unknown>).map(([k, v]) => [k, String(v).slice(0, OPTION_MAX[k] || 8000)]))
    : {};
  const wantResearch = options.research === "1";
  const input: TaskInput = { task: b?.task ? String(b.task) : undefined, messages, options, documents: b?.documents };

  // Validate once (plan, workspace, inputs) before touching any key.
  const probe = handler.build({ ...input, research: false }, tier);
  if ("error" in probe) return { ok: false, status: probe.status || 400, error: probe.error, extra: probe.status === 402 ? { upgrade: true } : undefined };
  if (inputSize(probe.system, probe.messages) > MAX_INPUT_CHARS) {
    return { ok: false, status: 413, error: "This is too long for one request (about 150,000 tokens). Remove some documents or split them into separate runs." };
  }
  return { ok: true, app, handler, input, probe, wantResearch };
}
