# AXTO Blueprint v4: Aplikasi Kelas Dunia

**Tanggal:** 30 Sep 2026 · **Status:** berjalan (lihat tabel status di §9)
**Menggantikan:** target fitur aplikasi cloud di `BLUEPRINT.md` §1–§22. Bagian infrastruktur, lisensi, pembayaran dan installer di dokumen lama tetap berlaku.

---

## 0. Kenapa blueprint baru

Pemilik menguji semua aplikasi dan menilainya **terlalu sederhana, bukan kelas dunia**. Audit kode membuktikan penilaian itu benar. Aplikasi cloud yang dijual di axto.io ternyata tipis:

| Aplikasi | Baris kode (halaman + logika) | Isi sebenarnya |
|---|---|---|
| AI Studio | 179 | Chat satu model, riwayat, peran. Tanpa lampiran, tanpa edit/regenerate, tanpa perbandingan model |
| Privacy Vault | 248 | Regex PII pada teks tempel. Tanpa file, PDF, gambar, aturan sendiri |
| Compliance Center | 267 | Satu form → satu jawaban AI. Tanpa daftar kontrol, tanpa bukti, tanpa skor |
| Security Analyst | 295 | Satu form → satu jawaban AI + ekstraksi IOC regex. Tanpa parser log, kasus, matriks ATT&CK |
| Clipper | 392 | Unggah → transkrip → daftar klip → ekspor potongan polos. **Tanpa preview, editor, caption terbakar, reframe wajah** (padahal dijanjikan di halaman publik) |
| Prompt Library | 415 | **53 prompt**, padahal halaman publik menulis "Hundreds of expert prompts" |
| Legal AI | 2.839 | Paling lengkap (36 workspace, 200+ yurisdiksi), tapi belum punya redline, playbook dan klausa |

Bandingkan dengan engine self-hosted yang jauh lebih besar (Guardian 15.9k baris, Orchestra 12.4k, SOC 6k). Yang dilihat pembeli justru aplikasi cloud di axto.io, dan itulah yang paling tipis.

**Prinsip v4**
1. **Setara pemimpin kategori** untuk pekerjaan inti, ditambah keunggulan AXTO: privasi, kunci milik sendiri (BYOK), dan pemrosesan di perangkat.
2. **Tidak ada fitur palsu.** Yang tertulis di halaman publik harus ada di aplikasi dan teruji. Yang belum ada ditandai "segera hadir", atau tidak ditulis sama sekali.
3. **Pemrosesan berat di perangkat pengguna**: video, dokumen, OCR, deteksi PII, parsing log, hash. Library disajikan dari origin sendiri (`public/vendor`) bila ukurannya ≤ 25 MB (batas Cloudflare Pages). Yang lebih besar diambil dari CDN resmi.
4. **Setiap aplikasi adalah workspace, bukan form.** Ada proyek/kasus yang tersimpan terenkripsi, bisa diedit dan diekspor.
5. **Setiap fitur punya uji.** Logika murni diuji unit test, alur penuh diuji E2E. Hasil uji dicatat di §9.

---

## 1. Model privasi — pernyataan yang jujur

Arsitektur saat ini (terverifikasi di kode):

| Jalur | Di mana diproses | Keterangan |
|---|---|---|
| Video (Clipper) | **Perangkat** | ffmpeg.wasm / WebCodecs / Canvas. Video tidak pernah diunggah. Hanya **audio** yang dikirim ke penyedia transkripsi milik member |
| Dokumen (Legal, Vault, Studio) | **Perangkat** | PDF.js, DOCX parser, OCR di browser |
| Deteksi PII (Vault) | **Perangkat** | Teks asli tidak pernah dikirim |
| IOC, parsing log, dekoder (Security) | **Perangkat** | Hanya yang dipilih member yang dikirim ke AI |
| Permintaan AI (BYOK/BYOX/BYOM) | Relay edge AXTO → penyedia pilihan member | Kunci member disimpan terenkripsi (AES-256-GCM). Relay **tidak menyimpan** isi permintaan dan tidak melatih model |
| Hasil yang disimpan | R2 terenkripsi | Kunci unik per akun (HKDF), AAD = kunci objek |
| Managed AI | Terkunci ("segera hadir") | Diaktifkan manual oleh admin saat siap (Admin → Managed AI) |

**Kalimat yang boleh dipakai di materi penjualan:** *"File, video dan dokumen Anda diproses di perangkat Anda sendiri. Permintaan AI berjalan dengan kunci milik Anda ke penyedia yang Anda pilih; AXTO hanya meneruskan, tidak menyimpan dan tidak melatih model dengan data Anda. Pekerjaan yang Anda simpan dienkripsi dengan kunci unik per akun."*

