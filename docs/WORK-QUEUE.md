# AXTO — Antrean kerja tunggal (mulai dari sini)

> Pemilik, 1 Nov 2026: "Kerjakan satu persatu, jgn di tinggal yg sedang d kerjakan, d catat d blue print dengan logika
> yg sempurna … agar sy tidak selalu mengulang2. Rapikan blueprintnya agar tidak tercecer." dan "Kerjakan secara
> bertahap, jgn lompat2… Masukan saja sebagai urutan2 pekerjaan atau kerjakan saat sesi menunggu."

Ini **satu-satunya daftar urutan kerja** untuk semua repo pemilik (axto.io = guardian-ai, xaa.es = xaa, ulyah.com dan
situs saudaranya = ulyah.com, serta repo artikel). Setiap baris menunjuk ke **satu** dokumen rencana. Perintah baru
pemilik: dicatat dulu di `docs/REQUESTS.md`, rencananya ditulis di dokumen yang ditunjuk, lalu barisnya dimasukkan di
sini pada urutan yang benar.

## Aturan antrean

1. **AdSense selalu didahulukan** (kode AdSense, ads.txt, cuplikan, meta tag) sampai tayang dan audit **OK** — aturan
   tetap di `CLAUDE.md` repo ulyah.com.
2. **Satu pekerjaan sampai selesai**: kode → tes → PR → CI hijau → merge → terverifikasi tayang. Pekerjaan yang
   sedang berjalan tidak ditinggal; perintah baru dicatat dan masuk antrean.
3. **Saat menunggu CI/deploy** dikerjakan butir kecil dari bagian "Saat menunggu" (tidak boleh membuka pekerjaan besar).
4. **Penyimpanan selalu R2, tidak pernah D1**; tidak ada rahasia di repo, log, atau prompt.
5. Setiap fase punya kriteria "selesai bila" di dokumen rencananya; tanda ✅ hanya setelah kode, tes dan tayang.

## Sedang dikerjakan

