# AXTO v3 — Blueprint Rombak Total

> Status: **disetujui untuk dikerjakan** (rombak total, bertahap). Audit terbaru: **§22 (Payments: Live & Sandbox — 30 Sep 2026)**, §21 (aplikasi self-hosted: Docker, Windows, Linux), §20 (portal, lisensi, pembayaran), §19 (v3.2).
> Branch kerja v3.2: `ccr-e9111ca5-n0fcha` (sebelumnya `claude/app-consistency-paid-model-5hjkqo`, sudah di-merge).
> Deploy produksi terjadi otomatis saat branch kerja di-merge ke `main`
> (GitHub Actions → Cloudflare Pages + migrasi D1 + sinkron konten R2).

---

## 1. Ringkasan keputusan

| Area | Sebelum | Sesudah (v3) |
|---|---|---|
| Model bisnis | "Gratis 1 tahun, tanpa lisensi" + 4 skema harga bertumpuk (paket tahunan $990–$79.000, Studio bulanan, promo, trial) | **Satu** skema langganan: Starter / Pro / Business / Enterprise, bulanan atau tahunan |
| Cara pakai | Wajib unduh Docker / docker-compose | **Aplikasi web langsung di browser** (tanpa Docker). Docker tetap ada sebagai edisi *self-hosted* berlisensi |
| Mesin AI | Campur | **BYOX** (kunci/model/endpoint milik member) dan **Managed** (AI disediakan AXTO) dipisah 100%. Managed dibangun tetapi **dikunci** sampai dibuka admin |
| Lisensi self-hosted | Key gratis `*-FREE-ACCESS-2026` otomatis | Key berbayar, fitur **tier tertinggi**, termasuk di paket Business & Enterprise |
| Prompt premium | 50 PDF "playbook" (ikut ter-publish di repo publik) + dijual satuan | **Prompt Library** di dalam langganan, 24 bidang, 4 level (Basic → Elite), konten terenkripsi di R2 |
| Portal | Portal klien & admin campur aduk, 22 menu admin | Dua portal bersih dan konsisten: **Member** (`/app`) & **Admin** (`/admin`) |
| Data | 68 tabel D1, log & iklan disimpan di D1 | D1 ramping (inti relasional saja), **R2 untuk semua konten & file**, entitlement di token sesi |
| SEO | Semua halaman dinamis (edge + client), sitemap.xml invalid, placeholder verifikasi | Halaman publik statis (SSG), metadata per halaman, JSON-LD lengkap, sitemap terindeks per bagian |
| Klien | 7 akun klien uji + 3.800 kode trial | **Sudah dihapus** dari D1 produksi (2 akun admin dipertahankan) |

---

## 2. Temuan audit (bug & inkonsistensi)

### Kritis
1. **Monetisasi mati** — `/api/license-validate` memberi akses penuh ke key apa pun selama "program gratis"; 13 engine otomatis memakai key `*-FREE-ACCESS-2026`.
2. **Tabel `licenses` rusak** — `CHECK (product IN ('guardian','orchestra'))` membuat lisensi Vault/Legal/SOC/dll. gagal dibuat.
3. **Celah harga** — checkout playbook memakai `playbook_meta.amount_usd` dari browser → bisa bayar $0,01.
4. **Konten berbayar bocor** — 50 PDF premium ada di repo **publik** GitHub.
5. **`public/sitemap.xml` tidak valid** (komentar HTML sebelum `<?xml`) dan bentrok dengan `app/sitemap.ts`; `public/robots.txt` bentrok dengan `app/robots.ts`.

### Tinggi
6. Meta `google-site-verification` berisi placeholder `YOUR_VERIFICATION_CODE`.
7. Semua halaman `runtime="edge"` + `"use client"` → tidak ada halaman statis; SEO & kecepatan (Core Web Vitals) buruk.
8. Sitemap tidak memuat halaman produk, prompt, panduan.
9. AdSense **dan** Ezoic dimuat global (termasuk portal & admin) → lambat dan tidak profesional untuk SaaS berbayar.
10. `/studio/*` tidak dilindungi middleware.
11. `typescript.ignoreBuildErrors: true` menyembunyikan error.

### Inkonsistensi
12. Jumlah produk berbeda-beda: "all 10", "12", 11 prefix key, 14 image build; Studio terduplikasi 4× (studio / ai-studio / gpu-studio / hybrid-studio).
13. Dua halaman login (`/login` dan `/auth/login`).
14. Menu admin tidak relevan: *Program Akses Gratis, Trial Batch, Promo Pricing, Resellers, Managed Infra (planned), AutoPost*.
15. AutoPost: ±8.000 baris template iklan "gratis" + posting ke situs iklan baris (risiko spam → merusak reputasi SEO), 4.358 baris di D1.
16. Halaman `/acquire` (menjual perusahaan) dan `/promo` tidak cocok untuk situs SaaS.
17. Bahasa campur (menu admin sebagian Indonesia, sebagian Inggris).

---

## 3. Arsitektur target

```
                         ┌───────────────────────────── Cloudflare ─────────────────────────────┐
 Browser ──HTTPS──▶  Pages (Next.js 15)                                                         │
                     │  ├─ Situs publik  (SSG, cepat, terindeks Google)                          │
                     │  ├─ /app   Portal Member  (edge, JWT + entitlement di token)              │
                     │  ├─ /admin Portal Admin   (edge, role=admin)                              │
                     │  └─ /api   (edge)  auth · billing · ai · files · license-validate          │
                     │                                                                           │
                     ├─ D1  axto-db       : users, subscriptions, orders, sh_licenses,            │
                     │                      usage_monthly, files, user_ai_keys, platform_config   │
                     ├─ R2  axto-storage  : konten (prompt terenkripsi), invoice, arsip           │
                     ├─ R2  axto-documents: file & hasil kerja member (per user)                  │
                     ├─ R2  axto-builds   : image Docker / EXE / PDF panduan (self-hosted)        │
                     ├─ KV  axto-kv       : rate-limit & cache ringan                             │
                     └─ Workers AI        : model AI bawaan (fallback tanpa API key)              │
                         └────────────────────────────────────────────────────────────────────────┘
 Penyedia AI (opsional): kunci platform (admin) atau BYOK member — Anthropic, OpenAI, Gemini, Groq, OpenRouter
 Pembayaran: Stripe · PayPal · Xendit · Midtrans · Crypto (NOWPayments)
 Engine self-hosted (Docker) ──▶ /api/license-validate (respons ditandatangani Ed25519)
```

Prinsip:
- **Satu sumber kebenaran**: paket & batas di `lib/plans.ts`, aplikasi di `lib/apps.ts`, produk self-hosted di `lib/self-hosted.ts`.
- **D1 hemat**: tidak ada tabel log per-request; heartbeat lisensi hanya memperbarui 1 baris (maks. 1×/jam); entitlement dibawa di JWT dan disegarkan per jam.
- **R2 maksimal**: semua isi (prompt, dokumen, hasil AI, invoice, arsip) di R2; D1 hanya indeks kecil.
- **BYOX & Managed terpisah 100%**: tidak ada kode, rute, tabel, atau menu yang dipakai bersama untuk kredensial AI.
- **Mudah dipahami**: bahasa sederhana, satu pola tata letak untuk seluruh portal, setiap halaman punya judul + penjelasan singkat + satu tombol utama.

---

## 4. Paket langganan

Harga default (bisa diubah admin di **Admin → Paket & Harga**). Tahunan = 10× bulanan (hemat 2 bulan).

| | **Starter** | **Pro** | **Business** | **Enterprise** |
|---|---|---|---|---|
| Harga / bulan | $19 | $49 | $199 | $999 |
| Harga / tahun | $190 | $490 | $1.990 | $9.990 |
| Pemakaian AI (BYOX) | Tak terbatas — pakai kunci sendiri | Tak terbatas | Tak terbatas | Tak terbatas |
| Clipper (video → klip pendek) | 10 video/bln | 50 video/bln | 200 video/bln | Tak terbatas |
| Penyimpanan (R2) | 1 GB | 10 GB | 50 GB | 500 GB |
| Prompt Library | Basic + Pro | + Premium | + Elite | Semua |
| Legal AI | 6 workspace inti | 18 workspace | 18 workspace | 18 workspace |
| AI Studio · Privacy Vault | ✓ | ✓ | ✓ | ✓ |
| Compliance Center · Security Analyst | – | ✓ | ✓ | ✓ |
| Lisensi self-hosted (Docker) | – | – | 3 aplikasi × 5 node | 10 aplikasi, node tak terbatas |
| BYOX: kunci sendiri (Anthropic, OpenAI, Gemini, Groq, OpenRouter, Deepgram) + endpoint/model sendiri (Ollama, vLLM, LM Studio via URL) | ✓ | ✓ | ✓ | ✓ |

