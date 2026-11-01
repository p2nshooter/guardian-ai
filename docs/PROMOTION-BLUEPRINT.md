# Mesin promosi otomatis ke member — blueprint (REQUESTS 138, 139)

> Pemilik, 1 Nov 2026 (ringkas, kutipan penuh di `REQUESTS.md` 138):
> - "seluruh aplikasi yg sudah di kembangkan wajib d promosikan tp real yg sudah berfungsi 100%, promosikan baik dengan
>   SS maupun animasi2 indah, profesional dan menarik serta ajakan menggunakan aplikasi dengan smart license trial";
> - "auto post promosi ke member2 yg sudah mendaftar agar mau lanjut uji free trial license, tiap minggu … bahasa
>   Inggris";
> - "Setiap client baru berarti mendapatkan promosi dari tahapan awal, termasuk promosi lelang license";
> - "member juga berhak menjadi affiliate atau menjadi reseller atau … white label. Promosikan ini, auto post di portal
>   membernya dan gmail saat pendaftaranya";
> - "Seluruh auto post pastikan bisa di lihat di portal admin, dan ada history pengiriman post ke member mana dan
>   statusnya";
> - "Bikin 100-200 promosi dari A-Z axto.io";
> - "jika suatu hari text … sudah tidak relevan, pisahkan dan matikan agar tidak terposting";
> - "Saya serahkan seluruh logikanya kepada Anda dan pastikan sangat menguntungkan axto.io".
>
> Dan (REQUESTS 139): "Seluruh penawaran di seluruh situs ke hello@axto.io atau kasih link whatsapp ke +6285691234561".

Status: **dicatat, belum dibangun.** Urutan: `WORK-QUEUE.md` baris 4. Kontak penawaran (§9) dikerjakan di sela waktu
menunggu CI (`WORK-QUEUE.md` W1).

## 1. Prinsip

1. **Hanya yang nyata.** Sebuah aplikasi atau fitur hanya boleh dipromosikan bila e2e-nya hijau di deploy terakhir. CI
   menulis daftar `promo_eligible` ke R2 setelah e2e lulus; promosi yang menunjuk fitur di luar daftar itu tidak
   terkirim.
2. **Bukti visual asli.** Tangkapan layar dan animasi direkam dari aplikasi yang sedang tayang oleh perekam panduan
   (Playwright), bukan gambar karangan.
3. **Bahasa Inggris** yang hangat, jelas, dan profesional. Satu ide per pesan. Setiap pesan berakhir dengan satu ajakan:
   **mulai uji coba Smart License** dengan satu klik.
4. **Satu promosi per minggu per member** (ditambah sambutan saat mendaftar). Email transaksional (pembayaran, lisensi)
   tidak dihitung dan tidak pernah tertunda karena promosi.
5. **Setiap member baru mulai dari tahap 1**, lalu jalurnya menyesuaikan status: member saja, uji coba aktif,
   pelanggan, afiliasi, reseller, white label.
6. **Tidak pernah usang.**
   - Harga, nama paket, tanggal lelang dan angka program ditulis sebagai variabel yang dibaca dari Admin saat kirim,
     bukan angka mati.
   - Promosi yang kedaluwarsa atau yang syaratnya tidak terpenuhi otomatis **dipisah dan dimatikan** (§6).
7. **Jujur dan legal.**
   - Tanpa testimoni karangan.
   - Satu klik berhenti berlangganan di setiap email dan header `List-Unsubscribe`.
   - Preferensi bisa diubah di portal.
   - Email yang memantul atau dilaporkan spam langsung masuk daftar tekan.

## 2. Saluran

| Saluran | Isi | Kapan |
|---|---|---|
| **Portal member** → kotak "Updates" | kartu dengan gambar/animasi, teks, tombol ajakan; belum dibaca diberi titik | setiap pengiriman; tetap tersimpan 90 hari |
| **Email** ke alamat pendaftaran (Gmail atau lainnya) | versi email kartu yang sama: gambar statis atau GIF ringan, tombol ke halaman promosi | sambutan saat mendaftar, lalu mingguan |
| Halaman promosi publik `/promo/<slug>` | animasi penuh, tangkapan layar, ajakan uji coba | tujuan tombol; bisa dibagikan |

## 3. Status member (dicatat pada setiap pengiriman)

`member` (daftar saja) · `trial` (uji coba aktif, aplikasi apa) · `customer` (paket berbayar / lisensi) ·
`affiliate` · `reseller` · `white_label`. Satu member bisa punya beberapa peran sekaligus; pengiriman menyimpan semua
peran saat itu.

## 4. Perjalanan promosi (tahapan setiap member)

### 4.1 Jalur utama mingguan (semua member baru)

