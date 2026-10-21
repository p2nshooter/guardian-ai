/* AXTO — Admin → Trials ("100 trial licences per app", docs/AXTO-APPS-BLUEPRINT.md §4)
 *   GET  /api/admin/trials                 settings, pool per app (total / available / claimed / converted / rating), batches, latest claims
 *   GET  /api/admin/trials?format=csv      every code with its claim, as CSV
 *   PUT  /api/admin/trials {config}        on/off, days, apps per account, pool size, date window
 *   POST /api/admin/trials {action:"generate", product, count, from?, batch?} | {action:"disable"|"enable"|"delete", batch}
 *        Large jobs run in steps of TRIAL_BATCH_MAX codes: the reply carries `next` (the body
 *        for the next step) or `more: true`, and Admin → Trials repeats until it is done.
 *        | {action:"revoke", code}   (ends a claimed trial's licence)
 * Every change is written to the audit log. */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getData, now } from "@/lib/db";
import { requireAdmin, respond } from "@/lib/auth";
import { readJson, fail, audit } from "@/lib/http";
import { getTrialConfig, mergeTrialConfig, createTrialBatch, isTrialCode, trialSummaries, TRIAL_BATCH_MAX } from "@/lib/trials";
import { SELF_HOSTED, getSelfHosted, catalogEntry } from "@/lib/selfhosted";

