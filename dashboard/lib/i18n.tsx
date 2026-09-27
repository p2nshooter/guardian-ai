/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Portal i18n (member + admin): English and Bahasa Indonesia.
 * The public website stays English for global SEO. The choice is stored in
 * the `axto_lang` cookie; the default follows the browser language.
 * ============================================================================ */
"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "id";

const EN = {
  // Shell
  "nav.home": "Home", "nav.apps": "Apps", "nav.files": "My files", "nav.selfhosted": "Self-hosted", "nav.lifetime": "Lifetime licences",
  "nav.billing": "Plan & billing", "nav.settings": "Settings", "nav.help": "Help & guides", "nav.managed": "Managed AI",
  "nav.signout": "Sign out", "nav.language": "Language", "nav.admin": "Admin portal", "nav.member": "Member portal",
  "nav.section.workspace": "Workspace", "nav.section.account": "Account",
  "common.save": "Save", "common.saving": "Saving…", "common.cancel": "Cancel", "common.delete": "Delete", "common.edit": "Edit",
  "common.loading": "Loading…", "common.retry": "Try again", "common.copy": "Copy", "common.copied": "Copied",
  "common.comingSoon": "Coming soon", "common.open": "Open", "common.back": "Back", "common.close": "Close", "common.search": "Search",
  "common.yes": "Yes", "common.no": "No", "common.none": "None", "common.error": "Something went wrong.",
  "plan.free": "Free account", "plan.until": "Active until {date}", "plan.choose": "Choose a plan", "plan.upgrade": "Upgrade",
  "plan.renew": "Renew", "plan.expired": "Expired",
  // Home
  "home.hello": "Welcome, {name}", "home.sub": "Everything you need is one click away.",
  "home.start": "Get started in 3 steps", "home.step1": "Choose a plan", "home.step2": "Add your own AI key (BYOK)",
  "home.step3": "Open an app and run your first task", "home.appsTitle": "Your apps", "home.usage": "This month",
  "home.requests": "AI requests (your keys)", "home.clipper": "Clipper videos", "home.storage": "Storage",
  "home.unlimited": "Unlimited", "home.noPlan": "You're on a free account. Choose a plan to unlock the apps.",
  "home.noKey": "Add your AI key to start. Google Gemini and Groq offer free tiers.",
  // Billing
  "billing.title": "Plan & billing", "billing.sub": "Choose a plan, pay with your preferred method and download invoices.",
  "billing.current": "Current plan", "billing.monthly": "Monthly", "billing.yearly": "Yearly", "billing.save2": "2 months free",
  "billing.pay": "Continue to payment", "billing.method": "Payment method", "billing.noMethods": "Online payment is being set up. Please contact us to pay by bank transfer.",
  "billing.history": "Payment history", "billing.invoice": "Invoice", "billing.paidOk": "Payment received — your plan is active.",
  "billing.canceled": "Payment was cancelled. You can try again anytime.", "billing.pending": "Waiting for payment",
  "billing.manualTitle": "Bank transfer instructions", "billing.manualNote": "Include your order number {order} in the transfer note. We activate your plan as soon as the payment arrives.",
  "billing.perMonth": "/mo", "billing.perYear": "/yr", "billing.switch": "Switch to this plan", "billing.yourPlan": "Your plan",
  "billing.prorate": "Unused time on your current plan is converted into extra days on the new plan.",
  "billing.idr": "Charged in IDR at checkout (≈ {amount}).",
  // Settings
  "settings.title": "Settings", "settings.profile": "Profile", "settings.name": "Full name", "settings.org": "Organisation",
  "settings.country": "Country", "settings.email": "Email", "settings.password": "Password", "settings.current": "Current password",
  "settings.new": "New password", "settings.changePw": "Change password", "settings.saved": "Saved.",
  "keys.title": "My AI keys (BYOX)", "keys.sub": "Your apps run on your own AI keys. Keys are encrypted and never shown again after saving. AXTO never uses them for anything else.",
  "keys.add": "Add key", "keys.provider": "Provider", "keys.key": "API key", "keys.model": "Model (optional)", "keys.baseUrl": "Endpoint URL",
  "keys.test": "Test", "keys.default": "Default", "keys.makeDefault": "Make default", "keys.getKey": "Get a key", "keys.none": "No keys yet.",
  "keys.saved": "Key saved.", "keys.removed": "Key removed.", "keys.chat": "Chat", "keys.stt": "Speech-to-text",
  // Self-hosted
  "sh.title": "Self-hosted apps", "sh.sub": "Run AXTO on your own servers with Docker or Windows. Licences are always the top tier.",
  "sh.included": "{used} of {total} apps in use", "sh.allIncluded": "All apps included", "sh.notIncluded": "Self-hosted apps are included in the Business and Enterprise plans.",
  "sh.issue": "Get licence key", "sh.reset": "Reset server binding", "sh.release": "Release", "sh.key": "Licence key",
  "sh.downloads": "Downloads", "sh.docker": "Docker image", "sh.exe": "Windows EXE", "sh.config": "Config files", "sh.guide": "Setup guide",
  "sh.preparing": "Build being prepared", "sh.bound": "Bound to a server", "sh.unbound": "Not activated yet", "sh.lastSeen": "Last seen",
  // Managed
  "managed.title": "Managed AI", "managed.locked": "Managed AI is coming soon", "managed.lockedSub": "With Managed AI, AXTO provides the AI models so you don't need your own keys. Until then, every app works with your own keys (BYOX).",
  // Apps
  "apps.title": "Apps", "apps.sub": "Everything runs in your browser — no installation.", "apps.locked": "Included in {plan}",
};

