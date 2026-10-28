/* AXTO — GET /api/admin/linkedin/callback?code&state · where LinkedIn sends the
 * administrator back after "Connect LinkedIn" (Admin → LinkedIn). The state must
 * match the httpOnly cookie set when the sign-in started; the code is exchanged
 * for a token that is stored only in the encrypted R2 document "linkedin".
 * This exact URL is registered in the LinkedIn app (Auth → Authorized redirect URLs). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/http";
import { absoluteUrl } from "@/lib/site";
import { exchangeCode } from "@/lib/linkedin/client";
import { getLinkedIn, saveLinkedIn } from "@/lib/linkedin/autopost";

const STATE_COOKIE = "axto_li_state";
const CALLBACK = "/api/admin/linkedin/callback";

function back(req: NextRequest, q: Record<string, string>) {
  const res = NextResponse.redirect(new URL(`/admin/linkedin?${new URLSearchParams(q)}`, req.url));
  res.cookies.set(STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: CALLBACK, maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.redirect(new URL("/login?redirect=%2Fadmin%2Flinkedin", req.url));
  const u = new URL(req.url);
  const error = u.searchParams.get("error");
  // LinkedIn's own reason (e.g. unauthorized_scope_error when the app lacks Community Management API access).
  if (error) return back(req, { error: `${error}: ${u.searchParams.get("error_description") || ""}`.slice(0, 300) });
  const state = u.searchParams.get("state") || "";
  const expected = req.cookies.get(STATE_COOKIE)?.value || "";
  if (!state || !expected || state !== expected) return back(req, { error: "The sign-in expired or did not start here — press Connect again." });
  const code = u.searchParams.get("code") || "";
  if (!code) return back(req, { error: "LinkedIn returned no code." });
  const s = await getLinkedIn({ fresh: true });
  try {
    const t = await exchangeCode(fetch, { clientId: s.clientId, clientSecret: s.clientSecret, code, redirectUri: absoluteUrl(CALLBACK) });
    await saveLinkedIn({ ...s, token: { ...t, connectedAt: new Date().toISOString(), connectedBy: ctx.session.email }, remindedOn: "" });
    await audit(getData(req), ctx.session, "admin.linkedin.connect", "settings", "linkedin", { scope: t.scope, expiresAt: t.expiresAt, refresh: !!t.refresh }, req);
    return back(req, { connected: "1" });
  } catch (e: any) {
    return back(req, { error: String(e?.message || e).slice(0, 300) });
  }
}
