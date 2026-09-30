/* AXTO Connect — long polling
 *   GET /api/v1/events/poll?channels=…&after=<id>&wait=25
 * Answers as soon as there is at least one event after the cursor, or after
 * `wait` seconds (max 30) with an empty list. Works through any proxy. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { withCaller, sleep } from "@/lib/connect/route";
import { apiJson, preflight } from "@/lib/connect/http";
import { requireScope, canReadChannel } from "@/lib/connect/auth";
import { eventsAfter, parsePatterns, startCursor } from "@/lib/connect/events";

export const OPTIONS = (req: NextRequest) => preflight(req, "GET, OPTIONS");

export async function GET(req: NextRequest) {
  return withCaller(req, async (c, db) => {
    requireScope(c, "events:read");
    const q = new URL(req.url).searchParams;
    const patterns = parsePatterns(q.get("channels") ?? "*");
    const wait = Math.max(0, Math.min(30, Number(q.get("wait") ?? 25) || 0));
    let cursor = await startCursor(db, c.userId, null, q.get("after"));
    const until = Date.now() + wait * 1000;
    for (;;) {
      const events = (await eventsAfter(db, c.userId, cursor, patterns, 100)).filter((e) => canReadChannel(c, e.channel));
      if (events.length) return apiJson(req, c, { events, cursor: events[events.length - 1].id });
      if (Date.now() >= until || req.signal.aborted) return apiJson(req, c, { events: [], cursor });
      await sleep(1000, req.signal);
    }
  }, { allowSession: true });
}
