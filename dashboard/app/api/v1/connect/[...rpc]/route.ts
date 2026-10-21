/* AXTO Connect — Connect protocol (gRPC-compatible), JSON codec
 *   POST /api/v1/connect/axto.connect.v1.EventService/Publish     unary        application/json
 *   POST /api/v1/connect/axto.connect.v1.EventService/List        unary        application/json
 *   POST /api/v1/connect/axto.connect.v1.EventService/Subscribe   server-stream application/connect+json
 *   POST /api/v1/connect/axto.connect.v1.AiService/Run            server-stream application/connect+json
 * Service definitions: GET /api/v1/axto.proto  (codegen with buf + connect-es / connect-go …). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { withCaller, background, sleep } from "@/lib/connect/route";
import { corsHeaders, preflight } from "@/lib/connect/http";
import { requireScope, canReadChannel, ConnectError, type Caller } from "@/lib/connect/auth";
import { eventsAfter, parsePatterns, publishEvent, startCursor, SETTLE_MS } from "@/lib/connect/events";
import { fanOut } from "@/lib/connect/webhooks";
import { prepareRun, runAllowed, splitStatus } from "@/lib/ai/run-core";
import { CONNECT_JSON, CODE_STATUS, envelope, readEnvelope, statusCode } from "@/lib/connect/connect-protocol";

export const OPTIONS = (req: NextRequest) => preflight(req, "POST, OPTIONS");
type Params = { params: Promise<{ rpc: string[] }> };

const unaryError = (req: NextRequest, c: Caller | null, e: ConnectError) =>
  NextResponse.json({ code: e.code, message: e.message }, { status: CODE_STATUS[e.code] || e.status, headers: corsHeaders(req, c) });

function streamResponse(req: NextRequest, c: Caller, produce: (send: (m: unknown) => boolean) => Promise<void>) {
  const body = new ReadableStream<Uint8Array>({
    async start(ctl) {
      const send = (m: unknown) => { try { ctl.enqueue(envelope(m)); return true; } catch { return false; } };
      try { await produce(send); ctl.enqueue(envelope({}, true)); }
      catch (e: any) {
        const ce = e instanceof ConnectError ? e : new ConnectError(String(e?.message || e), 500, "internal");
        ctl.enqueue(envelope({ error: { code: ce.code, message: ce.message } }, true));
      }
      try { ctl.close(); } catch {}
    },
  });
  return new Response(body, { headers: { "Content-Type": CONNECT_JSON, "Cache-Control": "no-store", ...corsHeaders(req, c) } });
}

export async function POST(req: NextRequest, { params }: Params) {
  const method = (await params).rpc.join("/");
  const ct = (req.headers.get("content-type") || "").split(";")[0].trim();
  const streaming = method.endsWith("/Subscribe") || method.endsWith("/Run");
  if (streaming && ct !== CONNECT_JSON) return NextResponse.json({ code: "invalid_argument", message: `Server-streaming methods take Content-Type: ${CONNECT_JSON}` }, { status: 415 });
  if (!streaming && ct !== "application/json") return NextResponse.json({ code: "invalid_argument", message: "Unary methods take Content-Type: application/json (JSON codec)." }, { status: 415 });

  const raw = new Uint8Array(await req.arrayBuffer());
  let msg: any;
  try { msg = streaming ? readEnvelope(raw) : JSON.parse(new TextDecoder().decode(raw) || "{}"); }
  catch { return NextResponse.json({ code: "invalid_argument", message: "The request message is not valid JSON." }, { status: 400 }); }

  return withCaller(req, async (c, db) => {
    try {
      switch (method) {
        case "axto.connect.v1.EventService/Publish": {
          requireScope(c, "events:write");
          const e = await publishEvent(db, c.userId, msg, c.keyId || c.via);
          background(fanOut(db, c.userId, e));
          return NextResponse.json({ event: { ...e, created_at: e.createdAt } }, { headers: corsHeaders(req, c) });
        }
        case "axto.connect.v1.EventService/List": {
          requireScope(c, "events:read");
          const events = (await eventsAfter(db, c.userId, Number(msg.after) || 0, parsePatterns(msg.channels?.length ? msg.channels : "*"), Math.max(1, Math.min(500, Number(msg.limit) || 100))))
            .filter((e) => canReadChannel(c, e.channel));
          return NextResponse.json({ events, cursor: String(events.at(-1)?.id ?? (Number(msg.after) || 0)) }, { headers: corsHeaders(req, c) });
        }
        case "axto.connect.v1.EventService/Subscribe": {
          requireScope(c, "events:read");
          const patterns = parsePatterns(msg.channels?.length ? msg.channels : "*");
          let cursor = await startCursor(db, c.userId, null, msg.after !== undefined && msg.after !== null ? String(msg.after) : null);
          const until = Date.now() + Math.max(5, Math.min(55, Number(msg.max_seconds ?? msg.maxSeconds) || 55)) * 1000;
          return streamResponse(req, c, async (send) => {
            while (!req.signal.aborted && Date.now() < until) {
              for (const e of await eventsAfter(db, c.userId, cursor, patterns, 100, SETTLE_MS)) {
                cursor = e.id;
                if (canReadChannel(c, e.channel) && !send({ ...e, created_at: e.createdAt })) return;
              }
              await sleep(1000, req.signal);
            }
          });
        }
        case "axto.connect.v1.AiService/Run": {
          requireScope(c, "ai:run");
          const app = String(msg.app || "studio");
          if (!runAllowed(c.tier, app, String(msg.task || ""))) throw new ConnectError("Your plan does not include this app or workspace.", 402, "failed_precondition");
          const run = await prepareRun(db, c.userId, c.tier, { app, task: msg.task, messages: msg.messages, provider: msg.provider, model: msg.model, options: msg.options });
          if (!run.ok) throw new ConnectError(run.error, run.status, statusCode(run.status));
          return streamResponse(req, c, async (send) => {
            send({ provider: run.meta.provider, model: run.meta.model });
            for await (const chunk of run.stream) {
              const s = splitStatus(chunk);
              for (const n of s.notes) send({ note: n.text });
              if (s.text && !send({ text: s.text })) return;
            }
            send({ done: true });
          });
        }
        default:
          throw new ConnectError(`Unknown method ${method.slice(0, 80)}. See /api/v1/axto.proto`, 404, "unimplemented");
      }
    } catch (e) {
      if (e instanceof ConnectError) return unaryError(req, c, e);
      throw e;
    }
  });
}
