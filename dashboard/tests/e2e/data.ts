/* AXTO E2E — the records, through the TEST-ONLY endpoint /api/test/data
 * (lib/test-data.ts: local runtime, E2E_TEST_DATA=1, cron secret). Replaces
 * the direct D1 queries the suite used before the records moved to R2. */
const BASE = process.env.E2E_BASE || "http://127.0.0.1:8788";
const CRON_SECRET = "e2e-cron-secret";

export async function data<T = any>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${BASE}/api/test/data`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": CRON_SECRET }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const j = await r.json().catch(() => null) as { result?: T; error?: string } | null;
  if (r.status !== 200 || !j) throw new Error(`test data ${String(body.op)} ${String(body.coll ?? "")}: HTTP ${r.status} ${j?.error ?? ""}`);
  return j.result as T;
}

export const doc = <T = any>(coll: string, id: string) => data<T | null>({ op: "get", coll, id });
export const find = <T = any>(coll: string, unique: string, value: string) => data<T | null>({ op: "find", coll, unique, value });
export const list = <T = any>(coll: string, index: string, value: string) => data<T[]>({ op: "list", coll, index, value });
export const all = <T = any>(coll: string) => data<T[]>({ op: "all", coll });
export const create = (coll: string, d: Record<string, unknown>) => data<boolean>({ op: "create", coll, doc: d });
export const update = <T = any>(coll: string, id: string, set: Record<string, unknown> = {}, meta?: Record<string, unknown>) => data<T>({ op: "update", coll, id, set, meta });
export const config = (key: string, value?: string) => data<string | null>({ op: "config", key, value });
export const mails = (to: string) => data<{ subject: string; html: string; at: string }[]>({ op: "mails", to });

export const userByEmail = (email: string) => find("users", "email", email);
export const licenceByKey = (key: string) => find("shLicenses", "license_key", key);
export const meta = (o: { meta?: string } | null) => { try { return JSON.parse(o?.meta || "{}"); } catch { return {}; } };

/** The token of the newest reset link e-mailed to an address. */
export async function resetToken(email: string): Promise<string> {
  for (const m of await mails(email)) {
    const t = m.html.match(/reset-password\?token=([a-f0-9]{64})/);
    if (t) return t[1]!;
  }
  return "";
}

/** The seeded administrator (signs in with ADMIN_PASSWORD from the test runtime). */
export async function seedAdmin(email: string): Promise<void> {
  const at = new Date().toISOString();
  await create("users", {
    id: "e2e-admin", email, role: "admin", password_hash: "", name: "E2E Admin", organization: "", country: "", status: "active",
    last_login_at: "", storage_bytes: 0, ai_provider: "", sessions_valid_after: "", created_at: at, updated_at: at,
  });
}

/** Every audit entry about an entity, oldest first. */
export const auditFor = async (entityType: string, entityId: string) =>
  (await list("audit", "entity", `${entityType}|${entityId}`)).reverse();
export const auditByAction = (action: string) => list("audit", "action", action);

/** A new order with every field the store keeps (pending, USD, created now). */
export const createOrder = (o: Record<string, unknown>) => create("orders", {
  invoice_no: "", currency: "USD", amount_local: 0, gateway_ref: "", status: "pending", meta: "{}", created_at: new Date().toISOString(), paid_at: "", ...o,
});
/** A member's orders, newest first. */
export const ordersOf = (userId: string) => list("orders", "user", userId);
