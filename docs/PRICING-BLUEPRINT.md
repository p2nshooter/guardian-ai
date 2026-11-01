# Harga mengikuti pasar Asia (REQUESTS 140) — usulan untuk diputuskan pemilik

> Pemilik, 1 Nov 2026: "Menurut sy aplikasi2 yg d buat skrg ini sangat sederhana sekali, harga nya g layak klo semahal
> itu... Coba perbaiki harga2 nya mengikuti harga pasaran ASIA."

Status: ✅ **disetujui pemilik 1 Nov 2026** ("Pasang usulan ini"). Angka dipasang sebagai bawaan di kode dalam satu PR
(revisi harga 2, `lib/price-rev.ts`; program mitra `TERMS_REV` 3). Lifetime tidak diturunkan (REQUESTS 142, §2.2). Admin tetap bisa mengubahnya kapan saja di Admin → Plans, Editions,
dan Lifetime. Harga lama yang sudah disimpan Admin di R2 dipindah sekali ke harga baru, dengan pola `priceRev` yang sama
seperti REQUESTS 132. Saklar on/off edisi tetap dipertahankan.

## 1. Acuan pasar (riset 1 Nov 2026)

| Produk | Harga di Asia | Catatan |
|---|---|---|
| ChatGPT Go (Indonesia) | Rp75.000/bulan (≈ US$4,5) | harga resmi sejak peluncuran di Indonesia |
| Google AI Plus (Indonesia) | Rp75.000/bulan | |
| Canva Pro (Indonesia) | Rp95.000/bulan; tahunan ≈ Rp64.000/bulan | halaman harga resmi Canva Indonesia |
| Google AI Pro (Indonesia) | ≈ Rp309.000/bulan | |
| CapCut Pro (Malaysia) | RM37,5/bulan | harga Indonesia berbeda menurut promo |
| OpusClip (global) | US$15 Starter, US$29 Pro | pesaing langsung Clipper |
| Kling AI (global) | US$10 Standard, US$37 Pro | generasi video |
| Zoho One (India) | ≈ ₹1.250–1.500 per karyawan/bulan | suite bisnis |
| Portkey (gateway AI, hosted) | US$49/bulan Production | pembanding Orchestra/Edge |

Sumber utama:
- marketech-apac.com (ChatGPT Go Indonesia);
- canva.com/id_id/harga;
- journalarta.com dan gptprompts.ai (Google AI Indonesia);
- productnation.co (CapCut MY);
- castmagic.io dan quso.ai (OpusClip);
- eesel.ai (Kling);
- codroiditlabs.com (Zoho One India);
- truefoundry.com (Portkey/LiteLLM).

Angka dicek ulang tepat sebelum dipasang.

**Inti:** alat AI konsumen di Asia berada di **Rp75.000–100.000/bulan (US$5–6)** untuk paket dasar, dan sekitar
**Rp300.000 (US$19)** untuk paket pro lengkap. Sebagian besar aplikasi AXTO bersifat **BYOK**: pengguna membayar AI-nya
sendiri, jadi wajar lebih murah dari layanan yang menanggung biaya AI.

## 2. Harga sekarang vs usulan

### 2.1 Paket cloud (axto.io), USD per bulan; tahunan = 10× bulanan (2 bulan gratis)

| Paket | Sekarang | Usulan | ≈ Rupiah | Alasan |
|---|---|---|---|---|
| Starter | US$19 | **US$5** | ≈ Rp80 rb | sejajar ChatGPT Go / Canva Pro |
| Pro | US$49 | **US$12** | ≈ Rp195 rb | di bawah Google AI Pro, di atas Canva Pro |
| Business (tim) | US$199 | **US$39** | ≈ Rp630 rb | tim kecil, setara beberapa kursi Canva Business |
| Enterprise | US$999 | **US$149** | ≈ Rp2,4 jt | perusahaan, tanpa batas |

- Biaya AXTO per member hampir nol (BYOK, proses di perangkat, R2 US$0,015/GB). Margin tetap di atas 90%.
- Batas per paket di `lib/plans.ts` (video Clipper, penyimpanan, aplikasi) tidak berubah dalam PR harga ini.

### 2.2 Edisi self-hosted (10 aplikasi) dan lifetime

- **Edisi tahunan/bulanan:** harga sekarang setara perangkat lunak perusahaan Amerika (contoh: Orchestra Starter
  US$34.900/tahun). Dipasang **× 0,1** dengan akhiran harga tetap rapi (34.900 → 3.490; 990 → 99). Contoh:
  - Studio Starter US$49/tahun;
  - Guardian Lite US$99/tahun;
  - Orchestra Starter US$3.490/tahun;
  - edisi Enterprise tetap di kisaran ribuan dolar, wajar untuk perusahaan.
- **Lifetime: tetap sangat mahal, tidak diturunkan.** Pemilik, 1 Nov 2026 (REQUESTS 142): "Harga lifetime pastikan sangat
  mahal jika aplikasi betul2 bisa d gunakan dan berfungsi 100%".
  - Harga tetap: US$24.900 per aplikasi untuk 1 perangkat, sampai US$5,9 juta untuk suite 100 perangkat (`lib/lifetime.ts`).
  - **Aturan:** lisensi lifetime sebuah aplikasi hanya dijual bila aplikasi itu terbukti berfungsi 100%: engine test,
    docker-smoke Windows + Linux, e2e, dan uji instalasi lewat AXTO Setup hijau di rilis terakhir. Saklar per aplikasi di
    Admin → Lifetime dibangun sebagai butir antrean W4 (`WORK-QUEUE.md`).

### 2.3 Program mitra (ikut ditinjau dalam PR yang sama)

- Uang masuk awal reseller (US$5.000) dan white label (US$60.000 + US$48.000/tahun minimal) dihitung dari harga eceran
  lama.
- Dengan eceran 4–5× lebih murah, angka itu dihitung ulang agar mitra tetap untung dan AXTO tetap dibayar lebih dulu.
  Usulan:
  - reseller US$1.500 masuk (kredit US$750); ambang tingkat US$7.500 / US$30.000; biaya tahunan US$360, dihapus mulai
    US$7.500;
  - white label US$20.000 masuk (kredit US$7.500) + minimal US$18.000/tahun; biaya platform US$8.000 (US$4.000 mulai
    US$85.000); ambang tingkat US$50.000 / US$170.000.
  - Hitungan untung mitra dan AXTO: `BUSINESS-MASTER-BLUEPRINT.md` §4.1 C–D.
- Persentase diskon grosir dan komisi afiliasi (20%) tidak berubah.

### 2.4 AI Studio (studio film)

- Mengikuti `apps/AI-STUDIO-BLUEPRINT.md` §8:
  - kreator memakai paket cloud di atas;
  - Studio (tim) dan Sewa Produksi untuk rumah produksi memakai harga alat studio profesional, ditetapkan saat fase S9
    dan S11.

## 3. Yang ikut berubah saat dipasang

- **Kode:** `lib/plans.ts`, `lib/editions.ts`, `lib/programs.ts` (bawaan). `lib/lifetime.ts` tidak berubah (REQUESTS 142).
- **Situs:** halaman /pricing, matriks paket, Admin → Plans, teks 10 bahasa yang menyebut harga.
- **Tes:** tes paket, edisi, lifetime, dan program.
- **Langganan berjalan** tetap dengan harga yang sudah dibayar sampai periodenya habis. Perpanjangan memakai harga baru
  (lebih murah).
