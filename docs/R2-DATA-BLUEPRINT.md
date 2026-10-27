# Blueprint data R2 — axto.io

Ditulis 20 Okt 2026 atas perintah pemilik (`docs/REQUESTS.md` baris 79–80). Bagian 1–6 sama dengan blueprint
xaa.es (repo xaa, `docs/R2-DATA-BLUEPRINT.md`); bagian 7–9 khusus axto.io.

## 1. Perintah pemilik

> „Database semuanya ke R2 ya, jgn ada yg ke d1... Manfaatin R2, penuhin disana, baik xaa.es maupun axto.io.. Hemat
> D1 maximalin R2, sy siap bayar 100-1000GB buat xaa.es & axto.io" — 20 Okt 2026

> „Blue print setiap logika di axto & xaa wajib kuat, kumplit, komplex mudah di gunakan, termasuk animasi panduan untuk
> customer, jika bluprint sudah sangat kuat dan sudah 100% siap produksi bukan sampah langsung kerjakan dengan live
> payment, jgn ada sampah app" — 20 Okt 2026

> „Catat ya baik di axto.io maupun di xaa.es, ulyah.com  xad.es 1fr.fr tilawa.de dan semua yg membutuhkan penyimpanan,
> wajib ke R2, jgn pernah ke D1" — 20 Okt 2026 (aturan tetap; `CLAUDE.md` §6; cakupan per situs di bagian 10)

Artinya: **tidak ada lagi data aplikasi di D1**, di situs mana pun. Semua data (akun, pesanan, pembayaran, lisensi, pengaturan, log,
dukungan, investor) dan semua file disimpan di **R2**. Kualitasnya tidak boleh turun: tidak boleh ada email terdaftar
dua kali, pembayaran terkonfirmasi dua kali, atau lisensi terbit dua kali.

## 2. Fakta yang mendasari (diperiksa 20 Okt 2026)

