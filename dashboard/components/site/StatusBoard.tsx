/* Live status board for /status — polls /api/health every 30 s. */
"use client";
import { useEffect, useState } from "react";

interface Health { ok: boolean; version: string; time: string; bindings: Record<string, boolean>; secrets: Record<string, boolean> }

const ROWS: [string, (h: Health) => boolean][] = [
  ["Web apps & API", (h) => h.ok],
  ["Database", (h) => h.bindings.d1],
  ["Cache & rate limits", (h) => h.bindings.kv],
  ["Encrypted file storage", (h) => h.bindings.r2 && h.bindings.userFiles],
  ["Self-hosted downloads", (h) => h.bindings.builds],
  ["Sign-in & licensing", (h) => h.secrets.jwt && h.secrets.encryption],
];

export default function StatusBoard() {
  const [h, setH] = useState<Health | null>(null);
  const [down, setDown] = useState(false);
  const [at, setAt] = useState("");
  useEffect(() => {
    const check = () => fetch("/api/health", { cache: "no-store" }).then((r) => r.json()).then((j: Health) => { setH(j); setDown(false); })
      .catch(() => setDown(true)).finally(() => setAt(new Date().toLocaleTimeString()));
    check();
    const iv = setInterval(check, 30_000);
    return () => clearInterval(iv);
  }, []);
  const all = !down && !!h && ROWS.every(([, f]) => f(h));
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-5 ${!h && !down ? "border-slate-200 bg-white" : all ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="text-lg font-bold text-slate-900">{!h && !down ? "Checking…" : all ? "✅ All systems operational" : "⚠️ Some systems are degraded"}</div>
        <div className="mt-1 text-sm text-slate-600">{h ? `Version ${h.version} · ` : ""}{at ? `checked ${at}` : ""}</div>
      </div>
      <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {ROWS.map(([name, f]) => {
          const up = !down && !!h && f(h);
          return (
            <li key={name} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="font-medium text-slate-900">{name}</span>
              <span className={!h && !down ? "badge-gray" : up ? "badge-green" : "badge-amber"}>{!h && !down ? "…" : up ? "Operational" : "Degraded"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
