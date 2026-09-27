/* AXTO — GET /api/health · liveness + binding check (no secrets, no data). */
export const runtime = "edge";
import { NextResponse } from "next/server";
import { getEnv, dbFirst } from "@/lib/db";

export async function GET() {
  const env = getEnv();
  let d1 = false;
  try { d1 = !!(await dbFirst(env.DB, `SELECT 1 AS ok`)); } catch {}
  return NextResponse.json({
    ok: d1, version: "3.0.0",
    bindings: { d1, kv: !!env.KV, r2: !!env.R2, userFiles: !!env.USER_FILES, builds: !!env.R2_BUILDS },
    time: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
