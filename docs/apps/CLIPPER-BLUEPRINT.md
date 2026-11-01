# Clipper — blueprint "sampai puncak" (REQUESTS 137)

> Pemilik, 1 Nov 2026: "Bikinin aplikasi Clipper kelas dunia super kumplit dan komplex yg bisa di gunakannya baik di
> install di windows, Linux maupun di gunakan di website, dan bisa terkoneksi ke seluruh layanan cloud GPU, AI dan punya
> Central GPU & AI sendiri, tetep BYOK, bikini logika nya dan biayanya jika hasil video di save di database axto.io,
> logika sy mungkin kurang banyak, sempurnakan logika saya, dan tetap sangat menguntungkan axto.io..."

Status: **dicatat, belum dibangun.** Urutan kerja: setelah worker GPU G2–G5 (`WORK-QUEUE.md` baris 2). Metode:
`docs/apps/PEAK-METHOD.md`.

## 1. Keadaan sekarang (kode)

- Clipper web sudah tayang di `/app/clipper` (`dashboard/lib/clipper/*`). Fitur yang sudah ada:
  - transkripsi dengan kunci pengguna;
  - skor viral dengan 4 sub-skor;
  - 8 gaya teks animasi;
  - reframe dengan pelacakan wajah di perangkat;
  - edit lewat transkrip;
  - render MP4 di perangkat;
  - SRT/VTT, thumbnail, dan bahan repurpose.
- Batas paket: `clipperVideosPerMonth` 10 / 50 / 200 / tak terbatas dan `storageGB` 1 / 10 / 50 / 500 (Starter US$19,
  Pro US$49, Business US$199, Enterprise US$999 per bulan; `lib/plans.ts`).
- **Belum ada:**
  - aplikasi desktop dan server;
  - render di GPU;
  - konektor cloud GPU;
  - Central Hub;
  - simpan video ke axto.io dengan kuota dan harga;
  - publikasi otomatis ke media sosial;
  - kerja tim;
  - analitik setelah terbit.

## 2. Tolok ukur dan cara menang

| Produk | Kuat di | Kelemahan yang kita serang |
|---|---|---|
| OpusClip | skor viral, reframe, jadwal posting | video diunggah ke server mereka, kredit mahal per menit, tanpa self-hosted |
| Descript | edit lewat teks, studio suara | berat, langganan per kursi, tanpa BYOK |
| Vizard / Klap / Submagic | klip cepat, teks animasi | fitur dangkal, tanpa GPU sendiri |
| CapCut | editor lengkap, gratis | data ke pihak ketiga, tanpa otomasi korporat |

**Posisi Clipper:**
- Kualitas OpusClip ditambah edit-teks ala Descript.
- Privasi bawaan: video diproses di perangkat atau GPU milik pengguna.
- BYOK, jadi tanpa markup token.
- Satu lisensi untuk web, Windows, Linux dan server.
- Harga per bulan, bukan per menit.
- Penyimpanan murah karena R2 tanpa biaya egress.

## 3. Tiga permukaan, satu mesin

| Permukaan | Teknologi | Render | Transkripsi lokal | Untuk |
|---|---|---|---|---|
| **Web** (axto.io) | Next.js + WebCodecs (cadangan ffmpeg.wasm) | GPU peramban (WebCodecs) | — (BYOK cloud) | semua member |
| **Desktop** Windows + Linux | Tauri v2 (antarmuka web yang sama) + FFmpeg bawaan (build LGPL) + whisper.cpp | NVENC (NVIDIA), AMF (AMD, Windows), QSV (Intel), VAAPI (AMD/Intel, Linux) | whisper.cpp CUDA / Vulkan / CPU | kreator dengan GPU sendiri, berkas besar |
| **Server** self-hosted | image `clipper-core` + worker GPU Orchestra lewat AXTO Setup | worker GPU (profil per merek, §31.F G3) | Whisper di GPU | tim, agensi, perusahaan |

- **Satu format proyek**: `project.json` berisi transkrip, klip, gaya, merek dan versi. Media dirujuk lewat hash.
  Proyek bisa dibuka di permukaan mana pun dan disinkronkan ke akun axto.io (opsional, §7).
