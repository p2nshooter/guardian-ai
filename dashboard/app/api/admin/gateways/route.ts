/* AXTO — /api/admin/gateways (admin only) · Admin → Payments & e-mail
 * Every automatic gateway has TWO separate credential sets — Live and Sandbox —
 * and one switch for which set checkout uses. Secrets are NEVER returned.
 *   GET                                        every method: fields, masked values per environment,
 *                                              configured?, offered?, mode, webhook URL + events
 *   PUT    {gateway, env, credentials}         save one environment's credentials
 *          (blank or still-masked secret = keep, null = remove the field)
 *   PATCH  {gateway, active?, mode?}           offer at checkout on/off · switch Live ⇄ Sandbox
 *   DELETE {gateway, env}                      clear one environment (switches the method off if in use)
 *   POST   {gateway, env, action:"test"}       test the credentials against the provider
 *   PUT    {gateway:"email", credentials}      e-mail settings
 * Legacy PUT {gateway, credentials, is_active, is_test_mode} (scripts, older tests) = save + switch in one call.
 * Storage: one AES-256-GCM encrypted R2 document per area (lib/secure-store.ts). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import {
  GATEWAYS, ENV_KEY, gatewayInfo, gatewaySetting, isConfigured, isPayEnv, migrateLegacyPayments, paymentSettings, prefixProblem, savePaymentSettings,
  type GatewayField, type GatewayInfo, type GatewaySetting, type PayEnv, type PaymentSettings,
} from "@/lib/billing/gateways";
import { testConnection } from "@/lib/billing/providers";
import { emailSettings, type EmailSettings } from "@/lib/mail";
import { writeSecure, maskValue, keepSecret, SettingsKeyMissing } from "@/lib/secure-store";
import { readJson, fail, audit } from "@/lib/http";
import { absoluteUrl } from "@/lib/site";

const EMAIL_FIELDS: GatewayField[] = [
  { key: "api_key", label: "Resend API key", secret: true, placeholder: "re_…" },
  { key: "from", label: "Sender", placeholder: "AXTO <hello@axto.io>" },
  { key: "admin_email", label: "Admin inbox for support & contact messages", placeholder: "support@yourcompany.com" },
];
const ENV_NAME: Record<PayEnv, string> = { live: "Live", sandbox: "Sandbox" };

function view(fields: GatewayField[], creds: Record<string, string> = {}) {
  const values: Record<string, string> = {};
  for (const f of fields) values[f.key] = creds[f.key] ? (f.secret ? maskValue(String(creds[f.key])) : String(creds[f.key])) : "";
  return values;
}

/** Empty or masked secrets keep the stored value; `null` removes a field. */
function merge(fields: GatewayField[], submitted: any, stored: Record<string, string> = {}) {
  const next: Record<string, string> = {};
  for (const f of fields) {
    const v = submitted?.[f.key];
    if (v === null) continue;
    const val = f.secret ? keepSecret(v, stored[f.key]) : (typeof v === "string" ? v.trim() : stored[f.key] || "");
    if (val) next[f.key] = val.slice(0, f.multiline ? 4000 : 500);
  }
  return next;
}

function requirement(g: GatewayInfo) {
  return g.requires.map((grp) => grp.map((k) => g.fields.find((f) => f.key === k)?.label || k).join(" + ")).join(", or ");
}

function present(g: GatewayInfo, st: GatewaySetting) {
  const env = (e: PayEnv) => ({ available: g.envs.includes(e), configured: isConfigured(g, st[e]), values: view(g.fields, st[e]) });
  return {
    id: g.id, label: g.label, methods: g.methods, currency: g.currency, confirmation: g.confirmation, envs: g.envs, fields: g.fields,
    requires: requirement(g),
    active: st.active, mode: st.mode, updatedAt: st.updatedAt || "", updatedBy: st.updatedBy || "",
    ready: st.active && isConfigured(g, st[st.mode]),
    live: env("live"), sandbox: env("sandbox"),
    // The environment checkout uses (compatibility with the single-set API; the UI reads live/sandbox).
    configured: isConfigured(g, st[st.mode]), values: view(g.fields, st[st.mode]),
    webhookUrl: g.webhookPath ? absoluteUrl(g.webhookPath) : "", events: g.events || "", keysAt: g.keysAt || "",
  };
}

async function admin(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (ctx) await migrateLegacyPayments(getDB(req)).catch(() => 0);   // never overwrite un-migrated v2 settings
  return ctx;
}
const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

async function guard(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof SettingsKeyMissing) return fail("Set the SETTINGS_ENCRYPTION_KEY secret before configuring payments.", 503);
    throw e;
  }
}

async function write(s: PaymentSettings, id: GatewayInfo["id"], st: GatewaySetting, by: string) {
  s.gateways[id] = { ...st, updatedAt: now(), updatedBy: by };
  s.updatedAt = now();
  s.updatedBy = by;
  await savePaymentSettings(s);
}

