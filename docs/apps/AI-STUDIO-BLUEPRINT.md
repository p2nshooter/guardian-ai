# AI Studio — studio film kelas dunia yang dibantu AI (blueprint)

> Pemilik, 1 Nov 2026 (REQUESTS 141):
> - "Sy lihat AI Studio nya sederhana bangat, berbeda dengan konsep AI studio di awal."
> - "AI studio di konsep awal adalah untuk konten creator, untuk perfilman, bikin film kartun doraemon dari 0 sampai
>   jadi, bikin film action real dengan foto, durasi 10 detik sampai 1 hari, bisa di potong2 waktunya..."
> - "AI Studio nya adalah betul2 aplikasi Studio film hanya di bantu dengan AI."
> - "Ada layanan tambah efek suara, efek animasi dll, dari video pendek jd panjang, dr foto jd video dst, betul2 seperti
>   studio film di studio film terbaik di dunia hanya di bantu dengan AI atau bisa di generate dr AI."
> - "Coba di sesi ini bikinin dulu blueprint nya yg AI studio yg sy maksud dengan pengetahuan anda yg paling tinggi, apa
>   aja yg wajib ada baru implementasi kembangkan sampe betul2 AI studio high class dan bisa di sewa oleh film hollywood."

Blueprint ini mengikuti 12 bagian `PEAK-METHOD.md` dan menjadi satu-satunya rencana AI Studio. Yang ditulis di sini
dibangun fase demi fase (§11). Tanda ✅ hanya diberikan setelah kode, tes, dan tayang.

---

## 0. Ringkasan dalam satu napas

**AI Studio = studio produksi film lengkap di peramban, desktop, dan server sendiri, dengan AI di setiap meja kerja.**
- **Meja kerja:** naskah → storyboard → pemeran dan dunia → syuting dengan AI → suara → efek → warna → serah film.
- **Jenis karya:** kartun/animasi, live-action dari foto dan video, iklan, video kreator.
- **Durasi:** dari 10 detik sampai 24 jam di satu timeline yang bisa dipotong di titik mana pun.
- **Kerja tim:** tim berjalan seperti studio besar (peran, tinjauan per frame, persetujuan, pelacakan shot).
- **Bisa disewa rumah produksi**, termasuk Hollywood: ruang produksi tersewa, server di lokasi mereka sendiri, keamanan
  konten setara standar industri, dan catatan asal-usul setiap shot (siapa membuat, model apa, lisensi dan izin apa).

AI membantu atau menghasilkan. Pengguna tetap memegang kendali penuh layaknya editor, sutradara, penata suara, dan
colorist di studio terbaik dunia.

---

## 1. Keadaan sekarang (kode, 1 Nov 2026)

- **`/app/studio` (web) adalah chat multi-model**, bukan studio film:
  - percakapan, berkas, suara, artefak, bandingkan tiga model, asisten tersimpan;
  - `app/app/studio/page.tsx` 374 baris dan `components/studio/*`;
  - riwayat di R2 terenkripsi (`lib/history.ts`, slug `studio`).
- **Produk self-hosted "Studio"** (`studio-core` + modul):
  - `ai-studio`: chat, batch, bandingkan;
  - `gpu-studio`: gambar dan video dasar lewat Stability, Replicate, fal.ai, ComfyUI lokal;
  - `hybrid-studio`: alur kerja node.
  - Total sekitar 5.400 baris Python. Belum ada timeline, suara, efek, warna, kerja tim, atau serah film.
- **Yang sudah bisa dipakai ulang:**
  - Clipper: format proyek bersama + revisi + versi + kuota (C1); render di perangkat (WebCodecs/ffmpeg.wasm);
    pelacakan wajah; teks animasi; brand kit;
  - Orchestra: worker GPU semua merek, scaler, penempatan GPU pintar (REQUESTS 136);
  - Otoritas Lisensi, paket, dan R2 Store.

**Kesimpulan:** pemilik benar, yang ada sekarang jauh di bawah konsep. AI Studio dibangun ulang sebagai studio film.
Chat multi-model **tidak dibuang**: ia pindah nama menjadi **AI Chat** (§11 fase S0) dan dikembangkan ke puncaknya sendiri
(`WORK-QUEUE.md`).

