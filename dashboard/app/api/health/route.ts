export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst } from "@/lib/db";


export async function GET(req: NextRequest) {
  const checks: Record<string, any> = { timestamp: new Date().toISOString(), version: "2.2.0" };

  try {
    const db = getDB(req);
    const start = Date.now();
    await dbFirst(db, `SELECT 1 as ok`);
    checks.db = { status: "ok", latency_ms: Date.now() - start };
  } catch (e: any) {
    checks.db = { status: "error", message: e.message };
  }

  const allOk = checks.db?.status === "ok";
  return NextResponse.json({ status: allOk ? "ok" : "degraded", ...checks }, { status: allOk ? 200 : 503 });
}
