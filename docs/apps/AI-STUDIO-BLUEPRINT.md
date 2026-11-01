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

> - "Riset dulu bentuk aplikasi seperti apa yg ada di aplikasi studio film kelas dunia, dmn mendapatkan efek suara efek
>   gambar efek animasi dll, dan dimana AI bisa di tambahkan, apakah paketnya memerlukan orchestra dan worker gpu, apakah
>   bisa AI gpu bisa menjadi aplikaai mandiri... Cara kerja dll riset dulu biar blurpintya makin hebat, cari contoh2nya di
>   GitHub di website manapun di dunia ini" → hasil riset 1 Nov 2026 ada di §2.3–§2.5, §4.9–§4.10, §5.1, §6.1–§6.3.

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

### 2.3 Riset: studio film AI yang sudah ada di dunia (1 Nov 2026)

| Produk | Yang mereka lakukan | Pelajaran untuk AI Studio |
|---|---|---|
| **LTX Studio** (Lightricks) | naskah → storyboard otomatis per adegan; *Elements* untuk karakter dan lokasi yang tetap sama; *Director Mode* untuk kamera; ekspor resolusi tinggi hanya di paket mahal | konsistensi karakter adalah alasan orang memakai; pustaka Pemeran/Lokasi wajib sejak S2 |
| **Google Flow** (Veo, Imagen, Gemini) | *Ingredients* (karakter, latar, objek dipakai ulang); *Scenebuilder* menyambung klip ±8 detik menjadi adegan panjang memakai frame terakhir klip sebelumnya; kontrol kamera; galeri contoh | "pendek jadi panjang" = rantai shot dari frame terakhir; ini inti fitur perpanjangan S2 |
| **Runway** (Gen-4.5, Aleph, Act-Two) | Aleph mengedit video: tambah/hapus/ganti objek, relight, sudut kamera baru, "shot berikutnya"; Act-Two memindahkan penampilan aktor ke karakter; API tersedia | VFX AI (S5) dan performance capture (S2) lewat API BYOK |
| **Autodesk Flow Studio** (dulu Wonder Studio) | rekam penampilan dengan kamera apa pun → gerak tubuh, tangan, wajah dipindah ke karakter CG; camera tracking, clean plate, alpha mask; ekspor USD ke Maya/Blender/Unreal; Wonder 3D membuat aset 3D dari teks/gambar | jalur ekspor ke alat studio (USD/OTIO) membuat studio besar mau memakai; S10 |
| **Adobe Premiere Pro + Firefly** | Generative Extend (perpanjang video ±2 detik, audio sampai 10 detik); *Generate Sound Effect* untuk rentang timeline dengan "Sync to Video"; model pihak ketiga (Veo, Runway, Kling, Luma) dipasang di dalam Premiere | pemimpin pasar juga memakai banyak model dari banyak penyedia: rancangan BYOK multi-model kita sejalan; efek suara tersinkron ke gambar wajib (S4) |
| **Moonvalley Marey** (bersama studio Asteria) | model video yang dilatih hanya dari data milik sendiri atau berlisensi; ditujukan ke pembuat film profesional; klip 1080p 24 fps | studio besar peduli asal data latih: AI Studio perlu kebijakan "hanya model aman-komersial" per produksi (§10) |

**Aturan industri yang harus dipatuhi** (panduan Netflix untuk mitra produksi, Agustus 2025):
- AI tidak boleh menggantikan atau membuat penampilan pemeran baru tanpa izin;
- replika digital dan perubahan besar pada penampilan butuh izin tertulis dan mengikuti aturan serikat;
- model yang dilatih untuk memanipulasi pemeran hanya untuk satu produksi;
- penggunaan AI dilaporkan ke studio;
- materi AI bersifat sementara sampai di-*clear* untuk hasil akhir.

AI Studio membangun semua ini ke dalam alur (Registri Izin, kebijakan per produksi, laporan rantai hak), sehingga
rumah produksi tidak perlu mencatatnya di luar aplikasi.

