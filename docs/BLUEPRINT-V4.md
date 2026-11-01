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
| 4 | Security Analyst v4 | ✅ selesai | 9 unit test (`tests/security-v4.test.ts`); E2E briefing + kasus v4 (`apps.e2e.ts`); uji browser 66/66 (lihat §11); E2E penuh 91 tes (89 lulus, 0 gagal, 2 dilewati: Docker) |
| 5 | Compliance Center v4 | ✅ selesai | 8 unit test (`tests/compliance-v4.test.ts`); 2 E2E baru (`apps.e2e.ts`); uji browser 53/53 (lihat §12); E2E penuh 93 tes (91 lulus, 0 gagal, 2 dilewati: Docker) |
| 6 | Prompt Library v4 (240 prompt) | ✅ selesai | 4 unit test katalog (`tests/prompts-catalog.test.ts`); 3 E2E baru (`prompts.e2e.ts`); uji browser 42/42 (lihat §13); E2E penuh 96 tes (94 lulus, 0 gagal, 2 dilewati: Docker) |
| 7 | Legal AI v4 (redline, playbook, klausa, tenggat, sitasi, tanya perkara) | ✅ selesai | 7 unit test (`tests/legal-v4.test.ts`); 1 E2E baru (`legal.e2e.ts`); uji browser 51/51 (lihat §14); E2E penuh 97 tes (95 lulus, 0 gagal, 2 dilewati: Docker) |
| 8 | Mode Lokal (on-device AI) | ✅ selesai | 9 unit test (`tests/local-mode.test.ts`); 4 E2E (`local-mode.e2e.ts`); uji browser 45/45 (lihat §16) |
| 9 | Halaman penawaran situs + serah terima admin otomatis | ✅ selesai | `/acquire` (EN/ID), `/admin/acquisition`; E2E `acquisition.e2e.ts` 6/6; uji browser 11/11; panduan `docs/admin/SITE_SALE.md` |
| 10 | AXTO Connect — API developer & realtime (REST, SSE, WebSocket, long polling, streaming HTTP/2·3, Connect kompatibel gRPC, WebRTC, webhook, MCP, SDK) | ✅ selesai | 11 unit test (`tests/connect.test.ts`); 9 E2E (`connect.e2e.ts`); uji browser 55/55 (lihat §15) |

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

---

## 11. Security Analyst v4 — yang dibangun & buktinya (30 Sep 2026)

**Model kerja:** semua berpusat pada **kasus** (judul, status, tingkat keparahan, tag, ringkasan, catatan, bukti, putusan IOC, temuan ATT&CK analis, percakapan AI). Kasus tersimpan otomatis (±1,2 detik setelah perubahan) ke riwayat terenkripsi per member, bisa dicari, diganti nama, diduplikasi, dihapus, dan dibuka lewat `?open=<id>` (juga dari **My files**). Kasus format lama (v3) tetap terbuka: percakapannya dipertahankan, konteksnya jadi catatan.

**Yang berjalan di perangkat (browser):**

| Bagian | Isi | File |
|---|---|---|
| Parser log | JSON/JSONL, CloudTrail, Windows Event XML, syslog 3164/5424, CEF, LEEF, Apache/Nginx, CSV (+ teks) → satu tabel event ternormalisasi, timeline, top host/user/IP/event, deteksi brute force (gagal lalu berhasil) | `lib/security/parse.ts` |
| Deteksi & ATT&CK | 46 rule perilaku, 14 taktik, 132 teknik; severity event dinaikkan mengikuti deteksi terburuk; matriks menandai sumber (rule / analis / AI) | `lib/security/attack.ts` |
| IOC | ekstraksi (IPv4/IPv6, domain, URL, e-mail, hash, CVE, file, registry), defang/refang, IP privat & dokumentasi ditandai, putusan analis, tautan enrichment, CSV / blocklist / STIX 2.1 | `lib/security/ioc.ts` |
| Phishing | parse `.eml` (MIME, QP/base64, encoded-word), jalur Received, SPF/DKIM/DMARC, From ≠ Reply-To / Return-Path, tautan menipu, peniruan merek, lampiran berisiko + SHA-256; e-mail mentah **tidak** disimpan | `lib/security/eml.ts` |
| Dekoder | 22 operasi ala CyberChef + Magic (Base64, hex, URL, HTML, PowerShell `-enc`, UTF-16LE, gzip/deflate, XOR, ROT, JWT, hash…); hasil bisa dijadikan bukti | `lib/security/decode.ts` |
| Rule deteksi | Sigma, KQL, SPL, YARA, Suricata dari IOC publik + deteksi | `lib/security/rules.ts` |
| Laporan | Markdown, Word, STIX, cetak / PDF; IOC di-defang | `lib/security/case.ts` |

**AI:** model milik member (BYOX) hanya menerima **ringkasan kasus** (deteksi, indikator, event kunci, catatan; maks. 16.000 karakter) — bukan log mentah. Diuji: permintaan ke model tidak memuat `<EventData>` atau isi MIME e-mail.

**Batas jujur:** satu kasus maks. 4 juta karakter teks bukti (satu item riwayat ≤ 5 MB); file biner hanya di-hash, tidak dianalisis isinya.

**Portal:** member — aplikasi, daftar fitur di Apps (10 bahasa), My files; admin — kelayakan paket ikut matriks paket (`/admin/plans`); publik — `/apps/security` dengan JSON-LD `SoftwareApplication` (featureList, penawaran) + `HowTo` + breadcrumb.

**Uji browser (Chromium, runtime lokal Cloudflare): 66/66 lulus** — gating paket, kasus v3, sampel insiden (23 event, 16 deteksi, 19 teknik), autosave + deep link + reload, filter deteksi, detail event, IOC + STIX, matriks, phishing, Magic PowerShell, bukti dari dekoder, 4 bahasa rule, AI (briefing, bukan log mentah), laporan MD/DOCX, status/tag bertahan, CEF tempel, hash file biner, hapus kasus, ponsel tanpa overflow, UI ID/AR/JA/DE, SEO halaman publik.

---

## 12. Compliance Center v4 — yang dibangun & buktinya (30 Sep 2026)

**Model kerja:** satu **program kepatuhan** per organisasi: profil (organisasi, sistem, data), framework dalam cakupan, status setiap kontrol, risk register, kebijakan, vendor, dan percakapan AI. Tersimpan otomatis ke riwayat terenkripsi (cari, ganti nama, duplikat, hapus, `?open=`); laporan v3 lama tetap terbuka.

| Bagian | Isi | File |
|---|---|---|
| Pustaka kontrol | **342 kontrol nyata**: ISO/IEC 27001:2022 Annex A (93, 4 tema), SOC 2 TSC (33 CC + A/C/PI/P), NIST CSF 2.0 (22 kategori, 6 fungsi), PCI DSS v4.0.1 (63 sub-requirement), HIPAA Security Rule + Breach Notification (48), GDPR (29 pasal operatif), UU PDP (26). Judul diringkas — teks resmi tetap milik penerbit | `lib/compliance/controls.ts` |
| Pemetaan lintas framework | 40+ tema; kontrol setara ditampilkan per kontrol; "salin status & bukti" hanya ke kontrol yang belum dimulai, dan hanya menjadi *Sedang berjalan* (tidak pernah otomatis *Diterapkan*) | `controls.ts`, `workspace.ts` |
| Workspace | status, pemilik, tenggat, catatan, justifikasi N/A (untuk SoA), file bukti terenkripsi (≤ 3 MB per file, item riwayat tersendiri; AI tidak pernah menerima isinya) | `components/compliance/Controls.tsx` |
| Skor | kesiapan per framework & domain (diterapkan + ½ berjalan, N/A dikecualikan), bukti, lewat tenggat | `workspace.ts` |
| Risiko | register + heatmap 5×5 inheren / residual, penanganan, pemilik, tenggat, kontrol terkait | `Risks.tsx` |
| Kebijakan | **26 templat** dipetakan ke kontrol yang dibuktikannya; draf AI dari profil; versi + catatan; draf → ditinjau → disetujui (nama penyetuju wajib) → dipensiunkan; Word / Markdown | `lib/compliance/library.ts`, `Policies.tsx` |
| Vendor | kuesioner 20 pertanyaan berbobot, skor, tier inheren & residual, jadwal tinjauan | `Vendors.tsx` |
| AI | 8 mode (gap, remediasi, kebijakan, kuesioner, jelaskan, **terapkan kontrol**, **penilaian risiko**, **tinjauan vendor**) dengan ringkasan program ≤ 16.000 karakter + kontrol fokus | `lib/compliance/task.ts`, `Advisor.tsx` |
| Ekspor | laporan kesiapan (MD / Word / cetak-PDF), CSV kontrol (anti formula-injection), **Statement of Applicability ISO 27001** (Word / MD), CSV risiko & vendor, backup / impor JSON | `Reports.tsx` |

**Batas jujur:** penilaian mandiri — bukan opini audit atau sertifikasi; nomor pasal UU PDP perlu diverifikasi terhadap teks resmi (dicatat di aplikasi).

**Portal:** member — aplikasi, fitur di Apps (10 bahasa), My files (program + bukti); admin — kelayakan paket di matriks paket; publik — `/apps/compliance` dengan JSON-LD `SoftwareApplication` (featureList, penawaran) + `HowTo`.

**Uji browser (Chromium, runtime lokal Cloudflare): 53/53 lulus** — program contoh, 4→5 framework, 93 kontrol ISO, cari, detail kontrol, unggah & unduh bukti utuh, pemetaan + salin ke SOC 2 A1.2, AI dengan fokus kontrol (bukti tidak terkirim), risiko + heatmap, 26 templat, draf AI kebijakan, versi, persetujuan wajib nama, Word, vendor 100 % → tier Medium, laporan, CSV (1 + 231 baris), SoA, backup + impor JSON, persistensi setelah reload, laporan v3, bukti tersembunyi dari daftar program, deep link bukti, hapus, ponsel tanpa overflow, UI ID/AR/JA/DE, SEO halaman publik.

---

## 13. Prompt Library v4 — yang dibangun & buktinya (30 Sep 2026)

| Bagian | Isi | File |
|---|---|---|
| Katalog | **240 prompt** = 24 bidang × 10 (3 Basic, 3 Pro, 2 Premium, 2 Elite per bidang); setiap `{{variabel}}` terdeklarasi; halaman SEO per prompt otomatis (`/prompts/<bidang>/<id>`, sitemap) | `lib/prompts/part-a…d.ts`, `catalog.ts` |
| Keamanan isi premium | isi template hanya dikirim untuk level yang dibuka paket; saat dijalankan, **prompt katalog diisi di server** dari id + nilai, dan level dicek lagi di server (akun gratis → 402 untuk Premium) | `lib/prompts/task.ts`, `app/api/prompts` |
| Jalankan di tempat | streaming dari model member, pertanyaan lanjutan, **bandingkan hingga 3 model** berdampingan, simpan hasil ke riwayat terenkripsi, buka di AI Studio | `components/prompts/Runner.tsx` |
| Prompt milik sendiri | CRUD, deteksi `{{variabel}}`, duplikat, **optimizer AI** (versi perbaikan bisa langsung dipakai) | `Mine.tsx` |
| Koleksi & favorit | koleksi bernama + Favorit bawaan, untuk prompt katalog dan milik sendiri | `Collections.tsx` |
| Workflow | rantai ≤ 12 langkah (prompt katalog, prompt sendiri, atau instruksi tertulis); tiap langkah menerima hasil sebelumnya (`{{previous}}` atau konteks) | `Chains.tsx` |
| Profil variabel | beberapa profil, satu aktif; nilai mengisi `{{variabel}}` yang cocok otomatis | `Profiles.tsx` |
| Riwayat & portabilitas | hasil tersimpan; ekspor / impor seluruh pustaka (JSON, digabung tanpa duplikat) | `History.tsx`, `lib/prompts/library.ts` |

**Kebijakan penyimpanan:** pustaka pribadi (favorit, prompt sendiri, koleksi, workflow, profil) adalah satu item terenkripsi ≤ 200 KB yang **boleh disimpan semua akun**, termasuk gratis; menyimpan hasil run tetap memakai kuota penyimpanan paket.

**Uji browser (Chromium, runtime lokal Cloudflare): 42/42 lulus** — gating server (402 Premium untuk akun gratis, Basic diisi di server), 240 prompt, cari, filter bidang & level, favorit, profil mengisi variabel, run streaming, template diisi di server, follow-up, simpan hasil, bandingkan 2 model, prompt sendiri + optimizer, koleksi, workflow contoh 3 langkah dengan `{{previous}}`, riwayat, ekspor/impor, persistensi setelah reload, kartu terkunci untuk akun gratis, ponsel tanpa overflow, UI ID/AR/JA/DE, halaman publik "240 expert prompts".

**E2E penuh:** 96 tes — 94 lulus, 0 gagal, 2 dilewati (Docker). Catatan jujur: satu run sebelumnya sempat gagal di 5 tes `lifetime` (checkout admin menjawab 503, lalu tes berikutnya ikut gagal); tidak terulang saat file itu dijalankan sendiri, bersama `acquisition` + `card-payments`, bersama tujuh file sebelumnya, maupun di run penuh berikutnya. Pesan assert kini memuat isi respons supaya penyebabnya langsung terlihat bila muncul lagi di CI.

## 14. Legal AI v4 — yang dibangun & buktinya (30 Sep 2026)

Tujuh tab di `/app/legal`: **Workspace AI** (36 workspace yang sudah ada) + enam alat baru yang **berjalan di perangkat** (teks tidak dikirim ke mana pun). Setiap alat punya tombol "Lanjutkan dengan AI" yang menyiapkan workspace AI yang cocok (workspace, input, dokumen, permintaan) — member memeriksa lalu menekan Jalankan. Tautan langsung: `/app/legal?tool=redline|playbook|clauses|deadlines|citations|ask`.

| Alat | Isi | File |
|---|---|---|
| Redline | dua versi dipasangkan per klausa (nomor + kemiripan), diff kata (Myers), status sama/berubah/ditambah/dihapus/dipindah, tanda **material** (angka, kata kewajiban, negasi, topik risiko); ekspor HTML `<ins>/<del>`, Word, Markdown; ke AI → `doc-compare` (atau `ask` bila terkunci) hanya dengan dua versi itu | `lib/legal/redline.ts`, `components/legal/tools/Redline.tsx` |
| Playbook | 5 playbook bawaan (NDA, SaaS pelanggan/pemasok, DPA, kerja) — posisi standar + cadangan + frasa berisiko + cek otomatis (batas tanggung jawab dalam bulan biaya, jangka tahun/bulan/hari, hukum yang berlaku, kata wajib); **playbook sendiri** (buat, duplikat, ubah, hapus); temuan tidak ada/menyimpang/periksa/OK dengan tingkat; ekspor Word/MD/CSV; ke AI → `contract-review` dengan playbook di input | `lib/legal/playbook.ts`, `Playbook.tsx` |
| Pustaka klausa | 24 jenis klausa, varian Seimbang / berpihak / singkat, catatan penyusunan, isi `[placeholder]` (bersarang pun aman); **klausa sendiri**; ke AI → `contract-draft` (atau `ask`) | `lib/legal/clauses.ts`, `Clauses.tsx` |
| Tenggat | hari kalender, hari kerja, minggu, bulan (akhir bulan & kabisat), tahun, jam; setelah/sebelum; geser ke hari kerja berikutnya / sebelumnya / *modified following* / tidak; hari libur berpola tetap untuk ID, US (federal + observed), Inggris & Wales (substitute day), SG, AU + **hari libur tambahan** yang ditetapkan tiap tahun (tidak ditebak); 19 preset bersumber (banding/kasasi/PK/verzet/PTUN/UU PDP 3×24 jam, FRCP/FRAP, CPR, Limitation Act, GDPR Art. 33 & 12(3), NIS2); daftar per perkara dengan sisa hari, pengingat, ekspor **.ics (RFC 5545, VALARM)** dan CSV | `lib/legal/deadlines.ts`, `Deadlines.tsx` |
| Sitasi | pengenal sitasi ID (UU/PP/Perpres/POJK/SEMA, Pasal … KUHPerdata, putusan MA & MK), US (reporter, U.S.C., C.F.R., FRCP), UK (neutral & law reports, Act + section), EU (Regulation/Directive, Article GDPR…, C-/T-, ECLI), SG, MY, AU, CA, IN, NZ, HK, traktat; digabung bila berulang; tautan ke sumber resmi/gratis (Cornell LII, CourtListener, BAILII, legislation.gov.uk, EUR-Lex, CURIA, JDIH BPK, Direktori Putusan MA …); status terverifikasi/salah/tidak ditemukan + catatan **disimpan per perkara**; ke AI → `citation-check` | `lib/legal/citations.ts`, `Citations.tsx` |
| Tanya perkara | seluruh dokumen perkara dipotong jadi kutipan ~900 karakter bertumpuk, diperingkat **BM25** (+ frasa dalam tanda kutip), maks. 3 kutipan per dokumen; hanya kutipan terbaik (berlabel `[Doc n ¶m]`) yang dikirim ke AI `ask` | `lib/legal/retrieve.ts`, `AskMatter.tsx` |

**Penyimpanan (non-custodial, terenkripsi per akun):** playbook & klausa sendiri = satu objek `legal/<uid>/library.enc` (≤ 400 KB, divalidasi di browser dan server, dihitung ke kuota) lewat `GET/PUT /api/legal/library`; tenggat dan cek sitasi ikut di objek perkara (`PATCH /api/legal/matters/:id`, divalidasi, dihitung ke kuota). Tidak ada pengaturan admin baru: alat tersedia di semua paket yang punya Legal AI; workspace AI tujuan tetap mengikuti gating paket yang sudah ada (6 inti di Starter, 36 mulai Pro).

**Jujur soal batas:** hasil alat adalah bantuan, bukan nasihat hukum; preset tenggat adalah titik awal (aturan dan penetapan pengadilan harus dicek); hari libur keagamaan/lunar dan cuti bersama harus ditambahkan sendiri; tautan sitasi membuka pencarian sumber — verifikasi tetap oleh member.

**Uji browser (Chromium, runtime lokal Cloudflare): 51/51 lulus** — deep link, dokumen perkara bisa dipilih, redline (4 berubah, 1 ditambah, material ditandai, ins/del), ekspor HTML & Word, hand-off ke AI hanya dengan dua versi, playbook (5 tidak ada · 2 menyimpang), playbook sendiri tersimpan, 24+ klausa, placeholder terisi, klausa sendiri, tenggat 14 hari melewati 17 Agustus → 18 Agustus 2026, 5 hari kerja melewati akhir pekan + libur, .ics dengan pengingat, 5 sitasi + tautan Cornell, status tersimpan, tanya perkara lintas 3 dokumen dengan sorotan, hanya kutipan yang ke AI, semua tetap ada setelah reload, ponsel tanpa overflow di 7 tab, UI ID/AR/JA/DE/ZH, halaman publik menyebut redline & tenggat.

---

## 15. AXTO Connect — yang dibangun & buktinya (30 Sep 2026)

Permintaan pemilik: website / aplikasi lain harus bisa terhubung **maksimal dan live** (SSE, WebRTC, long polling, HTTP/2 streaming, gRPC streaming, WebTransport, "tambahkan yang lain"). Pembanding: Pusher / Ably (realtime), Stripe (kunci API, webhook bertanda tangan), Twilio / LiveKit (WebRTC), Buf / connectrpc (gRPC-kompatibel), MCP server (agen AI).

| Transport | Endpoint | Catatan |
|---|---|---|
| REST (JSON) | `POST/GET /api/v1/events`, `GET /api/v1/me`, `POST /api/v1/tokens` | CORS per kunci (origin yang diizinkan), batas per menit per paket (`X-RateLimit-*`) |
| Server-Sent Events | `GET /api/v1/events/stream` | `retry`, heartbeat, lanjut dengan `Last-Event-ID`, koneksi 55 d lalu tersambung ulang otomatis |
| Long polling | `GET /api/v1/events/poll?wait≤30` | menjawab begitu event tiba; kursor = id event |
| WebSocket | `GET /api/v1/ws` (subprotokol `axto.v1`, token lewat `axto.token.<t>`) | subscribe / publish / ping dua arah, sesi 10 menit lalu sambung ulang; patch `scripts/patch-worker.mjs` agar router next-on-pages meneruskan respons 101 |
| Streaming HTTP/2 & HTTP/3 | `POST /api/v1/ai/run` (`sse` / `ndjson` / `json` / `text`) | AI pada kunci model member sendiri (BYOK), memakai inti yang sama dengan AI Studio (`lib/ai/run-core.ts`) |
| Connect (kompatibel gRPC) | `POST /api/v1/connect/axto.connect.v1.*`, `.proto` di `/api/v1/axto.proto` | unary JSON + server-streaming (envelope 5 byte, end-stream) untuk connect-es / connect-go / Swift / Kotlin |
| WebRTC | `POST /api/v1/rtc/rooms` | signaling lewat log event, STUN Cloudflare selalu, TURN Cloudflare Realtime bila admin mengisi kunci (kredensial per room, kedaluwarsa) |
| Webhook | Developers → Webhook | HMAC-SHA256 `X-AXTO-Signature: t=…,v1=…`, hanya HTTPS host publik (tanpa IP, tanpa kredensial, tanpa redirect), coba ulang 1m/5m/30m/2j/6j/24j, dijeda setelah 20 gagal, log pengiriman, kirim uji, rotasi rahasia |
| MCP | `POST /api/v1/mcp` (Streamable HTTP, 2025-06-18) | 8 alat: ai_run, events_publish, events_list, legal_deadline, legal_citations, contract_redline, pii_scan, prompt_library_search |
| SDK JS | `/sdk/axto-connect.js` | WebSocket → SSE → long polling otomatis, lanjut dari kursor, `ai.stream`, `rtc.join` |