---

## 2. Tolok ukur dan cara menang

### 2.1 Produk terbaik per meja kerja

| Meja kerja | Tolok ukur dunia | Yang wajib kita setarai |
|---|---|---|
| Edit (NLE) | DaVinci Resolve, Avid Media Composer, Adobe Premiere Pro, Final Cut Pro | timeline multi-track presisi frame, trim ripple/roll/slip/slide, nested sequence, proxy, timecode, multicam |
| Generasi video AI | Google Veo, OpenAI Sora, Runway, Kling, MiniMax Hailuo, Luma, model terbuka (Wan, HunyuanVideo, LTX-Video) | teks→video, foto→video, video→video, keyframe awal/akhir, gerak kamera, perpanjangan shot, konsistensi karakter |
| Pra-produksi | Final Draft, Celtx, StudioBinder, Boords | naskah format industri (Fountain/FDX), breakdown, storyboard, shot list, animatik, jadwal |
| Suara | Pro Tools, Fairlight (Resolve), ElevenLabs | dialog, dubbing + lip-sync, efek suara, foley, musik, stem, mixing, standar loudness |
| Efek visual dan compositing | Nuke, After Effects, Fusion | compositing node, rotoscoping, hapus objek, ganti latar, relight, partikel, judul animasi |
| Warna | DaVinci Resolve, Baselight | pipeline ACES/OCIO, LUT, scope (waveform, vectorscope, histogram), pencocokan shot, HDR |
| Tinjauan dan kerja tim | Frame.io, ShotGrid, ftrack | komentar per frame, anotasi, persetujuan, tumpukan versi, pelacakan shot dan tugas |
| Serah film | DaVinci Resolve, Colorfront, IMF tools | ProRes/DNxHR, urutan gambar EXR/DPX, IMF, teks SCC/TTML, pemeriksaan spesifikasi platform |

### 2.2 Cara menang

1. **Satu tempat dari ide sampai film jadi.** Pesaing terpecah: Runway untuk generasi, Resolve untuk edit, ElevenLabs
   untuk suara, Frame.io untuk tinjauan. AI Studio menyatukan semuanya dalam satu proyek.
2. **BYOK di semua penyedia.** Pengguna memakai kunci sendiri dengan harga penyedia, tanpa markup AXTO. Satu proyek bisa
   memakai Veo untuk satu shot, Kling untuk shot lain, model terbuka di GPU sendiri untuk sisanya.
3. **GPU milik sendiri.** Lewat worker GPU Orchestra (NVIDIA, AMD), model terbuka berjalan di mesin pengguna atau studio,
   tanpa biaya per detik.
4. **Server di lokasi sendiri.** Rumah produksi besar tidak mau footage keluar gedung. Studio Server berjalan di
   jaringan mereka, bisa tanpa internet.
5. **Asal-usul dan izin.** Setiap shot membawa catatan model, kunci, prompt, referensi, dan izin wajah/suara, serta
   Content Credentials (C2PA). Ini syarat agar studio besar berani memakai AI.
6. **Harga pasar Asia untuk kreator, harga studio untuk studio** (§8, REQUESTS 140).

---

## 3. Tiga permukaan, satu mesin

| Permukaan | Teknologi | Untuk | Batas jujur |
|---|---|---|---|
| **Web** (axto.io) | Next.js + WebCodecs + WebGPU; media proxy; render pendek di peramban, render panjang di desktop/server | kreator, tim kecil, tinjauan | memori peramban; footage 4K/8K dikerjakan lewat proxy, master dirender di desktop/server |
| **Desktop** Windows + Linux (+ macOS bila sertifikat ada) | Tauri v2 + FFmpeg bawaan + decode/encode GPU (NVENC/NVDEC, AMF, QSV, VAAPI) + model lokal lewat ComfyUI/worker Orchestra | editor, kreator dengan GPU sendiri, kerja luring | butuh sertifikat code signing milik pemilik |
| **Studio Server** self-hosted | image `studio-core` baru + render farm di worker GPU Orchestra, lewat AXTO Setup | rumah produksi, Hollywood, agensi; di lokasi sendiri/air-gapped | GPU dan penyimpanan disediakan pelanggan |

