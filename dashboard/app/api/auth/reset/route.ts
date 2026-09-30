/* AXTO — POST /api/auth/reset · set a new password with a valid reset token. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, now } from "@/lib/db";
import { hashPassword, passwordProblem, issueSession, loadEntitlement, signOutOtherSessions } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";

export async function POST(req: NextRequest) {
  const b = await readJson(req);
  const token = String(b?.token || "");
  const password = String(b?.password || "");
  const pw = passwordProblem(password);
  if (pw) return fail(pw);
  const db = getDB(req);
  const row = await dbFirst<{ email: string }>(db,
    `SELECT email FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')`, [token]);
  if (!row) return fail("This reset link is invalid or has expired. Request a new one.");
  const u = await dbFirst<{ id: string }>(db, `SELECT id FROM users WHERE email = ?`, [row.email]);
  if (!u) return fail("Account not found.");
  // Claim the token atomically: two requests racing with the same link cannot both succeed.
  const claimed = await dbRun(db, `UPDATE password_resets SET used = 1 WHERE token = ? AND used = 0`, [token]);
  if (!claimed?.meta?.changes) return fail("This reset link is invalid or has expired. Request a new one.");
  await dbRun(db, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [await hashPassword(password), now(), u.id]);
  await signOutOtherSessions(db, u.id);
  await audit(db, { sub: u.id, email: row.email }, "user.password_reset", "user", u.id, {}, req);
  const ent = await loadEntitlement(db, u.id);
  if (!ent) return fail("This account is suspended.", 403);
  return issueSession(NextResponse.json({ ok: true, redirect: ent.role === "admin" ? "/admin" : "/app" }), ent);
}