**Keamanan & non-custodial:** kunci `axto_sk_…` 256-bit hanya ditampilkan sekali, disimpan sebagai SHA-256; token stream `axto_st_…` (HMAC, kunci diturunkan HKDF dari rahasia server) terbatas kanal & kedaluwarsa, untuk browser; kunci rahasia di URL ditolak; isi event dienkripsi per akun (AES-GCM, AAD per member) dan dihapus setelah masa retensi (bawaan 7 hari, admin 1–90); rahasia webhook terenkripsi. Paket: Starter 2 kunci / 60 rpm / 1 webhook · Pro 5 / 300 / 5 · Business 20 / 1.200 / 20 · Enterprise 100 / 6.000 / 50 (di `lib/plans.ts` → matriks paket). Admin → Connect: saklar on/off (503 seketika), retensi, TURN, statistik 24 jam, semua kunci (cabut), webhook gagal (jeda). Portal member: `/app/developers` (Ringkasan, Kunci API, Webhook, Konsol live, Uji WebRTC) dalam 10 bahasa. Publik: `/developers` (EN/ID, JSON-LD, sitemap, tautan footer), OpenAPI 3.1 di `/api/v1/openapi.json`.

**Jujur soal batas:** WebTransport **tidak** ditawarkan — edge Cloudflare belum mendukungnya; SDK memakai WebSocket → SSE → long polling. gRPC native butuh trailer HTTP/2 yang tidak bisa dikirim runtime edge, jadi dipakai protokol Connect (kompatibel gRPC, dari `.proto` yang sama). WebRTC di jaringan sangat ketat butuh TURN, yang aktif setelah admin memasukkan kunci Cloudflare Realtime.

**Uji browser (Chromium, runtime lokal Cloudflare): 55/55 lulus** — akun gratis melihat syarat paket; kunci dibuat & hanya tampil sekali (tidak muncul lagi setelah reload, admin hanya melihat prefiks); webhook dengan rahasia sekali tampil; konsol live SSE & long polling menerima event dari portal dan dari server (filter kanal bekerja); SDK di browser menerima event lewat WebSocket, SSE dan long polling dengan token stream (token tidak bisa publish); dua tab terhubung WebRTC peer-to-peer dan pesan data channel terkirim; UI ID/DE/JA/AR (RTL); ponsel 390 px tanpa overflow di 5 tab, admin dan halaman publik; admin mematikan API → 503 + pemberitahuan di portal, menyalakan lagi → 200; halaman publik: JSON-LD, canonical, tautan footer, sitemap, OpenAPI; tanpa error konsol.

---

## 16. Mode Lokal — yang dibangun & buktinya (1 Okt 2026)

Member menghubungkan **Ollama, LM Studio, atau server lain yang kompatibel OpenAI** (llama.cpp, Jan, LocalAI, vLLM) di komputernya sendiri atau jaringan lokalnya (Settings → My AI keys → Local Mode). Di setiap aplikasi, pemilih model menampilkan **“Perangkat ini (Mode Lokal)”**.

- **Alur:** semua aplikasi memanggil `aiFetch` (`lib/ai/client-run.ts`). Bila penyedia = perangkat ini, prompt dirakit **di browser** dengan task handler yang sama dengan server (`lib/ai/run-build.ts`, `lib/ai/local-run.ts`) lalu dikirim langsung ke `http://localhost…/v1/chat/completions`; jawaban di-stream kembali dalam format yang sama dengan `/api/byox/run`, jadi semua aplikasi bekerja tanpa diubah.
- **Legal AI:** instruksi ahli 36 workspace tetap di server. Browser mengirim permintaan ke `POST /api/byox/prepare` dengan **semua isi diganti placeholder** (pesan, nama & isi dokumen, kolom teks bebas, kota); hanya konfigurasi (workspace, kode negara/provinsi, area, gaya sitasi, opsi pilihan) yang terkirim. Server merakit instruksi di sekitar placeholder, browser mengembalikan isi aslinya (`lib/ai/local-mask.ts`). Uji unit membuktikan hasilnya **identik** dengan prompt server dan server tidak menerima isi.
- **Prompt Library:** template katalog diunduh dari `GET /api/prompts/:id` (tetap dijaga level paket), nilai variabel diisi di browser.
- **Paket & admin:** `localMode` di `lib/plans.ts` (semua paket berbayar) → baris matriks paket + fitur paket (10 bahasa); Admin → Settings: saklar Local Mode (diaudit); `/api/auth/me` melaporkan ketersediaan.
- **Jujur soal batas:** yang tidak lewat AXTO adalah **permintaan AI**; yang member pilih untuk disimpan (riwayat obrolan, perkara, kasus) tetap tersimpan terenkripsi di akunnya seperti biasa. Riset web langsung tidak tersedia di Mode Lokal; transkripsi audio Clipper tetap memakai kunci transkripsi member. Hanya alamat localhost / jaringan lokal yang diterima.

**Uji browser (Chromium, runtime lokal Cloudflare): 45/45 lulus** — member tanpa kunci cloud sama sekali; alamat internet ditolak; server tanpa CORS → penjelasan jelas; model ditemukan, diuji, disimpan; AI Studio, Legal AI, Prompt Library, Security Analyst menjawab dari model lokal; tidak ada `/api/byox/run`; `/api/byox/prepare` hanya melihat placeholder; server mati → pesan jelas; admin mematikan → pemilih tidak menawarkan lagi; ID/AR/DE; ponsel 390 px tanpa overflow.

---

## 17. Perintah pemilik 1 Okt 2026 — rencana kerja

### A. Terjemahan portal member konsisten (temuan: Legal AI campur bahasa)
- **Metode:** setiap halaman portal member dirender dalam EN dan 9 bahasa lain; setiap teks yang tetap sama persis dengan EN (selain nama merek, kode, sitasi, angka) dilaporkan sebagai belum diterjemahkan. Legal AI diperiksa per tab, per workspace, per kolom.
- **Legal AI:** nama & deskripsi 36 workspace, kelompok, kolom (label, petunjuk, opsi), area hukum, yurisdiksi, gaya sitasi, audiens, kedalaman, dan semua alat v4 — dalam 10 bahasa, lewat kamus `lib/i18n-pages/*` yang dicek `tests/i18n-pages.test.ts`.
- **Selesai bila:** crawler terjemahan 0 temuan di semua halaman member untuk 10 bahasa; uji unit kelengkapan kamus lulus.

### B. Penawaran akuisisi US$10.000.000
- Harga tunggal di `lib/acquisition.ts` (bawaan US$10.000.000) dipakai di halaman, JSON-LD, checkout, admin, dokumen dan tes — tidak ada angka lain.
- Halaman `/acquire` kelas enterprise: ringkasan investasi, metrik nyata dari kode (aplikasi, produk self-hosted, bahasa, gateway, tes), apa saja yang diserahkan, **panduan pembeli langkah demi langkah** (LOI → data room → due diligence → pembayaran → serah terima otomatis), jadwal serah terima, keamanan & kepatuhan, FAQ; animasi halus (muncul saat digulir, penghitung angka, kilau gradien) yang menghormati `prefers-reduced-motion`.
- **Jujur soal pembayaran:** untuk US$10 juta, transfer bank (wire) dan escrow adalah jalur realistis; batas transaksi PayPal dijelaskan apa adanya.

### C. Kesetaraan cloud ↔ Docker (Windows & Linux)
- **Masalah:** aplikasi cloud v4 (Next.js) dan edisi self-hosted (aplikasi Python terpisah per produk) adalah dua basis kode — fiturnya pasti menyimpang.
- **Solusi:** edisi Docker **AXTO Workspace** dibangun dari kode yang sama persis dengan cloud (output Cloudflare Pages yang sama, dijalankan di runtime workerd di dalam container dengan D1/KV/R2 lokal yang disimpan di volume). Produk self-hosted Legal / Studio / Vault / Compliance memakai image ini dengan lisensi yang membatasi aplikasi; semua kemampuan v4 (termasuk Connect dan Mode Lokal) otomatis sama.
- **Windows & Linux:** image Linux amd64 + arm64; Windows lewat Docker Desktop (container Linux) seperti installer yang ada; installer AXTO Setup memasang dan mengaktifkan lisensi.
- **Selesai bila:** image dibangun di CI, smoke test di dalam container lulus (health, masuk admin, jalankan tiap aplikasi dengan model tiruan), installer memakai image baru, matriks kesetaraan di dokumen ini menunjukkan semua ✅.


---

## 18. Perintah pemilik 5 Okt 2026 — desain “Istana Kristal” (super premium, super enterprise)

> „Harga akuisisi nya di rubah, dari $2jt jadi $10jt … karena ini adalah website bernilai $10jt maka
> website ini harus berkelas, super premium, super enterprice, selain memiliki fitur dan fasilitas
> berkelas tinggi, harus ada animasi menarik dan elegan untuk memudahkan client & owner serta admin
> untuk menggunakan seluruh website ini … pastikan semua 100% konsisten, siap produksi, berkelas super
> premium enterprice & website nya mewah seperti istana raja sulaiman … Bukanya sy minta di tulis dulu
> di blueprint, kembangkan dulu hingga mewah … Jgn asumsi, lihat perintah, jgn mengarang, selalu lihat
> blue print“

**Acuan visual (bukan karangan):** (1) gambar pemilik „AXTO Digital Global — One Ecosystem. Endless
Possibilities.“: latar luar angkasa biru-tua, bola dunia bercahaya, kartu tiap aplikasi dengan warna
sendiri, lencana „100 Trial License“; (2) istana Nabi Sulaiman yang lantainya kaca bening seperti air
(QS An-Naml 27:44) — gaya **“Istana Kristal”** yang sudah dipakai pita juara Piala Dunia di situs ini
(`app/copa2026.css`: „crystal throne room: obsidian glass with a prism“). Satu bahasa desain untuk
**situs publik, portal member (`/app`), portal admin (`/admin`) dan halaman akuisisi**.

### 18.1 Token desain (satu sumber: `tailwind.config.js` + `app/globals.css`)
| Token | Nilai | Dipakai untuk |
|---|---|---|
| Obsidian | `#05070d` → `#0b1220` | latar situs publik & hero portal |
| Safir (dari gambar pemilik) | `#1e6bff` → `#38bdf8` | aksen utama, cahaya, tautan aktif |
| Emas kerajaan | `#c9a24a` → `#f3d98b` | garis tepi kartu premium, angka harga, lencana edisi Enterprise |
| Kristal | putih 4–12 % + blur 16 px | kartu kaca, header, menu |
| Warna per aplikasi (gambar pemilik) | Guardian biru · Orchestra ungu · Vault hijau · Edge biru langit · SOC merah · Compliance oranye · Sentinel OT merah bata · Antivirus hijau limau · Studio merah muda · Legal biru kerajaan | ikon, garis atas kartu, grafik aplikasi itu |
| Huruf | Inter (variabel, di-host sendiri) untuk teks; Playfair Display hanya untuk judul besar publik & akuisisi | keterbacaan + kesan mewah |
| Mode | gelap untuk publik & akuisisi; portal member/admin terang **dan** gelap (pilihan member, ikut sistem) | |

### 18.2 Sistem gerak (animasi yang **membantu**, bukan hiasan)
- **Durasi & kurva:** 150 ms (hover), 250 ms (tab/menu), 400 ms (panel/modal), 700 ms (masuk halaman);
  `cubic-bezier(.2,.8,.2,1)`. Hanya `transform`/`opacity` (60 fps, tanpa geser tata letak).
- **Pola:** halaman masuk *fade-up*; daftar muncul berurutan (*stagger* 40 ms); kartu terangkat + kilau
  tepi emas saat hover; angka statistik menghitung naik; *skeleton* berkilau saat memuat; garis bawah
  tab meluncur; modal membesar halus; toast meluncur; lencana „berhasil“ dengan percikan kecil sekali.
- **Membantu klien, pemilik, admin:** tur kenalan pertama kali per aplikasi (sorotan langkah demi
  langkah, bisa dilewati, diingat per akun), daftar periksa „mulai di sini“ di beranda portal, panduan
  langkah bergambar di checkout/akuisisi/aktivasi lisensi, palet perintah ⌘K / Ctrl K untuk lompat ke
  menu mana pun di portal & admin, keadaan kosong dengan ilustrasi beranimasi + tombol aksi pertama.
- **Wajib:** `prefers-reduced-motion` mematikan semua gerak; tidak ada animasi yang menghalangi klik;
  tidak ada perulangan tanpa henti di area kerja (hanya di hero publik).

### 18.3 Halaman yang dibangun ulang dengan gaya ini
| Area | Isi |
|---|---|
| Beranda publik | Hero „One Ecosystem. Endless Possibilities.“ dengan bola dunia beranimasi (SVG/canvas ringan); **semua 10 aplikasi self-hosted + 7 aplikasi cloud** dalam kartu berwarna seperti gambar pemilik, dengan edisi dan lencana trial (data dari `docs/AXTO-APPS-BLUEPRINT.md` §3–§4) |
| Header & footer | kaca kristal; menu besar (*mega menu*) yang menampilkan **semua** aplikasi (footer saat ini hanya 7 dari 10) |
| `/self-hosted`, `/self-hosted/[slug]`, `/apps/[slug]`, `/pricing` | kartu edisi bertingkat, perbandingan, tombol trial & beli, animasi masuk |
| `/acquire` | sudah bergaya premium (§17 B); diselaraskan ke token §18.1 |
| Portal member `/app` | beranda dengan sapaan, statistik beranimasi, daftar periksa mulai, kartu aplikasi; header aplikasi seragam; tur pertama kali; ⌘K |
| Portal admin `/admin` | pusat aksi (wire menunggu verifikasi, permintaan trial, tiket), KPI beranimasi, grafik, runbook langkah demi langkah, garis waktu audit; ⌘K |
| Email transaksi | kop & warna yang sama |

### 18.4 Selesai bila
- Token & komponen bersama (kartu kristal, tombol kerajaan, lencana edisi, stepper, tur, palet ⌘K,
  skeleton, toast) dipakai di semua area — tidak ada gaya lama tersisa (dicek dengan grep kelas lama).
- Uji browser nyata (Playwright) **setiap** halaman publik, member dan admin: desktop 1440 px & ponsel
  390 px, 10 bahasa, tanpa error console, tanpa scroll horizontal; versi `reduced-motion` tanpa animasi.
- Lighthouse halaman publik: Performance ≥ 90, Accessibility ≥ 95, CLS < 0,05.
- Tangkapan layar sebelum/sesudah disimpan di `docs/design/`.

---

## 19. Urutan kerja gabungan & persentase progres (diperbarui setiap commit)

> **Urutan kerja yang berlaku ada di `docs/WORK-QUEUE.md`** (satu daftar untuk semua repo). Tabel di bawah mencatat
> progres per aliran kerja.

Sumber perintah: `docs/REQUESTS.md`. Sumber rencana: dokumen ini (§9, §17, §18) dan
`docs/AXTO-APPS-BLUEPRINT.md` (§9 fase A–E). Persentase dihitung dari fase yang **selesai dan teruji**,
bukan dari perkiraan.

