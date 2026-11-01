# Metode "sampai puncak" — dipakai untuk setiap aplikasi AXTO

> Pemilik, 1 Nov 2026: "Dan kembangkan aplikasi yg lain jg sampai ke puncaknya dengan metode yg sama.. Kerjakan satu
> persatu" (REQUESTS 137). Contoh lengkap pertama: `docs/apps/CLIPPER-BLUEPRINT.md`.

Setiap aplikasi mendapat **satu** blueprint `docs/apps/<APLIKASI>-BLUEPRINT.md` yang mengikuti 12 bagian di bawah,
ditulis **sebelum** membangun, lalu dikerjakan fase demi fase. Tidak ada versi "sederhana": tolok ukurnya produk terbaik
di kategorinya (aturan `CLAUDE.md` §1).

## 1. Dua belas bagian wajib

1. **Perintah pemilik** dikutip apa adanya, dengan nomor REQUESTS.
2. **Tolok ukur**: 3–6 produk terbaik di kategorinya, matriks fitur (punya mereka / punya kita / rencana), dan
   keunggulan yang membuat kita menang (privasi di perangkat, BYOK, self-hosted, harga).
3. **Tiga permukaan, satu mesin**:
   - **Web** di axto.io: Next.js, kerja berat di peramban bila bisa;
   - **Desktop** Windows + Linux (+ macOS bila murah): Tauri v2 membungkus antarmuka yang sama, dengan akses berkas
     dan GPU lokal;
   - **Server** self-hosted lewat AXTO Setup (Docker, profil per merek GPU) untuk tim dan perusahaan.
   Satu format proyek di ketiganya, sinkron lewat akun axto.io bila pengguna mau.
4. **Alur kerja** dari masuk sampai keluar (ingest → proses → tinjau → hasil → bagikan → ukur). Setiap langkah punya
   batas, kesalahan yang jelas, dan bisa diulang dengan aman (id deterministik).
5. **Konektor BYOK**: semua layanan AI, cloud GPU, dan tujuan publikasi yang relevan, memakai kunci/akun pengguna sendiri
   dan disimpan terenkripsi (web: penyimpanan aman per akun; desktop/server: di mesin pengguna).
6. **AXTO Central GPU & AI**:
   - **Central Hub (BYOK, untuk semua):** router milik AXTO yang memilih penyedia milik pengguna. Kebijakannya: termurah,
     tercepat, privat (lokal saja), atau kualitas. Ia punya rantai cadangan, perkiraan biaya sebelum jalan, dan batas
     anggaran.
   - **Central Compute (GPU dan model milik AXTO, prabayar):** mengikuti aturan MANAGE di
     `BUSINESS-MASTER-BLUEPRINT.md` §5: hanya di dalam white label, kecuali pemilik membukanya untuk pelanggan langsung
     (keputusan pemilik; bawaan mati).
7. **Penyimpanan di axto.io (R2)**: apa yang disimpan, berapa lama, kuota per paket, harga kelebihan, perhitungan biaya
   R2 dan margin. Semua rekaman mengikuti `R2-DATA-BLUEPRINT.md` §3.
8. **Harga dan untung**:
   - batas per paket di `lib/plans.ts` (otomatis tampil di matriks paket);
   - edisi self-hosted di `AXTO-APPS-BLUEPRINT.md`;
   - kredit Central dengan harga biaya × 2,5 (margin minimal 60%);
   - harga grosir mitra.
   Selalu "dibayar dulu" (prabayar, tidak pernah berutang).
9. **Admin, member, paket**: semua yang dibutuhkan untuk mengoperasikan aplikasi ada di `/admin`. Fitur bisa dipakai di
   portal member dalam 10 bahasa. Lisensi lewat Otoritas Lisensi (Smart License, uji coba).
10. **Keamanan dan privasi**: data di perangkat bila bisa; tidak ada rahasia di bundle/log/prompt. Klaim publik harus
    benar (`BLUEPRINT-V4.md` §1).
11. **Fase dengan "selesai bila"**. Setiap fase satu PR: tes unit, e2e, uji peramban nyata desktop + ponsel, build
    desktop (Windows + Linux) dan image server bila disentuh, CI hijau, tayang.
12. **Promosi nyata**: setelah fase tayang, tangkapan layar dan animasi asli dari perekam panduan masuk ke perpustakaan
    promosi (`PROMOTION-BLUEPRINT.md`). Aplikasi hanya dipromosikan setelah e2e-nya hijau di deploy terakhir.

## 2. Gerbang kualitas setiap fase

- `cd dashboard && npx tsc --noEmit -p . && npm test` dan `bash tests/e2e/run.sh` hijau.
- Peramban nyata (Playwright) di 1440 px dan 390 px tanpa error konsol dan tanpa scroll horizontal.
- Bila desktop disentuh: build Tauri Windows (MSI/NSIS) dan Linux (AppImage + deb) di CI, uji buka-tutup otomatis.
- Bila server disentuh: `docker-smoke` mencakup image itu.
- Teks situs (`lib/apps.ts`, `lib/i18n-pages/*`) hanya menjanjikan yang dilakukan kode.

## 3. Hal yang butuh pemilik (tidak bisa dikerjakan AI)

- Sertifikat code signing EV (Windows) dan, bila dipilih, Apple Developer ID untuk macOS.
- Akun dan kunci penyedia untuk Central Compute bila pemilik membukanya.
- Keputusan harga akhir di Admin → Plans (blueprint memberi angka awal dengan perhitungan margin).

## 4. Urutan aplikasi (satu per satu, setelah Clipper)

Urutan memilih dampak pendapatan dan kesiapan kode lebih dulu. Pemilik bisa mengubahnya kapan saja; perubahan dicatat
di `WORK-QUEUE.md`.

| Urutan | Aplikasi | Alasan |
|---|---|---|
| 1 | **Clipper** | perintah pemilik 1 Nov; pasar terbesar (kreator), sudah ada versi web |
| 2 | **AI Studio = studio film dengan AI** (REQUESTS 141, `AI-STUDIO-BLUEPRINT.md`); GPU Studio dan Hybrid Studio menjadi bagian Studio Server-nya | perintah pemilik 1 Nov; memakai Central Hub dan GPU yang sama dengan Clipper |
| 3 | Orchestra AI | fondasi GPU; G1–G5 sedang dibangun (`BLUEPRINT-V4.md` §31.F) |
| 4 | Privacy Vault | sudah kuat di web; versi desktop dan server |
| 5 | Legal AI | korpus L1 ada; L2–L6 (`BLUEPRINT-V4.md` §32) |
| 6 | Compliance AI | bukti otomatis dan laporan audit |
| 7 | Guardian (Security) + Antivirus + Sentinel + SOC | satu keluarga keamanan |
| 8 | Edge AI | gerbang API untuk pelanggan pelanggan |
| 9 | Prompt Library, Mode Lokal, Connect | pelengkap |