**Kalimat yang TIDAK boleh dipakai (belum benar):** "100% berjalan di sisi klien" untuk jalur AI. Kalimat itu baru benar setelah **Mode Lokal** (§8, fase 6) selesai. Pada mode itu browser berbicara langsung ke model di perangkat (Ollama / LM Studio / WebGPU) tanpa melewati server.

---

## 2. Clipper — setara OpusClip · Vizard · Descript · Submagic

**Pembanding:** OpusClip (virality score, AI reframe, template caption animasi, brand kit), Vizard (split-screen speaker), Descript (edit lewat teks, hapus filler word), Submagic (gaya caption + emoji), CapCut (template).

**Target v4 (wajib):**
- **Ingest panjang:** video berjam-jam. Audio diekstrak di browser, dipotong per ~20 menit, lalu ditranskripsi per bagian dengan offset waktu. Kuota dihitung **satu video**, bukan per bagian.
- **AI highlight** dengan **virality score + 4 sub-skor** (hook, alur, nilai, potensi tren), alasannya, judul hook, caption, hashtag. Bisa diarahkan dengan instruksi ("cari momen soal harga"), dengan preferensi durasi (pendek / sedang / panjang).
- **Editor WYSIWYG:** preview kanvas yang sama persis dengan hasil ekspor. Fitur editor:
  - timeline dengan pegangan trim, nudge ±0,1 s;
  - **edit lewat transkrip**: klik kata untuk lompat, hapus kata untuk memotong;
  - **hapus filler word** (um, uh, eh, anu, like, you know…) dan **hapus jeda sunyi** otomatis;
  - koreksi teks caption per kata.
- **Reframe:**
  - **auto (pelacakan wajah di perangkat, MediaPipe)** dengan penghalusan gerak;
  - geser manual;
  - **split-screen dua pembicara**;
  - *fit* dengan latar blur;
  - rasio 9:16, 1:1, 4:5, 16:9.
- **Caption animasi, 8 template** (Bold Pop, Karaoke, Highlight Box, Minimal, Neon, Typewriter, Subtle, Emoji). Bisa diatur: font, ukuran, warna, posisi, huruf kapital, kata per baris, emoji otomatis.
- **Overlay:**
  - judul hook di detik-detik awal;
  - progress bar;
  - **brand kit** (logo, warna, font) tersimpan.
- **Ekspor di perangkat:**
  - MP4 (H.264/AAC bila browser mendukung), atau WebM → MP4 lewat ffmpeg.wasm;
  - 720p/1080p;
  - **ekspor massal**;
  - SRT/VTT/TXT;
  - thumbnail PNG.
- **Repurpose:** bab YouTube, ringkasan, artikel blog, thread X, post LinkedIn, newsletter, semuanya dari transkrip.
- **Terjemahan caption** (AI) dengan timing tetap.
- **Proyek tersimpan** (semua kecuali video). Saat dibuka lagi, member cukup memilih ulang file videonya, lalu dicocokkan lewat nama + ukuran.

**Kriteria lulus:**
- Unit test: filler, silence, segmen potong, pelacakan halus, tata letak caption, penghitungan chunk.
- E2E: transkripsi berbagi kuota satu video lintas chunk; ekspor tidak memanggil server.

## 3. AI Studio — setara ChatGPT · Claude.ai · TypingMind · Open WebUI

**Target v4:**
- **Percakapan:**
  - streaming Markdown dengan blok kode ber-highlight + tombol salin;
  - **stop**, **edit & kirim ulang**, **regenerate** dengan **versi** (◀ 1/3 ▶);
  - **lampiran** PDF/DOCX/TXT/CSV/kode, diekstrak di browser.
- **Bandingkan model** berdampingan (2–3 model, satu prompt).
- **Asisten / persona** tersimpan (system prompt sendiri) dan **folder / pin**.
- **Pencarian** di semua percakapan.
- **Pengaturan:** suhu dan panjang maksimum.
- **Artifacts:** preview HTML/SVG/Mermaid di iframe sandbox.
- **Suara:** input suara (Web Speech) dan bacakan jawaban.
- **Ekspor:** MD/DOCX/PDF/JSON.
- **Estimasi token.**
- **Integrasi Prompt Library:** tombol `/` untuk menyisipkan prompt.
- **Pintasan keyboard.**

## 4. Prompt Library — setara PromptBase · AIPRM · Anthropic Prompt Library

**Target v4:**
- **Katalog ≥ 240 prompt** (10 per bidang × 24 bidang, di semua level). Klaim publik disesuaikan dengan angka nyata.
- **Jalankan di tempat** dengan hasil streaming, tidak hanya melompat ke Studio.
- **Bandingkan model.**
- **Prompt milik sendiri** (CRUD, variabel `{{…}}`), **koleksi**, favorit.
- **Profil variabel** (data perusahaan tersimpan dan terisi otomatis).
- **Rantai prompt / workflow:** keluaran satu langkah menjadi masukan langkah berikutnya.
- **Prompt optimizer:** AI memperbaiki prompt member.
- **Impor/ekspor JSON**, riwayat pemakaian.

