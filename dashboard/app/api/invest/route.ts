/* AXTO — GET /api/invest · the public state of the AXTO investor round: open,
 * paused or closed, the round, the minimum ticket, the revenue pool and the
 * capital verified so far. AXTO only — xaa.es raises separately on xaa.es.
 * While the owner keeps the round hidden (§26.4, the default) it answers only
 * {visible:false} — 200, because the footer asks on every public page and a
 * 404 there would be a console error for every visitor. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { getInvest, raisedUsd } from "@/lib/invest";

export async function GET(req: NextRequest) {
  const db = getData(req);
  const offer = await getInvest(db);
  if (!offer.visible) return NextResponse.json({ visible: false }, { headers: { "Cache-Control": "no-store" } });
  const raised = await raisedUsd(db).catch(() => 0);
  return NextResponse.json({ visible: true, status: offer.status, targetUsd: offer.targetUsd, minUsd: offer.minUsd, poolPct: offer.poolPct, raisedUsd: raised },
    { headers: { "Cache-Control": "no-store" } });
}
