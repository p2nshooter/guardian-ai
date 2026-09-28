# AXTO v3 — Blueprint Rombak Total

> Status: **disetujui untuk dikerjakan** (rombak total, bertahap).
> Branch kerja: `claude/app-consistency-paid-model-5hjkqo`.
> Deploy produksi terjadi otomatis saat branch ini di-merge ke `main`
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
| 1 | Fondasi: paket, migrasi D1 v3, auth, checkout & 5 webhook, BYOX vs Managed (terkunci), lisensi berbayar (server + 13 engine) | ⏳ |
| 2 | Design system + Portal Member + Portal Admin + halaman publik inti (beranda, harga, legal) — diuji E2E | ⏳ |
| 2b | Self-hosted: Lifetime offline (harga, checkout, file aktivasi, dukungan offline di 13 engine), EXE Windows, panduan instalasi | ⏳ |
| 3 | Aplikasi 1: **Legal AI** (paling sering dipakai) | ⏳ |
| 4 | Aplikasi 2: **Prompt Library** (konten + enkripsi + R2) | ⏳ |
| 5 | Aplikasi 3: **AI Studio** | ⏳ |
| 6 | Aplikasi 4: **Clipper** | ⏳ |
| 7 | Aplikasi 5–7: Privacy Vault, Compliance Center, Security Analyst | ⏳ |
| 8 | SEO lengkap + blog + sitemap + optimasi R2/D1 + pembersihan tabel lama (opsional) | ⏳ |

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
