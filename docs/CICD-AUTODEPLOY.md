# Auto-Build, Auto-Deploy ke Cloudflare & Update Malam Otomatis

Dokumen ini menjelaskan pipeline CI/CD AXTO setelah penyempurnaan: **push ke GitLab → build otomatis semua modul → deploy otomatis ke Cloudflare**, plus **update terbaru otomatis tiap malam tanpa menumpuk file lama**, dengan **gate verifikasi (scanning) yang mencapai 100%** pada cek kelengkapan.

---

## 1. Ringkasan Alur

```
  git push (branch main)              Jadwal malam (GitLab Schedule)
            │                                   │
            ▼                                   ▼
   ┌───────────────────────────────────────────────────────┐
   │ STAGE verify   →  tes logika (134) + scan kelengkapan  │  ← GATE
   │                   (typecheck/lint = laporan saja)      │
   ├───────────────────────────────────────────────────────┤
   │ build-images → push-registry → upload-r2 → build-exe   │  ← semua modul
   ├───────────────────────────────────────────────────────┤
   │ deploy-cf      →  Dashboard (Pages) + Workers + D1      │  ← Cloudflare
   ├───────────────────────────────────────────────────────┤
   │ cleanup        →  prune artefak R2 lama (sisakan latest)│  ← anti-numpuk
   ├───────────────────────────────────────────────────────┤
   │ notify         →  webhook / Slack                       │
   └───────────────────────────────────────────────────────┘
```

Modul yang dibangun otomatis: Guardian (core/node/antivirus), Antivirus, Vault, Edge, SOC, Compliance, Sentinel, Studio, Orchestra (core + Worker CPU + Worker GPU), Legal.

---

## 2. Yang Sudah Ada vs Yang Baru Ditambahkan

**Sudah ada (tidak diubah):** build image semua produk, push ke registry, upload ke R2 (`builds/latest/...` selalu **ditimpa**), build .exe, deploy Dashboard ke Cloudflare Pages + apply migrasi D1 (`--remote`), deploy Workers, notifikasi.

**Baru ditambahkan:**
1. **Aturan jadwal** di `workflow.rules` — sebelumnya pipeline terjadwal **terblokir** (`when: never`). Kini `schedule` memicu rebuild penuh + redeploy + cleanup.
2. **Stage `verify`** (paling awal) — gate sebelum build/deploy: `verify:tests` (134 cek logika) dan `verify:completeness` (skor kelengkapan, min 95%, saat ini 100%) bersifat **memblokir**; `verify:typecheck` (TypeScript + lint) **hanya melaporkan**, tidak memblokir.
3. **Stage `cleanup`** — `cleanup:prune-r2` membuang objek build lama (mempertahankan `builds/latest/**` + N hari terakhir) agar file lama tidak menumpuk; `cleanup:registry-note` mengingatkan kebijakan retensi image registry.
4. **Harness tes masuk repo** di `dashboard/tests/` + scanner `scripts/ci/scan-completeness.mjs`.

---

## 3. Mengaktifkan Update Otomatis Tiap Malam

Di GitLab: **Project → Build → Pipeline schedules → New schedule**.
- **Interval pattern (cron):** `0 18 * * *` (18:00 UTC = **01:00 WIB**), atau sesuaikan.
- **Target branch:** `main`
- **Active:** ✅

Saat jadwal berjalan, `CI_PIPELINE_SOURCE == "schedule"` → pipeline memakai `PIPELINE_MODE=auto`, `BUILD_PRODUCT=all`, `BUILD_TYPE=both`, `NIGHTLY=1` → membangun ulang **semua modul versi terbaru**, deploy ke Cloudflare, lalu cleanup. Karena artefak `latest` selalu **ditimpa** dan Cloudflare Pages bersifat **atomik** (setiap deploy menggantikan, bukan menambah), tidak ada file lama yang menumpuk di sisi live.

---

## 4. Variabel CI/CD yang Dibutuhkan

Set di **Settings → CI/CD → Variables** (tandai *Masked*/*Protected*):

| Variabel | Untuk |
|---|---|
| `CF_PAGES_API_TOKEN` | Deploy Dashboard & Workers (Cloudflare) |
| `CF_ACCOUNT_ID` | Akun Cloudflare |
| `CF_R2_ACCOUNT_ID` | Endpoint R2 |
| `CF_R2_ACCESS_KEY_ID` / `CF_R2_SECRET_ACCESS_KEY` | Upload & prune R2 |
| `CI_REGISTRY*` | Disediakan GitLab otomatis untuk registry |
| `SLACK_WEBHOOK_URL` (opsional) | Notifikasi |

> Token migrasi D1 memakai `CF_PAGES_API_TOKEN` yang sama; pastikan token punya izin D1 + Pages + Workers + R2.

---

## 5. Tentang "Scanning Mendekati / 100%" — Apa yang Realistis

Agar tidak menyesatkan, berikut arti angka-angkanya secara jujur:

- **Scan kelengkapan: 100% (38/38).** Ini cek **struktural & freshness** yang deterministik: semua direktori modul ada, semua job build ada di CI, jadwal/verify/cleanup aktif, binding D1/KV/R2 utuh, migrasi berurutan tanpa celah/duplikat, katalog harga sebagai sumber tunggal, dan harness tes tersedia. Bila ada modul/job/migrasi yang hilang atau tidak konsisten, skor turun dan **deploy diblokir**.
- **Tes logika: 134/134.** Simulasi deterministik siklus hidup lisensi + logika lisensi.
- **Typecheck/lint:** dijalankan tapi **tidak memblokir** (report-only), supaya error TypeScript yang tak terkait tidak menghentikan rilis darurat. Bisa dijadikan pemblokir dengan menghapus `allow_failure: true` pada `verify:typecheck` setelah codebase bersih tsc.

Yang **tidak** bisa dijamin oleh scan statis (perlu staging berjaringan): keberhasilan charge pembayaran nyata, instalasi Docker tiap engine, pengiriman email, dan klik UI. Jadi "100%" di sini berarti **kelengkapan & konsistensi build 100% + lulus seluruh tes logika**, bukan klaim bahwa setiap jalur runtime telah dieksekusi live.

---

## 6. Menjalankan Gate Secara Lokal (opsional)

```bash
# dari root repo
node dashboard/tests/test-lifecycle.mjs        # 92/92
node dashboard/tests/test-license-logic.mjs    # 42/42
node scripts/ci/scan-completeness.mjs --min 95 # 100%
```

## 7. Catatan Anti-Numpuk File Lama

- **R2:** `builds/latest/**` ditimpa tiap build; objek berversi lama diprune `cleanup:prune-r2` (default sisakan 14 hari).
- **Cloudflare Pages:** deploy atomik — situs live selalu = build terbaru; riwayat deploy lama tidak memengaruhi yang live.
- **Registry image:** aktifkan **Cleanup Policy** GitLab (Settings → Packages & registries) — simpan N tag terbaru + `^latest$`, hapus yang lebih tua dari 14 hari.