- Akun gratis hanya untuk melihat katalog & contoh prompt level Basic. Semua aplikasi = berbayar.
- Paket di atas adalah paket **BYOX**. Paket **Managed** (AI disediakan AXTO, dengan kredit bulanan) didefinisikan terpisah dan dikunci.
- Pembayaran **prabayar per periode** (bulanan/tahunan) di semua gateway, termasuk QRIS/VA/crypto; pengingat email 7/3/1 hari sebelum berakhir; perpanjang 1 klik.
- Lisensi self-hosted selalu **tier tertinggi** (fitur paling lengkap) dan berakhir bersama periode langganan.

### 4b. Lisensi Lifetime (offline, super-enterprise)

Lisensi **seumur hidup** untuk edisi self-hosted — **tidak perlu koneksi lagi ke axto.io**. Setiap perangkat diaktifkan dengan *file aktivasi offline* yang ditandatangani Ed25519 dan terkunci ke ID mesin perangkat itu; engine memverifikasinya secara lokal (air-gapped). Jumlah perangkat dibatasi 1–100.

| Perangkat | Satu aplikasi | **Suite 10 aplikasi** |
|---|---|---|
| 1 | $24.900 | $149.000 |
| s.d. 5 | $99.000 | $590.000 |
| s.d. 10 | $179.000 | $990.000 |
| s.d. 25 | $390.000 | $1.990.000 |
| s.d. 50 | $690.000 | $3.490.000 |
| s.d. 100 | $1.190.000 | $5.900.000 |

- Termasuk: fitur **tier tertinggi**, penggunaan selamanya untuk versi mayor yang dibeli, pembaruan 12 bulan, EXE Windows + image Docker.
- Pembayaran: transfer bank/wire (invoice), crypto, atau kartu (Stripe maks. $999.999 per transaksi). Nilai di atas itu otomatis lewat wire.
- Harga dapat diubah admin (**Admin → Paket & Harga → Lifetime**).
- Kode: `lib/lifetime.ts`, tabel `lifetime_licenses` + `lifetime_activations`, file aktivasi `.axto-license` per perangkat.

---

## 5. Aplikasi

### 5a. Aplikasi web — tanpa Docker (di dalam `/app`)
| Aplikasi | Isi | Padanan self-hosted |
|---|---|---|
| **Legal AI** | 18 workspace ahli (riset hukum, review kontrak, drafting, due diligence, AML/KYC, privasi data, ketenagakerjaan, HKI, ESG, litigasi, dll.), unggah dokumen (PDF/DOCX/TXT), ekspor | AXTO Legal |
| **Prompt Library** | Ribuan variasi prompt siap pakai, 24 bidang × 4 level, isi variabel, salin/jalankan | – |
| **AI Studio** | Chat multi-model, system prompt, riwayat tersimpan di R2 | AXTO Studio / Orchestra |
| **Privacy Vault** | Deteksi & redaksi PII **di browser** (data tidak keluar perangkat): email, telepon, kartu (Luhn), IBAN, NIK, NPWP, SSN, IP, dll. + tokenisasi & pemulihan | AXTO Vault |
| **Compliance Center** | Analisis gap SOC 2 / ISO 27001 / GDPR / HIPAA / PCI DSS / UU PDP / NIST CSF, rencana perbaikan, generator kebijakan | AXTO Compliance |
| **Security Analyst** | Triage log & alert, pemetaan MITRE ATT&CK, ekstraksi IOC, laporan insiden | Guardian AI / AXTO SOC |
| **Clipper** | Video panjang → klip pendek viral: transkripsi (kunci STT milik member), deteksi momen terbaik (LLM milik member), potong & reframe 9:16/1:1/16:9, caption animasi, judul & hashtag, ekspor MP4 — diproses **di perangkat member** (ffmpeg WebAssembly) | – |

### 5b. Dua jalur AI yang terpisah total
| | **BYOX** (aktif) | **Managed** (dikunci) |
|---|---|---|
| Sumber AI | Kunci/model/endpoint milik member | Kunci platform AXTO + Cloudflare Workers AI |
| Kode | `lib/ai/byox.ts`, `/api/byox/*` | `lib/ai/managed.ts`, `/api/managed/*` |
| Data | `user_ai_keys` (terenkripsi) | `ai_provider_keys`, `usage_monthly.runs` |
| Kuota | Tidak ada (biaya AI ditanggung member di penyedia) | Kredit AI per bulan |
| UI | Pengaturan → Kunci AI Saya | Menu *Managed AI* (terkunci, "segera hadir") |
| Admin | – | Admin → Managed AI (tombol buka/kunci) |


Tidak ada fallback dari BYOX ke Managed atau sebaliknya.

### 5c. Edisi self-hosted — Docker **dan EXE Windows**, wajib lisensi berbayar
10 aplikasi konsisten: Guardian AI, Orchestra AI, Vault, Edge, SOC, Compliance, Sentinel, Antivirus, Studio, Legal.
Dikirim sebagai image Docker (Linux) dan installer Windows (menjalankan image yang sama lewat Docker Desktop/WSL2), dibangun GitHub Actions → R2 `axto-builds`, diunduh dari portal. Aktivasi: online (langganan) atau offline (Lifetime).

**Protokol lisensi v3 (diuji E2E dengan kode engine asli, semua 13 modul lisensi):**
- Jawaban server ditandatangani Ed25519; engine memverifikasi dengan public key yang dikompilasi (tidak bisa diganti lewat env).
- Engine mengirim `nonce` acak per permintaan; server menandatangani nonce itu → jawaban lama tidak bisa diputar ulang (replay).
- Payload terikat ke kunci lisensi **dan** ID instalasi; limit (node/worker/perangkat) diambil dari segmen *entitlements* yang ditandatangani, bukan dari JSON biasa.
- ID instalasi disimpan di volume data (`AXTO_STATE_DIR`) → stabil saat container dibuat ulang/di-update; Studio core + modul berbagi satu ID.
- `AXTO_LICENSE_SERVER` boleh diarahkan ke proxy/mirror — aman karena tanda tangan tetap diverifikasi.
- Tidak ada trial/mode gratis di engine mana pun (Orchestra trial dihapus).

### 5d. Panduan penggunaan (wajib untuk setiap aplikasi)
- Aplikasi web: halaman "Cara pakai" di dalam aplikasi + halaman publik `/apps/<app>` + pusat bantuan `/help`.
- Self-hosted: panduan instalasi Docker, EXE Windows, aktivasi online/offline, dan menu per produk di `/self-hosted/<produk>/guide` (juga PDF di R2).
- Aplikasi tidak boleh lolos gerbang kualitas tanpa panduannya.
(`yp`, `ai-studio`, `gpu-studio`, `hybrid-studio` tidak dijual terpisah; Studio = satu produk.)

---

## 6. Portal

### Portal Member `/app`
`Beranda` (status paket, meter kuota, langkah memulai) · `Aplikasi` (6 aplikasi web) · `File Saya` · `Self-Hosted` (unduhan + kunci lisensi, untuk Business/Enterprise) · `Tagihan` (paket, upgrade, riwayat & invoice) · `Pengaturan` (profil, kata sandi, kunci AI sendiri) · `Bantuan`.

### Portal Admin `/admin`
`Ringkasan` (MRR, pelanggan aktif, pendapatan, pemakaian AI) · `Member` · `Pesanan & Pembayaran` (konfirmasi transfer manual) · `Langganan` · `Lisensi Self-Hosted` · `Paket & Harga` · `Prompt Library` · `Mesin AI` (kunci penyedia, model default) · `Gateway Pembayaran` · `Rilis (build R2)` · `Pengaturan` · `Log Audit`.

`Support` (inbox live chat + form kontak, status online/away, pengaturan AI asisten) · `Pembayaran & Email` (semua kredensial, rekening BNI, wallet crypto — terenkripsi di R2).

Dihapus: Program Akses Gratis, Create License (digabung ke Lisensi), Trial Batch, Promo Pricing, Resellers, Managed Infra, AutoPost, Playbooks (diganti Prompt Library), Crypto Methods (digabung ke Gateway).

---

### Live support
- Widget chat di situs publik & portal member; dropdown topik: penawaran/quotation, **nego harga lisensi Lifetime**, bayar **crypto**, bayar **transfer bank (BNI)**, enterprise, tagihan, teknis, akun, lainnya.
- Admin online → admin menjawab langsung. Admin tidak online → **AI asisten** menjawab (pool API key dari admin, rotasi + failover; Workers AI sebagai cadangan).
- **Anti-bocor by design:** model hanya menerima fakta publik (paket, harga, aplikasi, FAQ, nama metode bayar). Kunci, rekening, wallet, data pelanggan, konfigurasi tidak pernah masuk konteks; setiap jawaban disaring filter redaksi rahasia. AI tidak menegosiasikan harga dan tidak mengonfirmasi pembayaran — topik tersebut ditandai "perlu orang" dan dikirim ke email admin.
- Form kontak `/contact` → masuk inbox Support + email ke admin + balasan otomatis ke pengirim.