- **Satu format proyek** `axto.film` v1 (`.axfilm`):
  - timeline dalam model **OpenTimelineIO** (standar industri, bisa ditukar dengan Resolve/Premiere/Avid lewat adapter
    OTIO);
  - ditambah pemeran, gaya, naskah, pekerjaan generasi, dan catatan asal-usul.
  - Media dirujuk lewat sidik jari (cara yang sama dengan Clipper C1). Revisi, bentrok, dan versi memakai
    `lib/history.ts` yang sudah dibangun.
- **Satu lisensi** (Smart License): web pakai sesi; desktop dan server pakai aktivasi terikat mesin; uji coba 14 hari.

---

## 4. Alur kerja lengkap (meja kerja studio)

### 4.1 Pengembangan dan pra-produksi
1. **Ide → naskah:**
   - editor naskah format industri: scene heading, action, character, dialogue, parenthetical, transition;
   - impor/ekspor Fountain dan Final Draft (FDX), PDF format standar;
   - asisten AI untuk logline, sinopsis, beat sheet, dialog, revisi berwarna (revision colors).
2. **Breakdown otomatis:** naskah diurai menjadi adegan, pemeran, lokasi, properti, kostum, dan efek, lalu jadi daftar
   produksi.
3. **Pemeran (Cast) dan Dunia (World):**
   - **Lembar karakter:** wajah, tubuh, kostum, ekspresi dari banyak sudut, dipakai sebagai referensi konsistensi di
     setiap shot.
   - Untuk orang nyata: hanya dengan izin tertulis yang tersimpan (§10).
   - Untuk kartun: **karakter orisinal milik pengguna**.
   - **Lokasi, gaya visual (Look), palet, dan papan suasana.**
4. **Storyboard → shot list → animatik:**
   - setiap adegan jadi panel bergambar dengan jenis shot, lensa, gerak kamera, dan durasi;
   - panel langsung jadi animatik di timeline dengan suara sementara.
5. **Jadwal dan anggaran:**
   - perkiraan biaya generasi per shot dan per adegan untuk setiap penyedia BYOK;
   - perkiraan waktu render GPU sendiri;
   - batas anggaran per proyek.

### 4.2 "Syuting" dengan AI (generasi)
- **Sumber shot:**
  - teks → video;
  - **foto → video** (gambar diam jadi bergerak);
  - video → video (ganti gaya, ganti latar);
  - keyframe awal/akhir;
  - pengarah gerak (motion brush);
  - gerak kamera (dolly, pan, tilt, crane, orbit, handheld).
- **Konsistensi:**
  - referensi pemeran dan Look dikirim ke setiap generasi;
  - pemeriksa konsistensi membandingkan wajah dan gaya antar shot, lalu memberi skor dan saran ulang.
- **Dari pendek jadi panjang:**
  - shot diperpanjang dari frame terakhirnya (rantai);
  - transisi diisi AI di antara dua shot;
  - adegan dipecah otomatis menjadi deretan shot dari naskah.
  - Model saat ini menghasilkan beberapa detik per shot, jadi film panjang **dirakit dari banyak shot**, seperti film
    sungguhan (film 90 menit ≈ 600–1.500 shot).
- **Penampilan aktor (performance capture):** video aktor menggerakkan wajah atau tubuh karakter. Wajah, tubuh, dan
  tangan dipetakan ke karakter animasi atau digital (izin pemilik wajah wajib).
- **Pengambilan berulang (takes):** setiap shot menyimpan semua take; sutradara memilih "circle take".
- **Antrean produksi:**
  - id pekerjaan deterministik `hash(shot, prompt, referensi, model, parameter)`, jadi generasi yang sama tidak dibayar
    dua kali;
  - prioritas, rantai cadangan penyedia (Central Hub), coba ulang aman.