- **Satu lisensi** (Smart License, Otoritas Lisensi): web pakai sesi akun; desktop dan server pakai aktivasi terikat
  mesin sesuai jumlah perangkat paket. Uji coba 14 hari tanpa kartu.
- **Pembaruan desktop** ditandatangani (Tauri updater dengan kunci tanda tangan di CI). Penginstal Windows butuh
  sertifikat EV milik pemilik (`PEAK-METHOD.md` §3).

## 4. Alur kerja lengkap

1. **Masuk:**
   - unggah berkas (sampai 10 jam / 20 GB di desktop dan server; di web dibatasi memori peramban);
   - tautan YouTube/Drive/Dropbox milik pengguna (hanya konten yang ia punya hak; ada persetujuan di layar);
   - rekam layar/kamera;
   - impor teks SRT/VTT.
2. **Pahami:**
   - transkripsi dengan stempel waktu kata dan pemisahan pembicara;
   - deteksi bahasa, adegan, wajah dan topik;
   - bab dan ringkasan.
3. **Pilih:** skor viral (hook, alur, nilai, tren), panjang sesuai tujuan (15–90 detik), cegah tumpang tindih, sampai
   50 kandidat per video.
4. **Edit:**
   - lewat transkrip: potong kata, hapus filler dan jeda;
   - reframe 9:16 / 4:5 / 1:1 / 16:9, split-screen dua pembicara;
   - teks animasi;
   - B-roll dan emoji otomatis;
   - musik bebas royalti dengan peredaman otomatis;
   - judul hook, merek, intro/outro;
   - suara dubbing dan terjemahan teks (BYOK).
5. **Render:**
   - antrean dengan prioritas;
   - id render deterministik `hash(proyek, klip, versi-gaya)`, jadi render yang sama tidak diulang;
   - batch;
   - keluaran MP4 H.264/HEVC/AV1, SRT/VTT, thumbnail.
6. **Terbitkan:**
   - OAuth ke akun pengguna sendiri: YouTube Shorts, TikTok, Instagram Reels, Facebook, LinkedIn, X;
   - jadwal, judul/deskripsi/tagar per platform, cek batas platform sebelum kirim.
7. **Ukur:**
   - tayangan, retensi dan klik dari API platform (bila diizinkan pengguna);
   - skor viral dibandingkan hasil nyata;
   - saran klip berikutnya.
8. **Kerja tim:** ruang kerja, peran (pemilik, editor, peninjau), komentar per detik, persetujuan sebelum terbit,
   riwayat versi.

## 5. Konektor (semuanya BYOK)

| Kategori | Penyedia |
|---|---|
| Transkripsi | OpenAI (Whisper / gpt-4o-transcribe), Deepgram, AssemblyAI, Groq Whisper, ElevenLabs Scribe, Google STT, Azure Speech, Speechmatics, Rev.ai; lokal whisper.cpp / Whisper di GPU |
| LLM (pilih momen, judul, repurpose) | OpenAI, Anthropic, Google Gemini, Mistral, Groq, Together, OpenRouter, DeepSeek, xAI; lokal Ollama / Orchestra |
| Visi (adegan, wajah, B-roll) | di perangkat (MediaPipe); cloud Gemini / GPT-4o vision |
| Suara & dubbing | ElevenLabs, OpenAI TTS, Azure, Google |
| Terjemahan | DeepL, Google Translate, LLM |
| Gambar / B-roll generatif | fal, Replicate, Stability, OpenAI Images |
| **Cloud GPU** (render dan Whisper berat di akun pengguna) | RunPod, Vast.ai, Lambda, Modal, Replicate, fal, Paperspace, CoreWeave, AWS / GCP / Azure (akun pengguna) |
| GPU sendiri | Orchestra AI (worker GPU semua merek, §31.F) |
| Publikasi | YouTube, TikTok, Instagram, Facebook, LinkedIn, X |

Kunci di web disimpan terenkripsi per akun dan tidak pernah tampil lagi; desktop dan server menyimpannya di mesin
pengguna. Setiap konektor punya uji koneksi, perkiraan biaya per menit dari tabel harga penyedia di Admin, dan batas
anggaran bulanan per pengguna.

## 6. AXTO Central GPU & AI