---

## 7. Data: D1 ramping, R2 maksimal

**D1 (inti saja)**
| Tabel | Isi |
|---|---|
| `users` | akun (admin & member), profil, status |
| `subscriptions` | 1 baris per member: paket, siklus, periode aktif |
| `orders` | pesanan & pembayaran (menggantikan invoices/crypto_payments/usdt_payments/playbook_purchases) |
| `sh_licenses` | lisensi self-hosted (menggantikan `licenses` yang rusak) |
| `usage_monthly` | penghitung AI runs per member per bulan (1 upsert per run) |
| `files` | indeks file member; isi di R2 |
| `user_ai_keys` | kunci BYOK terenkripsi |
| `platform_config`, `ai_provider_keys`, `audit_log` | konfigurasi (dipakai ulang) |
| `support_threads` | indeks percakapan support (isi pesan di R2) |

**R2**
- `axto-storage/content/prompts/*.enc` — isi Prompt Library, terenkripsi AES-256-GCM (repo publik hanya menyimpan ciphertext).
- `axto-storage/invoices/YYYY/<order>.html` — invoice.
- `axto-documents/u/<userId>/…` — unggahan & hasil kerja member.
- `axto-builds/…` — image Docker, EXE, PDF panduan (sudah berjalan).
- `axto-storage/secure/<nama>.json.enc` — pengaturan rahasia (gateway pembayaran, rekening bank, wallet crypto, email, pool API key AI support), AES-256-GCM dengan kunci dari secret `SETTINGS_ENCRYPTION_KEY`, AAD = nama dokumen. Admin API hanya mengembalikan nilai yang dimasking.
- `axto-storage/support/threads/<id>.json` — isi percakapan support (append dengan cek etag); `support/presence.json` — status online admin.

**Tabel lama** (autopost_*, trial_*, promo_*, reseller*, playbook_*, studio_*, installs, dll.) tidak lagi dipakai kode v3. Penghapusan tabel lama disediakan sebagai skrip terpisah `dashboard/cf-migrations-optional/` agar tidak ada data yang hilang tanpa persetujuan.

---

## 8. Prompt Library

- **24 bidang**: Bisnis & Strategi, Marketing, Penjualan, Konten & SEO, Media Sosial, E-commerce, Keuangan & Akuntansi, Investasi, Hukum, Kepatuhan & Risiko, SDM & Rekrutmen, Karier, Pendidikan, Riset Akademik, Kesehatan, Pengembangan Software, Data & Analitik, Keamanan Siber, Desain & UX, Manajemen Produk, Operasional & Supply Chain, Properti, Hospitality & Pariwisata, Produktivitas Pribadi.
- **4 level**: Basic (tugas kecil sehari-hari) → Pro (kerangka profesional) → Premium (alur kerja ahli multi-langkah) → **Elite** (skala global: multi-negara, multi-mata uang, tingkat C-level/konsultan).
- Setiap prompt: judul, ringkasan publik (untuk SEO), variabel `{{...}}`, isi lengkap (terkunci sesuai paket), contoh penggunaan, model yang cocok.
- Halaman publik per bidang & per prompt (judul + ringkasan) → ratusan halaman yang bisa diindeks Google; isi lengkap hanya untuk member.

---

## 9. SEO (standar Google Search Console)

- Halaman publik **statis** (SSG) dengan `generateMetadata` per halaman: title unik, description, canonical, Open Graph, Twitter Card.
- JSON-LD: `Organization`, `WebSite` + `SearchAction`, `SoftwareApplication` + `Offer` (harga nyata), `FAQPage`, `BreadcrumbList`, `BlogPosting`, `CreativeWork` (prompt).
- `sitemap.xml` (indeks) + sub-sitemap: halaman, aplikasi, prompt, blog; `lastModified` akurat.
- `robots.txt` dari `app/robots.ts` saja; halaman portal/admin/auth `noindex`.
- Verifikasi Search Console via env `NEXT_PUBLIC_GSC_VERIFICATION` (atau DNS TXT di Cloudflare — direkomendasikan).
- Core Web Vitals: tanpa skrip iklan global, font sistem, JS minimal di halaman publik, cache static assets 1 tahun.
- RSS blog, halaman 404 yang benar, `manifest.webmanifest`, ikon, `security.txt`.

---

## 10. Fase pengerjaan

| Fase | Isi | Status |
|---|---|---|
**Gerbang kualitas (wajib):** satu tahap/aplikasi baru dimulai hanya setelah tahap sebelumnya lulus uji E2E penuh — build, uji unit, uji alur browser (Playwright) terhadap D1/R2/KV lokal, dan pemeriksaan konsistensi (nama, harga, menu, tautan). Tidak ada "setengah jadi" yang naik.

| Tahap | Isi | Status |
|---|---|---|
| 0 | Audit + blueprint + hapus data klien uji | ✅ |
| 1 | Fondasi: paket, migrasi D1 v3, auth, checkout & 5 webhook, BYOX vs Managed (terkunci), lisensi berbayar (server + 13 engine) | ✅ (E2E) |
| 2 | Design system + Portal Member + Portal Admin + halaman publik inti (beranda, harga, legal) — diuji E2E | ✅ — celah ditutup di v3.2 (§19): File Saya, Managed AI, 10 bahasa penuh |
| 2b | Self-hosted: Lifetime offline (harga, checkout, file aktivasi, dukungan offline di 13 engine), EXE Windows, panduan instalasi | ✅ v3.2 (§19c, E2E + 13 engine) |
| 3 | Aplikasi 1: **Legal AI** (paling sering dipakai) | ✅ (E2E) |
| 4 | Aplikasi 2: **Prompt Library** (konten + enkripsi + R2) | ✅ 51 prompt kurasi (target ≥2.000 = roadmap konten) |
| 5 | Aplikasi 3: **AI Studio** | ✅ (E2E) |
| 6 | Aplikasi 4: **Clipper** | ✅ inti (fitur §12c lanjutan = roadmap) |
| 7 | Aplikasi 5–7: Privacy Vault, Compliance Center, Security Analyst | ✅ (E2E) |
| 8 | SEO lengkap + blog + sitemap + optimasi R2/D1 + pembersihan tabel lama (opsional) | ✅ v3.2 (RSS, 404, security.txt, panduan, halaman kepercayaan); pembersihan tabel lama tetap opsional |

---

## 11. Yang perlu disiapkan pemilik

1. **Merge** branch ini ke `main` untuk deploy (migrasi D1 & upload R2 berjalan otomatis).
2. Secret Pages yang sudah ada tetap dipakai: `JWT_SECRET`, `ENCRYPTION_KEY`, `ADMIN_PASSWORD`, `CRON_SECRET`.
3. Aktifkan gateway pembayaran di **Admin → Gateway Pembayaran** (PayPal & NOWPayments sudah aktif; Stripe/Xendit/Midtrans tinggal diisi).
4. Managed AI tetap terkunci sampai Anda membukanya di **Admin → Managed AI**.
5. Verifikasi domain di Google Search Console (DNS TXT di Cloudflare), lalu kirim `https://axto.io/sitemap.xml`.

---

## 12. Standar puncak v3.1 — target "kelas dunia" (permintaan pemilik, Sep 2026)

Prinsip: tidak ada fitur setengah jadi. Setiap poin di bawah wajib punya (1) kode, (2) panduan pakai, (3) uji otomatis yang dijalankan **berulang** (setiap push + terjadwal setiap malam). Fakta hukum tidak pernah dikarang: AI diwajibkan menandai `VERIFY` bila tidak yakin dan menyebut tanggal "per" (as-of).

