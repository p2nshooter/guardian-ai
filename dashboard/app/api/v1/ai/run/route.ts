/* AXTO Connect — run AI on the member's own keys, streamed
 *   POST /api/v1/ai/run {prompt | messages, app?="studio", task?, provider?, model?, options?}
 * Output (pick with Accept or ?format=):
 *   text/event-stream     SSE: "event: meta", data {"text"} chunks, "event: note", "event: done"
 *   application/x-ndjson  one JSON object per line: meta · delta · note · done  (HTTP/2 & HTTP/3 streaming)
 *   application/json      the whole answer at once
 *   text/plain            raw text stream (default) */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { withCaller } from "@/lib/connect/route";
import { apiJson, corsHeaders, preflight } from "@/lib/connect/http";
import { requireScope, ConnectError } from "@/lib/connect/auth";
import { prepareRun, runAllowed, splitStatus } from "@/lib/ai/run-core";
import { toTextStream } from "@/lib/ai/providers";
import { readJson } from "@/lib/http";

export const OPTIONS = (req: NextRequest) => preflight(req, "POST, OPTIONS");

function formatOf(req: NextRequest): "sse" | "ndjson" | "json" | "text" {
  const f = new URL(req.url).searchParams.get("format");
  if (f === "sse" || f === "ndjson" || f === "json" || f === "text") return f;
  const a = req.headers.get("accept") || "";
  if (a.includes("text/event-stream")) return "sse";
  if (a.includes("application/x-ndjson") || a.includes("application/jsonl")) return "ndjson";
  if (a.includes("application/json") && !a.includes("*/*")) return "json";
  return "text";
}

export async function POST(req: NextRequest) {
  return withCaller(req, async (c, db) => {
    requireScope(c, "ai:run");
    const b = (await readJson(req)) || {};
    const app = String(b.app || "studio");
    if (!runAllowed(c.tier, app, String(b.task || ""))) throw new ConnectError("Your plan does not include this app or workspace.", 402, "failed_precondition");
    const messages = Array.isArray(b.messages) ? b.messages : typeof b.prompt === "string" ? [{ role: "user", content: b.prompt }] : [];
    const run = await prepareRun(db, c.userId, c.tier, { ...b, app, messages });
    if (!run.ok) throw new ConnectError(run.error, run.status, run.status === 412 ? "failed_precondition" : run.status === 402 ? "failed_precondition" : "invalid_argument");
    const fmt = formatOf(req);
    const head = { "Cache-Control": "no-store", "X-Accel-Buffering": "no", "X-AI-Provider": run.meta.provider, "X-AI-Model": encodeURIComponent(run.meta.model), ...corsHeaders(req, c) };
    if (fmt === "text") return new Response(toTextStream(run.stream), { headers: { "Content-Type": "text/plain; charset=utf-8", ...head } });
    if (fmt === "json") {
      let text = ""; const notes: unknown[] = [];
      for await (const chunk of run.stream) { const s = splitStatus(chunk); text += s.text; notes.push(...s.notes); }
      return apiJson(req, c, { text: text.trim(), notes, provider: run.meta.provider, model: run.meta.model, title: run.meta.title });
    }
    const enc = new TextEncoder();
    const line = fmt === "sse"
      ? (type: string, data: unknown) => (type === "delta" ? `data: ${JSON.stringify(data)}\n\n` : `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
      : (type: string, data: unknown) => `${JSON.stringify({ type, ...(data as object) })}\n`;
    const gen = run.stream;
    let chars = 0;
    const body = new ReadableStream<Uint8Array>({
      async start(ctl) { ctl.enqueue(enc.encode(line("meta", { provider: run.meta.provider, model: run.meta.model, title: run.meta.title }))); },
      async pull(ctl) {
        try {
          const { value, done } = await gen.next();
          if (done) { ctl.enqueue(enc.encode(line("done", { chars }))); ctl.close(); return; }
          const s = splitStatus(value);
          for (const n of s.notes) ctl.enqueue(enc.encode(line("note", n)));
          if (s.text) { chars += s.text.length; ctl.enqueue(enc.encode(line("delta", { text: s.text }))); }
        } catch (e: any) {
          ctl.enqueue(enc.encode(line("error", { message: String(e?.message || e).slice(0, 400) })));
          ctl.close();
        }
      },
      async cancel() { await gen.return?.(undefined); },
    });
    return new Response(body, { headers: { "Content-Type": fmt === "sse" ? "text/event-stream; charset=utf-8" : "application/x-ndjson; charset=utf-8", ...head } });
  }, { allowSession: true });
}
