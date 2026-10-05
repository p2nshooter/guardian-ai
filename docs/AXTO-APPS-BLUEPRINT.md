# AXTO Apps Blueprint: 10 aplikasi self-hosted (Docker Linux + Windows)

> **Untuk AI/engineer berikutnya:** baca dokumen ini sampai habis sebelum menyentuh
> `installer/`, `*-compose.yml`, folder engine (`engine/`, `orchestra/`, `vault/`, `edge/`, `soc/`,
> `compliance/`, `sentinel/`, `antivirus/`, `studio/`, `legal/`) atau halaman lisensi di `dashboard/`.
> Aturan tetap di [`/CLAUDE.md`](../CLAUDE.md) tetap berlaku (fitur lengkap, SEO, zero-touch,
> tidak bocor rahasia, tes ulang, CI hijau sebelum merge). Setiap pekerjaan dari dokumen ini
> dicatat di [`docs/REQUESTS.md`](REQUESTS.md) dan statusnya diperbarui di §9.

## 0. Perintah pemilik (5 Okt 2026)

> „ini aplikasi2 axto.io dengan docker exe buat windows & aplikasi docker buat Linux.... Semua
> banyak yg hilang, tolong di buatkan blueprint nya di guardian agar AI berikutnya bisa
> memperbaiki, aplikasi ini wajib spek tertinggi, super enterprice & super premium, agar web ini
> layak di jual $10jt tanpa pembeli, dan layak di jual ratusan hingga jutaan dollar per license
> lifetime"

Gambar yang dikirim pemilik menunjukkan **10 aplikasi**, masing-masing dengan edisi bertingkat
dan tombol **„100 TRIAL LICENSE“**, di bawah merek **„AXTO Digital Global — One Ecosystem.
Endless Possibilities.“**:

| # | Aplikasi | Edisi di gambar |
|---|---|---|
| 1 | Guardian AI | Sentinel Lite · Professional · Business · Enterprise |
| 2 | Orchestra AI | Starter · Professional · Enterprise |
| 3 | Vault AI | Starter · Professional · Business · Enterprise |
| 4 | Edge AI | Starter · Professional · Business · Enterprise |
| 5 | SOC AI | Starter · Professional · Business · Enterprise |
| 6 | Compliance AI | Starter · Professional · Business · Enterprise |
| 7 | Sentinel OT | Starter · Professional · Business · Enterprise |
| 8 | Antivirus | Starter · Professional · Enterprise |
| 9 | AXTO Studio | Starter · Professional · Enterprise |
| 10 | AXTO Legal | Starter · Professional · Business · Enterprise |

### Kejujuran soal harga (wajib dibaca)
„Layak dijual US$10 juta“ dan „ratusan ribu sampai jutaan dolar per lisensi lifetime“ adalah
**target pemilik, bukan janji**. Pembeli enterprise membayar harga setinggi itu hanya bila ada
bukti: produk yang benar-benar jalan, keamanan yang diaudit (pentest independen, laporan SOC 2 /
ISO 27001), pelanggan referensi, SLA dukungan, dan dokumentasi lengkap. Karena itu:

- Halaman publik **tidak boleh** mengklaim pelanggan, sertifikasi, angka deteksi atau
  „dipakai Fortune 500“ yang tidak nyata (`docs/BLUEPRINT-V4.md` §1).
- Harga lisensi lifetime diatur dari Admin (bukan di-hardcode) supaya pemilik bisa menaikkannya
  ketika bukti-bukti di atas sudah ada. §7 berisi daftar bukti yang menaikkan nilai jual.

## 1. Temuan: apa yang hilang dan kenapa

**Akar masalah:** commit `1350d89` („v3 foundation: paid subscriptions, BYOX/Managed split,
paid-only licences“, 27 Sep 2026) menghapus 290 file / ±46.000 baris kode dashboard lama.
Sebagian halaman sudah dibangun ulang di v3/v4 (admin, acquire, blog, privacy, self-hosted), tetapi
**model penjualan per aplikasi di gambar pemilik tidak pernah dikembalikan**:

| Yang terlihat di gambar | Sebelum v3 (kode lama, lihat `git show 1350d89^:<path>`) | Sekarang | Status |
|---|---|---|---|
| Edisi per aplikasi (Starter…Enterprise) dijual sendiri-sendiri | `dashboard/lib/stripe.ts` `PACKAGE_INFO` (37 paket berbayar) | Lisensi self-hosted hanya ikut paket Business (3 app) / Enterprise (semua) dan selalu tier tertinggi (`dashboard/lib/selfhosted.ts`). Paket per app masih ada sebagai baris di D1 `license_packages`, tapi tidak dijual | ❌ hilang |
| „100 TRIAL LICENSE“ per aplikasi | `app/admin/trial-batch`, `app/api/admin/trial-batch`, `app/api/portal/trial-claim`, `app/api/portal/trial-request`, `app/api/admin/trial-requests`, halaman `/promo`, tabel `trial_batch_codes` + `trial_promo_config` | Dihapus: v3 = „paid-only licences“; `license-validate` menolak trial | ❌ hilang |
| Kartu 10 aplikasi dengan tier & tombol trial | `/promo`, `/products/[slug]` | `/self-hosted` + `/self-hosted/[slug]` (tanpa tier per app, tanpa trial) | ⚠️ sebagian |
| Halaman modul Studio (AI / GPU / Hybrid) | `/studio/ai`, `/studio/gpu`, `/studio/hybrid` | Image `ai-studio`, `gpu-studio`, `hybrid-studio` masih dibangun CI, halamannya hilang | ⚠️ sebagian |
| Reseller & harga promo | `/reseller/register`, `admin/resellers`, `admin/promo-pricing` | Tidak ada | ❌ hilang |
| Unduhan per produk | `/portal/downloads` | `/app/self-hosted` (image dari R2 `axto-builds`) | ✅ ada |

