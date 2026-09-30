/* AXTO Connect — short-lived stream tokens for browsers
 *   POST /api/v1/tokens {channels: ["chat:*"], ttl: 3600, scopes?: ["events:read"]}   (Authorization: Bearer axto_sk_…)
 * Mint on YOUR server with the secret key, hand the token to the browser, and
 * open EventSource / WebSocket / long polling with ?token=…  The token can only
 * read the channels it names and expires (default 1 h, max 24 h). */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { withCaller } from "@/lib/connect/route";
import { apiJson, preflight } from "@/lib/connect/http";
import { ConnectError, cleanScopes, mintStreamToken } from "@/lib/connect/auth";
import { parsePatterns } from "@/lib/connect/events";
import { readJson } from "@/lib/http";

export const OPTIONS = (req: NextRequest) => preflight(req, "POST, OPTIONS");

export async function POST(req: NextRequest) {
  return withCaller(req, async (c) => {
    if (c.via !== "key" || !c.keyId) throw new ConnectError("Mint stream tokens with an API key (Authorization: Bearer axto_sk_…).", 403, "permission_denied");
    const b = await readJson(req);
    const channels = parsePatterns(b?.channels ?? "*");
    const wanted = b?.scopes ? cleanScopes(b.scopes) : (["events:read"] as const);
    const scopes = wanted.filter((s) => c.scopes.includes(s));
    if (!scopes.length) throw new ConnectError("The key has none of the requested scopes.", 403, "permission_denied");
    const t = await mintStreamToken({ sub: c.userId, kid: c.keyId, ch: channels, sc: [...scopes], og: c.origins }, Number(b?.ttl) || 3600);
    return apiJson(req, c, { token: t.token, expiresAt: t.expiresAt, channels, scopes }, 201);
  });
}
