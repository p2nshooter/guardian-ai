/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Self-hosted licence issuance — ONE implementation used by the member portal
 * (self-service) and by payment activation (automatic, no admin involved):
 *   • Enterprise: every self-hosted app is licensed the moment payment confirms.
 *   • Business:   the apps chosen at checkout (up to 3) are licensed on payment;
 *                 the member can pick the rest any time in the portal.
 * Keys are e-mailed together with the installer link.
 * ============================================================================ */
import { dbFirst, dbQuery, dbRun, newId, now, secret } from "./db";
import { PLANS, isPlanId, type PlanLimits } from "./plans";
import { SELF_HOSTED, getSelfHosted, generateLicenseKey, catalogEntry } from "./selfhosted";
import { mailLayout, sendMail } from "./mail";
import { absoluteUrl } from "./site";

export interface IssuedLicence { product: string; name: string; key: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Issue (or re-activate) one app's licence. Returns null when the plan doesn't allow it. */
export async function issueLicence(db: any, userId: string, slug: string, lim: PlanLimits, periodEnd: string): Promise<IssuedLicence | { error: string } | null> {
  const product = getSelfHosted(slug);
  if (!product) return { error: "Unknown product." };
  if (lim.selfHostedApps === 0) return { error: "Self-hosted apps are included in the Business and Enterprise plans." };
  const existing = await dbFirst<any>(db, `SELECT * FROM sh_licenses WHERE user_id = ? AND product = ?`, [userId, slug]);
  if (existing && existing.status === "active") return null;
  if (lim.selfHostedApps > 0) {
    const n = await dbFirst<{ n: number }>(db, `SELECT COUNT(*) AS n FROM sh_licenses WHERE user_id = ? AND status = 'active'`, [userId]);
    if ((n?.n ?? 0) >= lim.selfHostedApps) return { error: `Your plan includes ${lim.selfHostedApps} self-hosted apps. Release one first, or upgrade to Enterprise for all of them.` };
  }
  const key = await generateLicenseKey(slug, secret("LICENSE_KEY_HMAC_SECRET") || undefined);
  if (existing) {
    await dbRun(db, `UPDATE sh_licenses SET license_key = ?, package_code = ?, max_nodes = ?, status = 'active', expires_at = ?, bound_machine_id = '', updated_at = ? WHERE id = ?`,
      [key, product.packageCode, lim.selfHostedNodes, periodEnd, now(), existing.id]);
  } else {
    await dbRun(db, `INSERT INTO sh_licenses (id, user_id, product, license_key, package_code, max_nodes, status, expires_at, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [newId(), userId, slug, key, product.packageCode, lim.selfHostedNodes, periodEnd, now(), now()]);
  }
  return { product: slug, name: catalogEntry(slug)?.name || slug, key };
}

export function licencesMail(list: IssuedLicence[]): { subject: string; html: string } {
  const rows = list.map((l) => `<tr><td style="padding:6px 12px 6px 0;font-weight:600">${esc(l.name)}</td><td style="font-family:ui-monospace,Menlo,monospace;font-size:13px">${esc(l.key)}</td></tr>`).join("");
  return {
    subject: list.length === 1 ? `Your ${list[0].name} licence key` : `Your ${list.length} AXTO licence keys`,
    html: mailLayout("Your licences are ready",
      `<p>Payment confirmed — your self-hosted licences are active:</p><table style="border-collapse:collapse;margin:8px 0 16px">${rows}</table>
       <p><b>Windows:</b> download <b>AXTO Setup</b> from the portal, run it and paste a key — it installs and starts the app for you.<br>
       <b>Linux:</b> <code>./axto-setup install --key YOUR-KEY</code></p>`,
      { label: "Open Self-Hosted", href: absoluteUrl("/app/self-hosted") }),
  };
}

/**
 * Called right after a payment activates a plan. Enterprise gets every app,
 * Business gets the apps chosen at checkout. Never throws.
 */
export async function autoIssueAfterPayment(db: any, userId: string, email: string, plan: string, periodEnd: string, chosen: string[] = []): Promise<IssuedLicence[]> {
  try {
    if (!isPlanId(plan)) return [];
    const lim = PLANS[plan].limits;
    if (lim.selfHostedApps === 0) return [];
    const wanted = lim.selfHostedApps < 0 ? SELF_HOSTED.map((p) => p.slug) : chosen.filter((s) => getSelfHosted(s)).slice(0, lim.selfHostedApps);
    const issued: IssuedLicence[] = [];
    for (const slug of wanted) {
      const r = await issueLicence(db, userId, slug, lim, periodEnd);
      if (r && "key" in r) issued.push(r);
    }
    if (issued.length) {
      const m = licencesMail(issued);
      await sendMail(email, m.subject, m.html);
    }
    return issued;
  } catch {
    return [];
  }
}

export async function activeLicenceCount(db: any, userId: string): Promise<number> {
  const rows = await dbQuery<{ n: number }>(db, `SELECT COUNT(*) AS n FROM sh_licenses WHERE user_id = ? AND status = 'active'`, [userId]);
  return rows[0]?.n ?? 0;
}