**Yang masih utuh dan menjadi fondasi:**

- 10 compose file + 10 contoh konfigurasi di root repo (`docker-compose.yml` untuk Guardian,
  `<slug>-compose.yml` untuk lainnya, `legal.env.example`).
- CI `auto-build-all.yml` membangun **semua image amd64 + arm64** dan mengunggahnya ke R2
  `axto-builds/builds/latest/raw/<image>[-arm64].tar.gz` (run terakhir sukses 30 Sep 2026).
- `build-installer.yml` membangun **AXTO-Setup.exe** (Go, `installer/`) tiap malam: satu installer
  untuk 10 produk, memasang lewat Docker Desktop (Windows) / Docker Engine (Linux), aktivasi kunci
  `<PREFIX>-8HEX-8HEX-8HEX-8HEX` atau `LIFE-…` (lifetime, offline).
- Verifikasi lisensi Ed25519 + aktivasi offline lifetime di setiap engine (`*/src/license.py`).
- `docs/BLUEPRINT-V4.md` §17 C: rencana AXTO Workspace (image Docker yang menjalankan kode cloud
  yang sama) untuk Legal / Studio / Vault / Compliance.

## 2. Katalog teknis 10 aplikasi (sumber kebenaran: `installer/products.go` = `dashboard/lib/selfhosted.ts`)

| # | Nama di gambar | Slug | Prefix kunci | Port UI | Image (amd64 + arm64) | Folder sumber | Paket top-tier saat ini |
|---|---|---|---|---|---|---|---|
| 1 | Guardian AI | `guardian` | `GUARD` | 8080 | `guardian-core`, `guardian-node` | `engine/` | `aegis` |
| 2 | Orchestra AI | `orchestra` | `ORCH` | 8088 | `orchestra-core`, `orchestra-worker-cpu`, `orchestra-worker-gpu` (opsional) | `orchestra/` | `orchestra_unlimited` |
| 3 | Vault AI | `vault` | `VAULT` | 8081 | `vault-core` | `vault/` | `vault_enterprise` |
| 4 | Edge AI | `edge` | `EDGE` | 8082 | `edge-core` | `edge/` | `edge_enterprise` |
| 5 | SOC AI | `soc` | `SOC` | 8083 | `soc-core` | `soc/` | `soc_enterprise` |
| 6 | Compliance AI | `compliance` | `CMPL` | 8084 | `compliance-core` | `compliance/` | `compliance_enterprise` |
| 7 | Sentinel OT | `sentinel` | `SNTL` | 8085 | `sentinel-core` | `sentinel/` | `sentinel_enterprise` |
| 8 | Antivirus | `antivirus` | `AV` | 8086 | `guardian-antivirus` (+ `clamav/clamav`) | `antivirus/` | `antivirus_enterprise` |
| 9 | AXTO Studio | `studio` | `STUD` | 8090 | `studio-core` + modul `ai-studio`, `gpu-studio`, `hybrid-studio` | `studio/`, `ai-studio/`, `gpu-studio/`, `hybrid-studio/` | `studio_enterprise` |
| 10 | AXTO Legal | `legal` | `LEGL` | 8096 | `legal-core` | `legal/` | `legal_enterprise` |

Nama tampilan **wajib** disamakan dengan gambar pemilik (Guardian AI, Orchestra AI, Vault AI,
Edge AI, SOC AI, Compliance AI, Sentinel OT, Antivirus, AXTO Studio, AXTO Legal) di
`product-catalog.ts`, `selfhosted.ts`, `installer/products.go`, i18n 10 bahasa dan tes — satu PR,
tanpa mengubah slug/prefix/port (kunci lama harus tetap valid).

## 3. Edisi per aplikasi (dikembalikan, di arsitektur v3)

Kode paket dan batas di bawah diambil dari `PACKAGE_INFO` lama (`git show 1350d89^:dashboard/lib/stripe.ts`)
dan baris `license_packages` di D1 — **jangan buat kode paket baru**, pakai yang sudah ada supaya
lisensi lama tetap cocok. Angka harga lama hanya titik awal; harga final diatur di Admin → Plans.