### 2.4 Riset: contoh di GitHub dan proyek terbuka

Lisensi pada tabel ini dicek ulang dari berkas LICENSE resminya sebelum dipakai. Aturan tetap:
- kode GPL/AGPL **tidak** digabung ke kode AXTO; ia hanya jadi acuan, atau dijalankan sebagai layanan terpisah dengan
  kewajiban lisensinya dipenuhi;
- bobot model dengan lisensi non-komersial tidak dipakai untuk ekspor komersial.

| Bidang | Proyek | Lisensi | Dipakai sebagai |
|---|---|---|---|
| Timeline standar industri | **OpenTimelineIO** (Academy Software Foundation) | Apache-2.0 | model timeline `axto.film` + adapter FCPXML/AAF/EDL |
| Manajemen warna | **OpenColorIO** (ASWF) + ACES | BSD-3 | pipeline warna S6 |
| Editor video web | **OpenCut** (alternatif CapCut, ditulis ulang 2026 dengan inti Rust), **OpenReel Video** (WebCodecs + WebGPU), **omniclip** | lihat repo | acuan arsitektur editor peramban S1 |
| Editor desktop | **Kdenlive** di atas **MLT** (render lewat FFmpeg), **Shotcut**, **Olive**, **Blender** VSE | GPL | acuan saja |
| Compositing | **Natron** (node, mirip Nuke) | GPL | acuan saja |
| Audio (DAW) | **Ardour** | GPL | acuan saja |
| Encode/decode | **FFmpeg** | LGPL (build tanpa komponen GPL) | mesin render desktop/server |
| Pelacakan produksi | **Kitsu** (CGWire), **AYON** (dulu OpenPype; terhubung ke Kitsu/ShotGrid/ftrack) | lihat repo | acuan S9 |
| Alur kerja generasi | **ComfyUI** (API HTTP/WebSocket `/prompt`) | GPL-3.0 | dijalankan sebagai layanan terpisah di GPU Node (§6.2) |
| Video generatif terbuka | **Wan 2.2** | Apache-2.0 (bebas komersial) | model utama GPU Node |
| | **LTX-2** (Lightricks) | lisensi komunitas: gratis untuk perusahaan di bawah US$10 juta pendapatan tahunan | opsional, ditandai |
| | **HunyuanVideo 1.5** (Tencent) | lisensi Tencent dengan batas pengguna dan wilayah | opsional, ditandai |
| Efek suara dari video (foley) | **HunyuanVideo-Foley** (48 kHz; varian XL ±16 GB VRAM, 8 GB dengan offload), **MMAudio** | lihat repo | foley otomatis S4 |
| Musik | **ACE-Step** (lagu lengkap dengan vokal) | Apache-2.0 | musik S4 |
| | Stable Audio Open (efek, loop) | lisensi komunitas Stability | ditandai |
| Suara/TTS | **Kokoro** (Apache-2.0), **Chatterbox** (MIT, watermark suara bawaan), **CosyVoice2** (Apache-2.0, kloning) | sesuai kolom | dialog dan kloning berizin S4 |
| Lip-sync | LatentSync, MuseTalk | lihat repo (bobot bisa berbeda dari kode) | dubbing S4 |
| VFX/kualitas | SAM 2 (segmentasi video), Real-ESRGAN (upscale), RIFE (interpolasi), Demucs (pisah stem) | Apache-2.0 / BSD-3 / MIT / MIT | S5, S4 |
| Asal-usul | **c2pa-rs** (Content Authenticity Initiative), c2patool | MIT/Apache-2.0 | Content Credentials S10 |
| Naskah → storyboard → shot (agen) | MUSE agent (MIT; naskah → *style bible* → storyboard → tinjauan), FrameWork (skenario + storyboard + shot list), CineForge (bible + 16 shot per adegan → prompt Runway/Kling), Shortify AI | lihat repo | acuan agen pra-produksi S3 |

