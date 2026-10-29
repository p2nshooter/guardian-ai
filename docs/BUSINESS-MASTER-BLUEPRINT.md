# BLUEPRINT INDUK BISNIS AXTO.IO & XAA.ES

> **WAJIB DIBACA SEBELUM MENGERJAKAN APA PUN** — oleh setiap AI dan setiap pengembang yang melanjutkan pekerjaan
> di guardian-ai (axto.io) maupun xaa (xaa.es). Dokumen ini menang atas dokumen lain bila bertentangan, kecuali atas
> perintah pemilik yang lebih baru (dicatat di `docs/REQUESTS.md`).

Perintah pemilik, 29 Okt 2026 (REQUESTS 131), kata demi kata:

> „Batalkan sistem white label dengan ide yg sy berikan dan buat. Skrg sy berikan kepada anda untuk membuat sistem
> white label yg benar dengan kemanan license yg ketat dan pengusaha white label bertanggung jawab penuh dengan client
> nya baik setup, revoke banned perpanjang license, komplain dll itu ada di pihak white label tp tetap sangat
> menguntungkan axto.io juga menguntungkan pengusaha white label dengan biaya awal yg besar tp tepat dan tetp
> menguntungkan white label dan buatkan portal reseller dan affiliate... Pastikan axto.io selalu memiliki keuntungan yg
> besar... Pastikan semua member bisa di kendalikan dari admin... Pastikan chat ai yg di miliki axto.io dan xaa.es
> mampu menjawab seluruh pertanyaan tanpa membongkar rahasia perusahaan... Seluruh sistem white label, reseller,
> affiliate bisa di show Hiden dari portal admin, defoult nya show.... Gunakan logika tertinggi anda untuk membuat
> seluruh bisnis axto.io & xaa.es. Ingat kunci nya, baik axto.io & xaa.es seluruh nya berjalan otomatis tanpa
> pengendali dan ini adalah rahasia perusahaan … Catat d blueprint besar2 agar seluruh AI yg melanjutkan memahami konsep
> ini, pastikan seluruh aplikasi di rancang dan dibangun dengan konsep teknologi tertinggi yang ada di dunia karena itu
> kerjakan satu persatu persatu, buat blueprint secara berurutan dengan koneksi setiap aplikasi yg bisa di jual paketan
> dan seterusnya. Dan bangun sistem Manage yg selama ini off tp husus white label, axto sendiri tidak menyediakan sistem
> manage, itu husus buat white label".

Yang dibatalkan: rancangan white label REQUESTS 126–127 (US$500.000, bagi hasil 30%/20%) dan
`docs/BLUEPRINT-V4.md` §36. Rancangan di bawah ini menggantikannya. REQUESTS 130 (dua bahasa untuk instans white label:
Inggris + satu bahasa mitra) **dipertahankan** sebagai keputusan rancangan: mitra bekerja di pasar lokalnya, dan dua
bahasa memperkecil beban dukungan. Pemilik bisa mengubahnya.

---

## 1. KUNCI KONSEP — TUJUH HUKUM YANG TIDAK BOLEH DILANGGAR

1. **BERJALAN SENDIRI (ZERO-TOUCH).** Setiap penjualan, aktivasi, lisensi, perpanjangan, penangguhan, tagihan,
   pengingat, komisi dan pembayaran komisi berjalan otomatis. Tidak ada operator harian. Manusia (pemilik) hanya
   menyetujui pengecualian yang sengaja dirancang, yaitu uang keluar lewat wire atau kripto (§7.4).
2. **AXTO DIBAYAR LEBIH DULU.** Kanal mitra memakai **kredit prabayar**. Tidak ada lisensi yang terbit sebelum dibayar.
   AXTO tidak memberi utang, tidak menagih di belakang, dan tidak bergantung pada laporan penjualan mitra. Bagi hasil
   persentase ditiadakan karena butuh audit dan kepercayaan; harga grosir prabayar tidak.
3. **TANGGUNG JAWAB DI TANGAN MITRA.** Pengusaha white label dan reseller memegang penuh klien mereka: setup, dukungan,
   komplain, perpanjangan, cabut, blokir, refund dan kepatuhan di wilayahnya. AXTO hanya melayani mitra (dukungan tingkat
   2), tidak pernah klien mitra secara langsung.
