/* AXTO — /api/admin/lifetime (admin only) · lifetime (offline) licences.
 *   GET → every licence with its owner and device activations, and the price table
 *   POST {action:"issue", email, scope, product?, devices, updateMonths?, note?}  negotiated deal
 *        {action:"revoke"|"restore", licenseId}
 *        {action:"retire", activationId}   frees a device slot (customer confirmed the old device is gone)
 *   PUT  {tiers:[{devices, app, suite}]}   override list prices */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/lib/db";
import { requireAdmin, respond, normEmail } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { sendMail } from "@/lib/mail";
import { getLifetimePrices, lifetimePricesToStore, mergeLifetimePrices, productsOf, LIFETIME_TIERS, type LifetimeScope } from "@/lib/lifetime";
import { issueLifetime, lifetimeChoiceProblem, lifetimeMail, productName, revokeActivation, setLicenseStatus } from "@/lib/lifetime-service";

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getData(req);
  const [page, users, acts, tiers] = await Promise.all([
    db.lifetimeLicenses.listDocs("all", "all", { limit: 500 }),
    db.users.listAll("all", "all"),
    db.lifetimeActivations.listAllDocs("all", "all"),
    getLifetimePrices(db),
  ]);
  const owner = new Map(users.map((e) => [e.id, e.meta as Record<string, any>]));
  return respond({
    licenses: page.docs.map((l) => ({
      ...l, email: owner.get(l.user_id)?.email ?? null, name: owner.get(l.user_id)?.name ?? null,
      productName: productName(l.product), apps: productsOf(l), activations: acts.filter((a) => a.license_id === l.id),
    })),
    tiers, defaults: LIFETIME_TIERS,
  }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getData(req);
  const b = await readJson(req);

  if (b?.action === "issue") {
    const email = normEmail(b.email);
    const user = await db.users.find("email", email);
    if (!user) return fail("No account with that email. Ask the customer to register first.");
    const problem = lifetimeChoiceProblem(b.scope, b.product);
    if (problem) return fail(problem);
    const devices = Number(b.devices);
    if (!Number.isInteger(devices) || devices < 1 || devices > 100) return fail("Devices must be a whole number from 1 to 100.");
    const months = b.updateMonths === undefined ? 12 : Number(b.updateMonths);
    if (!Number.isInteger(months) || months < 0 || months > 120) return fail("Update months must be 0–120.");
    const lic = await issueLifetime(db, { userId: user.id, scope: b.scope as LifetimeScope, product: String(b.product || ""), devices, updateMonths: months, note: `Issued by ${ctx.session.email}${b.note ? ` — ${String(b.note).slice(0, 200)}` : ""}` });
    await audit(db, ctx.session, "lifetime.issued", "lifetime_license", lic.id, { email, scope: lic.scope, product: lic.product, devices, months }, req);
    const m = lifetimeMail(lic);
    await sendMail(user.email, m.subject, m.html);
    return respond({ ok: true, license: lic }, ctx);
  }

  if (b?.action === "revoke" || b?.action === "restore") {
    const id = String(b.licenseId || "");
    if (!(await setLicenseStatus(db, id, b.action === "revoke" ? "revoked" : "active"))) return fail("Licence not found.", 404);
    await audit(db, ctx.session, `lifetime.${b.action}d`, "lifetime_license", id, {}, req);
    return respond({ ok: true }, ctx);
  }

  if (b?.action === "retire") {
    const id = String(b.activationId || "");
    if (!(await revokeActivation(db, id))) return fail("Activation not found or already retired.", 404);
    await audit(db, ctx.session, "lifetime.device_retired", "lifetime_activation", id, {}, req);
    return respond({ ok: true }, ctx);
  }
  return fail("Unknown action.");
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  if (!Array.isArray(b?.tiers)) return fail("Send the price table.");
  for (const t of LIFETIME_TIERS) {
    const r = b.tiers.find((x: any) => Number(x?.devices) === t.devices);
    if (!r || !(Number(r.app) > 0) || !(Number(r.suite) > 0)) return fail(`Enter both prices for ${t.label}.`);
  }
  const clean = mergeLifetimePrices(JSON.stringify(b.tiers));
  const db = getData(req);
  await db.config.set("lifetime_prices", lifetimePricesToStore(clean));
  await audit(db, ctx.session, "admin.lifetime.prices", "platform_config", "lifetime_prices", { tiers: clean }, req);
  return respond({ ok: true, tiers: clean }, ctx);
}