| Hal | Fakta |
|---|---|
| Masalah lama | Kuota baca D1 harian (paket gratis, **dibagi semua database dalam satu akun**) pernah habis dan mematikan login xaa.es. Di akun yang sama ada `ulyah-db` (484 MB) — pemakai kuota terbesar. Dengan pindah ke R2, xaa.es dan axto.io tidak lagi ikut mati bila kuota D1 habis |
| Ukuran data sekarang | xaa.es `xaa-portal` 266 KB; axto.io `axto-db` (akun Cloudflare axto.io sendiri) ±1 MB. Data akun & transaksi berukuran MB, bukan GB |
| R2 | Aktif. Bucket yang ada: `xaa-uploads`, `axto-assets`, `axto-build`, … (akun xaa/ulyah); axto.io memakai `axto-storage`, `axto-documents`, `axto-builds` di akunnya sendiri |
| Jaminan R2 (dokumentasi Cloudflare, „Consistency model", diperbarui 14 Okt 2026) | **Konsisten kuat secara global** untuk baca-setelah-tulis, metadata, hapus, **dan list**. Tulis bersyarat (`If-None-Match: *`, `If-Match: <etag>`) **dievaluasi atomik** saat commit: dari dua tulis yang bersaing, paling banyak satu yang berhasil (412 untuk yang lain) |
| Harga R2 (Standard) | Simpan $0,015/GB-bulan · Kelas A (tulis/list) $4,50 per juta · Kelas B (baca) $0,36 per juta · egress gratis · gratis per bulan: 10 GB, 1 juta Kelas A, 10 juta Kelas B |

Dengan jaminan di atas, R2 bisa dipakai sebagai database dokumen yang **benar** (tanpa data dobel atau saling timpa),
asalkan setiap tulisan mengikuti aturan di bagian 3. Anggaran 100–1000 GB pemilik terpakai terutama untuk **file**
(unggahan klien, bundle template, build Docker/EXE, video & animasi panduan, backup harian), bukan untuk data akun.

## 3. Desain penyimpanan: „R2 Store"

Satu pustaka kecil yang sama di kedua repo (`r2store`), dengan tes yang sama.

### 3.1 Bucket

| Situs | Bucket data (privat) | Bucket file (sudah ada / tetap) | Bucket backup (privat) |
|---|---|---|---|
| xaa.es | `xaa-data` | `xaa-uploads` | `xaa-backups` (aturan siklus hidup 35 hari) |
| axto.io | `axto-data` | `axto-storage`, `axto-documents`, `axto-builds` | `axto-backups` (35 hari) |

Bucket dibuat otomatis oleh CI sebelum deploy (xaa: `scripts/ensure-cloudflare-resources.sh`; axto: langkah
`wrangler r2 bucket create … || true` di workflow deploy). Tidak ada akses publik pada bucket data dan backup.

### 3.2 Bentuk kunci

```
c/<koleksi>/<id>.json                       satu dokumen = satu objek JSON (sumber kebenaran)
u/<koleksi>/<field>/<sha256(nilai)>         penjaga keunikan (isi: id dokumen) — dibuat dengan If-None-Match: *
i/<koleksi>/<index>/<nilai>/<urut>_<id>     entri index (badan kosong; customMetadata = ringkasan untuk daftar)
n/<nama>                                    penghitung / ringkasan (diperbarui dengan If-Match)
l/<koleksi>/<yyyy>/<mm>/<dd>/<urut>_<id>    log append-only (audit, event) — tulis sekali, tidak pernah diubah
k/<kunci>                                   pengaturan (satu objek per kunci; nilai rahasia terenkripsi AES-GCM)
```

- **ID** dibuat urut waktu (ULID: 48 bit milidetik + 80 bit acak, base32 Crockford) sehingga `list()` yang menurut
  urutan leksikografis sekaligus urut waktu. Untuk urutan terbaru-dulu, `<urut>` = `(9999999999999 − ms)` dengan lebar
  tetap.
- Nilai dalam kunci index dinormalisasi (huruf kecil, di-encode URI) dan dipotong; nilai bebas/panjang di-hash.
- `customMetadata` (maks. 8.192 byte per objek, batas resmi R2) menyimpan kolom yang ditampilkan di daftar, sehingga
  halaman daftar cukup memanggil `list({ prefix, include: ['customMetadata'] })` — **satu operasi untuk sampai 1000
  baris**, tanpa membaca dokumen satu per satu.

### 3.3 Operasi dan aturan tulis

| Operasi | Cara di R2 | Jaminan |
|---|---|---|
| Baca | `get(c/…)` → JSON + etag | selalu data terbaru (konsisten kuat) |
| Buat | `put(c/…, { onlyIf: If-None-Match: * })` | tidak pernah menimpa dokumen yang ada |
| Ubah | baca etag → ubah di memori → `put(…, { onlyIf: { etagMatches } })`; bila `null` (412): baca ulang dan ulangi, maks. 6 kali dengan jeda acak | tidak ada perubahan yang hilang karena dua permintaan bersamaan |
| Unik (email, nomor faktur, kode, order PayPal) | `put(u/…, id, If-None-Match: *)` **sebelum** dokumen dibuat; bila 412 → „sudah dipakai" | dua pendaftaran bersamaan dengan email yang sama: tepat satu berhasil |
| Hapus | hapus entri index → dokumen → penjaga keunikan | — |
| Daftar & filter | `list` pada prefix index (+ `cursor` untuk halaman berikutnya) | konsisten kuat |
| Hitung / jumlah | jumlah kecil (lencana admin, status) = menghitung entri index lewat `list`; angka yang sering bertambah (kunjungan, pemakaian AI, kuota) = **satu objek event per kejadian** dengan kunci unik, dijumlahkan ke `n/…` oleh cron lalu event lama dihapus | tidak pernah ada „kunci panas" (lihat batas di bawah) |

**Urutan tulis untuk satu perubahan yang menyentuh beberapa objek:** penjaga keunikan → dokumen utama → entri index →
ringkasan. Dokumen utama selalu yang menentukan kebenaran:
- pembaca yang menemukan entri index tanpa dokumen (atau yang isinya tidak cocok) melewatinya dan menghapusnya
  (perbaikan malas);
- tugas **rekonsiliasi** terjadwal (cron) membangun ulang semua index & ringkasan dari dokumen utama, dan menghapus
  penjaga keunikan yatim yang berumur > 15 menit.

### 3.4 Uang dan lisensi: tidak boleh dobel

- Perubahan status pembayaran/pesanan adalah **transisi bersyarat pada satu dokumen** (`pending → paid` dengan
  If-Match). Webhook PayPal, tombol admin „Pembayaran diterima" dan pengecekan ulang otomatis bisa datang bersamaan —
  hanya satu yang menang; yang lain membaca status terbaru dan berhenti.
- Lisensi, faktur dan email konfirmasi memakai **ID deterministik** dari pesanan (mis. `lic_<orderId>_<produk>`,
  nomor faktur dari penghitung dengan If-Match) dan dibuat dengan If-None-Match: * → menjalankan ulang langkah yang
  sama tidak pernah menerbitkan dua lisensi/faktur.
- Setiap transisi juga menulis entri log audit append-only (`l/audit/…`) yang berantai hash (seperti sekarang).

### 3.5 Kinerja dan biaya

- Halaman publik tidak membaca data per permintaan (katalog, harga, teks = kode). Pengaturan yang sering dibaca (metode
  pembayaran aktif, konfigurasi platform) disimpan di memori isolate maks. 30 detik dan langsung dibuang saat ditulis.
  **Data uang tidak pernah di-cache.**
- Perkiraan biaya bulanan pada trafik 100.000 kunjungan/bulan: ±300 ribu baca (Kelas B) + ±150 ribu tulis/list
  (Kelas A, termasuk satu event per kunjungan untuk penghitung pengunjung) → masih di dalam kuota gratis R2
  (1 juta Kelas A, 10 juta Kelas B). Biaya utama adalah penyimpanan file (100 GB ≈ $1,50/bulan; 1000 GB ≈ $15/bulan).
- Batas resmi R2 yang diperhitungkan: **maks. 1 tulis per detik ke kunci yang sama** — karena itu tidak ada penghitung
  yang ditulis pada setiap permintaan (pakai event + rollup, bagian 3.3), dan pembaruan dokumen yang bentrok diulang
  dengan jeda acak; `list` 1000 kunci per panggilan (pakai cursor) dan dihitung sebagai operasi **Kelas A**;
  `customMetadata` 8.192 byte; kunci 1.024 byte; dokumen dijaga < 256 KB (riwayat panjang dipindah ke log/arsip).

### 3.6 Keamanan

- Bucket data dan backup privat; diakses hanya lewat binding Worker. Tidak ada URL publik, tidak ada token R2 di kode.
- Rahasia (kunci API pembayaran, kunci AI pengguna, rekening) dienkripsi AES-GCM di aplikasi sebelum disimpan
  (kunci dari secret Worker), sama seperti sekarang. Kata sandi: PBKDF2. Token reset/sesi: hanya hash yang disimpan.
- Data pribadi bisa diekspor dan dihapus per akun (hapus = dokumen + index + penjaga keunikan + file milik akun).

### 3.7 Backup dan pemulihan

- Cron harian menulis `backups/<yyyy-mm-dd>/<koleksi>.jsonl.gz` ke bucket backup (aturan siklus hidup 35 hari) +
  `manifest.json` (jumlah dokumen dan SHA-256 tiap file).
- Alat pemulihan (khusus admin) memuat ulang satu koleksi atau semuanya dari tanggal tertentu, lalu menjalankan
  rekonsiliasi. Pemulihan diuji di CI pada data contoh setiap rilis.

### 3.8 Pengujian (wajib lulus sebelum tayang)

1. **R2 palsu di memori** dengan semantik yang sama persis (If-None-Match, If-Match/etag, list urut + cursor +
   customMetadata, batas 2 KB). Tes: 50 tulis bersamaan ke satu dokumen → tidak ada yang hilang; 20 pendaftaran
   bersamaan dengan email sama → tepat 1 berhasil; 10 konfirmasi pembayaran bersamaan → tepat 1 transisi + 1 lisensi.
2. R2 palsu juga menegakkan batas 1 tulis/detik per kunci dan 8 KB metadata, sehingga desain yang melanggarnya gagal
   di tes, bukan di produksi.
3. Tes modul per modul dengan R2 palsu (semua alur yang dulu memakai SQL).
4. E2E di runtime Cloudflare lokal (`wrangler dev`, R2 lokal Miniflare) — alur portal, pembayaran (sandbox),
   admin, dan migrasi.
5. Uji migrasi: salinan data D1 → R2, jumlah & checksum per tabel harus sama.

## 4. Migrasi D1 → R2 (per situs, tanpa kehilangan data atau pembayaran)

1. **Rilis A — kode baru, data lama.** Semua modul memakai R2 Store; rute admin `POST /api/admin/migrate-d1`
   (khusus pemilik, idempoten) membaca setiap tabel D1 dan menulis dokumen + index + penjaga keunikan ke R2 dengan
   ID yang sama. Laporan: jumlah baris D1 vs dokumen R2 per tabel + checksum.
2. **Jendela pindah (± 2 menit).** Spanduk „pemeliharaan singkat" di checkout; tulis ke D1 dihentikan; migrasi
   dijalankan sekali lagi (hanya selisih); laporan harus 100 % cocok; saklar `DATA_BACKEND=r2` aktif. Pembayaran
   yang datang lewat webhook selama jendela ditahan PayPal dan dikirim ulang (PayPal mengulang webhook yang gagal).
3. **Pengamatan 7 hari.** D1 tetap ada tetapi hanya-baca sebagai cadangan; ekspor D1 terakhir disimpan di bucket
   backup.
4. **Rilis B — D1 dilepas.** Binding D1 dihapus dari konfigurasi; kode SQL dihapus; database D1 lama dihapus pemilik
   (atau dibiarkan kosong). Mulai di sini **tidak ada yang ke D1**.

KV (axto.io: batas laju & cache kecil) **bukan D1** dan tetap dipakai untuk batas laju, karena menulis R2 pada setiap
permintaan untuk batas laju justru mahal (Kelas A). Bila pemilik ingin KV juga dipindah, batas laju dipindah ke
penghitung R2 per menit (lihat bagian 3.3).

## 5. Animasi panduan untuk pelanggan

Setiap alur penting punya **klip animasi pendek (WebP, 6–15 detik) + langkah tertulis**, direkam otomatis oleh
Playwright pada runtime lokal dengan data contoh (cara yang sama dengan galeri template Waitlist), dalam bahasa situs:

- ditampilkan di halaman **Panduan** (`/guides`) dengan SEO (HowTo JSON-LD, sitemap);
- tombol **„Lihat panduan"** di tempat alur itu dipakai (checkout, portal, admin) membuka klip dalam dialog;
- bila pengunjung meminta gerak minimal, hanya poster + langkah tertulis yang tampil;
- klip disimpan di R2 (bucket file) dan dibuat ulang setiap kali alurnya berubah (skrip `npm run guides`).

Klip pembayaran direkam pada **mode sandbox di lokal**, tidak pernah dengan uang sungguhan, dan diberi label
„ilustrasi". Daftar klip per situs ada di bagian 7.

## 6. Pembayaran live

Semua metode tetap bisa **Live** dari Admin → Pembayaran (kunci ditempel pemilik, disimpan terenkripsi — tidak pernah
di repo). Setelah migrasi R2, pengaturan pembayaran tersimpan di `k/…` R2 (terenkripsi). Daftar periksa sebelum
tayang: tombol uji per metode hijau, webhook PayPal Live terdaftar otomatis, satu transaksi kecil sungguhan per metode
oleh pemilik, dan alur lisensi/unduhan otomatis berjalan (zero-touch).

## 7. axto.io — peta tabel D1 → koleksi R2

Sumber: `dashboard/cf-migrations/*.sql` (64 migrasi, 85 tabel pernah dibuat) dan semua query di `dashboard/app`,
`dashboard/lib` (dibaca 20 Okt 2026). Hanya **25 tabel** yang masih dipakai oleh kode; sisanya tabel lama (banyak sudah
di-DROP di migrasi) dan **tidak** dipindah sebagai data aktif — isinya diekspor sekali ke `axto-backups/legacy/` sebagai
arsip JSONL.

| Tabel D1 | Dokumen R2 | Penjaga keunikan | Index | Catatan |
|---|---|---|---|---|
| `users` | `c/users/<id>` | `email` | per peran · semua (admin, terbaru) | kata sandi PBKDF2; kunci AI pengguna terenkripsi |
| `orders` | `c/orders/<id>` | `invoice_no` | per pengguna · per status · per status + tanggal bayar (pendapatan & pemodal) | transisi status dengan If-Match (bagian 3.4) |
| `subscriptions` | `c/subscriptions/<id>` | — | per pengguna · per status · jatuh tempo (pengingat) | — |
| `sh_licenses` | `c/sh_licenses/<id>` | `license_key` · `user + product` | per pengguna · per status | detak (`last_seen_at`, IP, versi) disimpan terpisah di `c/sh_seen/<id>` dan ditulis paling sering sekali per jam per mesin, agar detak tidak bentrok dengan perubahan admin |
| `sh_trials` | `c/sh_trials/<code>` (kode = kunci utama, seperti sekarang) | (ID) | per status · per produk + status · per pengguna + produk | program 100 trial per aplikasi; penghitung kuota `n/trials/<produk>` |
| `lifetime_licenses` | `c/lifetime_licenses/<id>` | `order_id` · `install_key` (keduanya bila tidak kosong, seperti index unik sekarang) | per pengguna (terbaru) · per status | penjaga `order_id` → lisensi tidak bisa terbit dua kali dari satu pesanan |
| `lifetime_activations` | `c/lifetime_activations/<id>` | `license + product + machine` (aktif) | per lisensi + produk | pencabutan = isi `revoked_at` + hapus penjaga |
| `platform_config` | `k/config/<key>` | — | — | dibaca sering → cache isolate 30 detik, dibuang saat ditulis |
| `payment_gateways` | `k/gateways` (satu dokumen, kredensial terenkripsi) | — | — | mode Live/Sandbox per metode |
| `payment_proofs` | `c/payment_proofs/<id>` (berkas bukti di `axto-documents`) | — | per pesanan · menunggu diperiksa | — |
| `support_threads` | `c/support_threads/<id>` | — | terbaru diperbarui · perlu admin · belum dibaca | pesan tetap di R2 seperti sekarang |
| `connect_events` | log `l/connect/<userId>/<ulid>` | — | (prefix log; „sesudah id X" = `startAfter`) | dibersihkan sesuai masa simpan yang diatur (housekeeping per jam, seperti sekarang) |
| `webhooks` | `c/webhooks/<id>` | — | per pengguna · per pengguna aktif · gagal terbanyak (admin) | rahasia penandatangan terenkripsi |
| `webhook_deliveries` | `c/webhook_deliveries/<id>` | — | per webhook (terbaru) · **antrean jatuh tempo** (`next_at`) | entri antrean dihapus begitu terkirim/menyerah |
| `api_keys` | `c/api_keys/<id>` | hash kunci | per pengguna · aktif | hanya hash yang disimpan |
| `user_ai_keys` | `c/user_ai_keys/<userId>_<provider>` | (ID = pengguna + penyedia) | per pengguna | kunci terenkripsi |
| `ai_provider_keys` | `c/ai_provider_keys/<id>` | — | aktif per penyedia | kunci platform (Managed AI) terenkripsi |
| `byox_usage` | event `l/usage/byox/<userId>/<yyyy-mm>/<ulid>` → ringkasan `n/byox/<userId>/<yyyy-mm>` | (ID) | per bulan (admin) | satu event per pemakaian (tidak ada kunci panas); cron menjumlahkan ke ringkasan; kuota Clipper = ringkasan + event yang belum dijumlahkan |
| `managed_usage` | event `l/usage/managed/<userId>/<yyyy-mm>/<ulid>` → ringkasan `n/managed/<userId>/<yyyy-mm>` | (ID) | — | idem |
| `managed_subscriptions` | `c/managed_subscriptions/<id>` | — | per pengguna + status | — |
| `password_resets` | `c/password_resets/<sha256(token)>` | (ID = hash token) | — | kedaluwarsa 30 menit dan dipakai sekali (If-Match), seperti sekarang; **perbaikan:** D1 sekarang menyimpan token apa adanya, R2 hanya menyimpan hash-nya |
| `audit_log` | log `l/audit/<yyyy>/<mm>/<dd>/<ulid>` (berantai hash) | — | per pelaku · per aksi | filter + halaman admin lewat index |
| `investors` | `c/investors/<id>` | — | per email · per status · semua | total modal terverifikasi = ringkasan |
| `investor_payouts` | `c/investor_payouts/<id>` | — | per pemodal (urut periode) · semua | — |
| `counters` | `n/<nama>` | — | — | nomor faktur, statistik |

KV axto.io (batas laju, cache kecil) bukan D1 dan tetap dipakai (bagian 4). Pengunjung harian/mingguan/bulanan/
tahunan (permintaan 63) dibangun langsung di R2: satu event per kunjungan `l/visits/<yyyy-mm-dd>/<ulid>` (kunci unik,
menghormati batas 1 tulis/detik per kunci), dijumlahkan cron ke `n/visits/<yyyy-mm-dd>` lalu event-nya dihapus.

**Urutan pindah axto.io (tiap tahap: tes hijau → E2E → tayang):**
1. R2 Store + R2 palsu + tes konkurensi (pustaka yang sama dengan xaa.es).
2. Akun & keamanan: `users`, `password_resets`, `api_keys`, `user_ai_keys`, `audit_log`.
3. Uang: `orders`, `payment_gateways`, `payment_proofs`, `subscriptions`, `counters`, `investors`, `investor_payouts`.
4. Lisensi: `sh_licenses` (+ detak), `sh_trials`, `lifetime_licenses`, `lifetime_activations`.
5. Lainnya: `platform_config`, `support_threads`, `connect_events`, `webhooks`, `webhook_deliveries`, `byox_usage`,
   `managed_usage`, `managed_subscriptions`, `ai_provider_keys`.
6. Migrasi data + jendela pindah + 7 hari pengamatan → D1 dilepas (bagian 4).

**Fitur baru langsung di R2 (tidak pernah D1):** lelang lisensi (27 Okt 2026, `BLUEPRINT-V4.md` §26.5/§27.2):
`auction_lots` (satu dokumen per lot, id deterministik `lot_<yyyymmdd>_<paket>` dibuat create-once; setiap tawaran,
penutupan, pengalihan ke penawar berikutnya, pembayaran dan pembatalan = satu compare-and-swap pada lot; indeks `all`,
`status` dengan ringkasan `ends_at`/`pay_by` agar cron tidak membaca dokumen, `cycle`, `winner`, `sold`),
`auction_bids` (create-once `<lot>.<seq>`, tidak pernah diubah; indeks `lot` tertinggi dulu dan `user`),
`auction_bidders` (id = user id: kode verifikasi e-mail sebagai hash SHA-256, berlaku 15 menit, maks. 5 percobaan,
dan nama tampilan). Pengaturan di `config/auction_settings`; penanda siklus `config/auction_cycle_ready`. Kunci panas:
lot yang ramai ditulis sekali per tawaran (batas R2 ±1 tulis/detik per kunci) — tawaran yang kalah balapan diulang dan
diperiksa ulang terhadap tawaran tertinggi yang baru, jadi tidak ada tawaran yang hilang atau ganda.

## 8. axto.io — animasi panduan (10 bahasa)

| # | Panduan | Tempat tombol „Lihat panduan" |
|---|---|---|
| 1 | Daftar, masuk, aktifkan verifikasi dua langkah | halaman masuk/daftar, Akun |
| 2 | Memilih paket dan membayar dengan PayPal | `/pricing`, panel bayar |
| 3 | Membayar dengan transfer BNI (IDR / USD / EUR) + unggah bukti | panel bayar |
| 4 | Membayar dengan kripto (USDT dan koin lain) | panel bayar |
| 5 | Mengambil lisensi dan mengunduh aplikasi Docker (Linux) — `docker compose up` | portal → Lisensi & unduhan |
| 6 | Memasang aplikasi di Windows (installer) dan mengaktifkan lisensi | portal → Lisensi & unduhan |
| 7 | Memindahkan lisensi ke mesin lain (reset pengikatan) | portal → Lisensi |
| 8 | Lisensi seumur hidup: harga terbaik, tawaran, aktivasi | `/pricing`, portal |
| 9 | Program trial (100 lisensi per aplikasi) | halaman aplikasi |
| 10 | Kunci AI sendiri (BYOK) dan Mode Lokal | portal → Pengaturan AI |
| 11–20 | Satu panduan singkat per aplikasi web (10 aplikasi) | menu tiap aplikasi |
| 21 | Memasang aplikasi axto.io di HP | bilah pasang |
| 22 | Menjadi pemodal dan membaca laporan bulanan | `/invest`, `/app/investor` |
| 23 | Dukungan | widget dukungan |
| A1–A8 | (admin) pembayaran Live, konfirmasi bukti transfer, paket & harga, lisensi, trial, pemodal, dukungan, audit | `/admin` |

## 9. Status

| Butir | Status |
|---|---|
| Blueprint R2 (dokumen ini) | ✅ 20 Okt |
| Pustaka R2 Store + R2 palsu + tes konkurensi | ✅ 21 Okt (`lib/r2/*`, dari xaa.es) |
| Tahap 2–5 (koleksi `lib/data/schema.ts`, semua route & modul) | ✅ 21 Okt — 0 kueri D1 tersisa |
| Arsip tabel lama ke `axto-backups/legacy/` | ✅ kode + tes (berjalan saat pindah) |
| Migrasi data + jendela pindah + pengamatan 7 hari | ✅ tayang 21 Okt 2026 02:33 UTC — `axto-db` 5,7 MB dalam ±4 menit, 0 konflik, 0 tabel kurang (`BLUEPRINT-V4.md` §25.3); pengamatan 7 hari berjalan |
| Backup harian bertahap, 35 hari | ✅ kode + tes (`lib/data/backup-job.ts`) |
| D1 dilepas | ⏳ 7 hari setelah pindah (±28 Okt 2026) |
| Animasi panduan (23 + 8 admin) | ⏳ 0/31 |

## 10. Cakupan: semua situs yang menyimpan data (perintah 20 Okt 2026, `REQUESTS.md` baris 81)

Aturan tetap untuk setiap situs dan aplikasi, sekarang dan nanti: **semua penyimpanan ke R2, tidak pernah ke D1**. Tidak
boleh ada database D1 baru, binding `d1_databases` baru, atau query D1 baru. Data yang masih di D1 dipindah dengan cara
bagian 4 (salin sekali dengan ID sama → setiap baris diperiksa sudah ada di R2 → D1 hanya-baca 7 hari → binding dilepas).

| Situs | Repo / Worker | D1 sekarang (diperiksa 20 Okt 2026) | Rencana R2 | Status |
|---|---|---|---|---|
| axto.io | guardian-ai · `dashboard` | `axto-db` (±1 MB, akun Cloudflare axto.io) | bagian 7: 25 tabel → `axto-data`, backup `axto-backups` | ⏳ setelah xaa.es |
| xaa.es | xaa | `xaa-portal` (266 KB, 18 baris) | 19 tabel → `xaa-data` (blueprint repo xaa §7), backup harian `xaa-backups` | 🔄 sedang dikerjakan |
| ulyah.com, xad.es, 1fr.fr, tilawa.de (+ situs mitra di `sites/`) | ulyah.com · `apps/worker-api` (`ulyah-api`) melayani `apps/web` | `ulyah-db` (±484 MB, 57 migrasi) — pemakai kuota D1 terbesar di akun | blueprint sendiri di repo ulyah.com (`docs/R2-DATA-BLUEPRINT.md`): inventaris tabel, R2 Store yang sama, migrasi bertahap per modul | ⏳ dicatat |
| Quantum (karoseri) | Quantum · `quantum-karoseri` | `quantum_db` | sama: R2 Store + migrasi bagian 4 | ⏳ dicatat |
| Situs lain (Jai, Lie, axto.us, axtodev, oldco.in, profity.in, verilex) | masing-masing | tidak ada | bila kelak perlu menyimpan apa pun: langsung R2 | ✅ aturan dicatat di tiap repo |

KV (batas laju, cache singkat) bukan D1 dan boleh tetap untuk data sementara ber-TTL saja; data yang harus awet selalu di R2.