4. **LISENSI KETAT.** Setiap lisensi terbit hanya lewat Otoritas Lisensi AXTO (§6): ditandatangani kunci akar AXTO,
   dihitung dari dompet kredit secara atomik, terikat mesin, dan bisa dicabut seketika. Tidak ada pihak luar yang bisa
   mencetak lisensi sendiri.
5. **ADMIN MENGENDALIKAN SEMUA.** Setiap anggota (pelanggan langsung, afiliasi, reseller, white label, klien mitra, admin)
   terlihat dan bisa dikendalikan dari Admin (§8). Setiap tindakan admin tercatat di log audit.
6. **RAHASIA PERUSAHAAN.** Cara kerja otomatisasi, arsitektur, pemasok, biaya modal, margin dan dokumen ini tidak pernah
   muncul di halaman publik, e-mail ke pelanggan, maupun jawaban chat AI (§9). Halaman publik hanya menjelaskan apa yang
   didapat pembeli.
7. **AXTO SELALU UNTUNG BESAR, MITRA TETAP UNTUNG.** Setiap harga di dokumen ini dihitung supaya AXTO menang di setiap
   transaksi (perangkat lunak berbiaya marginal ≈ 0, AI dijual di atas biaya modal) dan mitra punya margin nyata (§4).

> **Catatan kerahasiaan.** Repositori guardian-ai dan xaa saat ini **publik** di GitHub, jadi dokumen dan kode ini bisa
> dibaca siapa pun. Agar konsep ini benar-benar rahasia, pemilik perlu menjadikan kedua repositori privat (GitHub →
> Settings → Danger Zone → Change visibility). Tidak ada kredensial di dokumen ini, dan memang tidak boleh ada.

---

## 2. PETA BISNIS — EMPAT KANAL PENJUALAN

```
                         ┌────────────────────────── AXTO (axto.io) / XAA (xaa.es) ──────────────────────────┐
                         │  Katalog • Otoritas Lisensi • Dompet kredit • Tagihan otomatis • Admin • Chat AI   │
                         └───────┬──────────────────┬───────────────────┬────────────────────┬────────────────┘
                                 │                  │                   │                    │
                     A. LANGSUNG │       B. AFILIASI│        C. RESELLER│     D. WHITE LABEL │
                    harga daftar │   bawa pembeli,  │  merek AXTO, beli │  merek sendiri 100%│
                    ke pelanggan │   dapat komisi   │  kredit grosir    │  instans sendiri,  │
                                 │                  │  prabayar         │  kredit grosir,    │
                                 │                  │                   │  MANAGE (AI)       │
                                 ▼                  ▼                   ▼                    ▼
                           Pelanggan          Pelanggan langsung   Pelanggan reseller   Klien white label
                           langsung           (atribusi afiliasi)  (dukungan: reseller) (dukungan: mitra)
```

| Kanal | Merek yang dilihat pelanggan | Siapa menagih pelanggan | Siapa mendukung pelanggan | AXTO menerima |
|---|---|---|---|---|
| A. Langsung | AXTO / XAA | AXTO | AXTO (otomatis + chat AI) | harga daftar penuh |
| B. Afiliasi | AXTO / XAA | AXTO | AXTO | harga daftar − komisi afiliasi |
| C. Reseller | AXTO / XAA ("dikelola oleh <reseller>") | reseller | reseller | harga grosir prabayar + biaya masuk |
| D. White label | merek mitra 100% | mitra (gateway miliknya) | mitra | biaya masuk + biaya tahunan + grosir prabayar + kredit AI Manage |

---

## 3. PROGRAM DAN SAKLAR TAMPIL/SEMBUNYI

- Admin → **Programs** memuat tiga program: **Afiliasi**, **Reseller**, **White Label**. Masing-masing punya:
  - **Tampil di situs** (bawaan: TAMPIL). Bila disembunyikan, halaman publik program menjadi 404 dan program hilang dari
    menu, sitemap, `llms.txt` dan pengetahuan chat AI. Anggota yang sudah ada tetap bisa masuk ke portalnya.
  - **Terima pendaftaran baru** (bawaan: YA).
  - **Bekukan program** (darurat, bawaan: TIDAK). Semua penerbitan dan pembayaran program berhenti; lisensi yang sudah
    terbit tetap jalan.
  - Semua angka di §4 (biaya, diskon, komisi, ambang tingkat) bisa diubah di sini, dengan nilai bawaan dari dokumen ini.
