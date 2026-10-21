/* AXTO — POST /api/auth/forgot · email a one-time password-reset link (30 min). */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { createPasswordReset } from "@/lib/password-reset";
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
  const db = getData(req);
  const u = await db.users.find("email", email);
  if (!u || u.status !== "active") return done;
  const token = await createPasswordReset(db, email);
  const m = mails.passwordReset(absoluteUrl(`/reset-password?token=${token}`));
  await sendMail(email, m.subject, m.html);
  return done;
}
