/* AXTO — /api/admin/gateways (admin only)
 *   GET → every gateway: fields, configured?, active?, test mode?, webhook URL (never secrets)
 *   PUT {gateway, credentials, is_active, is_test_mode} → blank secret fields keep their saved value */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbQuery, dbRun, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { encryptObj, decryptObj } from "@/lib/gateway-crypto";
import { GATEWAYS } from "@/lib/billing/gateways";
import { readJson, fail, audit } from "@/lib/http";
import { absoluteUrl } from "@/lib/site";

// Email is configured alongside payments (same encrypted store).
const EXTRA = [{ id: "resend", label: "Email (Resend)", methods: "Transactional email", currency: "USD", fields: [{ key: "api_key", label: "API key", secret: true }], webhookPath: "" }];

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await dbQuery<any>(getDB(req), `SELECT gateway, credentials_enc, is_active, is_test_mode, updated_at FROM payment_gateways`);
  const out = [];
  for (const g of [...GATEWAYS, ...EXTRA]) {
    const r = rows.find((x) => x.gateway === g.id);
    let values: Record<string, string> = {};
    if (r?.credentials_enc) {
      try {
        const c = await decryptObj<Record<string, string>>(r.credentials_enc);
        for (const f of g.fields) values[f.key] = c[f.key] ? ((f as any).secret ? `••••${String(c[f.key]).slice(-4)}` : String(c[f.key])) : "";
      } catch { values = {}; }
    }
    out.push({
      id: g.id, label: g.label, methods: g.methods, currency: g.currency, fields: g.fields, values,
      configured: !!r?.credentials_enc, active: !!r?.is_active, testMode: !!r?.is_test_mode, updatedAt: r?.updated_at || "",
      webhookUrl: g.webhookPath ? absoluteUrl(g.webhookPath) : "",
    });
  }
  return respond({ gateways: out }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  const g = [...GATEWAYS, ...EXTRA].find((x) => x.id === b?.gateway);
  if (!g) return fail("Unknown gateway.");
  const db = getDB(req);
  const row = await dbFirst<any>(db, `SELECT credentials_enc FROM payment_gateways WHERE gateway = ?`, [g.id]);
  let current: Record<string, string> = {};
  if (row?.credentials_enc) { try { current = await decryptObj(row.credentials_enc); } catch {} }
  const next: Record<string, string> = { ...current };
  for (const f of g.fields) {
    const v = b?.credentials?.[f.key];
    if (typeof v !== "string") continue;
    const t = v.trim();
    if ((f as any).secret && (t === "" || t.startsWith("••••"))) continue; // keep saved secret
    next[f.key] = t.slice(0, 4000);
  }
  const enc = Object.keys(next).length ? await encryptObj(next) : "";
  const active = b?.is_active ? 1 : 0;
  if (active && !enc) return fail("Enter the credentials before activating.");
  await dbRun(db,
    `INSERT INTO payment_gateways (id, gateway, display_name, credentials_enc, is_active, is_test_mode, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(gateway) DO UPDATE SET credentials_enc = excluded.credentials_enc, is_active = excluded.is_active, is_test_mode = excluded.is_test_mode, display_name = excluded.display_name, updated_at = excluded.updated_at`,
    [crypto.randomUUID(), g.id, g.label, enc, active, b?.is_test_mode ? 1 : 0, now()]);
  await audit(db, ctx.session, "admin.gateway.update", "payment_gateway", g.id, { active }, req);
  return respond({ ok: true }, ctx);
}