## 5. Privacy Vault — setara Microsoft Presidio · Private AI · Nightfall · Acrobat Redact

**Target v4:**
- **Jenis data yang dideteksi (≥ 40):**
  - ID berbagai negara: NIK, NPWP, SSN, NINO, Aadhaar, PAN, NRIC, TFN, SIN, CPF, CURP…;
  - IBAN/SWIFT, kartu (Luhn), wallet kripto;
  - **secret & API key** (AWS, GitHub, Stripe, Google, Slack, JWT, private key);
  - tanggal lahir, alamat;
  - **nama orang** (kamus + heuristik).
- **Skor keyakinan + konteks.**
- **Aturan sendiri:** regex, kata kunci, daftar pengecualian.
- **File:**
  - TXT/MD/CSV/JSON dan DOCX;
  - **PDF dengan redaksi sejati**: halaman dirender ulang menjadi gambar dengan kotak hitam, sehingga teks asli benar-benar hilang;
  - **gambar dengan OCR** (Tesseract di browser).
- **Mode batch**: banyak file sekaligus.
- **Token reversibel** dengan **kunci terenkripsi kata sandi** (AES-GCM, WebCrypto) yang bisa diunduh.
- **Laporan audit** berisi jumlah per jenis, tanpa nilai aslinya.
- **"AI aman":** kirim versi redaksi ke AI, lalu balasannya dipulihkan otomatis.

## 6. Security Analyst — setara Microsoft Security Copilot · CrowdStrike Charlotte AI · Google SecOps · CyberChef

**Target v4:**
- **Manajemen kasus:** status, tingkat keparahan, catatan, artefak.
- **Parser log di browser:** JSON lines, syslog 3164/5424, CEF/LEEF, Windows Event XML, Apache/Nginx, CloudTrail, CSV. Hasilnya **tabel ternormalisasi + filter + timeline**.
- **IOC:**
  - defang/refang, deduplikasi, klasifikasi, abaikan IP privat;
  - **ekspor CSV / STIX 2.1**;
  - tautan enrichment: VirusTotal, AbuseIPDB, Shodan, URLhaus, OTX.
- **Matriks MITRE ATT&CK** (14 taktik), teknik yang terdeteksi disorot.
- **Generator rule:** Sigma, KQL, SPL, YARA, Suricata.
- **Analis phishing:**
  - parse `.eml`: rantai Received, SPF/DKIM/DMARC, From/Reply-To berbeda, URL;
  - hash lampiran (SHA-256 di browser).
- **Toolkit dekoder** ala CyberChef: base64, hex, URL, PowerShell `-enc` (UTF-16LE), gzip/deflate, XOR, ROT.
- **Laporan insiden:** MD/DOCX/PDF.

## 7. Compliance Center — setara Vanta · Drata · Secureframe · OneTrust

**Target v4:**
- **Pustaka kontrol nyata** per framework:
  - ISO 27001:2022 Annex A (93 kontrol);
  - SOC 2 (CC1–CC9 + kategori);
  - NIST CSF 2.0 (6 fungsi, 22 kategori);
  - PCI DSS v4 (12 requirement);
  - HIPAA safeguard;
  - pasal GDPR;
  - pasal UU PDP.
- **Workspace kesiapan:** per kontrol ada status, pemilik, tenggat, catatan, **bukti** (file terenkripsi). Skor kesiapan tampil per framework dan per domain.
- **Pemetaan lintas framework:** satu kontrol yang dikerjakan ikut menaikkan skor framework lain.
- **Risk register** dengan heatmap 5×5.
- **Policy center:** 20+ template kebijakan yang disesuaikan AI dengan profil organisasi, lengkap dengan versi dan status persetujuan.
- **Vendor risk:** kuesioner dan skor.
- **Ekspor audit:** CSV/DOCX.
- **AI per kontrol:** cara menerapkan, bukti yang diperlukan, dan gap analysis dari kondisi workspace.

## 8. Legal AI — setara Harvey · CoCounsel · Spellbook · Luminance

Sudah kuat (36 workspace, 200+ yurisdiksi, matter terenkripsi). Target tambahan v4:
- **Redline:** bandingkan dua versi kontrak di browser (diff per klausa + ringkasan perubahan oleh AI).
- **Playbook review:** posisi standar perusahaan → penyimpangan ditandai.
- **Pustaka klausa.**
- **Kalkulator tenggat / daluwarsa.**
- **Daftar sitasi untuk diverifikasi.**
- **Tanya-jawab lintas dokumen** dalam satu matter.

