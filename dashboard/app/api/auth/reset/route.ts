/* AXTO — POST /api/auth/reset · set a new password with a valid reset token. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, now } from "@/lib/db";
import { consumePasswordReset } from "@/lib/password-reset";
import { hashPassword, passwordProblem, issueSession, loadEntitlement, signOutOtherSessions } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";

export async function POST(req: NextRequest) {
  const b = await readJson(req);
  const token = String(b?.token || "");
  const password = String(b?.password || "");
  const pw = passwordProblem(password);
  if (pw) return fail(pw);
  const db = getData(req);
  // Claimed atomically: two requests racing with the same link cannot both succeed.
  const email = await consumePasswordReset(db, token);
  if (!email) return fail("This reset link is invalid or has expired. Request a new one.");
  const u = await db.users.find("email", email);
  if (!u) return fail("Account not found.");
  const hash = await hashPassword(password);
  await db.users.update(u.id, (x) => ({ ...x, password_hash: hash, updated_at: now() }));
  await signOutOtherSessions(db, u.id);
  await audit(db, { sub: u.id, email }, "user.password_reset", "user", u.id, {}, req);
  const ent = await loadEntitlement(db, u.id);
  if (!ent) return fail("This account is suspended.", 403);
  return issueSession(NextResponse.json({ ok: true, redirect: ent.role === "admin" ? "/admin" : "/app" }), ent);
}