### 4.3 Edit (timeline profesional)
- **Durasi 10 detik sampai 24 jam**:
  - timeline dengan timecode SMPTE;
  - frame rate 23,976 / 24 / 25 / 29,97 / 30 / 48 / 50 / 59,94 / 60;
  - resolusi sampai 8K;
  - dipotong di titik mana pun; dipecah menjadi reel, episode, atau versi (teaser, trailer, potongan TV).
- **Fitur edit:**
  - multi-track video/audio/teks;
  - trim ripple, roll, slip, slide; J-cut dan L-cut;
  - marker, nested/compound clip, multicam, kecepatan (ramp, freeze);
  - proxy otomatis;
  - pencarian footage berdasarkan isi ("pria berlari di hujan") dan berdasarkan dialog.
- **Asisten edit AI:**
  - susun rough cut dari naskah dan circle take;
  - potong jeda, cocokkan ritme dengan musik;
  - buat trailer 30/60/90 detik dari film.

### 4.4 Suara
- **Dialog:**
  - TTS berkarakter dengan arahan emosi;
  - kloning suara **hanya dengan izin pemilik suara**;
  - ADR (rekam ulang) di aplikasi.
- **Dubbing ke banyak bahasa:** terjemahan + suara yang sama + **lip-sync** ulang.
- **Efek suara:**
  - teks → efek suara;
  - **foley otomatis** yang disinkronkan ke gerakan di video (langkah, pintu, pukulan);
  - pustaka efek bebas royalti.
- **Musik:** skor yang dibangkitkan sesuai adegan (tempo, suasana, durasi persis), stem terpisah, dan peredaman otomatis
  di bawah dialog. Hanya model dengan lisensi komersial yang jelas.
- **Mixing:**
  - bus dialog/musik/efek, EQ, kompresi, reverb ruang, pemisahan stem dan pembersihan derau;
  - target loudness siaran (EBU R128 −23 LUFS, ATSC A/85 −24 LKFS) dan streaming (≈ −14/−16 LUFS);
  - stereo dan 5.1; Atmos lewat jalur ADM BWF di fase akhir, dengan renderer berlisensi milik studio.

### 4.5 Efek, animasi, dan VFX
- **Pustaka efek animasi:** judul dan kredit animasi, transisi, partikel, light leak, glitch, lower third, motion
  graphics berbasis template.
- **VFX AI:**
  - hapus objek dan kabel;
  - ganti latar dan langit;
  - rotoscoping dan matting otomatis (segmentasi video);
  - kedalaman (depth) untuk fokus dan kabut;
  - relight;
  - perbaikan wajah;
  - de-aging hanya dengan izin.
  - Compositing berbasis node untuk yang mau presisi.
- **Kualitas gambar:**
  - upscale ke 4K;
  - interpolasi frame (24 → 48/60, slow motion halus);
  - stabilisasi, de-noise, de-flicker.
- **Animasi kartun/anime:**
  - pipeline 2D dari lembar karakter orisinal;
  - pose, ekspresi, gerak bibir otomatis dari dialog;
  - latar dan efek bergaya;
  - konsisten di seluruh episode.
- **3D:** objek dan set dari teks/gambar (mesh); set virtual dari foto lokasi (Gaussian splatting); kamera 3D yang sama
  dipakai untuk generasi.

### 4.6 Warna
- **Pipeline warna:**
  - manajemen warna ACES/OpenColorIO;
  - impor/ekspor LUT `.cube`;
  - roda warna, kurva, kualifikasi, power window dengan tracking.
- **Scope:** waveform, parade RGB, vectorscope, histogram.
- **AI:** cocokkan warna antar shot (penting saat shot berasal dari model berbeda) dan tiru look dari gambar acuan.
- **HDR:** HDR10 dan HLG. Dolby Vision butuh lisensi Dolby milik studio.

### 4.7 Tinjauan, persetujuan, dan kerja tim
- **Peran:** produser, sutradara, editor, VFX, suara, colorist, klien/peninjau. Hak per peran.
- **Tinjauan:**
  - komentar dan gambar anotasi pada frame tertentu;
  - bandingkan versi berdampingan;
  - persetujuan per shot/reel;
  - tautan tinjauan bertanda tangan yang kedaluwarsa, dengan watermark nama peninjau.