export async function GET(req: NextRequest) {
  const ctx = await admin(req);
  if (!ctx) return forbidden();
  return guard(async () => {
    const [pay, mail] = await Promise.all([paymentSettings({ fresh: true }), emailSettings()]);
    const gateways = GATEWAYS.map((g) => present(g, gatewaySetting(pay, g.id)));
    const email = { id: "email", label: "E-mail (Resend)", fields: EMAIL_FIELDS, values: view(EMAIL_FIELDS, mail as Record<string, string>), configured: !!mail.api_key };
    return respond({ gateways, email, storage: "r2-encrypted" }, ctx);
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await admin(req);
  if (!ctx) return forbidden();
  const b = await readJson(req);
  const db = getDB(req);
  return guard(async () => {
    if (b?.gateway === "email") {
      const cur = await emailSettings();
      const next = merge(EMAIL_FIELDS, b?.credentials, cur as Record<string, string>) as EmailSettings;
      if (next.admin_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.admin_email)) return fail("Admin inbox must be an e-mail address.");
      await writeSecure(undefined, "email", next);
      await audit(db, ctx.session, "admin.email.update", "settings", "email", { configured: !!next.api_key }, req);
      return respond({ ok: true }, ctx);
    }
    const g = gatewayInfo(String(b?.gateway || ""));
    if (!g) return fail("Unknown payment method.");
    const legacy = !isPayEnv(b?.env);
    const env: PayEnv = legacy ? (b?.is_test_mode && g.envs.includes("sandbox") ? "sandbox" : "live") : b.env;
    if (!g.envs.includes(env)) return fail(`${g.label} has no ${ENV_NAME[env]} environment — its details are always real.`);
    const s = await paymentSettings({ fresh: true });   // merge onto the latest, never a stale cache
    const st = gatewaySetting(s, g.id);
    const creds = merge(g.fields, b?.credentials, st[env]);
    const wrong = prefixProblem(g, env, creds);
    if (wrong) return fail(wrong);
    st[env] = creds;
    if (legacy) {
      // One call = save + switch (kept for scripts): offer it in this environment, or switch it off.
      if (b?.is_active && !isConfigured(g, creds)) return fail(`Fill in ${requirement(g)} before offering ${g.label}.`);
      st.active = !!b?.is_active;
      st.mode = env;
    } else if (st.active && st.mode === env && !isConfigured(g, creds)) {
      return fail(`${g.label} is offered at checkout in ${ENV_NAME[env]} mode — switch it off first, or keep ${requirement(g)} filled in.`);
    }
    await write(s, g.id, st, ctx.session.email);
    await audit(db, ctx.session, "admin.gateway.credentials", "payment_gateway", g.id, { env, configured: isConfigured(g, creds) }, req);
    return respond({ ok: true, gateway: present(g, st) }, ctx);
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await admin(req);
  if (!ctx) return forbidden();
  const b = await readJson(req);
  const g = gatewayInfo(String(b?.gateway || ""));
  if (!g) return fail("Unknown payment method.");
  return guard(async () => {
    const s = await paymentSettings({ fresh: true });
    const st = gatewaySetting(s, g.id);
    const before = { active: st.active, mode: st.mode };
    if (b?.mode !== undefined) {
      if (!isPayEnv(b.mode) || !g.envs.includes(b.mode)) return fail(`${g.label} has no ${String(b.mode)} environment.`);
      st.mode = b.mode;
    }
    if (b?.active !== undefined) st.active = !!b.active;
    if (st.active && !isConfigured(g, st[st.mode])) {
      return fail(`Fill in the ${ENV_NAME[st.mode]} credentials (${requirement(g)}) before offering ${g.label} in ${ENV_NAME[st.mode]} mode.`);
    }
    await write(s, g.id, st, ctx.session.email);
    await audit(getDB(req), ctx.session, "admin.gateway.switch", "payment_gateway", g.id, { before, after: { active: st.active, mode: st.mode } }, req);
    return respond({ ok: true, gateway: present(g, st) }, ctx);
  });
}

export async function DELETE(req: NextRequest) {
  const ctx = await admin(req);
  if (!ctx) return forbidden();
  const b = await readJson(req);
  const g = gatewayInfo(String(b?.gateway || ""));
  if (!g) return fail("Unknown payment method.");
  if (!isPayEnv(b?.env) || !g.envs.includes(b.env)) return fail("Choose the environment to clear.");
  const env: PayEnv = b.env;
  return guard(async () => {
    const s = await paymentSettings({ fresh: true });
    const st = gatewaySetting(s, g.id);
    const wasOffered = st.active && st.mode === env;
    st[env] = {};
    if (wasOffered) st.active = false;
    await write(s, g.id, st, ctx.session.email);
    await audit(getDB(req), ctx.session, "admin.gateway.cleared", "payment_gateway", g.id, { env, switchedOff: wasOffered }, req);
    return respond({ ok: true, switchedOff: wasOffered, gateway: present(g, st) }, ctx);
  });
}

export async function POST(req: NextRequest) {
  const ctx = await admin(req);
  if (!ctx) return forbidden();
  const b = await readJson(req);
  const g = gatewayInfo(String(b?.gateway || ""));
  if (!g) return fail("Unknown payment method.");
  if (b?.action !== "test") return fail("Unknown action.");
  if (!isPayEnv(b?.env) || !g.envs.includes(b.env)) return fail("Choose the environment to test.");
  const env: PayEnv = b.env;
  return guard(async () => {
    const st = gatewaySetting(await paymentSettings({ fresh: true }), g.id);
    if (!isConfigured(g, st[env])) return respond({ ok: false, message: `Save the ${ENV_NAME[env]} credentials first (${requirement(g)}).` }, ctx);
    const r = await testConnection(g.id, { ...st[env], [ENV_KEY]: env });
    await audit(getDB(req), ctx.session, "admin.gateway.tested", "payment_gateway", g.id, { env, ok: r.ok }, req);
    return respond(r, ctx);
  });
}
