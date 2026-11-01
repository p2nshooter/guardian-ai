# Program mitra AXTO: afiliasi, reseller dan white label

Rancangan induk: `docs/BUSINESS-MASTER-BLUEPRINT.md` §3, §4, §7 dan §9 (REQUESTS 131).

Tiga menu Admin:
- **Admin → Business → Partner programmes** (`/admin/programs`): saklar dan semua angka.
- **Admin → Business → Affiliates & payouts** (`/admin/affiliates`): afiliasi, komisi dan pembayaran.
- Anggota memakai **Affiliate** (`/app/affiliate`) di portal anggota, dalam 10 bahasa.

Halaman publik:
- `/partners`, hub ketiga program;
- `/affiliate`;
- `/resellers`;
- `/white-label`.

Semua halaman publik punya meta SEO, JSON-LD dan entri sitemap, dan tampil dalam 10 bahasa. Tautan "Partner programmes"
ada di footer.

## 1. Saklar setiap program (bawaan: tampil, terima anggota, tidak beku)

| Saklar | Bila dimatikan / dinyalakan |
|---|---|
| **Show / Hide** | Disembunyikan: halaman program menjadi 404 noindex. Program juga hilang dari hub, footer, sitemap, `llms.txt`, `/api/programs` dan pengetahuan chat AI. Tautan afiliasi berhenti melacak. Anggota yang sudah bergabung tetap bisa membuka portalnya. Bila ketiga program disembunyikan, `/partners` juga 404. |
| **Close / Open to new members** | Ditutup: tidak ada pendaftaran atau lamaran baru, dan halaman menyatakannya. |
| **Freeze (emergency)** | Dibekukan: tidak ada anggota baru dan tidak ada pembayaran. Komisi yang sudah ada tetap aman dan tetap dihitung. |

Setiap simpan tercatat di **Audit log** (`programs.update`), lengkap dengan apa yang berubah.

## 2. Angka (bisa diubah; nilai bawaan dari blueprint §4.1)

- **Afiliasi**:
  - komisi 20% dari setiap pesanan lunas pelanggan yang dibawa, selama 12 bulan;
  - 10% sekali dari biaya masuk mitra yang dibawa;
  - komisi ditahan 30 hari (jendela refund);
  - cookie tautan 60 hari;
  - pembayaran minimum US$50;
  - komisi ≥ US$2.000 diperiksa sekali (angka internal, tidak pernah tampil).
- **Reseller**:
  - biaya masuk US$5.000, termasuk kredit US$2.500;
  - tingkat diskon 25/30/35% mulai pembelian 12 bulan US$0 / 25.000 / 100.000;
  - biaya tahunan US$1.200, dihapus mulai pembelian US$25.000;
  - harga iklan minimal harga daftar − 10%;
  - kredit berlaku 24 bulan sejak dibeli.
- **White label** (direvisi 1 Nov 2026, REQUESTS 134, alasan di `docs/BUSINESS-MASTER-BLUEPRINT.md` §4.3):
  - biaya masuk US$60.000, termasuk kredit US$20.000 (wire, escrow atau kripto — bukan kartu atau PayPal);
  - tingkat diskon 50/55/60% mulai US$0 / 150.000 / 500.000;
  - biaya platform US$24.000 setahun mulai tahun kedua (US$12.000 mulai pembelian US$250.000);
  - pembelian minimum US$48.000 setahun mulai tahun kedua (kekurangan ditagih sebagai kredit);
  - kredit berlaku 24 bulan; 10 lisensi demo masing-masing 30 hari;
  - klien mitra ditawari melanjutkan langsung dengan AXTO bila mitra pergi atau ditangguhkan lebih dari 30 hari;
  - diskon gabungan maksimal 65%;
  - pengali grosir AI Manage 2,5× (internal, tidak pernah tampil).
  - Pengaturan yang tersimpan sebelum revisi ini dipindah sekali ke angka di atas; angka yang Anda simpan sesudahnya
    dipakai apa adanya.

Angka yang tidak sah (di luar batas, tingkat yang turun, kredit melebihi biaya) tidak disimpan; nilai lama tetap berlaku.
"Reset numbers to defaults" mengembalikan semua angka tanpa menyentuh saklar.

## 3. Afiliasi berjalan sendiri

