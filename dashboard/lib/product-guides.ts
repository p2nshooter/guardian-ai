/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Installation guides for the 10 self-hosted editions — ONE source for the
 * public pages (/self-hosted/<slug>/guide) and the PDF guides CI publishes to
 * R2 (scripts/ci/render-guides.mjs → build-guide-pdfs.py).
 *
 * Every command, file name, port and path is generated from lib/selfhosted.ts,
 * which a unit test keeps identical to the installer (installer/products.go),
 * so a guide can never describe a file or port the product does not use.
 * ============================================================================ */
import { SELF_HOSTED, getSelfHosted, catalogEntry, type SelfHostedProduct } from "./selfhosted";

export type GuideLang = "en" | "id";
export interface GuideStep { text: string; code?: string }
export interface GuideSection { id: string; title: string; intro?: string; steps: GuideStep[] }
export interface Guide { slug: string; name: string; title: string; summary: string; sections: GuideSection[] }

export const GUIDE_PRODUCTS = SELF_HOSTED.map((p) => p.slug);
export const GUIDE_LANGS: GuideLang[] = ["en", "id"];

const PORTAL = "https://axto.io/app/self-hosted";
const LIFETIME = "https://axto.io/app/lifetime";

function commands(p: SelfHostedProduct) {
  const compose = `docker compose -p axto-${p.slug} -f ${p.compose}`;
  return {
    load: p.images.filter((i) => !i.optional).map((i) => `docker load -i ${i.name}.tar.gz`).join("\n"),
    up: `${compose} up -d`,
    mid: `${compose} exec -T ${p.service} cat ${p.stateDir}/machine-id`,
    cp: `${compose} cp ${p.slug}.axto-license ${p.service}:${p.stateDir}/${p.slug}.axto-license\n${compose} restart`,
    logs: `${compose} logs --tail 100 ${p.service}`,
    down: `${compose} down`,
  };
}

