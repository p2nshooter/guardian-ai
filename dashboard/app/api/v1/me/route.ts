/* AXTO Connect — GET /api/v1/me : who this key belongs to, its scopes and the plan limits. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { withCaller } from "@/lib/connect/route";
import { apiJson, preflight } from "@/lib/connect/http";
import { limitsFor } from "@/lib/plans";

export const OPTIONS = (req: NextRequest) => preflight(req, "GET, OPTIONS");

export async function GET(req: NextRequest) {
  return withCaller(req, async (c, _db, remaining) => {
    const l = limitsFor(c.tier);
    return apiJson(req, c, {
      plan: c.tier, via: c.via, scopes: c.scopes, key: c.keyId || null, channels: c.channels || ["*"],
      limits: { apiKeys: l.apiKeys, requestsPerMinute: l.apiRpm, webhooks: l.webhooks, remainingThisMinute: Number(remaining) },
      transports: ["rest", "sse", "long-polling", "websocket", "ndjson", "connect", "webrtc", "webhooks", "mcp"],
    });
  }, { allowSession: true });
}