| # | Pekerjaan | Rencana | Status |
|---|---|---|---|
| 2 | **AI Studio = studio film kelas dunia dengan AI** (REQUESTS 141, 143): mulai **S0** (chat → AI Chat, format `axto.film`, pustaka media R2, image Docker Windows = Linux), lalu S1 → S12 | `apps/AI-STUDIO-BLUEPRINT.md` §11 | perintah pemilik 1 Nov: blueprint dulu ✅, lalu dibangun; Clipper C1 ✅ tayang (#108) |

**Perintah 1 Nov (REQUESTS 141):** "bikinin dulu blueprint nya yg AI studio … baru implementasi". Blueprint ditulis
(`apps/AI-STUDIO-BLUEPRINT.md`). Clipper C1 tayang 1 Nov (#108), jadi AI Studio S0 kini pekerjaan berjalan; Clipper
C2–C9 dilanjutkan sesudahnya (baris 3a).

## Saat menunggu CI (butir kecil, dikerjakan di sela-sela)

| # | Pekerjaan | Rencana |
|---|---|---|
| W1 | ✅ Semua penawaran di semua situs ke hello@axto.io + WhatsApp +62 856-9123-4561 (REQUESTS 139): ulyah.com + 4 situs saudara (ulyah #397), xaa.es (xaa #38), axto.io sudah. **Sisa:** email notifikasi penawaran xaa.es ke hello@axto.io (butuh pengirim email; ikut baris 6). | `PROMOTION-BLUEPRINT.md` §9 |
| W2 | ✅ Cabang xaa dimulai ulang dari main (1 Nov). | — |
| W3 | ✅ Harga mengikuti pasar Asia (REQUESTS 140, #109); lifetime tetap sangat mahal (REQUESTS 142) · lifetime hanya lewat admin sampai deal (REQUESTS 144) 🔄 | `PRICING-BLUEPRINT.md` |
| W4 | Lifetime hanya untuk aplikasi yang terbukti berfungsi 100% (REQUESTS 142): saklar per aplikasi di Admin → Lifetime + syarat bukti (engine test, docker-smoke Windows + Linux, e2e, uji AXTO Setup) | `PRICING-BLUEPRINT.md` §2.2 |

## Berikutnya (urut, satu per satu)

| # | Pekerjaan | Rencana | Catatan urutan |
|---|---|---|---|
| 3a | Clipper C2–C9 (C1 ✅ #108) | `apps/CLIPPER-BLUEPRINT.md` §11 | setelah AI Studio, atau ditukar bila pemilik meminta |
| 3b | AI Chat sampai puncaknya (chat multi-model yang sekarang; REQUESTS 140) | blueprint `apps/AI-CHAT-BLUEPRINT.md` ditulis saat gilirannya | tolok ukur ChatGPT, Claude, Gemini |
| 3 | P3 dompet kredit + Otoritas Lisensi v4 + API mitra · P4 portal reseller · P5 portal white label (perintah 1 Nov, REQUESTS 132–134) | `BUSINESS-MASTER-BLUEPRINT.md` §4–§7 | syarat agar promosi reseller/white label menunjuk ke portal yang benar-benar jalan |
| 4 | **Mesin promosi otomatis** ke setiap member: perjalanan mingguan bahasa Inggris dari tahap awal, uji coba Smart License, lelang lisensi, tangga afiliasi → reseller → white label, portal member + email saat pendaftaran, 100–200 promosi A–Z, riwayat pengiriman di Admin, promosi usang dipisah dan dimatikan (REQUESTS 138) | `PROMOTION-BLUEPRINT.md` | fase PR1–PR4; posting reseller/white label menyala otomatis saat P4/P5 tayang |
| 5 | **Setiap aplikasi lain sampai puncaknya, satu per satu**, dengan metode yang sama seperti Clipper | `apps/PEAK-METHOD.md` (urutan aplikasi §4) | blueprint aplikasi ditulis dulu, baru dibangun |
| 6 | xaa.es: penawaran mulai US$500k, investor tersembunyi, portal P9, email notifikasi penawaran ke hello@axto.io (permintaan 75) | repo xaa `docs/BLUEPRINT.md` | perintah 1 Nov |
| 7 | Artikel sampai 60 per situs (22 situs, blog axto.io, axto.us, profity.in) | `BLUEPRINT-V4.md` §20 B, repo ulyah.com `docs/ADSENSE-BLUEPRINT.md` | perintah 31 Okt |
| 8 | Nama AXTO Digital Global + hapus placeholder `your-org` di produk self-hosted, installer, workflow (jangan sentuh `certs/`) | `BLUEPRINT-V4.md` §19 baris 4 | memicu build ulang image |
| 9 | Panduan bergambar + video untuk 9 aplikasi self-hosted lain | `BLUEPRINT-V4.md` §19 baris 12/18 | memakai perekam panduan; bahan promosi (baris 4) |
| 10 | ulyah.com: semua data ke R2 (sisa modul D1), audit terjemahan 5 situs, pelafalan Arab untuk anak | repo ulyah.com `docs/R2-DATA-BLUEPRINT.md` §5 | |

## Selesai baru-baru ini

- 1 Nov: **Clipper C1** (format proyek v5, aman antar perangkat, versi, kuota + log pemakaian) — #108 · blueprint AI Studio + riset dunia (REQUESTS 141) · harga pasar Asia disetujui pemilik (REQUESTS 140).
- 1 Nov: **Worker GPU G1–G5 (REQUESTS 136)** — #103, #105, #106, #107 · kontak penawaran → hello@axto.io (ulyah #397, xaa #38) · blueprint dirapikan (#104).
- 1 Nov: robots.txt tidak menutup Google di semua situs (ulyah #395, guardian-ai #101, axto.us #34) · Orchestra tidak
  berhenti setelah update (guardian-ai #102, REQUESTS 135) · Worker GPU G1 (guardian-ai #103, REQUESTS 136).
