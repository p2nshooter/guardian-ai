import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json({ sub: user.sub, email: user.email, role: user.role });
}