| Aplikasi | Edisi → kode paket → batas inti |
|---|---|
| Guardian AI | Sentinel Lite `lite` 1 server · Professional `pro` 25 server, threat hunting, UEBA · Business `shield` 100 server, eBPF, mTLS mesh, deception · Enterprise `aegis` 1.000 server, multi-tenant, white-label, threat intel kustom |
| Orchestra AI | Starter `orchestra_core` 10 worker · Professional `orchestra_scale` 50 worker, autoscale, federasi, analitik biaya · Enterprise `orchestra_unlimited` worker tak terbatas, routing kustom, white-label |
| Vault AI | Starter `vault_starter` 50K req/hari · Professional `vault_professional` 500K req/hari, HIPAA/PCI/SOC 2 · Business `vault_business` 5M req/hari, model NLP kustom, SIEM · Enterprise `vault_enterprise` tak terbatas, multi-region |
| Edge AI | Starter `edge_starter` 100K req/hari, 5 kunci pelanggan · Professional `edge_professional` 1M req/hari, metering token · Business `edge_business` 10M req/hari, invoicing otomatis · Enterprise `edge_enterprise` tak terbatas, multi-tenant, white-label |
| SOC AI | Starter `soc_starter` 5 sumber log, 200 EPS · Professional `soc_professional` 25 sumber, 1K EPS, threat intel · Business `soc_business` 100 sumber, 10K EPS, hunting berbantuan AI · Enterprise `soc_enterprise` tak terbatas, multi-tenant (MSSP) |
| Compliance AI | Starter `compliance_starter` SOC 2 + GDPR · Professional `compliance_professional` 6 framework · Business `compliance_business` 7 framework + NIST CSF, gate CI/CD · Enterprise `compliance_enterprise` framework kustom, multi-tenant, due diligence M&A |
| Sentinel OT | Starter `sentinel_starter` 50 perangkat, laporan IEC 62443 · Professional `sentinel_professional` 500 perangkat, triase AI · Business `sentinel_business` 5.000 perangkat, multi-fasilitas, SOAR · Enterprise `sentinel_enterprise` tak terbatas, decoder protokol kustom |
| Antivirus | Starter `antivirus_starter` 10 endpoint, ClamAV + YARA · Professional `antivirus_professional` 100 endpoint, ML perilaku · Enterprise `antivirus_enterprise` tak terbatas, YARA kustom, integrasi SOC |
| AXTO Studio | Starter `studio_starter` 500 req/hari, 1 GPU · Professional `studio_professional` 5.000 req/hari, 5 GPU, pipeline hybrid · Enterprise `studio_enterprise` 50.000 req/hari, white-label |
| AXTO Legal | Starter `legal_starter` 3 workspace, 30 yurisdiksi · Professional `legal_professional` 10 workspace, 100 yurisdiksi · Business `legal_business` 18 workspace, 195+ yurisdiksi, multi-user · Enterprise `legal_enterprise` tak terbatas, air-gapped |

**Aturan implementasi:**
1. Satu sumber kebenaran baru: `dashboard/lib/editions.ts` (aplikasi → edisi → kode paket → batas
   terukur → fitur). Dipakai halaman publik, checkout, portal member, admin, lisensi yang
   ditandatangani, dan **engine** (batas dikirim di payload lisensi Ed25519, engine menegakkan).
2. Paket Business/Enterprise (bundle v3) tetap ada; lisensi dari bundle tetap tier tertinggi.
   Edisi per aplikasi adalah jalur pembelian tambahan, bukan pengganti.
3. Tiap engine membaca `entitlements` dari lisensi dan menegakkan batas (server, worker,
   req/hari, EPS, perangkat, endpoint, workspace) dengan pesan upgrade yang jelas — bukan crash.
4. Model lisensi: tahunan, bulanan, dan **Lifetime** (`LIFE-…`, sudah ada) per edisi; harga
   lifetime per edisi diatur di Admin.

## 4. Program „100 TRIAL LICENSE“ per aplikasi (dikembalikan)

Spesifikasi diambil dari kode lama, diperbaiki untuk v3:

- **Kolam:** admin membuat **100 kode trial per aplikasi** (opsional per edisi) di
  `/admin/trials`. Kode `TRIAL-XXXX-XXXX-XXXX` (alfabet tanpa huruf/angka ambigu), dibuat dengan
  `crypto.getRandomValues` (bukan `Math.random` seperti kode lama).
- **Klaim mandiri** di portal member (`/app/self-hosted` → „Coba gratis“) dan kartu publik
  `/self-hosted` (tombol „100 Trial License“ + sisa kuota yang nyata, bukan angka palsu).
- **Aturan:** 1 email + 1 IP + 1 sidik perangkat = maksimal 1 trial per aplikasi; maksimal 2
  aplikasi per klien (setting `trial_max_products`); jendela promo dari `trial_promo_config`;
  kolam habis → tombol tertutup otomatis.
- **Lisensi trial:** ditandatangani Ed25519 seperti lisensi berbayar, `license_type = 'trial'`,
  **14 hari** (setting `trial_days`, nilai di D1 lama 14; kode lama 7 — pakai setting), edisi
  Professional, tanpa API publik, watermark „TRIAL“ di UI dan laporan. Engine menolak setelah
  kedaluwarsa dan menampilkan tombol beli; data pelanggan tetap tersimpan (tidak dihapus).
- **Zero-touch:** klaim → lisensi aktif → email berisi kunci + perintah instal, tanpa langkah admin.
- **Admin:** aktif/nonaktif/hapus/generate ulang per batch, ekspor CSV, konversi trial → bayar,
  rating kepuasan per aplikasi, semua aksi masuk audit log.
- **D1 hemat** (aturan ekosistem: total Cloudflare < 10 GB, baca/tulis minimal): 10 × 100 = 1.000
  baris kecil; klaim memakai `UPDATE … WHERE status='available' LIMIT 1 RETURNING` (atomik).
- `license-validate` menerima trial yang ditandatangani dan belum kedaluwarsa; kunci
  FREE-ACCESS lama tetap terkunci `program_ended`.

## 5. Pengiriman: Docker Linux + Windows (.exe)

