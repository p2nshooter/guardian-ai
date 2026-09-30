/* AXTO Connect — MCP server (Streamable HTTP, stateless)
 *   POST /api/v1/mcp  JSON-RPC 2.0 (single message or batch)   Authorization: Bearer axto_sk_…
 * Replies are application/json; notifications get 202. GET is not used (no
 * server-initiated stream), so it answers 405 as the specification allows. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { withCaller } from "@/lib/connect/route";
import { corsHeaders, preflight } from "@/lib/connect/http";
import { handleMcp } from "@/lib/connect/mcp";

export const OPTIONS = (req: NextRequest) => preflight(req, "POST, OPTIONS");
export const GET = () => new NextResponse(null, { status: 405, headers: { Allow: "POST, OPTIONS" } });
export const DELETE = () => new NextResponse(null, { status: 405, headers: { Allow: "POST, OPTIONS" } });

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 }); }
  return withCaller(req, async (c, db) => {
    const batch = Array.isArray(body);
    const msgs = (batch ? body : [body]).slice(0, 20);
    const out = (await Promise.all(msgs.map((m: any) => handleMcp(m, c, db)))).filter(Boolean);
    if (!out.length) return new NextResponse(null, { status: 202, headers: corsHeaders(req, c) });
    return NextResponse.json(batch ? out : out[0], { headers: { "Cache-Control": "no-store", ...corsHeaders(req, c) } });
  });
}
