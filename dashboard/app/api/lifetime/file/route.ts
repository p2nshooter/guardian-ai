/* AXTO — GET /api/lifetime/file?id=<activation id> · download a device's signed
 * .axto-license file again (members: their own; admins: any, for support). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import type { Data } from "@/lib/data";
import { loadSession } from "@/lib/auth";
import { SigningUnavailable } from "@/lib/license-sign";
import { activationFileFor } from "@/lib/lifetime-service";

/** The customer an activation belongs to (activation → licence → member). */
async function activationOwner(db: Data, activationId: string) {
  const a = await db.lifetimeActivations.get(activationId);
  const l = a ? await db.lifetimeLicenses.get(a.license_id) : null;
  return l ? db.users.get(l.user_id) : null;
}

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return NextResponse.redirect(new URL("/login?redirect=/app/lifetime", req.url));
  const db = getData(req);
  const id = new URL(req.url).searchParams.get("id") || "";
  const admin = ctx.session.role === "admin";
  const owner = admin ? await activationOwner(db, id) : await db.users.get(ctx.session.sub);
  const customer = [owner?.organization, owner?.name, owner?.email].filter(Boolean).join(" · ");
  try {
    const f = await activationFileFor(db, id, admin ? null : ctx.session.sub, customer);
    if (!f) return new NextResponse("Activation not found.", { status: 404 });
    return new NextResponse(f.file, {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${f.filename}"`, "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    if (e instanceof SigningUnavailable) return new NextResponse("Activation is temporarily unavailable.", { status: 503 });
    throw e;
  }
}