- **Pelacakan produksi:**
  - status setiap shot (naskah → generasi → edit → VFX → warna → selesai);
  - penugasan dan tenggat;
  - dasbor produser (progres, biaya, waktu).
- Revisi dan versi proyek memakai mesin yang sama dengan Clipper C1 (bentrok antar perangkat tidak menimpa diam-diam).

### 4.8 Serah film (delivery)
- **Video:**
  - H.264, H.265/HEVC, AV1;
  - ProRes dan DNxHR untuk master;
  - urutan gambar EXR/DPX/TIFF untuk VFX dan arsip.
- **Paket profesional:**
  - IMF (SMPTE ST 2067) untuk platform streaming;
  - DCP untuk bioskop di fase akhir (§11);
  - teks SRT/VTT/SCC/TTML.
- **Pertukaran:** OTIO, EDL, FCPXML, AAF (lewat adapter OTIO) agar bisa lanjut di Resolve/Premiere/Avid.
- **Pemeriksa spesifikasi:** resolusi, frame rate, ruang warna, loudness, teks, dan durasi dicek otomatis terhadap profil
  tujuan (YouTube, TikTok, Netflix-style, siaran, bioskop) sebelum ekspor. Daftar masalah ditampilkan, tidak diam-diam
  diperbaiki.
- **Content Credentials (C2PA)** dan watermark AI pada setiap ekspor (bisa dimatikan hanya untuk shot tanpa AI).

---

## 5. Konektor (semuanya BYOK, diuji kontrak)

Setiap konektor disimpan terenkripsi per akun (web) atau di mesin pengguna (desktop/server). Setiap konektor juga punya
tes kontrak terhadap server palsu (pola Clipper C3). Daftar model tepat ditentukan saat fasenya dibangun. Model yang
tidak punya API resmi **tidak** disambungkan lewat cara tidak resmi.

| Kelompok | Penyedia (API resmi) | Model terbuka di GPU sendiri (worker Orchestra / ComfyUI) |
|---|---|---|
| Video | Google (Veo), OpenAI (Sora), Runway, Kling, MiniMax (Hailuo), Luma, Alibaba Cloud (Wan), BytePlus (Seedance), agregator fal.ai dan Replicate | Wan, HunyuanVideo, LTX-Video, CogVideoX |
| Gambar | Google (Imagen), OpenAI, Black Forest Labs (FLUX), Stability, Ideogram, Recraft | FLUX (lisensi sesuai varian), Stable Diffusion |
| Suara dan dialog | ElevenLabs (TTS, kloning berizin, dubbing, efek suara), OpenAI, Google, Azure | model TTS terbuka berlisensi komersial |
| Musik | penyedia dengan API dan lisensi komersial resmi (dipilih saat fase S4) | MusicGen/AudioGen (cek lisensi bobot model) |
| Lip-sync dan avatar | Sync Labs, HeyGen, Hedra | LivePortrait dan sejenisnya (cek lisensi) |
| 3D | Meshy, Tripo, Luma | Hunyuan3D, TRELLIS |
| Kualitas dan VFX | Topaz (API) | Real-ESRGAN, RIFE/FILM, SAM 2, Depth Anything |
| Naskah dan asisten | semua penyedia LLM yang sudah ada di AI Chat | Ollama / LM Studio |

Lisensi setiap model terbuka diperiksa sebelum dipakai untuk komersial. Model dengan lisensi non-komersial ditandai dan
diblokir untuk ekspor komersial.

---

## 6. AXTO Central GPU & AI

- **Central Hub (BYOK, untuk semua):** router yang memilih penyedia milik pengguna menurut kebijakan proyek:
  - termurah, tercepat, terbaik, atau privat (GPU sendiri saja);
  - rantai cadangan, perkiraan biaya sebelum jalan, anggaran per proyek/adegan;
  - laporan "biaya per menit film".
