/* AXTO — /api/partners/apply · applications to the reseller and white-label
 * programmes (docs/BUSINESS-MASTER-BLUEPRINT.md §7.2 step 1). Signed-in members only;
 * one application per member and programme. Nothing is paid here: until the
 * programme's portal opens, applicants are invited by e-mail as soon as it does.
 *   GET  → this member's applications
 *   POST {program, name, company, country, website?, languages?, volume?, message?, ack}
 * Errors carry a `code` the page translates. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData } from "@/lib/db";
import { loadSession, respond, unauthorized } from "@/lib/auth";
import { readJson, fail, ipOf, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { adminInbox, mailLayout, sendMail } from "@/lib/mail";
import { absoluteUrl, SITE } from "@/lib/site";
import { applyPartner } from "@/lib/partners";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const NAMES = { reseller: "Reseller", whitelabel: "White label" } as const;
const MESSAGES: Record<string, string> = {
  program: "Choose a programme.", closed: "This programme is not taking applications at the moment.", admin: "Administrator accounts cannot apply.",
  name: "Please enter your name.", company: "Please enter your company.", country: "Please enter your country.", ack: "Please confirm that you have read the terms.",
};

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return respond({ signedIn: false, applications: {} }, null);
  const db = getData(req);
  const [r, w] = await Promise.all([db.partnerApps.get(`reseller_${ctx.session.sub}`), db.partnerApps.get(`whitelabel_${ctx.session.sub}`)]);
  const view = (a: typeof r) => (a ? { status: a.status, createdAt: a.created_at } : null);
  return respond({ signedIn: true, applications: { reseller: view(r), whitelabel: view(w) } }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await loadSession(req, { fresh: true });
  if (!ctx) return unauthorized();
  const rl = await rateLimit(req, "partner-apply", ctx.session.sub, { max: 6, windowSeconds: 3600 });
  if (rl.limited) return fail("Too many attempts — please try again later.", 429, { code: "rate" });
  const b = (await readJson(req)) || {};
  const db = getData(req);
  const r = await applyPartner(db, ctx.session, b, ipOf(req));
  if ("error" in r) return fail(MESSAGES[r.error] || "Something went wrong.", r.error === "closed" ? 409 : r.error === "admin" ? 403 : 400, { code: r.error });
  const a = r.app;
  if (r.created) {
    await audit(db, ctx.session, "partner.apply", "partner_app", a.id, { program: a.program, country: a.country }, req);
    const html = mailLayout(`New application — ${NAMES[a.program]} programme`, `
      <p><b>${esc(a.name)}</b> &lt;${esc(a.email)}&gt; · ${esc(a.company)} · ${esc(a.country)}</p>
      ${a.website ? `<p>Website: ${esc(a.website)}</p>` : ""}${a.languages ? `<p>Second language: ${esc(a.languages)}</p>` : ""}${a.volume ? `<p>Expected volume: ${esc(a.volume)}</p>` : ""}
      ${a.message ? `<blockquote style="border-left:3px solid #06bca6;margin:12px 0;padding:4px 12px;color:#334155;white-space:pre-wrap">${esc(a.message)}</blockquote>` : ""}`,
      { label: "Open Admin → Programs", href: absoluteUrl("/admin/programs") });
    await sendMail(await adminInbox(), `[${SITE.name} partners] ${NAMES[a.program]}: ${a.company}`, html, a.email).catch(() => false);
  }
  return respond({ ok: true, created: r.created, status: a.status, createdAt: a.created_at }, ctx);
}
