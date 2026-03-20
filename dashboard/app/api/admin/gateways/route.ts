import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, dbFirst, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { encryptObj, decryptObj } from "@/lib/gateway-crypto";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  // Must include credentials_enc to check hasCredentials server-side
  const gateways = await dbQuery<any>(
    db,
    `SELECT id, gateway, is_active, meta, updated_at, credentials_enc FROM payment_gateways ORDER BY gateway`
  );

  const result = [];
  for (const gw of gateways) {
    let hasCredentials = false;
    if (gw.credentials_enc && gw.credentials_enc.length > 0) {
      try { await decryptObj(gw.credentials_enc); hasCredentials = true; } catch {}
    }
    let parsedMeta = {};
    try { parsedMeta = JSON.parse(gw.meta || "{}"); } catch {}
    // Never send credentials_enc to client
    result.push({ id: gw.id, gateway: gw.gateway, is_active: gw.is_active, meta: parsedMeta, updated_at: gw.updated_at, hasCredentials });
  }

  return NextResponse.json({ gateways: result });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { gateway, credentials, is_active, meta } = body;
  if (!gateway) return NextResponse.json({ error: "gateway required" }, { status: 400 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "1";

  // ── Test connection ────────────────────────────────────────────────────
  if (isTest) {
    try {
      if (gateway === "stripe" && credentials?.secret_key) {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(credentials.secret_key, { apiVersion: "2025-02-24.acacia" as any, httpClient: Stripe.createFetchHttpClient() });
        const bal = await stripe.balance.retrieve();
        const avail = bal.available?.[0];
        return NextResponse.json({ ok: true, info: `Stripe connected ✓  Balance: ${((avail?.amount ?? 0)/100).toFixed(2)} ${(avail?.currency ?? "usd").toUpperCase()}` });
      }
      if (gateway === "paypal" && credentials?.client_id && credentials?.client_secret) {
        const mode = credentials.mode || "sandbox";
        const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
        const res = await fetch(`${base}/v1/oauth2/token`, {
          method: "POST",
          headers: { Authorization: `Basic ${btoa(`${credentials.client_id}:${credentials.client_secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=client_credentials",
        });
        if (res.ok) return NextResponse.json({ ok: true, info: `PayPal connected ✓  Mode: ${mode}` });
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ ok: false, error: `PayPal auth failed: ${err.error_description || res.status}` });
      }
      if (gateway === "xendit" && credentials?.secret_key) {
        const res = await fetch("https://api.xendit.co/balance", { headers: { Authorization: `Basic ${btoa(credentials.secret_key + ":")}` } });
        if (res.ok) return NextResponse.json({ ok: true, info: "Xendit connected ✓" });
        return NextResponse.json({ ok: false, error: `Xendit auth failed: ${res.status}` });
      }
      return NextResponse.json({ ok: true, info: "No live test for this gateway — credentials will be saved" });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message || "Test failed" });
    }
  }

  // ── Save credentials ──────────────────────────────────────────────────
  try {
    const existing = await dbFirst<any>(db, `SELECT id, credentials_enc FROM payment_gateways WHERE gateway = ?`, [gateway]);

    // Toggle active only — do NOT touch credentials
    if (body.toggle_active_only) {
      if (!existing) return NextResponse.json({ success: false, error: "Gateway not found" }, { status: 404 });
      await dbRun(db, `UPDATE payment_gateways SET is_active=?, updated_at=? WHERE gateway=?`,
        [is_active ? 1 : 0, now(), gateway]);
      return NextResponse.json({ success: true });
    }

    // Full save — merge existing + new credentials
    let finalCreds: Record<string, any> = {};
    if (existing?.credentials_enc && existing.credentials_enc.length > 0) {
      try { finalCreds = await decryptObj(existing.credentials_enc); } catch {}
    }
    if (credentials && typeof credentials === "object") {
      for (const [k, v] of Object.entries(credentials)) {
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          finalCreds[k] = v;
        }
      }
    }

    // Safety check: never save empty enc if we had existing credentials
    if (Object.keys(finalCreds).length === 0 && existing?.credentials_enc) {
      return NextResponse.json({ success: false, error: "No credentials to save. Fill in at least one field." }, { status: 400 });
    }

    const enc = Object.keys(finalCreds).length > 0 ? await encryptObj(finalCreds) : "";
    const metaStr  = JSON.stringify(meta || {});
    const activeVal = is_active ? 1 : 0;

    if (existing) {
      await dbRun(db,
        `UPDATE payment_gateways SET credentials_enc=?, is_active=?, meta=?, updated_at=? WHERE gateway=?`,
        [enc, activeVal, metaStr, now(), gateway]
      );
    } else {
      await dbRun(db,
        `INSERT INTO payment_gateways (id, gateway, credentials_enc, is_active, meta, updated_at) VALUES (?,?,?,?,?,?)`,
        [newId(), gateway, enc, activeVal, metaStr, now()]
      );
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error("[gateways] save error:", e.message);
    return NextResponse.json({
      success: false,
      error: e.message?.includes("ENCRYPTION_KEY")
        ? "ENCRYPTION_KEY env var not configured. Set it in Cloudflare Pages → Settings → Environment Variables."
        : "Save failed: " + (e.message || "Unknown error"),
    }, { status: 500 });
  }
}