**Penyempurnaan logika pemilik.** "Central sendiri" dan "tetap BYOK" disatukan dengan dua lapis.

### 6.1 Central Hub (untuk semua member, BYOK)

Otak milik AXTO, tenaga milik pengguna. Untuk setiap tugas (transkripsi, analisis, render, dubbing), Hub memilih
sumber daya:
- GPU sendiri pengguna (desktop, Orchestra);
- akun cloud GPU pengguna;
- kunci AI pengguna.

Pilihannya mengikuti kebijakan pengguna:
- termurah, tercepat, privat (hanya lokal/GPU sendiri), atau kualitas tertinggi;
- **rantai cadangan**: bila penyedia gagal atau limit, pindah otomatis;
- **perkiraan biaya sebelum jalan**, dan berhenti bila melewati anggaran.

Hub juga **mengatur armada GPU**:
- menyalakan pod GPU di akun RunPod/Vast/Modal pengguna saat antrean panjang, dan mematikannya saat kosong (tidak
  ada biaya menganggur);
- memakai sinyal yang sama dengan Orchestra G4.

Untuk AXTO, Hub adalah fitur paket, bukan penjualan token. Batas pekerjaan per jam ada di `lib/plans.ts`.

### 6.2 Central Compute (GPU dan model milik AXTO, prabayar)

Untuk yang tidak punya GPU atau kunci:
- render dan transkripsi di armada GPU AXTO;
- kredit prabayar dengan harga = biaya modal × 2,5 (`BUSINESS-MASTER-BLUEPRINT.md` §5), meter atomik per tugas, saldo
  nol berhenti.

Aturan saat ini: **hanya di dalam white label (MANAGE)**, karena axto.io tetap BYOX. **Keputusan pemilik dibutuhkan**
bila ingin membukanya untuk member langsung (bawaan: mati; saklar di Admin → Programs).

### 6.3 Contoh biaya modal Central Compute

Angka indikatif. Angka nyata dibaca dari tabel biaya di Admin, dan harga jual otomatis = biaya × 2,5.

| Tugas | Contoh dasar | Biaya modal | Harga jual (×2,5) |
|---|---|---|---|
| Render klip 60 detik 1080p (NVENC) | GPU kelas L4 ≈ US$0,50/jam, render ≈ 10 detik | ≈ US$0,0015 | ≈ US$0,004 |
| Transkripsi 1 jam audio (Whisper large di GPU) | ≈ 2 menit GPU | ≈ US$0,02 | ≈ US$0,05 |
| Analisis momen (LLM, 1 jam transkrip) | tergantung model | dari tabel biaya | ×2,5 |

Satuan jual yang mudah: **1 kredit = 1 menit video sumber diproses**, mencakup transkripsi, analisis dan render klip
standar. Harga kredit dihitung dari tabel biaya.

## 7. Simpan video di axto.io (R2)

### 7.1 Apa yang disimpan

- **Bawaan: tidak ada.** Video diproses di perangkat atau GPU milik pengguna (privasi).
- Pengguna yang menyalakan **"Simpan di axto.io"** mendapat:
  - **Sumber** (video asli): opsional, dengan retensi 7 / 30 hari atau "simpan" (masuk kuota);
  - **Klip hasil** (MP4, teks, thumbnail): tersimpan selama paket aktif;
  - **Proyek** (`project.json` dan versinya): selalu tersimpan bila sinkron menyala (kecil).
- **Unggahan:** multipart 100 MB, bisa dilanjut, checksum per bagian. Kunci objek
  `clipper/<akun>/<proyek>/<hash>.<ext>`, ditulis sekali (create-once).
- **Rekaman:** satu JSON per media dan proyek (`R2-DATA-BLUEPRINT.md` §3), indeks per akun dengan `customMetadata`
  (ukuran, durasi, jenis).
- **Pemakaian** dicatat per akun per hari sebagai log append-only, sehingga tidak ada hot key. Cron harian menjumlahkan
  GB-hari menjadi GB-bulan.
- **Berbagi:** tautan bertanda tangan yang kedaluwarsa, untuk diunduh atau diputar. Egress R2 gratis, jadi berbagi tidak
  menambah biaya.

### 7.2 Biaya R2