const T = {
  en: {
    title: (n: string) => `${n} — installation guide`,
    summary: (n: string, port: number) => `Install ${n} on your own Linux server or Windows PC with Docker, activate it online with your subscription key or fully offline with a Lifetime licence, and open it at http://localhost:${port}.`,
    req: "What you need",
    reqSteps: [
      "A 64-bit Linux server (x86-64 or ARM64) with Docker Engine 24+ and Docker Compose v2 — or Windows 10/11 with Docker Desktop (WSL 2).",
      "At least 2 CPU cores, 4 GB RAM and 10 GB free disk space (more for large workloads).",
      `A licence: a key from a Business or Enterprise plan (${PORTAL}), or a Lifetime licence (${LIFETIME}).`,
    ],
    a: "Option A — AXTO Setup (recommended)",
    aIntro: "AXTO Setup checks Docker, downloads the signed images, writes the configuration and starts the app. It keeps your data when you update.",
    aWin: "Windows: download AXTO Setup from the portal (Self-hosted → Download AXTO Setup), run it and paste your licence key.",
    aLinux: "Linux: download the installer and install with your key (ARM64 servers: use os=linux-arm64 — AXTO Setup picks the matching ARM64 images):",
    aLife: (slug: string) => `Lifetime licence: use the installer key (LIFE-…) shown in ${LIFETIME}. AXTO Setup installs the app and activates this device automatically (one device slot); on the command line: axto-setup install ${slug} --key LIFE-…`,
    b: "Option B — Docker by hand (air-gapped friendly)",
    bIntro: "Use this on servers without internet access: copy the files over, load the images and start the app.",
    b1: "Download the images from the portal (Self-hosted, or Lifetime licences → Downloads) and load them:",
    b2: (compose: string, config: string, target: string) => `Download ${compose} and ${config} from the portal, put them in one folder and save the config as ${target}.`,
    b3: (field: string) => `Subscription only: paste your licence key into ${field}. (Lifetime: leave it empty.)`,
    b4: "Start the app:",
    b5: (port: number) => `Open http://localhost:${port} in your browser.`,
    on: "Activate online (subscription)",
    onSteps: [
      "The app checks its licence with axto.io at start and every 30 minutes. If axto.io cannot be reached it keeps working for up to 4 hours on its last verified proof.",
      `The licence binds to the first server that uses it. Moving to new hardware? Press “Reset server binding” in ${PORTAL}.`,
      "Licences renew with your plan — no new key is needed when you renew.",
    ],
    off: "Activate offline (Lifetime licence)",
    offIntro: "A Lifetime licence needs no internet connection at all: each device gets a signed activation file that the app verifies locally. AXTO Setup does these steps for you (see Option A); by hand, for air-gapped servers:",
    off1: "Start the app once (without a key). Read its machine ID — it is also printed in the app's log:",
    off1b: (slug: string) => `With AXTO Setup: axto-setup machine-id ${slug}`,
    off2: `In ${LIFETIME}, press “Activate a device”, paste the machine ID and download the file.`,
    off3: (slug: string) => `Install the file and restart — with AXTO Setup: axto-setup activate ${slug} ${slug}.axto-license — or by hand:`,
    off4: "The app now runs with no connection to axto.io. The file only works on that machine and that app; activate each device separately.",
    upd: "Update",
    updSteps: (slug: string) => [
      `AXTO Setup: axto-setup update ${slug}`,
      "By hand: load the new images, then run the start command again. Your data volumes and activation stay in place.",
    ],
    data: "Your data & backups",
    dataSteps: (p: SelfHostedProduct) => [
      `Everything the app stores lives in Docker volumes; the machine ID and licence state live in ${p.stateDir}.`,
      "Stopping or updating never deletes data. Only removing the volumes (docker compose down -v, or uninstall without --keep-data) does.",
      "Back up the volumes regularly with your usual Docker backup tooling.",
    ],
    fix: "Troubleshooting",
    fixSteps: (p: SelfHostedProduct) => [
      `Port ${p.port} already in use → install with --port <other port> (AXTO Setup) or change the port in ${p.compose}.`,
      `“Licence bound to a different server” → reset the binding in ${PORTAL}.`,
      `Lifetime file “belongs to another machine” → activate this machine's ID in ${LIFETIME}.`,
      "Docker not running → axto-setup doctor tells you exactly what to fix.",
      "See what the app says:",
    ],
    help: "Need help? Chat with us at https://axto.io/contact or e-mail hello@axto.io.",
  },
  id: {
    title: (n: string) => `${n} — panduan instalasi`,
    summary: (n: string, port: number) => `Instal ${n} di server Linux atau PC Windows Anda sendiri dengan Docker, aktifkan online dengan kunci langganan atau sepenuhnya offline dengan lisensi Lifetime, lalu buka di http://localhost:${port}.`,
    req: "Yang Anda butuhkan",
    reqSteps: [
      "Server Linux 64-bit (x86-64 atau ARM64) dengan Docker Engine 24+ dan Docker Compose v2 — atau Windows 10/11 dengan Docker Desktop (WSL 2).",
      "Minimal 2 core CPU, RAM 4 GB, dan ruang disk kosong 10 GB (lebih untuk beban besar).",
      `Lisensi: kunci dari paket Business atau Enterprise (${PORTAL}), atau lisensi Lifetime (${LIFETIME}).`,
    ],
    a: "Opsi A — AXTO Setup (disarankan)",
    aIntro: "AXTO Setup memeriksa Docker, mengunduh image bertanda tangan, menulis konfigurasi, dan menjalankan aplikasi. Data tetap aman saat update.",
    aWin: "Windows: unduh AXTO Setup dari portal (Self-hosted → Unduh AXTO Setup), jalankan, lalu tempel kunci lisensi Anda.",
    aLinux: "Linux: unduh installer lalu instal dengan kunci Anda (server ARM64: pakai os=linux-arm64 — AXTO Setup memilih image ARM64 yang sesuai):",
    aLife: (slug: string) => `Lisensi Lifetime: pakai kunci installer (LIFE-…) di ${LIFETIME}. AXTO Setup memasang aplikasi dan mengaktifkan perangkat ini otomatis (satu slot perangkat); lewat command line: axto-setup install ${slug} --key LIFE-…`,
    b: "Opsi B — Docker manual (cocok untuk air-gapped)",
    bIntro: "Gunakan ini di server tanpa akses internet: salin file-nya, muat image, lalu jalankan aplikasi.",
    b1: "Unduh image dari portal (Self-hosted, atau Lisensi lifetime → Unduhan) lalu muat:",
    b2: (compose: string, config: string, target: string) => `Unduh ${compose} dan ${config} dari portal, taruh dalam satu folder, dan simpan konfigurasinya sebagai ${target}.`,
    b3: (field: string) => `Khusus langganan: tempel kunci lisensi di ${field}. (Lifetime: biarkan kosong.)`,
    b4: "Jalankan aplikasi:",
    b5: (port: number) => `Buka http://localhost:${port} di browser.`,
    on: "Aktivasi online (langganan)",
    onSteps: [
      "Aplikasi memeriksa lisensi ke axto.io saat mulai dan setiap 30 menit. Jika axto.io tidak terjangkau, aplikasi tetap berjalan hingga 4 jam berdasarkan bukti terakhir yang terverifikasi.",
      `Lisensi terikat ke server pertama yang memakainya. Pindah hardware? Tekan “Reset ikatan server” di ${PORTAL}.`,
      "Lisensi diperpanjang bersama paket Anda — tidak perlu kunci baru saat perpanjang.",
    ],
    off: "Aktivasi offline (lisensi Lifetime)",
    offIntro: "Lisensi Lifetime sama sekali tidak butuh internet: setiap perangkat mendapat file aktivasi bertanda tangan yang diverifikasi aplikasi secara lokal. AXTO Setup mengerjakan langkah ini untuk Anda (lihat Opsi A); manual untuk server tanpa internet:",
    off1: "Jalankan aplikasi sekali (tanpa kunci). Baca ID mesinnya — juga tercetak di log aplikasi:",
    off1b: (slug: string) => `Dengan AXTO Setup: axto-setup machine-id ${slug}`,
    off2: `Di ${LIFETIME}, tekan “Aktifkan perangkat”, tempel ID mesin, lalu unduh file-nya.`,
    off3: (slug: string) => `Pasang file dan restart — dengan AXTO Setup: axto-setup activate ${slug} ${slug}.axto-license — atau manual:`,
    off4: "Aplikasi kini berjalan tanpa koneksi ke axto.io. File hanya berlaku di mesin dan aplikasi itu; aktifkan setiap perangkat secara terpisah.",
    upd: "Update",
    updSteps: (slug: string) => [
      `AXTO Setup: axto-setup update ${slug}`,
      "Manual: muat image baru, lalu jalankan lagi perintah start. Volume data dan aktivasi Anda tetap di tempatnya.",
    ],
    data: "Data & backup Anda",
    dataSteps: (p: SelfHostedProduct) => [
      `Semua yang disimpan aplikasi ada di volume Docker; ID mesin dan status lisensi ada di ${p.stateDir}.`,
      "Stop atau update tidak pernah menghapus data. Hanya menghapus volume (docker compose down -v, atau uninstall tanpa --keep-data) yang menghapusnya.",
      "Backup volume secara rutin dengan alat backup Docker yang biasa Anda pakai.",
    ],
    fix: "Pemecahan masalah",
    fixSteps: (p: SelfHostedProduct) => [
      `Port ${p.port} sudah dipakai → instal dengan --port <port lain> (AXTO Setup) atau ubah port di ${p.compose}.`,
      `“Licence bound to a different server” → reset ikatan di ${PORTAL}.`,
      `File Lifetime “belongs to another machine” → aktifkan ID mesin ini di ${LIFETIME}.`,
      "Docker tidak berjalan → axto-setup doctor memberi tahu persis apa yang harus diperbaiki.",
      "Lihat pesan dari aplikasi:",
    ],
    help: "Butuh bantuan? Chat dengan kami di https://axto.io/contact atau email hello@axto.io.",
  },
};

