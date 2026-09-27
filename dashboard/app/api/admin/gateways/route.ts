/* AXTO — /api/admin/gateways (admin only) · Admin → Payments & email
 *   GET → every payment method + e-mail settings: fields, masked values,
 *         configured?, active?, webhook URL. Secrets are NEVER returned.
 *   PUT {gateway, credentials, is_active, is_test_mode}
 *       gateway = a payment method id, or "email" for the e-mail settings.
 *       A blank or still-masked secret field keeps its saved value.
 * Storage: one AES-256-GCM encrypted R2 document per area (lib/secure-store.ts). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { GATEWAYS, isConfigured, paymentSettings, savePaymentSettings, migrateLegacyPayments, type GatewayField } from "@/lib/billing/gateways";
import { emailSettings, type EmailSettings } from "@/lib/mail";
import { writeSecure, maskValue, keepSecret, SettingsKeyMissing } from "@/lib/secure-store";
import { readJson, fail, audit } from "@/lib/http";
import { absoluteUrl } from "@/lib/site";

const EMAIL_FIELDS: GatewayField[] = [
  { key: "api_key", label: "Resend API key", secret: true, placeholder: "re_…" },
  { key: "from", label: "Sender", placeholder: "AXTO <hello@axto.io>" },
  { key: "admin_email", label: "Admin inbox for support & contact messages", placeholder: "support@yourcompany.com" },
];

function view(fields: GatewayField[], creds: Record<string, string> = {}) {
  const values: Record<string, string> = {};
  for (const f of fields) values[f.key] = creds[f.key] ? (f.secret ? maskValue(String(creds[f.key])) : String(creds[f.key])) : "";
  return values;
}

function merge(fields: GatewayField[], submitted: any, stored: Record<string, string> = {}) {
  const next: Record<string, string> = {};
  for (const f of fields) {
    const v = submitted?.[f.key];
    const val = f.secret ? keepSecret(v, stored[f.key]) : (typeof v === "string" ? v.trim() : stored[f.key] || "");
    if (val) next[f.key] = val.slice(0, f.multiline ? 4000 : 500);
  }
  return next;
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const migrated = await migrateLegacyPayments(getDB(req)).catch(() => 0);
    const [pay, mail] = await Promise.all([paymentSettings(), emailSettings()]);
    const gateways = GATEWAYS.map((g) => {
      const cur = pay.gateways[g.id];
      return {
        id: g.id, label: g.label, methods: g.methods, currency: g.currency, confirmation: g.confirmation,
        fields: g.fields, values: view(g.fields, cur?.creds),
        configured: isConfigured(g, cur?.creds), active: !!cur?.active, testMode: !!cur?.testMode, updatedAt: cur?.updatedAt || "",
        webhookUrl: g.webhookPath ? absoluteUrl(g.webhookPath) : "",
      };
    });
    const email = { id: "email", label: "E-mail (Resend)", fields: EMAIL_FIELDS, values: view(EMAIL_FIELDS, mail as Record<string, string>), configured: !!mail.api_key };
    return respond({ gateways, email, storage: "r2-encrypted", migrated }, ctx);
  } catch (e) {
    if (e instanceof SettingsKeyMissing) return fail("Set the SETTINGS_ENCRYPTION_KEY secret before configuring payments.", 503);
    throw e;
  }
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const db = getDB(req);
  try {
    await migrateLegacyPayments(db).catch(() => 0);   // never overwrite un-migrated v2 settings
    if (b?.gateway === "email") {
      const cur = await emailSettings();
      const next = merge(EMAIL_FIELDS, b?.credentials, cur as Record<string, string>) as EmailSettings;
      if (next.admin_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.admin_email)) return fail("Admin inbox must be an e-mail address.");
      await writeSecure(undefined, "email", next);
      await audit(db, ctx.session, "admin.email.update", "settings", "email", { configured: !!next.api_key }, req);
      return respond({ ok: true }, ctx);
    }
    const g = GATEWAYS.find((x) => x.id === b?.gateway);
    if (!g) return fail("Unknown payment method.");
    const settings = await paymentSettings();
    const cur = settings.gateways[g.id];
    const creds = merge(g.fields, b?.credentials, cur?.creds);
    const active = !!b?.is_active;
    if (active && !isConfigured(g, creds)) {
      return fail(`Fill in ${g.requires.map((grp) => grp.map((k) => g.fields.find((f) => f.key === k)?.label || k).join(" + ")).join(", or ")} before activating.`);
    }
    settings.gateways[g.id] = { active, testMode: !!b?.is_test_mode, creds, updatedAt: now() };
    settings.updatedAt = now();
    settings.updatedBy = ctx.session.email;
    await savePaymentSettings(settings);
    await audit(db, ctx.session, "admin.gateway.update", "payment_gateway", g.id, { active }, req);
    return respond({ ok: true }, ctx);
  } catch (e) {
    if (e instanceof SettingsKeyMissing) return fail("Set the SETTINGS_ENCRYPTION_KEY secret before configuring payments.", 503);
    throw e;
  }
}