**Temuan penting dari contoh-contoh itu:**
1. Konsistensi karakter dicapai dengan **referensi gambar per karakter** (atau adaptor terlatih per karakter),
   bukan dengan prompt saja. Pustaka Pemeran menyimpan lembar referensi dan, untuk GPU sendiri, adaptor karakter per
   produksi (sesuai aturan Netflix: satu produksi, satu model).
2. Biaya dan konsistensi adalah masalah utama yang disebut pembuat agen terbuka. Karena itu perkiraan biaya sebelum
   generasi dan pemeriksa konsistensi wajib ada.
3. Editor web modern memakai WebCodecs + WebGPU dengan cadangan bila peramban tidak mendukung. Editor desktop terbaik
   memakai FFmpeg di belakang.

### 2.5 Di mana AI ditambahkan (peta per meja kerja)

| Meja kerja | Tanpa AI (alat studio biasa) | Dengan AI (dibantu atau dibangkitkan) |
|---|---|---|
| Naskah | editor format industri, revisi berwarna | logline, beat sheet, dialog, terjemahan, cek kontinuitas |
| Breakdown | daftar manual | breakdown otomatis adegan/pemeran/properti/efek |
| Storyboard | gambar tangan, unggah | panel dibangkitkan dari adegan, gerak kamera tertulis |
| Pemeran dan Dunia | foto referensi | lembar karakter dari banyak sudut, lokasi, Look |
| Shot | footage kamera | teks→video, foto→video, video→video, keyframe, perpanjangan, performance capture |
| Edit | timeline, trim, multicam | rough cut dari naskah, cari footage dengan kata, trailer otomatis |
| Suara | rekam, mixing, pustaka efek | TTS, kloning berizin, dubbing + lip-sync, efek dari teks, foley dari video, musik, pisah stem, bersihkan derau |
| VFX | compositing node, masker manual | hapus/ganti objek, rotoscoping otomatis, relight, sudut baru, upscale, interpolasi |
| Warna | roda, kurva, LUT, scope | cocokkan shot dari model berbeda, tiru look dari gambar |
| Tinjauan | komentar per frame | ringkasan catatan peninjau, daftar perubahan otomatis |
| Serah | ekspor, pemeriksa spesifikasi | teks/caption otomatis + terjemahan |
| Produksi | jadwal, anggaran | perkiraan biaya generasi, saran penyedia termurah/tercepat |

Setiap fitur AI punya **jalan manual** yang setara, sehingga editor profesional tidak pernah terkunci pada hasil AI.

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


### 4.9 Cara kerja (di balik layar)

1. **Proyek** `axto.film` menyimpan naskah, Pemeran, Look, timeline (OTIO), dan daftar shot. Setiap shot punya resep:
   sumber, prompt, referensi, model, parameter.
2. **Generasi:** resep shot menjadi pekerjaan dengan id `hash(resep)`.
   - **Router (Central Hub)** memilih tempat jalannya menurut kebijakan produksi:
     - API penyedia milik pengguna (BYOK);
     - **GPU Node** pengguna (§6.2);
     - render farm Orchestra (§6.3).
   - Hasil yang sama tidak dibuat ulang. Gagal = coba penyedia berikutnya di rantai.
3. **Media:** hasil dan unggahan disimpan sebagai berkas asli + proxy.
   - Web: R2 (bila dipilih) atau perangkat;
   - desktop/server: disk pengguna.
   - Setiap berkas punya catatan lisensi dan asal-usul.
4. **Edit:**
   - Web memutar proxy dengan WebCodecs; efek dan warna dirender di GPU peramban (WebGPU) untuk pratinjau.
   - Desktop/server memutar dan merender master dengan FFmpeg + GPU (NVENC/AMF/QSV/VAAPI).
   - Timeline yang sama, hasil yang sama.
