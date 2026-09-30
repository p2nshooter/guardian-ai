/* PRIVACY VAULT — small pieces the Vault screens share: category colours,
 * type names, the exposure badge, downloads. */
"use client";
import type { Category, Finding } from "@/lib/vault/pii";
import type { VaultDict } from "@/lib/i18n-pages/vault";

export const CAT_MARK: Record<Category, string> = {
  contact: "bg-sky-100 text-sky-900 ring-sky-300",
  financial: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  government: "bg-violet-100 text-violet-900 ring-violet-300",
  secret: "bg-rose-100 text-rose-900 ring-rose-300",
  network: "bg-amber-100 text-amber-900 ring-amber-300",
  personal: "bg-fuchsia-100 text-fuchsia-900 ring-fuchsia-300",
  custom: "bg-slate-200 text-slate-900 ring-slate-400",
};
export const CAT_DOT: Record<Category, string> = {
  contact: "bg-sky-500", financial: "bg-emerald-500", government: "bg-violet-500", secret: "bg-rose-500",
  network: "bg-amber-500", personal: "bg-fuchsia-500", custom: "bg-slate-500",
};
export const CAT_ICON: Record<Category, string> = { contact: "✉️", financial: "💳", government: "🪪", secret: "🔑", network: "🌐", personal: "👤", custom: "🧩" };

/** Localised name of a finding's type (custom rules keep the member's own label). */
export function typeName(t: VaultDict, f: Pick<Finding, "type" | "label">): string {
  if (f.type === "DENY") return t.alwaysLabel;
  if (f.type.startsWith("CUSTOM_")) return f.label || t.customLabel;
  return (t.typeNames as Record<string, string>)[f.type] || f.label;
}

const RISK_TONE = ["bg-slate-100 text-slate-600", "bg-sky-100 text-sky-800", "bg-amber-100 text-amber-900", "bg-orange-100 text-orange-900", "bg-rose-600 text-white"];
export function ExposureBadge({ t, level }: { t: VaultDict; level: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${RISK_TONE[level] || RISK_TONE[0]}`} data-testid="exposure">
      <span className="flex gap-0.5">{[1, 2, 3, 4].map((i) => <span key={i} className={`h-2.5 w-1 rounded-sm ${i <= level ? "bg-current" : "bg-current opacity-20"}`} />)}</span>
      {t.risk}: {t.riskLevels[level] || t.riskLevels[0]}
    </span>
  );
}

export function download(name: string, data: Blob | Uint8Array | string, mime = "text/plain;charset=utf-8") {
  const blob = data instanceof Blob ? data : new Blob([typeof data === "string" ? data : (data as BlobPart)], { type: mime });
  const u = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: u, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

export const pct = (s: number) => `${Math.round(s * 100)}%`;
export const short = (v: string, n = 48) => { const s = v.replace(/\s+/g, " "); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
