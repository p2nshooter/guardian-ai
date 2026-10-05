/* AXTO — GET /api/lifetime/deal · public: today's lifetime prices with the
 * Friday deal applied (every Friday −30 %, the last Friday of the month −50 %,
 * in the owner's time zone), when it ends and when the next one starts.
 * Display only — checkout recomputes the price on the server. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { dealPayload } from "@/lib/lifetime-pricing";

export async function GET(req: NextRequest) {
  const { cfg: _cfg, ...p } = await dealPayload(getDB(req));
  return NextResponse.json(p, { headers: { "Cache-Control": "public, max-age=60" } });
}