### 12a. Legal AI — setara/melampaui Harvey, CoCounsel, Lexis+ AI
| Area | Spesifikasi |
|---|---|
| **Yurisdiksi** | ±200 negara + Uni Eropa + hukum internasional; filter **negara → negara bagian/provinsi/rezim khusus → kota/kabupaten**. Subdivisi untuk negara yang hukum daerahnya berbeda: ID (38 provinsi + Aceh/qanun, DIY, DKJ, Papua Otsus, Bali desa adat, IKN), US (50 negara bagian + DC + teritori; Louisiana civil law), CA (Québec civil law), AU, IN, MY (Sabah/Sarawak, Syariah negeri), GB (Skotlandia, Irlandia Utara), DE, BR, MX, ES (derecho foral), IT, CH, AE (DIFC/ADGM), NG (negara bagian Syariah), ZA, AR, PK, SA, PH (BARMM), CN, JP, KR, CO, CL, BE, AT, CM, FR (Alsace-Moselle, DOM-TOM), DK, FI, PT, IQ, BA, TZ, KZ (AIFC), QA (QFC). Sistem hukum per negara (civil/common/Islam/adat/sosialis), hierarki peraturan, sumber resmi, dan **perubahan terbaru** yang wajib dicek (mis. KUHP baru 2 Jan 2026, BNS/BNSS/BSA India, EU AI Act). |
| **Hukum terbaru** | Mode *Live research*: Anthropic (web_search + web_fetch server tools), OpenRouter (web plugin), Perplexity (sonar) → jawaban dengan sumber & tanggal. Tanpa live research, AI wajib menyatakan batas pengetahuannya dan daftar yang harus diverifikasi. Prinsip waktu: hukum yang berlaku saat peristiwa vs saat ini, aturan peralihan, *lex mitior* untuk pidana. |
| **Susun ulang perkara** (Case Builder) | Unggah banyak berkas (PDF, DOCX, TXT, MD, HTML, EML, CSV) → teks diekstrak **di browser** (pdf.js, pembaca DOCX bawaan) dengan penanda halaman `[DOC-n p.x]` → AI menyusun: para pihak, kronologi (tabel bertanggal + rujukan dokumen), pokok masalah hukum, dasar hukum berjenjang dari konstitusi sampai peraturan daerah & yurisprudensi (dengan cek keberlakuan), analisis per unsur, matriks bukti & kekurangan bukti, kompetensi/tenggat/daluwarsa, argumen & bantahan, penilaian risiko, strategi, dokumen yang perlu dibuat, sumber & daftar verifikasi. |
| **Workspace** | 36 workspace dalam 5 kelompok: Riset & Analisis (riset hukum, case builder, perbandingan multi-yurisdiksi, penjelas pasal, uji konstitusional, analisis putusan, radar regulasi, cek sitasi), Kontrak & Transaksi (review & redline, drafting, strategi negosiasi, due diligence, kesekretariatan korporasi, perbandingan dokumen), Litigasi & Sengketa (strategi litigasi, gugatan/jawaban/banding/kasasi/PK, kronologi & bukti, persiapan saksi, simulasi lawan & hakim, arbitrase, somasi & nilai damai, pidana), Kepatuhan & Risiko (gap kepatuhan, privasi/DPIA, AML/KYC/sanksi, ketenagakerjaan, HKI, pajak, ESG, tata kelola AI), Drafting & Komunikasi (surat & pendapat hukum, penjelasan bahasa awam, perancangan peraturan/naskah akademik, terjemahan hukum, kalkulator tenggat, tanya bebas). Starter: 6 workspace inti; Pro ke atas: semua. |
| **Kontrol** | 45 bidang hukum, peran/pihak (penggugat, tergugat, jaksa, penasihat hukum, hakim, mediator, in-house, regulator, netral), audiens (pengacara, klien awam, pengadilan, direksi), kedalaman (ringkas/standar/menyeluruh), bahasa output, tanggal peristiwa & tanggal "per", gaya sitasi (Bluebook, OSCOLA, AGLC, McGill, praktik Indonesia, EU). |
| **Prompt** | Prompt berlapis dibangun **hanya di server** (tidak bisa dilihat/diubah browser): standar profesi → yurisdiksi → waktu → protokol riset & sitasi → metode workspace → fokus bidang → peran & audiens → protokol dokumen (anti prompt-injection dari isi dokumen) → format output → etika & kerahasiaan. |
| **Matter (perkara)** | Disimpan terenkripsi AES-256-GCM per member di R2 (dokumen, hasil, catatan); D1 tidak menyimpan isi. Riwayat per perkara, lanjutkan percakapan, ekspor **DOCX**, PDF (cetak), Markdown. |

### 12b. BYOX / BYOK / BYOM / BYOE — harus benar-benar jalan
- Penyedia: Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Perplexity, DeepSeek, Mistral, xAI (Grok), Together AI, Fireworks AI, Cerebras, Deepgram (STT), dan **endpoint sendiri** (Ollama, vLLM, LM Studio, LiteLLM, Azure-compatible gateway).
- Daftar model diambil langsung dari akun member (`/models`), tombol **Tes koneksi**, pilih penyedia & model per jalankan, urutan cadangan otomatis antar kunci milik member (tidak pernah jatuh ke AI platform).
- Uji E2E dengan penyedia tiruan (mock) memverifikasi: kunci terenkripsi, prompt sistem dari server, dokumen & yurisdiksi masuk ke prompt, streaming, error yang jelas.

### 12c. Clipper — setara OpusClip / Klap / Vizard
Transkripsi kata-per-kata (Deepgram/Groq/OpenAI), skor viralitas (hook, payoff, emosi, kejelasan) dengan alasan, auto-reframe 9:16/1:1/16:9 dengan deteksi wajah di browser, caption animasi (template, highlight kata kunci, emoji), hapus jeda & kata pengisi, brand kit (logo, font, warna), judul/deskripsi/hashtag per platform, terjemahan caption, ekspor MP4 + SRT/VTT, proyek tersimpan di R2. Video diproses di perangkat member (ffmpeg.wasm).

### 12d. SEO & konversi
- Halaman programatik yang bermanfaat (bukan tipis): Legal AI per negara (sistem hukum, sumber resmi, subdivisi, workspace, FAQ), per workspace, per bidang prompt; JSON-LD `SoftwareApplication`/`Offer`/`FAQPage`/`BreadcrumbList`; internal link; sitemap per kelompok.
- Ajakan membeli kuat & jujur: CTA utama di setiap bagian, harga jelas + hemat tahunan, tabel perbandingan, demo interaktif, jaminan keamanan data, aktivasi instan, sticky CTA di mobile. **Tanpa testimoni/angka palsu.**

### 12e. Docker Windows & Linux — nol bug, diuji berulang
- CI: build + jalankan + aktivasi lisensi untuk ke-15 image di Linux (setiap push & **setiap malam**), uji installer (Go) di Linux + build/uji CLI di runner Windows, E2E platform lengkap.
- Rilis hanya jika semua hijau; hasil uji dicatat di Admin → Releases.

---

## 13. Penyimpanan & riwayat kerja universal (permintaan pemilik, Sep 2026)

Prinsip: **klien tidak pernah kehilangan hasil kerjanya**, dan bisa melihat riwayat, membuka lagi, mengganti nama, dan menghapus — di web maupun self-hosted.

### 13a. Aplikasi web (R2, terenkripsi per member — `lib/user-crypto.ts`)
Pola "matter" Legal AI digeneralisasi menjadi **Workspace History** yang dipakai semua app lewat satu pustaka `lib/history.ts`:
- **CRUD penuh**: list (sidebar riwayat), buka, ganti nama, duplikat, hapus, dan ekspor.
- Struktur R2: `app/<slug>/<uid>/index.enc` (daftar) + `.../items/<id>.enc` (isi), AES-256-GCM kunci unik per akun; D1 hanya menyimpan total penyimpanan.
- Per app:
  - **Legal**: matters (sudah ada) — dokumen + hasil + catatan.
  - **AI Studio**: percakapan tersimpan (judul, model, pesan) — lanjutkan kapan saja.
  - **Clipper**: proyek video (sumber, klip, caption, gaya) + hasil ekspor.
  - **Prompt Library**: prompt favorit & hasil yang dijalankan.
  - **Privacy Vault**: sesi redaksi (opsional; default tetap di perangkat).
  - **Compliance / Security**: asesmen & laporan tersimpan.
- **Upload**: berkas diproses di browser; yang disimpan hanya yang diminta klien (teks/hasil), terenkripsi. Kuota mengikuti paket (storageGB) dengan meteran yang jelas.
- **Download/Ekspor**: DOCX/PDF/Markdown/MP4/SRT sesuai app; tautan unduhan aman.

### 13b. Self-hosted (Docker & EXE Windows/Linux — local storage di volume data)
- Setiap engine menyimpan **riwayat kerja** di `AXTO_STATE_DIR` (volume data, bukan image), dengan API CRUD lokal dan UI riwayat di dashboard engine.
- Installer AXTO Setup memetakan volume data persisten sehingga update/rebuild container **tidak menghapus** riwayat & hasil klien.
- Ekspor/impor riwayat (backup) dari UI; data klien tidak pernah dihapus oleh update, integrity-lock, atau pembekuan lisensi.

### 13c. Kenyamanan (wajib)
- Autosave draf, indikator "tersimpan", pencarian riwayat, dan kelanjutan lintas perangkat (web) / lintas restart (self-hosted).
- Tidak ada langkah yang menyulitkan: default aman, satu klik untuk simpan/buka/ekspor.

---

## 14. Kesiapan skala dunia & super-enterprise (target puncak, Sep 2026)

Checklist "tidak ada yang ketinggalan" sebelum menaikkan versi:

