/* AXTO Connect — WebSocket (bidirectional)
 *   GET /api/v1/ws?token=axto_st_…  (Upgrade: websocket)   or  Authorization: Bearer axto_sk_… (server clients)
 * Client → server  {"op":"subscribe","channels":["chat:*"],"after":123}
 *                  {"op":"publish","channel":"chat:1","type":"message","data":{…},"ref":"c1"}
 *                  {"op":"ping"}
 * Server → client  {"op":"event","event":{id, channel, type, data, createdAt}}
 *                  {"op":"ack","ref":"c1","id":456} · {"op":"pong"} · {"op":"error","message":"…"}
 * The socket closes after 10 minutes (code 4000 "reconnect"); resume with "after". */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { withCaller, background } from "@/lib/connect/route";
import { requireScope, canReadChannel, ConnectError } from "@/lib/connect/auth";
import { eventsAfter, parsePatterns, publishEvent, latestEventId, SETTLE_MS } from "@/lib/connect/events";
import { fanOut } from "@/lib/connect/webhooks";
import { rateLimit } from "@/lib/rate-limit";
import { limitsFor } from "@/lib/plans";

const MAX_LIFETIME_MS = 10 * 60_000;

export async function GET(req: NextRequest) {
  if ((req.headers.get("upgrade") || "").toLowerCase() !== "websocket") {
    return new Response(JSON.stringify({ error: { code: "invalid_argument", message: "Open this URL with a WebSocket client (Upgrade: websocket)." } }), { status: 426, headers: { "Content-Type": "application/json", Upgrade: "websocket" } });
  }
  return withCaller(req, async (c, db) => {
    requireScope(c, "events:read");
    const Pair = (globalThis as any).WebSocketPair;
    if (!Pair) throw new ConnectError("WebSockets are not available on this server.", 501, "unimplemented");
    const pair = new Pair();
    const client = pair[0], server = pair[1];
    server.accept();
    let patterns: string[] = [];
    let cursor = await latestEventId(db, c.userId);
    let open = true;
    const started = Date.now();
    const send = (m: unknown) => { try { server.send(JSON.stringify(m)); } catch { open = false; } };
    const rpm = Math.max(1, limitsFor(c.tier).apiRpm);

    server.addEventListener("message", async (ev: MessageEvent) => {
      let m: any;
      try { m = JSON.parse(typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data as ArrayBuffer)); } catch { send({ op: "error", message: "Send JSON messages." }); return; }
      try {
        if (m?.op === "ping") { send({ op: "pong", at: Date.now() }); return; }
        if (m?.op === "subscribe") {
          patterns = parsePatterns(m.channels ?? "*");
          if (Number.isFinite(Number(m.after)) && m.after !== undefined) cursor = Math.max(0, Number(m.after));
          send({ op: "subscribed", channels: patterns, cursor });
          return;
        }
        if (m?.op === "publish") {
          requireScope(c, "events:write");
          const rl = await rateLimit(req, "connect", c.userId, { max: rpm, windowSeconds: 60 });
          if (rl.limited) { send({ op: "error", ref: m.ref, message: `Rate limit reached (${rpm}/min).` }); return; }
          const e = await publishEvent(db, c.userId, m, c.keyId || c.via);
          background(fanOut(db, c.userId, e));
          send({ op: "ack", ref: m.ref, id: e.id });
          return;
        }
        send({ op: "error", ref: m?.ref, message: "Unknown op. Use subscribe, publish or ping." });
      } catch (e: any) { send({ op: "error", ref: m?.ref, message: String(e?.message || e).slice(0, 300) }); }
    });
    server.addEventListener("close", () => { open = false; });
    server.addEventListener("error", () => { open = false; });

    // Deliver new events while the socket is open.
    background((async () => {
      let lastBeat = Date.now();
      while (open && Date.now() - started < MAX_LIFETIME_MS) {
        if (patterns.length) {
          const events = await eventsAfter(db, c.userId, cursor, patterns, 100, SETTLE_MS).catch(() => []);
          for (const e of events) { cursor = e.id; if (canReadChannel(c, e.channel)) send({ op: "event", event: e }); }
        }
        if (Date.now() - lastBeat > 30_000) { send({ op: "heartbeat", cursor }); lastBeat = Date.now(); }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (open) { try { server.close(4000, "reconnect"); } catch {} }
    })());

    const protocol = (req.headers.get("sec-websocket-protocol") || "").split(",").map((s) => s.trim()).find((p) => p === "axto.v1");
    return new Response(null, { status: 101, webSocket: client, headers: protocol ? { "Sec-WebSocket-Protocol": protocol } : {} } as any);
  });
}