| Kebutuhan | Sekarang | Wajib (target) |
|---|---|---|
| Image Linux amd64 + arm64 | ✅ CI → R2 tarball | + registry OCI (`ghcr.io/p2nshooter/axto-<image>`) dengan tag versi semver + `latest`; tarball R2 tetap untuk air-gapped |
| Tanda tangan image | ❌ | cosign keyless (GitHub OIDC) untuk setiap image + verifikasi di installer |
| SBOM & pemindaian CVE | ❌ | Syft (SPDX) + Trivy di CI; gagal bila ada CVE kritis yang punya perbaikan; SBOM ikut diunduh |
| Checksum | ⚠️ | `SHA256SUMS` + tanda tangan untuk setiap tarball & installer |
| Installer Linux | ⚠️ compose manual / AXTO Setup | `curl -fsSL https://axto.io/install.sh \| sh` yang memverifikasi tanda tangan, + paket `.deb`/`.rpm` (systemd unit), + bundle air-gapped (semua image + compose + lisensi offline) |
| Installer Windows | ✅ `AXTO-Setup.exe` (Go) via Docker Desktop/WSL 2 | Tanda tangan Authenticode (sertifikat code signing EV milik pemilik — **tidak disimpan di repo**, hanya secret CI), `.msi` untuk deployment GPO/Intune, cek prasyarat (WSL 2, virtualisasi, RAM), Windows Service untuk auto-start, uninstall bersih |
| Agen endpoint Windows (Antivirus, Guardian node) | ❌ hanya container Linux | Agen native Windows (Go, layanan Windows) yang melapor ke core — tanpa ini Antivirus/Guardian tidak melindungi host Windows; jujur di halaman produk sampai ada |
| Pembaruan | ⚠️ unduh ulang | Kanal stable/beta, pembaruan bertanda tangan, rollback satu klik, catatan rilis di `/admin/releases` |
| Uji | ⚠️ `docker-smoke.yml` | Matriks smoke per aplikasi: Ubuntu 22.04/24.04, Debian 12, RHEL 9 (amd64 + arm64) dan Windows Server 2022 / Windows 11 (installer → health → login admin → aktivasi trial → fungsi inti → uninstall) |

## 6. Standar enterprise yang wajib dimiliki SETIAP aplikasi

Sebuah aplikasi baru boleh disebut „Enterprise“ di halaman publik bila semua baris ini ✅ dan diuji:

1. **Identitas:** login lokal + MFA (TOTP/WebAuthn), SSO **SAML 2.0 dan OIDC**, provisioning
   **SCIM 2.0**, RBAC dengan peran bawaan (Owner, Admin, Analyst, Auditor/Read-only) + peran kustom.
2. **Audit:** log audit append-only dengan hash berantai (tamper-evident), ekspor ke SIEM
   (syslog/CEF, JSON), retensi yang bisa diatur.
