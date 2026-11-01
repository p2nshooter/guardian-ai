/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * POST /api/test/data — TEST-ONLY (lib/test-data.ts): lets the local
 * end-to-end suite read and adjust records the way a test needs (an expired
 * licence, a member made admin, the reset link from an e-mail). 404 unless the
 * local test runtime enables it.
 *   {op:"get", coll, id} · {op:"find", coll, unique, value} · {op:"list", coll, index, value}
 *   {op:"all", coll} · {op:"create", coll, doc} · {op:"update", coll, id, set?, meta?}
 *   {op:"config", key, value?} · {op:"mails", to} · {op:"migration"}
 *   {op:"knowledge"} — the support chat's public knowledge pack, as the model would see it
 * ============================================================================ */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, getRawData } from "@/lib/db";
import { patchMeta } from "@/lib/data/meta";
import { migrationProgress } from "@/lib/data/migrate";
import type { Collection, Doc } from "@/lib/r2/store";
import { testDataEnabled, testMails } from "@/lib/test-data";
import { publicKnowledge } from "@/lib/support/ai";

const nope = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function POST(req: NextRequest) {
  if (!testDataEnabled(req)) return nope();
  const b = await req.json().catch(() => ({}));
  const db = getData(req);
  const coll = (b.coll && Object.prototype.hasOwnProperty.call(db, b.coll) ? (db as any)[b.coll] : null) as Collection<Doc & Record<string, any>> | null;
  const ok = (v: unknown) => NextResponse.json({ ok: true, result: v ?? null });
  switch (b.op) {
    case "get": return coll ? ok(await coll.get(String(b.id))) : nope();
    case "find": return coll ? ok(await coll.find(String(b.unique), String(b.value))) : nope();
    case "list": return coll ? ok(await coll.listAllDocs(String(b.index), String(b.value))) : nope();
    case "all": return coll ? ok(await coll.all()) : nope();
    case "create": return coll ? ok(await coll.createIfAbsent(b.doc)) : nope();
    case "update": {
      if (!coll) return nope();
      return ok(await coll.update(String(b.id), (d) => {
        const next = { ...d, ...(b.set || {}) };
        if (b.meta && typeof b.meta === "object") next.meta = patchMeta(d.meta, (m) => Object.assign(m, b.meta));
        return next;
      }));
    }
    case "config":
      if (b.value !== undefined) await db.config.set(String(b.key), String(b.value));
      return ok(await db.config.get(String(b.key)));
    case "mails": return ok(await testMails(String(b.to || "")));
    case "migration": return ok(await migrationProgress(getRawData(req)));
    case "knowledge": return ok(await publicKnowledge(db));
    default: return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  }
}