- Setiap perubahan tercatat di log audit.

---

## 4. HARGA — BESAR TAPI TEPAT (nilai bawaan, bisa diubah di Admin)

### 4.1 axto.io (USD)

**B. Afiliasi** — gratis bergabung.
- Komisi **20%** dari setiap pembayaran lunas pelanggan langsung yang dibawanya, selama **12 bulan** pertama pelanggan itu.
- Komisi **10%** sekali dari biaya masuk reseller atau white label yang dibawanya.
- AXTO menyimpan 80–90%. Afiliasi tidak menanggung dukungan apa pun.

**C. Reseller** (merek AXTO):
- **Biaya masuk US$5.000**, sudah termasuk **kredit US$2.500**, jadi biaya bersihnya US$2.500.
- **Diskon grosir** dari harga daftar, naik otomatis menurut pembelian 12 bulan terakhir:
  - Silver 25% (di bawah US$25.000);
  - Gold 30% (US$25.000 ke atas);
  - Platinum 35% (US$100.000 ke atas).
- **Biaya tahunan US$1.200** mulai tahun kedua, dihapus bila pembelian 12 bulan terakhir mencapai US$25.000.
- Harga jual bebas, tetapi harga yang diiklankan minimal harga daftar − 10% (MAP), supaya kanal langsung tidak rusak.

**D. White Label** (merek sendiri 100%):
- **Biaya masuk US$150.000** (tahun pertama), sudah termasuk:
  - **kredit grosir US$50.000** yang langsung bisa dijual;
  - lisensi merek setahun: nama, logo, warna, domain, e-mail, dua bahasa;
  - instans khusus terisolasi;
  - hak **MANAGE** (AI disediakan AXTO, §5);
  - portal mitra, API mitra dan akun di Otoritas Lisensi;
  - akademi onboarding dan sertifikasi tim mitra.
- **Diskon grosir** naik otomatis menurut pembelian 12 bulan terakhir:
  - 50% (di bawah US$250.000);
  - 55% (US$250.000 ke atas);
  - 60% (US$1.000.000 ke atas).
- **Biaya platform tahunan US$48.000** mulai tahun kedua (hosting instans, pembaruan, infrastruktur Manage). Turun ke
  US$24.000 bila pembelian 12 bulan terakhir mencapai US$500.000.
- **Pembelian minimum tahunan US$60.000** mulai tahun kedua. Kekurangannya ditagihkan **sebagai kredit**: mitra tetap
  menerima nilainya, AXTO tetap menerima uangnya.
- Diskon gabungan (paket + tingkat mitra) dibatasi maksimal 65% dari harga daftar.

**Mengapa ini tepat.**
- **Bagi AXTO:** US$100.000 bersih dari biaya masuk, ditambah US$48.000 per tahun, ditambah 40–50% dari harga jual
  setiap lisensi tanpa biaya produksi, ditambah margin AI Manage. Semuanya diterima di muka.
- **Bagi mitra:** dengan diskon 50%, menjual di harga daftar berarti markup 100%. Contoh: paket Pro US$49/bulan; 350
  klien Pro selama setahun menghasilkan margin kotor ≈ US$102.900, sudah menutup biaya merek bersih tahun pertama.
  Ditambah jasa setup, dukungan dan AI Manage yang harganya ditentukan mitra sendiri.

### 4.2 xaa.es (EUR) — sistem yang sama, disesuaikan dengan katalog studio

**Afiliasi:**
- 20% dari templat dan script selama 12 bulan;
- 10% dari proyek studio pertama pelanggan, karena margin jasa lebih tipis;
- 10% dari biaya masuk mitra.

**Reseller:**
- biaya masuk €2.500, termasuk kredit €1.250;
- diskon 20/25/30% untuk templat dan script;
- diskon 10% untuk paket studio.

**White Label** (platform agensi: portal klien, katalog, lelang, merek sendiri):
- biaya masuk €75.000, termasuk kredit €25.000;
- diskon grosir templat dan script 40/45/50%, paket studio 25%;
- biaya tahunan €24.000 mulai tahun kedua;
- pembelian minimum €30.000 per tahun.

---

