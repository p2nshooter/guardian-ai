/* AXTO — POST /api/auth/register · create a member account (free tier) and sign in. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, newId, now } from "@/lib/db";
import { ConflictError } from "@/lib/r2/store";
import { hashPassword, passwordProblem, normEmail, isEmail, issueSession, loadEntitlement } from "@/lib/auth";
import { readJson, fail, str, ipOf, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail, mails } from "@/lib/mail";
import { attributeSignup, REF_COOKIE } from "@/lib/affiliate";

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

  const db = getData(req);
  const taken = () => fail("An account with this email already exists. Please sign in.", 409);
  if (await db.users.find("email", email)) return taken();
  const id = newId();
  const at = now();
  try {
    // The e-mail guard is taken atomically: two sign-ups with one address at the same moment create one account.
    await db.users.create({
      id, email, role: "client", password_hash: await hashPassword(password), name, organization, country: "", status: "active",
      last_login_at: at, storage_bytes: 0, ai_provider: "", sessions_valid_after: "", created_at: at, updated_at: at,
    });
  } catch (err) {
    if (err instanceof ConflictError) return taken();
    throw err;
  }
  await audit(db, { sub: id, email }, "user.register", "user", id, {}, req);
  // Brought by an affiliate's link (docs/BUSINESS-MASTER-BLUEPRINT.md §7.1): tied once, never to oneself.
  const ref = req.cookies.get(REF_COOKIE)?.value;
  if (ref) await attributeSignup(db, { id, email }, ref, ipOf(req) || "").catch((e) => console.error("referral failed:", e));
  const m = mails.welcome(name);
  await sendMail(email, m.subject, m.html);

  const ent = await loadEntitlement(db, id);
  const res = await issueSession(NextResponse.json({ ok: true, redirect: "/app/billing?welcome=1" }), ent!);
  if (ref) res.cookies.set(REF_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
