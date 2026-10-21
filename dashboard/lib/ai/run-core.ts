/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * BYOX RUN PIPELINE — shared by the member app (/api/byox/run) and the public
 * developer API (/api/v1/ai/run, Connect, MCP). Validates the app and plan,
 * builds the server-side prompt, resolves the MEMBER'S OWN keys and streams
 * the answer with failover to their next key. No AXTO-provided AI is used.
 * ============================================================================ */
import type { Data } from "../data";
import { resolveChatAll, ByoxMissingKey } from "./byox";
import { chatStream, providerInfo, supportsResearch, statusLine, type Connection } from "./providers";
import type { BuiltTask } from "./tasks";
import "./register";
import { limitsFor, type Tier } from "../plans";
import { recordByoxRequest } from "../usage";
import { CORE_WORKSPACES } from "../legal/workspaces";
import { buildRun, OPTION_MAX, type RunRequest } from "./run-build";

export { OPTION_MAX };
export type { RunRequest };
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

export async function prepareRun(db: Data, userId: string, tier: Tier, b: RunRequest): Promise<RunResult> {
  // Validate the app, plan and inputs and build the prompt once, before touching any key.
  const v = buildRun(tier, b);
  if (!v.ok) return v;
  const { handler, input, probe, wantResearch } = v;

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