## 5. MANAGE — KHUSUS WHITE LABEL

- **Manage = AI disediakan AXTO**: klien bisa memakai AI tanpa kunci API sendiri.
  - Kodenya sudah ada dan terkunci: `MANAGED_PLANS`, Admin → Managed, setelan `managed_enabled`.
  - **AXTO tidak menjual Manage kepada pelanggan langsung**: axto.io tetap BYOX (kunci milik anggota). Manage hanya
    dibuka di dalam instans white label.
- **Dompet AI mitra:** mitra membeli kredit AI grosir prabayar.
  - Harga grosir per kredit = biaya modal pemasok model × **2,5**, dihitung otomatis dari tabel biaya di Admin. Margin
    AXTO minimal 60%.
  - Mitra menentukan harga jual kredit kepada kliennya sendiri.
- **Meter per klien:** setiap permintaan AI dari klien mitra mengurangi dompet AI mitra secara atomik.
  - Ada anggaran per klien, batas keras dan alarm saldo rendah (sisa 30, 14 dan 7 hari pakai).
  - Saldo nol berarti permintaan AI berhenti. Tidak pernah berutang.
- Kunci pemasok model hanya di penyimpanan terenkripsi pusat. Mitra dan kliennya tidak pernah melihatnya.

---

## 6. OTORITAS LISENSI (OL) — KEAMANAN LISENSI KETAT

Fondasi yang sudah ada: tanda tangan Ed25519 fail-closed (`lib/license-sign.ts`), validasi online terikat mesin
dengan nonce anti-replay, dan gerbang lisensi di setiap engine. OL v4 menambahkan:

1. **Satu-satunya pintu penerbitan.** Lisensi hanya terbit lewat OL (portal atau API mitra). Langkahnya:
   - kurangi dompet kredit dengan compare-and-swap;
   - buat dokumen lisensi dengan id deterministik dari kunci idempoten (create-once).
   - Saldo kurang berarti ditolak; tidak ada saldo minus dan tidak ada terbit ganda.
2. **Kunci lisensi:**
   - 25 karakter base32 dengan digit cek, dan prefiks milik penerbit (white label memakai prefiksnya sendiri, tanpa
     "AXTO").
   - Disimpan sebagai hash (SHA-256 + pepper) dan ditampilkan sekali. Rotasi kunci mematikan kunci lama.
3. **Terikat mesin dan kursi:**
   - aktivasi per sidik jari mesin;
   - jumlah kursi atau perangkat sesuai edisi;
   - pindah mesin maksimal 3 kali per 30 hari, untuk mencegah berbagi kunci.
4. **Jawaban bertanda tangan berumur pendek:**
   - berlaku 72 jam;
   - engine wajib memvalidasi ulang;
   - masa tenggang offline 7 hari (self-hosted), deteksi jam mundur;
   - rotasi kunci akar lewat `kid` dengan daftar kunci publik di engine.
5. **Status:** aktif, ditangguhkan, dicabut, diblokir, kedaluwarsa. Penerbit (mitra) mencabut, memblokir, memperpanjang
   dan menerbitkan ulang untuk kliennya sendiri. Admin AXTO bisa menimpa apa pun.
6. **Kaskade mitra:** mitra yang ditangguhkan (biaya tahunan tidak dibayar, penyalahgunaan) membuat lisensinya masuk
   tenggang 14 hari demi melindungi klien akhir, lalu hanya-baca, lalu ditangguhkan.
7. **Saklar pemutus:** per lisensi, per mitra, per produk, dan global (darurat).
8. **Deteksi anomali:**
   - satu kunci di lebih banyak mesin daripada kursinya dalam 24 jam → ditangguhkan otomatis, penerbit diberi tahu;
   - lonjakan validasi → dibatasi lajunya;
   - percobaan menebak kunci → IP diblokir sementara.
9. **API mitra:**
   - permintaan bertanda tangan HMAC dengan id kunci, stempel waktu ±300 detik, nonce, cakupan (terbitkan, cabut,
     baca), batas laju per kunci, dan daftar IP opsional.
   - Kunci API ditampilkan sekali.
10. **Jejak tak terhapus:** setiap peristiwa lisensi dan dompet ditulis ke log append-only di R2, bisa diekspor per mitra.
    Rekonsiliasi harian memeriksa jumlah buku besar = saldo dompet. Selisih → dompet dibekukan dan admin diberi tahu.