- **Render farm:** pekerjaan dipecah menjadi graf (DAG), lalu ditempatkan di worker GPU Orchestra dengan penempatan pintar
  yang sudah ada (VRAM paling longgar, suhu, throttle). Scaler menyalakan worker saat antrean menumpuk.
- **Central Compute (GPU dan model milik AXTO, prabayar):** mengikuti `BUSINESS-MASTER-BLUEPRINT.md` §5. Hanya di dalam
  white label, kecuali pemilik membukanya (bawaan mati). Harga = biaya × 2,5, saldo nol = berhenti.

---

## 7. Penyimpanan di axto.io (R2)

- **Apa yang disimpan** (semua opsional kecuali proyek):
  - proyek dan versinya;
  - media asli;
  - proxy;
  - hasil generasi (semua take);
  - render;
  - paket serah.
- **Unggahan:** multipart, bisa dilanjut, checksum per bagian, kunci create-once.
- **Retensi:**
  - take yang tidak dipilih dihapus otomatis setelah 30 hari (bisa diubah);
  - media yang tidak disentuh 30 hari pindah ke Infrequent Access.
- **Ukuran nyata:**
  - 1 jam ProRes 422 HQ 4K ≈ 700 GB; 24 jam ≈ 17 TB;
  - proxy 1080p H.264 ≈ 3–5 GB/jam.
  - Karena itu web memakai proxy, dan master tinggal di desktop/server pengguna, kecuali dibeli paket penyimpanan.
- **Biaya R2:**
  - Standard US$0,015/GB-bulan, egress gratis;
  - 17 TB ≈ US$255/bulan biaya modal.
- **Paket penyimpanan:** prabayar dengan margin minimal 50–70% (pola `CLIPPER-BLUEPRINT.md` §7.3). Habis kuota =
  unggahan baru ditolak dengan tombol beli paket; berkas lama tetap ada.
- Semua rekaman mengikuti `R2-DATA-BLUEPRINT.md` §3; tidak ada D1.

---

## 8. Harga dan untung

Harga mengikuti perintah pemilik REQUESTS 140 ("perbaiki harga2 nya mengikuti harga pasaran ASIA").

**Acuan pasar Asia** (riset 1 Nov 2026; dicek ulang sebelum dipasang):
- ChatGPT Go Indonesia Rp75.000/bulan;
- Google AI Plus Rp75.000;
- Canva Pro Rp95.000;
- Google AI Pro ≈ Rp309.000;
- CapCut Pro Malaysia RM37,5;
- OpusClip US$15–29;
- Kling US$10–37.

**Usulan angka** (bawaan, pemilik memutuskan di Admin → Plans):
- **Kreator** (termasuk dalam paket platform, batas per paket di `lib/plans.ts`):
  - Starter dan Pro: proyek, durasi timeline, resolusi ekspor, kursi, penyimpanan;
  - generasi selalu BYOK atau GPU sendiri, jadi biaya AXTO ≈ 0 dan margin langganan > 90%.
- **Studio (tim):** per kursi per bulan dengan peran, tinjauan, pelacakan produksi; penyimpanan bersama.
- **Sewa Produksi (untuk rumah produksi/Hollywood):** ruang produksi per produksi per bulan:
  - kursi, penyimpanan, tautan tinjauan aman, dukungan prioritas, laporan asal-usul;
  - **Studio Server** lisensi tahunan di lokasi sendiri dengan edisi per jumlah GPU/kursi.
  - Harga studio mengikuti pasar alat studio profesional (bukan harga kreator Asia), karena isinya berbeda.
- **Kredit Central Compute** (bila dibuka): biaya × 2,5.
- **Selalu prabayar.** Mitra (reseller, white label) mendapat harga grosir dari kredit prabayar.

Angka pastinya dipasang bersama penyesuaian harga seluruh situs (REQUESTS 140, `WORK-QUEUE.md`).

---

## 9. Admin, member, paket

- **Member:** `/app/studio` jadi AI Studio (studio film), dengan meja kerja §4 dalam 10 bahasa. `/app/chat` jadi AI Chat.
  Riwayat chat lama tetap terbaca (slug penyimpanan `studio` dipertahankan untuk chat; proyek film memakai slug
  `film`).
