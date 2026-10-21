/* AXTO — GET /api/invest · the public state of the AXTO investor round: open,
 * paused or closed, the round, the minimum ticket, the revenue pool and the
 * capital verified so far. AXTO only — xaa.es raises separately on xaa.es. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { getInvest, raisedUsd } from "@/lib/invest";

export async function GET(req: NextRequest) {
  const db = getData(req);
  const [offer, raised] = await Promise.all([getInvest(db), raisedUsd(db).catch(() => 0)]);
  return NextResponse.json({ status: offer.status, targetUsd: offer.targetUsd, minUsd: offer.minUsd, poolPct: offer.poolPct, raisedUsd: raised },
    { headers: { "Cache-Control": "no-store" } });
}