1. **Bergabung**: anggota masuk ke `/app/affiliate`, menyetujui syarat (versi syarat dicatat) dan mendapat kode serta
   tautan `https://axto.io/?ref=<kode>`. Tambahkan `?ref=<kode>` ke halaman mana pun.
2. **Klik**: kode disimpan dalam cookie httpOnly selama 60 hari, dan klik terakhir yang berlaku. Setiap klik dicatat
   tanpa menyimpan alamat IP; yang disimpan hanya sidik jaringannya.
3. **Daftar**: akun baru terikat sekali ke afiliasi itu dan tidak bisa dipindah. Rujukan diri sendiri ditolak: akun yang
   sama, atau e-mail yang sama walau ditulis lain (huruf besar, `+tag`, titik Gmail). Pendaftaran dari jaringan yang sama
   dengan si afiliasi ditandai untuk diperiksa.
4. **Pesanan lunas**: komisi dibuat sekali per pesanan, berstatus *held* sampai jendela refund lewat. Tidak pernah ada
   komisi untuk:
   - pembayaran uji coba (sandbox);
   - lelang dan penjualan situs;
   - investasi.
5. **Refund**: komisi dibatalkan. Bila sudah dibayar, jumlahnya ditarik kembali dari pembayaran berikutnya (entri negatif
   `…_cb`).
6. **Jam (cron tiap jam)**:
   - komisi yang lewat jendela refund menjadi *payable*, setelah pesanannya dicek ulang;
   - mulai tanggal **5 setiap bulan**, satu pembayaran per afiliasi bila saldo siap ≥ minimum (`po_<afiliasi>_<YYYYMM>`).

## 4. Satu sentuhan Anda: menyetujui pembayaran

- **PayPal**: centang "PayPal Payouts run by themselves" di Partner programmes. App PayPal di Admin → Payment & email
  harus punya Payouts aktif. Setelah itu pembayaran PayPal keluar sendiri, dan yang gagal kembali ke antrean bulan
  berikutnya.
- **Transfer bank dan USDT** (dan PayPal bila otomatis dimatikan) menunggu di *Payouts waiting for your approval*:
  1. **Reveal destination**: rekening atau alamat didekripsi untuk Anda, dan tindakan ini dicatat di audit log.
  2. Kirim uangnya.
  3. **Mark paid** dengan nomor referensi atau hash transaksi.
  4. Bila pembayaran tidak bisa dikirim: **Failed** dengan alasan. Komisinya kembali ke pembayaran berikutnya.
- **Run this month's payouts now**: membuat pembayaran bulan ini sebelum tanggal 5. Aman diulang, karena satu afiliasi
  hanya mendapat satu pembayaran per bulan.
- **Commissions waiting for a look**: komisi besar atau dari jaringan si afiliasi sendiri. *Approve* melanjutkan masa
  tahan; *Reject* membatalkannya.
- **Suspend / Ban / Reactivate** afiliasi, dengan alasan yang dicatat. Tautan afiliasi yang ditangguhkan tidak
  menghasilkan komisi.

Data pembayaran afiliasi disimpan terenkripsi (AES-GCM, kunci `SETTINGS_ENCRYPTION_KEY`) dan hanya ditampilkan tersamar.
Isinya tidak pernah masuk log.

## 5. Reseller dan white label (sampai portalnya selesai di fase P4 / P5)

- Halamannya sudah tampil dengan ketentuan lengkap, contoh perhitungan, dan formulir lamaran untuk anggota yang masuk.
- Setiap anggota hanya bisa melamar sekali per program.
- Lamaran masuk ke Partner programmes → *applications*, dan e-mail pemberitahuan dikirim ke kotak admin.
- Tandai lamaran *contacted*, *invited* atau *declined*; pelamar melihat statusnya di halaman program.
- Halaman menyatakan bahwa portal dibuka bertahap. **Tidak ada yang diminta membayar sebelum portalnya ada.** Saat P4 dan P5
  selesai, pelamar diundang lebih dulu.

## 6. Chat AI

- Chat hanya tahu program yang **tampil**, dan hanya ketentuan publiknya.
- Chat tidak pernah tahu:
  - angka internal (ambang pemeriksaan, pengali AI);
  - cara kerja di dalam;
  - mitra atau pelanggan lain.
- Pertanyaan tentang akun sendiri (komisi, pembayaran, lamaran) diarahkan ke portal anggota.
- Tes unit memeriksa seluruh paket pengetahuan terhadap daftar istilah terlarang.