Harga publik Cloudflare R2:
- Standard: US$0,015/GB-bulan; operasi kelas A US$4,50 per juta; kelas B US$0,36 per juta; egress gratis.
- Infrequent Access: US$0,01/GB-bulan, pengambilan US$0,01/GB, minimal 30 hari.

| Benda | Ukuran khas | Biaya simpan per bulan |
|---|---|---|
| Klip 60 detik 1080p | ≈ 60 MB | ≈ US$0,0009 |
| Sumber 1 jam 1080p | ≈ 3 GB | ≈ US$0,045 |
| Member Pro penuh (10 GB) | 10 GB | US$0,15 |
| Member Business penuh (50 GB) | 50 GB | US$0,75 |
| Member Enterprise penuh (500 GB) | 500 GB | US$7,50 |

Operasi tidak berarti: unggahan 3 GB ≈ 32 operasi kelas A ≈ US$0,00015. Sumber yang tidak diputar lebih dari 30 hari
dipindah otomatis ke **Infrequent Access**, yang menghemat 33%.

### 7.3 Harga penyimpanan untuk member

Prabayar, tidak pernah berutang.
- **Kuota bawaan paket:** 1 / 10 / 50 / 500 GB (sudah ada di `lib/plans.ts`). Biaya modal maksimal 1,5% dari harga
  paket.
- **Paket tambahan** (dompet axto.io, bulanan):

| Paket | Harga jual | Biaya modal R2 | Margin |
|---|---|---|---|
| +100 GB | US$5 | US$1,50 | 70% |
| +500 GB | US$20 | US$7,50 | 62,5% |
| +1 TB | US$35 | US$15 | 57% |
| +5 TB | US$150 | US$75 | 50% |

  Paket besar diberi margin lebih tipis sebagai daya tarik untuk agensi; rata-rata tertimbang tetap ≥ 60% karena paket
  kecil paling laku. Angka ini bawaan dan bisa diubah di Admin → Plans.
- **Saat kuota habis:** unggahan baru ditolak dengan tombol beli paket. Berkas lama tetap ada; tidak ada tagihan kejutan.
- **Saat paket berhenti atau turun:**
  - 30 hari hanya-baca (bisa unduh semuanya);
  - pengingat pada sisa 14, 7 dan 1 hari;
  - lalu berkas di atas kuota baru dihapus, mulai dari sumber terlama.
- **White label:** grosir = biaya modal × 2,5; mitra menjual dengan harganya sendiri.

## 8. Harga dan untung untuk axto.io

- **Langganan** (sudah ada): Starter / Pro / Business / Enterprise. Clipper menambah batas per paket di `lib/plans.ts`:
  - perangkat desktop: 1 / 2 / 5 / tak terbatas;
  - pekerjaan Hub per jam;
  - kursi tim: — / — / 5 / tak terbatas;
  - publikasi terjadwal per bulan;
  - rentang analitik.
- **Self-hosted Clipper Server:** edisi tahunan dan lifetime di `AXTO-APPS-BLUEPRINT.md`, dengan pola yang sama seperti
  9 engine lain (uji coba 100 lisensi, Smart License).
- **Margin:**
  - BYOK berarti biaya AI dan GPU AXTO ≈ 0;
  - biaya AXTO hanya R2 (§7), Workers dan email;
  - margin kotor langganan > 90%;
  - kredit Central Compute (bila dibuka) dan paket penyimpanan ≥ 60%.
- **Pendorong pendapatan:**
  - uji coba 14 hari diikuti perjalanan promosi (`PROMOTION-BLUEPRINT.md`);
  - batas klip per bulan mendorong naik paket;
  - paket penyimpanan;
  - kursi tim;
  - lisensi server untuk agensi;
  - white label untuk agensi besar.

## 9. Admin dan member

- **Admin → Clipper:**
  - tabel biaya penyedia (untuk perkiraan dan kredit);
  - batas per paket;
  - harga paket penyimpanan;
  - saklar Central Compute;
  - antrean render dan kesehatan GPU (dari Orchestra);
  - pemakaian per member;
  - penyalahgunaan (DMCA: hapus dan blokir);
  - log audit.
