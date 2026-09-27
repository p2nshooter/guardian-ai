/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * Transactional email via Resend. The API key comes from the RESEND_API_KEY
 * secret or, if absent, from Admin → Payments & Email (gateway "resend").
 * Sending never throws: email is best-effort and must not break a checkout.
 * ============================================================================ */
import { getDB, dbFirst, secret } from "./db";
import { decryptObj } from "./gateway-crypto";
import { SITE, absoluteUrl } from "./site";

async function resendKey(): Promise<string> {
  const env = secret("RESEND_API_KEY");
  if (env) return env;
  try {
    const row = await dbFirst<{ credentials_enc: string; is_active: number }>(getDB(),
      `SELECT credentials_enc, is_active FROM payment_gateways WHERE gateway = 'resend'`);
    if (!row?.is_active || !row.credentials_enc) return "";
    const c = await decryptObj<Record<string, string>>(row.credentials_enc);
    return c.api_key || "";
  } catch {
    return "";
  }
}

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const key = await resendKey();
    if (!key) return false;
    const from = secret("EMAIL_FROM") || `${SITE.name} <${SITE.email}>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, reply_to: SITE.supportEmail }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** One consistent, simple email layout. `body` is trusted HTML built by us. */
export function mailLayout(title: string, body: string, cta?: { label: string; href: string }): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:14px">
<tr><td style="padding:28px 32px 8px;font-size:20px;font-weight:800;letter-spacing:-.3px;color:#0b3b8c">${SITE.name}</td></tr>
<tr><td style="padding:8px 32px 0"><h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.65;color:#334155">${body}</div>
${cta ? `<p style="margin:26px 0 8px"><a href="${cta.href}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:24px 32px 28px;font-size:12px;color:#94a3b8">Questions? Reply to this email or write to ${SITE.supportEmail}.<br>${SITE.legalName} · ${SITE.url.replace(/^https?:\/\//, "")}</td></tr>
</table></td></tr></table></body></html>`;
}

export const mails = {
  welcome: (name: string) => ({
    subject: `Welcome to ${SITE.name}`,
    html: mailLayout(`Welcome${name ? `, ${esc(name)}` : ""}!`,
      `<p>Your ${SITE.name} account is ready. Choose a plan to unlock Legal AI, the Prompt Library, AI Studio and the rest of the workspace — everything runs in your browser.</p>`,
      { label: "Choose a plan", href: absoluteUrl("/app/billing") }),
  }),
  passwordReset: (link: string) => ({
    subject: `Reset your ${SITE.name} password`,
    html: mailLayout("Reset your password",
      `<p>Someone (hopefully you) asked to reset your password. This link is valid for 30 minutes. If it wasn't you, ignore this email.</p>`,
      { label: "Set a new password", href: link }),
  }),
  paymentReceived: (o: { planName: string; cycle: string; amount: string; invoiceNo: string; until: string }) => ({
    subject: `Payment received — ${o.planName} plan active`,
    html: mailLayout("Thank you — your plan is active",
      `<p>We received your payment of <b>${esc(o.amount)}</b> for the <b>${esc(o.planName)}</b> plan (${esc(o.cycle)}).</p>
       <p>Invoice: <b>${esc(o.invoiceNo)}</b><br>Active until: <b>${esc(o.until)}</b></p>`,
      { label: "Open my workspace", href: absoluteUrl("/app") }),
  }),
  renewalReminder: (o: { planName: string; days: number; until: string }) => ({
    subject: `Your ${o.planName} plan ends in ${o.days} day${o.days === 1 ? "" : "s"}`,
    html: mailLayout("Time to renew",
      `<p>Your <b>${esc(o.planName)}</b> plan ends on <b>${esc(o.until)}</b>. Renew now to keep uninterrupted access to your apps, files and self-hosted licences.</p>`,
      { label: "Renew in one click", href: absoluteUrl("/app/billing") }),
  }),
  licenseIssued: (o: { product: string; key: string }) => ({
    subject: `Your ${o.product} licence key`,
    html: mailLayout(`${esc(o.product)} licence`,
      `<p>Your self-hosted licence key:</p><p style="font-family:ui-monospace,Menlo,monospace;font-size:14px;background:#f1f5f9;padding:12px;border-radius:8px">${esc(o.key)}</p>
       <p>Downloads and step-by-step setup are in your portal.</p>`,
      { label: "Open Self-Hosted", href: absoluteUrl("/app/self-hosted") }),
  }),
};
