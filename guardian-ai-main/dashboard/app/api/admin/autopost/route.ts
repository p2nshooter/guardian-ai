export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbRun, dbFirst, newId, now } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";


export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  const platforms = await dbQuery<any>(db, `SELECT id, platform, is_active, credentials, oauth_connected, oauth_account_name, oauth_account_id, token_expires_at, updated_at FROM autopost_platform_configs ORDER BY platform`);
  // Strip credentials from response — only send hasCredentials flag + oauth info
  const safePlatforms = platforms.map((p: any) => ({
    id: p.id, platform: p.platform, is_active: p.is_active, updated_at: p.updated_at,
    hasCredentials:    !!p.credentials && p.credentials !== "{}" && p.credentials.length > 2,
    oauth_connected:   p.oauth_connected === 1 ? 1 : 0,
    oauth_account_name: p.oauth_account_name || "",
    oauth_account_id:   p.oauth_account_id  || "",
    token_expires_at:   p.token_expires_at  || "",
  }));

  const posts = await dbQuery<any>(db, `SELECT * FROM autopost_posts ORDER BY created_at DESC LIMIT 200`);
  const schedules = await dbQuery<any>(db, `SELECT * FROM autopost_schedules ORDER BY platform`);

  return NextResponse.json({ platforms: safePlatforms, posts, schedules });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Database not available" }, { status: 503 });
  }

  // ── Save platform credentials ──────────────────────────────────────────
  if (body.action === "add_platform") {
    const { platform, credentials, is_active } = body;
    if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 });

    const credsJson = JSON.stringify(credentials || {});
    
    // Proper UPSERT — never lose data
    const existing = await dbFirst(db, `SELECT id FROM autopost_platform_configs WHERE platform = ?`, [platform]);
    if (existing) {
      // Merge: only update non-empty fields into existing credentials
      let existingCreds: Record<string, string> = {};
      try {
        const row = await dbFirst<any>(db, `SELECT credentials FROM autopost_platform_configs WHERE platform = ?`, [platform]);
        existingCreds = JSON.parse(row?.credentials || "{}");
      } catch {}
      
      if (credentials && typeof credentials === "object") {
        for (const [k, v] of Object.entries(credentials)) {
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            existingCreds[k] = String(v).trim();
          }
        }
      }

      await dbRun(db,
        `UPDATE autopost_platform_configs SET credentials = ?, is_active = ?, updated_at = ? WHERE platform = ?`,
        [JSON.stringify(existingCreds), is_active ? 1 : 0, now(), platform]
      );
    } else {
      await dbRun(db,
        `INSERT INTO autopost_platform_configs (id, platform, credentials, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
        [newId(), platform, credsJson, is_active ? 1 : 0, now(), now()]
      );
    }
    return NextResponse.json({ success: true });
  }

  // ── Toggle platform active/inactive ────────────────────────────────────
  if (body.action === "toggle") {
    await dbRun(db,
      `UPDATE autopost_platform_configs SET is_active = ?, updated_at = ? WHERE platform = ?`,
      [body.is_active ? 1 : 0, now(), body.platform]
    );
    return NextResponse.json({ success: true });
  }

  // ── Save schedule ──────────────────────────────────────────────────────
  if (body.action === "schedule") {
    const { platform, frequency, language, is_active } = body;
    const existing = await dbFirst(db, `SELECT id FROM autopost_schedules WHERE platform = ?`, [platform]);
    if (existing) {
      await dbRun(db,
        `UPDATE autopost_schedules SET frequency = ?, language = ?, is_active = ?, updated_at = ? WHERE platform = ?`,
        [frequency || "daily", language || "en", is_active ? 1 : 0, now(), platform]
      );
    } else {
      await dbRun(db,
        `INSERT INTO autopost_schedules (id, platform, frequency, language, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`,
        [newId(), platform, frequency || "daily", language || "en", is_active ? 1 : 0, now(), now()]
      );
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