| Tahap | Kapan | Tema | Ajakan |
|---|---|---|---|
| 1 | saat mendaftar (portal + email) | **Welcome to AXTO** — your AI, your keys, your data | Start your free Smart License trial |
| 2 | minggu 1 | **Clipper**: one long video, a week of shorts | Try Clipper free |
| 3 | minggu 2 | **Privacy Vault**: ask AI without leaking a single secret | Try Vault free |
| 4 | minggu 3 | **Legal AI**: answers that cite the actual article | Try Legal AI free |
| 5 | minggu 4 | **Self-hosted in one click**: Windows or Linux, offline-ready | Get a trial licence |
| 6 | minggu 5 | **Studio**: every top model in one window, your own keys | Open Studio |
| 7 | minggu 6 | **Earn with AXTO — become an affiliate** | Join the affiliate programme |
| 8 | minggu 7 | **Security family**: Guardian, Antivirus, SOC, Sentinel | Try Guardian free |
| 9 | minggu 8 | **Licence auction**: win AXTO licences below list price (setiap 2 minggu) | See this auction |
| 10 | minggu 9 | **Lifetime licence**: pay once, updates included | See lifetime prices |
| 11 | minggu 10 | **Orchestra AI + GPU**: run AI on your own GPUs | Try Orchestra free |
| 12 | minggu 11 | **Resell AXTO — wholesale prices, your clients** (menyala saat portal reseller P4 tayang) | Become a reseller |
| 13 | minggu 12 | **Your own AI brand — white label** (menyala saat portal white label P5 tayang) | Apply for white label |
| 14+ | setiap minggu | **rotasi perpustakaan** A–Z (§5): yang belum pernah dikirim, cocok dengan status, prioritas tertinggi dulu | sesuai pesan |

Tahap yang aplikasinya belum `promo_eligible`, atau programnya disembunyikan di Admin → Programs, **dilewati**, dan
tahap berikutnya dikirim. Tidak ada minggu kosong selama perpustakaan masih punya pesan yang layak.

### 4.2 Jalur yang dipicu kejadian (di luar jatah mingguan, tetap maksimal satu per hari)

- **Uji coba dimulai:** tips hari ke-1 dan ke-3 untuk aplikasi itu.
- **Uji coba hampir habis (sisa 3 hari):** penawaran paket tahunan atau lifetime.
- **Uji coba habis tanpa membeli:** sekali tawaran perpanjang 7 hari dengan menjawab 3 pertanyaan masukan.
- **Pelanggan baru:**
  - hari ke-7: ajakan afiliasi ("you already love it — earn by sharing it");
  - hari ke-30: aplikasi pelengkap.
- **Afiliasi:**
  - setelah 3 rujukan berhasil, atau setelah 60 hari: ajakan reseller;
  - reseller dengan 20 lisensi atau lebih: ajakan white label.
- **Lelang baru dibuka:** satu pengumuman ke semua yang belum menolak promosi lelang.

### 4.3 Aturan berhenti dan jeda

- Berhenti berlangganan email: portal tetap menerima kartu, email berhenti.
- Member menekan "Not interested" pada sebuah aplikasi: semua pesan aplikasi itu dilewati.
- Member yang sudah memakai sebuah aplikasi tidak menerima ajakan mencoba aplikasi itu lagi; ia menerima tips aplikasi
  itu.
- Saklar "Pause all promotions" di Admin menghentikan semuanya seketika.

## 5. Perpustakaan 100–200 promosi A–Z

- **Disimpan di kode:** `dashboard/lib/promotions/library.ts`, berversi seperti perpustakaan LinkedIn
  (`lib/linkedin/library.ts`).
- **Perubahan dari Admin** disimpan di R2 sebagai override: aktif/mati, teks yang diedit, tanggal kedaluwarsa, alasan
  pensiun.
- **Kolom setiap promosi:**
  - `id`, `slug`, `title`, `preheader`, `body` (markdown pendek);
  - `cta { label, href }`, dengan tautan uji coba satu klik dan UTM;
  - `media { screenshot, animation }`, berupa kunci R2 dari perekam panduan;
  - `app` (atau `program`/`auction`/`pricing`);
  - `audience { roles, excludeRoles, stage }`;
  - `requires` (fitur/aplikasi yang harus `promo_eligible`, program yang harus tampil, lelang yang harus aktif);
  - `variables` (harga, paket, tanggal dari Admin);
  - `validFrom`, `validUntil`, `priority`, `reviewedAt`, `status` (`active` | `retired` | `needs_review`),
    `retiredReason`.