- **Admin → AI Studio:**
  - batas per paket;
  - konektor yang diizinkan;
  - daftar model terbuka dan lisensinya (komersial/non-komersial);
  - retensi take;
  - harga Sewa Produksi;
  - daftar penyewa, pemakaian penyimpanan dan render;
  - laporan izin wajah/suara;
  - log audit.
- **Lisensi:** Otoritas Lisensi untuk desktop dan Studio Server (terikat mesin, bisa dicabut).

---

## 10. Keamanan, hak, dan kepatuhan (syarat studio besar)

- **Hak cipta karakter:**
  - Studio membuat **karakter orisinal**. Karakter milik orang lain (misalnya Doraemon milik Fujiko Pro, tokoh Disney,
    Marvel) **tidak dibangkitkan**.
  - Gaya umum ("kartun Jepang klasik", "animasi 3D keluarga") boleh; nama karakter atau merek terlindungi dalam prompt
    ditolak dengan penjelasan dan saran membuat karakter sendiri.
  - Penyedia juga menolaknya; aplikasi menyaringnya lebih dulu agar kredit pengguna tidak terbuang.
- **Wajah dan suara orang nyata:**
  - "film action real dengan foto" hanya untuk orang yang memberi **izin tertulis** (atau pengguna sendiri);
  - izin disimpan di Registri Izin: siapa, untuk apa, sampai kapan, bisa dicabut;
  - tidak untuk tokoh publik tanpa hak, tidak untuk anak di bawah umur, tidak untuk konten seksual orang nyata;
  - ini sejalan dengan aturan industri tentang replika digital (persetujuan dan kompensasi pemeran).
- **Label AI dan asal-usul:**
  - Content Credentials (C2PA) di setiap ekspor;
  - catatan rantai hak (chain-of-title) per shot: model, versi, lisensi model, kunci siapa, referensi, izin.
- **Keamanan konten untuk penyewa besar:**
  - enkripsi saat disimpan dan dikirim;
  - SSO/SAML, MFA, hak per peran, log audit tak bisa diubah;
  - tautan tinjauan bertanda tangan + watermark forensik per peninjau;
  - Studio Server di lokasi sendiri/air-gapped.
  - Kontrol disusun mengikuti praktik keamanan konten industri film (pedoman MPA dan penilaian Trusted Partner Network).
    **Penilaian resmi TPN dilakukan pihak ketiga dan dipesan pemilik.**
- **Rahasia:** kunci BYOK tidak pernah di log, prompt, atau bundle; aturan `CLAUDE.md` §4.

---

## 11. Fase (satu PR per fase, "selesai bila")

