/* Member: My files — every piece of saved work across the apps (Legal matters,
 * AI Chat chats, Clipper projects, Compliance & Security reports, Vault
 * redactions, Prompt runs) in one searchable list, with the storage meter.
 * Open jumps into the app (?open=<id>); rename, delete and JSON export act on
 * the item in its app's own encrypted store. */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useI18n, formatDate, formatBytes } from "@/lib/i18n";
import { CLOUD_APPS } from "@/lib/apps";
import { Alert, EmptyState, LoadingBlock, PageHeader, Progress, Section } from "@/components/ui";

interface FileEntry { app: string; id: string; title: string; updatedAt: string; detail: string }
interface Data { files: FileEntry[]; apps: string[]; storage: { used: number; limit: number } }

const OPENABLE = new Set(["legal", "studio", "clipper", "compliance", "security", "vault", "film"]);
/** AI Studio (`film`) is not a listed cloud app until S12 (docs/apps/AI-STUDIO-BLUEPRINT.md §11.1). */
const UNLISTED: Record<string, { name: string; icon: string; color: string; path: string }> = { film: { name: "AI Studio", icon: "🎞️", color: "#7c3aed", path: "ai-studio" } };
const appOf = (slug: string) => CLOUD_APPS.find((a) => a.slug === slug) || UNLISTED[slug];
const pathOf = (slug: string) => UNLISTED[slug]?.path || slug;
const itemUrl = (f: FileEntry) => (f.app === "legal" ? `/api/legal/matters/${f.id}` : `/api/history/${f.app}/${f.id}`);

export default function FilesPage() {
  const { t, lang } = useI18n();
  const [d, setD] = useState<Data | null>(null);
  const [q, setQ] = useState("");
  const [app, setApp] = useState("");
  const [err, setErr] = useState("");
  const load = useCallback(async () => { const r = await api<Data>("/api/files"); if (r.ok) setD(r.data); else setErr(r.error); }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => (d?.files || []).filter((f) => (!app || f.app === app) && (!q || `${f.title} ${f.detail}`.toLowerCase().includes(q.toLowerCase()))), [d, q, app]);

  async function rename(f: FileEntry) {
    const title = prompt(t("files.renamePrompt"), f.title);
    if (!title || title === f.title) return;
    const r = f.app === "legal"
      ? await api(`/api/legal/matters/${f.id}`, { method: "PATCH", body: { title } })
      : await api(`/api/history/${f.app}/${f.id}/rename`, { body: { title } });
    if (!r.ok) setErr(r.error);
    load();
  }
  async function remove(f: FileEntry) {
    if (!confirm(t("files.confirmDelete", { title: f.title }))) return;
    const r = await api(itemUrl(f), { method: "DELETE" });
    if (!r.ok) setErr(r.error);
    load();
  }
  async function exportJson(f: FileEntry) {
    const r = await api(itemUrl(f));
    if (!r.ok) { setErr(r.error); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify({ app: f.app, exportedAt: new Date().toISOString(), ...r.data }, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${f.title.replace(/[^\w\- ]+/g, "").trim() || f.id}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!d) return err ? <Alert tone="error">{err}</Alert> : <LoadingBlock />;
  return (
    <>
      <PageHeader title={t("nav.files")} description={t("files.sub")} />
      <div className="space-y-5">
        {err ? <Alert tone="error">{err}</Alert> : null}
        <section className="card-pad">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-slate-900">{t("files.storage")}</span>
            <span className="text-slate-600">{formatBytes(d.storage.used)} / {formatBytes(d.storage.limit)}</span>
          </div>
          {d.storage.limit > 0 ? <div className="mt-2"><Progress value={d.storage.used} max={d.storage.limit} tone={d.storage.used > d.storage.limit * 0.9 ? "red" : "brand"} /></div> : null}
          <p className="mt-2 text-xs text-slate-500">🔒 {t("files.encrypted")}</p>
        </section>

        {!d.apps.length ? (
          <EmptyState icon="🗂️" title={t("files.noPlan")} action={<Link href="/app/billing" className="btn-primary">{t("plan.choose")} →</Link>} />
        ) : (
          <Section title={t("files.count", { n: d.files.length })}>
            <div className="mb-4 flex flex-wrap gap-2">
              <input className="input max-w-sm" placeholder={t("files.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("files.search")} />
              <select className="select w-auto" value={app} onChange={(e) => setApp(e.target.value)}>
                <option value="">{t("files.all")}</option>
                {d.apps.map((a) => <option key={a} value={a}>{appOf(a)?.name || a}</option>)}
              </select>
            </div>
            {shown.length ? (
              <ul className="divide-y divide-slate-200">
                {shown.map((f) => {
                  const a = appOf(f.app);
                  return (
                    <li key={`${f.app}:${f.id}`} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg" style={{ background: `${a?.color || "#64748b"}14` }} aria-hidden="true">{a?.icon || "📄"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-900">{f.title}</div>
                        <div className="truncate text-xs text-slate-500">{a?.name} · {t("files.updated", { date: formatDate(f.updatedAt, lang) })}{f.detail ? ` · ${f.detail}` : ""}</div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {OPENABLE.has(f.app) ? <Link href={`/app/${pathOf(f.app)}?open=${encodeURIComponent(f.id)}`} className="btn-secondary btn-sm">{t("files.open")}</Link> : null}
                        <button className="btn-ghost btn-sm" onClick={() => exportJson(f)}>⬇ {t("files.export")}</button>
                        <button className="btn-ghost btn-sm" onClick={() => rename(f)}>{t("files.rename")}</button>
                        <button className="btn-ghost btn-sm text-rose-600" onClick={() => remove(f)}>{t("files.delete")}</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <EmptyState icon="🗂️" title={t("files.none")} />}
          </Section>
        )}
      </div>
    </>
  );
}
