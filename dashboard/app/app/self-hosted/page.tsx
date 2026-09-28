/* ==============================================================================
 * Member: Self-hosted apps — licences (issue, reset server, release), AXTO Setup
 * for Windows/Linux/macOS, and manual Docker instructions per app.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useI18n, formatDate, pick } from "@/lib/i18n";
import { Alert, CopyButton, LoadingBlock, PageHeader, Section, Spinner, StatusBadge } from "@/components/ui";

interface Product {
  slug: string; name: string; emoji: string; tagline: string; port: number; compose: string; config: string; configTarget: string; licenseField: string;
  images: { name: string; label: string; optional?: boolean; available: boolean }[];
  license: { license_key: string; status: string; expires_at: string; max_nodes: number; bound_machine_id: string; last_seen_at: string; last_version: string } | null;
}
interface Data { tier: string; planName: string; allowance: number; nodes: number; used: number; periodEnd: string; products: Product[] }

const L = {
  en: {
    title: "Self-hosted apps", sub: "Run AXTO on your own servers — Windows (Docker Desktop) or Linux — with a signed licence.",
    none: "Self-hosted apps are included in Business (any 3 apps) and Enterprise (all 10, unlimited servers).", upgrade: "See Business & Enterprise",
    allowance: "Licences in use", unlimited: "all apps", nodes: "Servers per licence", validUntil: "Valid until",
    setupTitle: "1. Install with AXTO Setup (recommended)", setupBody: "One program checks Docker/WSL 2, asks for your licence key, downloads the signed images, and starts the app with health checks — plus start/stop/update/uninstall later.",
    win: "Download for Windows", linux: "Linux (x86-64)", arm: "Linux (ARM64)", mac: "macOS (Apple silicon)", sums: "SHA-256 checksums",
    linuxCmd: "Linux / macOS in a terminal:",
    appsTitle: "2. Your licences", issue: "Activate licence", issuing: "Activating…", reset: "Move to another server", release: "Release slot",
    key: "Licence key", status: "Status", server: "Bound server", lastSeen: "Last check-in", never: "not yet", noSlots: "All licence slots are in use — release one or upgrade to Enterprise.",
    manual: "Manual Docker install", images: "Images", configs: "Config files", port: "Opens on port",
    manualSteps: ["Download the image(s) and load them: docker load -i <file>.tar.gz", "Download the compose file and the example config, save the config as", "Put your licence key in", "Start it: docker compose -f <compose file> up -d — then open http://localhost:"],
    confirmRelease: "Release this licence? The app stops working on your server until you activate it again.", done: "Done.",
    guide: "Step-by-step guide",
  },
  id: {
    title: "Aplikasi self-hosted", sub: "Jalankan AXTO di server Anda sendiri — Windows (Docker Desktop) atau Linux — dengan lisensi bertanda tangan.",
    none: "Aplikasi self-hosted termasuk di paket Business (3 aplikasi bebas pilih) dan Enterprise (semua 10, server tanpa batas).", upgrade: "Lihat Business & Enterprise",
    allowance: "Lisensi terpakai", unlimited: "semua aplikasi", nodes: "Server per lisensi", validUntil: "Berlaku sampai",
    setupTitle: "1. Pasang dengan AXTO Setup (disarankan)", setupBody: "Satu program mengecek Docker/WSL 2, meminta kunci lisensi, mengunduh image bertanda tangan, lalu menjalankan aplikasi dengan cek kesehatan — plus start/stop/update/uninstall.",
    win: "Unduh untuk Windows", linux: "Linux (x86-64)", arm: "Linux (ARM64)", mac: "macOS (Apple silicon)", sums: "Checksum SHA-256",
    linuxCmd: "Linux / macOS lewat terminal:",
    appsTitle: "2. Lisensi Anda", issue: "Aktifkan lisensi", issuing: "Mengaktifkan…", reset: "Pindah ke server lain", release: "Lepas slot",
    key: "Kunci lisensi", status: "Status", server: "Server terikat", lastSeen: "Terakhir cek", never: "belum", noSlots: "Semua slot lisensi terpakai — lepas satu atau upgrade ke Enterprise.",
    manual: "Instal manual dengan Docker", images: "Image", configs: "Berkas konfigurasi", port: "Terbuka di port",
    manualSteps: ["Unduh image lalu muat: docker load -i <berkas>.tar.gz", "Unduh berkas compose dan contoh konfigurasi, simpan konfigurasi sebagai", "Isi kunci lisensi Anda di", "Jalankan: docker compose -f <berkas compose> up -d — lalu buka http://localhost:"],
    confirmRelease: "Lepas lisensi ini? Aplikasi berhenti di server Anda sampai diaktifkan lagi.", done: "Selesai.",
    guide: "Panduan langkah demi langkah",
  },
};

export default function SelfHostedPage() {
  const { lang } = useI18n();
  const t = pick(L, lang);
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [open, setOpen] = useState("");
  const load = useCallback(async () => { const r = await api<Data>("/api/selfhosted"); if (r.ok) setD(r.data); else setMsg({ tone: "error", text: r.error }); }, []);
  useEffect(() => { load(); }, [load]);

  async function act(product: string, action: "issue" | "reset" | "release") {
    if (action === "release" && !confirm(t.confirmRelease)) return;
    setBusy(`${action}-${product}`); setMsg(null);
    const r = await api("/api/selfhosted", { body: { action, product } });
    setBusy("");
    setMsg(r.ok ? { tone: "success", text: t.done } : { tone: "error", text: r.error });
    load();
  }

  if (!d) return msg ? <Alert tone="error">{msg.text}</Alert> : <LoadingBlock />;
  const slotsLeft = d.allowance < 0 ? Infinity : d.allowance - d.used;

  if (d.allowance === 0) {
    return (
      <>
        <PageHeader title={t.title} description={t.sub} />
        <div className="surface-ink relative overflow-hidden rounded-2xl p-8">
          <div className="glow pointer-events-none absolute inset-0" />
          <div className="relative max-w-2xl">
            <div className="text-4xl">🖥️</div>
            <p className="mt-3 text-lg text-slate-200">{t.none}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/app/billing?plan=business" className="btn-primary btn-lg">{t.upgrade} →</Link>
              <Link href="/self-hosted" className="btn-secondary btn-lg">{t.guide}</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t.title} description={t.sub} />
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card-pad"><div className="text-xs font-semibold uppercase text-slate-500">{t.allowance}</div><div className="mt-1 text-2xl font-bold">{d.used} / {d.allowance < 0 ? t.unlimited : d.allowance}</div></div>
          <div className="card-pad"><div className="text-xs font-semibold uppercase text-slate-500">{t.nodes}</div><div className="mt-1 text-2xl font-bold">{d.nodes < 0 ? "∞" : d.nodes}</div></div>
          <div className="card-pad"><div className="text-xs font-semibold uppercase text-slate-500">{t.validUntil}</div><div className="mt-1 text-2xl font-bold">{formatDate(d.periodEnd, lang)}</div></div>
        </div>
        {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}

        <Section title={t.setupTitle} description={t.setupBody}>
          <div className="flex flex-wrap gap-2">
            <a href="/api/download/installer?os=windows" className="btn-primary">🪟 {t.win}</a>
            <a href="/api/download/installer?os=linux-amd64" className="btn-secondary">🐧 {t.linux}</a>
            <a href="/api/download/installer?os=linux-arm64" className="btn-secondary">🐧 {t.arm}</a>
            <a href="/api/download/installer?os=macos-arm64" className="btn-secondary">🍎 {t.mac}</a>
            <a href="/api/download/installer?os=sha256" className="btn-ghost">🔏 {t.sums}</a>
          </div>
          <p className="mt-4 text-sm text-slate-600">{t.linuxCmd}</p>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-slate-100">{`curl -fsSL -o axto-setup "https://axto.io/api/download/installer?os=linux-amd64"\nchmod +x axto-setup && ./axto-setup install legal --key YOUR-LICENCE-KEY`}</pre>
        </Section>

        <Section title={t.appsTitle}>
          {slotsLeft <= 0 ? <div className="mb-3"><Alert tone="info">{t.noSlots}</Alert></div> : null}
          <div className="space-y-3">
            {d.products.map((p) => {
              const l = p.license && p.license.status !== "revoked" ? p.license : null;
              return (
                <div key={p.slug} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">{p.emoji}</span>
                    <div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{p.name}</div><div className="text-sm text-slate-500">{p.tagline}</div></div>
                    {l ? <StatusBadge status={l.status} /> : (
                      <button className="btn-primary btn-sm" onClick={() => act(p.slug, "issue")} disabled={!!busy || slotsLeft <= 0}>{busy === `issue-${p.slug}` ? <><Spinner className="h-3 w-3" /> {t.issuing}</> : t.issue}</button>
                    )}
                  </div>
                  {l ? (
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="sm:col-span-2 flex flex-wrap items-center gap-2"><span className="text-slate-500">{t.key}:</span><code className="rounded bg-slate-100 px-2 py-1 text-xs font-bold">{l.license_key}</code><CopyButton text={l.license_key} /></div>
                      <div><span className="text-slate-500">{t.server}:</span> <span className="text-xs">{l.bound_machine_id ? l.bound_machine_id.slice(0, 16) + "…" : t.never}</span></div>
                      <div><span className="text-slate-500">{t.lastSeen}:</span> {l.last_seen_at ? `${formatDate(l.last_seen_at, lang)} · v${l.last_version || "?"}` : t.never}</div>
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        {l.bound_machine_id ? <button className="btn-ghost btn-sm" onClick={() => act(p.slug, "reset")} disabled={!!busy}>↻ {t.reset}</button> : null}
                        <button className="btn-ghost btn-sm" onClick={() => setOpen(open === p.slug ? "" : p.slug)}>🐳 {t.manual}</button>
                        {d.allowance > 0 ? <button className="btn-ghost btn-sm text-rose-600" onClick={() => act(p.slug, "release")} disabled={!!busy}>{t.release}</button> : null}
                      </div>
                    </div>
                  ) : null}
                  {l && open === p.slug ? (
                    <div className="mt-3 rounded-lg bg-slate-50 p-4 text-sm">
                      <div className="font-semibold">{t.images}</div>
                      <ul className="mt-1 space-y-1">{p.images.map((i) => <li key={i.name}>{i.available ? <a href={`/api/selfhosted/download?product=${p.slug}&file=${i.name}`}>{i.label} — {i.name}.tar.gz</a> : <span className="text-slate-400">{i.label} ({lang === "id" ? "sedang disiapkan" : "being prepared"})</span>}{i.optional ? " · optional" : ""}</li>)}</ul>
                      <div className="mt-3 font-semibold">{t.configs}</div>
                      <ul className="mt-1 space-y-1"><li><a href={`/configs/${p.compose}`} download>{p.compose}</a></li><li><a href={`/configs/${p.config}`} download>{p.config}</a> → <code>{p.configTarget}</code></li></ul>
                      <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-700">
                        <li>{t.manualSteps[0]}</li><li>{t.manualSteps[1]} <code>{p.configTarget}</code></li><li>{t.manualSteps[2]} <code>{p.licenseField}</code></li><li>{t.manualSteps[3]}{p.port}</li>
                      </ol>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </>
  );
}