## 8b. Lintas aplikasi

- **Komponen bersama:** panel jalankan (stream + stop), menu ekspor, sidebar proyek (CRUD + cari), banner kunci AI.
- **Mode Lokal** (fase 6): penyedia "Model di perangkat ini". Browser memanggil `http://localhost:11434` (Ollama) / LM Studio langsung, atau WebGPU. Setelah mode ini selesai, janji "100% di sisi klien" menjadi benar untuk mode tersebut.
- **Managed AI:** tetap terkunci sampai admin menyalakannya secara manual saat siap jual.

---

## 9. Urutan pembangunan & status

| Fase | Aplikasi | Status | Bukti uji |
|---|---|---|---|
| 1 | Clipper v4 | ✅ selesai | 13 unit test (`tests/clipper.test.ts`); E2E kuota multi-bagian (`apps.e2e.ts`); uji browser 21/21 (lihat §10) |
| 2 | AI Studio v4 | ✅ selesai | 8 unit test (`tests/studio.test.ts`); uji browser 23/23; E2E penuh 81 tes (79 lulus, 2 dilewati: Docker) |
| 3 | Privacy Vault v4 | ✅ selesai | 22 unit test (`tests/vault.test.ts`); uji browser 40/40 (teks, tinjauan, AI Aman, kunci terenkripsi, aturan, DOCX/XLSX in-place, PDF image-only, OCR gambar, ZIP, laporan audit) |
| 4 | Security Analyst v4 | ⏳ | — |
| 5 | Compliance Center v4 | ⏳ | — |
| 6 | Prompt Library v4 (≥ 240 prompt) | ⏳ | — |
| 7 | Legal AI v4 (redline, playbook, klausa) | ⏳ | — |
| 8 | Mode Lokal (on-device AI) | ⏳ | — |
| 9 | Halaman penawaran situs + serah terima admin otomatis | ✅ selesai | `/acquire` (EN/ID), `/admin/acquisition`; E2E `acquisition.e2e.ts` 6/6; uji browser 11/11; panduan `docs/admin/SITE_SALE.md` |

Setiap fase: kode → unit test → E2E lokal penuh → commit & push → baris ini diperbarui.

---

## 10. Clipper v4 — yang dibangun & buktinya (30 Sep 2026)

**Bug produksi yang ditemukan sebelum rombak:** ffmpeg.wasm dimuat dari CDN, padahal worker-nya wajib berasal dari origin yang sama. Akibatnya ekstraksi audio dan ekspor MP4 **gagal di semua browser** ("ffFail"). Perbaikannya: JS ffmpeg disajikan dari `/vendor/ffmpeg`, sedangkan core 31 MB tetap dari CDN (jsdelivr → unpkg) lewat blob URL.

**Arsitektur:**

| Bagian | File |
|---|---|
| Logika murni (dengan unit test) | `lib/clipper/edit.ts`: potong filler/jeda/manual, pemetaan waktu sumber ↔ klip, halaman caption, emoji, jalur kamera (dead zone, batas kecepatan, cut), crop, chunk audio, impor SRT/VTT |
| Renderer kanvas tunggal (preview = ekspor) | `lib/clipper/render.ts` |
| Media di perangkat | `lib/clipper/media.ts`: ffmpeg.wasm (WORKERFS), MediaPipe multi-skala (frame penuh + ubin, NMS), MediaRecorder + WebAudio, konversi MP4, thumbnail, poster |

**Temuan penting — pelacakan wajah:** BlazeFace short-range saja tidak menemukan wajah berukuran podcast (≈30% tinggi frame). Model full-range juga tidak didukung FaceDetector MediaPipe (crash 2304 vs 896 anchor). Solusinya deteksi multi-skala dengan ubin: wajah ditemukan di **100% frame** pada video uji.

**Uji browser (Chromium, runtime lokal Cloudflare): 21/21 lulus**
- Pipeline: transkripsi (1× kuota) → deteksi klip dengan sub-skor.
- Autosave.
- Preview menggambar dan berjalan.
- Pelacakan wajah di perangkat menemukan wajah di 100% frame.
- Terjemahan caption.
- Potongan manual memendekkan klip.
- Render MP4 di perangkat (klip 11 dtk, 6,7 MB, real time).
- ffmpeg.wasm mengekstrak trek suara.
- SRT pada jam klip hasil ekspor, thumbnail PNG.
- Repurpose → bab.
- Proyek dibuka ulang dengan editnya utuh.
- Layar HP tanpa overflow.
- 0 error JavaScript.

**E2E API:** satu video panjang = satu slot kuota lintas semua bagian; bagian tanpa job ditolak (409); id job dan nomor bagian divalidasi.