| Fase | Isi | Selesai bila |
|---|---|---|
| **S0** | Rumah baru: chat pindah ke **AI Chat** (`/app/chat`, `/app/studio` lama diarahkan; riwayat tetap); kerangka AI Studio film; format `axto.film` v1 (OTIO) + revisi/versi; pustaka media R2 (unggah multipart lanjut, proxy) | e2e: riwayat chat lama terbuka di AI Chat; proyek film dibuat, dibuka di perangkat lain, bentrok terdeteksi; unggahan terputus lanjut |
| **S1** | Timeline profesional di web: multi-track, trim ripple/roll/slip/slide, marker, timecode, frame rate industri, durasi 10 detik–24 jam, potong di mana saja, putar presisi frame (WebCodecs), ekspor pendek di peramban | tes unit model timeline (presisi frame, timecode drop-frame); peramban nyata: proyek 24 jam bisa digulir dan dipotong tanpa macet |
| **S2** | Generasi: teks→gambar, **foto→video**, teks→video, keyframe, gerak kamera, **perpanjangan shot (pendek → panjang)**, take; konektor BYOK + tes kontrak; perkiraan biaya + anggaran; antrean deterministik; Pemeran + Look untuk konsistensi | tes kontrak tiap konektor; generasi sama tidak dibayar dua kali; penyedia gagal → cadangan |
| **S3** | Pra-produksi: editor naskah (Fountain/FDX), asisten naskah, breakdown, storyboard → animatik, shot list, adegan → deretan shot | impor/ekspor FDX dan Fountain sama persis; naskah contoh jadi animatik |
| **S4** | Suara: dialog TTS, kloning berizin, dubbing + lip-sync, **efek suara** dan foley otomatis, musik, stem, mixing, loudness | pengukur loudness cocok dengan nilai acuan; dubbing contoh sinkron |
| **S5** | **Efek animasi** + VFX AI: pustaka efek/judul/transisi, hapus objek, ganti latar, rotoscoping, upscale, interpolasi, stabilisasi; pipeline kartun 2D karakter orisinal | render contoh di CI; penyaring karakter terlindungi teruji |
| **S6** | Warna: ACES/OCIO, LUT, scope, roda/kurva, cocokkan shot AI, HDR10/HLG | konversi warna cocok dengan nilai acuan OCIO |
| **S7** | Desktop Tauri Windows + Linux: decode/encode GPU, model lokal lewat worker Orchestra/ComfyUI, kerja luring, aktivasi Smart License | build CI Windows + Linux; render contoh di runner |
| **S8** | Studio Server self-hosted + render farm worker GPU Orchestra; SSO/SAML, peran, audit, watermark forensik | `docker-smoke` + render lewat worker; uji SSO |
| **S9** | Kerja tim: komentar per frame, anotasi, persetujuan, tumpukan versi, pelacakan shot dan tugas, tautan tinjauan aman | e2e dua pengguna + peninjau tamu |
| **S10** | Serah film: ProRes/DNxHR/H.264/H.265/AV1, EXR/DPX, IMF, teks, OTIO/EDL/FCPXML/AAF, pemeriksa spesifikasi, C2PA | berkas uji lolos validator (MediaInfo, pemeriksa IMF, pembaca C2PA) |
| **S11** | Sewa Produksi: ruang produksi tersewa, harga, faktur prabayar, laporan rantai hak, Registri Izin, paket keamanan; DCP bioskop | e2e sewa dibuat → dibayar → aktif → kedaluwarsa hanya-baca |
| **S12** | Promosi nyata: tangkapan layar dan animasi asli, teks situs 10 bahasa | setiap klaim situs punya fitur yang teruji |

**Urutan:** S0 → S12 satu per satu. S0–S2 membuat AI Studio langsung berguna untuk kreator (foto→video, teks→video,
edit, perpanjangan). S3–S6 menjadikannya studio. S7–S11 membuatnya layak disewa rumah produksi besar.

---

## 12. Risiko dan jawabannya

| Risiko | Jawaban |
|---|---|
| Model video menghasilkan beberapa detik per shot, konsistensi belum sempurna | film dirakit dari banyak shot (seperti produksi nyata), referensi Pemeran/Look, pemeriksa konsistensi, take berulang, VFX untuk memperbaiki |
| Biaya generasi pengguna tinggi | perkiraan biaya sebelum jalan, anggaran, id deterministik (tidak bayar dua kali), GPU sendiri lewat Orchestra |
| Peramban tidak kuat untuk 4K/8K | proxy di web; master di desktop/Studio Server |
| Hak cipta dan deepfake | karakter orisinal, saringan karakter terlindungi, Registri Izin, C2PA, label AI |
| Studio besar butuh sertifikasi | kontrol mengikuti pedoman industri; penilaian TPN oleh pihak ketiga dipesan pemilik |
| Dolby Vision, Atmos, ProRes resmi butuh lisensi | ditandai jujur; jalur alternatif terbuka (HDR10/HLG, 5.1, DNxHR) dan dukungan lisensi milik studio |
| Cakupan sangat besar | 13 fase, masing-masing tayang dan berguna sendiri; tidak ada fase "setengah jadi" |

## 13. Yang butuh pemilik

- Sertifikat code signing (Windows EV, Apple Developer ID bila macOS).
- Keputusan harga akhir (REQUESTS 140) dan harga Sewa Produksi.
- Penilaian Trusted Partner Network dan asuransi/perjanjian bila menyewakan ke studio Hollywood.
- Keputusan membuka Central Compute di luar white label.
