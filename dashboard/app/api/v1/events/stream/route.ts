/* AXTO Connect — Server-Sent Events
 *   GET /api/v1/events/stream?channels=…&after=<id|now>   (Accept: text/event-stream)
 * Each event: "id: <id>\ndata: {id, channel, type, data, createdAt}\n\n".
 * EventSource reconnects by itself with Last-Event-ID, so nothing is missed;
 * the server closes each stream after ~55 s (heartbeat every 15 s). */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { withCaller, sleep } from "@/lib/connect/route";
import { corsHeaders, preflight } from "@/lib/connect/http";
import { requireScope, canReadChannel } from "@/lib/connect/auth";
import { eventsAfter, parsePatterns, startCursor } from "@/lib/connect/events";

export const OPTIONS = (req: NextRequest) => preflight(req, "GET, OPTIONS");

export async function GET(req: NextRequest) {
  return withCaller(req, async (c, db) => {
    requireScope(c, "events:read");
    const q = new URL(req.url).searchParams;
    const patterns = parsePatterns(q.get("channels") ?? "*");
    let cursor = await startCursor(db, c.userId, req.headers.get("last-event-id"), q.get("after"));
    const maxMs = Math.max(5, Math.min(55, Number(q.get("maxSeconds")) || 55)) * 1000;
    const enc = new TextEncoder();
    const started = Date.now();
    const body = new ReadableStream<Uint8Array>({
      async start(ctl) {
        const send = (s: string) => { try { ctl.enqueue(enc.encode(s)); return true; } catch { return false; } };
        send(`retry: 2000\n: connected cursor=${cursor}\n\n`);
        let lastBeat = Date.now();
        while (!req.signal.aborted && Date.now() - started < maxMs) {
          const events = await eventsAfter(db, c.userId, cursor, patterns, 100).catch(() => []);
          for (const e of events) {
            cursor = e.id;
            if (!canReadChannel(c, e.channel)) continue;
            if (!send(`id: ${e.id}\ndata: ${JSON.stringify(e)}\n\n`)) return;
          }
          if (Date.now() - lastBeat > 15_000) { if (!send(`: ping ${Date.now()}\n\n`)) return; lastBeat = Date.now(); }
          await sleep(Date.now() - started < 15_000 ? 1000 : 2000, req.signal);
        }
        send(`event: reconnect\ndata: {"cursor":${cursor}}\n\n`);
        try { ctl.close(); } catch {}
      },
    });
    return new Response(body, {
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", ...corsHeaders(req, c) },
    });
  }, { allowSession: true });
}
