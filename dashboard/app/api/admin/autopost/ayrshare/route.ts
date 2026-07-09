/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbFirst, dbRun, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validateAyrshareKey, getAyrshareProfiles } from "@/lib/autopost/ayrshare";


/**
 * GET  /api/admin/autopost/ayrshare  — get current connection status
 * POST /api/admin/autopost/ayrshare  — save/validate API key, disconnect
 */
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Check if Ayrshare key is set (in env or DB)
  const envKey = process.env.AYRSHARE_API_KEY || "";
  const dbRow = await dbFirst<any>(db,
    `SELECT credentials, is_active FROM autopost_platform_configs WHERE platform = 'ayrshare'`
  );

  const savedKey = dbRow?.credentials
    ? (() => { try { return JSON.parse(dbRow.credentials).api_key || ""; } catch { return ""; } })()
    : "";

  const apiKey = savedKey || envKey;

  if (!apiKey) {
    return NextResponse.json({ connected: false, platforms: [], profiles: {} });
  }

  // Fetch live status from Ayrshare
  const [validity, profileData] = await Promise.all([
    validateAyrshareKey(apiKey),
    getAyrshareProfiles(apiKey),
  ]);

  return NextResponse.json({
    connected: validity.valid,
    plan:      validity.plan,
    email:     validity.email,
    platforms: profileData.connected,
    profiles:  profileData.profiles,
    error:     validity.error || profileData.error,
    key_source: savedKey ? "database" : "env",
  });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { action } = body;

  // ── Save/validate API key ─────────────────────────────────────────────────
  if (action === "save_key") {
    const apiKey = (body.api_key || "").trim();
    if (!apiKey) return NextResponse.json({ error: "API key is required" }, { status: 400 });

    // Validate the key with Ayrshare
    const validity = await validateAyrshareKey(apiKey);
    if (!validity.valid) {
      return NextResponse.json({
        error: `Invalid Ayrshare API key: ${validity.error || "Authentication failed"}`,
      }, { status: 400 });
    }

    // Fetch connected profiles
    const profileData = await getAyrshareProfiles(apiKey);

    // Save to DB
    const credsJson = JSON.stringify({ api_key: apiKey });
    const existing = await dbFirst(db, `SELECT id FROM autopost_platform_configs WHERE platform = 'ayrshare'`);
    const ts = now();

    if (existing) {
      await dbRun(db,
        `UPDATE autopost_platform_configs
         SET credentials = ?, is_active = 1, oauth_connected = 1,
             oauth_account_name = ?, updated_at = ?
         WHERE platform = 'ayrshare'`,
        [credsJson, validity.email || "Ayrshare Account", ts]
      );
    } else {
      await dbRun(db,
        `INSERT INTO autopost_platform_configs
           (id, platform, credentials, is_active, oauth_connected, oauth_account_name, created_at, updated_at)
         VALUES (?, 'ayrshare', ?, 1, 1, ?, ?, ?)`,
        [crypto.randomUUID().replace(/-/g, "").slice(0, 16), credsJson,
         validity.email || "Ayrshare Account", ts, ts]
      );
    }

    // Also activate all connected social platforms in our platform configs
    for (const platform of profileData.connected) {
      const profile = profileData.profiles[platform];
      const platformExisting = await dbFirst(db,
        `SELECT id FROM autopost_platform_configs WHERE platform = ?`, [platform]
      );
      const platformCreds = JSON.stringify({ via_ayrshare: true, ...profile });

      if (platformExisting) {
        await dbRun(db,
          `UPDATE autopost_platform_configs
           SET is_active = 1, oauth_connected = 1,
               oauth_account_name = ?, credentials = ?, updated_at = ?
           WHERE platform = ?`,
          [profile?.name || platform, platformCreds, ts, platform]
        );
      } else {
        await dbRun(db,
          `INSERT INTO autopost_platform_configs
             (id, platform, credentials, is_active, oauth_connected, oauth_account_name, created_at, updated_at)
           VALUES (?, ?, ?, 1, 1, ?, ?, ?)`,
          [crypto.randomUUID().replace(/-/g, "").slice(0, 16), platform,
           platformCreds, profile?.name || platform, ts, ts]
        );
      }
    }

    return NextResponse.json({
      ok: true,
      plan:      validity.plan,
      email:     validity.email,
      platforms: profileData.connected,
      profiles:  profileData.profiles,
      message:   `Connected! ${profileData.connected.length} platform aktif.`,
    });
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  if (action === "disconnect") {
    await dbRun(db,
      `UPDATE autopost_platform_configs SET is_active = 0, oauth_connected = 0 WHERE platform = 'ayrshare'`
    );
    return NextResponse.json({ ok: true, message: "Ayrshare disconnected" });
  }

  // ── Refresh profiles (re-fetch from Ayrshare) ─────────────────────────────
  if (action === "refresh") {
    const envKey = process.env.AYRSHARE_API_KEY || "";
    const dbRow = await dbFirst<any>(db,
      `SELECT credentials FROM autopost_platform_configs WHERE platform = 'ayrshare'`
    );
    const savedKey = dbRow?.credentials
      ? (() => { try { return JSON.parse(dbRow.credentials).api_key || ""; } catch { return ""; } })()
      : "";

    const apiKey = savedKey || envKey;
    if (!apiKey) return NextResponse.json({ error: "Not connected" }, { status: 400 });

    const profileData = await getAyrshareProfiles(apiKey);
    return NextResponse.json({ ok: true, platforms: profileData.connected, profiles: profileData.profiles });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