**Keamanan & kepercayaan**
- Enkripsi at-rest (AES-256-GCM per member di R2) + in-transit (TLS/HSTS); kunci AI & pembayaran tidak pernah tampil ulang.
- Lisensi Ed25519 fail-closed, terikat mesin, anti-replay; integrity manifest per engine.
- Audit log tamper-evident (D1) untuk setiap aksi akun/pembayaran/lisensi/admin.
- SSO/SAML/OIDC + SCIM untuk enterprise (roadmap Fase E1); 2FA/passkey untuk semua akun.
- Data residency: pilihan region R2/D1; jejak "data tidak pernah dipakai untuk training".
- Halaman kepercayaan: /security, /privacy, /terms, /dpa, /subprocessors, security.txt, status page.

**Skala & keandalan**
- Cloudflare edge global (Pages + Workers), D1 ramping + R2 maksimal (budget 10 TB).
- Rate limiting berlapis, idempotensi pembayaran, cron heartbeat, housekeeping.
- Backup/restore (ekspor R2), disaster recovery, RPO/RTO terdokumentasi.
- Observability: log terstruktur, metrik penggunaan, alert; halaman status publik.

**Kenyamanan klien (wajib)**
- 10 bahasa manual + RTL; pilihan bahasa persisten; a11y (WCAG AA), keyboard, kontras, prefers-reduced-motion.
- Autosave + riwayat kerja CRUD di setiap app (web & self-hosted); tidak pernah kehilangan pekerjaan.
- PWA installable, mobile-first, offline page; panduan visual & animasi di setiap app.
- Onboarding 3 langkah, empty-state yang membantu, pesan error yang jelas & dapat ditindaklanjuti.

**Komersial**
- Paket bulanan/tahunan + lifetime 1–100 device (super-enterprise), kupon, proforma invoice, pajak.
- Pembayaran: kartu/PayPal/QRIS/VA/e-wallet/crypto/transfer BNI; aktivasi instan zero-hand.
- Portal admin lengkap; reseller/affiliate (roadmap); SLA & dukungan berjenjang.

## 15. Sistem prompt super-premium (arsitektur, semua app)

Prinsip: prompt dibangun **hanya di server** (tidak bisa dilihat/diubah browser), berlapis, dan diversi. Struktur umum tiap app: `identitas & standar profesi → konteks (yurisdiksi/industri/peran) → metode langkah-demi-langkah → protokol data/dokumen (anti-injection) → format output → etika & keamanan → bahasa`.

| App | Cakupan prompt premium |
|---|---|
| **Legal AI** | 36 workspace × prompt 11-lapis (sudah ada); ditambah pustaka klausul, checklist per bidang, dan template dokumen per yurisdiksi. |
| **Prompt Library** | 24 bidang × 4 level (Basic→Elite) × banyak varian; setiap prompt: judul, ringkasan SEO, variabel `{{...}}`, isi lengkap terkunci per paket, contoh, model yang cocok, estimasi token/biaya. Target ≥ 2.000 prompt kurasi. |
| **AI Studio** | Peran sistem + pustaka "persona" siap pakai (analis, engineer, penulis, dsb.), mode reasoning/effort, ringkas vs mendalam. |
| **Clipper** | Prompt deteksi momen viral (hook/payoff/emosi), penulisan judul/hook/hashtag per platform, gaya caption, terjemahan. |
| **Compliance** | Prompt per framework (SOC2/ISO27001/GDPR/HIPAA/PCI/NIST/UU PDP): asesmen, gap, remediasi, kebijakan. |
| **Security Analyst** | Triage, pemetaan MITRE ATT&CK, ekstraksi IOC, laporan insiden; playbook per jenis serangan. |
| **Vault** | Aturan deteksi PII/PHI/finansial per negara; strategi redaksi/tokenisasi. |
| **Orchestra/SOC/Edge/Sentinel/Antivirus** | Prompt operasional + kebijakan enforcement (self-hosted). |

Semua prompt disimpan sebagai data terversi (R2/D1), dengan uji "golden output" agar kualitas konsisten.

## 16. Strategi API key AI optimal + estimasi hemat biaya

Model AXTO = **BYOX** (klien pakai kunci sendiri, tanpa markup) + **Managed** (opsional, terkunci; AXTO sediakan model + kredit). Untuk keduanya, terapkan lever hemat biaya (referensi praktik terkini):

**Lever hemat (urut dampak, tanpa mengorbankan kualitas):**
1. **Prompt caching** untuk system prompt panjang (Legal 11-lapis, dokumen) — hemat hingga ~90% token input berulang; TTL 5 menit/1 jam.
2. **Model tiering / routing**: tugas ringan → model kecil (Haiku/Gemini Flash/Llama-70B di Groq), tugas berat → model besar (Opus/Sonnet/GPT-5). Router memilih otomatis per jenis tugas.
3. **Batch API** untuk pekerjaan non-interaktif (indexing prompt, pembuatan dataset) — umumnya ~50% lebih murah.
4. **Effort/thinking adaptif**: kedalaman "ringkas" untuk jawaban pendek, "menyeluruh" hanya saat diminta.
5. **Higiene token**: potong dokumen relevan saja, ringkas riwayat panjang, streaming untuk hindari timeout.
6. **Free-tier friendly**: default sarankan Gemini/Groq/Cerebras (ada tier gratis) untuk pengguna baru.

**Estimasi (indikatif, per 1.000 permintaan tipikal, campuran input 4k + output 1k token):**
- Tanpa optimasi, model besar: ~US$30–60.
- Dengan caching + routing + effort adaptif: ~US$6–15 (hemat ~60–80%).
- Tugas batch non-interaktif dengan model kecil: ~US$1–3.
(Angka final dihitung dari `response.usage` nyata; halaman admin akan menampilkan biaya aktual per app.)

**Pemasangan kunci "paling optimal":** Managed AI (saat dibuka) memakai kolam kunci dengan failover + routing di atas; BYOX tetap gratis di sisi AXTO. Rekomendasi default model per app dikurasi dan bisa dioverride.

## 17. Sumber data & aset — LINK-FIRST (hemat R2)

Prinsip hemat (revisi permintaan pemilik): **jangan mengunduh & menyimpan aset pihak ketiga ke R2 — cukup beri TAUTAN ke sumber unduhannya.** R2 hanya menyimpan hal yang benar-benar harus lokal.

**Yang HANYA ditautkan (tidak di-host di R2):**
| Kebutuhan | Diberikan sebagai tautan ke sumber resmi/terbuka |
|---|---|
| Antivirus signatures / rules | Tautan feed resmi (ClamAV main/daily/bytecode, YARA komunitas, abuse.ch URLhaus/MalwareBazaar/Feodo). Engine self-hosted mengunduh langsung dari sumber saat runtime (bukan lewat R2). |
| Clipper SFX / musik / video / animasi | Tautan ke pustaka CC0/bebas royalti (Freesound CC0, Pixabay/Pexels sesuai lisensi). Klien mengunduh dari sumber; kami hanya kurasi daftar + tautan + catatan lisensi. |
| Sumber hukum (Legal) | Tautan ke portal resmi (lembaran negara, pengadilan) — sudah ada di `lib/legal/jurisdictions.ts` (SOURCES). Live research mengambil langsung dari web. |
| Framework compliance | Tautan ke publikasi resmi (mis. NIST). |

**Yang tetap di R2 (kecil / milik AXTO / wajib lokal):**
- Image build self-hosted (`builds/latest/...`) & installer — sudah ada.
- Aset & prompt ORISINAL buatan AXTO (Prompt Library, template, ikon/overlay Clipper buatan sendiri).
- Data member terenkripsi (matters, riwayat kerja) — kecil, per akun.
- **Indeks/manifest** kecil berisi daftar tautan + versi + checksum + lisensi (bukan berkasnya).

**Mekanisme:** portal menampilkan katalog "download" yang menunjuk ke tautan sumber (dengan lisensi & ukuran), bukan proxy R2. Untuk feed antivirus yang butuh kesegaran, engine self-hosted menarik langsung dari sumber terjadwal. Ini menekan pemakaian R2 seminimal mungkin (tetap ada headroom hingga 10 TB bila suatu saat perlu meng-host aset orisinal besar).

## 18. Urutan setelah blueprint final
Setelah blueprint ini disepakati: (1) pustaka prompt premium + golden tests, (2) pipeline dataset→R2 (antivirus/Clipper dulu), (3) app berikutnya (Studio ✓, Prompt Library, Clipper, Vault, Compliance, Security), (4) SSO/enterprise & halaman kepercayaan, (5) rollout integrity + Cython ke semua engine dengan uji docker-smoke berulang.

---

## 19. Audit v3.2 — yang belum, yang error, yang tidak konsisten (29 Sep 2026)

Metode: typecheck, 45 uji unit, build produksi (351 halaman), E2E penuh di runtime Cloudflare lokal (D1/KV/R2), pemeriksa tautan statis atas semua `href`, log GitHub Actions, dan pencocokan baris-per-baris blueprint §1–§18 dengan kode.
Hasil dasar: typecheck ✅ · unit 45/45 ✅ · build ✅ · E2E 57/59 ✅ (2 dilewati karena butuh Docker — di v3.2 dijalankan dengan Docker).