---

## 7. ALUR OTOMATIS DARI DAFTAR SAMPAI UANG

### 7.1 Afiliasi
1. Mendaftar: akun terverifikasi dan menyetujui syarat afiliasi.
2. Mendapat tautan `?ref=<kode>`.
3. Atribusi: klik terakhir, cookie 60 hari; kode dikunci ke akun saat pembeli mendaftar.
4. Setiap pembayaran lunas pelanggan itu memberi komisi, berstatus tertahan 30 hari (jendela refund).
5. Setelah 30 hari komisi bisa dibayar. Refund atau chargeback menariknya kembali.
6. Rujukan diri sendiri ditolak otomatis: akun, e-mail, alat pembayaran, IP atau perangkat yang sama.

### 7.2 Reseller dan White Label
1. Mengajukan.
2. Menyetujui perjanjian secara elektronik: nama lengkap, waktu, hash IP, versi perjanjian.
3. Membayar biaya masuk lewat checkout yang ada: wire BNI, escrow, kripto, atau PayPal dalam batasnya.
4. Pembayaran terverifikasi → akun mitra aktif, dompet terisi kredit yang termasuk, portal terbuka. Tidak ada langkah
   manual.
5. Khusus white label:
   - mitra mengisi studio merek (nama, logo, warna, domain, bahasa kedua);
   - rekonsiliator membangun instansnya;
   - mitra memasang CNAME → domain dan SSL terverifikasi otomatis → instans tayang.

### 7.3 Siklus berulang
- Biaya tahunan dan pembelian minimum ditagih otomatis 30 hari sebelum ulang tahun kontrak, dengan pengingat di H-30,
  H-14, H-7 dan H-1.
- Tidak dibayar → masa tenggang 14 hari → mitra ditangguhkan (kaskade §6.6).
- Tingkat diskon dihitung ulang setiap malam dari pembelian 12 bulan terakhir.

### 7.4 Uang keluar (komisi afiliasi)
- **Kredit akun AXTO**: instan, dengan bonus 10% bila dipilih dalam bentuk kredit.
- **PayPal Payouts**: otomatis bila API Payouts dikonfigurasi.
- **Wire dan USDT**: masuk batch mingguan yang menunggu **satu persetujuan pemilik**. Ini disengaja: uang keluar adalah
  satu-satunya titik yang butuh satu sentuhan manusia, demi keamanan.
- Minimum pembayaran US$50, dibayar tanggal 5 setiap bulan.
- **Sebagaimana dibangun di P2 (29 Okt 2026):**
  - satu pembayaran per afiliasi per bulan, mulai tanggal 5, untuk semua metode;
  - wire dan USDT menunggu satu persetujuan;
  - PayPal keluar sendiri bila diaktifkan di Admin → Programs;
  - pilihan "kredit akun +10%" menyusul bersama dompet kredit di P3.

---

## 8. ADMIN MENGENDALIKAN SEMUA ANGGOTA

Admin → **Members** menjadi konsol tunggal untuk semua jenis akun: pelanggan, afiliasi, reseller, white label, klien
mitra dan admin.

- **Filter dan cari:** jenis, status, program, negara, tanggal, penerbit.
- **Profil:** paket, lisensi, dompet, buku besar, pesanan, komisi, sesi aktif, log audit.
- **Tindakan:**
  - tangguhkan, blokir dengan alasan, buka blokir;
  - paksa keluar dari semua sesi;
  - ubah peran atau tingkat program;
  - sesuaikan dompet (wajib alasan; dicatat);
  - cabut lisensi;
  - lihat sebagai pengguna (hanya-baca);
  - ekspor.
- **Klien mitra** terlihat sebatas metadata akun dan lisensi. Isi kerja mereka tetap terenkripsi per akun
  (non-custodial).
- Setiap tindakan admin masuk log audit dan tidak bisa dihapus.

---

## 9. CHAT AI AXTO.IO DAN XAA.ES — MENJAWAB SEMUA, TIDAK MEMBONGKAR RAHASIA

- **Paket pengetahuan publik** dibangun otomatis dari sumber kebenaran kode: katalog, harga, program yang sedang TAMPIL,
  syarat publik dan FAQ. Program yang disembunyikan tidak masuk paket.
