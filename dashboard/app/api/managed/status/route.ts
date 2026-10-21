/* AXTO — GET /api/managed/status · whether Managed AI is unlocked (it is LOCKED by default). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { managedEnabled } from "@/lib/ai/managed";
import { MANAGED_PLANS } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const enabled = await managedEnabled(getData(req));
  return NextResponse.json({ enabled, plans: MANAGED_PLANS });
}
