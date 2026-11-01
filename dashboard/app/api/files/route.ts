/* AXTO — GET /api/files · "My files": every piece of saved work across the
 * member's apps (Legal matters + each app's encrypted history) in one list,
 * with storage used vs the plan. Items stay in their app's own store; open,
 * rename, delete and export go through /api/history/:app and /api/legal/matters. */
export const runtime = "edge";
import { NextRequest } from "next/server";
import { getData, getUserFiles } from "@/lib/db";
import { loadSession, unauthorized, respond, effectiveTier } from "@/lib/auth";
import { limitsFor } from "@/lib/plans";
import { getUsage } from "@/lib/usage";
import { History, HISTORY_APPS } from "@/lib/history";
import { planAppFor } from "@/lib/plans";
import { listMatters } from "@/lib/legal/matters";

export interface FileEntry { app: string; id: string; title: string; updatedAt: string; detail: string }

export async function GET(req: NextRequest) {
  const ctx = await loadSession(req);
  if (!ctx) return unauthorized();
  const tier = effectiveTier(ctx.session);
  const apps = limitsFor(tier).apps;
  const db = getData(req), bucket = getUserFiles(req), uid = ctx.session.sub;

  const lists = await Promise.all([
    apps.includes("legal")
      ? listMatters(bucket, uid).then((ms) => ms.map((m): FileEntry => ({ app: "legal", id: m.id, title: m.title, updatedAt: m.updatedAt, detail: [m.client, m.country, `${m.docs} docs · ${m.runs} results`].filter(Boolean).join(" · ") }))).catch(() => [])
      : Promise.resolve([] as FileEntry[]),
    ...HISTORY_APPS.filter((a) => apps.includes(planAppFor(a))).map((a) =>
      new History(bucket, db, uid, a).list()
        .then((items) => items.map((i): FileEntry => ({ app: a, id: i.id, title: i.title, updatedAt: i.updatedAt, detail: Object.entries(i.meta || {}).map(([k, v]) => `${k}: ${v}`).join(" · ") })))
        .catch(() => [] as FileEntry[])),
  ]);
  const usage = await getUsage(db, uid, tier);
  return respond({
    files: lists.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    apps: ["legal", ...HISTORY_APPS].filter((a) => apps.includes(a)),
    storage: { used: usage.storageBytes, limit: usage.storageLimit },
  }, ctx);
}