- **Aturan tetap di prompt sistem.** Chat tidak pernah menyebut:
  - arsitektur, otomatisasi internal, pemasok, hosting;
  - mekanisme keamanan secara rinci, biaya modal, margin;
  - mitra lain atau pelanggan lain, proses admin, dan dokumen ini.
  - Bila ditanya, chat menolak dengan sopan dan menawarkan kontak tim.
- **Pertanyaan tentang akun sendiri** (lisensi, dompet, komisi) hanya dijawab untuk pengguna yang masuk, dan hanya
  tentang miliknya sendiri.
- Klien white label tidak pernah melihat merek AXTO. Chat di instans mitra memakai merek dan kontak mitra.
- **Pertahanan berlapis:**
  - filter keluaran yang menyamarkan nilai rahasia apa pun yang terkonfigurasi (sudah ada);
  - daftar istilah terlarang yang dicek oleh tes unit pada paket pengetahuan.

---

## 10. KATALOG, KONEKSI ANTARAPLIKASI DAN PAKET

### 10.1 Aplikasi dan koneksinya (urutan bangun dan matang)

| # | Aplikasi | Jenis | Terhubung ke | Kanal |
|---|---|---|---|---|
| 1 | Legal AI | cloud | Privacy Vault, Compliance Center, Prompt Library, AXTO Legal (self-hosted) | A B C D |
| 2 | Privacy Vault | cloud | Legal AI, Vault AI | A B C D |
| 3 | Compliance Center | cloud | Legal AI, Compliance AI, Security Analyst | A B C D |
| 4 | Security Analyst | cloud | Guardian AI, SOC AI, Compliance Center | A B C D |
| 5 | AI Studio | cloud | Prompt Library, Clipper, AXTO Studio | A B C D |
| 6 | Clipper | cloud | AI Studio | A B C D |
| 7 | Prompt Library | cloud | semua aplikasi cloud | A B C D |
| 8 | Guardian AI | self-hosted | Orchestra, SOC AI, Compliance AI, Antivirus | A B C D |
| 9 | Orchestra AI | self-hosted | semua engine (perutean GPU) | A B C D |
| 10 | Vault AI | self-hosted | Orchestra, Compliance AI, Edge AI | A B C D |
| 11 | Edge AI | self-hosted | Orchestra, Vault AI | A B C D |
| 12 | SOC AI | self-hosted | Guardian AI, Sentinel OT, Compliance AI | A B C D |
| 13 | Compliance AI | self-hosted | Guardian AI, SOC AI, Vault AI | A B C D |
| 14 | Sentinel OT | self-hosted | SOC AI | A B C D |
| 15 | Antivirus | self-hosted | Guardian AI | A B C D |
| 16 | AXTO Studio | self-hosted | Orchestra, AI Studio | A B C D |
| 17 | AXTO Legal | self-hosted | Legal AI, Vault AI | A B C D |
| 18 | AXTO Connect | platform developer | semua (API, peristiwa) | A B C D |
| 19 | **Manage (AI disediakan)** | layanan | semua aplikasi AI | **D saja** |

### 10.2 Paket yang dijual

Diskon paket: 3 produk −20%, 5 produk −25%, Semua −30%. Diskon mitra berlaku di atas harga paket, dengan batas
gabungan 65%.

| Paket | Isi |
|---|---|
| Legal & Privacy Office | Legal AI, Privacy Vault, Compliance Center, Prompt Library, AXTO Legal |
| Security Operations | Guardian AI, SOC AI, Security Analyst, Compliance AI, Antivirus |
| Sovereign AI Infrastructure | Orchestra AI, Edge AI, Vault AI, AXTO Studio |
| Creator & Media | AI Studio, Clipper, Prompt Library |
| Industrial Security | Guardian AI, Sentinel OT, SOC AI |
| Enterprise Everything | semua aplikasi cloud (Enterprise) dan semua self-hosted (edisi Business) |

Setiap paket berupa satu pesanan yang menerbitkan satu "lisensi paket" berisi hak setiap produk. Perpanjangan dan upgrade
mengikuti aturan prorata waktu yang sudah ada.

### 10.3 xaa.es

Templat SaaS, script, domain dan lelang (§10 dan permintaan 65 di repo xaa) bisa dijual paketan: templat + setup + backup
AI. Templat yang dijual memakai lisensi bertanda tangan per domain dari OL yang sama.

