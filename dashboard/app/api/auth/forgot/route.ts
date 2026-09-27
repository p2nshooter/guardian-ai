/* AXTO — POST /api/auth/forgot · email a one-time password-reset link (30 min). */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getDB, dbFirst, dbRun, newId } from "@/lib/db";
import { normEmail, isEmail } from "@/lib/auth";
import { readJson, ok, ipOf } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail, mails } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";

export async function POST(req: NextRequest) {
  const b = await readJson(req);
  const email = normEmail(b?.email);
  const done = ok({ message: "If an account exists for that email, a reset link is on its way." });
  if (!isEmail(email)) return done;
  const rl = await rateLimit(req, "forgot", `${ipOf(req)}:${email}`, { max: 5, windowSeconds: 3600 });
  if (rl.limited) return done;
  const db = getDB(req);
  const u = await dbFirst(db, `SELECT id FROM users WHERE email = ? AND status = 'active'`, [email]);
  if (!u) return done;
  const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
  await dbRun(db, `INSERT INTO password_resets (id, email, token, expires_at, used, created_at) VALUES (?, ?, ?, datetime('now', '+30 minutes'), 0, datetime('now'))`,
    [newId(), email, token]);
  const m = mails.passwordReset(absoluteUrl(`/reset-password?token=${token}`));
  await sendMail(email, m.subject, m.html);
  return done;
}