3. **Keamanan data:** TLS di mana-mana (sertifikat sendiri atau ACME), mTLS antarlayanan,
   enkripsi saat disimpan (kunci per instalasi, opsi KMS/HSM via PKCS#11 di Enterprise),
   rahasia tidak pernah ditulis ke log.
4. **Ketersediaan:** mode HA (≥2 replika core, Postgres dengan replika, Redis Sentinel),
   backup terjadwal + restore teruji, Helm chart untuk Kubernetes di samping Docker Compose.
5. **Observabilitas:** `/healthz` + `/readyz`, metrik Prometheus `/metrics`, tracing
   OpenTelemetry, dashboard Grafana contoh.
6. **API:** REST berversi dengan OpenAPI 3.1 yang diterbitkan, kunci API berskop, rate limit,
   webhook bertanda tangan; konsisten dengan AXTO Connect (`docs/BLUEPRINT-V4.md` §15).
7. **Lisensi:** Ed25519 offline (sudah ada), edisi & batas dari §3, trial dari §4, mode
   air-gapped (aktivasi tanpa internet dengan file lisensi), masa tenggang yang jelas.
8. **Multi-tenant & white-label** (edisi Enterprise): tenant terisolasi, logo/warna/domain sendiri.
9. **UI kelas premium:** UI web yang sama gayanya dengan axto.io (tema gelap/terang), 10 bahasa
   seperti portal member, aksesibel (WCAG 2.2 AA), tanpa teks placeholder.
10. **Kualitas:** tes unit + integrasi per engine (saat ini hampir semua engine **0 file tes** —
    hanya `orchestra` yang punya), coverage ≥ 70 % pada logika inti, lint + typecheck, pentest
    sebelum klaim „enterprise-grade“.
11. **Dokumentasi:** panduan instal (Linux, Windows, Kubernetes, air-gapped), panduan admin,
    referensi API, hardening guide, matriks kompatibilitas, catatan rilis — di
    `/self-hosted-guide/<slug>` (sudah ada) dan di dalam aplikasi.
12. **Dukungan:** tingkat SLA per edisi (Starter: email; Business: 8×5; Enterprise: 24×7 dengan
    waktu respons) — hanya dijanjikan bila pemilik benar-benar bisa memenuhinya.

## 7. Per aplikasi: pembanding, yang ada, celah, selesai bila

Ukuran kode saat ini (baris, perkiraan): engine 15,9K · orchestra 12,4K · soc 6,1K · edge 5,3K ·
vault 4,7K · sentinel 4,7K · legal 4,4K · compliance 3,9K · ai-studio 3,5K · studio 3,0K ·
antivirus 2,5K · installer 2,3K. Engine yang kecil (antivirus, studio, compliance) paling butuh
pekerjaan.

### 7.1 Guardian AI (`engine/`)
- **Setara:** CrowdStrike Falcon, SentinelOne, Wazuh.
- **Ada:** collector, detector, eBPF monitor, mTLS, multi-tenant, attack graph, threat hunting,
  SIEM forwarder, runbook, laporan PDF, websocket hub, node agent Linux.
- **Celah:** agen Windows/macOS; aturan deteksi yang terdokumentasi dan teruji (pemetaan MITRE
  ATT&CK); karantina/isolasi host; tes nol.
- **Selesai bila:** node Linux + Windows terdaftar ke core, simulasi serangan (Atomic Red Team
  subset) terdeteksi dan dipetakan ke ATT&CK di UI, batas server per edisi ditegakkan.

### 7.2 Orchestra AI (`orchestra/`)
- **Setara:** Portkey, LiteLLM Proxy, Ray Serve.
- **Ada:** core router + worker CPU/GPU.
- **Celah:** fallback & retry per penyedia teruji, cache semantik, anggaran per tim, federasi
  antar-cluster, analitik biaya di UI.
- **Selesai bila:** 15+ penyedia dengan tes kontrak (mock), autoscale worker terbukti di tes
  beban, batas worker per edisi ditegakkan.

### 7.3 Vault AI (`vault/`)
- **Setara:** Microsoft Presidio, Private AI, Nightfall.
- **Celah:** paritas dengan Privacy Vault v4 cloud (`dashboard/lib/vault`), jalur AXTO Workspace
  (BLUEPRINT-V4 §17 C), uji presisi/recall per jenis PII pada dataset sintetis berbahasa banyak.
- **Selesai bila:** proxy OpenAI-compatible yang meredaksi sebelum keluar jaringan, laporan
  akurasi per entitas dipublikasikan apa adanya, batas req/hari per edisi.

### 7.4 Edge AI (`edge/`)
- **Setara:** Kong AI Gateway, Cloudflare AI Gateway, Zuplo.
- **Celah:** portal developer untuk pelanggan si pembeli, metering token yang bisa diaudit,
  integrasi penagihan (Stripe/Xendit) milik pembeli, multi-tenant.
- **Selesai bila:** pembeli bisa menjual API AI-nya sendiri end-to-end di lingkungan uji.

### 7.5 SOC AI (`soc/`)
- **Setara:** Splunk ES, Google SecOps, Elastic Security.
- **Celah:** parser sumber log (syslog, Windows Event, CloudTrail, M365, firewall umum), korelasi
  berbasis Sigma, playbook SOAR, kasus/insiden dengan SLA, EPS terukur sesuai edisi.
- **Selesai bila:** 1K EPS bertahan di tes beban pada spesifikasi minimum yang dipublikasikan,
  aturan Sigma diimpor dan memicu alert yang benar.

### 7.6 Compliance AI (`compliance/`)
- **Setara:** Vanta, Drata, Secureframe.
- **Celah:** paritas dengan Compliance Center v4 cloud, konektor bukti (AWS, Azure, GCP, GitHub,
  Google Workspace, M365), kontrol yang dipetakan ke teks resmi framework (tanpa menyalin teks
  berhak cipta ISO), ekspor paket audit.
- **Selesai bila:** 7 framework + kustom, bukti otomatis dari minimal 3 konektor nyata di tes.

### 7.7 Sentinel OT (`sentinel/`)
- **Setara:** Nozomi Networks, Claroty, Dragos.
- **Celah:** pemantauan pasif dari port SPAN/PCAP, decoder Modbus/DNP3/EtherNet-IP/PROFINET/
  IEC 61850/BACnet/OPC UA dengan tes PCAP, model Purdue, inventaris firmware + CVE.
- **Selesai bila:** PCAP contoh tiap protokol menghasilkan inventaris & anomali yang benar;
  **tidak pernah** mengirim paket aktif ke jaringan OT kecuali fitur aktif diizinkan eksplisit.

### 7.8 Antivirus (`antivirus/`)
- **Setara:** Microsoft Defender for Endpoint, ESET PROTECT, Sophos.
- **Ada:** API pemindaian ClamAV + YARA + ML, dashboard.
- **Celah terbesar:** saat ini hanya **layanan pemindaian di container**, bukan perlindungan
  endpoint. Wajib: agen endpoint Windows & Linux (on-access scan, karantina, pembaruan signature
  terjadwal), konsol manajemen kebijakan, uji EICAR. Sampai agen ada, halaman produk menyebutnya
  „scanning API“, bukan „endpoint protection“.
- **Selesai bila:** agen Windows + Linux terpasang, file EICAR dikarantina on-access, batas
  endpoint per edisi ditegakkan.

### 7.9 AXTO Studio (`studio/` + `ai-studio/`, `gpu-studio/`, `hybrid-studio/`)
- **Setara:** Open WebUI, LM Studio, TypingMind Teams.
- **Celah:** paritas dengan AI Studio v4 cloud lewat AXTO Workspace, halaman modul AI/GPU/Hybrid
  yang hilang, dukungan model lokal (Ollama, vLLM) + GPU NVIDIA (CUDA) teruji.
- **Selesai bila:** chat, RAG atas file lokal, dan inferensi GPU jalan di container dengan model
  tiruan di CI dan model nyata di uji manual.

### 7.10 AXTO Legal (`legal/`)
- **Setara:** Harvey, CoCounsel, Spellbook, Luminance.
- **Celah:** paritas dengan Legal AI v4 cloud (36 workspace, redline, playbook, klausul, tenggat,
  sitasi) lewat AXTO Workspace; mode air-gapped dengan model lokal untuk edisi Enterprise.
- **Selesai bila:** semua alat v4 jalan di container, terjemahan 10 bahasa lulus tes i18n.

## 8. Yang menaikkan nilai jual (situs US$10 juta & lisensi lifetime mahal)

Urut dari dampak terbesar; semuanya harus **nyata**, bukan klaim:
1. Semua 10 aplikasi lulus §6 dan matriks uji §5 (bukti: run CI publik di `/status`).
2. Pentest independen + perbaikan; ringkasan hasil di data room `/acquire`.
3. Laporan SOC 2 Type II / ISO 27001 untuk operasi axto.io (butuh auditor; biaya & waktu nyata).
4. Pelanggan berbayar nyata dan pendapatan berulang yang bisa diverifikasi (dashboard admin).
5. Dokumentasi lengkap + video demo per aplikasi.
6. Escrow kode sumber untuk pembeli lisensi lifetime Enterprise.
7. SLA dukungan yang bisa dipenuhi.

## 9. Urutan kerja & status (perbarui setiap PR)

| Fase | Isi | PR | Status |
|---|---|---|---|
| A1 | Nama tampilan 10 aplikasi = gambar pemilik, di semua tempat (§2) | branch `ccr-e9111ca5-n0fcha` | ✅ situs, portal, footer (10 dari 10), menu Aplikasi, FAQ 10 bahasa, `installer/products.go`, panduan klien. Teks banner log di dalam engine Python ikut saat fase D per aplikasi |
| A2 | `lib/editions.ts` + edisi per aplikasi di `/self-hosted/[slug]`, `/pricing`, checkout, member, admin (§3) | — | ⏳ |
| A3 | Program 100 trial per aplikasi: tabel, admin `/admin/trials`, klaim member, kartu publik, `license-validate` (§4) | — | ⏳ |
| A4 | Engine menegakkan batas edisi + watermark trial (semua 10 engine) | — | ⏳ |
| B1 | Rilis bertanda tangan: registry OCI, cosign, SBOM, Trivy, SHA256SUMS (§5) | — | ⏳ |
| B2 | Installer: Authenticode, MSI, `install.sh`, .deb/.rpm, bundle air-gapped (§5) | — | ⏳ |
| B3 | Matriks smoke-test per aplikasi Linux + Windows (§5) | — | ⏳ |
| C1 | Baseline enterprise §6 (SSO/SCIM/RBAC/audit/HA/metrics) sebagai pustaka bersama Python, dipakai 10 engine | — | ⏳ |
| C2 | Tes per engine (coverage ≥ 70 % logika inti) | — | ⏳ |
| D1–D10 | Celah per aplikasi §7.1–7.10 (satu PR per aplikasi; Antivirus & Studio dahulu) | — | ⏳ |
| E1 | AXTO Workspace (BLUEPRINT-V4 §17 C) untuk Legal / Studio / Vault / Compliance | — | ⏳ |
| E2 | Halaman modul Studio, reseller, harga promo (§1) | — | ⏳ |
| F1 | Pembayaran BNI: upload bukti → admin terima/tolak → lisensi langsung di dashboard (§12) | PR ini | ✅ |
| F2 | Smart License v5 (§11) | — | ⏳ |
| F3 | Desain mewah menyeluruh: publik, login, portal member, admin (§13) | — | ⏳ |
| F4 | Antivirus kelas dunia, tahap 1–4 (§14) | — | ⏳ |

Setiap fase: satu PR, `cd dashboard && npx tsc --noEmit -p . && npm test`, `bash tests/e2e/run.sh`,
uji browser nyata untuk UI, CI E2E hijau sebelum merge, baris di `docs/REQUESTS.md` diperbarui.

## 10. Larangan

- Jangan hapus atau ubah format kunci lisensi yang sudah terjual (`<PREFIX>-…`, `LIFE-…`).
- Jangan menaruh kunci tanda tangan lisensi, sertifikat code signing, kredensial R2/registry di
  repo; hanya di secret CI / penyimpanan terenkripsi admin.
- Jangan klaim sertifikasi, pelanggan, tingkat deteksi atau „100 % aman“ yang tidak terbukti.
- Jangan membuat trial tanpa batas penyalahgunaan (email + IP + perangkat).
- Jangan menaruh data besar di D1 (total Cloudflare < 10 GB): image/installer tetap di R2.

## 11. Smart License v5 (perintah pemilik 5 Okt: „smart license yg super canggih“)

Fondasi yang sudah ada: kunci `<PREFIX>-8HEX-8HEX-8HEX-8HEX`, `LIFE-…` (lifetime offline), tanda tangan
Ed25519, aktivasi offline, `license-validate` dengan heartbeat 1 tulis/jam, `sh_licenses` di D1.

| Kemampuan | Wajib | Catatan desain |
|---|---|---|
| Hak (entitlements) per edisi | ✅ | Payload lisensi bertanda tangan memuat `edition`, `limits` (server, worker, req/hari, EPS, perangkat, endpoint, workspace), `features[]`, `expires_at`, `grace_days`. Engine membaca dari payload, bukan dari konfigurasi lokal (tidak bisa diakali dengan mengedit file). |
| Pengikatan mesin yang toleran | ✅ | Sidik mesin = hash dari beberapa komponen (machine-id, CPU, disk, MAC utama); lisensi tetap valid bila ≤ 1 komponen berubah (ganti NIC/disk tidak memblokir pelanggan). |
| Kursi & instance | ✅ | Hitung instance aktif per lisensi; batas per edisi; pelanggan bisa melepas instance lama sendiri di portal (rehost) dengan batas wajar per bulan. |
| Floating / concurrent (Enterprise) | ✅ | Kolam kursi bersama; checkout/checkin dengan lease 24 jam yang diperpanjang heartbeat. |
| Offline & air-gapped | ✅ | File permintaan aktivasi → file respons bertanda tangan (tanpa internet di sisi pelanggan); masa berlaku offline sesuai edisi. |
| Masa tenggang | ✅ | Bila server lisensi tak terjangkau: tetap jalan `grace_days` (Starter 7, Pro 14, Business 30, Enterprise 60) lalu mode baca-saja, **tidak pernah menghapus data**. |
| Pencabutan | ✅ | Daftar cabut (CRL) bertanda tangan yang diunduh engine; pembayaran refund/chargeback → cabut otomatis. |
| Trial | ✅ | §4: `license_type='trial'`, watermark, kedaluwarsa otomatis. |
| Upgrade/downgrade di tempat | ✅ | Ganti edisi tanpa instal ulang: engine mengambil lisensi baru saat heartbeat berikutnya. |
| Deteksi manipulasi | ✅ | Jam mundur (rollback waktu) terdeteksi dari stempel waktu terakhir yang tercatat; payload tanpa tanda tangan valid ditolak; semua kejadian ke log audit. |
| Portal lisensi member | ✅ | Daftar lisensi + edisi + instance + tanggal berakhir, unduh file lisensi offline, rehost, perpanjang/upgrade, riwayat aktivasi. |
| Portal lisensi admin | ✅ | Terbitkan manual, perpanjang, cabut, lihat instance & heartbeat terakhir, ekspor CSV, semua aksi masuk audit. |
| Pelaporan pemakaian | ⚪ opsional | Metering jujur (hanya angka agregat, tanpa data pelanggan) untuk edisi berbasis pemakaian; bisa dimatikan di air-gapped. |

**Selesai bila:** tes unit untuk verifikasi tanda tangan, toleransi sidik mesin, masa tenggang, CRL dan
jam mundur di setiap engine (pustaka bersama Python), plus E2E portal (terbit → aktivasi → rehost → cabut).

## 12. Pembayaran BNI manual dengan bukti transfer (perintah pemilik 5 Okt) — ✅ dibangun

Semua metode lain tetap otomatis (PayPal, kartu via Xendit/Midtrans, kripto). Khusus transfer BNI:

1. Klien memilih transfer bank → melihat rekening BNI dan **jumlah unik** (3 digit terakhir = kode pesanan).
2. Klien **mengunggah bukti transfer** (foto/screenshot JPG/PNG/WebP atau PDF, maks. 5 MB) di layar
   pembayaran; nomor referensi opsional. Jenis file diperiksa dari byte aslinya, bukan dari nama file.
   File disimpan privat di R2 (`receipts/<orderId>/…`), tidak pernah publik.
3. Admin mendapat pesan di Support inbox + email. Di **Admin → Orders → „Awaiting approval“** admin membuka
   bukti (gambar/PDF tampil langsung), mencocokkan dengan aplikasi bank (tempel jumlah di kotak cari),
   lalu:
   - **Approve** → paket aktif, lisensi self-hosted terbit dan **langsung tampil di dashboard klien**
     (layar pembayaran klien berubah sendiri lewat polling), invoice dikirim email.
   - **Reject proof** + alasan (wajib) → pesanan tetap terbuka, klien melihat alasannya di layar
     pembayaran dan via email, lalu bisa mengunggah bukti baru (penolakan lama terhapus).
4. Semua langkah tercatat di log audit (`order.bank_proof`, `admin.order.reject_proof`, `admin.order.mark_paid`).

Kode: `dashboard/lib/billing/receipt.ts`, `app/api/billing/orders/[id]/route.ts`,
`app/api/admin/orders/route.ts`, `app/api/admin/orders/receipt/route.ts`, `app/admin/orders/page.tsx`,
`components/app/PayPanel.tsx` (10 bahasa di `lib/i18n-pages/paypanel.ts`). Tes:
`tests/e2e/automation.e2e.ts` → „BNI receipt upload → …“.

## 13. Desain mewah menyeluruh (perintah pemilik: „CSS super mewahnya jgn hanya index tp menyeluruh“)

Kemewahan harus terasa di **setiap** layar, bukan hanya beranda:

| Area | Halaman | Yang wajib |
|---|---|---|
| Publik | `/`, `/apps`, `/apps/[slug]`, `/self-hosted`, `/self-hosted/[slug]`, `/pricing`, `/acquire`, `/developers`, `/legal-ai`, `/prompts`, `/blog`, `/help`, `/security`, `/status`, semua halaman legal | satu sistem desain „AXTO Royal“: token warna (obsidian, violet kerajaan, emas lembut, gading), tipografi display + teks, kartu kaca dengan tepi emas tipis, bayangan berlapis, gradien halus, ikon konsisten, animasi masuk saat digulir, hover yang hidup |
| Masuk | `/login`, `/register`, `/forgot-password`, `/reset-password` | panel terpisah dengan ilustrasi perisai, formulir premium, status error/sukses yang jelas |
| Portal member | `/app/*` (dashboard, billing, self-hosted, lifetime, studio, vault, legal, security, compliance, clipper, prompts, files, developers, settings) | sidebar & header premium, kartu statistik, tabel, formulir, modal, badge, toast, kosong-state yang indah — semua lewat komponen `components/ui` sehingga satu perubahan menyebar ke semua halaman |
| Admin | `/admin/*` | gaya yang sama dengan nuansa „command center“ (lebih gelap), tabel padat yang tetap mewah |

Aturan teknis: token di `app/globals.css` (`:root` + mode gelap), kelas komponen (`.btn-*`, `.card`,
`.input`, `.badge-*`, `.table`, `.alert-*`) diperbarui sekali sehingga seluruh portal ikut; kontras WCAG 2.2
AA; `prefers-reduced-motion` dihormati; tidak ada gambar berat (SVG/CSS saja); skor Lighthouse performa
tetap ≥ 90. **Selesai bila:** screenshot 390 px dan 1440 px untuk setiap halaman di tabel di atas
diperiksa, tanpa overflow horizontal dan tanpa error konsol.

## 14. Antivirus kelas dunia (perintah pemilik: „maximalin antivirus nya biar seperti anti virus kelas dunia“)

**Keadaan jujur saat ini** (`antivirus/src`, ±2.100 baris): ClamAV (clamd) + `PatternEngine` (pola teks),
`EntropyEngine`, `HashEngine` (hash yang dipelajari), `LearningEngine` (SQLite), API REST
(`/v1/scan/*`, karantina, `learn/*`), dashboard HTML. **Belum ada:** YARA sungguhan (paket `yara-python`
tidak terpasang), model ML yang terlatih, analisis PE/ELF/Office/PDF/arsip, perlindungan real-time di
endpoint, agen Windows, deteksi ransomware, konsol kebijakan, pembaruan signature yang ditandatangani, tes.

**Pembanding:** Microsoft Defender for Endpoint, ESET PROTECT, Kaspersky Endpoint Security, Sophos
Intercept X, CrowdStrike Falcon. „Kelas dunia“ hanya boleh diklaim setelah lulus uji independen
(AV-TEST, AV-Comparatives, SE Labs) — sampai saat itu halaman produk menyebut kemampuan, bukan peringkat.

### Tahap 1 — mesin deteksi berlapis (container, bisa diuji di CI)
- YARA nyata (`yara-python`) dengan paket aturan bertanda tangan (aturan sendiri + aturan open-source
  berlisensi yang mengizinkan pemakaian komersial; lisensi tiap paket dicatat).
- Analisis statis: PE (header, section, import, entropi per section, tanda tangan Authenticode via
  `pefile`/`lief`), ELF, Mach-O, makro Office (`oletools`), PDF (JavaScript/launch action), skrip
  (PowerShell/JS/VBS terobfuskasi), arsip bertingkat (zip/7z/rar, batas kedalaman & ukuran — anti zip-bomb).
- Model ML statis terlatih (fitur EMBER-style, gradient boosting) dengan ambang yang dikalibrasi;
  dataset & metrik (TPR/FPR) didokumentasikan; model ditandatangani dan bisa diperbarui.
- Reputasi hash (allowlist file sistem tepercaya + blocklist), cache hasil berbasis SHA-256.
- Putusan gabungan dengan skor & alasan per mesin (dapat dijelaskan di UI).
- **Selesai bila:** EICAR + korpus uji aman (file tiruan berpola malware, bukan malware hidup) terdeteksi;
  korpus file bersih (≥ 1.000 file sistem/umum) → 0 false positive; tes di CI.

### Tahap 2 — agen endpoint real-time
- **Linux:** agen Go dengan `fanotify` (pemindaian on-access/on-exec), karantina terenkripsi, unit systemd.
- **Windows:** agen Go sebagai Windows Service: pemindaian saat file ditulis/dieksekusi (ReadDirectoryChangesW
  + hook eksekusi via ETW), integrasi **AMSI provider** untuk skrip, karantina terenkripsi, koeksistensi
  dengan Microsoft Defender. (Driver kernel minifilter = tahap lanjut, butuh sertifikat EV + tanda tangan
  Microsoft — dicatat, tidak dijanjikan.)
- Perlindungan ransomware: file umpan (canary), deteksi enkripsi massal (entropi tulis + laju rename),
  hentikan proses, pulihkan dari salinan bayangan bila tersedia.
- Pembaruan signature/aturan/model bertanda tangan, otomatis tiap jam, rollback bila rusak.

### Tahap 3 — konsol manajemen (di dalam image antivirus + portal axto.io)
- Kebijakan per grup perangkat (pemindaian terjadwal, eksklusi, tindakan otomatis), daftar perangkat &
  kesehatan, insiden dengan alur proses, karantina terpusat (pulihkan/hapus), laporan PDF, ekspor ke
  SOC AI / SIEM (syslog/CEF), RBAC + SSO (§6), batas endpoint per edisi (§3).

### Tahap 4 — pembuktian
- Uji AMTSO feature settings check, EICAR, korpus internal di CI tiap rilis, tes beban (file/detik).
- Pendaftaran ke AV-TEST / AV-Comparatives saat agen Windows stabil (biaya & jadwal diputuskan pemilik).

**Larangan khusus antivirus:** jangan menyimpan malware hidup di repo atau R2 publik; korpus uji hanya file
tiruan aman; jangan klaim „mendeteksi 100 %“ atau peringkat lab yang belum didapat.