---

## 11. URUTAN PEMBANGUNAN — SATU PER SATU

Setiap fase selesai penuh (kode, Admin, portal anggota 10 bahasa, halaman publik + SEO, tes unit + E2E + browser,
dokumentasi, tayang) sebelum fase berikutnya dimulai. Kemajuan dicatat di `docs/BLUEPRINT-V4.md` §19.

| Fase | Isi | Selesai bila |
|---|---|---|
| **P0** | Dokumen ini; REQUESTS 131; pembatalan §36; penunjuk "baca dulu" di CLAUDE.md kedua repo | digabung |
| **P1** | Admin → Programs (saklar tampil/terima/bekukan, semua angka §4); halaman publik `/partners` (hub), `/affiliate`, `/resellers`, `/white-label` dalam 10 bahasa; paket pengetahuan chat AI + aturan rahasia | E2E saklar sembunyi → 404 dan hilang dari chat/sitemap |
| **P2** | Afiliasi lengkap: tautan, atribusi, buku besar komisi, tahan 30 hari, tarik balik, pembayaran §7.4, portal afiliasi, admin | E2E daftar → beli → komisi → bayar |
| **P3** | Dompet kredit + OL v4 (§6) + API mitra; engine menerima kunci prefiks penerbit dan `kid` | uji ketat: balapan, saldo, anomali, cabut |
| **P4** | Portal reseller: daftar, perjanjian, bayar → aktif, beli kredit, terbitkan atau kelola lisensi klien, pelanggan, tingkat otomatis | E2E penuh |
| **P5** | White label: studio merek, instans khusus (rekonsiliator), domain, dua bahasa, portal mitra, siklus tahunan | instans contoh tayang di CI |
| **P6** | MANAGE khusus white label (§5) | E2E dompet AI dan meter |
| **P7** | Konsol anggota Admin terpadu (§8) | E2E tindakan admin + audit |
| **P8** | Paket dan koneksi (§10) | E2E paket → lisensi paket |
| **P9** | xaa.es: afiliasi, reseller, white label (§4.2) | E2E di repo xaa |
| **P10** | Uji keamanan menyeluruh: lisensi, API mitra, rahasia chat; lalu templat SaaS untuk lelang xaa.es (REQUESTS 129) | laporan uji |

**Kemajuan:**
- **P0** ✅ (PR #97).
- **P1** ✅:
  - Admin → Partner programmes;
  - `/partners`, `/affiliate`, `/resellers` dan `/white-label` dalam 10 bahasa;
  - pengetahuan chat dan aturan rahasia;
  - E2E saklar sembunyi.
- **P2** ✅:
  - afiliasi lengkap dan portal `/app/affiliate`;
  - Admin → Affiliates & payouts;
  - E2E dari daftar sampai bayar dan tarik balik.

Sampai portalnya selesai (P4, P5), halaman reseller dan white label menerima **lamaran** (satu per anggota per program,
dikelola di Admin → Programs). Tidak ada pembayaran sebelum portalnya ada. Panduan pemilik: `docs/admin/AFFILIATE.md`.

---

## 12. STANDAR TEKNOLOGI

- **Penyimpanan:** hanya Cloudflare R2, dengan pola R2 Store yang ada: create-once, compare-and-swap, indeks dengan
  metadata, log append-only, cadangan 35 hari. KV hanya untuk cache dan batas laju. Tidak pernah D1.
- **Uang:** setiap transisi uang bersyarat dan idempoten, dengan id deterministik. Dompet tidak pernah negatif.
- **Kriptografi:**
  - Ed25519 untuk lisensi, HMAC-SHA256 untuk API mitra dan peristiwa;
  - kunci rahasia di penyimpanan terenkripsi;
  - kunci yang dibuat ditampilkan sekali.
- **Pengamanan:**
  - setiap rute memeriksa peran dan kepemilikan di fungsi yang menulis;
  - batas laju di setiap pintu publik;
  - log audit untuk setiap tindakan yang berarti.
- **Kualitas:** portal anggota dalam 10 bahasa, desain "Crystal Palace", gerak hormat `prefers-reduced-motion`, SEO di
  setiap halaman publik, dan tes di setiap perubahan (CLAUDE.md §1–§5).