- **Member:**
  - proyek, perpustakaan media, kuota terpakai;
  - konektor dan uji koneksi;
  - anggaran dan perkiraan biaya;
  - jadwal posting, analitik, tim;
  - semuanya dalam 10 bahasa.

## 10. Keamanan, hak, dan kepatuhan

- **Kunci:** terenkripsi; tidak pernah di log, prompt, atau bundle.
- **Akses berkas:** tautan berbagi bertanda tangan dan kedaluwarsa. Hapus akun berarti semua berkas dihapus dalam
  30 hari, dengan bukti hapus.
- **Hak cipta:** impor dari tautan hanya untuk konten milik pengguna (centang persetujuan). Ada prosedur DMCA di Admin.
  Tidak ada pengunduh platform pihak ketiga yang melanggar ketentuan platform.
- **Klaim publik:** "video tidak meninggalkan perangkat" hanya ditampilkan bila penyimpanan dan Central Compute mati
  untuk proyek itu.

## 11. Fase (satu PR per fase, "selesai bila")

| Fase | Isi | Selesai bila |
|---|---|---|
| C1 | Format proyek bersama + sinkron proyek ke R2 + kuota dan log pemakaian — **dibangun 1 Nov 2026** (§11.1) | e2e: proyek dibuat di web, dibuka lagi; kuota menolak unggahan berlebih; tes konkurensi R2 |
| C2 | Simpan media di axto.io: unggah multipart lanjut, retensi, paket penyimpanan prabayar, tautan berbagi, pemindahan ke IA | e2e unggah 1 GB terputus lalu lanjut; beli paket menambah kuota; habis paket → hanya-baca |
| C3 | Central Hub: konektor BYOK (transkripsi, LLM, cloud GPU), kebijakan, rantai cadangan, perkiraan biaya, anggaran | tes kontrak tiap konektor (server palsu); satu penyedia gagal → cadangan dipakai |
| C4 | Desktop Tauri Windows + Linux: render GPU (NVENC/AMF/QSV/VAAPI), whisper.cpp, aktivasi Smart License, updater bertanda tangan | build CI Windows + Linux; render klip contoh di runner; aktivasi uji |
| C5 | Clipper Server self-hosted + worker GPU Orchestra (profil per merek) | `docker-smoke` + render lewat worker di CI (CPU) |
| C6 | Publikasi terjadwal (OAuth) + analitik + skor vs hasil nyata | tes kontrak tiap platform; jadwal berjalan dari cron |
| C7 | Tim: ruang kerja, peran, komentar per detik, persetujuan, versi | e2e dua pengguna |
| C8 | Central Compute (bila pemilik membuka), atau di dalam white label | meter atomik, saldo nol berhenti, harga = biaya × 2,5 |
| C9 | Promosi nyata: tangkapan layar dan animasi asli masuk perpustakaan promosi; teks situs 10 bahasa diperbarui | `orchestra-copy`-style test: setiap klaim punya fitur |

### 11.1 C1 — yang dibangun (1 Nov 2026)

**Format proyek v5** (`dashboard/lib/clipper/project.ts`, satu kode untuk web, API, dan nanti desktop/server):
- Satu JSON `format: "axto.clipper"`, `v: 5`: `media`, `settings`, transkrip + waktu kata, klip, edit, teks repurpose,
  dan `surface` (web / desktop / server). Video **tidak pernah** ada di dalamnya.
- Video dikenali dari **sidik jari**: SHA-256 atas ukuran + 2 MiB awal + 2 MiB akhir. Cepat walau berkas 20 GB, dan
  tetap cocok bila nama berkas diganti. Proyek lama tanpa sidik jari dicocokkan lewat nama + ukuran, lalu
  sidik jarinya ditambahkan saat video yang benar dipasang.
- `readProject()`:
  - menaikkan proyek v4 (dan lebih lama);
  - membatasi setiap bidang (60 klip, 400 ribu kata, panjang teks, skor 0–100, id unik);
  - membuang edit milik klip yang sudah tidak ada;
  - menolak proyek dari Clipper yang lebih baru (`newer`) agar tidak rusak.
  API memeriksa setiap proyek Clipper dengan kode yang sama sebelum disimpan (400 bila bukan proyek).
- Berkas proyek **`.axclip`**: bisa diunduh dan dibuka lagi di perangkat lain.

