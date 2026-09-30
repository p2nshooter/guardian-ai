/* AXTO Connect — GET /api/v1/openapi.json : OpenAPI 3.1 description of the REST surface. */
export const runtime = "edge";
import { openApi } from "@/lib/connect/openapi";

export function GET(req: Request) {
  return new Response(JSON.stringify(openApi(new URL(req.url).origin), null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
  });
}
