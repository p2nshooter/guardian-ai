/* AXTO — GET /api/auction · the licence auction in public (§26.5): this
 * auction's lots (price, bids, the leader as a masked name, the end), the last
 * auction's results and the recent winners with the name they chose. No
 * e-mail, no user id, no bid history. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { publicBoard } from "@/lib/auction";

export async function GET(req: NextRequest) {
  const board = await publicBoard(getData(req));
  return NextResponse.json(board, { headers: { "Cache-Control": "no-store" } });
}
