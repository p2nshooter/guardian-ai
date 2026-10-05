/* AXTO — Admin → Trials ("100 trial licences per app", docs/AXTO-APPS-BLUEPRINT.md §4)
 *   GET  /api/admin/trials                 settings, pool per app (total / available / claimed / converted / rating), batches, latest claims
 *   GET  /api/admin/trials?format=csv      every code with its claim, as CSV
 *   PUT  /api/admin/trials {config}        on/off, days, apps per account, pool size, date window
 *   POST /api/admin/trials {action:"generate", product, count} | {action:"disable"|"enable"|"delete", batch}
 *        | {action:"revoke", code}   (ends a claimed trial's licence)
 * Every change is written to the audit log. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbFirst, dbRun, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { getTrialConfig, mergeTrialConfig, createTrialBatch, isTrialCode } from "@/lib/trials";
import { SELF_HOSTED, getSelfHosted, catalogEntry } from "@/lib/selfhosted";

const csvCell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDB(req);
  if (req.nextUrl.searchParams.get("format") === "csv") {
    const rows = await dbQuery<any>(db, `SELECT code, product, batch, status, email, ip, claimed_at, rating, converted, created_at FROM sh_trials ORDER BY product, created_at, code`);
    const csv = [["code", "app", "batch", "status", "email", "ip", "claimed_at", "rating", "converted", "created_at"], ...rows.map((r) => [r.code, catalogEntry(r.product)?.name || r.product, r.batch, r.status, r.email, r.ip, r.claimed_at, r.rating || "", r.converted ? "yes" : "", r.created_at])]
      .map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
    await audit(db, ctx.session, "admin.trials.export", "sh_trials", "csv", { rows: rows.length }, req);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="axto-trials-${now().slice(0, 10)}.csv"` } });
  }
  const [config, pool, batches, claims] = await Promise.all([
    getTrialConfig(db),
    dbQuery<any>(db, `SELECT product, SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available, SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) AS claimed,
                             SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) AS disabled, COUNT(*) AS total, SUM(converted) AS converted,
                             AVG(CASE WHEN rating > 0 THEN rating END) AS rating, SUM(CASE WHEN rating > 0 THEN 1 ELSE 0 END) AS ratings
                        FROM sh_trials GROUP BY product`),
    dbQuery<any>(db, `SELECT batch, product, MIN(created_at) AS created_at, COUNT(*) AS total, SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available,
                             SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) AS claimed, SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) AS disabled
                        FROM sh_trials GROUP BY batch, product ORDER BY created_at DESC LIMIT 100`),
    dbQuery<any>(db, `SELECT t.code, t.product, t.email, t.ip, t.claimed_at, t.rating, t.converted, l.status AS license_status, l.expires_at, l.last_seen_at
                        FROM sh_trials t LEFT JOIN sh_licenses l ON l.id = t.license_id WHERE t.status = 'claimed' ORDER BY t.claimed_at DESC LIMIT 200`),
  ]);
  return respond({
    config,
    apps: SELF_HOSTED.map((p) => {
      const r = pool.find((x) => x.product === p.slug) || {};
      return { slug: p.slug, name: catalogEntry(p.slug)?.name || p.slug, total: Number(r.total || 0), available: Number(r.available || 0), claimed: Number(r.claimed || 0),
               disabled: Number(r.disabled || 0), converted: Number(r.converted || 0), rating: r.rating ? Math.round(Number(r.rating) * 10) / 10 : null, ratings: Number(r.ratings || 0) };
    }),
    batches: batches.map((b) => ({ ...b, name: catalogEntry(b.product)?.name || b.product })),
    claims: claims.map((c) => ({ ...c, name: catalogEntry(c.product)?.name || c.product, converted: !!c.converted })),
  }, ctx);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await readJson(req);
  if (!b?.config || typeof b.config !== "object") return fail("Send the trial settings.");
  const config = mergeTrialConfig(JSON.stringify(b.config));
  const db = getDB(req);
  await dbRun(db, `INSERT INTO platform_config (key, value, updated_at) VALUES ('trials', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [JSON.stringify(config), now()]);
  await audit(db, ctx.session, "admin.trials.settings", "platform_config", "trials", { ...config }, req);
  return respond({ ok: true, config }, ctx);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDB(req);
  const b = await readJson(req);
  const a = String(b?.action || "");
  if (a === "generate") {
    const products = b?.product === "all" ? SELF_HOSTED.map((p) => p.slug) : [String(b?.product || "")];
    if (!products.every((p) => getSelfHosted(p))) return fail("Choose an app.");
    const count = Number(b?.count);
    if (!Number.isInteger(count) || count < 1 || count > 1000) return fail("Choose between 1 and 1,000 codes.");
    const made: { product: string; batch: string; created: number }[] = [];
    for (const p of products) made.push({ product: p, ...(await createTrialBatch(db, p, count)) });
    await audit(db, ctx.session, "admin.trials.generate", "sh_trials", products.join(","), { count, batches: made.map((m) => m.batch) }, req);
    return respond({ ok: true, made }, ctx);
  }
  if (a === "disable" || a === "enable" || a === "delete") {
    const batch = String(b?.batch || "");
    if (!/^tb_[\w-]{4,64}$/.test(batch) && !/^[\w-]{6,64}$/.test(batch)) return fail("Unknown batch.");
    const r = a === "delete"
      ? await dbRun(db, `DELETE FROM sh_trials WHERE batch = ? AND status != 'claimed'`, [batch])
      : await dbRun(db, `UPDATE sh_trials SET status = ? WHERE batch = ? AND status = ?`, [a === "disable" ? "disabled" : "available", batch, a === "disable" ? "available" : "disabled"]);
    await audit(db, ctx.session, `admin.trials.${a}`, "sh_trials", batch, { changed: r?.meta?.changes ?? 0 }, req);
    return respond({ ok: true, changed: r?.meta?.changes ?? 0 }, ctx);
  }
  if (a === "revoke") {
    const code = String(b?.code || "");
    if (!isTrialCode(code)) return fail("Unknown code.");
    const t = await dbFirst<{ license_id: string }>(db, `SELECT license_id FROM sh_trials WHERE code = ? AND status = 'claimed'`, [code]);
    if (!t) return fail("That trial is not claimed.", 404);
    await dbRun(db, `UPDATE sh_licenses SET status = 'revoked', updated_at = ? WHERE id = ? AND source = 'trial'`, [now(), t.license_id]);
    await audit(db, ctx.session, "admin.trials.revoke", "sh_trials", code, {}, req);
    return respond({ ok: true }, ctx);
  }
  return fail("Unknown action.");
}
