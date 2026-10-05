# Penjualan situs AXTO (`/acquire`)

Halaman penawaran publik: **https://axto.io/acquire** — menu khusus 🏛️ **Beli AXTO** di header, footer, dan banner di beranda.
Pengaturan: **Admin → Business → Site sale** (`/admin/acquisition`).

## Yang terjadi saat pembeli membayar

1. Pembeli membuat akun / masuk (akun inilah yang akan menjadi administrator). Akun admin tidak bisa membeli.
2. Pembeli memilih metode (urutan: **PayPal**, kripto NOWPayments, kripto transfer dompet langsung, **wire BNI**, kartu Stripe).
3. Begitu pembayaran **terverifikasi** — capture PayPal, webhook Stripe/NOWPayments, konfirmasi on-chain stablecoin, atau admin menekan **Mark paid** untuk wire BNI — `lib/billing/activate.ts`:
   - menandai pesanan lunas + membuat invoice,
   - mengubah peran akun pembeli menjadi **admin** (jika "Grant administrator access automatically" aktif),
   - menandai situs **terjual** (checkout ditutup untuk orang lain),
   - mencatat `site.sale.paid` di Audit log dan mengirim email ke pembeli dan ke inbox admin.
4. Sesi pembeli langsung membawa peran admin (halaman `/acquire` memanggil `/api/acquire/status`, yang memuat ulang akun) — tidak perlu keluar-masuk.

### Pengaman
- **Uang uji (sandbox) tidak pernah memberi akses admin** dan tidak menandai situs terjual.
- Pembayaran kedua setelah situs terjual **tidak** memberi admin; pembeli diberi tahu akan di-refund, admin diberi tahu.
- **Refund** (Orders → Refund dengan "end access", atau tombol Refund di Site sale) mencabut peran admin pembeli dan membuka kembali penawaran.
- Rekening bank & nomor WhatsApp hanya ditampilkan kepada pembeli yang sudah masuk dan memulai checkout wire.

## Transfer manual BNI (default, bisa diubah di admin)

| | |
|---|---|
| Bank | BNI (Bank Negara Indonesia) — wondr by BNI multicurrency |
| Penerima | YUSRON EFENDI |
| SWIFT / BIC | BNINIDJA |
| Kode bank | 009 |
| Rekening USD | 2090571495 |
| Rekening IDR | 2090571484 |
| Mata uang lain | EUR 2090571542 · SGD 2090571508 · GBP 2090571520 · AUD 2090571519 · JPY 2090571564 · CNY 2090571531 · HKD 2090571553 · MYR 2090571575 · SAR 2090571586 · KRW 2090571597 · THB 2090571609 |
| WhatsApp bukti bayar | +62 856-9123-4561 |

(Sumber: rekening penerima BNI yang sama yang sudah dipublikasikan di ulyah.com.)

Panduan yang ditampilkan ke pembeli (EN/ID):
1. Transfer internasional (SWIFT BNINIDJA) ke BNI; dari bank Indonesia pilih "Transfer ke Bank BNI" (kode 009) dengan rekening IDR.
2. Isi nomor rekening sesuai mata uang (disarankan USD) dan nama penerima persis.
3. Tulis referensi pesanan (`ord_…`) di berita transfer.
4. Klik **"Saya sudah transfer"** dan kirim bukti via WhatsApp (tautan wa.me terisi otomatis).
5. Admin memverifikasi dana → **Site sale → Mark paid** → pembeli otomatis menjadi admin.

## Agar PayPal & kripto otomatis berjalan

Aktifkan kredensial **Live** di **Admin → Payment & email**:
- **PayPal**: Client ID + Client secret (+ Webhook ID) — tab Live di developer.paypal.com.
- **NOWPayments**: API key + IPN secret.
- **Kripto langsung**: alamat dompet (USDT TRC20/ERC20/BEP20, USDC, BTC, ETH, SOL) + Etherscan API key untuk konfirmasi otomatis.

Catatan jujur tentang PayPal: PayPal membatasi satu kali pembayaran (umumnya US$10.000–60.000 tergantung akun pembayar). Untuk harga penuh US$10.000.000, jalur yang realistis adalah wire bank (BNI) atau escrow, dan kripto untuk pembeli yang memilihnya; halaman memberi tahu pembeli hal ini dan menyarankan escrow untuk transaksi sebesar ini. Pembayaran PayPal juga dapat di-chargeback; kripto dan wire tidak.

## Serah terima setelah lunas
Akses admin otomatis; sisanya dikerjakan bersama pembeli sesuai daftar di halaman: domain axto.io, akun Cloudflare (Pages, D1, KV, R2, Workers, DNS), repositori GitHub, akun penyedia pembayaran, Resend, image Docker & pipeline rilis, merek/konten, dokumentasi.