export type Key = keyof typeof EN;

const ID: Record<Key, string> = {
  "nav.home": "Beranda", "nav.apps": "Aplikasi", "nav.files": "File saya", "nav.selfhosted": "Self-hosted", "nav.lifetime": "Lisensi lifetime",
  "nav.billing": "Paket & tagihan", "nav.settings": "Pengaturan", "nav.help": "Bantuan & panduan", "nav.managed": "Managed AI",
  "nav.signout": "Keluar", "nav.language": "Bahasa", "nav.admin": "Portal admin", "nav.member": "Portal member",
  "nav.section.workspace": "Ruang kerja", "nav.section.account": "Akun",
  "common.save": "Simpan", "common.saving": "Menyimpan…", "common.cancel": "Batal", "common.delete": "Hapus", "common.edit": "Ubah",
  "common.loading": "Memuat…", "common.retry": "Coba lagi", "common.copy": "Salin", "common.copied": "Tersalin",
  "common.comingSoon": "Segera hadir", "common.open": "Buka", "common.back": "Kembali", "common.close": "Tutup", "common.search": "Cari",
  "common.yes": "Ya", "common.no": "Tidak", "common.none": "Tidak ada", "common.error": "Terjadi kesalahan.",
  "plan.free": "Akun gratis", "plan.until": "Aktif sampai {date}", "plan.choose": "Pilih paket", "plan.upgrade": "Upgrade",
  "plan.renew": "Perpanjang", "plan.expired": "Berakhir",
  "home.hello": "Selamat datang, {name}", "home.sub": "Semua yang Anda butuhkan tinggal satu klik.",
  "home.start": "Mulai dalam 3 langkah", "home.step1": "Pilih paket", "home.step2": "Tambahkan kunci AI Anda (BYOK)",
  "home.step3": "Buka aplikasi dan jalankan tugas pertama", "home.appsTitle": "Aplikasi Anda", "home.usage": "Bulan ini",
  "home.requests": "Permintaan AI (kunci Anda)", "home.clipper": "Video Clipper", "home.storage": "Penyimpanan",
  "home.unlimited": "Tak terbatas", "home.noPlan": "Anda memakai akun gratis. Pilih paket untuk membuka aplikasi.",
  "home.noKey": "Tambahkan kunci AI untuk mulai. Google Gemini dan Groq punya paket gratis.",
  "billing.title": "Paket & tagihan", "billing.sub": "Pilih paket, bayar dengan metode favorit Anda, dan unduh invoice.",
  "billing.current": "Paket saat ini", "billing.monthly": "Bulanan", "billing.yearly": "Tahunan", "billing.save2": "Gratis 2 bulan",
  "billing.pay": "Lanjut ke pembayaran", "billing.method": "Metode pembayaran", "billing.noMethods": "Pembayaran online sedang disiapkan. Hubungi kami untuk membayar via transfer bank.",
  "billing.history": "Riwayat pembayaran", "billing.invoice": "Invoice", "billing.paidOk": "Pembayaran diterima — paket Anda aktif.",
  "billing.canceled": "Pembayaran dibatalkan. Anda bisa mencoba lagi kapan saja.", "billing.pending": "Menunggu pembayaran",
  "billing.manualTitle": "Instruksi transfer bank", "billing.manualNote": "Cantumkan nomor pesanan {order} di berita transfer. Paket diaktifkan begitu pembayaran masuk.",
  "billing.perMonth": "/bln", "billing.perYear": "/thn", "billing.switch": "Pindah ke paket ini", "billing.yourPlan": "Paket Anda",
  "billing.prorate": "Sisa waktu paket lama otomatis dikonversi menjadi hari tambahan di paket baru.",
  "billing.idr": "Ditagih dalam Rupiah saat checkout (≈ {amount}).",
  "settings.title": "Pengaturan", "settings.profile": "Profil", "settings.name": "Nama lengkap", "settings.org": "Organisasi",
  "settings.country": "Negara", "settings.email": "Email", "settings.password": "Kata sandi", "settings.current": "Kata sandi saat ini",
  "settings.new": "Kata sandi baru", "settings.changePw": "Ganti kata sandi", "settings.saved": "Tersimpan.",
  "keys.title": "Kunci AI saya (BYOX)", "keys.sub": "Aplikasi berjalan dengan kunci AI milik Anda sendiri. Kunci dienkripsi dan tidak ditampilkan lagi setelah disimpan. AXTO tidak memakainya untuk hal lain.",
  "keys.add": "Tambah kunci", "keys.provider": "Penyedia", "keys.key": "API key", "keys.model": "Model (opsional)", "keys.baseUrl": "URL endpoint",
  "keys.test": "Uji", "keys.default": "Utama", "keys.makeDefault": "Jadikan utama", "keys.getKey": "Dapatkan kunci", "keys.none": "Belum ada kunci.",
  "keys.saved": "Kunci tersimpan.", "keys.removed": "Kunci dihapus.", "keys.chat": "Chat", "keys.stt": "Suara-ke-teks",
  "sh.title": "Aplikasi self-hosted", "sh.sub": "Jalankan AXTO di server Anda sendiri dengan Docker atau Windows. Lisensi selalu tier tertinggi.",
  "sh.included": "{used} dari {total} aplikasi terpakai", "sh.allIncluded": "Semua aplikasi termasuk", "sh.notIncluded": "Aplikasi self-hosted termasuk dalam paket Business dan Enterprise.",
  "sh.issue": "Ambil kunci lisensi", "sh.reset": "Reset ikatan server", "sh.release": "Lepaskan", "sh.key": "Kunci lisensi",
  "sh.downloads": "Unduhan", "sh.docker": "Image Docker", "sh.exe": "EXE Windows", "sh.config": "File konfigurasi", "sh.guide": "Panduan instalasi",
  "sh.preparing": "Build sedang disiapkan", "sh.bound": "Terikat ke server", "sh.unbound": "Belum diaktifkan", "sh.lastSeen": "Terakhir aktif",
  "managed.title": "Managed AI", "managed.locked": "Managed AI segera hadir", "managed.lockedSub": "Dengan Managed AI, AXTO menyediakan model AI sehingga Anda tidak perlu kunci sendiri. Sampai saat itu, semua aplikasi berjalan dengan kunci Anda sendiri (BYOX).",
  "apps.title": "Aplikasi", "apps.sub": "Semua berjalan di browser — tanpa instalasi.", "apps.locked": "Termasuk di {plan}",
};

const DICTS: Record<Lang, Record<Key, string>> = { en: EN, id: ID };

function detect(): Lang {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )axto_lang=(en|id)/);
  if (m) return m[1] as Lang;
  return (navigator.language || "").toLowerCase().startsWith("id") ? "id" : "en";
}

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (k: Key, vars?: Record<string, string | number>) => string }
const I18n = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => EN[k] });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => { setLangState(detect()); }, []);
  const setLang = useCallback((l: Lang) => {
    document.cookie = `axto_lang=${l}; path=/; max-age=31536000; samesite=lax`;
    setLangState(l);
  }, []);
  const t = useCallback((k: Key, vars?: Record<string, string | number>) => {
    let s = DICTS[lang][k] ?? EN[k] ?? k;
    if (vars) for (const [n, v] of Object.entries(vars)) s = s.replace(`{${n}}`, String(v));
    return s;
  }, [lang]);
  return <I18n.Provider value={{ lang, setLang, t }}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);

export function formatDate(iso: string | null | undefined, lang: Lang = "en"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatMoney(n: number, currency = "USD", lang: Lang = "en"): string {
  return new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", { style: "currency", currency, maximumFractionDigits: currency === "IDR" ? 0 : n % 1 ? 2 : 0 }).format(n);
}