| # | Aliran kerja | Fase | Selesai | Progres |
|---|---|---|---|---|
| 1 | Aplikasi cloud v4 (Clipper, Studio, Vault, Security, Compliance, Prompt Library, Legal, Mode Lokal, Akuisisi, Connect) | §9 fase 1–10 | 10/10 | **100 %** |
| 2 | Penawaran akuisisi US$10.000.000 (§17 B) | harga · halaman premium · 10 bahasa · uji · tayang di axto.io | 5/5 (`08b72d9` di `main`) | **100 %** |
| 3 | Terjemahan portal member konsisten (§17 A) | Legal (workspace) ✅ · Legal (alat: playbook, klausul, tenggat) ✅ · Compliance ✅ · Security · Prompt Library · halaman kecil · crawler 0 | 3/7 | **43 %** |
| 4 | 10 aplikasi self-hosted (`AXTO-APPS-BLUEPRINT.md` §9) | A1 ✅ A2 ✅ A3 ✅ A4 B1 B2 B3 C1 C2 D1–D10 E1 E2 · F2 Smart License v5 · F3 desain menyeluruh · F4 Antivirus kelas dunia · F5 lifetime tawaran + diskon Jumat (F1 BNI = baris 7) | 3/17 | **18 %** |
| 5 | Desain Istana Kristal (§18) | token ✅ · komponen ✅ · halaman publik (beranda, header, footer, /apps, /self-hosted ✅; harga, panduan, blog, legal berikutnya) · portal member · admin · uji visual | 2/6 | **33 %** |
| 6 | SEO kuat + artikel layak AdSense (§20 B) | audit teknis ✅ (§27.6e: judul ≤ 60, description ≤ 160, llms.txt, security.txt, audit 554 halaman) · panduan per menu tiap aplikasi · artikel orisinal · data terstruktur · uji Lighthouse/Rich Results | 1/5 | **20 %** |
| 7 | Bank lokal BNI + tombol „Pembayaran diterima" → lisensi langsung terkirim (§20 C) | unggah bukti ✅ · admin terima/tolak ✅ · lisensi & email otomatis ✅ · uji E2E ✅ · tayang | dibangun sesi lain (`claude/bni-receipt-approval`), digabung ke branch kerja; tayang setelah CI hijau | **80 %** |
| 8 | Pembayaran langsung pakai (14 Okt 2026, `REQUESTS.md` 52–53): PayPal Live + Sandbox, BNI IDR/USD/EUR | rekening USD & EUR di metode BNI ✅ · pilihan mata uang di panel bayar, 10 bahasa ✅ · uji unit & browser ✅ · tayang (#71) ✅ · webhook PayPal dibuat otomatis oleh situs (uji E2E dengan tiruan PayPal) ✅ · kunci PayPal & nomor rekening diisi pemilik di Admin → Payments | 5/6 | **83 %** |
| 9 | Putaran pemodal khusus AXTO (19 Okt 2026, `REQUESTS.md` 71, §21 A) | halaman /invest 10 bahasa + SEO ✅ · Admin → Investors ✅ · laporan pemodal /app/investor ✅ · uji unit + E2E ✅ · tayang (deploy otomatis setelah merge) | 5/5 (tayang 19 Okt, deploy #74/#75 hijau) | **100 %** |
| 10 | Yang belum dibuat di axto.io & xaa.es (18 Okt 2026, `REQUESTS.md` 70) | audit 10 aplikasi Docker ✅ (`AXTO-APPS-BLUEPRINT.md` §16) · logika 18 template xaa.es ✅ (repo xaa `docs/TEMPLATES-BLUEPRINT.md`) · G1 deteksi GPU di host · template pertama + demo + gambar animasi · 17 template lainnya | 2/5 | **40 %** |
| 11 | Semua data pindah dari D1 ke R2 (20 Okt 2026, `REQUESTS.md` 79, §24) | blueprint ✅ (`docs/R2-DATA-BLUEPRINT.md`) · R2 Store + tes konkurensi ✅ · akun & keamanan ✅ · uang ✅ · lisensi ✅ · lainnya ✅ · migrasi data + jendela pindah ✅ (tayang 21 Okt, 0 konflik, §25.3) · D1 dilepas (±28 Okt) | 7/8 | **88 %** |
| 12 | Animasi panduan pelanggan (20 Okt 2026, `REQUESTS.md` 80) | rencana ✅ (`R2-DATA-BLUEPRINT.md` §5, §8) · perekam panduan · 23 panduan + 8 admin dalam 10 bahasa · halaman /guides + tombol „Lihat panduan" | 1/4 | **25 %** |
| 13 | Semua situs ke R2, tidak pernah D1 (20 Okt 2026, `REQUESTS.md` 81, §24) | aturan dicatat di semua repo ✅ · xaa.es pindah ✅ · axto.io pindah ✅ (21 Okt) · ulyah.com (+ xad.es, 1fr.fr, tilawa.de) pindah · Quantum pindah | 3/5 | **60 %** |
| 14 | axto.io 100 % siap produksi setelah xaa.es (20 Okt 2026, `REQUESTS.md` 82–84, §25) | data ke R2 ✅ (tayang 21 Okt, §25.3) · 10 aplikasi Docker lulus „selesai bila" — tetap dijual dengan klaim jujur, dilengkapi satu per satu (keputusan „a", §25.2) · semua pembayaran Live terbukti (PayPal + NOWPayments Live ✅; BNI/kartu belum aktif) · uji ulang + CI hijau (audit live di browser dibangun §25.1, temuan situs diperbaiki) | 1/4 | **25 %** |
| 15 | axto.io 100 % siap: investor tampil/sembunyi, lelang, semua aplikasi bisa dibeli (27 Okt 2026, `REQUESTS.md` 93, §27) | 27.1 investor tampil/sembunyi + tombol admin ✅ (tayang #86; default tampil §27.4a) · 27.2 lelang lisensi tiap 2 minggu ✅ (aturan §27.4–27.5, E2E 6/6) · 27.3 setiap paket bisa dibeli + lisensi jalan ✅ (E2E katalog) | 3/3 | **100 %** (tayang setelah merge) |
| 16 | Rekening ulyah.com/donasi + konversi + panduan bayar manual (27 Okt 2026, `REQUESTS.md` 104, §28) | 13 rekening BNI + 5 dompet (impor terenkripsi) · QR per dompet · konversi kurs harian ke mata uang rekening · panduan langkah + pelacak status, 10 bahasa · uji unit + E2E + browser | 0/5 | **0 %** |
| 17 | Orchestra AI 6 GB bisa diunduh + paket offline Windows (28 Okt 2026, `REQUESTS.md` 110, §30) | GPU di AXTO Setup ✅ · mode offline ✅ · unduhan bisa dilanjutkan ✅ · portal member ✅ · admin releases ✅ · paket offline CI ✅ (tayang setelah merge) · uji ✅ | 7/7 | **100 %** |
| 18 | Orchestra, worker GPU, beranda (28 Okt 2026, `REQUESTS.md` 112–116, 118, 135, §31) | lisensi & batas edisi Orchestra ✅ · paket GPU = tar.gz ✅ · deteksi GPU semua merek ✅ · skala otomatis/manual + indikator 🔄 (dicek ulang 1 Nov: tambah/kurang worker belum menyalakan container, indikator belum per GPU — dikerjakan di baris 23) · harga jual & lelang di atas beranda ✅ · promo + panduan Orchestra (screenshot, video) ✅ · client API OpenAI-compatible ✅ (§31.C) · gerbang lisensi 9 engine lain diuji ✅ (§33) · update tidak lagi mematikan Orchestra pelanggan (manifest integritas rilis) ✅ (§31.E) · container worker AMD/Intel ⏳ · panduan 9 aplikasi lain ⏳ · template xaa.es (REQUESTS xaa 65) ⏳ | 8/12 | **67 %** |
| 19 | Legal AI seluruh dunia (28 Okt 2026, `REQUESTS.md` 117, §32) | L1 korpus + verifikator ✅ · L2 konektor sumber resmi · L3 korpus di prompt + verifikator di layar · L4 set evaluasi · L5 peta cakupan · L6+ perluasan | 1/6 | **17 %** |
| 20 | Posting LinkedIn otomatis axto.io + xaa.es (28 Okt 2026, `REQUESTS.md` 123, §35) | pustaka 56 posting bergambar + hashtag ✅ · Admin → LinkedIn (kredensial terenkripsi, OAuth, halaman & jam per merek, log) ✅ · tes unit + E2E ✅ · persetujuan Community Management API oleh LinkedIn (pemilik) · posting pertama tayang | 3/5 | **60 %** |
| 21 | Penjualan axto.io & xaa.es lewat lelang (28 Okt–1 Nov 2026, `REQUESTS.md` 120, 124, 125, 132, §34) | lelang axto.io tayang (PR #95) ✅ · tampilan "rumah lelang" emas ✅ · tangga mingguan ✅ · lelang xaa.es tayang (xaa #33) ✅ · **penawaran mulai US$500.000, datar, tanpa "US$10 juta"** di axto.io · sama di xaa.es | 4/6 | **67 %** |
| 22 | Bisnis kanal: afiliasi, reseller, white label + MANAGE, Otoritas Lisensi, admin anggota, chat AI aman-rahasia, paket (29 Okt 2026, `REQUESTS.md` 131, `BUSINESS-MASTER-BLUEPRINT.md`) | ✅ P0 blueprint induk · ✅ P1 program & saklar · ✅ P2 afiliasi · ✅ tinjauan ulang white label (REQUESTS 134, master §4.3: biaya masuk US$60 ribu + komitmen tahunan ≥ US$72 ribu, kredit 24 bulan, demo, klausul kelanjutan, tanpa staf; peta sinkronisasi §13) · P3 dompet + OL v4 · P4 reseller · P5 white label · P6 Manage · P7 konsol anggota · P8 paket · P9 xaa.es · P10 uji keamanan | 3/11 | **27 %** |
| 23 | Worker GPU sama di Windows & Linux, semua merek GPU, scaling dan indikator pintar (1 Nov 2026, `REQUESTS.md` 136, §31.F) | G1 deteksi = bisa dipakai + telemetri per GPU + indikator pintar ✅ · G2 Windows = Linux (satu keputusan kesiapan, uji GPU nyata, profil per merek) ✅ · G3 image per merek (CUDA, ROCm, Intel) dari satu Dockerfile · G4 scaling nyata (container dinyalakan/dimatikan, satu worker per GPU, dari nol) · G5 teks situs 10 bahasa + panduan sesuai kode | 2/5 | **40 %** |
| 24 | Clipper kelas dunia: web + Windows + Linux, BYOK, Central GPU & AI, simpan di axto.io (1 Nov 2026, `REQUESTS.md` 137, `docs/apps/CLIPPER-BLUEPRINT.md`) | C1 proyek + sinkron + kuota · C2 media di R2 + paket penyimpanan · C3 Central Hub + konektor · C4 desktop Tauri · C5 server self-hosted · C6 publikasi + analitik · C7 tim · C8 Central Compute · C9 promosi nyata | 0/9 | **0 %** |
| 25 | Mesin promosi otomatis ke member (1 Nov 2026, `REQUESTS.md` 138–139, `docs/PROMOTION-BLUEPRINT.md`) | PR1 data + perpustakaan + Admin · PR2 mesin + portal + email · PR3 media nyata + 100–200 pesan · PR4 tautan uji coba + metrik + A/B | 0/4 | **0 %** |
| | **Total** (bobot = jumlah fase) | | **83/165** | **≈ 50 %** |

**Urutan berikutnya** (yang paling terlihat oleh pemilik & pembeli dahulu):
1. Tayangkan §17 B (US$10 juta) + terjemahan Legal workspace yang sudah selesai.
2. A1 — nama 10 aplikasi = gambar pemilik di semua tempat; footer & menu memuat semua 10 aplikasi.
3. §18 token + komponen + beranda „One Ecosystem“ dengan 10 aplikasi.
4. A2 edisi per aplikasi → A3 program 100 trial per aplikasi (zero-touch).
5. §20 A — CI/deploy hijau terus: setiap run merah diselidiki sampai akar masalah (tidak ada „flake").
6. §17 A sisa terjemahan (crawler sampai 0).
7. §20 B — SEO & artikel AdSense; §18 portal member & admin (tur, ⌘K, pusat aksi).
8. A4, E1 (AXTO Workspace = kesetaraan cloud ↔ Docker Windows/Linux), lalu B/C/D sesuai `AXTO-APPS-BLUEPRINT.md`.

**Yang butuh pemilik (tidak bisa dikerjakan AI):** sertifikat code signing EV untuk `.exe`/`.msi`,
pentest independen, audit SOC 2 / ISO 27001, pelanggan & pendapatan nyata, keputusan harga final per
edisi dan lifetime (Admin → Plans).

## 20. Perintah pemilik 5 Okt 2026 (malam) — rencana kerja

Perintah (dicatat apa adanya di `docs/REQUESTS.md` baris 40–47): semua aplikasi mewah dan Docker
benar-benar berjalan di Windows dan Linux; setiap aplikasi berfitur & berfasilitas tertinggi dengan
panduan penggunaan dan *smart license*; tidak ada aplikasi „sampah" yang sederhana — kompleks, lengkap,
bisa terhubung ke apa pun sesuai kebutuhan; SEO diperkuat (bukan abal-abal) dan artikel diterima AdSense;
fitur website dan Docker sama dan konsisten; CSS super mewah (§18); semua perintah dicatat dan blueprint
selalu dibaca; bank lokal BNI diaktifkan dulu dengan tombol „Pembayaran diterima" yang langsung mengirim
lisensi; deploy yang gagal harus diperhatikan.

**A. Deploy & CI tidak boleh gagal tanpa ditangani.**
- Setiap run merah di GitHub Actions (E2E, Deploy, Docker smoke test, AXTO Setup, Production check)
  diperiksa pada sesi berikutnya; akar masalah diperbaiki, bukan dijalankan ulang.
- Temuan 5 Okt: E2E `main` 5486791 (push 09:18) gagal 7 tes karena *worker* lokal di-restart di
  tengah permintaan („worker restarted mid-request" → 503) setelah satu permintaan menggantung; run
  terjadwal 10:29 pada commit yang sama hijau. Tindakan: log server E2E kini mencatat setiap permintaan
  (level info) dan log wrangler diunggah sebagai artefak saat gagal, agar permintaan yang menggantung
  terlihat dan bisa diperbaiki di sumbernya.
- Run merah `claude/bni-receipt-approval` 425ae69 (types + unit) sudah diperbaiki oleh sesi pemiliknya
  di ac98e59 (Deploy Preview hijau).

**B. SEO kuat + artikel yang diterima AdSense** (benchmark: dokumentasi Notion, Vercel, Stripe).
1. Audit teknis semua halaman publik: `pageMeta()` lengkap, canonical, hreflang 10 bahasa, JSON-LD
   (Organization, SoftwareApplication + Offer per aplikasi & edisi, FAQ, HowTo, BreadcrumbList, Article),
   sitemap per bagian, Core Web Vitals (Lighthouse ≥ 90).
2. Panduan per menu untuk setiap aplikasi (cloud + 10 aplikasi self-hosted): apa fungsinya, langkah
   demi langkah, tangkapan layar nyata, batas per edisi — satu halaman per menu, ditautkan dari aplikasi.
3. Artikel orisinal yang bermanfaat (bukan *doorway*, bukan isi tipis, tanpa klaim palsu), penulis &
   tanggal, kebijakan editorial yang sudah ada (/editorial-policy), tautan internal ke panduan.
4. Kepatuhan AdSense: halaman wajib ✅ (about, contact, privacy, cookies, terms, disclaimer, editorial),
   satu akun (`SITE.adsenseClient`), `ads.txt`, iklan tidak pernah di portal member/admin.
5. Bukti: uji Rich Results, Lighthouse, crawler tautan mati = 0.

**C. BNI lokal dengan persetujuan manual.** Pembeli memilih transfer BNI → melihat rekening di dalam
checkout (bukan di halaman publik) → mengunggah bukti → admin menekan „Pembayaran diterima" →
pesanan lunas, lisensi/paket/edisi aktif dan email terkirim saat itu juga (zero-touch setelah satu
klik); „Tolak" mengirim alasan. Sedang dibangun di `claude/bni-receipt-approval` oleh sesi lain —
sesi ini tidak membangun ulang agar tidak bentrok; setelah masuk `main`, edisi (A2) dan trial (A3)
dipastikan ikut aktif lewat jalur yang sama (`markOrderPaid` → `markEditionPaid`).

*Tambahan 14 Okt 2026 (`docs/REQUESTS.md` baris 52):* satu metode „Transfer bank (BNI)" kini memuat
hingga tiga rekening — IDR (dalam negeri, dengan kode unik 3 digit), USD dan EUR (transfer SWIFT
internasional, BNINIDJA). Pembeli memilih mata uang di panel pembayaran dan langsung melihat jumlah
persis untuk rekening itu: USD = harga persis, EUR = dikonversi (kurs Admin `usd_eur_rate`, atau kurs
publik yang di-cache, atau konstanta) dan dibulatkan ke atas per sen. Pilihan mata uang ikut bersama
bukti transfer, sehingga Orders, riwayat member dan faktur menampilkan mata uang yang benar-benar
dikirim. Nomor rekening diisi di Admin → Payments (penyimpanan terenkripsi), tidak pernah di repositori.
PayPal Checkout memakai kunci Live/Sandbox dari tempat yang sama dan langsung aktif begitu disimpan.

**D. Aplikasi lengkap, Docker = website, Windows + Linux.** Diteruskan oleh `AXTO-APPS-BLUEPRINT.md`:
A4 (mesin menegakkan batas edisi & watermark trial), E1 AXTO Workspace (image Docker dari kode cloud
yang sama → fitur identik), E2 uji instalasi nyata Windows (Docker Desktop/WSL2 + AXTO-Setup.exe) dan
Linux (amd64/arm64) di CI, B/C/D panduan & konektor (API, webhook, SIEM, SSO) per aplikasi.
*Smart license* = lisensi bertanda tangan Ed25519 + edisi + trial + pengikatan mesin (sudah ada),
ditambah pembaruan otomatis dan status lisensi langsung di setiap aplikasi (A4).

## 21. Perintah pemilik 14 Okt 2026 — modal, jual situs, aplikasi yang belum ada

Dicatat apa adanya di `docs/REQUESTS.md` baris 52–56. Urutan kerja: pembayaran (selesai, #71) →
webhook PayPal otomatis → **A** putaran pemodal (khusus AXTO sejak 19 Okt) → **B** penawaran jual situs → **C** aplikasi.

**A. Putaran pemodal khusus AXTO — ✅ dibangun 19 Okt 2026 (menggantikan penawaran gabungan).**
- *Perubahan pemilik 19 Okt* (`REQUESTS.md` baris 71), tentang kalimat "joint offering for AXTO and XAA" di
  xaa.es/acquire: **"Maksudnya masing2 web nyari investornya, bukan gabungan."** Jadi tidak ada penggalangan
  gabungan: axto.io punya putarannya sendiri di `axto.io/invest`, dibayar **hanya dari pendapatan AXTO**;
  xaa.es punya putarannya sendiri di `xaa.es/invest` (repo xaa, PR #16). Feed pendapatan xaa.es → axto.io
  yang direncanakan untuk penawaran gabungan **dibatalkan** dan tidak dibangun di axto.io.
- Syarat bawaan = syarat 14 Okt yang diterapkan ke AXTO saja (bisa diubah di Admin → Investors, pemilik
  diminta konfirmasi): putaran US$2.000.000, tiket minimum US$50.000, pool **30 % dari setiap pesanan AXTO
  yang lunas**, dibagi menurut porsi modal: bagian = 30 % × modal ÷ US$2.000.000 (US$50.000 = 0,75 %;
  US$500.000 = 7,5 %; US$2.000.000 = 30 %); dibayar **bulanan** sejak modal terverifikasi **sampai akuisisi
  penuh AXTO**, saat itu modal **dikembalikan 100 %** dan bagi hasil selesai.
- Pendapatan yang dibagi = order axto.io berstatus `paid` (USD, pada tanggal lunas) — **tidak pernah** sandbox,
  order `investment`/`acquisition`, atau order yang di-refund. Dihitung murni di `lib/invest-terms.ts`
  (`shareOf`, `buildStatement`), disimpan di `lib/invest.ts`, tabel `investors` + `investor_payouts`
  (`cf-migrations/0063_investors.sql`), syarat di `platform_config` `invest_offer`.
- `/invest` (publik, 10 bahasa — `lib/invest-copy.ts` + `lib/i18n-pages/invest.ts`; `pageMeta`, JSON-LD
  WebPage + FAQ + breadcrumb, sitemap, tautan footer "Invest in AXTO"): syarat, kalkulator porsi interaktif,
  apa yang dihitung sebagai pendapatan, yang sudah tayang vs yang dibiayai modal (jujur, §1), 7 langkah,
  "AXTO, dan hanya AXTO", pemberitahuan risiko, formulir pengajuan (tanpa pembayaran — honeypot, batas
  laju, validasi minimum/maksimum/persetujuan risiko). **Tanpa nomor rekening di halaman publik**; nomor
  WhatsApp pemilik (+6285691234561) diberikan setelah mengajukan. Pemilik menerima e-mail.
- Admin → Investors: ubah syarat (buka / jeda / tutup, putaran, minimum, pool, WhatsApp), daftar pengajuan,
  **verifikasi modal** (satu-satunya langkah manual — perjanjian ditandatangani + transfer bank diterima),
  tolak, laporan per bulan per pemodal (pendapatan, porsi, dibayar, sisa), catat pembayaran bulanan,
  tandai modal dikembalikan (akuisisi). Setiap aksi masuk audit log.
- `/app/investor` (portal member, 10 bahasa): pemodal yang masuk dengan e-mail pengajuannya melihat porsinya,
  pendapatan AXTO per bulan, bagiannya, yang sudah dibayar dan sisanya — hanya angka, tanpa data pelanggan.
- Uji: `tests/invest.test.ts` (syarat, porsi, laporan) dan `tests/e2e/invest.e2e.ts` (halaman, pengajuan,
  verifikasi, pendapatan hanya dari order lunas live, pembayaran, modal dikembalikan, jeda/tutup).

**B. Penawaran jual situs.** xaa.es: halaman `/acquire` baru, harga pembuka US$2.000.000 (EN/ES/ID, SEO,
sitemap, footer), checkout (transfer BNI USD/EUR, PayPal, kripto bila aktif), bukti transfer, akses admin
otomatis saat lunas terverifikasi, brankas serah-terima (kata sandi e-mail, GitHub, database). axto.io:
tambahkan poin pemilik ke `/acquire` (10 bahasa): 100 % skrip & aplikasi; e-mail pengumuman perpindahan ke
seluruh anggota; GitHub; database; akses admin penuh setelah bayar; konfirmasi WhatsApp +6285691234561;
semua kata sandi diterima; ganti tujuan pembayaran di Admin atau dibantu pemilik sampai selesai; jaminan
tidak ada situs kedua yang serupa.

**C. Aplikasi yang belum dibangun** (pemilik: Orchestra GPU on-demand & CPU untuk Windows & Linux belum punya
deteksi GPU otomatis; banyak bagian axto.io dan xaa.es belum ada). Langkah pertama: deteksi GPU otomatis
(NVIDIA → AMD/ROCm → Intel → CPU) di engine Orchestra + installer/compose Windows & Linux, dengan uji; lalu
fase `AXTO-APPS-BLUEPRINT.md` §9 berikutnya. Semua yang belum ada ditulis jujur sebagai roadmap di §21 A.

## 22. Perintah pemilik 14 Okt 2026 (malam) — serah terima lengkap untuk AI berikutnya

Pemilik: "Tolong chat sy masukin ke blueprint dulu agar tidak lupa dan bisa dilanjut AI lain, khususnya axto.io
& xaa.es" dan "Baca seluruh perintah gw yang belum lu kerjain, dan jadiin blueprint agar bisa dikerjakan oleh AI
berikutnya". Perintah dicatat apa adanya di `docs/REQUESTS.md` baris 57–66. **Kata sandi dan kunci tidak pernah
dicatat** — login admin xaa.es dan kunci PayPal ada di chat pemilik / di penyimpanan terenkripsi situs.

**A. Perintah malam ini (urutan pesan) dan cara mengerjakannya**
1. *"Sudah ada PayPal sandbox, PayPal tiruan hapus saja."* Hapus server PayPal tiruan (axto `tests/e2e/paypal-mock.ts`,
   xaa.es `tools/e2e/paypal-mock.mjs`) dan override `PAYPAL_SANDBOX_API` di kode produksi. Uji PayPal memakai
   PayPal Sandbox asli bila kunci Sandbox tersedia sebagai secret CI; tanpa kunci, uji itu dilewati dengan alasan jelas.
2. *"Sempurnakan seluruh aplikasinya, jangan ada yang ambigu … berkelas dunia, mudah digunakan, full fitur high class,
   super premium & super enterprise."* Standar tetap untuk setiap perubahan: §1 (klaim jujur), §18 (desain Istana
   Kristal), CLAUDE.md (10 bahasa, admin, paket, SEO, uji). Celah yang masih terbuka ada di daftar C.
3. *(Diganti 18 Okt — `REQUESTS.md` baris 67: semua nomor HP axto.io & xaa.es = **+6285691234561**, nomor kirim bukti
   transaksi manual.)* ~~WhatsApp konfirmasi manual diganti ke +62 856-9287-9465~~ — nomor itu tidak pernah masuk kode. +6285691234561 ada di kode (default),
   dokumen, dan **pengaturan yang sudah tersimpan** (migrasi `0064_whatsapp_owner.sql` untuk `platform_config` `site_sale`
   dan `invest_offer`; xaa.es di pengaturannya sendiri).
4. *Akuisisi xaa.es **US$10.000.000** (bukan 2 juta) + tombol untuk menawar, elegan dan profesional, dengan penjelasan
   keuntungannya.* xaa.es `/acquire` (EN/ES/ID, SEO, sitemap, footer): harga, keuntungan bagi pembeli, isi paket
   (poin pemilik di §21 B), langkah pembeli, checkout (BNI USD/EUR, PayPal), **tombol "Ajukan penawaran"** →
   formulir (nama, perusahaan, e-mail, WhatsApp, jumlah tawaran, pesan) yang tersimpan, terlihat di admin, dan
   memberi tahu pemilik (e-mail + tautan WhatsApp). axto.io `/acquire` mendapat tombol tawar yang sama + poin pemilik.
5. *Blueprint dulu* — bagian ini.
6. *Login admin xaa.es diberikan di chat* — tidak dicatat; tanyakan pemilik bila perlu.
7. *Penghitung pengunjung harian, mingguan, bulanan, tahunan & total di axto.io & xaa.es; harian tampil di beranda,
   sisanya di portal admin.* Hemat kuota D1: satu baris per hari (bukan per kunjungan), pengunjung unik dihitung
   dengan cookie harian tanpa data pribadi, total & rekap dari baris harian.
8. *"Pastikan semua pembayaran sudah live … isi semua"* (tangkapan layar: PayPal & NOWPayments "Sandbox · TEST",
   "Network error" di kartu PayPal, metode lain Off, checkout /acquire bertanda "Mode uji"). Target: PayPal **Live**
   dengan kunci per situs (+ Sandbox tersimpan), BNI USD/EUR/IDR terisi & aktif, **tidak ada metode bertanda TEST di
   checkout publik** — metode yang belum punya kunci live (mis. NOWPayments) dimatikan sampai pemilik memberi
   kuncinya. Selidiki dan perbaiki "Network error" pada tombol Save/Test PayPal.
9. *AdSense axto.io, xaa.es, rough.es, ulyah.com, 1fr.fr → `google.com, pub-6908951782430508, DIRECT,
   f08c47fec0942fa0`* — cuplikan `adsbygoogle.js?client=ca-pub-6908951782430508`, `ads.txt`, dan tag meta
   `google-adsense-account`. Aturan tetap: perubahan AdSense dikerjakan **paling dulu**.
10. *SEO seluruh website "high class dan super premium agar menjadi nomor 1".*

**B. Status (diperbarui setiap commit)**

| Butir | Status |
|---|---|
| A1 hapus PayPal tiruan | ⏳ |
| A3 WhatsApp | ✅ +6285691234561 (perintah 18 Okt): default kode axto.io + migrasi `0064_whatsapp_owner.sql`; xaa.es di reponya |
| A4 akuisisi xaa.es US$10 juta + tombol tawar | ⏳ |
| A7 penghitung pengunjung | ⏳ |
| A8 pembayaran live | ⏳ |
| A9 AdSense 5 situs | ✅ kode: axto.io (PR guardian-ai), xaa.es (xaa PR #14), ulyah.com + 1fr.fr + rough.es (ulyah.com PR #343) → verifikasi live |
| §21 A putaran pemodal | ✅ khusus AXTO (19 Okt): `/invest`, Admin → Investors, `/app/investor`; xaa.es punya putarannya sendiri (xaa PR #16) |
| feed pendapatan xaa.es | ❌ dibatalkan 19 Okt — setiap situs mencari pemodalnya sendiri, tidak ada pembagian pendapatan lintas situs |

**C. Semua pekerjaan terbuka (untuk AI berikutnya, urut prioritas)**

*axto.io (repo guardian-ai):*
1. AdSense (A9) ✅ → pembayaran live (A8, kunci diisi pemilik) → WhatsApp (A3) ✅ → putaran pemodal AXTO (§21 A) ✅ → `/acquire` poin pemilik +
   tombol tawar (§21 B, A4) → penghitung pengunjung (A7) → hapus PayPal tiruan (A1).
2. §17 A sisa terjemahan portal member: Security, Prompt Library, halaman kecil, crawler sampai 0.
3. §18 desain Istana Kristal: harga, panduan, blog, legal, portal member, admin (tur, ⌘K, pusat aksi), uji visual.
4. §20 B SEO & artikel layak AdSense: audit teknis, panduan per menu tiap aplikasi, data terstruktur lengkap,
   Lighthouse/Rich Results — target "nomor 1".
5. `AXTO-APPS-BLUEPRINT.md`: Orchestra GPU on-demand & CPU dengan deteksi GPU otomatis (NVIDIA → AMD/ROCm → Intel →
   CPU) untuk Windows & Linux; fase A4, B1–B3, C1–C2, D1–D10, E1–E2, F2 Smart License v5, F3 desain, F4 Antivirus,
   F5 lifetime + diskon Jumat.
6. Butuh pemilik: kunci NOWPayments live (atau metode itu tetap mati), Stripe/Xendit/Midtrans bila ingin dipakai,
   sertifikat code signing EV, pentest, audit SOC 2 / ISO 27001.

*xaa.es (repo xaa):*
1. AdSense (A9), pembayaran live (PayPal Live kunci xaa.es + Sandbox, BNI EUR/USD aktif), WhatsApp (A3).
2. `/acquire` US$10 juta + tombol tawar + keuntungan + checkout + brankas serah terima (A4, §21 B).
3. Penghitung pengunjung (A7); hapus PayPal tiruan (A1). (Feed pendapatan ke axto.io dibatalkan 19 Okt; xaa.es punya
   putaran pemodal sendiri di `/invest`, PR #16.)
4. Peringatan hydration React #418 yang sesekali muncul di Admin → Leads (masalah lama).
5. Template SaaS "super" belum punya produk (blueprint xaa.es §5).

*Ekosistem ulyah.com dan situs mitra (repo ulyah.com, Jai, Lie, axto.us, axtodev, oldco.in, profity.in, Quantum):*
1. AdSense ulyah.com, 1fr.fr, rough.es (A9) — `docs/ADSENSE-CODES.md` di repo ulyah.com adalah daftar resmi semua kode.
2. D1 di bawah 500 MB; unit manual dawa.es tayang; dawa.es tetap tidak disentuh selain itu.
3. Semua artikel ≥ 1.500 kata dan 5 artikel baru berkualitas tinggi per situs (19 situs statis + tenant Islami);
   naikkan `MIN_WORDS` engine ke 1.500.
4. Temuan CORS lie.skin → `api.ulyah.com/track`.
5. SEO "high class, super premium, nomor 1" di semua situs; laporan akhir berbahasa Indonesia kepada pemilik.

## 23. Perintah pemilik 20 Okt 2026 — aplikasi HP, SEO, yang belum dibuat

Dicatat apa adanya di `docs/REQUESTS.md` baris 73–78. Urutan pemilik: **kerjakan dulu yang belum dibuat di axto.io
dan xaa.es**, baru promosi lagi; dawa.es tidak diurus lebih jauh.

**A. Aplikasi yang bisa dipasang di HP (PWA) — axto.io dan xaa.es.**
- Pemilik: tombol pasang dengan **ikon HP** di **paling atas**, aplikasi terbuka **tanpa browser**, dan ikon **hilang bila
  aplikasi sudah terpasang**.
- axto.io sudah punya manifest, service worker dan tombol „Install app“, tetapi (1) tombolnya ada di tengah header dan
  memakai emoji, (2) di Android tombol sering tidak muncul karena event `beforeinstallprompt` sudah lewat sebelum React
  aktif, (3) tidak ada deteksi „sudah terpasang“ selain mode standalone.
- Logika: skrip kecil di `<head>` menangkap `beforeinstallprompt` dan `appinstalled` sedini mungkin. **Bilah pasang**
  menjadi elemen pertama halaman publik, portal member dan halaman masuk: ikon HP, judul, satu kalimat („layar penuh,
  tanpa browser“), tombol Pasang. Android/Chrome/Edge memakai dialog pasang bawaan; iPhone/iPad dan browser tanpa dialog
  mendapat langkah singkat sesuai perangkatnya.
- **Disembunyikan bila sudah terpasang:** (a) dibuka sebagai aplikasi (`display-mode: standalone`), (b) event
  `appinstalled` → tanda di penyimpanan lokal, (c) `navigator.getInstalledRelatedApps()` (Chrome Android) dengan
  `related_applications` di manifest. Bila browser kembali menawarkan pemasangan (aplikasi dihapus), tanda itu dihapus.
  Tombol × menyembunyikan bilah 14 hari.
- axto.io: 10 bahasa (`lib/i18n-pages/pwa.ts`). xaa.es: EN/ES/ID, ditambah manifest, ikon 192/512/maskable, service
  worker (aset statis dari cache, halaman dari jaringan dengan halaman offline cadangan).

**B. SEO yang meledak, dengan cara yang aman.** „Bagaimanapun caranya“ tetap dalam batas kebijakan spam Google — tanpa
halaman doorway, teks tersembunyi, konten hasil putar-kata, atau jaringan tautan. Niche yang kuat:
- **axto.io** — „AI yang privat“: alat AI dengan kunci sendiri (BYOK), mode lokal di perangkat, redaksi PII, alat
  keamanan. Mesin trafik: **alat gratis yang benar-benar jalan di browser** (redaksi PDF/teks, penghapus metadata foto,
  dekoder JWT, generator hash/kata sandi, penguji regex, dll.), masing-masing satu halaman dengan panduan, FAQ dan
  JSON-LD `SoftwareApplication`; halaman perbandingan yang jujur („alternatif …“); hub istilah.
- **xaa.es** — „template SaaS + studio pembuatan web“: halaman template dengan demo hidup dan gambar animasi,
  kalkulator biaya website (alat gratis), panduan biaya per negara.
- Teknis untuk keduanya: canonical & hreflang benar, sitemap dengan `lastmod`, IndexNow saat deploy, Core Web Vitals,
  data terstruktur lengkap, tautan internal antarhalaman niche.

**C. Yang belum dibuat (dikerjakan dahulu).** Template xaa.es mengikuti `xaa/docs/TEMPLATES-BLUEPRINT.md` (Waitlist
pertama, lalu urutan di sana); **akun demo (username & kata sandi) ditampilkan di portal member xaa.es hanya untuk
template yang demonya sudah tayang**. Aplikasi Docker axto.io mengikuti `AXTO-APPS-BLUEPRINT.md` §16.5.

| Butir | Status |
|---|---|
| A — bilah pasang aplikasi axto.io | ✅ 20 Okt: bilah ikon HP paling atas (situs publik, portal member, halaman masuk), dialog pasang bawaan + langkah iPhone/Android, hilang bila terpasang (standalone · `appinstalled` · `getInstalledRelatedApps`), tombol × 14 hari, 10 bahasa; `tests/pwa.test.ts` + Playwright 8 skenario |
| A — PWA lengkap xaa.es | ⏳ |
| B — SEO axto.io | ⏳ |
| B — SEO xaa.es | ⏳ |
| C — template Waitlist + demo + akun demo di portal member | ✅ 20 Okt (repo xaa: demo `/demos/waitlist/`, galeri 15 klip, akun demo di portal member; tayang setelah PR digabung) |

## 24. Perintah pemilik 20 Okt 2026 (2) — semua data ke R2, blueprint kuat, animasi panduan

Dicatat apa adanya di `docs/REQUESTS.md` baris 79–80. Rancangan lengkap: **`docs/R2-DATA-BLUEPRINT.md`** (sama untuk
xaa.es di repo xaa).

- **Data:** tidak ada lagi data aplikasi di D1. R2 Store = dokumen JSON per objek, tulis bersyarat atomik
  (If-None-Match untuk membuat, If-Match/etag untuk mengubah), penjaga keunikan, index lewat `list` + customMetadata,
  ringkasan, log append-only berantai hash, rekonsiliasi terjadwal, backup harian 35 hari. Uang dan lisensi dijaga
  dengan transisi bersyarat + ID deterministik sehingga tidak pernah dobel.
- **axto.io:** 25 tabel yang dipakai kode dipetakan satu per satu (§7 dokumen itu); ±60 tabel lama diarsipkan. Pindah
  bertahap: akun & keamanan → uang → lisensi → lainnya → migrasi data (cocok 100 %) → 7 hari pengamatan → D1 dilepas.
  KV tetap untuk batas laju (bukan D1).
- **Animasi panduan:** 23 alur pelanggan + 8 alur admin dalam 10 bahasa, direkam otomatis (Playwright, data contoh,
  pembayaran mode sandbox di lokal), tampil di `/guides` dan tombol „Lihat panduan" di tempat alurnya dipakai.
- **Pembayaran:** tetap Live dari Admin → Payments; kunci hanya di penyimpanan terenkripsi (tidak di repo).
- **Urutan:** pustaka R2 Store dibangun dan diuji di xaa.es (19 tabel yang dipakai, lebih kecil) lalu dipakai di axto.io.
- **Aturan tetap untuk semua situs** (`REQUESTS.md` baris 81, `CLAUDE.md` §6): axto.io, xaa.es, ulyah.com, xad.es,
  1fr.fr, tilawa.de dan semua yang menyimpan data — **wajib ke R2, tidak pernah ke D1**. Cakupan per situs (D1 yang
  masih ada: `axto-db`, `xaa-portal`, `ulyah-db`, `quantum_db`) di `docs/R2-DATA-BLUEPRINT.md` §10.

## 25. Perintah pemilik 20 Okt 2026 (3) — axto.io 100 % siap produksi setelah xaa.es

> „Setelah xaa.es selesai skrg pindah ke axto.io pastikan 100% siap produksi, docker sudah di cek dan sudah siap
> produksi, jgn ada aplikasi sampah, pastikan pembayaran semua sudah live" — `REQUESTS.md` baris 82

Urutan kerja (dikerjakan setelah xaa.es selesai pindah ke R2 dan tayang):

1. **Data axto.io ke R2** — `docs/R2-DATA-BLUEPRINT.md` §7: 25 tabel yang dipakai kode → `axto-data`, backup harian
   `axto-backups`, migrasi sekali dengan pemeriksaan setiap baris, D1 hanya-baca 7 hari lalu dilepas (`CLAUDE.md` §6).
2. **Docker diperiksa satu per satu** terhadap „selesai bila" di `AXTO-APPS-BLUEPRINT.md` §6–§7 dan audit §16.1:
   image Linux amd64/arm64 + Windows (installer) dibangun dan dijalankan di CI, health, lisensi + batas edisi
   ditegakkan, tes otomatis per engine, UI lengkap, dokumentasi, rilis bertanda tangan. **Tidak ada aplikasi
   sampah:** aplikasi yang belum lulus tidak dijual atau diunduh sebagai produk jadi — halaman publiknya berkata jujur
   „Early access" (tanpa klaim enterprise) sampai lulus, dan checkout/unduhan untuknya tertutup. Setiap aplikasi yang
   lulus dicatat di tabel §16.1 dengan bukti (run CI, tes, uji browser).
3. **Pembayaran semua Live dan terbukti:** setiap metode (PayPal, BNI IDR/USD/EUR, kripto/NOWPayments bila aktif)
   default Live; tombol uji per metode hijau; webhook PayPal Live terdaftar otomatis; satu transaksi kecil sungguhan
   per metode oleh pemilik; lisensi, faktur dan unduhan terkirim otomatis (zero-touch, §3 `CLAUDE.md`). Kunci Live
   hanya ditempel pemilik di Admin → Payment & email (tidak pernah di repo, log atau chat).
4. **Uji ulang semuanya** (`CLAUDE.md` §5): tsc + unit, E2E lokal Cloudflare, Playwright desktop + HP tanpa error
   konsol, CI hijau sebelum merge.

### 25.1 Hasil cek 20 Okt 2026 („coba cek axto.io apakah seluruh sudah sempurna dan 100% siap produksi“)

Diukur, bukan diperkirakan. Situs live dibuka di Chromium sungguhan lewat GitHub Actions (container kerja tidak bisa
membuka axto.io): `dashboard/scripts/live-audit.mjs`, workflow „Live audit (axto.io, real browser)“ — sekarang jalan
setelah setiap deploy dan setiap hari. Akun Cloudflare dibaca lewat akses CF (hanya metadata, tidak membaca data).

| Bagian | Hasil terukur | Status |
|---|---|---|
| Kode | `tsc` bersih · 202/202 tes unit (termasuk kelengkapan i18n 10 bahasa) · E2E lokal Cloudflare 123/125 lulus, 0 gagal (2 tes butuh Docker/Go, jalan di CI) · E2E penuh di CI hijau (PR #80) | ✅ |
| Docker | Docker smoke di CI: semua image amd64 + arm64 dibangun, jalan dengan config contoh, menjawab `/health` | ✅ jalan · ❌ baseline §6 (lihat bawah) |
| Situs live (build `53a5b1a`) | 553/553 halaman sitemap menjawab 200; title, description, canonical, JSON-LD, satu h1 dan tag AdSense ada di semua halaman; robots, ads.txt, sitemap benar; `/api/health` ok, semua binding + secret ada | ✅ |
| Temuan situs live | (1) tautan „Installation guide“ di `/self-hosted` ke `/self-hosted-guide` → 404; (2) `/acquire` memanggil `/api/auth/me` → 401 di konsol untuk pengunjung; (3) deskripsi `/terms` hanya 39 karakter; (4) `/signup`, `/sign-up`, `/signin`, `/sign-in` → 404 | ✅ diperbaiki: daftar 10 panduan instalasi di `/self-hosted#guides`, `?optional=1` → 200 `{user:null}` (tes E2E), deskripsi baru, redirect permanen ke `/register` / `/login` |
| Pembayaran (produksi, `/api/billing/options`) | **PayPal = Live**, **NOWPayments = Live**; tidak ada metode di sandbox | ✅ |
| Pembayaran yang belum aktif | Transfer bank BNI (IDR/USD/EUR), kartu (Xendit/Midtrans), Stripe dan kripto langsung **tidak aktif** di produksi; belum ada satu transaksi kecil sungguhan per metode sebagai bukti | 🔄 pemilik: isi data BNI + kunci di Admin → Payments, aktifkan, lalu satu transaksi uji kecil per metode |
| Data | D1 `axto-db` masih 86 tabel (5,7 MB); kode masih memakai 26 tabel lewat ±341 pernyataan SQL di 54 file; bucket `axto-data` / `axto-backups` belum dibuat | ❌ 0 % — `docs/R2-DATA-BLUEPRINT.md` §7 |
| 10 aplikasi Docker vs „selesai bila“ | 0/10 lulus baseline enterprise §6 (tes per engine, batas edisi ditegakkan, SSO/SCIM, audit berantai, HA, OpenAPI …) — `AXTO-APPS-BLUEPRINT.md` §16.1 | ❌ |
| Klaim publik vs kode | Klaim yang tidak ada di kode dikoreksi (`lib/product-catalog.ts`, `lib/editions.ts`, terjemahan 10 bahasa): Antivirus („machine learning“, „real-time“, „YARA“, „integrasi SOC“ — kodenya ClamAV + aturan pola + entropi + daftar hash yang belajar, pemindaian sesuai permintaan), Vault („AES-256-GCM vault“ → token per permintaan di memori), Legal (konektor LexisNexis/Westlaw tidak ada), SOC (STIX/TAXII tidak ada; „jutaan IOC“ → lookup AbuseIPDB + OTX + feed lokal), Edge („circuit breaking“), Orchestra („dead-letter“) | ✅ jujur sekarang |

**Setelah perbaikan (PR #80, build `c782096`):** audit live di Chromium — 553/553 halaman, 40 pemuatan halaman desktop +
HP — **0 masalah**. Audit ini sekarang jalan otomatis setelah setiap deploy dan setiap hari.

**Kesimpulan jujur:** axto.io **belum** 100 % siap produksi. Yang sudah siap: situs publik (553 halaman), aplikasi
cloud, PayPal dan NOWPayments Live, image Docker yang jalan. Yang masih memblokir: (1) data masih di D1, (2) tidak ada
aplikasi Docker yang lulus baseline enterprise, (3) BNI/kartu belum aktif dan belum ada bukti transaksi per metode.

### 25.2 Keputusan pemilik 20 Okt 2026: „a" (`REQUESTS.md` baris 84)

Pertanyaan: aplikasi Docker (a) tetap dijual dengan klaim jujur dan dilengkapi satu per satu, atau (b) diberi label
„Early access" dan checkout-nya ditutup? Jawaban pemilik: **„a"**. Jadi butir 2 di atas berlaku dengan perubahan ini:
kesepuluh aplikasi **tetap dijual**; halaman publik, edisi dan terjemahan hanya mengklaim yang benar-benar ada di kode
(koreksi §25.1); setiap aplikasi dilengkapi satu per satu terhadap daftar „selesai bila" (`AXTO-APPS-BLUEPRINT.md`
§16.5) dan dicatat dengan bukti. Checkout dan unduhan tidak ditutup.

### 25.3 Data axto.io ke R2 — dibangun dan diuji (21 Okt 2026)

Butir 1 §25 (`R2-DATA-BLUEPRINT.md` §7) selesai di kode:

| Bagian | Isi | Bukti |
|---|---|---|
| Penyimpanan | Semua catatan = dokumen JSON di bucket privat `axto-data` (`lib/data/schema.ts`: 23 koleksi, penjaga unik create-once, indeks dengan ringkasan); pengaturan `k/config/*`, penghitung faktur `n/invoice` | `tests/r2store.test.ts` |
| Kode | Setiap route dan modul memakai `getData()`; **0 kueri D1** tersisa (`dbQuery/dbFirst/dbRun/getDB` dihapus); uang, lisensi, kursi perangkat, trial, reset sandi = transisi bersyarat (compare-and-swap) dan idempoten | `tsc` bersih · 234 tes unit |
| Pindah sekali | `lib/data/migrate.ts`: per langkah 60 baris (6 paralel), bisa dilanjutkan, satu lease; id sama; datetime D1 → ISO; baris yang bentrok nilai unik disimpan utuh (`k/meta/migration-conflicts/`), tidak dibuang; tabel lama yang tak dipakai diarsip ke `axto-backups/legacy/`; selesai hanya bila setiap id D1 ada di R2 | `tests/migrate.test.ts` (skema D1 asli di SQLite, 130+ baris, langkah kecil, pemanggil berlomba) · `tests/e2e/migration.e2e.ts` (baris lama di D1 lokal → R2) |
| Saat pindah | Middleware menjawab 503 yang jelas untuk API selama beberapa menit; setiap permintaan, tick otomatis dan langkah deploy („Move the records from D1 to R2") mendorong langkahnya; deploy gagal bila tidak selesai | `deploy-dashboard.yml`, `deploy-preview.yml` |
| Backup | Harian setelah 02:00 UTC, bertahap per tick (`lib/data/backup-job.ts`), manifest + bagian di `axto-backups`, disimpan 35 hari (dihapus otomatis); tombol „Back up now" | `tests/backup-job.test.ts` |
| Admin | Admin → Data & backups: laporan per tabel (baris D1 / dokumen R2 / konflik), jendela D1 hanya-baca 7 hari, backup terbaru | E2E + Playwright |
| Uji E2E | 88 kueri D1 langsung di tes diganti endpoint uji `/api/test/data` (hanya runtime lokal: `E2E_TEST_DATA=1` + `ALLOW_INSECURE_ENDPOINTS=1` + localhost + rahasia cron; produksi 404) | `tests/e2e/*.e2e.ts` |

**Tayang 21 Okt 2026 (PR #82, build `56fc566`):** langkah deploy „Move the records from D1 to R2 (once)" memindahkan
`axto-db` (5,7 MB) dalam ±4 menit — selesai 02:33:21 UTC, **0 konflik, 0 tabel kurang**; `/api/health` di axto.io:
`records: "ready"`, semua binding R2 ada. Uji coba sebelumnya di preview (1,8 MB data asli) selesai dalam ±3 menit.
D1 `axto-db` sekarang hanya-baca sampai ±28 Okt 2026, lalu binding `DB` dan `lib/data/migrate.ts` dilepas
(`R2-DATA-BLUEPRINT.md` §4).


## 26. Perintah pemilik 21–26 Okt 2026 — AdSense dulu, artikel, lalu (dengan izin) aplikasi

Urutan dari pemilik: **kode AdSense sampai live → kode lain (DNS) → situs baru → artikel ≥ 45 di setiap situs
non-muslim (termasuk axto.io dan xaa.es) → blueprint → minta izin sebelum mengerjakan aplikasi.** "Kita berhenti dulu
aplikasi xaa.es dan axto.io"; "jgn pernah mengerjakan aplikasi sebelum di perintahkan" (REQUESTS 85–92).

### 26.1 AdSense axto.io (✅ kode; live setelah merge + deploy)

`google.com, pub-8991272269211824, DIRECT, f08c47fec0942fa0` (sebelumnya 6908951782430508), sama dengan xaa.es,
ulyah.com, 1fr.fr dan tilawa.de. `dashboard/lib/site.ts` (`adsenseClient`) memberi loader dan tag meta di HTML server;
`dashboard/public/ads.txt` satu baris yang sama; `scripts/live-audit.mjs` memeriksa ketiganya di situs live.

### 26.2 DNS axto.io: Spacemail

TXT verifikasi, MX `mx1.spacemail.com` / `mx2.spacemail.com` (prioritas 0), SRV `_autodiscover._tcp` 0 0 443
`autoconfig.spacemail.com`, SPF tunggal `v=spf1 include:spf.spacemail.com ~all` (SPF lain digabung/dihapus — satu
domain hanya boleh punya satu rekaman SPF), DKIM `spacemail._domainkey`. Yang sudah dimasukkan pemilik dibiarkan. **✅ 26 Okt: semua rekaman
dimasukkan pemilik sendiri di dasbor Cloudflare**; `dns-mail.yml` tetap ada sebagai alat cek/ulang yang idempoten (token
deploy axto.io tidak punya izin Zone → DNS, jadi workflow hanya melapor).

### 26.3 Cloudflare: token & R2 (dicatat dulu)

R2 akun axto.io: 12,53 GB terpakai; `axto-data` 4,19 rb objek setelah pindah dari D1. Kapasitas ini dipakai penuh
oleh axto.io (data per dokumen, berkas anggota terenkripsi, rilis Docker bertanda tangan, cadangan 35 hari).
Rencana berikutnya (dibahas dengan pemilik dulu, belum dikerjakan): xaa.es pindah ke akun Cloudflare yang sama dengan
axto.io agar satu akun fokus khusus aplikasi. Izin token tidak ditulis di repo (aturan §4 CLAUDE.md).

### 26.4 Penawaran investor disembunyikan (✅ 27 Okt, §27.1)

Default tersembunyi di semua halaman index dan portal member axto.io dan xaa.es; tombol tampil/sembunyi di portal
admin (dicatat di log audit). Saat tersembunyi: tautan header/footer, kartu beranda, `/invest` (noindex + 404) dan
entri sitemap ikut hilang, supaya tidak ada halaman yatim yang dirayapi.

### 26.5 Lelang lisensi tiap 2 minggu (✅ dibangun 27 Okt, §27.2)

- Siklus 14 hari, selalu berakhir **Jumat 15:00 UTC**; satu lot per paket yang dilelang, harga buka **25 % dari harga
  normal**, kenaikan minimum 1 % harga normal, perpanjangan anti-snipe 5 menit bila ada tawaran di 5 menit terakhir.
- Hanya anggota terverifikasi; setiap tawaran adalah dokumen R2 create-once (`auction_bids/<lot>/<seq>`), harga
  tertinggi dibaca dari indeks, penutupan lot adalah transisi bersyarat (CAS) yang idempoten.
- Pemenang membayar lewat checkout live biasa dalam 48 jam; bila tidak, lot jatuh ke penawar berikutnya. Lisensi
  aktif otomatis setelah pembayaran terverifikasi (zero-touch).
- Pemenang memilih **nama yang ditampilkan** (perusahaan atau pribadi, disaring kata kasar dan merek orang lain);
  daftar pemenang + paketnya tampil di beranda, portal member dan portal admin (admin: lot, tawaran, pembatalan,
  log audit).
- **Catatan:** aturan di paragraf ini diganti perintah pemilik berikutnya — §27.4 (semua paket, Jumat 07.00 WIB, sesi baru langsung) dan §27.5 (lisensi hanya setelah bayar, "belum membayar", +10 % dari harga buka, bukti transfer). Paragraf di bawah adalah versi pertama.
- **Dibangun 27 Okt 2026** (`lib/auction-terms.ts` aturan murni, `lib/auction.ts` penyimpanan R2, `lib/auction-packages.ts`
  paket): siklus pertama berakhir **Jumat 6 Nov 2026 15:00 UTC**, lalu tiap 14 hari. Paket default yang dilelang
  setiap siklus: edisi **Starter 1 tahun** dari ke-10 aplikasi (diubah di Admin → Licence auction; bisa juga edisi
  lain, bulanan, atau lifetime per aplikasi/suite). Harga normal dibaca dari Admin → Plans saat lot dibuka. Lot
  dibuka sendiri oleh cron tiap menit (`/api/cron/tick`); di hari terakhir siklus, paket baru masuk ke lelang
  berikutnya. "Anggota terverifikasi" = e-mail dikonfirmasi dengan kode 6 digit. Tawaran tidak boleh melebihi harga
  normal; admin tidak menawar. Pembayaran: `POST /api/billing/checkout {kind:"auction", lot, gateway}` → order
  edisi/lifetime biasa di harga menang → lisensi terbit otomatis → lot `sold`. Pembayaran yang terlambat (lot sudah
  dialihkan/dibatalkan) tetap mendapat lisensi karena uangnya terverifikasi, dan pemilik diberi tahu lewat e-mail.
  Halaman: `/auction` (SEO, FAQ, sitemap, footer), strip pemenang di beranda, `/app/auction`, `/admin/auctions`.

### 26.6 Koin AXTO lokal (📝 blueprint, catatan risiko)

Total pasokan 100 jt, harga awal $1, hanya untuk transaksi di axto.io (bayar paket, lelang, add-on), tidak bisa
dicairkan oleh axto.io. Buku besar di R2 (log append-only + saldo CAS per akun), pasokan tetap dan dapat diaudit.
Jual-beli antar klien/pihak luar: pasar P2P dengan escrow koin. **Risiko yang wajib dibahas sebelum dibangun:** token
yang dijual ke "investor" dengan harapan nilainya naik dapat digolongkan sekuritas atau aset kripto yang diatur
(mis. OJK/Bappebti di Indonesia, MiCA di UE, SEC di AS); klaim harus jujur (tanpa janji imbal hasil).

### 26.7 axto.io kelas dunia & promosi (📝)

Perbaikan konsistensi dan riset pesaing ("1000 kali lebih canggih") menunggu izin pemilik setelah artikel selesai.
Promosi axto.io (dan xaa.es, ulyah.com) masuk ke pekerjaan artikel di semua situs: blok "Dari ekosistem kami" dengan
logo, tautan biasa berlabel jelas, jauh dari iklan, tanpa teks tersembunyi (kebijakan AdSense).

## 27. Perintah pemilik 27 Okt 2026 — axto.io 100 % siap produksi: tampil/sembunyi investor, lelang, semua aplikasi bisa dibeli

"Jika sudah lanjut ke axto.io pastikan seluruhnya 100% siap produksi, lihat lg blueprint husus axto.io mulai dr show
hiden pencarian anggaran sampe auction license dan pastikan seluruh aplikasi sudah siap di beli customer, dan licensi
sudah jalan" (REQUESTS 93). Ini izin pemilik untuk pekerjaan aplikasi (aturan baris 86). Urutan kerja:

| # | Pekerjaan | Rincian | Status |
|---|---|---|---|
| 27.1 | §26.4 penawaran investor tersembunyi | `visible` (default **false**) di `invest_offer`; saat tersembunyi `/invest` 404 + noindex, `/api/invest` dan `/api/invest/apply` menolak, tautan footer, menu member „Investor" (kecuali anggota yang sudah tercatat sebagai pemodal) dan entri sitemap hilang; tombol Tampilkan/Sembunyikan di Admin → Investors, dicatat `admin.invest_visibility` di log audit; uji unit + E2E (129/129) + browser desktop & HP | ✅ (27 Okt; tayang setelah merge + deploy) |
| 27.2 | §26.5 lelang lisensi tiap 2 minggu | lot per paket (edisi aplikasi atau lifetime), siklus 14 hari berakhir Jumat 15:00 UTC, buka 25 %, kenaikan 1 %, anti-snipe 5 menit, tawaran create-once di R2, penutupan CAS idempoten, pemenang bayar ≤ 48 jam lewat checkout live (lisensi otomatis), lalu jatuh ke penawar berikutnya; nama tampilan disaring; pemenang di beranda, portal member, admin; 10 bahasa; SEO `/auction` | ✅ kode + uji (27 Okt); tayang setelah merge + deploy |
| 27.3 | Semua aplikasi bisa dibeli, lisensi jalan | setiap paket (plan, edisi per aplikasi, lifetime) membuat order di harga server, pembayaran terverifikasi → lisensi terbit, ditandatangani, lolos `/api/license-validate`, unduhan tersedia; uji unit + E2E untuk setiap SKU | ✅ E2E `catalogue.e2e.ts`: setiap edisi, lisensi lifetime dan plan dibeli lewat checkout, lisensi terbit dan tervalidasi (27 Okt) |

### 27.4 Perintah pemilik 27 Okt 2026 (2) — investor tampil, semua paket dilelang, Jumat 07.00

"Investor defoultnya ganti jadi show, lelang seluruh paket setiap 2 minggu, sekali dan langsung sesi baru jika sesi 2
minggu berakhir, pastikan selalu berkahir di hari jumat jam 7 pagi. dengan start harga awal 25%, pemenangnya lelang
tampilkan di homepage, portal member dan portal admin" (REQUESTS 94). Perubahan atas §26.4 dan §26.5:

| # | Pekerjaan | Rincian | Status |
|---|---|---|---|
| 27.4a | Investor default **tampil** | axto.io (`invest_offer.visible` default true) dan xaa.es (`invest_visible` default ya); tombol tampil/sembunyi tetap di admin, dicatat di log audit | ✅ kode + uji unit + E2E (6/6) + browser desktop & HP (27 Okt); tayang setelah merge + deploy |
| 27.4b | **Semua paket** dilelang tiap siklus | setiap edisi setiap aplikasi (1 tahun, 37) + setiap lisensi lifetime per aplikasi (6 tingkat perangkat × 10) + suite (6) = 103 lot per siklus; dibuka bertahap oleh cron (20 lot per menit, aman untuk batas sub-permintaan Worker); halaman memakai ringkasan indeks R2, bukan membaca 103 dokumen | ✅ kode + uji unit + E2E (6/6) + browser desktop & HP (27 Okt); tayang setelah merge + deploy |
| 27.4c | Sesi baru **langsung** | lot siklus berikutnya dibuat dalam 24 jam terakhir siklus berjalan dan mulai tepat saat siklus itu berakhir — tidak ada jeda | ✅ kode + uji unit + E2E (6/6) + browser desktop & HP (27 Okt); tayang setelah merge + deploy |
| 27.4d | Berakhir **Jumat 07.00 WIB** | "jam 7 pagi" dibaca sebagai waktu Indonesia Barat (UTC+7) = Jumat 00.00 UTC; siklus pertama berakhir Jumat 6 Nov 2026 07.00 WIB, lalu tiap 14 hari; semua teks 10 bahasa dan waktu di halaman memakai WIB | ✅ kode + uji unit + E2E (6/6) + browser desktop & HP (27 Okt); tayang setelah merge + deploy |
| 27.4e | Pemenang tampil | beranda (strip pemenang), portal member (beranda member + halaman Lelang), portal admin (ringkasan admin + Licence auction) | ✅ kode + uji unit + E2E (6/6) + browser desktop & HP (27 Okt); tayang setelah merge + deploy |

### 27.5 Perintah pemilik 27 Okt 2026 (3) — lisensi setelah bayar, "belum membayar", kenaikan 10 %, bukti transfer

"Licensi pemenang lelang baru akan otomatis di kirim jika pemenang lelang sudah melakukan pembayaran, jika tidak
melakukan pembayaran jgn d kirim licensinya dan tetap di tampilkan dengan keterangan belum membayar, setiap bid itu
kenaikan 10% dari harga awal 25%..jika melakukan pembayaran secara manual maka wajib kirim screenshoot pembayaran dan
akan di acc admin manual" (REQUESTS 95). Ini mengganti aturan "48 jam lalu jatuh ke penawar berikutnya" di §26.5:

| # | Aturan | Cara kerja | Status |
|---|---|---|---|
| 27.5a | Lisensi hanya setelah bayar | lisensi diterbitkan dan dikirim otomatis hanya oleh pembayaran yang terverifikasi (checkout biasa); kemenangan saja tidak pernah menerbitkan lisensi | ✅ kode + uji unit + E2E (6/6) + browser desktop & HP (27 Okt); tayang setelah merge + deploy |
| 27.5b | Pemenang belum bayar tetap tampil | status "Belum membayar" di beranda, portal member dan portal admin; tidak ada pengalihan otomatis ke penawar berikutnya (bawaan mati — admin tetap bisa "Pass on" atau "Cancel" secara manual, dan bisa menyalakan pengalihan otomatis di Admin → Licence auction) | ✅ kode + uji unit + E2E (6/6) + browser desktop & HP (27 Okt); tayang setelah merge + deploy |
| 27.5c | Kenaikan tiap tawaran 10 % dari harga awal | harga awal = 25 % harga normal; setiap tawaran menaikkan harga **tepat** 10 % dari harga awal (contoh: normal $990 → awal $248 → naik $25 per tawaran: $273, $298, …), maksimal harga normal | ✅ kode + uji unit + E2E (6/6) + browser desktop & HP (27 Okt); tayang setelah merge + deploy |
| 27.5d | Bayar manual wajib bukti | transfer bank: pemenang wajib mengunggah screenshot bukti bayar; admin menyetujui secara manual (Admin → Orders / Support); tanpa screenshot persetujuan ditolak; setelah disetujui lisensi terkirim otomatis | ✅ kode + uji unit + E2E (6/6) + browser desktop & HP (27 Okt); tayang setelah merge + deploy |

### 27.6 Perintah pemilik 27 Okt 2026 (4) — SEO dulu, lalu lelang di depan, satu kotak surat

Urutan dari pemilik (REQUESTS 96–100): **(1) perbaiki SEO seluruh situs** (per kata kunci, sitemap XML, berkas
pendukung, tautan antarsitus yang aman untuk AdSense) → **(2) lanjutkan lelang** axto.io dan xaa.es. Rencana:

| # | Pekerjaan | Rincian | Status |
|---|---|---|---|
| 27.6a | Lelang lisensi paling depan di axto.io | bagian pertama beranda: lelang yang sedang berjalan, hitung mundur ke Jumat 07.00 WIB, lot terpanas, pemenang (lunas / belum membayar) | 📝 setelah SEO |
| 27.6b | Semua e-mail ke hello@axto.io | notifikasi order, dukungan, lelang, investor dan kontak dari axto.io **dan** xaa.es masuk ke satu kotak surat hello@axto.io (satu manajemen); alamat balas tetap per situs | 📝 setelah SEO |
| 27.6c | Lelang xaa.es (website, bukan lisensi) | blueprint di repo xaa `docs/BLUEPRINT.md` §9 dan di blueprint HTML | 📝 blueprint |
| 27.6d | Blueprint HTML yang bisa diunduh | satu berkas `docs/BLUEPRINT.html` (repo ulyah.com) berisi semua perintah, aturan, status dan rencana | ✅ 27 Okt (ulyah.com #369) |
| 27.6e | SEO axto.io | `lib/seo.ts`: `<title>` setiap halaman publik ≤ 60 karakter (judul dipotong di jeda kalimat terakhir yang muat, kata kunci di depan, " \| AXTO" bila muat, tidak pernah "AXTO \| AXTO"), description ≤ 160 dipotong di akhir kalimat, Open Graph tetap lengkap; empat judul ditulis ulang agar muat utuh; `/llms.txt` (aplikasi, self-hosted, pembelian, pustaka, blog) dan `/.well-known/security.txt`; `scripts/live-audit.mjs` kini menggagalkan judul > 60, description > 160 dan berkas yang hilang. Uji: `tests/seo.test.ts`; audit build lokal 554/554 halaman, 0 judul terlalu panjang, 0 judul ganda | ✅ 27 Okt; tayang setelah merge |

### 27.7 Perintah pemilik 27 Okt 2026 (5) — verifikasi penawar otomatis

"e2e-admin@axto.io itu email dari mana … gw g punya email begitu, lu bikinin dah biar otomatis tanpa harus dari email
website" (REQUESTS 101). e2e-admin@axto.io hanya ada di runtime uji lokal (dibuat dan dihapus oleh `tests/e2e`), tidak
pernah di axto.io.

| # | Pekerjaan | Rincian | Status |
|---|---|---|---|
| 27.7a | Penawar terverifikasi otomatis | tidak ada lagi kode 6 digit lewat e-mail: anggota yang sudah masuk (login) langsung menjadi penawar begitu memilih nama yang ditampilkan saat menang (tetap disaring: kata kasar, merek orang lain, kontak); dokumen `auction_bidders` dibuat saat nama disimpan | ✅ 27 Okt (E2E lelang 6/6, browser desktop & HP) |
| 27.7b | Admin tidak menawar | akun admin melihat keterangan "Akun admin menjalankan lelang dan tidak ikut menawar" di halaman Lelang, bukan formulir menawar | ✅ 27 Okt (E2E lelang 6/6, browser desktop & HP) |
| 27.7c | Teks 10 bahasa | langkah "Verifikasi e-mail", aturan dan FAQ diganti: cukup masuk dan memilih nama | ✅ 27 Okt (E2E lelang 6/6, browser desktop & HP) |

## 28. Perintah pemilik 27 Okt 2026 (6) — rekening dari ulyah.com/donasi, konversi, panduan bayar manual

"Baik axto.io dan xaa.es tolong ambil rek pembayaranya dari https://ulyah.com/donasi / dari repo termasuk jaringannya
barcode nya … Pastikan konversi mata uang sesuai dengan rekening BNI untuk manual, dan pandu customer untuk pembayaran
manual sampai sukses" (REQUESTS 104). Rencana xaa.es yang sama: repo xaa `docs/BLUEPRINT.md` §12.

Keadaan sekarang (`lib/billing/gateways.ts`): metode "Bank transfer (BNI)" hanya IDR, USD dan EUR; metode kripto
langsung memuat USDT (TRC20/ERC20/BEP20), USDC, BTC, ETH, SOL — belum BNB dan DOGE, belum QR; jumlah transfer non-USD
belum mengikuti kurs harian.

| # | Pekerjaan | Rincian | Status |
|---|---|---|---|
| 28a | Impor rekening | tombol Admin → Payment & email → "Impor dari ulyah.com/donasi": membaca sumber publik ulyah.com (13 rekening wondr by BNI: IDR, USD, SGD, AUD, GBP, CNY, EUR, HKD, JPY, MYR, SAR, KRW, THB; SWIFT BNINIDJA; kode bank 009; nama penerima; 5 dompet: BTC, USDT TRC20, BNB/USDT BEP20, SOL, DOGE dengan jaringannya), menampilkan perbedaan, lalu menyimpan ke penyimpanan terenkripsi. **Nomor rekening dan alamat tidak pernah ditulis di repo ini, halaman publik, log, atau prompt AI**; hanya tampil di checkout pembeli yang sudah masuk (§4 CLAUDE.md) | ⏳ |
| 28b | QR per dompet | QR dibuat di server dari alamat tersimpan (tanpa layanan luar), nama jaringan tercetak besar, peringatan "kirim hanya lewat jaringan ini" | ⏳ |
| 28c | Konversi sesuai rekening BNI | harga USD → mata uang rekening yang dipilih pembeli dengan kurs acuan harian (ECB lewat frankfurter.app; SAR lewat patokan 3,75/USD), satu dokumen R2 per hari, pembulatan ke atas sesuai satuan (IDR/JPY/KRW tanpa desimal), kode unik 3 digit untuk IDR, jumlah terkunci 72 jam di invoice, selisih biaya bank ≤ 2 % diterima dan dicatat | ⏳ |
| 28d | Panduan bayar manual sampai sukses | 6 langkah di checkout dan portal member: pilih cara → salin data persis → cara transfer sesuai asal dana (bank Indonesia, SWIFT luar negeri, Wise/Revolut, dompet kripto) → unggah bukti (wajib untuk transfer bank) → pelacak status (menunggu → disetujui → lisensi terkirim otomatis, atau "perlu perhatian" dengan langkah perbaikan) → pengingat & chat; animasi panduan sesuai §18 dan `prefers-reduced-motion`; 10 bahasa | ⏳ |
| 28e | Uji | unit (konversi, pembulatan, kode unik, kunci 72 jam), E2E (checkout → bukti → admin setuju → lisensi), browser desktop & HP tanpa error konsol | ⏳ |


## 29. Perintah pemilik 27 Okt 2026 (7) — periksa seluruh axto.io, kembangkan yang masih sederhana

"Setelah pekerjaan terbuka selesai & siap produksi tanpa membuka rahasia: periksa seluruh axto.io (publik, member,
admin) dan kembangkan semua yang masih sederhana atas inisiatif sendiri" (REQUESTS 108). Dikerjakan setelah §27–§28;
setiap temuan dicatat di sini dulu (halaman, apa yang kurang, pembanding kelas dunia), lalu dibangun. Unit iklan
in-article + multiplex (REQUESTS 109) **ditahan pemilik**, rencananya hanya di repo ulyah.com
`docs/ADSENSE-BLUEPRINT.md` §16.

28 Okt 2026 (REQUESTS 111): "Cek seluruh aplikasi sampe ke puncak pengetahuan lu, kembangkan dan pastikan 100% siap
produksi" — audit ini sekarang diperintahkan, mulai setelah §30 tayang. Urutan: (1) aplikasi Docker yang dijual
(10, `AXTO-APPS-BLUEPRINT.md` §16) — instal nyata lewat AXTO Setup, uji fitur inti, bandingkan dengan pembanding
kelas dunia; (2) portal member; (3) admin; (4) situs publik. Setiap temuan ditulis di tabel di bawah dulu, lalu
dibangun dan diuji (unit, E2E, browser desktop & HP).

### 29.A4 Temuan batas edisi di engine (dicatat sebelum dibangun, REQUESTS 111/113)

Pembanding: lisensi bertanda tangan membawa edisi (`lib/editions.ts`, `lib/entitlements.ts`); engine harus menolak
di atas batas, bukan hanya menampilkannya. Tabel ini adalah keadaan sebelum perbaikan:

| Engine | Batas yang dibawa lisensi | Keadaan sebelum | Keadaan sesudah |
|---|---|---|---|
| Orchestra | worker CPU/GPU, autoscaling, federasi, cost analytics, jumlah node | `require_feature` membaca daftar fitur yang salah; tidak ada batas worker; autoscaler jalan di edisi Starter; kolom konsol tidak cocok dengan API | ✅ `enforcement.check_worker_slot` (402 `WORKER_LIMIT`), `has_feature` (402 `FEATURE_NOT_LICENSED`), node 402 `NODE_LIMIT`, autoscaler hanya di edisi yang punya fitur, GPU di batas `gpu_workers`; 24 tes pytest |
| Vault | kuota harian | ✅ ditegakkan | ✅ |
| Guardian | jumlah node | `/node/register` tanpa `max_nodes` | ⏳ fase C2 |
| Edge | kunci pelanggan, request per hari | tidak ditegakkan | ⏳ |
| SOC | sumber log, EPS | tidak ditegakkan | ⏳ |
| Compliance | kerangka kerja | tidak ditegakkan | ⏳ |
| Sentinel | perangkat (`/v1/devices/authorize`) | tidak ditegakkan | ⏳ |
| Antivirus | endpoint, guardian_ml | tidak ditegakkan | ⏳ |
| Studio | request per hari, GPU | tidak ditegakkan | ⏳ |
| Legal | edisi | ✅ membaca edisi | ✅ |

Semua engine sudah mengurai entitlement bertanda tangan ke `LicenseState.features`; yang kurang adalah penegakan di rute.

## 30. Perintah pemilik 28 Okt 2026 — Orchestra AI 6 GB bisa diunduh, paket offline Windows

"Lanjut kembangkan axto.io, kenapa orchestra AI tar.gz yg 6gb lebih g bisa di download, dan kenapa yg .exe nya cuma
mb... Harusnya bisa di download di portal member, dan docker exe harusnya 6gb lebih jg" (REQUESTS 110).

**Akar masalah (diperiksa, bukan ditebak):**

1. Image GPU Orchestra (`orchestra-worker-gpu.tar.gz`, **6,1 GB**, dibangun `auto-build-gpu.yml` 30 Sep, ada di R2
   `axto-builds/builds/latest/raw/`) ditandai *optional*. AXTO Setup melewati **semua** image optional
   (`installer/setup.go`: `if im.Optional { continue }`) dan layanan GPU di `orchestra-compose.yml` masih berupa
   komentar — jadi lewat installer image 6 GB itu tidak pernah terunduh dan tidak pernah jalan.
2. Di portal member, tautan image ada di balik tombol "Docker manual", tanpa ukuran, dan
   `/api/selfhosted/download` tidak mendukung `Range`: unduhan 6 GB yang terputus harus mulai dari nol.
3. `.exe` yang "cuma MB" adalah AXTO Setup: installer daring yang mengunduh image Docker saat instalasi (memang kecil),
   plus sisa EXE per aplikasi model lama di `builds/latest/exe/` (pipeline-nya dihapus, REQUESTS 1) yang di Admin →
   Releases salah diberi judul "Windows installer".
4. Satu berkas `.exe` di atas 4 GB tidak bisa dijalankan Windows (batas format PE), jadi "exe 6 GB" dibuat sebagai
   **paket offline**: satu `.zip` berisi AXTO-Setup.exe + installer Linux + semua image aplikasi (Orchestra ≈ 7 GB
   termasuk GPU). AXTO Setup yang dijalankan dari folder paket memakai image di sebelahnya, tanpa mengunduh lagi.

| # | Pekerjaan | Rincian | Status |
|---|---|---|---|
| 30a | GPU di AXTO Setup (= fase G1 `AXTO-APPS-BLUEPRINT.md` §16.3 untuk NVIDIA) | pilihan "Worker GPU (NVIDIA) — 6,1 GB" di wizard (otomatis dicentang bila `nvidia-smi` menemukan GPU yang bisa dipakai Docker) dan `--gpu` / `--with` di CLI; di Linux tanpa runtime `nvidia` (nvidia-container-toolkit) atau tanpa GPU: berhenti **sebelum** unduhan dengan cara memperbaikinya; image diunduh (bisa dilanjutkan) dan dimuat; layanan GPU di `orchestra-compose.yml` aktif lewat compose profile `gpu`; start/stop/update/uninstall ikut profil yang dipasang; `doctor` melaporkan GPU. AMD/Intel (profil `gpu-amd`/`gpu-intel`) menyusul — image ROCm/OpenVINO belum ada | ✅ 28 Okt (go test: profil, pilihan, GPU siap/tidak) |
| 30b | Mode offline AXTO Setup | image dicari dulu di `images/` di sebelah AXTO-Setup.exe (atau `--images DIR`); ukuran harus sama dengan build di portal; lisensi tetap diperiksa online (lifetime: aktivasi file seperti biasa) | ✅ 28 Okt (go test + E2E: update dari folder paket "from the offline package", tanpa unduhan) |
| 30c | Unduhan portal yang bisa dilanjutkan | `Range` + `HEAD` + `ETag` di unduhan member, image bertanda tangan, installer dan admin (satu helper `lib/builds.ts`) | ✅ 28 Okt (unit Range + E2E: HEAD, 206, If-Range → 200, 416, paket offline 206) |
| 30d | Portal member | ukuran setiap image tampil; tombol "Paket offline (Windows/Linux)" per aplikasi dengan ukurannya; penjelasan GPU & offline dalam 10 bahasa | ✅ 28 Okt (browser desktop & HP: 0 error konsol, tanpa geser horizontal) |
| 30e | Admin → Releases | tautan unduh setiap berkas; grup "AXTO Setup", "Paket offline", dan "EXE lama (tidak ditawarkan ke member)" | ✅ 28 Okt (browser desktop & HP) |
| 30f | Paket offline di CI | workflow `build-offline.yml`: AXTO-Setup.exe + installer Linux + image tiap aplikasi + README + SHA256 → `builds/latest/offline/axto-<app>-offline-amd64.zip` (multipart ke R2); jalan setelah build image/installer dan manual | ✅ dibangun + dry-run lokal (manifest, README, SHA-256, zip); run pertama setelah merge |
| 30g | Uji | Go (pilihan image, profil compose, pencarian image lokal), unit dashboard (Range), typecheck, E2E, browser desktop & HP | ✅ 28 Okt: go test, tsc, unit 249/249, E2E 141/141, browser desktop & HP |

## 31. Perintah pemilik 28 Okt 2026 (axto.io) — lelang di atas, Docker dengan lisensi, GPU, uji produksi

REQUESTS 112–114. Dikerjakan berurutan; setiap butir hanya ditandai ✅ bila sudah diuji.

| Butir | Keadaan |
|---|---|
| 112 lelang dan harga jual $10 juta di bagian atas beranda | ✅ `components/site/HomeSaleBand.tsx` di atas hero: harga dibaca langsung dari `/api/acquire` (pengaturan admin, bukan konstanta), hitung mundur lelang bila berjalan; lelang dipindah dari tengah ke tepat sesudah hero; band hilang bila sudah terjual |
| 113 Docker dapat diunduh tetapi tidak bisa dipakai tanpa lisensi | ⏳ Orchestra ✅ (A4); sembilan engine lain — lihat tabel §29.A4 |
| 113 worker GPU exe sesuai tar.gz | ✅ paket `axto-orchestra-offline-amd64.zip` (6,6 GB, CI run 40654790414): `images/orchestra-worker-gpu.tar.gz` = 6.524.739.678 byte, SHA-256 `d779ea53…b351`, sama dengan `manifest.json` dan `SHA256SUMS.txt`; image diambil apa adanya dari `raw/` R2 tanpa transformasi. `AXTO-Setup.exe` (6,5 MB) memuat installer; image ada di paket yang sama |
| 113 deteksi GPU, auto dan manual scaling dengan indikator pintar dalam jatah lisensi GPU | ✅ Orchestra: `autoscale_config.py` (aturan konsol), autoscaler memakai beban GPU, batas `gpu_workers`, suhu GPU di heartbeat, rerouting panas, deteksi GPU per node (`/api/nodes/{id}/detect_gpu`); konsol dicek di browser desktop dan HP 
| 113 deteksi GPU **semua merek** (NVIDIA, AMD, Intel, Apple, Moore Threads, Huawei Ascend, Biren, Iluvatar, MetaX, Enflame, Cambricon, Hygon, Qualcomm, Arm, Matrox, merek lain) | ✅ `orchestra_worker/gpu_inventory.py` dan `installer/gpu.go` memakai aturan yang sama: Linux `lspci` (database PCI dunia) → `/sys/bus/pci` bila lspci tidak ada; Windows `Win32_VideoController` + VRAM dari registry driver (`qwMemorySize`, karena `AdapterRAM` mentok di 4 GB); macOS `system_profiler`; `nvidia-smi`, `rocm-smi`, `xpu-smi` untuk model dan VRAM yang tepat; kartu virtual (Microsoft Basic, QEMU, VMware, VirtIO) tidak dihitung. Kesiapan: NVIDIA lewat runtime CUDA; merek lain lewat Ollama di komputer itu — `/api/ps` `size_vram > 0` dibuktikan, bukan diasumsikan. 27 tes Python + tes Go lintas merek; installer dan `doctor` menampilkan daftar GPU lengkap |
| 113 container GPU worker untuk AMD (`/dev/kfd`, `/dev/dri`) dan Intel (`/dev/dri`, XPU) | ⏳ compose hanya memesan perangkat NVIDIA; kartu AMD/Intel dipakai lewat Ollama di komputer (sudah bisa), container worker khusus merek ini belum dibuat |
| 113 auto dan manual scaling dengan indikator pintar dalam jatah lisensi GPU | ✅ Orchestra: `autoscale_config.py` (aturan konsol), autoscaler memakai beban GPU, batas `gpu_workers`, suhu GPU di heartbeat, rerouting panas, deteksi GPU per node (`/api/nodes/{id}/detect_gpu`); konsol dicek di browser desktop dan HP |
| 114 uji penuh axto.io | ⏳ `npm test` 249/249 ✅; `tsc` ✅; E2E penuh lokal dan CI — lihat catatan commit |

### 31.B Orchestra AI dan GPU worker di situs (REQUESTS 115–116)

Permintaan pemilik 28 Okt: klien bingung apa itu Orchestra AI; GPU worker belum dipromosikan di beranda, termasuk
harganya; perlu penjelasan jelas dan panduan penggunaan dengan tangkapan layar dan animasi.

| Butir | Keadaan |
|---|---|
| Klaim publik yang tidak sesuai kode diperbaiki | ✅ katalog produk dan tagline 10 bahasa tidak lagi menjanjikan endpoint `/v1/chat/completions`, metrics format Grafana, atau budget harian: kode router tidak menyediakannya (`/api/jobs/submit` dilindungi kata sandi konsol, tidak untuk aplikasi klien; `central_ai_pool.py` tidak dipanggil). Integrasi ke Studio dan Vault dihapus dari halaman karena tidak ada kodenya; Guardian tetap (support bot memanggil Orchestra) |
| Promo di beranda: Orchestra AI dan GPU worker, dengan harga live | ✅ `components/site/OrchestraSpotlight.tsx`: harga dari `/api/editions` (tabel admin), tombol beli dan panduan |
| Penjelasan dan panduan di `/self-hosted/orchestra` | ✅ `components/site/OrchestraGuide.tsx`: apa itu Orchestra, alur permintaan (animasi CSS, berhenti bila reduced motion), GPU worker dan cara cek `ollama ps` 100% GPU, sembilan langkah (termasuk Client API) dengan tangkapan layar konsol nyata, rekaman video penggunaan (MP4) |
| Bahasa | ✅ promo 10 bahasa; panduan dan teks halaman dalam Inggris dan Indonesia, bahasa lain memakai Inggris (fallback) — terjemahan lengkap belum |
| Panduan penggunaan untuk sembilan aplikasi lain | ⏳ belum dibuat; satu per satu dengan tangkapan layar dan animasi, mengikuti pola Orchestra |
| Klien API untuk aplikasi (endpoint OpenAI-compatible dengan kunci per aplikasi) | ✅ dibangun 28 Okt atas perintah pemilik (REQUESTS 118) — §31.C |

### 31.C Orchestra client API (REQUESTS 118)

Pemilik, 28 Okt 2026, menunjuk daftar celah di layar ("Jgn lupa kerjoan yg d screen shoot … Kerjaon"); butir pertama:
aplikasi klien belum bisa memanggil Orchestra dengan aman.

- **Endpoint** (`orchestra/orchestra_core/client_api.py`): `GET /v1/models` dan `POST /v1/chat/completions` dengan format
  OpenAI (SDK OpenAI apa pun cukup mengganti base URL ke `http://server:8088/v1`). Permintaan masuk antrean, router memilih
  worker (GPU, CPU, atau penyedia cloud dengan kunci dari Credential Vault) menurut aturan routing; jawaban membawa `usage`,
  model yang benar-benar dipakai, `job_id`, biaya dan latensi. `model: "auto"` atau `penyedia/model`; model yang tidak
  dilayani worker mana pun ditolak dengan jelas (404/503), tidak menggantung.
- **Kunci klien**: dibuat di konsol (halaman Client API), ditampilkan sekali, disimpan hanya SHA-256-nya (tabel
  `client_keys`, skema v6). Per kunci: permintaan/menit dan token/menit (tabel `rate_limits`), anggaran bulanan US$
  (biaya penyedia berbayar bulan berjalan, dicek sebelum setiap permintaan), daftar model yang boleh dipakai; bisa dicabut.
  Setiap buat/ubah/cabut tercatat di audit log. Tanpa lisensi aktif: 403 `licence_inactive`.
- **Batas yang jujur** (tertulis di konsol dan panduan): hanya pesan teks; gambar/audio di pesan dan tool calling ditolak
  dengan pesan jelas; `stream: true` mengirim jawaban sebagai satu potongan setelah worker selesai.
- **Perbaikan router yang ditemukan saat membangun**: pekerjaan yang tidak mendapat worker setelah percobaan habis kini
  selesai dengan alasan (sebelumnya tetap "running" selamanya); thread untuk satu pekerjaan tidak lagi mengambil pekerjaan
  lain lalu meninggalkannya; kesalahan setiap percobaan disimpan sehingga pekerjaan yang gagal menyebut sebabnya.
- **Tes**: `tests/test_client_api.py` (9 tes: kunci di-hash, format OpenAI, routing per model dan daftar model kunci,
  stream SSE, kunci/permintaan salah, worker gagal, batas, anggaran, pencabutan, tanpa lisensi, tanpa worker); uji nyata di
  server lokal (`/v1/models`, model tak dikenal, cabut kunci); halaman konsol di desktop dan ponsel tanpa error.
- **Situs**: katalog Orchestra (kemampuan + manfaat) dan panduan langkah 9 "Hubungkan aplikasi Anda" (Inggris/Indonesia,
  tangkapan layar `11-client-api.png`); tes `orchestra-copy.test.ts` memastikan setiap path yang disebut memang dilayani.

### 31.D Saran GPU dan notifikasi (REQUESTS 119)

Pemilik, 28 Okt 2026: "ada notif saran gpu mana yg tersedia". `orchestra_core/gpu_advisor.py` membaca heartbeat worker
(beban, suhu, VRAM, status) dan aturan Auto-Scale, lalu `GET /api/gpu/advice` (konsol) memberi:
- **GPU yang bisa bekerja sekarang, terbaik dulu**, dengan urutan yang sama seperti strategi termal (coolest first,
  load balanced, VRAM available); GPU panas di atas batas kritis, yang dijeda, dan yang tidak mengirim heartbeat tidak ikut.
- **Notifikasi** dengan id tetap: GPU tersedia (nama, beban, suhu, VRAM), GPU hangat/panas (ke mana pekerjaan berikutnya
  dikirim), GPU dijeda karena suhu, worker tidak menjawab, semua GPU sibuk (dengan sisa slot GPU edisi, saran Auto-Scale
  atau upgrade), GPU menganggur, belum ada GPU.
- **Konsol**: panel "GPU suggestions" di GPU Pool; notifikasi baru yang penting muncul sekali di mana pun pengguna berada
  (yang paling serius, dengan jumlah lainnya). Tes `tests/test_gpu_advisor.py` (5) dan uji browser desktop/ponsel.

### 31.E Update tidak boleh mematikan Orchestra pelanggan (REQUESTS 135)

**Bug yang ditemukan:** pemeriksaan integritas modul (`orchestra_core/security_hardening.py`) memakai cara
"percaya pada pemakaian pertama": hash enam modul yang dijaga (`enforcement`, `credential_vault`, `job_router`,
`worker_manager`, `routing_engine`, `ai_providers`) disimpan di `DATA_DIR/module_hashes.json`, yaitu di volume data
pelanggan yang tetap ada setelah update. Begitu image baru mengubah salah satu modul itu (misalnya client API, §31.C),
hash tidak cocok lagi, dianggap "tampering", lalu `main.py` berhenti dengan `SystemExit(1)`. Setiap instalasi lama akan
gagal menyala setelah update, tanpa ada yang bisa memperbaikinya dari jauh (zero-touch).

**Perbaikan:**
- Saat image dibangun, `orchestra/Dockerfile` menulis `module_hashes.release.json` di samping modul
  (`security_hardening.write_release_manifest()`): hash modul persis seperti yang dikirim rilis itu. Setiap rilis
  membawa manifesnya sendiri, jadi update resmi tidak pernah dianggap perusakan.
- Saat start, modul dibandingkan dengan manifes itu. Modul yang diubah, dihapus, atau ditambahkan di dalam container
  tetap tertangkap dan Orchestra tetap berhenti (kritis). Manifes yang rusak juga dianggap gagal (fail closed).
- File lama `module_hashes.json` di volume data tidak dibaca dan tidak ditulis lagi, tetapi juga tidak dihapus
  (data pelanggan tidak disentuh). Izinnya tetap dijaga 0600.
- Dijalankan dari source tanpa manifes (pengembangan, tes): dilaporkan sebagai `mode: development`, tidak berhenti.
- **Tes:** `tests/test_hardening.py` (7): tanpa manifes, manifes cocok, modul diubah, modul dihapus/ditambah, manifes
  rusak, skenario update dengan `module_hashes.json` lama di volume, dan `run_all()` tanpa kegagalan kritis setelah
  update. Diuji juga dengan container nyata: image lama berhenti dengan file hash lama, image baru menyala dengan
  volume yang sama, modul yang diubah di dalam container baru tetap menghentikannya.

### 31.F Worker GPU: sama di Windows & Linux, semua merek, scaling dan indikator pintar (REQUESTS 136)

Pemilik, 1 Nov 2026: "Pastikan build image untuk windows & Linux worker gpu betul2 sama, auto detect All driver gpu, smart
scalling auto dan manual, smart indikator gpu dan smart2 lainya tambahkan yg menurut anda masih bisa d tambahkan".

**Hasil audit kode (1 Nov 2026), jujur:**
- Image dan compose untuk Windows dan Linux memang sama (`orchestra/Dockerfile.worker-gpu`, `orchestra-compose.yml` profil
  `gpu`), tetapi image itu hanya NVIDIA (PyTorch cu121). AMD dan Intel terdeteksi, tetapi tidak bisa menghitung di dalam
  container; installer menolak worker GPU tanpa kartu NVIDIA (`installer/setup.go`).
- Kesiapan berbeda per OS: di Windows tidak ada pemeriksaan sama sekali (`installer/docker.go` `gpuUsable`), di Linux hanya
  runtime `nvidia` di `docker info`. Wizard Windows mencentang GPU otomatis, CLI Linux butuh `--gpu`. Ollama di host Linux
  (bind 127.0.0.1) tidak terjangkau dari container lewat `host-gateway`, tanpa peringatan.
- Deteksi berarti "ada di bus PCI", bukan "bisa dipakai container": tidak ada pemeriksaan `/dev/nvidia*`, `/dev/kfd`,
  `/dev/dri/renderD*`, `/dev/dxg` (WSL). "Microsoft Basic Render Driver" (WSL) bisa tampil sebagai GPU palsu.
- Registrasi tidak mengirim merek, nama kartu, backend, jumlah, driver; heartbeat hanya `load_pct` (slot tugas, bukan
  utilisasi GPU), `tasks_active`, `temp_c`. Pembacaan `nvidia-smi` rusak bila ada 2 GPU atau lebih; suhu `rocm-smi`
  berbentuk desimal gagal dibaca. Worker yang barisnya hilang tidak mendaftar ulang; setiap restart menambah baris baru.
- Konsol: merek bawaan selalu NVIDIA, VRAM terpakai selalu 0, suhu kosong tampil "✅ OK", GPU Pool tidak memperbarui
  sendiri, "Min GPU Workers" tidak bisa 0.
- Scaling: backend bawaan `noop` (mencatat "scale up" tanpa menyalakan apa pun); backend docker tidak bisa jalan (tidak
  ada docker CLI/socket, tanpa token, jaringan salah); tambah/kurang manual hanya menyalin/menghapus baris database;
  `/run` dan `/shutdown` worker tanpa autentikasi.

**Rencana, dikerjakan berurutan (satu PR per fase, CI hijau, lalu merge):**
- **G1 — deteksi yang berarti "bisa dipakai", telemetri per GPU, indikator pintar.** Worker memeriksa node perangkat
  (`/dev/nvidia*`, `/dev/kfd` + `/dev/dri/renderD*`, `/dev/dxg` untuk WSL) dan mencocokkan render node dengan mereknya;
  WSL "Basic Render Driver" disaring; VRAM dari vendor tool, sysfs (`mem_info_vram_total`) atau PyTorch. Telemetri per GPU
  (utilisasi, suhu, VRAM terpakai/total, daya, kipas, throttle) dari `nvidia-smi` (multi-GPU benar), `rocm-smi`, sysfs
  amdgpu, hwmon. Registrasi membawa merek, nama, backend, jumlah, driver, kemampuan; heartbeat membawa telemetri; worker
  yang sama (alamat sama) memakai baris yang sama setelah restart; heartbeat ke baris yang hilang membuat worker mendaftar
  ulang. Konsol: merek dan nama kartu asli, utilisasi GPU nyata di samping slot tugas, VRAM terpakai/total, daya, rincian
  per GPU, status "tanpa telemetri" (abu-abu, bukan OK), GPU Pool diperbarui sendiri. `/run` dan `/shutdown` memakai
  token worker yang sama dengan heartbeat.
  **G1 selesai (dibangun 1 Nov 2026):** `orchestra_worker/gpu_inventory.py` (`device_access`, `drm_cards`,
  `mark_usable`: node perangkat, driver kernel, VRAM AMD dari sysfs, catatan "kenapa tidak bisa" per kartu — nouveau,
  tanpa passthrough, WSL), `orchestra_worker/gpu_telemetry.py` (baru: NVIDIA multi-GPU dengan bit throttle yang benar —
  idle bukan throttle —, rocm-smi, sysfs amdgpu/i915/xe, ringkasan: GPU terpanas, rata-rata utilisasi),
  `worker_gpu.py` (registrasi lengkap, heartbeat dengan telemetri, daftar ulang otomatis, `/run` dan `/shutdown` dengan
  token, `/shutdown` benar-benar keluar, tanpa CORS), Core skema v7 (kolom GPU di `workers`, baris yang sama dipakai
  ulang untuk alamat + node yang sama, heartbeat ke id tak dikenal → `reregister`), saran GPU (utilisasi nyata dari
  program lain ikut dihitung, VRAM bebas, GPU dengan VRAM penuh tidak pernah disarankan, notifikasi baru: tidak bisa
  dipakai + alasannya, tanpa suhu, di-throttle, VRAM hampir penuh), konsol (merek dan nama kartu asli, utilisasi GPU dan
  slot tugas terpisah, VRAM terpakai/total, daya, rincian per GPU, "no telemetry" abu-abu, GPU Pool diperbarui tiap
  8 detik, Min GPU boleh 0), image GPU dibangun ulang bila kode worker/core berubah. Tes: 47 worker (+20) dan 54 core
  (+9, termasuk upgrade database v6 → v7); uji nyata: worker asli terhadap Core lokal (registrasi, 401 tanpa token,
  daftar ulang setelah dihapus, id sama setelah restart) dan konsol di Chromium desktop + ponsel tanpa error.
- **G2 — Windows = Linux.** Satu fungsi keputusan di installer untuk kedua OS: uji GPU nyata (`docker run --gpus all`
  image worker dengan perintah uji) setelah image ada, cek driver; pilihan otomatis yang sama di wizard Windows dan CLI
  Linux (`--no-gpu` untuk menolak); pemeriksaan Ollama host dan petunjuk `OLLAMA_HOST` di Linux; profil per merek dipilih
  otomatis dan disimpan, tombol "Deteksi ulang".
  **G2 selesai (dibangun 1 Nov 2026):**
  - `installer/gpuplan.go`: satu keputusan GPU untuk wizard dan CLI di Windows, Linux dan macOS.
    - NVIDIA siap bila Linux punya runtime `nvidia` atau spesifikasi CDI; di Windows bila Docker Desktop memakai mesin
      WSL 2. Mesin Hyper-V ditolak dengan perbaikan yang jelas.
    - Versi driver dibaca dari nvidia-smi atau dari format Windows (`32.0.15.6094` → 560.94) dan dibandingkan dengan
      batas CUDA 12.1 (525.60 Linux / 528.33 Windows).
    - AMD, Intel dan merek lain memakai Ollama di host, dengan alasan yang benar per OS.
    - Peringatan bila Ollama di Linux hanya mendengar 127.0.0.1, dengan perbaikan `OLLAMA_HOST=0.0.0.0`.
  - Pilihan otomatis sama di kedua OS: wizard mencentang dan CLI menyertakan worker GPU sendiri bila siap; `--no-gpu`
    menolak, `--gpu` mewajibkan.
  - **Uji GPU nyata** di dalam image worker (`orchestra_worker/probe.py`, dijalankan dengan `--gpus all` atau
    `/dev/kfd` + `/dev/dri` seperti compose) sebelum worker GPU menyala:
    - uji gagal tidak menggagalkan instalasi: worker GPU tetap mati, alasannya tampil di wizard/CLI dan tersimpan
      (`installed.json`: `warnings`, `gpu`);
    - image lama tanpa probe diuji dengan `nvidia-smi -L`.
  - `doctor` menampilkan rencananya.
  - Tes:
    - Go: 11 tes rencana GPU, menggantikan 2 tes lama;
    - Python: 4 tes probe;
    - nyata: probe di container tanpa GPU keluar 3 dengan alasan; `--gpus all` tanpa runtime NVIDIA dan `/dev/kfd`
      yang hilang tertangkap dengan pesan Docker yang jelas.
- **G3 — image per merek dari satu Dockerfile.** `ARG GPU_VARIANT` (cuda, rocm, xpu): lapisan selain PyTorch dan vendor
  tool identik; tag per varian dan versi; dibangun ulang bila kode worker/core berubah; uji start di CI; dependensi ML
  dipatok. Profil compose `gpu` (NVIDIA), `gpu-amd` (`/dev/kfd`, `/dev/dri`), `gpu-intel` (`/dev/dri`). Docker Desktop di
  Windows hanya meneruskan GPU NVIDIA ke container; untuk AMD/Intel di Windows, worker memakai Ollama di host (yang
  memakai GPU itu langsung) dan konsol menyebutnya dengan jelas.
  **G3 dibangun (1 Nov 2026):**
  - **Satu Dockerfile** `orchestra/Dockerfile.worker-gpu` dengan `GPU_VARIANT`:
    - `cuda` menghasilkan `axto/orchestra-worker-gpu` (NVIDIA); isinya tidak berubah;
    - `rocm` menghasilkan `axto/orchestra-worker-gpu-amd` (AMD, PyTorch ROCm 6.2 yang membawa runtime ROCm).
    - Semua lapisan lain identik.
  - **CI `auto-build-gpu.yml`:** membangun keduanya sebagai matriks, menguji build PyTorch (`torch.version.cuda` /
    `torch.version.hip`) dan uji GPU di dalam image (keluar 3 tanpa GPU). PR yang menyentuh Dockerfile/requirements/
    workflow membangun dan menguji tanpa unggah; `main` mengunggah keduanya ke R2.
  - **Compose:** profil `gpu-amd` dengan `/dev/kfd` + `/dev/dri` (tiga salinan compose tetap identik).
  - **Installer:**
    - AMD di Linux siap bila host punya `/dev/kfd`, render node AMD dan driver `amdgpu`, lalu otomatis ikut dan diuji
      (probe dengan `/dev/kfd` + `/dev/dri`); bila tidak, perbaikannya `amdgpu-install --usecase=rocm`.
    - `--gpu` mengikuti merek pilihan rencana.
    - Image merek lain tidak pernah ditambahkan.
    - Image yang belum terbit di portal dilewati dengan peringatan (instalasi tetap jalan).
    - Image lama yang tidak cocok lagi dilepas saat update dengan peringatan.
  - **Portal:** image AMD terdaftar (unduh online; tidak masuk paket offline agar paket tidak membengkak).
    Petunjuk GPU di 10 bahasa menyebut nama image dan perilaku baru (otomatis di Windows dan Linux, diuji dulu,
    `--no-gpu`).
  - **Intel (jujur):** container Intel butuh runtime Level Zero + compute runtime Intel di dalam image. Itu belum bisa
    dibuktikan di CI, jadi GPU Intel tetap lewat Ollama di host dengan alasan yang jelas di installer dan konsol. Ini
    dicatat sebagai lanjutan setelah runtime-nya terbukti.
  - **Tes:**
    - Go: 15 tes rencana, termasuk 4 AMD;
    - Python: 5 tes probe;
    - portal: tes kontrak image ↔ compose ↔ installer ↔ workflow, 290 tes lulus;
    - compose valid untuk profil `gpu-amd`.
- **G4 — scaling nyata, otomatis dan manual.** Penskala dengan akses Docker yang dibatasi (hanya container worker
  berlabel AXTO), satu worker per GPU (`--gpus device=N` / `/dev/dri/renderDN`), tambah/kurang manual benar-benar
  menyalakan/mematikan container, scale dari nol saat ada pekerjaan GPU antre, drain yang aman, satu sumber aturan
  (min/maks GPU di konsol, min boleh 0).
- **G5 — teks situs dan panduan** (10 bahasa) hanya menjanjikan yang sudah dilakukan kode; tanda ✅ di blueprint mengikuti.

## 32. Legal AI untuk seluruh dunia: dari peraturan daerah sampai hukum internasional (REQUESTS 117)

Pemilik, 28 Okt 2026: "Legal AI bukan hanya untuk indonesia, tp seluruh dunia, seluruh profinis, seluruh distrik, dari
hukum terkecil hingga hukum terberat international."

**Keadaan sekarang (kode):** prompt sistem 11 lapis (`lib/legal/prompt.ts`), 36 workspace, yurisdiksi dengan
provinsi (`lib/legal/jurisdictions.ts`), pemeriksa sitasi dan pencarian di dokumen pengguna. Belum ada korpus sumber
hukum primer: jawaban bersandar pada pengetahuan model, dokumen pengguna dan riset web opsional, sehingga nomor pasal
bisa keliru atau usang. Menambah teks prompt saja tidak menyelesaikan ini.

**Prinsip:** setiap sitasi harus bisa ditunjukkan teksnya dari sumber resmi, dengan tanggal versi; yang tidak bisa
ditunjukkan ditandai "belum terverifikasi". Cakupan ditampilkan apa adanya per yurisdiksi dan per tingkat.

**Tingkat hukum** (dari terkecil ke terberat): peraturan desa/kabupaten/kota/distrik (perda, ordinance, by-law) →
provinsi/negara bagian → peraturan pemerintah/menteri → undang-undang → konstitusi → putusan pengadilan →
hukum regional (EU, ASEAN, AU, OAS) → perjanjian dan konvensi internasional, putusan pengadilan internasional
(ICJ, ICC, WTO, ECHR, ITLOS).

| Fase | Isi | Keadaan |
|---|---|---|
| L1 | Arsitektur korpus di R2 (satu JSON per versi dokumen: yurisdiksi, tingkat, nomor, pasal, teks, URL sumber resmi, tanggal berlaku), indeks dengan `customMetadata`, log ingest append-only, backup harian 35 hari; verifikator sitasi; tes | ✅ dibangun dan dites 28 Okt (§32.A); korpus produksi masih kosong sampai konektor L2 mengisinya |
| L2 | Konektor sumber resmi yang terbuka dan bisa dibaca mesin, dijalankan di CI/cron (bukan di browser): legislation.gov.uk (Inggris), EUR-Lex/CELLAR (EU), eCFR dan US Code (AS), JDIH BPK (Indonesia, termasuk perda provinsi dan kabupaten/kota), UN Treaty Collection; negara berikutnya berurutan | ⏳ |
| L3 | Lapis riset di prompt memakai potongan korpus dengan pinpoint pasal dan tanggal versi; sitasi di jawaban dicocokkan ke korpus | ⏳ |
| L4 | Set evaluasi per yurisdiksi (pertanyaan, otoritas yang benar); metrik: ketepatan sitasi, sitasi palsu, akurasi; dijalankan di CI | ⏳ |
| L5 | Peta cakupan publik dan admin: yurisdiksi × tingkat, jumlah dokumen, pembaruan terakhir; jawaban menyebut bila yurisdiksi belum punya sumber terverifikasi | ⏳ |
| L6+ | Perluasan ke seluruh negara, provinsi dan distrik, sumber demi sumber | ⏳ |

Batas yang jujur: tidak semua negara menerbitkan hukumnya dalam format terbuka; sebagian sumber butuh izin atau
punya syarat penggunaan yang harus dipatuhi sebelum diambil. Hukum berubah, jadi setiap jawaban memakai tanggal
"per" dan menyarankan tinjauan advokat untuk keputusan penting.

### 32.A Fase L1 — korpus dan verifikator (dibangun 28 Okt 2026)

- **Korpus** (`lib/legal/corpus.ts`, R2 Store): koleksi `legal_instruments` (satu dokumen per instrumen, kunci unik
  `YURISDIKSI|jenis|nomor`, alias seperti "KUHPerdata" atau "GDPR", URL sumber resmi wajib https, status berlaku/dicabut,
  daftar versi dengan tanggal, SHA-256 teks dan jumlah pasal) dan `legal_provisions` (satu dokumen per pasal per versi,
  pinpoint seperti `art:6(1)(a)`). Yurisdiksi memakai kode ISO sampai distrik: `ID`, `ID-JB`, `ID-JB.3273`, `US-CA`,
  ditambah `EU`, `ASEAN`, `AU`, `OAS`, `COE`, `INT`; tingkatnya (lokal, subnasional, nasional, regional, internasional)
  diturunkan dari kode. Impor ulang teks yang sama tidak membuat duplikat. Data ini ikut backup harian bucket data (35 hari).
- **Pembaca sitasi** (`lib/legal/cite-parse.ts`): Indonesia (UU, Perppu, PP, Perpres, Perma, SEMA, POJK, Perda, putusan MK
  dan MA, KUHPerdata/KUHP/KUHAP/KUHD/HIR/RBg/UUD 1945), AS (U.S.C., C.F.R., Federal Rules), Inggris (Act + section,
  putusan bernomor netral), EU (regulation/directive/decision, alias), perjanjian internasional.
- **Verifikator** (`lib/legal/verify.ts`): setiap sitasi mendapat satu status — `verified` (teks resmi ada, potongannya
  ditampilkan), `verified_parent`, `not_found` (instrumen lengkap di korpus dan pasal itu tidak ada: hampir pasti salah),
  `instrument_only`, `unknown_instrument`, `not_covered`, `needs_region` (perda tanpa daerah), `unparsed`. Tidak ada
  sitasi yang disebut terverifikasi tanpa teks yang memverifikasinya.
- **API**: `POST /api/legal/verify` (anggota dengan paket Legal AI, 60 cek per 10 menit, maks. 200.000 karakter);
  `GET/POST /api/admin/legal/corpus` (cakupan per yurisdiksi; impor oleh admin atau importer CI dengan token
  `LEGAL_IMPORT_TOKEN` minimal 32 karakter yang diisi pemilik di secret; setiap impor dicatat di audit log
  `legal.corpus.import`).
- **Admin → Legal corpus** (`/admin/legal`): cakupan per yurisdiksi dan tingkat (instrumen, teks lengkap, pasal, pembaruan
  terakhir) dan impor satu instrumen dengan teks resminya (JSON yang sama dengan importer CI).
- **Tes**: `tests/legal-corpus.test.ts` (kunci, versi, semua status pada sitasi nyata ID/EU/US/UK/SG, cakupan) dan
  `tests/e2e/legal-corpus.e2e.ts` (impor terjaga, verifikasi oleh anggota, cakupan).
- **Belum** (fase berikutnya): pengisian korpus dari sumber resmi (L2), verifikator di layar Legal AI dan di jawaban (L3),
  halaman cakupan admin dan publik (L5).


## 33. Gerbang lisensi semua engine diuji dengan menjalankannya (REQUESTS 113, 118, 119)

Pemilik, 28 Okt 2026: Docker boleh diunduh dari portal, "tp tidak bisa d gunakan tanpa license resmi"; daftar celah di
layar menyebut gerbang lisensi sembilan engine lain belum diuji. Setiap engine kini punya `tests/test_licence_gate.py`
yang menyapu **semua** rute aplikasinya (bukan contoh): tanpa lisensi setiap rute di luar health/aktivasi ditolak, dengan
lisensi sah atau grace offline yang terverifikasi rute terbuka. Semua jalan di CI (`engine-tests.yml`, Python 3.11 seperti
image Docker).

Temuan (semua sudah diperbaiki):

| Engine | Celah sebelum | Sekarang |
|---|---|---|
| SOC, Antivirus | Saat start tanpa lisensi, API memasang `grace_start = sekarang` sehingga engine jalan penuh 4 jam; restart memberi 4 jam lagi tanpa batas | Terkunci sejak start (403 `license_inactive` + alasan); grace hanya dari validasi sah sebelumnya (`license.py`); cek ulang tiap menit saat terkunci, tiap 30 menit saat berlisensi |
| Compliance, Sentinel | Sama seperti di atas, ditambah `lifespan` lupa `global` sehingga status lisensi modul tidak pernah diisi: gerbang tidak pernah menutup, heartbeat memanggil validator `None` | Status modul benar; terkunci sejak start; `_lic_warn` Compliance tidak lagi crash (`{{…}}` membuat set) |
| Guardian (core) | Middleware hanya mengalihkan browser ke halaman aktivasi; ke-93 rute API (dan agen) tetap jalan tanpa lisensi; status lisensi dibekukan saat start (pencabutan/kedaluwarsa tidak mengunci); `/api/license/activate` memanggil atribut yang tidak ada lalu melaporkan gagal | Semua API dan WebSocket 403 tanpa lisensi, browser tetap mendapat halaman aktivasi; status dibaca langsung dari validator; aktivasi memakai pemeriksaan bertanda tangan yang sama dengan heartbeat dan menyimpan kunci hanya bila sah |
| Vault | Hanya rute proxy yang dicek (dan status "belum divalidasi" lolos); semua `/vault/*` (kebijakan, audit, statistik, kepatuhan, penyedia) dan WebSocket audit terbuka | Semua rute selain halaman aktivasi, `/activate`, `/health`, `/support` 403; lisensi dicek sebelum kuota dipakai |
| Edge | Tidak ada pengecekan lisensi sama sekali: gateway pelanggan `/v1/*` dan semua `/edge/*` jalan tanpa lisensi | Sama seperti Vault, gateway dan WebSocket penggunaan termasuk |
| Antivirus | WebSocket `/ws/events` tanpa lisensi dan tanpa kunci API bisa memicu pemindaian file; nama file dan ancaman dirender sebagai HTML di dasbor | WebSocket butuh lisensi (dan `?key=` bila kunci API diatur); nama di dasbor di-escape |
| Legal, Studio | Sudah benar (Legal: middleware 402; Studio: setiap rute dan WebSocket) | Dikunci dengan tes agar tetap benar; grace Studio berakhir setelah 4 jam (diuji) |
| Orchestra | Sudah benar (§31) | — |

Bukti: tes sapu rute gagal pada kode lama (contoh nyata sebelum perbaikan: SOC tanpa kunci menjawab `/v1/dashboard` dari
engine; Vault `/vault/policies` 200; Edge `/edge/plans` 200).

## 34. Penjualan axto.io (dan xaa.es) menjadi lelang sungguhan (REQUESTS 120)

> **1 Nov 2026 (REQUESTS 132) — harga baru, berlaku di atas semua angka di bawah.** Pemilik: "start penawaran di $500k,
> jgn di tulis harga $10jt, penawaran mulai $500k".
> - Tawaran pembuka **US$500.000**, datar: kenaikan mingguan bawaan 0 (Admin → Site sale masih bisa menyalakannya),
>   langkah bawaan **US$25.000** (5 % dari pembukaan). Batas bawah pengaturan admin US$500.000, batas atas tetap
>   US$100 juta. Harga tetap (mode `fixed`) bawaan juga US$500.000.
> - Pengaturan lama di R2 (US$10 juta + US$100 ribu/minggu sejak 28 Okt) dipindah sekali: setting `site_sale` tanpa
>   `priceRev` ≥ 2 dibaca dengan harga baru (pembukaan, kenaikan, hari pertama, langkah, harga tetap); simpanan admin
>   berikutnya menulis `priceRev: 2`. Putaran yang sedang berjalan langsung mengikuti harga dan langkah baru (lantai dan
>   langkah tawaran dibaca dari pengaturan saat itu; `open_usd`/`step_usd` di putaran tetap riwayat saat dibuka).
> - Teks publik di 10 bahasa: "Penawaran dimulai dari US$500.000 … tanpa batas tersembunyi". Kalimat "naik setiap
>   minggu" hanya muncul bila admin menyalakan kenaikan. Tidak ada "US$10 juta" di halaman, judul, JSON-LD, pesan API
>   atau admin. Catatan di bawah (US$10 juta, REQUESTS 120/125) adalah riwayat.


Pemilik, 28 Okt 2026: "Untuk axto.io & xaa.es minimal penawaran range random dari $10jt-$100jt, ubah bentuk penjualannya
seperti lelang, yg mengejutkan seolah peluang mendapatkan harga terbaik … dan segera ambil".

**Keputusan (jujur, tetap meyakinkan)**: penjualan berubah dari harga tetap menjadi **lelang sungguhan**, dengan tawaran
nyata, tenggat nyata, dan pemenang yang membayar tawarannya sendiri.

- **Tawaran pembuka: tangga mingguan** (REQUESTS 125, menggantikan undian acak US$10–100 juta dari REQUESTS 120).
  Pemilik: "jgn start langsung gede gitu … Start $10jt, setiap minggu naikin $100k".
  - US$10.000.000 sejak 28 Okt 2026 00:00 WIB, ditambah US$100.000 di akhir setiap minggu penuh (4 Nov → US$10,1 juta,
    11 Nov → US$10,2 juta, …). Dihitung dari tanggal, bukan per putaran: putaran baru tidak mulai dari awal.
  - Setiap tawaran minimal tangga hari itu, juga di tengah putaran yang berjalan; setelah tawaran pertama juga minimal
    tawaran tertinggi + langkah. Putaran mencatat tangga saat dibuka (`open_usd`) sebagai riwayat.
  - Admin → Site sale: harga hari pertama (US$10–100 juta), kenaikan mingguan (0 = datar) dan tanggal hari pertama.
  - Sama untuk setiap pengunjung. Tidak ada harga acak per pengunjung, tawaran palsu, atau penghitung penonton palsu.
- **Tanpa reserve tersembunyi**: tawaran tertinggi yang sah saat tenggat (di atas pembukaan) memenangkan seluruh AXTO.
  Teks "peluang harga terbaik" menyampaikan hal itu apa adanya.
- **Aturan tawar**:
  - Tawaran pertama minimal sebesar pembukaan. Tawaran berikutnya minimal tawaran tertinggi ditambah satu langkah
    (bawaan US$250.000, diatur admin). Bidder boleh menawar lebih tinggi sekaligus.
  - Pemimpin tawaran tidak bisa menawar melawan dirinya sendiri.
  - Tawaran dalam 10 menit terakhir memperpanjang lelang 10 menit (anti-snipe).
- **Bidder**:
  - Hanya member yang masuk, dan akun admin tidak menawar.
  - Bidder mendaftar dengan nama yang ditampilkan (filter kata kasar dan merek sama seperti lelang lisensi), perusahaan,
    negara, dan telepon/WhatsApp.
  - Bawaannya, pemilik menyetujui setiap bidder sebelum ia bisa menawar. Untuk nilai sebesar ini, pendaftaran
    terverifikasi lazim dipakai balai lelang. Persetujuan bisa dimatikan di Admin.
  - Di halaman publik nama bidder disamarkan (A••••).
- **Putaran**:
  - Lama bawaan 14 hari, diatur admin.
  - Putaran tanpa tawaran ditutup "unsold", lalu putaran baru langsung dibuka (bisa dimatikan).
  - Putaran dengan tawaran ditutup "awaiting payment": pemenang diminta membayar dalam 7 hari (diatur admin), lewat
    checkout yang sama (wire BNI, kripto, PayPal), sebesar tawaran menangnya.
  - Pembayaran terverifikasi menandai putaran "sold", dan alur lama tetap berjalan: pembeli otomatis menjadi admin dan
    situs ditandai terjual.
  - Admin bisa memberikan putaran ke penawar berikutnya bila pemenang tidak membayar, atau membatalkan putaran.
- **Penyimpanan R2** (tanpa D1/KV):
  - `sale_rounds` berisi satu dokumen per putaran. Setiap tawaran adalah compare-and-swap pada dokumen putaran, dan
    putaran berikutnya punya id deterministik yang dibuat sekali dengan nonce.
  - `sale_bids` berisi satu dokumen per tawaran, `<putaran>.<urutan>`, dibuat sekali.
  - `sale_bidders` berisi pendaftaran bidder.
  - Pengaturan disimpan di setting `site_sale` (`mode: auction | fixed`, `auction: {...}`).
- **Tampilan**:
  - `/acquire` hero: tawaran saat ini atau pembukaan, hitung mundur, dan jumlah tawaran.
  - Panel lelang `#bid` berisi papan tawaran langsung, aturan, pendaftaran bidder, dan formulir tawaran. Checkout hanya
    terbuka untuk pemenang.
  - Banner beranda menampilkan tawaran saat ini dan hitung mundur.
  - Admin → Site sale: mode, pengaturan lelang (dengan tombol 🎲 acak), putaran berjalan, persetujuan bidder, daftar
    tawaran, beri ke penawar berikutnya, dan batal.
  - Teks tersedia dalam 10 bahasa.
- **Tes**:
  - Unit: aturan tawar, undian dalam rentang, anti-snipe, perlombaan tawaran (CAS), penutupan, putaran baru, dan
    pembayaran yang menandai putaran terjual.
  - E2E: alur lengkap, yaitu pendaftaran → persetujuan → tawaran → penutupan → checkout pemenang → admin.
  - Browser: desktop dan ponsel.
- **xaa.es**: lelang yang sama dibangun di repositori xaa (`src/app/acquire`, `src/app/auction`), dicatat di
  `docs/BLUEPRINT.md` repositori itu.
- **Rupa (REQUESTS 124)**: panel lelang adalah "rumah lelang" gelap bernuansa emas kerajaan: kartu kaca bertepi emas,
  Playfair Display untuk judul dan harga (angka lining, kilau emas pelan), ubin hitung mundur emas, dan tombol emas
  (saat nonaktif tampil sebagai garis emas). Semua gerak mati di bawah `prefers-reduced-motion`.

## 35. Posting LinkedIn otomatis: dua posting sehari, axto.io dan xaa.es (REQUESTS 123)

Pemilik, 28 Okt 2026: "auto post otomatis setiap hari ke linked, 2 post tiap hari dari xaa.es & axto.io, bikinin
promosi yg di posting setiap hari termasuk hastag nya".

**Rancangan**
- **Admin → LinkedIn** (`/admin/linkedin`). Client ID dan Client Secret aplikasi LinkedIn disimpan di penyimpanan
  terenkripsi (`secure/linkedin.json.enc`, AES-256-GCM, sama seperti kredensial pembayaran). Admin hanya pernah melihat
  versi bertopeng. Token akses dan refresh token juga hanya ada di dokumen terenkripsi itu.
- **Hubungkan**: tombol "Connect LinkedIn" membuka OAuth 3-legged LinkedIn (`/oauth/v2/authorization`). Callback
  `https://axto.io/api/admin/linkedin/callback` hanya untuk admin, dan `state` acak dicek terhadap cookie httpOnly.
  Scope bawaan `w_organization_social rw_organization_admin`, bisa diubah di Admin.
- **Halaman tujuan per merek**: axto.io dan xaa.es masing-masing punya ID organisasi. "Find my pages" memakai
  `organizationAcls` untuk mendaftar halaman yang dikelola akun itu. Sebelum halaman axto.io / xaa.es dibuat, keduanya
  boleh memakai halaman AXTO Digital Global.
- **Jadwal**: dua posting sehari, axto.io pukul 09:00 WIB dan xaa.es pukul 13:00 WIB, bisa diubah per merek. Detak cron
  setiap menit (`/api/cron/tick`) memposting sekali per merek per hari. Penguncinya dokumen R2 `li_<merek>_<tanggal>`
  yang dibuat sekali (create-once), sehingga detak yang tumpang tindih tidak pernah memposting dua kali. Gagal sebelum
  posting dibuat dicoba lagi paling banyak 3 kali dengan jeda 15 menit. Gagal yang hasilnya tidak pasti tidak dicoba lagi
  otomatis, supaya tidak ada posting ganda.
- **Pustaka promosi** (`lib/linkedin/library.ts`): 28 posting per merek, cukup 4 minggu tanpa pengulangan, lalu berputar.
  Setiap posting punya gambar 1200×627 (`public/social/linkedin/<merek>/<id>.jpg`, dibuat oleh
  `docs/linkedin/build-kit.mjs`), teks bahasa Inggris, tautan ke halaman yang sesuai, dan hashtag. Isinya mengikuti
  katalog dan kode (tidak ada klaim pendapatan, pengguna atau angka yang tidak benar). Admin bisa mematikan posting
  tertentu, melihat pratinjau, dan "posting sekarang".
- **Format LinkedIn**: teks dikirim lewat Posts API (`POST /rest/posts`, header `LinkedIn-Version` yang bisa diubah di
  Admin). Karakter khusus little-text di-escape, hashtag ditulis sebagai `{hashtag|\#|Tag}`. Gambar diunggah lewat
  Images API (`initializeUpload` lalu PUT).
- **Token**: token akses berlaku sekitar 60 hari. Bila aplikasi diberi refresh token, token diperbarui otomatis 7 hari
  sebelum habis. Bila tidak, admin menerima e-mail pengingat untuk menghubungkan ulang.
- **Log**: setiap posting (otomatis atau manual) tercatat di R2 `social_posts` dengan status, URN dan tautan posting,
  atau galatnya. Setiap tindakan admin masuk audit log.

**Batasan LinkedIn (jujur)**: memposting atas nama halaman perusahaan butuh izin `w_organization_social` dari produk
**Community Management API**. LinkedIn harus menyetujui produk itu untuk aplikasi (Development tier lalu Standard tier).
Akun yang menghubungkan harus admin halaman. Tanpa persetujuan itu, LinkedIn menolak saat Connect dengan
`unauthorized_scope_error`, dan Admin menampilkan pesan itu apa adanya.

**Langkah pemilik**:
1. Di LinkedIn Developer Portal → aplikasi → *Auth*, tambahkan redirect URL di atas.
2. Ajukan produk *Community Management API*.
3. Buat Client Secret baru, karena secret lama sempat ditulis di chat.
4. Isi Client ID dan secret baru di Admin → LinkedIn, lalu tekan Connect.
5. Pilih halaman untuk tiap merek, lalu aktifkan.

**Tes**:
- Unit: escape little-text, hashtag, pemilihan posting harian, jadwal WIB, kunci create-once, retry, refresh token, dan
  alur posting penuh dengan `fetch` palsu (gambar diunggah, posting dibuat, URN tercatat).
- E2E: halaman Admin → LinkedIn dan API-nya (kredensial bertopeng, pustaka, pratinjau).
- Pengujian langsung ke api.linkedin.com tidak bisa dilakukan dari sesi Claude (jaringan memblokir linkedin.com). Uji
  pertama berjalan di produksi setelah pemilik menekan Connect.

## 36. ~~White label axto.io dan xaa.es (REQUESTS 126–127)~~ — DIBATALKAN 29 Okt 2026 (REQUESTS 131)

> **Dibatalkan pemilik.** Rancangan bisnis yang berlaku: **`docs/BUSINESS-MASTER-BLUEPRINT.md`**. Bagian teknis di bawah
> (instans khusus per mitra, rekonsiliator) dipakai ulang oleh fase P5 rancangan itu. Ketentuan komersial di bawah
> (US$500.000, bagi hasil 30%/20%) tidak berlaku lagi.

### (arsip) Rancangan lama

Pemilik, 28 Okt 2026: "Bikin bisnis white label axto.io, 100% white label bisa menggunakan brand sendiri, bikinin dari A-Z
kebutuhan white label sampe client terkoneksi, bikin panduanya … axto.io wajib memiliki rancangan dan sistem yg kuat serta
smart system … Biaya white label $500k … 30% dari setiap penjualan whitelabel di tahun pertama, tahun ke dua dan seterusnya
biaya tahunan turun menjadi $100k dan axto.io mengambil keuntungan 20% dari setiap transaksi … Xaa.es juga dengan sistem yg
sama".

**Kerahasiaan.** Pemilik menyebut cara kerja zero-touch ini rahasia perusahaan. Halaman publik hanya menjelaskan
penawaran. Panduan A–Z hanya tampil untuk mitra yang masuk dan untuk admin, dengan `noindex`, tanpa tautan publik dan
tanpa sitemap. Catatan: repositori guardian-ai dan xaa saat ini **publik** di GitHub. Selama begitu, kode dan dokumen ini
bisa dibaca siapa pun. Agar benar-benar rahasia, pemilik perlu menjadikan repositori privat (GitHub → Settings → Danger
Zone → Change visibility).

**Ketentuan komersial.**
- Biaya masuk **US$500.000** untuk tahun pertama. Selama tahun pertama AXTO menerima **30%** dari setiap penjualan mitra.
- Mulai tahun kedua: biaya tahunan **US$100.000**, dan AXTO menerima **20%** dari setiap transaksi.
- Tahun kontrak dihitung dari tanggal aktivasi. Pengembalian dana mengurangi bagi hasil; tidak ada bagi hasil dari
  transaksi sandbox.

**Rancangan: satu instans khusus per mitra, dijalankan otomatis.**
- **Instans khusus.** Setiap mitra mendapat salinan platform sendiri: proyek Cloudflare Pages sendiri, bucket R2 sendiri
  (data, cadangan, berkas) dan rahasia sendiri.
  - Data klien mitra terpisah total dari axto.io dan dari mitra lain.
  - Merek dibakukan saat build: nama, logo, warna, domain, e-mail, entitas hukum. Tidak ada teks "AXTO" di instans mitra,
    dan ini diuji.
  - Bagian milik pemilik dimatikan di instans mitra: /acquire, /invest, lelang situs, LinkedIn auto-post dan halaman
    perusahaan.
  - **Dua bahasa saja** (REQUESTS 130): Inggris ditambah satu bahasa ibu mitra, dipilih dari sembilan bahasa lain axto.io
    (Indonesia, Melayu, Jerman, Prancis, Italia, Mandarin, Jepang, Hindi, Arab; Arab kanan-ke-kiri). Pemilih bahasa,
    sitemap dan hreflang hanya memuat dua bahasa itu, dan bundel build hanya membawa kamus keduanya. Bahasa kedua dipilih
    di studio merek dan bisa diganti; instans dibangun ulang otomatis.
- **Status yang diinginkan + rekonsiliasi.**
  - axto.io (pusat) menyimpan status yang diinginkan untuk setiap mitra di R2: merek, domain, versi rilis, aktif atau
    ditangguhkan.
  - Alur kerja GitHub Actions `whitelabel.yml` berjalan setiap 15 menit dan setelah setiap deploy `main`. Alur ini membaca
    status dari pusat (permintaan bertanda tangan), lalu untuk setiap mitra membuat atau memperbarui proyek Pages dan
    bucket R2 (idempoten), build dengan merek mitra, deploy, memasang domain kustom dan melaporkan hasilnya ke pusat.
  - Tidak perlu kredensial baru di pusat: alur kerja memakai token Cloudflare yang sudah ada di repositori.
- **Zero-touch dari bayar sampai tayang.**
  1. Calon mitra mengajukan dan menandatangani perjanjian white label secara elektronik.
  2. Mitra membayar lewat checkout yang sudah ada: wire BNI, escrow, kripto, atau PayPal dalam batasnya.
  3. Pembayaran terverifikasi → akun mitra aktif dan studio merek terbuka.
  4. Mitra mengisi merek dan domain → rekonsiliasi membangun instansnya.
  5. Mitra memasang CNAME → domain terverifikasi otomatis, SSL otomatis → situs mitra tayang.
  6. Klien mitra mendaftar di domain mitra.
- **Klien terhubung.** Di domain mitra, klien mendapat akun, aplikasi cloud, paket, lisensi aplikasi self-hosted dengan
  merek mitra, dan API developer (AXTO Connect) dengan URL mitra.
- **Uang tidak lewat AXTO (non-custodial).**
  - Mitra memasang gateway pembayarannya sendiri (PayPal, kripto, rekening bank) di Admin instansnya, jadi uang klien
    langsung masuk ke mitra.
  - Setiap transaksi lunas atau dikembalikan di instans mitra dikirim ke pusat sebagai peristiwa bertanda tangan HMAC.
    Pusat mencatatnya sekali per pesanan (create-once) di buku besar R2.
  - Pusat menghitung bagi hasil 30% atau 20% sesuai tahun kontrak, menerbitkan tagihan bagi hasil bulanan dan tagihan
    tahunan US$100.000 secara otomatis, dan mengirim pengingat.
  - Jika lewat masa tenggang, checkout instans mitra ditangguhkan otomatis sampai lunas.
  - Instans dibangun dari kode AXTO, dan mitra tidak memegang kodenya, sehingga buku besarnya bisa dipercaya.
- **Portal mitra** di axto.io: status instans, studio merek, domain, buku besar dan bagi hasil, tagihan, perjanjian, dan
  panduan A–Z (rahasia).
- **Admin pusat**: daftar mitra, persetujuan, status rekonsiliasi per instans, buku besar, tagihan, penangguhan, dan log
  audit.

**Fase dan tes.**
| Fase | Isi | Tes |
|---|---|---|
| WL1 | Penawaran publik `/white-label`, pengajuan, perjanjian, checkout US$500.000, akun mitra aktif otomatis saat lunas | unit + E2E alur bayar → mitra aktif |
| WL2 | Studio merek dan domain (termasuk bahasa kedua), pratinjau langsung | E2E + browser |
| WL3 | `whitelabel.yml`: rekonsiliasi, build bermerek, deploy, domain, laporan status; uji "tanpa teks AXTO" pada build mitra | build mitra contoh di CI |
| WL4 | Buku besar bertanda tangan, bagi hasil per tahun kontrak, tagihan bulanan dan tahunan, pengingat, tenggang, penangguhan | unit (tahun 1/2, refund, idempoten) + E2E |
| WL5 | Rilis berjalan: setiap deploy `main` memperbarui semua instans aktif | CI |
| WL6 | Panduan A–Z untuk mitra (hanya setelah masuk) | E2E akses |
| WL7 | xaa.es dengan sistem yang sama (studio, portal klien, katalog, lelang) | sama |
