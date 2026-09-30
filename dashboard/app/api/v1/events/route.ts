/* AXTO Connect — events
 *   GET  /api/v1/events?channels=orders.*,chat&after=<id>&limit=100   list (plain polling)
 *   POST /api/v1/events {channel, type?, data}                        publish → every subscriber + webhooks */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { withCaller, background } from "@/lib/connect/route";
import { apiJson, preflight } from "@/lib/connect/http";
import { requireScope, canReadChannel } from "@/lib/connect/auth";
import { eventsAfter, parsePatterns, publishEvent } from "@/lib/connect/events";
import { fanOut } from "@/lib/connect/webhooks";
import { readJson } from "@/lib/http";

export const OPTIONS = (req: NextRequest) => preflight(req, "GET, POST, OPTIONS");

export async function GET(req: NextRequest) {
  return withCaller(req, async (c, db, remaining) => {
    requireScope(c, "events:read");
    const q = new URL(req.url).searchParams;
    const patterns = parsePatterns(q.get("channels") ?? "*");
    const events = (await eventsAfter(db, c.userId, Number(q.get("after")) || 0, patterns, Math.max(1, Math.min(500, Number(q.get("limit")) || 100))))
      .filter((e) => canReadChannel(c, e.channel));
    const cursor = events.length ? events[events.length - 1].id : Number(q.get("after")) || 0;
    return apiJson(req, c, { events, cursor }, 200, { "X-RateLimit-Remaining": remaining });
  }, { allowSession: true });
}

export async function POST(req: NextRequest) {
  return withCaller(req, async (c, db, remaining) => {
    requireScope(c, "events:write");
    const b = await readJson(req);
    const event = await publishEvent(db, c.userId, b || {}, c.keyId || c.via);
    background(fanOut(db, c.userId, event));
    return apiJson(req, c, { event }, 201, { "X-RateLimit-Remaining": remaining });
  }, { allowSession: true });
}
