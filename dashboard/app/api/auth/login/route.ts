/* AXTO — POST /api/auth/login · email + password sign-in for members and admins. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { safeRedirect } from "@/lib/safe-redirect";
import { getData, now, secret } from "@/lib/db";
import { verifyPassword, normEmail, issueSession, loadEntitlement } from "@/lib/auth";
import { readJson, fail, ipOf, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";


export async function POST(req: NextRequest) {
  const b = await readJson(req);
  const email = normEmail(b?.email);
  const password = String(b?.password || "");
  if (!email || !password) return fail("Enter your email and password.");

  const ip = ipOf(req) || "anon";
  const rlIp = await rateLimit(req, "login-ip", ip, { max: 20, windowSeconds: 900 });
  const rlEmail = await rateLimit(req, "login-email", email, { max: 10, windowSeconds: 900 });
  if (rlIp.limited || rlEmail.limited) return fail("Too many attempts. Please wait 15 minutes and try again.", 429);

  const db = getData(req);
  const u = await db.users.find("email", email);
  let valid = !!u && await verifyPassword(password, u.password_hash);
  // Break-glass admin password (Pages secret ADMIN_PASSWORD) for admin accounts only.
  const envAdmin = secret("ADMIN_PASSWORD");
  if (!valid && u?.role === "admin" && envAdmin && password === envAdmin) valid = true;
  if (!u || !valid) {
    await new Promise((r) => setTimeout(r, 400));
    return fail("Incorrect email or password.", 401);
  }
  if (u.status && u.status !== "active") return fail("This account is suspended. Contact support.", 403);

  await db.users.update(u.id, (x) => ({ ...x, last_login_at: now() })).catch(() => {});
  await audit(db, { sub: u.id, email }, "user.login", "user", u.id, {}, req);
  const ent = await loadEntitlement(db, u.id);
  const redirect = safeRedirect(b?.redirect, ent!.role === "admin" ? "/admin" : "/app");
  return issueSession(NextResponse.json({ ok: true, redirect }), ent!);
}
