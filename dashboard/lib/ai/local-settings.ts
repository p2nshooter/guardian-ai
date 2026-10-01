/* ==============================================================================
 * Local Mode — the operator's switch (Admin → Settings → Local Mode).
 *   platform_config "local_mode"  { enabled }   (not secret; default on)
 * Local Mode costs AXTO nothing and stores nothing: when it is off, members
 * simply cannot pick "This device" and /api/byox/prepare answers 403.
 * ============================================================================ */
import { dbFirst, dbRun, now } from "../db";
import { limitsFor, type Tier } from "../plans";

const KEY = "local_mode";
export interface LocalModeSettings { enabled: boolean }

export async function getLocalModeSettings(db: any): Promise<LocalModeSettings> {
  try {
    const r = await dbFirst<{ value: string }>(db, `SELECT value FROM platform_config WHERE key = ?`, [KEY]);
    const v = r?.value ? JSON.parse(r.value) : {};
    return { enabled: typeof v.enabled === "boolean" ? v.enabled : true };
  } catch { return { enabled: true }; }
}

export async function saveLocalModeSettings(db: any, s: Partial<LocalModeSettings>): Promise<LocalModeSettings> {
  const next = { ...(await getLocalModeSettings(db)), ...(typeof s.enabled === "boolean" ? { enabled: s.enabled } : {}) };
  await dbRun(db, `INSERT INTO platform_config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [KEY, JSON.stringify(next), now()]);
  return next;
}

/** Can this member use Local Mode right now (plan + operator switch)? */
export async function localModeFor(db: any, tier: Tier): Promise<boolean> {
  return limitsFor(tier).localMode && (await getLocalModeSettings(db)).enabled;
}
