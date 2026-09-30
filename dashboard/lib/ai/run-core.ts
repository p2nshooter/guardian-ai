/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * BYOX RUN PIPELINE — shared by the member app (/api/byox/run) and the public
 * developer API (/api/v1/ai/run, Connect, MCP). Validates the app and plan,
 * builds the server-side prompt, resolves the MEMBER'S OWN keys and streams
 * the answer with failover to their next key. No AXTO-provided AI is used.
 * ============================================================================ */
import { resolveChatAll, ByoxMissingKey } from "./byox";
import { chatStream, inputSize, MAX_INPUT_CHARS, providerInfo, supportsResearch, statusLine, type Connection } from "./providers";
import { getTask, sanitizeMessages, type BuiltTask } from "./tasks";
import "./register";
import { limitsFor, planForApp, PLANS, isPlanId, type Tier } from "../plans";
import { getCloudApp } from "../apps";
import { recordByoxRequest } from "../usage";
import { CORE_WORKSPACES } from "../legal/workspaces";

/** Longer option budgets: case / programme briefings, a workflow step's previous output, filled prompt values. */
export const OPTION_MAX: Record<string, number> = { briefing: 16000, previous: 24000, values: 16000 };

export interface RunRequest { app?: unknown; task?: unknown; messages?: unknown; provider?: unknown; model?: unknown; options?: unknown; documents?: unknown }
export interface RunMeta { provider: string; model: string; research: boolean; title: string }
export type RunResult =
  | { ok: false; status: number; error: string; extra?: Record<string, unknown> }
  | { ok: true; meta: RunMeta; stream: AsyncGenerator<string> };

/** Tier gate for an app (+ the Pro-only Legal workspaces). */
export function runAllowed(tier: Tier, app: string, task?: string): boolean {
  const l = limitsFor(tier);
  const needsAllLegal = app === "legal" && !CORE_WORKSPACES.includes(String(task || ""));
  return l.apps.includes(app) && (!needsAllLegal || l.legalWorkspaces === "all");
}

export async function prepareRun(db: any, userId: string, tier: Tier, b: RunRequest): Promise<RunResult> {
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
  const input = { task: b?.task ? String(b.task) : undefined, messages, options, documents: b?.documents };

  // Validate once (plan, workspace, inputs) before touching any key.
  const probe = handler.build({ ...input, research: false }, tier);
  if ("error" in probe) return { ok: false, status: probe.status || 400, error: probe.error, extra: probe.status === 402 ? { upgrade: true } : undefined };
  if (inputSize(probe.system, probe.messages) > MAX_INPUT_CHARS) {
    return { ok: false, status: 413, error: "This is too long for one request (about 150,000 tokens). Remove some documents or split them into separate runs." };
  }

  let conns: Connection[];
  try {
    conns = await resolveChatAll(db, userId, { provider: b?.provider as string, model: b?.model as string });
  } catch (e) {
    if (e instanceof ByoxMissingKey) return { ok: false, status: 412, error: e.message, extra: { needKey: true } };
    throw e;
  }
  await recordByoxRequest(db, userId).catch(() => {});

  const plan = (c: Connection): BuiltTask => {
    const research = wantResearch && supportsResearch(c);
    const built = research ? handler.build({ ...input, research: true }, tier) : probe;
    return "error" in built ? probe as BuiltTask : built;
  };

  async function* failover(): AsyncGenerator<string> {
    for (let i = 0; i < conns.length; i++) {
      const c = conns[i];
      const built = plan(c);
      const gen = chatStream(c, built.system, built.messages, { research: built.research, maxOutputTokens: built.maxOutputTokens, temperature: built.temperature });
      let first: IteratorResult<string>;
      try {
        first = await gen.next();
      } catch (err: any) {
        const next = conns[i + 1];
        if (!next) throw err;
        yield statusLine("note", `${providerInfo(c.provider)!.name} failed (${String(err?.message || err).slice(0, 120)}) — continuing with ${providerInfo(next.provider)!.name}.`);
        continue;
      }
      if (i > 0 || (wantResearch && !built.research)) {
        yield statusLine("note", `Answer by ${providerInfo(c.provider)!.name} · ${c.model}${wantResearch && !built.research ? " · live research not supported by this provider" : ""}`);
      }
      if (!first.done) yield first.value;
      yield* gen;
      return;
    }
  }

  const head = conns[0];
  return {
    ok: true,
    meta: { provider: head.provider, model: head.model, research: wantResearch && supportsResearch(head), title: probe.title },
    stream: failover(),
  };
}

const STATUS_RE = /\n?\[\[axto:(search|fetch|note)\|([^\]]*)\]\]\n?/g;
/** Split a chunk into text and status notes (for API clients that want them apart). */
export function splitStatus(chunk: string): { text: string; notes: { kind: string; text: string }[] } {
  const notes: { kind: string; text: string }[] = [];
  const text = chunk.replace(STATUS_RE, (_m, kind, t) => { notes.push({ kind, text: t }); return ""; });
  return { text, notes };
}
