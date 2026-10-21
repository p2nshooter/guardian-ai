/* Admin → Data — where the records live (R2 only, owner 20 Oct 2026): the
 * one-time move from D1 with its per-table report and kept conflicts, the
 * seven-day read-only window of the old database, and the daily backups
 * (35 days) with a "Back up now" button. Counts and sizes only, never records. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/i18n";
import { Alert, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";

interface Table { d1: number; r2: number; conflicts: number }
interface Move {
  done: boolean; source?: string; at?: string; settings?: number; tables?: Record<string, Table>; legacy?: Record<string, number>;
  conflicts?: { table: string; id: string; field: string }[]; incomplete?: string[]; d1?: { bound: boolean; readOnlyUntil: string };
  progress?: { table: number; copied: Record<string, { d1: number; created: number; existing: number; conflicts: number }> } | null;
}
interface Backup { key: string; takenAt: string; reason: string; objects: number; bytes: number }
interface Job { id: string; reason: string; started_at: string; parts: number; objects: number; done_at?: string }
interface View { move: Move; backup: { configured: boolean; retentionDays: number; job: Job | null; latest: Backup[] } }

const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function AdminData() {
  const [d, setD] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const load = async () => {
    const r = await api<View>("/api/admin/data");
    if (r.ok) setD(r.data); else setMsg({ tone: "error", text: r.error });
  };
  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, []);

  async function backupNow() {
    setBusy(true); setMsg(null);
    const r = await api("/api/admin/data", { body: { action: "backup" } });
    setBusy(false);
    setMsg(r.ok ? { tone: "success", text: "Backup started — the automation takes it in parts within a few minutes." } : { tone: "error", text: r.error });
    load();
  }

  if (!d) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const m = d.move;
  const tables = Object.entries(m.tables || {});
  const running = d.backup.job && !d.backup.job.done_at ? d.backup.job : null;
  return (
    <>
      <PageHeader title="Data" description="Every record of axto.io is a document in the private R2 bucket — nothing is stored in D1. Backups run every day and are kept 35 days." />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}
      <div className="space-y-5">
        <Section title="Records">
          {m.done ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="card-pad"><div className="text-xs font-semibold uppercase text-slate-500">Storage</div><div className="mt-1 text-lg font-bold">R2 · axto-data</div></div>
                <div className="card-pad"><div className="text-xs font-semibold uppercase text-slate-500">Moved from D1</div><div className="mt-1 text-lg font-bold">{m.source === "fresh" ? "New install — nothing to move" : formatDate(m.at || "")}</div></div>
                <div className="card-pad" data-testid="data-d1"><div className="text-xs font-semibold uppercase text-slate-500">Old D1 database</div>
                  <div className="mt-1 text-sm">{m.d1?.bound ? <>Read-only until <b>{formatDate(m.d1.readOnlyUntil)}</b>, then unbound</> : <>Unbound <StatusBadge status="active" /></>}</div></div>
              </div>
              {m.incomplete?.length ? <div className="mt-3"><Alert tone="error">Still short after two copies: {m.incomplete.join(", ")}. The old database stays readable, so nothing is lost — contact the developer.</Alert></div> : null}
              {tables.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="table" data-testid="data-tables">
                    <thead><tr><th>Table</th><th>Rows in D1</th><th>Documents in R2</th><th>Kept as conflict</th><th /></tr></thead>
                    <tbody>{tables.map(([name, t]) => (
                      <tr key={name}><td><code className="text-xs">{name}</code></td><td>{t.d1}</td><td>{t.r2}</td><td>{t.conflicts || "—"}</td>
                        <td>{t.r2 + t.conflicts >= t.d1 ? <span className="badge-green">complete</span> : <span className="badge-amber">short</span>}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : null}
              {m.conflicts?.length ? (
                <p className="mt-3 text-xs text-slate-500">Conflicts are rows whose unique value (e-mail, licence key…) another row already holds — each is kept whole under k/meta/migration-conflicts/: {m.conflicts.slice(0, 10).map((c) => `${c.table}/${c.id} (${c.field})`).join(", ")}{m.conflicts.length > 10 ? "…" : ""}</p>
              ) : null}
              {m.legacy && Object.keys(m.legacy).length ? <p className="mt-2 text-xs text-slate-500">Tables the code no longer uses were archived to the backup bucket (legacy/&lt;table&gt;.jsonl): {Object.keys(m.legacy).length}.</p> : null}
            </>
          ) : (
            <Alert tone="info">The one-time move from D1 is running{m.progress ? ` (table ${m.progress.table + 1})` : ""}. The site answers again within minutes.</Alert>
          )}
        </Section>

        <Section title="Backups">
          {!d.backup.configured ? <Alert tone="error">The backup bucket (BACKUPS) is not bound.</Alert> : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <button className="btn-primary" disabled={busy || !!running} onClick={backupNow} data-testid="data-backup-now">{busy ? <Spinner /> : null} Back up now</button>
                {running ? <span className="text-sm text-slate-600" data-testid="data-backup-running">Running: {running.objects} objects in {running.parts} parts so far…</span>
                  : <span className="text-xs text-slate-500">Daily after 02:00 UTC · kept {d.backup.retentionDays} days · private bucket axto-backups</span>}
              </div>
              {d.backup.latest.length ? (
                <div className="overflow-x-auto">
                  <table className="table" data-testid="data-backups">
                    <thead><tr><th>Taken</th><th>Why</th><th>Objects</th><th>Size</th></tr></thead>
                    <tbody>{d.backup.latest.map((b) => (
                      <tr key={b.key}><td className="text-xs">{formatDate(b.takenAt)}</td><td className="text-xs">{b.reason}</td><td>{b.objects}</td><td>{size(b.bytes)}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-slate-500">No backup yet — the first one runs tonight, or start one now.</p>}
            </>
          )}
        </Section>
      </div>
    </>
  );
}
