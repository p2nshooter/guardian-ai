/* AXTO — /api/account · the member's own profile.
 *   GET   → profile
 *   PATCH {name, organization, country}         → update profile
 *   POST  {action:"password", current, next}   → change password (re-signs the session) */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, now } from "@/lib/db";
import { loadSession, unauthorized, respond, verifyPassword, hashPassword, passwordProblem, loadEntitlement, issueSession, signOutOtherSessions } from "@/lib/auth";
import { readJson, fail, str, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const u = await getData(req).users.get(ctx.session.sub);
  const profile = u ? { email: u.email, name: u.name, organization: u.organization, country: u.country, created_at: u.created_at, last_login_at: u.last_login_at } : null;
  return respond({ profile }, ctx);
}

export async function PATCH(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const b = await readJson(req);
  const name = str(b?.name, 120);
  if (!name) return fail("Please enter your name.");
  const country = String(b?.country || "").toUpperCase();
  const db = getData(req);
  const organization = str(b?.organization, 160);
  await db.users.update(ctx.session.sub, (u) => ({ ...u, name, organization, country: /^[A-Z]{2}$/.test(country) ? country : "", updated_at: now() }));
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
  const db = getData(req);
  const u = await db.users.get(ctx.session.sub);
  if (!u || !(await verifyPassword(String(b?.current || ""), u.password_hash))) return fail("Your current password is incorrect.", 403);
  const next = String(b?.next || "");
  const problem = passwordProblem(next);
  if (problem) return fail(problem);
  const hash = await hashPassword(next);
  await db.users.update(ctx.session.sub, (x) => ({ ...x, password_hash: hash, updated_at: now() }));
  await signOutOtherSessions(db, ctx.session.sub);   // this device gets a fresh token below
  await audit(db, ctx.session, "user.password_changed", "user", ctx.session.sub, {}, req);
  const ent = await loadEntitlement(db, ctx.session.sub);
  return issueSession(NextResponse.json({ ok: true }), ent!);
}
