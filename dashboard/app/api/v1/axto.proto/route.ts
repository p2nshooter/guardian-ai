/* AXTO Connect — GET /api/v1/axto.proto : service definitions for gRPC / Connect code generation. */
export const runtime = "edge";
import { PROTO } from "@/lib/connect/connect-protocol";

export function GET() {
  return new Response(PROTO, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } });
}
