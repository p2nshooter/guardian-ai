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

Sumber perintah: `docs/REQUESTS.md`. Sumber rencana: dokumen ini (§9, §17, §18) dan
`docs/AXTO-APPS-BLUEPRINT.md` (§9 fase A–E). Persentase dihitung dari fase yang **selesai dan teruji**,
bukan dari perkiraan.

| # | Aliran kerja | Fase | Selesai | Progres |
|---|---|---|---|---|
| 1 | Aplikasi cloud v4 (Clipper, Studio, Vault, Security, Compliance, Prompt Library, Legal, Mode Lokal, Akuisisi, Connect) | §9 fase 1–10 | 10/10 | **100 %** |
| 2 | Penawaran akuisisi US$10.000.000 (§17 B) | harga · halaman premium · 10 bahasa · uji · tayang di axto.io | 4/5 | **80 %** |
| 3 | Terjemahan portal member konsisten (§17 A) | Legal (workspace) · Legal (alat) · Compliance · Security · Prompt Library · halaman kecil · crawler 0 | 1/7 | **15 %** |
| 4 | 10 aplikasi self-hosted (`AXTO-APPS-BLUEPRINT.md` §9) | A1 A2 A3 A4 B1 B2 B3 C1 C2 D1–D10 E1 E2 | 0/13 (blueprint ✅) | **0 %** |
| 5 | Desain Istana Kristal (§18) | token · komponen · publik · portal member · admin · uji visual | 0/6 (blueprint ✅) | **0 %** |
| | **Total** (bobot = jumlah fase) | | **15/41** | **≈ 36 %** |

**Urutan berikutnya** (yang paling terlihat oleh pemilik & pembeli dahulu):
1. Tayangkan §17 B (US$10 juta) + terjemahan Legal workspace yang sudah selesai.
2. A1 — nama 10 aplikasi = gambar pemilik di semua tempat; footer & menu memuat semua 10 aplikasi.
3. §18 token + komponen + beranda „One Ecosystem“ dengan 10 aplikasi.
4. A2 edisi per aplikasi → A3 program 100 trial per aplikasi (zero-touch).
5. §17 A sisa terjemahan (crawler sampai 0).
6. §18 portal member & admin (tur, ⌘K, pusat aksi).
7. A4, E1 (AXTO Workspace = kesetaraan cloud ↔ Docker), lalu B/C/D sesuai `AXTO-APPS-BLUEPRINT.md`.

**Yang butuh pemilik (tidak bisa dikerjakan AI):** sertifikat code signing EV untuk `.exe`/`.msi`,
pentest independen, audit SOC 2 / ISO 27001, pelanggan & pendapatan nyata, keputusan harga final per
edisi dan lifetime (Admin → Plans).
