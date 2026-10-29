/* AXTO — POST /api/ref {code} · a visit through an affiliate link (?ref=<code>,
 * components/site/RefCapture). The click is recorded (append-only, the address
 * only as a hash) and the code is remembered in a first-party, httpOnly cookie
 * for the programme's cookie window; the last link clicked wins (§7.1). The
 * account is tied to the affiliate when the visitor signs up. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { readJson, ipOf } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { REF_COOKIE, isCode, recordClick } from "@/lib/affiliate";
import { getPrograms, isShown } from "@/lib/programs";

export async function POST(req: NextRequest) {
  const b = await readJson(req);
  const code = String(b?.code ?? "").trim().toLowerCase();
  const none = NextResponse.json({ tracked: false }, { headers: { "Cache-Control": "no-store" } });
  if (!isCode(code)) return none;
  const ip = ipOf(req);
  const rl = await rateLimit(req, "ref", ip || "anon", { max: 60, windowSeconds: 3600 });
  if (rl.limited) return none;
  const db = getData(req);
  const p = await getPrograms(db);
  if (!isShown(p, "affiliate")) return none;
  const aff = await recordClick(db, code, ip).catch(() => null);
  if (!aff) return none;
  const res = NextResponse.json({ tracked: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(REF_COOKIE, code, { path: "/", maxAge: p.affiliate.cookieDays * 86_400, httpOnly: true, secure: true, sameSite: "lax" });
  return res;
}