5. **Render akhir:** dipecah per adegan atau rentang, dikerjakan paralel (beberapa GPU/worker), lalu disambung tanpa
   kehilangan kualitas. Pekerjaan bisa dilanjut bila terputus.
6. **Serah:** pemeriksa spesifikasi → encode → teks → C2PA + watermark → paket (berkas, IMF, atau unggah ke tujuan).

### 4.10 Durasi 10 detik sampai 24 jam: bagaimana bisa

- **Timeline:** angka timecode 64-bit dan struktur OTIO tidak punya batas praktis. Antarmuka memuat hanya bagian yang
  terlihat (virtualisasi), jadi timeline 24 jam tetap ringan.
- **Pemutaran:** proxy kecil per klip. Peramban memuat yang sedang diputar saja.
- **Generasi:** satu shot = beberapa detik (batas model saat ini). Satu jam film ≈ 400–1.000 shot, dikerjakan antrean
  dengan perkiraan biaya total di depan. Shot diperpanjang dengan rantai frame terakhir (cara Google Flow) atau
  "shot berikutnya" (cara Runway).
- **Potong di mana saja:** reel, episode, versi (potongan TV, trailer 30/60/90 detik) adalah sequence turunan dari
  timeline yang sama.

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


### 5.1 Sumber efek suara, efek gambar, dan efek animasi

AI Studio punya **Pustaka Aset** dengan tiga lapis. Setiap aset membawa label lisensi (komersial? perlu atribusi?
boleh disebar ulang?). Label itu ikut ke laporan rantai hak saat ekspor.

1. **Milik AXTO (dibuat sendiri, bebas dipakai pelanggan):**
   - judul dan kredit animasi, transisi, lower third, partikel, light leak, glitch, bingkai, dan efek gerak;
   - dibuat sebagai template kode (shader WebGPU, kanvas, Lottie);
   - tidak ada masalah lisensi dan bisa dikembangkan tanpa batas.
2. **Pustaka terbuka yang boleh dipakai komersial:**
   - **Sonniss GDC Game Audio Bundle** (puluhan GB tiap tahun, bebas royalti, komersial, tanpa atribusi; cek klausul
     larangan latih AI);
   - **Freesound** hanya yang **CC0** (CC-BY ditampilkan dengan atribusi otomatis; **CC-BY-NC tidak dipakai**);
   - **Pixabay** dan **Mixkit**, efek suara berlisensi gratis-komersial (Mixkit punya juga lisensi "Restricted"
     non-komersial yang disaring);
   - animasi **Lottie** yang lisensinya mengizinkan.
   - Yang **tidak** dipakai untuk karya komersial: arsip **BBC Sound Effects** (lisensi RemArc pribadi/pendidikan).
   - Aset dari pustaka luar yang tidak mengizinkan disebar ulang tidak disalin ke pustaka AXTO. Pengguna mengunduhnya
     sendiri lalu mengimpor, dan labelnya tetap ikut.
3. **Dibangkitkan AI saat dibutuhkan:**
   - efek suara dari teks atau dari video (foley tersinkron ke gerakan);
   - musik sesuai adegan;
   - elemen VFX (asap, api, ledakan) dari model video;
   - latar dan objek.
   - Elemen VFX stok profesional (ProductionCrate/FootageCrate, ActionVFX, FXElements, Compositing Academy) punya paket
     gratis berlisensi komersial yang bisa diimpor pengguna.

