/* ==============================================================================
 * AXTO CONNECT — operator settings (Admin → Connect) and WebRTC ICE servers.
 *   setting "connect_settings"  enabled, retentionDays (not secret)
 *   secure store   "connect-turn"       Cloudflare Realtime TURN key id + token
 * STUN is always offered (stun.cloudflare.com, free and public). TURN — needed
 * when both peers sit behind strict NATs — is offered only when the operator
 * has configured it; credentials are minted per room and expire.
 * ============================================================================ */
import type { Data } from "../data";
import { readSecure, writeSecure, keepSecret, maskValue } from "../secure-store";

export interface ConnectSettings { enabled: boolean; retentionDays: number }
export interface TurnConfig { keyId: string; apiToken: string }
export const DEFAULT_SETTINGS: ConnectSettings = { enabled: true, retentionDays: 7 };
const KEY = "connect_settings";

export async function getConnectSettings(db: Data): Promise<ConnectSettings> {
  try {
    const raw = await db.config.get(KEY);
    const v = raw ? JSON.parse(raw) : {};
    return {
      enabled: typeof v.enabled === "boolean" ? v.enabled : DEFAULT_SETTINGS.enabled,
      retentionDays: Number.isFinite(v.retentionDays) ? Math.max(1, Math.min(90, Math.floor(v.retentionDays))) : DEFAULT_SETTINGS.retentionDays,
    };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export async function saveConnectSettings(db: Data, b: any): Promise<ConnectSettings> {
  const cur = await getConnectSettings(db);
  const next: ConnectSettings = {
    enabled: typeof b?.enabled === "boolean" ? b.enabled : cur.enabled,
    retentionDays: Number.isFinite(Number(b?.retentionDays)) ? Math.max(1, Math.min(90, Math.floor(Number(b.retentionDays)))) : cur.retentionDays,
  };
  await db.config.set(KEY, JSON.stringify(next));
  return next;
}

export async function getTurn(req?: any): Promise<TurnConfig> {
  try { return await readSecure<TurnConfig>(req, "connect-turn", { keyId: "", apiToken: "" }); } catch { return { keyId: "", apiToken: "" }; }
}
export async function saveTurn(req: any, b: any): Promise<{ keyId: string; apiToken: string }> {
  const cur = await getTurn(req);
  const next: TurnConfig = { keyId: String(b?.keyId ?? cur.keyId).trim().slice(0, 100), apiToken: keepSecret(b?.apiToken, cur.apiToken).slice(0, 300) };
  if (next.keyId && !/^[A-Za-z0-9_-]{8,100}$/.test(next.keyId)) throw new Error("The TURN key id looks wrong.");
  await writeSecure(req, "connect-turn", next);
  return { keyId: next.keyId, apiToken: maskValue(next.apiToken) };
}

export type IceServer = { urls: string | string[]; username?: string; credential?: string };
export const STUN: IceServer = { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53"] };

/** ICE servers for a room: STUN always; TURN when configured (short-lived credentials). */
export async function iceServers(req: any, ttlSeconds = 3600): Promise<{ iceServers: IceServer[]; turn: boolean }> {
  const t = await getTurn(req);
  if (!t.keyId || !t.apiToken) return { iceServers: [STUN], turn: false };
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(t.keyId)}/credentials/generate`, {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${t.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: Math.max(300, Math.min(86400, ttlSeconds)) }),
    });
    if (!r.ok) return { iceServers: [STUN], turn: false };
    const j: any = await r.json();
    const list: IceServer[] = Array.isArray(j?.iceServers) ? j.iceServers : j?.iceServers ? [j.iceServers] : [];
    return list.length ? { iceServers: [STUN, ...list], turn: true } : { iceServers: [STUN], turn: false };
  } catch { return { iceServers: [STUN], turn: false }; }
}
