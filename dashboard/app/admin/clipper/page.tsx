/* Admin → Clipper (Clipper C1, docs/apps/CLIPPER-BLUEPRINT.md §8 and §11).
 * One month of Clipper use: videos and members, the members using it most (with their storage),
 * refusals at the quota and storage limits, and the latest usage events. Read-only: the limits
 * themselves are the plan limits in Admin → Plans. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatBytes } from "@/lib/i18n";
import { PageHeader, Alert, LoadingBlock, Section } from "@/components/ui";

interface Report {
  month: string; videos: number; members: number;
  top: { user_id: string; email: string; videos: number; storage_bytes: number }[];
  counts: Record<string, number>;
  events: { id: string; event: string; user_id?: string; email: string; project_id: string; bytes: number; created_at: string }[];
}
const LABEL: Record<string, string> = {
  video: "Video counted", quota_full: "Refused at the monthly video quota", storage_full: "Save refused: storage full",
  project_created: "Project created", project_restored: "Version restored", project_deleted: "Project deleted",
  conflict_overwrite: "Another device's copy replaced (kept as a version)",
};
const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function AdminClipperPage() {
  const [month, setMonth] = useState(thisMonth());
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    setR(null); setErr("");
    api<Report>(`/api/admin/clipper?month=${month}`).then((x) => (x.ok ? setR(x.data) : setErr(x.error || "Could not load.")));
  }, [month]);

  return (
    <>
      <PageHeader eyebrow="Apps" title="Clipper"
        description="How members use Clipper this month: videos against the plan quota, storage, and where the limits refuse work. Members' projects stay encrypted; only counts and sizes are shown here." />
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor="m">Month</label>
        <input id="m" type="month" className="input w-auto" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>
      {err ? <Alert tone="error">{err}</Alert> : !r ? <LoadingBlock /> : (
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Videos", r.videos], ["Members using Clipper", r.members],
              ["Refused at the quota", r.counts.quota_full || 0], ["Saves refused (storage)", r.counts.storage_full || 0],
            ].map(([k, v]) => (
              <div key={String(k)} className="card-pad"><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k}</div><div className="mt-1 text-2xl font-extrabold text-slate-900">{v}</div></div>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Members by videos">
              {r.top.length ? (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-slate-500"><th className="py-1">Member</th><th className="py-1 text-right">Videos</th><th className="py-1 text-right">Storage</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {r.top.map((t) => (
                      <tr key={t.user_id}><td className="py-1.5"><a className="underline" href={`/admin/members?q=${encodeURIComponent(t.email || t.user_id)}`}>{t.email || t.user_id}</a></td><td className="py-1.5 text-right font-semibold">{t.videos}</td><td className="py-1.5 text-right text-slate-600">{formatBytes(t.storage_bytes)}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-slate-500">No Clipper videos this month.</p>}
            </Section>
            <Section title="Events this month">
              <ul className="divide-y divide-slate-100 text-sm">
                {Object.entries(LABEL).map(([k, label]) => (
                  <li key={k} className="flex justify-between gap-2 py-1.5"><span>{label}</span><b>{r.counts[k] || 0}</b></li>
                ))}
              </ul>
            </Section>
          </div>
          <Section title={`Latest events (${r.events.length})`}>
            {r.events.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="text-left text-xs text-slate-500"><th className="py-1">When</th><th className="py-1">Member</th><th className="py-1">Event</th><th className="py-1 text-right">Size</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {r.events.map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap py-1.5 text-slate-500">{new Date(e.created_at).toLocaleString()}</td>
                        <td className="py-1.5">{e.email || e.user_id}</td>
                        <td className="py-1.5">{LABEL[e.event] || e.event}</td>
                        <td className="py-1.5 text-right text-slate-600">{e.bytes ? formatBytes(e.bytes) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-slate-500">No events this month.</p>}
          </Section>
        </div>
      )}
    </>
  );
}
