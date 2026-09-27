/* AXTO — POST /api/auth/register · create a member account (free tier) and sign in. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, newId, now } from "@/lib/db";
import { hashPassword, passwordProblem, normEmail, isEmail, issueSession, loadEntitlement } from "@/lib/auth";
import { readJson, fail, str, ipOf, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail, mails } from "@/lib/mail";

export async function POST(req: NextRequest) {
  const b = await readJson(req);
  if (!b) return fail("Invalid request.");
  const email = normEmail(b.email);
  const name = str(b.name, 120);
  const organization = str(b.organization, 160);
  const password = String(b.password || "");
  if (!isEmail(email)) return fail("Please enter a valid email address.");
  if (!name) return fail("Please enter your name.");
  const pw = passwordProblem(password);
  if (pw) return fail(pw);
  if (!b.acceptTerms) return fail("Please accept the Terms of Service and Privacy Policy.");

  const rl = await rateLimit(req, "register", ipOf(req) || "anon", { max: 8, windowSeconds: 3600 });
  if (rl.limited) return fail("Too many sign-ups from this network. Please try again later.", 429);

  const db = getDB(req);
  if (await dbFirst(db, `SELECT id FROM users WHERE email = ?`, [email])) {
    return fail("An account with this email already exists. Please sign in.", 409);
  }
  const id = newId();
  await dbRun(db,
    `INSERT INTO users (id, email, role, password_hash, name, organization, status, last_login_at, created_at, updated_at)
     VALUES (?, ?, 'client', ?, ?, ?, 'active', ?, ?, ?)`,
    [id, email, await hashPassword(password), name, organization, now(), now(), now()]);
  await audit(db, { sub: id, email }, "user.register", "user", id, {}, req);
  const m = mails.welcome(name);
  await sendMail(email, m.subject, m.html);

  const ent = await loadEntitlement(db, id);
  return issueSession(NextResponse.json({ ok: true, redirect: "/app/billing?welcome=1" }), ent!);
}