export function guideFor(slug: string, lang: GuideLang = "en"): Guide | null {
  const p = getSelfHosted(slug);
  if (!p) return null;
  const t = T[lang];
  const name = catalogEntry(slug)?.name || slug;
  const c = commands(p);
  return {
    slug, name, title: t.title(name), summary: t.summary(name, p.port),
    sections: [
      { id: "requirements", title: t.req, steps: t.reqSteps.map((text) => ({ text })) },
      { id: "setup", title: t.a, intro: t.aIntro, steps: [
        { text: t.aWin },
        { text: t.aLinux, code: `curl -fsSL -o axto-setup "https://axto.io/api/download/installer?os=linux-amd64"\nchmod +x axto-setup\n./axto-setup install --key ${p.keyPrefix}-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX` },
        { text: t.aLife(p.slug) },
      ] },
      { id: "docker", title: t.b, intro: t.bIntro, steps: [
        { text: t.b1, code: c.load },
        { text: t.b2(p.compose, p.config, p.configTarget) },
        { text: t.b3(p.licenseField) },
        { text: t.b4, code: c.up },
        { text: t.b5(p.port) },
      ] },
      { id: "online", title: t.on, steps: t.onSteps.map((text) => ({ text })) },
      { id: "offline", title: t.off, intro: t.offIntro, steps: [
        { text: t.off1, code: c.mid },
        { text: t.off1b(p.slug) },
        { text: t.off2 },
        { text: t.off3(p.slug), code: c.cp },
        { text: t.off4 },
      ] },
      { id: "update", title: t.upd, steps: t.updSteps(p.slug).map((text) => ({ text })) },
      { id: "data", title: t.data, steps: t.dataSteps(p).map((text) => ({ text })) },
      { id: "troubleshooting", title: t.fix, steps: t.fixSteps(p).map((text, i, all) => (i === all.length - 1 ? { text, code: c.logs } : { text })) },
    ],
  };
}

/** Markdown for the PDF build (headings, bullets and fenced code only — see build-guide-pdfs.py). */
export function renderGuide(slug: string, lang: GuideLang = "en"): string {
  const g = guideFor(slug, lang);
  if (!g) throw new Error(`Unknown product: ${slug}`);
  const out = [`# ${g.title}`, "", `> ${g.summary}`, ""];
  for (const s of g.sections) {
    out.push(`## ${s.title}`, "");
    if (s.intro) out.push(s.intro, "");
    for (const st of s.steps) {
      out.push(`- ${st.text}`);
      if (st.code) out.push("```", st.code, "```");
    }
    out.push("");
  }
  out.push(T[lang].help, "");
  return out.join("\n");
}