- **Daftar topik A–Z** (setiap huruf 4–8 pesan, sehingga total 100–200):
  A AI Studio, Affiliate, Auction, Antivirus · B BYOK, Brand kit · C Clipper, Compliance, Credential vault ·
  D Docker in one click, Desktop apps · E Edge AI, Encryption · F Free Smart License trial, Face-tracking reframe ·
  G Guardian, GPU worker · H Hybrid Studio, Hook titles · I Install on Windows & Linux, Invoices · J Job queue ·
  K Keys stay yours · L Legal AI, Lifetime licence, Local mode · M Multi-model chat, Managed white label ·
  N Non-custodial, No vendor lock-in · O Orchestra, Offline installer · P Privacy Vault, Prompt Library, Partners ·
  Q Quality scoring · R Reseller, Redaction, Repurposing · S SOC, Sentinel, Smart License, Studio ·
  T Teams, Transcript editing · U Updates included · V Virality score, Vault · W White label, Windows ·
  X xaa.es marketplace · Y Your data stays yours · Z Zero-touch delivery.
- **Contoh nada** (ditulis lengkap saat PR3):
  > **Subject:** Your next week of shorts is hiding in one video
  > One podcast. Twenty clips that stop the scroll — ranked by a virality score, reframed around the speaker, captioned
  > word by word. Clipper does it on your own device, with your own AI keys. Start your free Smart License trial and
  > have your first clips before your coffee cools.
  > **[Try Clipper free →]**

## 6. Usang → dipisah dan dimatikan

Setiap kali kirim, pemilihan menjalankan pemeriksaan ini. Hasilnya juga dilaporkan setiap hari ke Admin → Promotions →
"Retired" atau "Needs review".

1. `validUntil` lewat → `retired` (alasan: expired).
2. Aplikasi/fitur dalam `requires` tidak lagi `promo_eligible` (e2e merah, aplikasi disembunyikan) → ditahan (tidak
   terkirim) dan muncul di "Needs review".
3. Program (afiliasi/reseller/white label) disembunyikan di Admin → Programs, atau lelang tidak aktif → ditahan.
4. Variabel tidak bisa diisi (paket dihapus, harga kosong) → ditahan.
5. `reviewedAt` lebih dari 180 hari → `needs_review`. Tetap terkirim, tetapi Admin diingatkan untuk meninjau.
6. Admin menekan **Retire** → `retired` dengan alasan; bisa **Restore** setelah diedit.

Pesan `retired` tidak pernah terkirim dan tetap terlihat terpisah di Admin (dengan riwayat pengirimannya).

## 7. Mesin pengiriman

- **Jadwal:** cron harian (Cloudflare) jam 14:00 UTC, mengirim bertahap per 500 member.
  - Member jatuh tempo bila `lastPromoAt` + 7 hari ≤ sekarang, atau ada kejadian jalur 4.2.
  - Sambutan tahap 1 dikirim langsung saat pendaftaran (tidak menunggu cron).
- **Urutan pemilihan:**
  1. kejadian jalur 4.2;
  2. tahap jalur utama berikutnya yang layak;
  3. rotasi perpustakaan.
  Rotasi: belum pernah dikirim, cocok peran, prioritas tertinggi, lalu CTR tertinggi.
- **Tidak pernah ganda:** id pengiriman = `sha256(memberId|promoId)`, ditulis sekali (create-once `If-None-Match: *`).
  Kirim ulang karena error memakai id yang sama.
- **Penyimpanan, R2 saja** (`R2-DATA-BLUEPRINT.md` §3):
  - keadaan perjalanan per member: `promo/members/<memberId>.json`, diperbarui dengan compare-and-swap;
  - log pengiriman append-only: `promo/deliveries/<yyyy>/<mm>/<dd>/<deliveryId>.json`;
  - indeks per member dan per promosi dengan `customMetadata` (status, saluran, peran);
  - rekap harian: `promo/stats/<date>.json`.
  - Tidak ada hot key; cadangan harian 35 hari.
- **Status pengiriman:** `queued` → `sent` → `delivered` / `opened` / `clicked` / `bounced` / `complained` / `failed` /
  `suppressed` / `skipped(alasan)`.
  - Webhook Resend memperbarui `delivered`, `opened`, `bounced` dan `complained`.
  - `clicked` dan `trial_started` dicatat dari tautan satu klik.
- **Email:** lewat `lib/mail.ts` (Resend). Dari "AXTO <hello@axto.io>"; balasan ke hello@axto.io; header
  `List-Unsubscribe` + `List-Unsubscribe-Post`; batas laju pengirim dihormati.

## 8. Admin → Promotions

- **Library:** daftar aktif / needs review / retired.
  - Pratinjau kartu portal dan email.
  - Edit teks (override), kedaluwarsa, Retire/Restore, kirim uji ke admin.
