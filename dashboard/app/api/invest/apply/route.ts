/* AXTO — POST /api/invest/apply {name, email, company?, country?, amount, method, message?, ack, lang, website?}
 * An application to the AXTO investor round. Nothing is paid here: the owner
 * receives it (Admin → Investors and an e-mail), sends the memorandum and the
 * agreement, and verifies the capital once it has arrived. Errors carry a
 * `code` the page translates. `website` is a honeypot field bots fill in. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { loadSession, isEmail, normEmail } from "@/lib/auth";
import { readJson, fail, ipOf, audit } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/support/store";
import { adminInbox, mailLayout, sendMail } from "@/lib/mail";
import { isLang } from "@/lib/i18n-shared";
import { absoluteUrl, SITE } from "@/lib/site";
import { applyInvestor, getInvest } from "@/lib/invest";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const err = (code: string, message: string, status = 400) => fail(message, status, { code });

export async function POST(req: NextRequest) {
  const b = await readJson(req);
  if (b?.website) return NextResponse.json({ ok: true });               // honeypot
  const rl = await rateLimit(req, "invest-apply", ipOf(req) || "anon", { max: 5, windowSeconds: 3600 });
  if (rl.limited) return err("other", "Too many applications — please try again later.", 429);

  const db = getData(req);
  const offer = await getInvest(db);
  if (!offer.visible) return err("hidden", "Not found", 404);            // §26.4: the round is not shown
  if (offer.status === "closed") return err("closed", "The round is complete.", 409);
  if (offer.status === "paused") return err("paused", "Applications are paused at the moment.", 409);

  const ctx = await loadSession(req).catch(() => null);
  const name = cleanText(b?.name, 120);
  const email = normEmail(b?.email || ctx?.session.email);
  const amount = Math.round(Number(String(b?.amount ?? "").replace(/[^\d.]/g, "")) || 0);
  if (name.length < 2) return err("name", "Please enter your name.");
  if (!isEmail(email)) return err("email", "Please enter a valid email address.");
  if (amount < offer.minUsd) return err("min", `The minimum ticket is US$${offer.minUsd.toLocaleString("en-US")}.`);
  if (amount > offer.targetUsd) return err("max", `The whole round is US$${offer.targetUsd.toLocaleString("en-US")}.`);
  if (b?.ack !== true) return err("ack", "Please confirm that you have read the risk notice.");

  const a = {
    userId: ctx?.session.sub, name, email, company: cleanText(b?.company, 160), country: cleanText(b?.country, 80),
    pledgeUsd: amount, method: b?.method === "paypal" ? "paypal" : "wire", lang: isLang(b?.lang) ? b.lang : "en", message: cleanText(b?.message, 5000),
  };
  const id = await applyInvestor(db, a);
  await audit(db, ctx?.session || { email }, "invest.apply", "investor", id, { pledgeUsd: amount, method: a.method, lang: a.lang }, req);

  const html = mailLayout("New application — AXTO investor round", `
    <p><b>${esc(name)}</b> &lt;${esc(email)}&gt;${a.company ? ` · ${esc(a.company)}` : ""}${a.country ? ` · ${esc(a.country)}` : ""}</p>
    <p>Intended investment: <b>US$${amount.toLocaleString("en-US")}</b> by ${a.method === "paypal" ? "PayPal" : "bank wire"} · page language ${esc(a.lang)}</p>
    ${a.message ? `<blockquote style="border-left:3px solid #06bca6;margin:12px 0;padding:4px 12px;color:#334155;white-space:pre-wrap">${esc(a.message.slice(0, 2000))}</blockquote>` : ""}
    <p style="color:#64748b;font-size:13px">Next: send the memorandum, the NDA and the draft agreement. Verify the capital in Admin → Investors only once it has arrived.</p>`,
    { label: "Open Admin → Investors", href: absoluteUrl("/admin/investors") });
  await sendMail(await adminInbox(), `[${SITE.name} investors] ${name} — US$${amount.toLocaleString("en-US")}`, html, email).catch(() => false);

  return NextResponse.json({ ok: true, id, amountUsd: amount, whatsapp: offer.whatsapp }, { headers: { "Cache-Control": "no-store" } });
}
