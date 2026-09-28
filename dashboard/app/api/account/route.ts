/* AXTO — /api/account · the member's own profile.
 *   GET   → profile
 *   PATCH {name, organization, country}         → update profile
 *   POST  {action:"password", current, next}   → change password (re-signs the session) */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, now } from "@/lib/db";
import { loadSession, unauthorized, respond, verifyPassword, hashPassword, passwordProblem, loadEntitlement, issueSession } from "@/lib/auth";
import { readJson, fail, str, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const u = await dbFirst<any>(getDB(req), `SELECT email, name, organization, country, created_at, last_login_at FROM users WHERE id = ?`, [ctx.session.sub]);
  return respond({ profile: u }, ctx);
}

export async function PATCH(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const b = await readJson(req);
  const name = str(b?.name, 120);
  if (!name) return fail("Please enter your name.");
  const country = String(b?.country || "").toUpperCase();
  const db = getDB(req);
  await dbRun(db, `UPDATE users SET name = ?, organization = ?, country = ?, updated_at = ? WHERE id = ?`,
    [name, str(b?.organization, 160), /^[A-Z]{2}$/.test(country) ? country : "", now(), ctx.session.sub]);
  await audit(db, ctx.session, "user.profile_updated", "user", ctx.session.sub, {}, req);
  return respond({ ok: true }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const b = await readJson(req);
  if (b?.action !== "password") return fail("Unknown action.");
  const rl = await rateLimit(req, "password-change", ctx.session.sub, { max: 8, windowSeconds: 3600 });
  if (rl.limited) return fail("Too many attempts. Please wait and try again.", 429);
  const db = getDB(req);
  const u = await dbFirst<{ password_hash: string | null }>(db, `SELECT password_hash FROM users WHERE id = ?`, [ctx.session.sub]);
  if (!u || !(await verifyPassword(String(b?.current || ""), u.password_hash))) return fail("Your current password is incorrect.", 403);
  const next = String(b?.next || "");
  const problem = passwordProblem(next);
  if (problem) return fail(problem);
  await dbRun(db, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [await hashPassword(next), now(), ctx.session.sub]);
  await audit(db, ctx.session, "user.password_changed", "user", ctx.session.sub, {}, req);
  const ent = await loadEntitlement(db, ctx.session.sub);
  return issueSession(NextResponse.json({ ok: true }), ent!);
}