- **Journey:** tabel tahap jalur utama (urutan, tema, promosi terpilih, syarat) dan aturan jalur kejadian.
- **History:** setiap pengiriman, dengan kolom:
  - member (email, ditampilkan lengkap untuk admin);
  - peran saat kirim (member / trial / customer / affiliate / reseller / white label);
  - promosi, saluran, status, waktu.
  - Filter per kolom, ekspor CSV.
- **Metrics per promosi:** terkirim, sampai, dibuka, diklik, uji coba dimulai, pembelian dan pendapatan terhubung (dari
  tautan uji coba), afiliasi/reseller/white label yang mendaftar.
- **Kontrol:**
  - "Pause all promotions";
  - jam kirim;
  - batas per hari;
  - uji A/B judul: dua varian, pemenang otomatis setelah 500 kiriman per varian.
- Semua aksi admin masuk log audit.

## 9. Kontak penawaran di semua situs (REQUESTS 139)

Semua penawaran pembelian situs, lelang, dan investor di **ulyah.com, 1fr.fr, tilawa.de, dawa.im, xad.es, xaa.es dan
axto.io**:
- menuju **hello@axto.io** (email tujuan notifikasi penawaran dan alamat yang tertulis di halaman);
- dan tombol **WhatsApp** `https://wa.me/6285691234561` dengan pesan pembuka terisi.

Rinciannya per situs:
- **ulyah.com dan 4 situs saudaranya** (repo ulyah.com):
  - bawaan `SALE_DEFAULTS.email` menjadi `hello@axto.io` (web dan worker);
  - nilai lama `salam@ulyah.com` yang tersimpan di R2 dibaca sebagai `hello@axto.io` (pemindahan sekali tanpa
    menimpa alamat lain yang sengaja diatur admin);
  - notifikasi penawaran baru otomatis ke hello@axto.io.
- **xaa.es** (repo xaa): teks "write to hello@xaa.es" pada penjualan dan investor diganti hello@axto.io; tombol WhatsApp
  sudah memakai nomor ini.
- **axto.io:** sudah hello@axto.io; tombol WhatsApp dipastikan ada di halaman lelang, akuisisi, dan investor.

## 10. Tautan uji coba Smart License satu klik

- **Bentuk:** `https://axto.io/t/<token>`, dengan token HMAC berisi member, aplikasi, promosi dan kedaluwarsa 14 hari.
  Bisa dipakai sekali per member per aplikasi (create-once).
- **Isi uji coba:**
  - aplikasi cloud: uji coba paket di akun itu;
  - aplikasi self-hosted: lisensi uji coba dari program 100 lisensi per aplikasi, lewat Otoritas Lisensi.
- **Belum masuk:** login dulu, lalu otomatis lanjut. **Sudah pernah uji coba:** diarahkan ke penawaran tahunan/lifetime.

## 11. Mengapa ini sangat menguntungkan

- Biaya kirim email ≈ US$0,001 per email; portal gratis. Satu konversi Pro (US$49/bulan) menutup sekitar 49.000 email.
- **Tangga pendapatan:** uji coba → paket → tahunan/lifetime (uang di depan) → afiliasi (pelanggan membawa pelanggan) →
  reseller (membeli kredit prabayar) → white label (biaya tahunan + kredit grosir). Semuanya dibayar dulu.
- **Promosi diatur metrik:** pesan dengan CTR dan konversi rendah turun prioritasnya otomatis; pemenang A/B dipakai
  untuk semua.

## 12. Fase (satu PR per fase)

| Fase | Isi | Selesai bila |
|---|---|---|
| PR1 | Model data R2 (perjalanan, pengiriman, indeks, rekap), perpustakaan awal 30 pesan + validator usang, Admin → Promotions (Library + History) | tes unit pemilihan dan usang; tes konkurensi create-once; Admin di peramban nyata |
| PR2 | Mesin: sambutan saat mendaftar, cron mingguan, jalur kejadian, kotak Updates di portal, email Resend + unsubscribe + webhook | e2e: member baru → tahap 1 di portal dan email; minggu berikut tahap 2; unsubscribe menghentikan email |
| PR3 | Media nyata: perekam panduan mengambil tangkapan layar dan animasi aplikasi `promo_eligible`; halaman `/promo/<slug>`; perpustakaan dilengkapi sampai 100–200 pesan A–Z | setiap promosi aktif punya media asli; tes "setiap klaim punya fitur" |
| PR4 | Tautan uji coba satu klik, metrik dan atribusi pendapatan, A/B judul, ekspor CSV | e2e klik → uji coba dimulai → tercatat di History dan Metrics |