Pustaka disimpan di R2 dengan indeks per kategori, bentuk gelombang dan pratinjau, pencarian kata ("pintu kayu
dibanting"), dan pencarian makna lewat embedding.

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


### 6.1 Apakah AI Studio wajib Orchestra dan worker GPU? Tidak.

| Cara pakai | Perlu GPU? | Perlu Orchestra? | Untuk |
|---|---|---|---|
| Web + API penyedia (BYOK) | tidak (penyedia yang menjalankan) | tidak | semua member; cara paling mudah |
| Web/desktop + **GPU Node** di PC sendiri | ya, satu PC dengan GPU | **tidak** | kreator dengan GPU, gratis per detik |
| Studio Server + **render farm** | ya, banyak GPU | ya (penjadwal, scaling, penempatan GPU) | studio, agensi, rumah produksi |
| GPU awan sewaan pengguna (RunPod, Vast, Lambda, Modal, dll.) menjalankan image GPU Node | ya, sewaan | tidak (satu node) atau ya (banyak) | yang tidak punya GPU tetapi mau model terbuka |

### 6.2 "AI GPU" sebagai aplikasi mandiri: **AXTO GPU Node**

Ya, bisa dan dianjurkan. GPU Node adalah aplikasi tersendiri yang menjalankan model AI di GPU milik pengguna dan menjadi
"mesin generasi" untuk AI Studio, Clipper, dan aplikasi AXTO lain. Ia penerus engine `gpu-studio`.

- **Bentuk:**
  - aplikasi desktop Windows/Linux, dibungkus Tauri, dengan satu klik pasang;
  - image Docker yang sama untuk server dan GPU awan;
  - profil per merek GPU (NVIDIA CUDA, AMD ROCm), memakai deteksi GPU yang sudah dibangun (REQUESTS 136).
- **Isi:**
  - **Pengelola model:** unduh, cek lisensi (komersial/non-komersial), cek muat di VRAM, versi.
  - **Mesin alur kerja:** ComfyUI sebagai layanan terpisah, dengan template AXTO teruji untuk teks→video, foto→video,
    perpanjangan, upscale, interpolasi, foley, musik, TTS, dan lip-sync.
  - **Antrean** dengan id deterministik.
  - **Telemetri GPU:** suhu, VRAM, throttle.
- **Sambungan aman:**
  - dipasangkan ke akun axto.io dengan kode pairing;
  - hanya menerima pekerjaan dari akun itu (token per perangkat, TLS);
  - hasil langsung ke disk pengguna atau R2 pengguna;
  - bisa berjalan tanpa internet untuk desktop/server.
- **Panduan VRAM** (perkiraan dari riset; diuji saat fase dibangun):

| VRAM | Yang bisa dijalankan |
|---|---|
| 8 GB | gambar, Wan versi kecil (±1,3B), upscale, interpolasi, TTS, foley XL dengan offload |
| 12–16 GB | video 720p model sedang/terdistilasi, foley, musik |
| 24 GB | video 720p–1080p model 5B (satu RTX 4090), HunyuanVideo 1.5 dengan offload |
| 48–80 GB | model 14B kualitas penuh, batch besar |

- **Dijual:** termasuk dalam paket AI Studio (satu node), node tambahan per perangkat, atau lisensi Studio Server untuk
  banyak node. Lisensi lewat Otoritas Lisensi (terikat mesin).

### 6.3 Kapan Orchestra dipakai

Orchestra dipakai saat ada **lebih dari satu GPU atau lebih dari satu mesin**, misalnya render farm studio:
- penjadwal pekerjaan dan penempatan pintar per GPU (VRAM paling longgar, suhu, throttle);
- scaling otomatis worker (orchestra-scaler);
- indikator kesehatan GPU;
- jatah per tim.

GPU Node yang sama menjadi worker di bawah Orchestra, jadi tidak ada dua mesin berbeda yang harus dirawat.

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
- **Kebijakan model per produksi:**
  - "semua model";
  - "hanya model aman-komersial": model yang dilatih dengan data berlisensi, atau yang penyedianya memberi jaminan
    komersial;
  - "hanya GPU sendiri" (tidak ada data keluar).
  - Kebijakan dikunci oleh produser dan tercatat di laporan.
- **Penggunaan AI dilaporkan per shot.** Materi AI ditandai "sementara" sampai produser meng-*clear* untuk hasil akhir
  (sesuai panduan studio besar, §2.3).
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
| **S2G** | **AXTO GPU Node** (aplikasi mandiri, §6.2): desktop Windows/Linux + image Docker, pengelola model dengan cek lisensi dan VRAM, template alur kerja teruji, pairing aman ke akun, antrean, telemetri; menjadi worker Orchestra bila ada banyak GPU | uji pairing + pekerjaan contoh di runner (CPU untuk CI, GPU nyata diuji di mesin pemilik); model non-komersial terblokir untuk ekspor komersial |
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

**Urutan:** S0 → S12 satu per satu (14 fase termasuk S2G). S0–S2G membuat AI Studio langsung berguna untuk kreator:
foto→video, teks→video, edit, perpanjangan, dan generasi gratis di GPU sendiri. S3–S6 menjadikannya studio. S7–S11 membuatnya layak disewa rumah produksi besar.

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

## 14. Sumber riset (1 Nov 2026)

Sebagian besar sumber adalah halaman produk dan liputan pihak ketiga. Angka (VRAM, harga, lisensi) dicek ulang dari
halaman resmi saat fasenya dibangun.

- **LTX Studio:** techcrunch.com (Lightricks, 2024); jivochat.com (ulasan); ltx.studio.
- **Google Flow:** techcrunch.com (20 Mei 2025); maginative.com; labs.google/fx/tools/flow/faq.
- **Runway Aleph / Act-Two:** cometapi.com (spesifikasi API); conductatlas.com (perubahan situs Runway Mei 2026).
- **Autodesk Flow Studio:** cgchannel.com (5 Mar 2026, Wonder 3D); autodesk.com/products/flow-studio;
  digitalproduction.com.
- **Adobe Premiere + Firefly:** nofilmschool.com (Generative Media); community.adobe.com (Generative Extend);
  aiweekly.co (model pihak ketiga di Premiere).
- **Moonvalley Marey:** techcrunch.com (12 Mar 2025); cined.com; getcoai.com.
- **Panduan AI Netflix untuk mitra:** socialsamosa.com; cined.com; broadcastnow.co.uk; gigazine.net (Agustus 2025).
- **Trusted Partner Network:** cdsaonline.org; postmagazine.com (program keamanan konten milik MPA).
- **Editor web terbuka:** github.com/OpenCut-app/OpenCut; github.com/triniinteractive/openreel-video; mer.vin (penulisan
  ulang OpenCut 2026).
- **Pipeline terbuka:** github.com/AheadIO/OpenTimelineIO; aswf.io; ayon.app; blog.cg-wire.com (Kitsu + AYON).
- **Model video terbuka:** thundercompute.com; aimagicx.com; ltx.io/blog (lisensi dan VRAM Wan 2.2, LTX-2,
  HunyuanVideo 1.5).
- **Foley:** github.com/Tencent-Hunyuan/HunyuanVideo-Foley; huggingface.co/tencent/HunyuanVideo-Foley.
- **Musik terbuka:** comfyui-wiki.com (ACE-Step); spheron.network; learn.traeai.com.
- **TTS terbuka:** tts.ai (tabel lisensi Kokoro, Chatterbox, CosyVoice2).
- **Agen naskah → storyboard:** github.com/GrepAutomation/muse-agent; github.com/arkdutt/FrameWork;
  github.com/milleniummike-del/cineforge.
- **Efek suara:** rekkerd.org (Sonniss GDC 2026); app.cinevva.com (Freesound, BBC); pixabay.com/service/faq;
  mixkit.co.
- **Elemen VFX:** cgchannel.com (ProductionCrate, Compositing Academy, ActionVFX); fxelements.com.
- **Animasi terprogram:** remotion.dev/docs/compare/motion-canvas (Remotion berlisensi berbayar untuk perusahaan; Motion
  Canvas terbuka).
- **ComfyUI sebagai API:** fal.ai/learn/serverless/comfyui-api; docs.runcomfy.com.
- **C2PA:** learn.contentauthenticity.org; rubydoc.info (ruby-c2pa di atas c2pa-rs).