const csvCell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getData(req);
  // Codes come from the "all" index summaries: one list call per 1,000 codes, no document reads.
  const rows = await trialSummaries(db);
  if (req.nextUrl.searchParams.get("format") === "csv") {
    const csv = [["code", "app", "batch", "status", "email", "ip", "claimed_at", "rating", "converted", "created_at"], ...rows.map((r) => [r.code, catalogEntry(r.product)?.name || r.product, r.batch, r.status, r.email, r.ip, r.claimed_at, r.rating || "", r.converted ? "yes" : "", r.created_at])]
      .map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
    await audit(db, ctx.session, "admin.trials.export", "sh_trials", "csv", { rows: rows.length }, req);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="axto-trials-${now().slice(0, 10)}.csv"` } });
  }
  const [config, licences] = await Promise.all([getTrialConfig(db), db.shLicenses.listAll("all", "all", 200_000)]);
  const licence = new Map(licences.map((e) => [e.id, e.meta as Record<string, any>]));
  const count = (list: typeof rows, status: string) => list.filter((r) => r.status === status).length;
  const batchMap = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = `${r.batch}|${r.product}`;
    const list = batchMap.get(k);
    if (list) list.push(r); else batchMap.set(k, [r]);
  }
  const batches = [...batchMap.values()].map((list) => ({
    batch: list[0]!.batch, product: list[0]!.product, created_at: list.reduce((m, r) => (r.created_at < m ? r.created_at : m), list[0]!.created_at),
    total: list.length, available: count(list, "available"), claimed: count(list, "claimed"), disabled: count(list, "disabled"),
  })).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100);
  const claims = rows.filter((r) => r.status === "claimed").sort((a, b) => b.claimed_at.localeCompare(a.claimed_at)).slice(0, 200).map((t) => {
    const l = licence.get(t.license_id);
    return { code: t.code, product: t.product, email: t.email, ip: t.ip, claimed_at: t.claimed_at, rating: t.rating, converted: t.converted, license_status: l?.status ?? null, expires_at: l?.expires_at ?? null, last_seen_at: l?.last_seen_at ?? null };
  });
  return respond({
    config,
    apps: SELF_HOSTED.map((p) => {
      const list = rows.filter((r) => r.product === p.slug);
      const rated = list.filter((r) => r.rating > 0);
      return { slug: p.slug, name: catalogEntry(p.slug)?.name || p.slug, total: list.length, available: count(list, "available"), claimed: count(list, "claimed"),
               disabled: count(list, "disabled"), converted: list.reduce((n, r) => n + (r.converted ? 1 : 0), 0),
               rating: rated.length ? Math.round((rated.reduce((n, r) => n + r.rating, 0) / rated.length) * 10) / 10 : null, ratings: rated.length };
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
  const db = getData(req);
  await db.config.set("trials", JSON.stringify(config));
  await audit(db, ctx.session, "admin.trials.settings", "platform_config", "trials", { ...config }, req);
  return respond({ ok: true, config }, ctx);
}

const BATCH_ID = /^tb_[\w-]{4,64}$/;

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getData(req);
  const b = await readJson(req);
  const a = String(b?.action || "");
  if (a === "generate") {
    const all = b?.product === "all";
    const products = all ? SELF_HOSTED.map((p) => p.slug) : [String(b?.product || "")];
    if (!products.every((p) => getSelfHosted(p))) return fail("Choose an app.");
    const count = Number(b?.count);
    if (!Number.isInteger(count) || count < 1 || count > 1000) return fail("Choose between 1 and 1,000 codes.");
    const from = Number.isInteger(b?.from) && b.from >= 0 && b.from < products.length ? Number(b.from) : 0;
    let batch = typeof b?.batch === "string" && BATCH_ID.test(b.batch) ? b.batch : "";
    if (batch) {
      // Continuing a batch: it must belong to the app it is continued for.
      const first = (await db.shTrials.list("batch", batch, { limit: 1 })).entries[0];
      if (first && first.meta.product !== products[from]) return fail("Unknown batch.");
    }
    const made: { product: string; batch: string; created: number }[] = [];
    let budget = TRIAL_BATCH_MAX;
    let next: Record<string, unknown> | null = null;
    for (let i = from; i < products.length; i += 1) {
      const p = products[i]!;
      if (budget <= 0) { next = { action: "generate", product: b.product, count, from: i }; break; }
      const have = batch ? await db.shTrials.count("batch", batch) : 0;
      const take = Math.min(budget, count - have);
      const r = take > 0 ? await createTrialBatch(db, p, take, batch || undefined) : { batch, created: 0, total: have };
      budget -= Math.max(take, 0);
      made.push({ product: p, batch: r.batch, created: r.created });
      if (r.total < count && take > 0) { next = { action: "generate", product: b.product, count, from: i, batch: r.batch }; break; }
      batch = "";
    }
    await audit(db, ctx.session, "admin.trials.generate", "sh_trials", products.join(","), { count, batches: made.map((m) => m.batch), created: made.reduce((n, m) => n + m.created, 0) }, req);
    return respond({ ok: true, made, next }, ctx);
  }
  if (a === "disable" || a === "enable" || a === "delete") {
    const batch = String(b?.batch || "");
    if (!BATCH_ID.test(batch) && !/^[\w-]{6,64}$/.test(batch)) return fail("Unknown batch.");
    const from = a === "disable" ? "available" : a === "enable" ? "disabled" : "";
    // Up to TRIAL_BATCH_MAX codes per request; `more` tells the screen to send the same request again.
    const docs = (await db.shTrials.listAll("batch", batch, 5000)).filter((e) => (a === "delete" ? e.meta.status !== "claimed" : e.meta.status === from));
    const step = docs.slice(0, TRIAL_BATCH_MAX);
    let changed = 0;
    for (let i = 0; i < step.length; i += 10) {
      const done = await Promise.all(step.slice(i, i + 10).map(async (t) => {
        if (a === "delete") {
          const cur = await db.shTrials.get(t.id);
          return cur && cur.status !== "claimed" ? db.shTrials.delete(t.id) : false;
        }
        let won = false;
        await db.shTrials.update(t.id, (x) => {
          won = x.status === from;
          return won ? { ...x, status: a === "disable" ? "disabled" : "available" } : null;
        });
        return won;
      }));
      changed += done.filter(Boolean).length;
    }
    await audit(db, ctx.session, `admin.trials.${a}`, "sh_trials", batch, { changed }, req);
    return respond({ ok: true, changed, more: docs.length > step.length }, ctx);
  }
  if (a === "revoke") {
    const code = String(b?.code || "");
    if (!isTrialCode(code)) return fail("Unknown code.");
    const t = await db.shTrials.get(code);
    if (!t || t.status !== "claimed") return fail("That trial is not claimed.", 404);
    const lic = t.license_id ? await db.shLicenses.get(t.license_id) : null;
    if (lic && lic.source === "trial") await db.shLicenses.update(lic.id, (l) => ({ ...l, status: "revoked", updated_at: now() }));
    await audit(db, ctx.session, "admin.trials.revoke", "sh_trials", code, {}, req);
    return respond({ ok: true }, ctx);
  }
  return fail("Unknown action.");
}