### 19a. ERROR (wajib diperbaiki dulu)
| # | Temuan | Dampak | Perbaikan v3.2 |
|---|---|---|---|
| E1 | `next@15.1.6` terkena **CVE-2025-66478** (RCE lewat React Server Components) | Situs produksi bisa diambil alih | Naik ke `next@15.1.12` (patch terbaru di minor yang sama, kompatibel next-on-pages) |
| E2 | CI **AXTO Setup (installer)** merah setiap malam: `TestWriteFilesKeepsCustomerEdits` menguji izin file Unix `0600` di runner Windows (Go selalu melaporkan `rw-rw-rw-`) | Rilis installer terblokir | Asersi izin hanya di OS yang punya izin Unix |
| E3 | CI **Auto Build All Images**: unggah multipart R2 gagal (`InvalidPart`) | Image SOC tidak terbit | Checksum AWS CLI mode kompatibel R2 + retry 3× |
| E4 | `deploy.yml` (AXTO CI/CD) menjalankan `tests/test-*.mjs` yang sudah **dihapus**; job PDF panduan bergantung padanya dan `render-guides.mjs` mengimpor `lib/product-guides.ts` yang **tidak ada** | Workflow nonaktif; PDF panduan (§5d) tidak pernah terbit | Uji diganti ke `npm test`; `lib/product-guides.ts` dibuat (satu sumber untuk halaman & PDF) |
| E5 | 49 PDF playbook premium masih ada di repo **publik** + langkah "Seed Playbooks" masih mengunggahnya ke R2 setiap deploy (temuan Kritis #4 belum ditutup) | Konten berbayar bocor | PDF & langkah seed dihapus dari pohon kerja. *Catatan pemilik:* file tetap ada di riwayat git — pembersihan riwayat (force-push) butuh keputusan Anda |
| E6 | Menu member **Managed AI** → `/app/managed` = **404** | Tautan mati di setiap halaman portal | Halaman Managed AI (terkunci, status dari `/api/managed/status`) |
| E7 | `public/configs/*.example.yml` yang diunduh member **basi** (12 file beda dari sumber di root) | Instruksi konfigurasi usang | `scripts/vendor.mjs` menyalin dari root saat build + uji unit kesamaan |
| E8 | Isi template Prompt Library (termasuk Premium/Elite) dan prompt server Legal AI tersimpan **polos** di repo **publik** (§7 menuntut repo hanya berisi ciphertext) | Konten berbayar bisa dibaca siapa pun di GitHub | **Keputusan pemilik:** jadikan repo GitHub privat (menutup E5 + E8 sekaligus, termasuk riwayat). Enkripsi konten di repo butuh secret `CONTENT_KEY` yang hanya bisa dipasang pemilik |

### 19b. BELUM ADA (celah blueprint)
| # | Blueprint | Kondisi | v3.2 |
|---|---|---|---|
| G1 | §4b Lifetime (tabel, checkout, file aktivasi offline, admin, 13 engine) | Hanya daftar harga + chat | **Dibangun penuh — lihat §19c** |
| G2 | §6 Portal member `File Saya` | Kunci i18n ada, halaman tidak ada | `/app/files`: semua hasil kerja tersimpan (7 app) + meteran penyimpanan, buka/ganti nama/hapus/ekspor |
| G3 | §5d `/self-hosted/<produk>/guide` + PDF di R2 | Tidak ada | Panduan per produk (Docker, EXE Windows, aktivasi online & offline, port, konfigurasi, pemecahan masalah) + PDF via CI |
| G4 | §9 halaman 404 yang benar, RSS blog, `security.txt` | Tidak ada | `not-found.tsx`, `error.tsx`, `/blog/rss.xml`, `/.well-known/security.txt` |
| G5 | §14 halaman kepercayaan `/dpa`, `/subprocessors`, status page | Tidak ada | `/dpa`, `/subprocessors`, `/status` (cek langsung `/api/health`) |
| G6 | §10 gerbang kualitas "E2E penuh setiap push + setiap malam" | E2E tidak dijalankan di CI | Workflow `e2e.yml` (push + malam, dengan Docker untuk uji 13 engine) |
| G7 | §4b tabel harga Lifetime di `/pricing` | `/self-hosted` menulis "See lifetime pricing" tetapi `/pricing` tidak memuatnya | Tabel Lifetime di `/pricing` (dibaca dari harga admin) |

### 19c. Desain Lifetime (offline, super-enterprise)
- **Data D1** (`0057_lifetime.sql`): `lifetime_licenses` (id `LT-…`, member, pesanan, cakupan `app`/`suite`, produk, jumlah perangkat 1–100, versi mayor, `updates_until`, status) + `lifetime_activations` (lisensi, produk, ID mesin, label, dicabut). Batas perangkat berlaku **per aplikasi**: Suite 5 perangkat = setiap aplikasi dari 10 aplikasi boleh aktif di ≤ 5 perangkat.
- **Harga**: default `lib/lifetime.ts`, dapat diubah admin (`platform_config.lifetime_prices`) di **Admin → Paket & Harga → Lifetime**. Server selalu menghitung ulang harga — browser tidak pernah menentukan nominal.
- **Beli**: Portal → *Lisensi Lifetime* → pilih aplikasi/suite + perangkat → pesanan `kind = lifetime` lewat gateway yang sama (transfer bank/wire, crypto, kartu ≤ $999.999; di atas itu otomatis wire). Saat pesanan lunas → lisensi terbit otomatis (zero-touch). Admin juga bisa menerbitkan lisensi hasil negosiasi langsung.
- **File aktivasi `.axto-license`** (JSON): `payload` pipa-terkanonik `axto-lifetime-1|<id>|<produk>|<id-mesin>|<cakupan>|<perangkat>|<mayor>|<updates_until>|<issued_at>` + `signature` Ed25519 dengan kunci penandatangan lisensi yang sama (engine sudah membawa public key-nya). Terikat ke **satu produk × satu ID mesin**.
- **Engine (13 modul)**: sebelum cek online, engine mencari `AXTO_LICENSE_FILE` atau `$AXTO_STATE_DIR/<produk>.axto-license`; jika tanda tangan sah + produk cocok + ID mesin cocok + versi mayor engine ≤ mayor lisensi → **valid tanpa jaringan**, tanpa heartbeat, tanpa batas waktu. File yang salah mesin/palsu ditolak dan jatuh ke jalur kunci online biasa. ID mesin dicetak di log engine agar member bisa mengaktifkan.
- **Uji**: unit (kanonik & harga), E2E server (beli → lunas → aktivasi → batas perangkat → cabut), E2E engine (file asli valid offline; file dipalsu/mesin lain/produk lain ditolak) di ke-13 modul.

### 19d. TIDAK KONSISTEN
| # | Temuan | v3.2 |
|---|---|---|
| I1 | Teks AI Studio: "Built-in model included" & "tidak mengurangi AI runs bulanan" — bertentangan dengan BYOX murni (§5b) | Teks diselaraskan: BYOX, 14 penyedia, tanpa kuota |
| I2 | 33 teks portal ditulis `id ? "…" : "…"` **dan** 17 kamus halaman (±650 teks: Legal, Clipper, Billing, Settings, …) hanya EN/ID → 8 bahasa lain tampil campur Inggris (bertentangan §14 "10 bahasa") | Kamus dipindah ke `lib/i18n-pages/*` bertipe `Record<Lang, …>` + uji kelengkapan; semua teks antarmuka kini 10 bahasa (kecuali katalog workspace Legal — lihat §19e); widget chat & topik support mengikuti bahasa pengunjung |
| I3 | Versi: `package.json` 2.2.0, `/api/health` 3.0.0 | Satu konstanta versi `3.2.0` |
| I4 | Kode mati v2: `lib/license-signing.ts`, `lib/product-docs.ts` (690 baris, tidak diimpor) | Dihapus |
| I5 | README hanya menyebut 2 produk & URL `YOUR_ORG` | README v3: 7 aplikasi web + 10 edisi self-hosted |
| I6 | Status fase §10 semua ⏳ padahal sebagian besar lulus E2E | Diperbarui |
| I7 | Uji visual (Chromium, DE/AR/JA, desktop + mobile): kartu paket di Billing, deskripsi & fitur aplikasi (Beranda, Apps), tagline self-hosted, label status (`active`, `paid`…) dan nama "Suite" tetap Inggris; "Öffnen Legal AI" salah urutan kata; panduan instalasi melebar 897 px di layar 390 px | Semua memakai kamus 10 bahasa (`plan.*`, `app.short.*`, `lib/i18n-pages/appfeatures.ts`, `shtaglines.ts`, `status.*`, `apps.openApp`); kolom artikel panduan `min-w-0` — 0 overflow di 31 halaman publik & portal |

### 19e. Roadmap setelah v3.2 (tidak dikerjakan di rilis ini, dicatat agar tidak hilang)
- Konten Prompt Library menuju ≥ 2.000 prompt (§15) — butuh kurasi konten, bukan kode.
- Clipper lanjutan (§12c): deteksi wajah, brand kit, terjemahan caption.
- SSO/SAML/OIDC + SCIM (§14, Fase E1); 2FA/passkey.
- Pembersihan riwayat git untuk PDF lama (keputusan pemilik).
- Katalog 36 workspace Legal AI (nama, deskripsi, isian formulir, contoh) masih EN/ID seperti rancangan awal (`lib/legal/workspaces.ts`: `name`/`nameId`); 8 bahasa lain menampilkan versi Inggris. Terjemahan istilah hukum perlu ditinjau ahli hukum per bahasa sebelum dirilis — jangan hasil mesin saja.

### 19f. Status pengerjaan v3.2
| Item | Status | Bukti |
|---|---|---|
| E1–E8 (error) | ✅ E1–E7 selesai · E8 = keputusan pemilik (repo privat) | CI hijau lokal: Go test Linux + kompilasi Windows, YAML valid, 61 uji unit |
| G1 Lifetime | ✅ | `tests/lifetime.test.ts`, `tests/e2e/lifetime.e2e.ts`, `engines.e2e.ts` (13 modul: valid offline; mesin lain / dipalsu / aplikasi lain ditolak) |
| G2 File Saya | ✅ | `/app/files` + `/api/files`; aplikasi menerima `?open=<id>` |
| G3 Panduan | ✅ | `/self-hosted/<slug>/guide` ×10, PDF EN/ID via `deploy-dashboard.yml`, `tests/guides.test.ts` |
| G4–G5 SEO & kepercayaan | ✅ | `not-found`, `error`, RSS, `security.txt`, `/dpa`, `/subprocessors`, `/status`, sitemap |
| G6 E2E di CI | ✅ | `.github/workflows/e2e.yml` (push + malam, Docker + Go) |
| G7 Harga Lifetime publik | ✅ | `/pricing#lifetime` (harga live dari admin) |
| I1–I7 | ✅ | uji `consistency.test.ts`, `i18n-pages.test.ts` (19 kamus × 10 bahasa), uji visual Chromium |

**Tindakan pemilik (tidak bisa dilakukan dari kode):**
1. Jadikan repo GitHub **privat** (E5/E8) — atau hapus riwayat PDF dengan force-push.
2. Aktifkan kembali workflow **AXTO CI/CD** (`deploy.yml`) di tab Actions bila ingin uji malam juga dari workflow itu (GitHub menonaktifkannya karena tidak aktif; `e2e.yml` baru sudah menutup kebutuhan uji malam).
3. Merge branch kerja ke `main` → migrasi D1 `0057_lifetime.sql`, `0058_session_epoch.sql` dan `0059_lifetime_install_key.sql` berjalan otomatis; image ARM64 pertama terbit saat *Auto Build All Images* dijalankan dengan `force_all=true`.

---

## 20. Audit v3.2.1 — seluruh portal member & admin, lisensi, pembayaran (30 Sep 2026)

Cara audit: seluruh alur uang dan lisensi dibaca baris demi baris (checkout → 5 gateway + transfer bank + kripto
langsung → webhook → aktivasi → invoice → refund; terbit/validasi/reset/lepas lisensi; Lifetime), setiap API admin
dan member dicek aksesnya, lalu **crawl browser** Chromium: 52 halaman (15 member, 13 admin, 24 publik) × desktop
dan HP × EN/ID/FR, plus 357 tautan internal.

### 20a. Pembayaran
| # | Temuan | Dampak | Perbaikan |
|---|---|---|---|
| P1 | `markOrderPaid` mengklaim order berstatus apa pun selain `paid` — termasuk **`refunded`** | Webhook yang diulang, atau membuka lagi tautan PayPal-return, **mengaktifkan kembali paket/lisensi setelah uang dikembalikan** (Lifetime: lisensi kedua) | Refund bersifat final; admin juga tidak bisa "mark paid" order yang sudah di-refund; webhook menjawab 200 agar gateway tidak mengulang |
| P2 | Webhook tidak mencocokkan gateway order | Notifikasi satu gateway bisa melunasi order gateway lain; cek nominal IDR terlewati pada order USD | `gateway` wajib sama (`gateway_mismatch`) |
| P3 | PayPal untuk Lifetime kembali ke `/app/billing` | Pembeli Lifetime melihat pesan "paket aktif" di halaman yang salah | Kembali ke `/app/lifetime` |
| P4 | `?error=` dari PayPal-return tidak ditampilkan di mana pun | Pembayaran gagal/ditolak kembali tanpa pesan apa pun | Pesan jelas di Billing & Lifetime (10 bahasa); "dibatalkan" juga di Lifetime |
| P5 | Checkbox **Test mode** di Admin → Payments disimpan tetapi tidak dipakai | Admin mengira sandbox, padahal transaksi live | Digantikan §22: set kunci Live dan Sandbox terpisah untuk semua gateway otomatis, dengan pilihan lingkungan yang eksplisit |
| P6 | MRR = harga daftar × langganan aktif | Akun komplimen ($0) menaikkan MRR; harga yang diubah admin diabaikan | MRR dari nominal yang benar-benar dibayar untuk periode berjalan |
| P7 | Badge gateway nonaktif bertuliskan "suspended"; URL webhook melebar di HP | Membingungkan; layar admin 413 px di HP 390 px | "off" / "offered at checkout" / "test mode"; URL dibungkus |
| P8 | Secret gateway yang sudah tersimpan tidak bisa dihapus (field kosong = "pertahankan") | Kunci lama/bocor tetap tersimpan terenkripsi; hanya bisa dinonaktifkan | Tombol **remove / undo** per secret; API menerima `null` = hapus |

### 20b. Lisensi
| # | Temuan | Dampak | Perbaikan |
|---|---|---|---|
| L1 | Suspend/revoke oleh admin hanya mengubah status | Member cukup klik **Issue** → kunci baru aktif lagi; pembayaran perpanjangan otomatis mengaktifkan kembali lisensi yang di-suspend admin | **Admin lock** (`sh_licenses.notes = admin_hold`): hanya admin yang membuka (Activate/Restore); portal member menampilkan 🔒 "Dikunci oleh AXTO" |
| L2 | Lisensi revoked tanpa tombol apa pun di admin; filter "Expired" selalu kosong (status itu tidak pernah disimpan) | Salah revoke tidak bisa dipulihkan; filter menyesatkan | Tombol **Restore**; "Expired" = aktif tetapi lewat tanggal |
| L3 | Binding mesin: dua server yang memvalidasi kunci baru bersamaan sama-sama mendapat `valid` | Satu kunci jalan di dua server | Setelah bind dibaca ulang — hanya pemenang yang valid |
| L4 | Halaman Lifetime menautkan image/EXE yang belum dibuild | Klik → halaman 404 teks polos | Hanya file yang ada di R2; lainnya "sedang disiapkan" |

### 20c. Akses & sesi
| # | Temuan | Dampak | Perbaikan |
|---|---|---|---|
| A1 | Ganti/reset password tidak mengakhiri sesi lain (token 7 hari) | Penyerang yang mencuri sesi tetap masuk setelah korban mereset password | `users.sessions_valid_after` (migrasi 0058): sesi lama ditolak seketika di rute sensitif (checkout, lisensi, Lifetime, admin) dan ≤ 1 jam di rute lain |
| A2 | Tautan reset dipakai 2× bersamaan → keduanya berhasil | Token tidak benar-benar sekali pakai | Klaim token atomik |
| A3 | Hak admin di-cache 1 jam dalam token | Admin yang diturunkan/di-suspend tetap admin hingga 1 jam | Setiap request admin membaca ulang akun |

Diperiksa dan **sudah benar**: ke-15 rute admin memakai `requireAdmin`; data member (perkara Legal, order, invoice,
file, riwayat, Lifetime) terisolasi per akun; tanda tangan kelima webhook diverifikasi; harga selalu dari server;
batas perangkat Lifetime atomik; transaksi kripto tidak bisa melunasi dua order.

### 20d. Crawl browser
0 error JavaScript, 0 respons 5xx, 0 halaman error di 104 tampilan (satu-satunya pesan konsol: prefetch `/app` dari halaman 404 yang diarahkan lintas host — hanya terjadi lokal karena 127.0.0.1 ≠ localhost); 357 tautan internal: tidak ada yang rusak selain
unduhan build yang memang belum ada di lingkungan lokal (installer: pesan "sedang disiapkan"; Lifetime: diperbaiki L4).
Satu overflow di HP (Admin → Payments, P7).

### 20e. Status
| Item | Status | Bukti |
|---|---|---|
| P1–P8 | ✅ | `tests/e2e/security.e2e.ts` (refund final, gateway cocok, Stripe bertanda tangan asli sekali aktif, MRR) |
| L1–L4 | ✅ | idem (admin lock vs member & perpanjangan, race binding, file Lifetime yang ditautkan bisa diunduh) |
| A1–A3 | ✅ | idem (ganti password mengeluarkan perangkat lain, reset race, admin diturunkan langsung 403) + isolasi data antar-member |

Sisa (dicatat, bukan bug): tombol "keluar dari semua perangkat" tanpa ganti password; di rute non-sensitif sesi lama
masih bisa bertahan hingga 1 jam setelah ganti password (cache hak akses di token, disengaja agar D1 hemat).

---

## 21. Aplikasi self-hosted siap produksi — Docker, Windows (AXTO Setup), Linux x86-64 & ARM64 (30 Sep 2026)

Cara cek: log CI GitHub branch ini, kode installer (Go) + route portal yang dipakainya, 15 Dockerfile + compose,
lalu uji nyata di Docker: installer asli memasang engine Vault asli (image dibangun dari kode terbaru).

### 21a. Temuan & perbaikan
| # | Temuan | Dampak | Perbaikan |
|---|---|---|---|
| D1 | CI **E2E merah**: setiap file tes login admin; batas 10 login/15 menit per e-mail, di runner GitHub suite selesai ±3 menit → 429 | 5 tes gagal di CI (lokal lolos karena lebih lambat) | Satu sesi admin bersama (`tests/e2e/admin-session.ts`) |
| D2 | CI **AXTO Setup (Windows) merah**: `doctor` keluar kode 1 dan PowerShell menganggap step gagal | Installer tidak pernah terbit dari `main` | Step memeriksa laporan `doctor`, lalu `LASTEXITCODE` di-reset |
| D3 | Installer menolak mesin yang hanya punya `docker-compose` (v2 standalone) | Instal gagal di server Linux lama | Fallback otomatis ke `docker-compose` v2 |
| D4 | Docker Desktop di mode **Windows containers** tidak dikenali | Image Linux gagal dimuat dengan error membingungkan | `doctor`/wizard: "Switch to Linux containers…" dengan langkahnya |
| D5 | Semua image hanya **amd64**, padahal AXTO Setup ditawarkan untuk Linux ARM64 & macOS Apple Silicon | Di server ARM: *exec format error* | Build **linux/arm64** untuk setiap image (kecuali GPU worker NVIDIA yang tetap amd64); portal & installer memilih `<image>-arm64` sesuai arsitektur engine Docker; unduhan manual ARM64 di portal; smoke test ARM64 (QEMU) mingguan/manual; semua dependensi punya wheel ARM64 |
| D6 | **Pemegang Lifetime tidak bisa memakai AXTO Setup** (installer hanya menerima kunci langganan) | Janji "installer Windows untuk Lifetime" tidak terpenuhi | Kunci installer `LIFE-…` per lisensi (migrasi 0059) di `/app/lifetime`; installer mengunduh image, memasang, membaca machine ID, meminta file aktivasi bertanda tangan ke portal (1 slot perangkat), memasangnya, restart → aplikasi jalan offline; Suite: installer menanyakan aplikasi; update memakai slot yang sama |
| D7 | Tautan "EXE per aplikasi" (sisa PyInstaller v2) di portal; build-nya hanya ada di workflow manual lama untuk 3 produk | Tautan mati / biner tak terawat | Windows = **AXTO Setup.exe** (satu installer, diuji di runner Windows asli); tautan per-app dihapus; `build-release.yml` dicatat sebagai *legacy* |
| D8 | Versi installer `3.0.0` | Tidak konsisten dengan platform 3.2.1 | 3.2.1 |

### 21b. Bukti
- E2E installer (`tests/e2e/installer.e2e.ts`) dengan **engine Vault asli**: kunci langganan (instal, kelola, update, cabut, uninstall) **dan** kunci Lifetime Suite (pilih aplikasi, arm64 → `vault-core-arm64`, instal, aktivasi otomatis, `/health` `valid:true` dari file bertanda tangan, update tanpa slot baru, mesin lain ditolak 409).
- Go: `IsLifetimeKey`, pemetaan arsitektur, config Lifetime tanpa kunci; TS: bentuk kunci `LIFE-`, nama file per arsitektur.
- CI GitHub sebelumnya: Docker smoke test 15 image ✅, Deploy Preview ✅.

### 21c. Sisa (dicatat, bukan bug)
- Container masih berjalan sebagai root (kecuali Legal). Beralih ke user non-root perlu migrasi izin volume yang sudah ada — rencanakan dengan langkah `chown` satu kali di entrypoint.
- Installer (wizard) berbahasa EN/ID; portal 10 bahasa.
- `build-release.yml` + `build-scripts/` (EXE PyInstaller per klien, tipe lisensi *trial*) bertentangan dengan kebijakan v3 — hapus bila tidak dipakai lagi (keputusan pemilik).

---

## 22. Admin → Payments: Live & Sandbox terpisah, CRUD penuh, tanpa ambigu (30 Sep 2026)

**Masalah sebelumnya:** satu set kunci per gateway + checkbox "Test mode" (awalnya tidak berfungsi), ditambah field
bebas-teks yang ambigu (`Mode (live / sandbox)` di PayPal, `Production (true / false)` di Midtrans). Secret tidak bisa
dihapus, tidak ada uji koneksi, transaksi uji bercampur dengan pendapatan, dan pembayaran sandbox bisa melunasi order live.

**Desain baru (satu aturan untuk semua metode):**
| Konsep | Arti | Di mana |
|---|---|---|
| **Live keys** | Kunci produksi — uang sungguhan | Tab *Live keys* |
| **Sandbox keys** | Kunci lingkungan uji penyedia — tanpa uang | Tab *Sandbox keys* |
| **Keys checkout uses** | Pilihan Live ⇄ Sandbox (hanya bila set itu lengkap) | Sakelar di kartu metode |
| **Offer at checkout** | Metode tampil/tidak di checkout | Sakelar di kartu metode |
| Transfer bank & wallet kripto langsung | Rekening/alamat nyata — **hanya Live** (tidak ada sandbox) | Satu formulir |

- **CRUD per lingkungan:** simpan (secret tersimpan tampil tersamar •••• + 4 karakter terakhir; kosong/tersamar = tetap),
  hapus satu secret (*remove/undo*), hapus seluruh set (*Delete … credentials*; bila sedang dipakai checkout, metode dimatikan),
  **Test connection** (panggilan aman ke penyedia: Stripe balance, PayPal OAuth, Xendit balance, Midtrans status, NOWPayments
  coins; bank/kripto: validasi kelengkapan & format alamat). Semua perubahan tercatat di audit log (siapa, kapan).
- **Validasi awalan kunci**: `sk_live_`/`sk_test_` (Stripe), `xnd_production_`/`xnd_development_` (Xendit),
  `Mid-server-`/`SB-Mid-server-` (Midtrans) — kunci live di tab Sandbox (atau sebaliknya) ditolak dengan pesan jelas.
- **Ringkasan** di atas halaman: status checkout (Off / Live / Sandbox·TEST / "On — missing keys"), isi Live/Sandbox,
  perubahan terakhir; **banner kuning** selama ada metode di Sandbox.
- **Panduan setup** per metode: tempat mengambil kunci, URL webhook (sama untuk kedua lingkungan; masing-masing diverifikasi
  dengan secret-nya sendiri), event yang harus diaktifkan.

**Aturan uang:**
1. Order menyimpan lingkungannya (`orders.meta.env`). Webhook diverifikasi dengan secret **Live dan Sandbox**; lingkungan yang
   lolos **harus sama** dengan order → pembayaran uji tidak pernah melunasi order live (`env_mismatch`), dan sebaliknya.
2. PayPal-return meng-capture dengan kredensial lingkungan order.
3. Order sandbox bertanda **TEST** di Admin (Overview, Orders) dan **tidak dihitung** di pendapatan, MRR, grafik bulanan.
4. Checkout menampilkan **TEST MODE — tidak ada uang sungguhan** (10 bahasa) untuk metode yang berjalan di Sandbox.

**Migrasi otomatis** pengaturan lama: kunci `sk_test_`/`xnd_development_`/`SB-Mid-…`, PayPal `mode=sandbox`,
Midtrans `is_production≠true` atau flag test → Sandbox; selain itu → Live. Field `mode`/`is_production` dihapus.

**Bukti:** `tests/payments.test.ts` (migrasi, validasi awalan, lingkungan order) · `tests/e2e/payments-admin.e2e.ts`
(baca, simpan per lingkungan, tolak kunci salah tempat, tersamar, hapus field, sakelar & mode, uji koneksi, pembayaran
sandbox ditolak untuk order live, order sandbox lunas tapi bukan pendapatan, hapus set yang dipakai → metode mati, audit log).

