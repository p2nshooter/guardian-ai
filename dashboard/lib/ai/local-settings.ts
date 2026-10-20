/* ==============================================================================
 * Local Mode — the operator's switch (Admin → Settings → Local Mode).
 *   setting "local_mode"  { enabled }   (not secret; default on)
 * Local Mode costs AXTO nothing and stores nothing: when it is off, members
 * simply cannot pick "This device" and /api/byox/prepare answers 403.
 * ============================================================================ */
import type { Data } from "../data";
import { limitsFor, type Tier } from "../plans";

const KEY = "local_mode";
export interface LocalModeSettings { enabled: boolean }

export async function getLocalModeSettings(db: Data): Promise<LocalModeSettings> {
  try {
    const raw = await db.config.get(KEY);
    const v = raw ? JSON.parse(raw) : {};
    return { enabled: typeof v.enabled === "boolean" ? v.enabled : true };
  } catch { return { enabled: true }; }
}

export async function saveLocalModeSettings(db: Data, s: Partial<LocalModeSettings>): Promise<LocalModeSettings> {
  const next = { ...(await getLocalModeSettings(db)), ...(typeof s.enabled === "boolean" ? { enabled: s.enabled } : {}) };
  await db.config.set(KEY, JSON.stringify(next));
  return next;
}

/** Can this member use Local Mode right now (plan + operator switch)? */
export async function localModeFor(db: Data, tier: Tier): Promise<boolean> {
  return limitsFor(tier).localMode && (await getLocalModeSettings(db)).enabled;
}
