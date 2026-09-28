/* Admin → Releases. The self-hosted builds CI has published to R2 (Docker
 * images, Windows installer, setup guides) — what members download. */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PageHeader, Alert, LoadingBlock, EmptyState } from "@/components/ui";
import { formatBytes } from "@/lib/i18n";

interface FileRow { key: string; size: number; uploaded: string }
const GROUPS: { prefix: string; title: string; hint: string }[] = [
  { prefix: "builds/latest/raw/", title: "Docker images", hint: "Loaded by the installer / docker load on the customer's server." },
  { prefix: "builds/latest/exe/", title: "Windows installer", hint: "The AXTO installer members download." },
  { prefix: "builds/latest/guides/", title: "Setup guides", hint: "Per-product install guides." },
];

export default function AdminReleasesPage() {
  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<{ files: FileRow[] }>("/api/admin/releases").then((r) => (r.ok ? setFiles(r.data.files) : setError(r.error || "Could not list releases."))); }, []);
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!files) return <LoadingBlock />;
  const total = files.reduce((n, f) => n + f.size, 0);
  return (
    <>
      <PageHeader eyebrow="Self-hosted" title="Releases"
        description={`${files.length} files · ${formatBytes(total)} published by the build pipeline. Members download these from their Self-hosted page with a signed, expiring link.`} />
      {!files.length ? (
        <EmptyState icon="📦" title="No builds published yet">Run the “Build release” workflow in GitHub Actions — it builds every self-hosted image and uploads it here automatically.</EmptyState>
      ) : (
        <div className="grid gap-5">
          {GROUPS.map((g) => {
            const rows = files.filter((f) => f.key.startsWith(g.prefix));
            return (
              <div key={g.prefix} className="card">
                <div className="border-b border-slate-200 px-4 py-3"><div className="font-semibold text-slate-900">{g.title} <span className="text-xs font-normal text-slate-500">({rows.length})</span></div><div className="text-xs text-slate-500">{g.hint}</div></div>
                {rows.length ? (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {rows.map((f) => (
                      <li key={f.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                        <span className="font-mono text-xs text-slate-800">{f.key.slice(g.prefix.length)}</span>
                        <span className="text-xs text-slate-500">{formatBytes(f.size)} · {f.uploaded ? new Date(f.uploaded).toLocaleString() : "—"}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="px-4 py-3 text-sm text-slate-500">Nothing here yet.</p>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