**Aman antar perangkat** (`dashboard/lib/history.ts`, R2 `USER_FILES`, terenkripsi per member):
- Setiap simpan menaikkan **revisi** dan ditulis dengan compare-and-swap etag (`etagMatches`, item baru create-once).
- Simpan yang menyebut revisi lama ditolak **409** dengan salinan terbaru, bukan menimpa diam-diam. Pengguna lalu memilih:
  - **Simpan versi saya**: salinan perangkat lain disimpan dulu sebagai versi;
  - **Buka versi yang lain**;
  - **Simpan versi saya sebagai salinan**.
- Ganti nama tidak menaikkan revisi, jadi editor yang terbuka tidak bentrok. Simpan otomatis tanpa judul tidak
  membatalkan ganti nama.
- Di halaman: satu simpan pada satu waktu. Perubahan selama menyimpan ikut disimpan sesudahnya, dan hasil simpan dari
  proyek yang sudah ditutup diabaikan.

**Versi** (Clipper: simpan 10 terakhir):
- Kapan versi dibuat:
  - otomatis paling banyak satu tiap 10 menit kerja;
  - selalu sebelum karya perangkat lain ditimpa;
  - selalu sebelum pemulihan.
- Kunci `app/clipper/<akun>/versions/<proyek>/<revisi>.enc`, ditulis sekali, disegel ulang (AAD = kunci objek). Yang
  terlama dipangkas.
- Versi dihitung dalam penyimpanan member. Bila penyimpanan tidak cukup, **versinya yang dilewati**, bukan simpannya.
- Pulihkan versi mana pun; menghapus proyek ikut menghapus versinya.

**Kuota dan log pemakaian:**
- Penyimpanan diperiksa terhadap **byte yang benar-benar bertambah**: pembaruan hanya menghitung selisihnya, dan simpan
  yang mengecil selalu boleh. Tolak = 413 dengan tombol paket.
- Total `storage_bytes` diperbarui **sekali per aksi** dan selalu sama dengan byte yang tersimpan. Ini dibuktikan tes,
  termasuk saat balapan kalah.
- Penulisan R2 yang kena batas 1 tulis/detik per kunci (429) menunggu lalu diulang.
- Log `clipper_usage` (R2, ULID, indeks per member dan per bulan, terbaru dulu) mencatat:
  - video yang dihitung kuota;
  - penolakan di kuota video dan di penyimpanan;
  - proyek dibuat, dipulihkan, dihapus;
  - karya perangkat lain ditimpa.

  Simpan otomatis tidak dicatat, karena hanya membuang biaya tulis.
- Member: panel "Pemakaian Clipper Anda" (video bulan ini, penyimpanan, aktivitas terbaru), `GET /api/clipper/usage`.
- Admin → **Clipper usage** (`/admin/clipper`, `GET /api/admin/clipper?month=`):
  - video dan member per bulan;
  - member terbanyak beserta penyimpanannya;
  - jumlah tiap kejadian;
  - kejadian terbaru.

**Tes:**
- `tests/clipper-projects.test.ts` (11 tes): format, sidik jari, revisi/bentrok, 6 simpan serentak = 1 menang, versi +
  pangkas + pulihkan + hapus, ganti nama, kuota, item lama, balapan kalah tetap terhitung, log.
- `tests/e2e/clipper.e2e.ts` di runtime Cloudflare lokal: proyek dibuat di web dan dibuka lagi; dua perangkat bentrok;
  5 simpan serentak di R2; kuota menolak; log member + Admin; hapus mengembalikan penyimpanan.

## 12. Risiko dan jawabannya

| Risiko | Jawaban |
|---|---|
| Biaya penyimpanan membengkak | kuota prabayar, retensi sumber, Infrequent Access, tidak ada utang |
| Penyedia API berubah atau mati | rantai cadangan Hub, tes kontrak di CI |
| Kebijakan platform media sosial | hanya API resmi dengan OAuth pengguna; jadwal berhenti bila token dicabut |
| Penyalahgunaan hak cipta | persetujuan, DMCA, blokir akun |
| Bentrok aturan BYOK dan MANAGE | Central Compute bawaan mati untuk member langsung; keputusan pemilik dicatat di sini |
