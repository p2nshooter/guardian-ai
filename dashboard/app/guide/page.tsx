"use client";
export const runtime = "edge";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────
type Section = "start"|"guardian"|"orchestra"|"antivirus"|"api";

// ─── Setup flow steps ──────────────────────────────────────────────────────
const SETUP_STEPS = [
  {
    id:"payment", icon:"💳", title:"1. Beli Lisensi",
    color:"#0284c7", bg:"rgba(2,132,199,0.08)",
    desc:"Pilih paket di axto.io/playbooks atau hubungi admin. Bayar via Stripe, PayPal, Xendit, atau Midtrans. Invoice otomatis dikirim ke email.",
    detail:[
      "Pilih Guardian AI, Orchestra AI, atau Bundle",
      "Checkout: masukkan email + metode pembayaran",
      "Invoice PDF dikirim ke email dalam 60 detik",
      "License key muncul di dashboard portal klien",
    ],
    code:"",
    anim:"payment",
  },
  {
    id:"download", icon:"⬇️", title:"2. Download Engine",
    color:"#0d9488", bg:"rgba(13,148,136,0.08)",
    desc:"Login ke portal → tab Licenses → klik tombol ⬇ docker-compose.yml dan ⬇ Config Template. Atau admin bisa buat custom build via Engine Builder.",
    detail:[
      "Login: axto.io/auth/login (email + password atau magic link)",
      "Klik tab Licenses → temukan lisensi aktif",
      "Download docker-compose.yml",
      "Download guardian.yml / orchestra.yml (config template)",
      "Lihat README.txt untuk instruksi setup",
    ],
    code:"",
    anim:"download",
  },
  {
    id:"license", icon:"🔑", title:"3. Input License Key",
    color:"#7c3aed", bg:"rgba(124,58,237,0.08)",
    desc:"Buka file guardian.yml / orchestra.yml — isi license_key dengan kode dari email/portal. Isi juga AI API key milik Anda sendiri (BYOK).",
    detail:[
      "Buka guardian.yml (text editor biasa)",
      "Isi: license_key: \"GUARD-XXXX-XXXX-XXXX-XXXX\"",
      "Isi AI key Anda: api_key: \"sk-...\" (OpenAI, Groq, dll)",
      "PENTING: Key AI Anda tidak pernah dikirim ke server AXTO",
      "Simpan file — siap untuk docker compose",
    ],
    code:`guardian:
  license_key: "GUARD-A1B2-C3D4-E5F6-G7H8"
  ai_pool:
    providers:
      - provider: openai
        api_key: "sk-YOUR_OWN_KEY"   # ← key Anda sendiri
        model: "gpt-4o-mini"`,
    anim:"license",
  },
  {
    id:"docker", icon:"🐳", title:"4. Build & Deploy Docker",
    color:"#2563eb", bg:"rgba(37,99,235,0.08)",
    desc:"Jalankan docker compose up -d. Docker otomatis pull image dari GHCR, start database PostgreSQL, dan launch engine. Dashboard tersedia di port 8080.",
    detail:[
      "Pastikan Docker Desktop / Docker Engine terinstall",
      "cd ke folder berisi docker-compose.yml",
      "Set password DB: export GUARDIAN_DB_PASSWORD=$(openssl rand -hex 16)",
      "Jalankan: docker compose up -d",
      "Tunggu ~60 detik sampai semua container healthy",
      "Buka browser: http://YOUR_SERVER:8080",
    ],
    code:`# Deploy Guardian AI
export GUARDIAN_DB_PASSWORD=$(openssl rand -hex 16)
docker compose up -d

# Cek status
docker compose ps

# Lihat logs
docker compose logs -f guardian-core`,
    anim:"docker",
  },
  {
    id:"exe", icon:"💾", title:"5. Atau Pakai EXE / Script",
    color:"#dc2626", bg:"rgba(220,38,38,0.08)",
    desc:"Jika admin membuatkan EXE build, Anda mendapat install.sh (Linux/macOS) atau install.bat (Windows). Jalankan sekali — otomatis pull image dan start semua service.",
    detail:[
      "Terima file dari admin: install.sh atau install.bat",
      "Linux/macOS: chmod +x install.sh && ./install.sh",
      "Windows: klik kanan install.bat → Run as Administrator",
      "Script otomatis: check Docker, pull image, generate .env, compose up",
      "Selesai dalam 2-3 menit tergantung kecepatan internet",
    ],
    code:`# Linux / macOS
chmod +x install.sh
./install.sh

# Windows PowerShell
.\\install.bat`,
    anim:"exe",
  },
  {
    id:"api", icon:"🤖", title:"6. Gunakan API AI Anda",
    color:"#16a34a", bg:"rgba(22,163,74,0.08)",
    desc:"Orchestra AI adalah drop-in replacement untuk OpenAI API. Ganti base_url di aplikasi Anda ke Orchestra endpoint. Semua request dioptimasi otomatis.",
    detail:[
      "Orchestra endpoint: http://YOUR_SERVER:8080/v1/chat/completions",
      "Ganti base_url di aplikasi Anda — tidak perlu ubah kode lain",
      "Orchestra routing ke provider termurah/tercepat secara otomatis",
      "Semua request logged di Console: biaya, latency, provider",
      "API key BYOK: key tetap di server Anda, tidak keluar",
    ],
    code:`# Python — ganti base_url saja
from openai import OpenAI
client = OpenAI(
    base_url="http://YOUR_SERVER:8080/v1",
    api_key="YOUR_WORKER_TOKEN"   # dari orchestra.yml
)
response = client.chat.completions.create(
    model="auto",   # Orchestra pilih provider terbaik
    messages=[{"role":"user","content":"Hello!"}]
)`,
    anim:"api",
  },
];

// ─── Guardian menus ─────────────────────────────────────────────────────────
const GUARDIAN_MENUS = [
  { icon:"📊", title:"Dashboard", color:"#0284c7",
    short:"Security command center — threat score, active threats, scan count, blocked attacks",
    detail:`Dashboard adalah pusat komando keamanan server Anda secara real-time.

YANG DITAMPILKAN:
• Threat Score (0-100): Hijau = aman, Kuning = perlu perhatian, Merah = kritis
• Active Threats: Jumlah ancaman yang sedang aktif/belum diselesaikan
• Scans Today: Total file dan proses yang dipindai dalam 24 jam terakhir
• Blocked Attacks: Total serangan yang diblokir (brute force, malware, intrusi)
• System Resources: CPU, Memory, Disk dari Guardian engine itu sendiri
• Recent Events Timeline: 50 event keamanan terakhir secara kronologis
• Threat Map: Visualisasi geografis asal serangan (jika IP geolocation aktif)

APA YANG HARUS DILAKUKAN:
→ Jika Threat Score < 70: segera cek Active Threats
→ Badge hijau = sistem sehat dan terlindungi
→ Klik metrik apapun untuk drill down ke detail`,
    anim:"guardian_dashboard" },
  { icon:"🔍", title:"Threat Scanner (7 Layer)", color:"#ef4444",
    short:"7-layer malware detection: hash, magic bytes, entropy, signatures, YARA, AI, behavioral",
    detail:`File Scanner menggunakan 7 layer deteksi yang bekerja berurutan:

LAYER 1 — Hash Lookup: Bandingkan hash file dengan database malware yang diupdate setiap jam
LAYER 2 — Magic Bytes: Cek header file untuk deteksi file eksekutabel yang disamarkan (misal .jpg yang sebenarnya .exe)
LAYER 3 — Entropy Analysis: File dengan entropi tinggi kemungkinan terenkripsi/packed malware
LAYER 4 — Binary Signatures: Scan untuk pola byte berbahaya yang diketahui dalam eksekutabel
LAYER 5 — YARA-like Patterns: Pattern matching untuk web shell, backdoor, crypto miner
LAYER 6 — AI Deep Scan: Analisis neural network untuk zero-day dan polymorphic malware
LAYER 7 — Behavioral Analysis: Monitor APA YANG DILAKUKAN file, bukan hanya apa file itu

MENU OPTIONS:
• Scan Now: Jalankan scan penuh pada direktori tertentu
• Scan History: Lihat semua hasil scan dengan temuan
• Quarantine: File berbahaya yang diisolasi (bisa di-restore jika false positive)
• Whitelist: Kecualikan file/path tertentu dari scan
• Schedule: Set interval scan otomatis (per jam, harian, mingguan)`,
    anim:"threat_scanner" },
  { icon:"📁", title:"File Integrity Monitor", color:"#f97316",
    short:"SHA-256 real-time file change tracking — wajib untuk SOC2/PCI-DSS/HIPAA",
    detail:`File Integrity Monitor (FIM) memantau perubahan file secara real-time menggunakan SHA-256 hashing.

CARA KERJA:
1. Saat pertama diaktifkan: buat baseline snapshot semua file di path yang dipantau
2. Setiap perubahan (buat/ubah/hapus) dibandingkan dengan baseline
3. Perubahan tidak sah menghasilkan alert instan

PATH YANG DIPANTAU (default):
• /etc — konfigurasi sistem
• /var/www — file web server
• Custom paths bisa ditambah di Settings

YANG TERDETEKSI:
• File baru yang tidak diharapkan
• Modifikasi file konfigurasi kritis
• Penghapusan file penting
• Web shell yang disisipkan ke folder web

COMPLIANCE: Diperlukan untuk SOC2 Type II, PCI-DSS, HIPAA, ISO 27001

ACTIONS:
• Lihat diff: perubahan apa yang terjadi
• Acknowledge: tandai sebagai sah (update baseline)
• Alert: tandai sebagai tidak sah → buat incident`,
    anim:"fim" },
  { icon:"⚙️", title:"Process Monitor", color:"#8b5cf6",
    short:"Deteksi proses tidak sah, privilege escalation, crypto miner, reverse shell",
    detail:`Process Monitor menampilkan semua proses yang berjalan dengan pohon parent-child.

YANG DITAMPILKAN:
• Semua proses aktif: PID, nama, user, CPU, memory, start time
• Parent-child tree: lihat proses mana yang spawn proses lain
• Network connections per proses
• File yang dibuka oleh setiap proses

YANG TERDETEKSI OTOMATIS:
• Unauthorized executables: program yang tidak ada di whitelist
• Privilege escalation: proses biasa yang mendapat root
• Crypto miners: proses dengan CPU usage tinggi dan network ke pool
• Reverse shells: bash/sh yang terkoneksi ke IP luar
• Memory injection: proses yang inject ke memori proses lain

ACTIONS PER PROSES:
• Kill: Hentikan proses seketika
• Auto-kill rule: Set rule otomatis jika pola ini terdeteksi lagi
• Whitelist: Tandai sebagai trusted untuk masa depan
• Forensic capture: Ambil memory dump sebelum kill`,
    anim:"process_monitor" },
  { icon:"🌐", title:"Network Monitor", color:"#06b6d4",
    short:"Semua koneksi inbound/outbound, DNS logging, C2 blocking, data exfiltration detection",
    detail:`Network Monitor memantau semua koneksi jaringan secara real-time.

YANG DITAMPILKAN:
• Active connections: source IP, dest IP, port, protocol, proses
• Bandwidth per koneksi dan total
• IP reputation score (database threat intelligence)
• Geo-location asal koneksi

YANG TERDETEKSI:
• Port scan: banyak koneksi ke port berbeda dari satu IP
• C2 (Command & Control): koneksi ke domain/IP berbahaya yang diketahui
• Data exfiltration: upload data besar ke IP eksternal tidak dikenal
• Brute force: banyak gagal login dari satu IP

DNS LOGGING:
• Semua query DNS dicatat
• Blocked: domain berbahaya diblokir sebelum koneksi terjadi
• DGA detection: domain yang terlihat seperti dibuat algoritma (malware signature)

ACTIONS:
• Block IP: langsung masukkan ke firewall
• Whitelist: tandai sebagai trusted
• Rate limit: batasi kecepatan koneksi
• Kill connection: putus koneksi aktif`,
    anim:"network_monitor" },
  { icon:"🔒", title:"DNS Monitor", color:"#0891b2",
    short:"DNS tunneling, poisoning prevention, malicious domain blocking, DGA detection",
    detail:`DNS Monitor adalah lapisan pertahanan di level resolusi nama domain.

FITUR UTAMA:
• DNS Query Log: Semua query DNS dari semua proses di server
• Real-time blocking: Query ke domain berbahaya diblokir sebelum koneksi dibuat
• Response validation: Cek apakah respons DNS telah dipalsukan (DNS poisoning)

ANCAMAN YANG DIBLOKIR:
• Malware C2 domains: Domain yang digunakan malware untuk komunikasi
• Phishing domains: Domain yang meniru situs legitimate
• DGA domains: Domain yang dibuat secara algoritmik oleh malware

DNS TUNNELING DETECTION:
DNS tunneling adalah teknik attacker menggunakan DNS query untuk exfiltrate data.
Guardian mendeteksi ini dengan: panjang subdomain tidak normal, frekuensi query tinggi, entropy tinggi dalam nama subdomain.

ALLOWLIST & BLOCKLIST:
• Custom blocklist: tambah domain spesifik yang ingin diblokir
• Allowlist: domain yang selalu diizinkan walau ada di threat list
• Category blocking: blokir kategori (malware, phishing, ads)`,
    anim:"dns_monitor" },
  { icon:"🦠", title:"Quarantine", color:"#dc2626",
    short:"File berbahaya diisolasi, bisa di-restore jika false positive, retensi forensik",
    detail:`Quarantine adalah storage terpisah dan terisolasi untuk file berbahaya yang ditemukan.

CARA KERJA:
1. File berbahaya di-copy ke /guardian/quarantine (path terpisah, tidak bisa dieksekusi)
2. File asli dihapus atau digantikan dengan placeholder
3. Guardian menyimpan metadata: hash, path asli, alasan karantina, timestamp

YANG BISA DILAKUKAN:
• View Details: lihat informasi lengkap tentang file
  - Hash SHA-256
  - Threat type yang terdeteksi
  - Layer mana yang mendeteksi (1-7)
  - Path asli file
• Restore: kembalikan file ke lokasi asli (jika false positive)
  - Otomatis menambah ke whitelist
• Delete Permanently: hapus file dari quarantine
• Re-analyze: scan ulang dengan signature terbaru
• Download for Analysis: download ke mesin analisis (dalam format encrypted)

RETENSI: File di quarantine disimpan selama 90 hari (default) sebelum dihapus otomatis.

FALSE POSITIVE MANAGEMENT:
Jika file aplikasi Anda terdeteksi sebagai ancaman:
1. Klik file di quarantine
2. Klik Restore
3. Guardian otomatis menambah ke whitelist
4. File tidak akan di-scan lagi`,
    anim:"quarantine" },
  { icon:"⚡", title:"Incident Response", color:"#f59e0b",
    short:"Auto workflow: Kill → Block → Quarantine → Alert → Forensic report. Under 30 seconds",
    detail:`Incident Response adalah automated workflow yang berjalan ketika ancaman kritis terdeteksi.

AUTOMATED WORKFLOW (dalam urutan):
1. Kill process: Proses berbahaya dihentikan seketika
2. Block IP: IP sumber diblokir di firewall
3. Quarantine file: File berbahaya diisolasi
4. Alert admin: Notifikasi dikirim via email/Slack/Discord/PagerDuty
5. Forensic report: Laporan detail otomatis dibuat

WAKTU TOTAL: Under 30 seconds dari deteksi ke resolusi

KONFIGURASI WORKFLOW:
• Pilih step mana yang aktif (bisa non-aktifkan beberapa)
• Set threshold: severity berapa yang trigger automated response
• Approval mode: beberapa step minta konfirmasi admin dulu
• Escalation: jika admin tidak response dalam X menit, eskalasi ke level berikutnya

FORENSIC REPORT BERISI:
• Timeline lengkap serangan
• Semua proses, file, dan koneksi yang terlibat
• Screenshots status sistem saat insiden
• Rekomendasi remediation
• Format: PDF + JSON untuk SIEM integration

MANUAL INCIDENT:
Bisa juga buat incident manual jika menemukan sesuatu yang mencurigakan secara manual.`,
    anim:"incident_response" },
  { icon:"🖥️", title:"Node Management", color:"#0284c7",
    short:"Multi-server dashboard. Deploy guardian-node di setiap server. License tier = max nodes",
    detail:`Node Management adalah dashboard untuk mengelola semua server yang dilindungi Guardian.

CARA KERJA MULTI-NODE:
• 1 Guardian Core = otak pusat (database, API, dashboard)
• N Guardian Nodes = agent ringan di setiap server yang ingin dilindungi
• Node kirim data scan ke Core setiap interval yang dikonfigurasi

YANG DITAMPILKAN PER NODE:
• Name: nama server (bisa di-rename)
• IP Address
• OS & Version
• Status: Online/Offline/Degraded
• Last Heartbeat: kapan terakhir node melapor ke core
• Threat Count: total ancaman yang ditemukan di node ini
• Scan Coverage: berapa % filesystem yang di-cover

DEPLOY NODE BARU:
1. Di server baru, jalankan docker yang sama (guardian-engine:latest)
2. Set env: GUARDIAN_CORE_URL=http://CORE_IP:8080
3. Set env: GUARDIAN_DB_URL=... (sama dengan core)
4. Node otomatis mendaftar ke Core dalam 60 detik

LICENSE LIMITS:
• Sentinel: 1 node
• Pro: 20 nodes
• Business: 100 nodes
• Enterprise: 1,000 nodes

ACTIONS:
• Restart Node: restart guardian agent di server tersebut
• Force Scan: jalankan full scan sekarang
• Deregister: hapus node dari dashboard`,
    anim:"node_management" },
  { icon:"📋", title:"Compliance Reports", color:"#16a34a",
    short:"One-click: SOC2, ISO27001, HIPAA, PCI-DSS, GDPR reports — siap untuk audit",
    detail:`Compliance Reports generate laporan kepatuhan standar industri secara otomatis.

STANDAR YANG DIDUKUNG:
• SOC 2 Type II
• ISO 27001
• HIPAA
• PCI-DSS
• GDPR

KONTEN SETIAP LAPORAN:
• Access log: siapa mengakses apa dan kapan
• Incident history: semua insiden keamanan dan penanganannya
• Scan results: hasil semua scan dalam periode
• File integrity baselines: perubahan file yang terdokumentasi
• Network activity summary
• Remediation actions yang telah diambil

FORMAT OUTPUT:
• PDF: untuk kirim ke auditor
• JSON/CSV: untuk SIEM atau tool analitik
• API: pull data laporan via API

PERIODE LAPORAN:
• Pilih rentang tanggal custom
• Preset: 30 hari, 90 hari, 1 tahun
• Scheduled: generate otomatis bulanan/tahunan

CATATAN: Laporan ini menyediakan data teknis untuk kepatuhan. Untuk sertifikasi resmi, tetap perlu auditor tersertifikasi.`,
    anim:"compliance" },
  { icon:"🤖", title:"AI Analyst Chat", color:"#7c3aed",
    short:"BYOK AI assistant: tanya 'Apa yang terjadi jam 3 pagi?', AI punya konteks keamanan penuh",
    detail:`AI Analyst Chat adalah asisten AI yang memiliki akses penuh ke data keamanan server Anda.

CARA KERJA BYOK:
• Guardian TIDAK mengirim data ke server AXTO
• AI key milik Anda (yang Anda isi di guardian.yml) digunakan langsung
• Data keamanan diproses di server Anda sendiri
• Privasi total: tidak ada cloud processing pihak ketiga

CONTOH PERTANYAAN:
• "Apa yang terjadi jam 3 pagi?"
• "Tunjukkan semua SSH login gagal minggu ini"
• "Apakah ada malware baru yang terdeteksi?"
• "Buat ringkasan insiden bulan ini untuk laporan eksekutif"
• "File mana yang paling sering dimodifikasi?"
• "Analisis pola serangan dari IP ini"

KONTEKS YANG DIMILIKI AI:
• Semua log keamanan (real-time dan historis)
• Semua hasil scan
• Semua incident report
• Network activity
• File changes

PROVIDER YANG DIDUKUNG:
• OpenAI GPT-4o/4o-mini
• Anthropic Claude
• Google Gemini
• Groq (lebih cepat, lebih murah)
• Ollama (lokal, 100% offline)`,
    anim:"ai_chat" },
  { icon:"⚙️", title:"Settings", color:"#475569",
    short:"Scan intervals, alert channels, AI keys, mTLS, log retention, access control",
    detail:`Settings adalah pusat konfigurasi semua aspek Guardian AI.

SCAN SETTINGS:
• Scan interval: seberapa sering scan otomatis berjalan (default: 5 menit)
• Scan paths: direktori yang dipindai (tambah/hapus)
• Exclusion list: file/folder yang tidak perlu di-scan
• Scan mode: quick/full/custom

ALERT CHANNELS:
• Email: alamat email untuk notifikasi
• Slack webhook: notifikasi ke channel Slack
• Discord webhook: notifikasi ke channel Discord
• PagerDuty: integration untuk on-call escalation
• Custom webhook: HTTP endpoint apapun

AI CONFIGURATION (BYOK):
• Provider: pilih OpenAI/Claude/Gemini/Groq/Ollama
• API key: masukkan key Anda (tersimpan terenkripsi di server Anda)
• Model: pilih model yang digunakan untuk AI Analyst
• Fallback: provider cadangan jika primary gagal

SECURITY SETTINGS:
• mTLS: mutual TLS untuk komunikasi node ↔ core
• API token rotation: ganti token secara periodik
• Access control: siapa yang bisa akses dashboard
• 2FA: wajibkan 2FA untuk login dashboard

LOG RETENTION:
• Default: 90 hari
• Hapus otomatis log lama
• Export sebelum delete`,
    anim:"guardian_settings" },
];

// ─── Orchestra menus ────────────────────────────────────────────────────────
const ORCHESTRA_MENUS = [
  { icon:"📊", title:"Console Dashboard", color:"#0d9488",
    short:"Active workers, queue depth, requests/min, cost today, provider health, P50/P95 latency",
    detail:`Console Dashboard adalah command center untuk AI workload orchestration Anda.

AKSES: http://YOUR_SERVER:8080/console (login dengan console_password dari orchestra.yml)

METRICS REAL-TIME:
• Active Workers: berapa CPU+GPU worker yang sedang berjalan
• Queue Depth: berapa request yang menunggu diproses
• Requests/min: throughput saat ini
• Cost Today: total biaya API AI hari ini (USD)
• Provider Health: status semua provider yang dikonfigurasi
• Latency P50/P95: median dan 95th percentile response time

CHARTS:
• Request volume (24 jam)
• Cost per provider (perbandingan)
• Queue depth trend
• Worker utilization

STATUS INDICATORS:
• 🟢 Semua worker aktif dan sehat
• 🟡 Degraded: beberapa worker offline atau queue tinggi
• 🔴 Critical: semua worker offline atau budget exceeded

QUICK ACTIONS:
• Scale up workers: tambah worker CPU dengan satu klik
• Pause queue: hentikan pemrosesan sementara
• Clear queue: hapus semua pending requests
• Export metrics: download CSV`,
    anim:"orchestra_dashboard" },
  { icon:"🔌", title:"AI Providers", color:"#0284c7",
    short:"OpenAI, Claude, Gemini, Groq, DeepSeek, Ollama, any OpenAI-compatible API",
    detail:`AI Providers adalah konfigurasi semua AI provider yang digunakan Orchestra untuk routing.

PROVIDER YANG DIDUKUNG:
• OpenAI: GPT-4o, GPT-4o-mini, o1, dll
• Anthropic Claude: Claude 3.5 Sonnet, Haiku, Opus
• Google Gemini: Gemini 1.5 Pro, Flash
• Groq: Llama, Mixtral (sangat cepat)
• DeepSeek: DeepSeek V2, R1 (sangat murah)
• Mistral AI: Mistral Large, Small
• Ollama: model lokal di GPU Anda (gratis!)
• Any OpenAI-compatible: custom endpoint apapun

INFO PER PROVIDER:
• Status: Online/Offline/Degraded
• Latency saat ini: ms
• Cost/1K tokens: harga per request
• Error rate: % request yang gagal
• Rate limit: sisa quota API

KONFIGURASI:
• Tambah provider baru: masukkan API key + base URL
• Non-aktifkan provider sementara: tanpa menghapus konfigurasi
• Set priority: provider mana yang diprioritaskan dalam routing
• Cost cap per provider: stop otomatis jika biaya provider ini melebihi limit

BYOK PRINCIPLE: Semua API key disimpan di server Anda. Orchestra tidak pernah melihat key Anda.`,
    anim:"ai_providers" },
  { icon:"🎯", title:"Routing Strategies", color:"#7c3aed",
    short:"6 mode: cost_first, quality_first, smart_balance, round_robin, local_first, failover",
    detail:`Routing Strategies menentukan bagaimana Orchestra memilih provider untuk setiap request.

6 MODE ROUTING:

1. COST FIRST (default):
   → Selalu pilih provider termurah yang sedang online
   → Bagus untuk: batch processing, non-urgent tasks
   → Contoh: DeepSeek sering jadi pilihan utama (sangat murah)

2. QUALITY FIRST:
   → Pilih provider dengan model terbaik (GPT-4o atau Claude Opus)
   → Bagus untuk: tugas kritis yang butuh hasil terbaik
   → Lebih mahal tapi hasil lebih baik

3. SMART BALANCE (recommended):
   → Scoring: cost × quality × latency
   → Orchestra menghitung nilai terbaik secara otomatis
   → Adaptif berdasarkan performa real-time

4. ROUND ROBIN:
   → Rotasi merata ke semua provider aktif
   → Bagus untuk: rate limit management
   → Semua provider dapat beban yang sama

5. LOCAL FIRST:
   → Prioritaskan GPU lokal (Ollama) dulu
   → Fallback ke cloud jika GPU penuh/offline
   → Gratis untuk semua request yang bisa dihandle GPU

6. FAILOVER:
   → Primary provider → jika gagal → secondary → tertiary
   → Bagus untuk: high availability, tidak mau ada downtime
   → Set urutan failover secara manual

ROUTING PER REQUEST:
Bisa override routing per request dengan header X-Orchestra-Routing`,
    anim:"routing" },
  { icon:"💻", title:"Workers (CPU)", color:"#2563eb",
    short:"Cloud API workers — config: provider, model, concurrency. Auto-scale on queue depth",
    detail:`CPU Workers adalah proses yang menangani request ke cloud AI provider (OpenAI, Claude, dll).

CARA KERJA:
• Setiap CPU worker = satu koneksi concurrent ke provider
• Worker mengambil job dari queue, kirim ke provider, kembalikan hasil
• Multiple workers bisa berjalan paralel untuk throughput tinggi

KONFIGURASI PER WORKER:
• Provider: OpenAI / Claude / Gemini / Groq / dll
• Model: model spesifik yang digunakan (gpt-4o-mini, claude-haiku, dll)
• Concurrency: berapa request paralel per worker (default: 5)
• Rate limit: maksimum request/menit ke provider ini

DEPLOY WORKER BARU:
Di docker-compose.yml, duplikat service worker-cpu:
  worker-cpu-2:
    image: ghcr.io/{process.env.NEXT_PUBLIC_GHCR_OWNER||"p2nshooter"}/orchestra-worker-cpu:latest
    environment:
      - WORKER_PROVIDER=groq  # provider berbeda
      - WORKER_CONCURRENCY=10

MONITORING:
• Worker health: Online/Offline/Error
• Request count: total request yang diproses
• Error rate: % yang gagal
• Current queue assignment: job mana yang sedang diproses

AUTOSCALER:
Jika queue depth > threshold, autoscaler menambah worker otomatis (perlu dikonfigurasi di Settings)`,
    anim:"cpu_workers" },
  { icon:"🎮", title:"Workers (GPU)", color:"#7c3aed",
    short:"Local inference via Ollama/vLLM. NVIDIA GPU + nvidia-docker. WORKER_IDLE_SHUTDOWN",
    detail:`GPU Workers menjalankan inferensi model lokal menggunakan GPU Anda sendiri — gratis, privat, offline.

KEBUTUHAN:
• NVIDIA GPU (minimal 8GB VRAM untuk Llama-3 8B)
• nvidia-docker (NVIDIA Container Toolkit) terinstall
• Docker dengan runtime: nvidia

CARA KERJA:
• GPU Worker menggunakan Ollama atau vLLM untuk inferensi lokal
• Model LLM berjalan sepenuhnya di server Anda
• Zero cost per token — hanya bayar listrik
• 100% private — data tidak keluar dari server

MODEL YANG BISA DIJALANKAN:
• Llama 3.2 (1B, 3B, 8B, 70B)
• Mistral 7B
• Gemma 2 (9B, 27B)
• DeepSeek R1 (lokal)
• Qwen 2.5
• Dan ratusan model dari Ollama hub

KONFIGURASI docker-compose.yml:
  worker-gpu:
    runtime: nvidia
    environment:
      - WORKER_MODEL=llama3.2  (nama model di Ollama)
      - OLLAMA_BASE_URL=http://localhost:11434
      - WORKER_IDLE_SHUTDOWN=300  (mati otomatis setelah 5 menit idle)

WORKER_IDLE_SHUTDOWN:
• 0 = worker selalu menyala (konsumsi GPU terus)
• 300 = mati otomatis setelah 5 menit tidak ada request (hemat listrik)
• Worker restart otomatis ketika ada request baru`,
    anim:"gpu_workers" },
  { icon:"📋", title:"Job Queue", color:"#f97316",
    short:"Priority tiers: urgent/normal/batch. Retry, timeout, dead letter queue",
    detail:`Job Queue adalah antrian semua request AI yang menunggu diproses.

CARA KERJA:
• Setiap request yang masuk ke Orchestra masuk ke queue dulu
• Workers mengambil job dari queue sesuai prioritas
• Jika semua worker sibuk, request menunggu di queue (tidak di-reject)

PRIORITY TIERS:
• URGENT: proses pertama, skip antrian (untuk request real-time user)
• NORMAL (default): antrian FIFO biasa
• BATCH: proses terakhir, setelah urgent dan normal selesai

CARA SET PRIORITY:
Request header: X-Orchestra-Priority: urgent | normal | batch

RETRY POLICY:
• Max retries: berapa kali retry jika gagal (default: 3)
• Retry delay: tunggu berapa detik sebelum retry
• Jika semua retry gagal: masuk Dead Letter Queue

TIMEOUT:
• Request timeout: berapa lama tunggu respons provider
• Queue timeout: hapus job jika terlalu lama di queue

DEAD LETTER QUEUE (DLQ):
• Job yang gagal setelah semua retry masuk DLQ
• Review DLQ di dashboard
• Bisa retry manual atau hapus

MONITORING:
• Queue depth: berapa job menunggu sekarang
• Average wait time: rata-rata lama menunggu
• Processing time: rata-rata lama diproses
• DLQ size: berapa job yang gagal`,
    anim:"job_queue" },
  { icon:"💰", title:"Cost Analytics", color:"#16a34a",
    short:"Per provider/model/day: tokens, cost USD, latency. CSV export. Daily budget cap",
    detail:`Cost Analytics memberikan visibilitas penuh atas biaya AI yang dikeluarkan.

BREAKDOWN BIAYA:
• Per provider: OpenAI vs Claude vs Gemini vs Groq
• Per model: gpt-4o vs gpt-4o-mini vs claude-haiku
• Per hari/minggu/bulan
• Per aplikasi (jika pakai multiple app dengan API key berbeda)

METRICS PER ROW:
• Tokens input/output
• Biaya USD (perhitungan akurat per pricing provider)
• Request count
• Average latency
• Error rate

GRAFIK:
• Cost over time: trend pengeluaran
• Provider comparison: pie chart biaya per provider
• Model efficiency: cost per output token
• Saving opportunities: berapa yang bisa dihemat dengan routing lebih baik

DAILY BUDGET CAP:
Di orchestra.yml:
  budget:
    daily_limit_usd: 50    # hard stop di $50/hari
    alert_at_percent: 80   # alert di $40 (80%)

Ketika limit tercapai: Orchestra reject request baru sampai hari berikutnya (midnight UTC)

EXPORT:
• CSV: download data untuk analitik sendiri
• JSON API: pull data cost via API untuk integrasi billing internal`,
    anim:"cost_analytics" },
  { icon:"📈", title:"Autoscaler", color:"#0891b2",
    short:"Auto-scale workers berdasarkan queue depth, max workers, scale-down delay",
    detail:`Autoscaler secara otomatis menambah dan mengurangi workers berdasarkan beban.

CARA KERJA:
• Monitor queue depth setiap 10 detik
• Jika queue > threshold: tambah worker baru
• Jika queue kosong > delay: hapus worker idle (hemat resource/cost)

KONFIGURASI (orchestra.yml):
  autoscaler:
    enabled: true
    threshold: 20        # tambah worker jika queue > 20 job
    max_cpu_workers: 10  # maksimum 10 CPU workers sekaligus
    max_gpu_workers: 4   # maksimum 4 GPU workers
    scale_down_delay_seconds: 300  # tunggu 5 menit sebelum scale down

SCALE UP EVENT:
• Queue depth melewati threshold
• Orchestra spawn worker baru dari docker image yang sama
• Worker baru join pool dalam 30-60 detik

SCALE DOWN EVENT:
• Queue kosong selama lebih dari delay yang dikonfigurasi
• Worker di-stop secara graceful (selesaikan job yang sedang berjalan dulu)
• GPU workers bisa pakai WORKER_IDLE_SHUTDOWN yang lebih agresif

LOG AUTOSCALER:
Semua scale up/down events tercatat di log untuk audit dan debugging

MANUAL OVERRIDE:
• Dashboard: tombol "Add Worker" dan "Remove Worker"
• Scale up darurat jika banyak request masuk tiba-tiba`,
    anim:"autoscaler" },
  { icon:"🔗", title:"API Endpoint", color:"#0284c7",
    short:"OpenAI-compatible endpoint. Drop-in replacement. Streaming, tools, multimodal support",
    detail:`API Endpoint Orchestra adalah drop-in replacement untuk OpenAI API.

BASE URL: http://YOUR_SERVER:8080/v1

ENDPOINTS YANG TERSEDIA:
• POST /v1/chat/completions (utama)
• POST /v1/completions (legacy)
• GET /v1/models
• POST /v1/embeddings

CARA INTEGRASI (ganti base_url saja):

Python OpenAI SDK:
  client = OpenAI(
      base_url="http://YOUR_SERVER:8080/v1",
      api_key="YOUR_WORKER_TOKEN"
  )

Node.js:
  const openai = new OpenAI({
      baseURL: "http://YOUR_SERVER:8080/v1",
      apiKey: "YOUR_WORKER_TOKEN"
  });

Curl:
  curl http://YOUR_SERVER:8080/v1/chat/completions \\
    -H "Authorization: Bearer YOUR_WORKER_TOKEN" \\
    -d '{"model":"auto","messages":[{"role":"user","content":"Hello"}]}'

MODEL SPECIAL:
• "auto": Orchestra pilih provider terbaik (default)
• "groq/llama-3.1-8b": request langsung ke Groq dengan model spesifik
• "local/llama3.2": request ke GPU lokal

FEATURES:
• Streaming: Server-Sent Events (SSE)
• Function calling / tools
• Multimodal (vision) jika provider mendukung
• Retry otomatis jika provider gagal`,
    anim:"api_endpoint" },
  { icon:"🔔", title:"Webhooks", color:"#f59e0b",
    short:"Events: job_completed, job_failed, worker_offline, budget_80%, budget_exceeded",
    detail:`Webhooks mengirim notifikasi ke sistem Anda ketika event penting terjadi.

EVENTS YANG TERSEDIA:
• job_completed: setiap request selesai diproses
• job_failed: request gagal setelah semua retry
• worker_offline: worker tidak merespons
• budget_80%: penggunaan mencapai 80% dari daily limit
• budget_exceeded: daily budget limit tercapai
• autoscaler_scale_up: worker baru ditambahkan
• autoscaler_scale_down: worker dihapus

FORMAT PAYLOAD (JSON):
  {
    "event": "job_failed",
    "timestamp": "2025-01-15T10:30:00Z",
    "job_id": "abc123",
    "provider": "openai",
    "error": "rate_limit_exceeded",
    "retries": 3
  }

KONFIGURASI:
Di orchestra.yml atau via Settings UI:
  webhooks:
    - url: "https://your-server.com/webhook"
      events: ["job_failed", "worker_offline", "budget_exceeded"]
      secret: "YOUR_WEBHOOK_SECRET"  # untuk validasi HMAC

VALIDASI WEBHOOK:
Header X-Orchestra-Signature berisi HMAC-SHA256 signature.
Validasi di endpoint Anda untuk keamanan.

USE CASES:
• Slack/Discord notification saat worker down
• Auto-billing alert saat budget hampir habis
• Log failed jobs ke sistem monitoring Anda (Datadog, Grafana, dll)`,
    anim:"webhooks" },
  { icon:"⚙️", title:"Settings", color:"#475569",
    short:"License key, AI keys BYOK, worker tokens, console password, autoscaler, budget, CORS",
    detail:`Settings adalah pusat konfigurasi Orchestra AI — semua bisa diubah tanpa restart.

LICENSE:
• Tampilkan license key yang aktif
• Status: aktif/expired/invalid
• Tanggal expiry
• Tombol refresh validasi

AI KEYS (BYOK):
• Tambah, ubah, hapus API key provider
• Key tersimpan terenkripsi di database lokal
• TIDAK pernah dikirim ke AXTO atau pihak ketiga

SECURITY:
• Console password: password untuk akses /console dashboard
• Worker token: token yang dipakai workers untuk autentikasi ke core
• Rotate tokens: ganti token secara periodik untuk keamanan
• CORS origins: domain yang boleh akses API endpoint

AUTOSCALER CONFIG:
• Enable/disable autoscaler
• Threshold, max workers, scale-down delay (lihat section Autoscaler)

BUDGET:
• Daily limit USD: 0 = tidak ada limit
• Alert threshold: persen dari limit untuk trigger alert
• Reset timezone: UTC (default) atau timezone lokal

LOG SETTINGS:
• Log retention: berapa hari log disimpan (default: 90)
• Log level: info/warn/error
• Export logs: download semua log sebagai CSV

CORS:
• Allowed origins: domain yang boleh call API dari browser
• * = allow semua (tidak aman untuk production)
• Spesifikkan: https://yourapp.com`,
    anim:"orchestra_settings" },
];

// ─── Antivirus menus ────────────────────────────────────────────────────────
const ANTIVIRUS_SECTIONS = [
  { icon:"🦠", title:"ClamAV Engine", color:"#dc2626",
    short:"ClamAV terintegrasi dalam Guardian. Signature DB auto-update tiap 6 jam",
    detail:`Guardian menggunakan ClamAV sebagai antivirus engine yang terintegrasi penuh.

CARA KERJA:
• ClamAV berjalan di dalam container guardian-engine (tidak perlu install terpisah)
• Signature database (virus definitions) diupdate otomatis setiap 6 jam via freshclam
• Bekerja bersama 7-layer scanner Guardian untuk deteksi komprehensif

ENABLE DI guardian.yml:
  scanner:
    antivirus:
      enabled: true
      engine: clamav
      update_interval: 21600  # 6 jam dalam detik

STATUS DASHBOARD:
• Engine version: versi ClamAV yang berjalan
• Signature count: jumlah signature malware yang diketahui (biasanya 8+ juta)
• Last update: kapan terakhir signature diupdate
• Scan rate: file per detik yang bisa diproses

COVERAGE:
• Executable files (.exe, .dll, .so, .bin)
• Documents (.pdf, .docx, .xlsx) — untuk macro malware
• Scripts (.php, .py, .sh, .ps1)
• Archives (.zip, .tar, .gz) — scan isi archive
• Email attachments

KETERBATASAN:
ClamAV sangat baik untuk known malware (signature-based).
Untuk zero-day dan advanced threats: Guardian AI Deep Scan (Layer 6) dan Behavioral Analysis (Layer 7) melengkapi ClamAV.`,
    anim:"clamav" },
  { icon:"📡", title:"Real-time Scan (On-Access)", color:"#f97316",
    short:"Scan otomatis setiap file yang dibuat/dimodifikasi — tanpa menunggu schedule",
    detail:`On-Access Scanning adalah mode scan real-time yang memeriksa setiap file yang dibuat atau dimodifikasi.

CARA KERJA:
• Guardian menggunakan Linux inotify/fanotify untuk monitor perubahan filesystem
• Setiap file baru atau yang dimodifikasi langsung di-scan sebelum bisa dieksekusi
• Latency: < 100ms untuk file kecil, < 2 detik untuk file besar

KONFIGURASI:
  scanner:
    real_time:
      enabled: true
      paths:
        - /var/www          # web server files
        - /home             # user home directories
        - /tmp              # temporary files (sering dipakai malware)
        - /opt              # aplikasi pihak ketiga
      exclude_paths:
        - /proc
        - /sys
        - /dev

NOTIFICATIONS:
Ketika file berbahaya terdeteksi:
1. File otomatis di-quarantine
2. Alert dikirim via Incident Response workflow
3. Log entry dibuat dengan detail lengkap

PERFORMANCE IMPACT:
• CPU overhead: ~2-5% tergantung kecepatan write ke disk
• Memory: ClamAV engine membutuhkan ~500MB RAM
• Rekomendasi: aktifkan untuk /var/www dan /tmp minimal`,
    anim:"realtime_scan" },
  { icon:"📅", title:"Scheduled Scan", color:"#0891b2",
    short:"Scan penuh terjadwal: harian/mingguan. Lebih dalam dari real-time scan",
    detail:`Scheduled Scan adalah scan penuh terjadwal yang lebih komprehensif dari on-access scan.

PERBEDAAN DENGAN REAL-TIME SCAN:
• On-access: scan file baru/berubah saja (cepat, lightweight)
• Scheduled: scan SEMUA file di path yang dikonfigurasi (menyeluruh)

KONFIGURASI:
  scanner:
    schedule:
      full_scan:
        enabled: true
        cron: "0 2 * * *"    # Setiap hari jam 2 pagi
        paths: ["/", "/var", "/home"]
      quick_scan:
        enabled: true
        cron: "0 */6 * * *"  # Setiap 6 jam
        paths: ["/tmp", "/var/www"]

SCAN REPORT:
Setelah scan selesai:
• Total file yang di-scan
• Ancaman yang ditemukan (jika ada)
• Waktu yang dibutuhkan
• File yang diskip (permission/error)
• Laporan dikirim ke alert channels yang dikonfigurasi

MANUAL TRIGGER:
Di dashboard: Threat Scanner → Scan Now
Atau via API:
  curl http://localhost:8080/api/scan/start \\
    -H "Authorization: Bearer TOKEN" \\
    -d '{"path":"/var/www","type":"full"}'`,
    anim:"scheduled_scan" },
  { icon:"🔄", title:"Signature Update", color:"#16a34a",
    short:"Auto-update virus signatures tiap 6 jam via freshclam. Manual update tersedia",
    detail:`Signature Update menjaga database virus definitions Guardian selalu terkini.

PROSES UPDATE OTOMATIS:
• freshclam daemon berjalan di background
• Check server ClamAV untuk update baru setiap 6 jam
• Download hanya delta/diff (bukan full database)
• Database diupdate tanpa restart scanner

STATUS DI DASHBOARD:
• Current signature count: jumlah signature saat ini
• Last update: kapan terakhir update berhasil
• Next update: jadwal update berikutnya
• Database version: versi database ClamAV

MANUAL UPDATE:
Di dashboard: Settings → Antivirus → Update Now
Atau via API:
  POST /api/antivirus/update

KONFIGURASI UPDATE INTERVAL:
  scanner:
    antivirus:
      update_interval: 21600  # 6 jam (default)
      # Ubah ke 3600 (1 jam) untuk high-risk environment
      # Ubah ke 86400 (24 jam) untuk low-bandwidth server

OFFLINE UPDATE:
Jika server tidak ada internet:
1. Download database dari mesin lain
2. Upload via Guardian API: POST /api/antivirus/upload-db
3. Guardian verifikasi integritas dan apply

KOMUNITAS: Guardian menggunakan ClamAV community signatures + custom AXTO signatures untuk web shell dan malware baru.`,
    anim:"sig_update" },
  { icon:"🚫", title:"Quarantine & Remediation", color:"#dc2626",
    short:"File berbahaya diisolasi, analisis ancaman, restore false positive, hapus permanen",
    detail:`Antivirus Quarantine terintegrasi dengan Quarantine utama Guardian — semua file berbahaya masuk ke satu tempat.

ALUR KETIKA ANCAMAN DITEMUKAN:
1. ClamAV / Guardian deteksi file berbahaya
2. File di-copy ke /guardian/quarantine (path terisolasi)
3. File asli dihapus atau di-zero (kontennya dihapus tapi metadata dipertahankan)
4. Alert dikirim (email/Slack/Discord sesuai konfigurasi)
5. Incident report dibuat otomatis

INFORMASI DI QUARANTINE:
• Nama ancaman (ClamAV signature name): misal "Win.Trojan.Agent-123456"
• Severity: critical/high/medium/low
• File path asli
• Hash SHA-256
• Waktu deteksi
• Detection engine: ClamAV/Guardian Layer/keduanya

TINDAKAN YANG BISA DIAMBIL:

RESTORE (jika false positive):
• Klik file → Restore to Original Location
• Guardian otomatis tambahkan ke whitelist
• File tidak akan di-scan lagi
• Catat alasan restore untuk audit trail

DELETE PERMANENTLY:
• Hapus file secara aman (overwrite dengan zero bytes)
• Tidak bisa di-undo
• Cocok untuk file malware yang sudah dipastikan berbahaya

SUBMIT FOR ANALYSIS:
• Kirim sample ke ClamAV community (anonymous)
• Membantu update signature database global
• Opsional dan tidak wajib

BATCH ACTIONS:
• Pilih multiple file di quarantine
• Delete all / Restore all / Export list`,
    anim:"antivirus_quarantine" },
];

// ─── Animation components ───────────────────────────────────────────────────

function PaymentAnim() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % 5), 1200);
    return () => clearInterval(t);
  }, []);
  const steps = [
    {icon:"🛒", label:"Pilih paket", color:"#0284c7"},
    {icon:"💳", label:"Checkout", color:"#7c3aed"},
    {icon:"✅", label:"Pembayaran berhasil", color:"#16a34a"},
    {icon:"📧", label:"Invoice ke email", color:"#f97316"},
    {icon:"🔑", label:"License key aktif", color:"#0d9488"},
  ];
  return (
    <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",padding:"16px 0"}}>
      {steps.map((s,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{
            width:48,height:48,borderRadius:12,
            background: step>=i ? s.color : "#e2e8f0",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            transition:"all .4s",fontSize:18,
            boxShadow: step===i ? `0 0 16px ${s.color}60` : "none",
            transform: step===i ? "scale(1.15)" : "scale(1)",
          }}>
            <span>{s.icon}</span>
          </div>
          {i<4&&<div style={{width:24,height:2,background:step>i?"#16a34a":"#e2e8f0",transition:"all .4s"}}/>}
        </div>
      ))}
    </div>
  );
}

function DockerAnim() {
  const [line, setLine] = useState(0);
  const lines = [
    "$ docker compose up -d",
    "Pulling guardian-db ... done",
    "Pulling guardian-core ... done",
    "Pulling guardian-node ... done",
    "Creating guardian-db ... done",
    "Creating guardian-core ... done",
    "Creating guardian-node ... done",
    "✓ All containers healthy",
    "✓ Dashboard: http://localhost:8080",
  ];
  useEffect(() => {
    const t = setInterval(() => setLine(l => l < lines.length - 1 ? l + 1 : 0), 600);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{background:"#0a1628",borderRadius:10,padding:"12px 16px",fontFamily:"monospace",fontSize:11}}>
      {lines.slice(0, line + 1).map((l, i) => (
        <div key={i} style={{
          color: l.startsWith("✓") ? "#22c55e" : l.startsWith("$") ? "#22d3ee" : "#94a3b8",
          marginBottom:2, opacity: i < line ? 0.7 : 1,
        }}>{l}</div>
      ))}
      <span style={{color:"#22d3ee",animation:"blink 1s infinite"}}>█</span>
    </div>
  );
}

function ApiAnim() {
  const [active, setActive] = useState(0);
  const flows = [
    {from:"Your App",arrow:"→",via:"Orchestra",arrow2:"→",to:"Groq (cheapest)",cost:"$0.001"},
    {from:"Your App",arrow:"→",via:"Orchestra",arrow2:"→",to:"Ollama (GPU)",cost:"$0.000"},
    {from:"Your App",arrow:"→",via:"Orchestra",arrow2:"→",to:"OpenAI",cost:"$0.012"},
    {from:"Your App",arrow:"→",via:"Orchestra",arrow2:"→",to:"DeepSeek",cost:"$0.0005"},
  ];
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % flows.length), 1400);
    return () => clearInterval(t);
  }, []);
  const f = flows[active];
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"12px 0",fontSize:12}}>
      <div style={{padding:"6px 12px",borderRadius:8,background:"rgba(2,132,199,0.1)",border:"1px solid rgba(2,132,199,0.3)",color:"#0284c7",fontWeight:700}}>{f.from}</div>
      <span style={{color:"#94a3b8",fontSize:16}}>→</span>
      <div style={{padding:"6px 12px",borderRadius:8,background:"rgba(13,148,136,0.15)",border:"1px solid rgba(13,148,136,0.4)",color:"#0d9488",fontWeight:700}}>
        🎵 {f.via}
      </div>
      <span style={{color:"#94a3b8",fontSize:16}}>→</span>
      <div style={{padding:"6px 12px",borderRadius:8,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#16a34a",fontWeight:700,minWidth:120,textAlign:"center"}}>
        {f.to}
        <div style={{fontSize:10,color:"#94a3b8"}}>{f.cost}/1K tokens</div>
      </div>
    </div>
  );
}

function ThreatAnim() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase(p => (p + 1) % 6), 800);
    return () => clearInterval(t);
  }, []);
  const stages = [
    {icon:"🔴", text:"Threat detected", color:"#ef4444"},
    {icon:"⚙️", text:"Layer 6 AI scan...", color:"#f97316"},
    {icon:"🚫", text:"Process killed", color:"#dc2626"},
    {icon:"🛡️", text:"IP blocked", color:"#0284c7"},
    {icon:"🗄️", text:"File quarantined", color:"#7c3aed"},
    {icon:"✅", text:"System clean", color:"#16a34a"},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4,padding:"8px 0"}}>
      {stages.map((s,i)=>(
        <div key={i} style={{
          display:"flex",alignItems:"center",gap:8,
          opacity: i <= phase ? 1 : 0.2,
          transition:"opacity .3s",
          fontSize:12,color: i<=phase ? s.color : "#94a3b8"
        }}>
          <span style={{fontSize:14}}>{i<=phase ? s.icon : "○"}</span>
          <span style={{fontWeight: i===phase ? 700 : 400}}>{s.text}</span>
          {i===phase&&<span style={{color:"#22d3ee",fontSize:10,marginLeft:"auto"}}>running...</span>}
          {i<phase&&<span style={{color:"#16a34a",fontSize:10,marginLeft:"auto"}}>done</span>}
        </div>
      ))}
    </div>
  );
}

function RoutingAnim() {
  const [mode, setMode] = useState(0);
  const modes = ["cost_first","quality_first","smart_balance","local_first"];
  const providers = [
    {name:"Groq",cost:0.001,speed:120,color:"#7c3aed"},
    {name:"OpenAI",cost:0.012,speed:320,color:"#10a37f"},
    {name:"Claude",cost:0.015,speed:290,color:"#d97706"},
    {name:"Ollama GPU",cost:0,speed:180,color:"#2563eb"},
  ];
  useEffect(() => {
    const t = setInterval(() => setMode(m => (m + 1) % modes.length), 2000);
    return () => clearInterval(t);
  }, []);
  const selected = modes[mode] === "cost_first" ? 0
    : modes[mode] === "quality_first" ? 1
    : modes[mode] === "local_first" ? 3 : 0;
  return (
    <div>
      <div style={{textAlign:"center",fontSize:12,fontWeight:700,color:"#0d9488",marginBottom:8}}>
        Mode: {modes[mode]}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {providers.map((p,i)=>(
          <div key={i} style={{
            display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,
            background: i===selected ? `${p.color}15` : "transparent",
            border: `1px solid ${i===selected ? p.color+"50" : "#e2e8f0"}`,
            transition:"all .3s",fontSize:12,
          }}>
            <div style={{width:8,height:8,borderRadius:"50%",background:i===selected?p.color:"#cbd5e1",flexShrink:0}}/>
            <span style={{fontWeight:i===selected?700:400,color:i===selected?p.color:"#64748b",flex:1}}>{p.name}</span>
            <span style={{color:"#94a3b8",fontSize:10}}>${p.cost}/1K</span>
            <span style={{color:"#94a3b8",fontSize:10}}>{p.speed}ms</span>
            {i===selected&&<span style={{color:p.color,fontSize:10,fontWeight:700}}>← SELECTED</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function GuidePage() {
  const [section, setSection] = useState<Section>("start");
  const [activeMenu, setActiveMenu] = useState(0);
  const [setupStep, setSetupStep] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const guardianMenu = GUARDIAN_MENUS[activeMenu] || GUARDIAN_MENUS[0];
  const orchestraMenu = ORCHESTRA_MENUS[activeMenu] || ORCHESTRA_MENUS[0];
  const antivirusSection = ANTIVIRUS_SECTIONS[activeMenu] || ANTIVIRUS_SECTIONS[0];

  function scrollTop() {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navTo(s: Section) {
    setSection(s);
    setActiveMenu(0);
    setSetupStep(0);
    scrollTop();
  }

  const NAV = [
    { id:"start" as Section,     icon:"🚀", label:"Setup & Deploy" },
    { id:"guardian" as Section,  icon:"🛡️", label:"Guardian AI" },
    { id:"orchestra" as Section, icon:"⚡", label:"Orchestra AI" },
    { id:"antivirus" as Section, icon:"🦠", label:"Antivirus" },
    { id:"api" as Section,       icon:"🤖", label:"API Integration" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#f0f9ff", display:"flex" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width:220, flexShrink:0, background:"#fff",
        borderRight:"1.5px solid #e2e8f0",
        display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", overflow:"auto"
      }}>
        <div style={{padding:"20px 16px 12px"}}>
          <Link href="/portal" style={{color:"#94a3b8",fontSize:11,textDecoration:"none",display:"block",marginBottom:12}}>← Portal</Link>
          <div style={{fontSize:14,fontWeight:900,color:"#0a1628",letterSpacing:"-0.3px"}}>📖 AXTO Guide</div>
          <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Panduan lengkap penggunaan</div>
        </div>
        <div style={{padding:"0 8px",flex:1}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>navTo(n.id)}
              style={{
                width:"100%",textAlign:"left",padding:"10px 12px",borderRadius:10,border:"none",
                background: section===n.id ? "rgba(2,132,199,.1)" : "transparent",
                color: section===n.id ? "#0284c7" : "#64748b",
                fontWeight: section===n.id ? 700 : 500,
                fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:8,
                marginBottom:2,
              }}>
              <span style={{fontSize:16}}>{n.icon}</span>{n.label}
            </button>
          ))}
        </div>
        <div style={{padding:"12px 16px",borderTop:"1px solid #e2e8f0",fontSize:11,color:"#94a3b8"}}>
          Support: <a href="mailto:hallo@axto.io" style={{color:"#0284c7"}}>hallo@axto.io</a>
        </div>
      </div>

      {/* ── Content ── */}
      <div ref={contentRef} style={{flex:1,overflow:"auto",padding:"28px 32px",maxHeight:"100vh"}}>

        {/* ════ SETUP & DEPLOY ════════════════════════════════════════════════ */}
        {section==="start"&&(
          <div style={{maxWidth:900}}>
            <h1 style={{fontSize:26,fontWeight:900,color:"#0a1628",margin:"0 0 4px",letterSpacing:"-0.5px"}}>
              🚀 Panduan Setup & Deploy
            </h1>
            <p style={{color:"#64748b",fontSize:14,margin:"0 0 28px"}}>
              Dari pembayaran sampai engine berjalan di server Anda — ikuti 6 langkah berikut.
            </p>

            {/* Step selector */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:24}}>
              {SETUP_STEPS.map((s,i)=>(
                <button key={s.id} onClick={()=>setSetupStep(i)}
                  style={{padding:"8px 14px",borderRadius:9,border:"1.5px solid",
                    borderColor:setupStep===i ? s.color : "#e2e8f0",
                    background:setupStep===i ? s.bg : "#fff",
                    color:setupStep===i ? s.color : "#64748b",
                    fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
                  {s.icon} {s.title.split(". ")[1]}
                </button>
              ))}
            </div>

            {/* Active step detail */}
            {(() => {
              const s = SETUP_STEPS[setupStep];
              return (
                <div style={{background:"#fff",borderRadius:16,border:"1.5px solid #e2e8f0",overflow:"hidden"}}>
                  {/* Header */}
                  <div style={{padding:"20px 24px",background:s.bg,borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:52,height:52,borderRadius:14,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:`0 4px 16px ${s.color}40`}}>
                      {s.icon}
                    </div>
                    <div>
                      <div style={{fontWeight:900,fontSize:18,color:"#0a1628"}}>{s.title}</div>
                      <div style={{fontSize:13,color:"#475569",marginTop:2}}>{s.desc}</div>
                    </div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns: s.code ? "1fr 1fr" : "1fr",gap:0}}>
                    {/* Steps */}
                    <div style={{padding:"20px 24px"}}>
                      <div style={{fontWeight:800,fontSize:13,color:"#0a1628",marginBottom:14}}>Langkah-langkah:</div>
                      {s.detail.map((d,i)=>(
                        <div key={i} style={{display:"flex",gap:12,marginBottom:12,alignItems:"flex-start"}}>
                          <div style={{width:24,height:24,borderRadius:7,background:s.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12,flexShrink:0}}>{i+1}</div>
                          <div style={{fontSize:13,color:"#475569",lineHeight:1.6}}>{d}</div>
                        </div>
                      ))}

                      {/* Animation */}
                      <div style={{marginTop:16,padding:"12px 16px",background:"rgba(0,0,0,.02)",borderRadius:12,border:"1px solid #f1f5f9"}}>
                        {setupStep===0&&<PaymentAnim/>}
                        {setupStep===1&&(
                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            {["Login axto.io/portal","Klik tab 'Licenses'","Temukan lisensi aktif","⬇ docker-compose.yml","⬇ Config template"].map((l,i)=>(
                              <div key={i} style={{display:"flex",gap:8,fontSize:12}}>
                                <span style={{color:"#16a34a"}}>✓</span>
                                <span style={{color:"#475569"}}>{l}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {setupStep===2&&(
                          <div style={{background:"#0a1628",borderRadius:8,padding:"10px 14px",fontFamily:"monospace",fontSize:11}}>
                            <div style={{color:"#64748b",marginBottom:6}}># guardian.yml</div>
                            <div style={{color:"#94a3b8"}}>guardian:</div>
                            <div style={{color:"#22d3ee"}}>{"  license_key: \"GUARD-A1B2-C3D4\""}</div>
                            <div style={{color:"#94a3b8"}}>{"  ai_pool:"}</div>
                            <div style={{color:"#94a3b8"}}>{"    providers:"}</div>
                            <div style={{color:"#22c55e"}}>{"      - api_key: \"sk-YOUR_KEY\" ← BYOK"}</div>
                          </div>
                        )}
                        {setupStep===3&&<DockerAnim/>}
                        {setupStep===4&&(
                          <div style={{background:"#0a1628",borderRadius:8,padding:"10px 14px",fontFamily:"monospace",fontSize:11}}>
                            <div style={{color:"#64748b"}}># Linux/macOS</div>
                            <div style={{color:"#22d3ee"}}>chmod +x install.sh</div>
                            <div style={{color:"#22d3ee"}}>./install.sh</div>
                            <div style={{color:"#64748b",marginTop:8}}># Windows</div>
                            <div style={{color:"#22d3ee"}}>{".\\install.bat"}</div>
                            <div style={{color:"#22c55e",marginTop:8}}>✓ Done. Dashboard: http://localhost:8080</div>
                          </div>
                        )}
                        {setupStep===5&&<ApiAnim/>}
                      </div>
                    </div>

                    {/* Code block */}
                    {s.code&&(
                      <div style={{padding:"20px 24px",borderLeft:"1px solid #f1f5f9",background:"#fafbfc"}}>
                        <div style={{fontWeight:800,fontSize:13,color:"#0a1628",marginBottom:12}}>Kode / Command:</div>
                        <pre style={{
                          background:"#0a1628",borderRadius:10,padding:"14px 16px",
                          fontSize:11,color:"#e2e8f0",overflow:"auto",lineHeight:1.8,margin:0,
                          fontFamily:"'JetBrains Mono',monospace",
                        }}>{s.code}</pre>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div style={{padding:"14px 24px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <button onClick={()=>setSetupStep(Math.max(0,setupStep-1))} disabled={setupStep===0}
                      style={{padding:"8px 18px",borderRadius:9,border:"1.5px solid #e2e8f0",background:"#fff",color:"#64748b",fontWeight:600,cursor:"pointer",opacity:setupStep===0?.4:1}}>
                      ← Kembali
                    </button>
                    <span style={{fontSize:12,color:"#94a3b8"}}>Langkah {setupStep+1} dari {SETUP_STEPS.length}</span>
                    {setupStep < SETUP_STEPS.length-1 ? (
                      <button onClick={()=>setSetupStep(setupStep+1)}
                        style={{padding:"8px 18px",borderRadius:9,background:s.color,border:"none",color:"#fff",fontWeight:700,cursor:"pointer"}}>
                        Lanjut →
                      </button>
                    ) : (
                      <button onClick={()=>navTo("guardian")}
                        style={{padding:"8px 18px",borderRadius:9,background:"linear-gradient(135deg,#0284c7,#0d9488)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer"}}>
                        Pelajari Guardian →
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ════ GUARDIAN AI ═══════════════════════════════════════════════════ */}
        {section==="guardian"&&(
          <div style={{maxWidth:960}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#0284c7,#0d9488)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🛡️</div>
              <div>
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0,letterSpacing:"-0.5px"}}>Guardian AI — Panduan Menu Lengkap</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>Klik setiap menu di bawah untuk melihat penjelasan detail dan animasi.</p>
              </div>
            </div>

            {/* Threat animation */}
            <div style={{background:"rgba(239,68,68,.04)",border:"1.5px solid rgba(239,68,68,.15)",borderRadius:14,padding:20,marginBottom:24,marginTop:16}}>
              <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#dc2626",marginBottom:8}}>⚡ Guardian Incident Response — Live View</div>
                  <ThreatAnim/>
                </div>
                <div style={{width:200,flexShrink:0,fontSize:11,color:"#64748b",lineHeight:1.8}}>
                  <div style={{fontWeight:700,color:"#0a1628",marginBottom:4}}>Alur otomatis:</div>
                  <div>Deteksi → Kill process</div>
                  <div>→ Block IP di firewall</div>
                  <div>→ Quarantine file</div>
                  <div>→ Alert admin</div>
                  <div>→ Forensic report</div>
                  <div style={{color:"#dc2626",fontWeight:700,marginTop:4}}>Total: &lt; 30 detik</div>
                </div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:20}}>
              {/* Menu list */}
              <div style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",padding:8,height:"fit-content",position:"sticky",top:20}}>
                <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.5px",padding:"4px 8px",marginBottom:4}}>
                  {GUARDIAN_MENUS.length} Menu
                </div>
                {GUARDIAN_MENUS.map((m,i)=>(
                  <button key={i} onClick={()=>setActiveMenu(i)}
                    style={{
                      width:"100%",textAlign:"left",padding:"9px 10px",borderRadius:9,border:"none",
                      background: activeMenu===i ? m.bg||"rgba(2,132,199,.08)" : "transparent",
                      cursor:"pointer",display:"flex",alignItems:"center",gap:8,marginBottom:2,
                    }}>
                    <span style={{fontSize:16}}>{m.icon}</span>
                    <span style={{fontSize:12,fontWeight:activeMenu===i?700:500,color:activeMenu===i?m.color:"#475569"}}>{m.title}</span>
                  </button>
                ))}
              </div>

              {/* Menu detail */}
              <div style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",overflow:"hidden"}}>
                <div style={{padding:"20px 24px",background:`${guardianMenu.color}10`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:44,height:44,borderRadius:12,background:guardianMenu.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                    {guardianMenu.icon}
                  </div>
                  <div>
                    <div style={{fontWeight:900,fontSize:17,color:"#0a1628"}}>{guardianMenu.title}</div>
                    <div style={{fontSize:12,color:"#64748b"}}>{guardianMenu.short}</div>
                  </div>
                </div>
                <div style={{padding:"20px 24px"}}>
                  <pre style={{
                    margin:0, whiteSpace:"pre-wrap", fontFamily:"inherit", fontSize:13,
                    color:"#334155", lineHeight:1.8,
                  }}>{guardianMenu.detail}</pre>
                </div>

                {/* Navigation */}
                <div style={{padding:"14px 24px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between"}}>
                  <button onClick={()=>setActiveMenu(Math.max(0,activeMenu-1))} disabled={activeMenu===0}
                    style={{padding:"7px 16px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"#fff",color:"#64748b",fontWeight:600,cursor:"pointer",fontSize:13,opacity:activeMenu===0?.4:1}}>
                    ← Menu sebelumnya
                  </button>
                  <span style={{fontSize:12,color:"#94a3b8",alignSelf:"center"}}>{activeMenu+1} / {GUARDIAN_MENUS.length}</span>
                  {activeMenu < GUARDIAN_MENUS.length-1 ? (
                    <button onClick={()=>setActiveMenu(activeMenu+1)}
                      style={{padding:"7px 16px",borderRadius:8,background:guardianMenu.color,border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>
                      Menu berikutnya →
                    </button>
                  ) : (
                    <button onClick={()=>navTo("orchestra")}
                      style={{padding:"7px 16px",borderRadius:8,background:"linear-gradient(135deg,#0d9488,#0284c7)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>
                      Pelajari Orchestra →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ ORCHESTRA AI ══════════════════════════════════════════════════ */}
        {section==="orchestra"&&(
          <div style={{maxWidth:960}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#0d9488,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚡</div>
              <div>
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0,letterSpacing:"-0.5px"}}>Orchestra AI — Panduan Menu Lengkap</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>AI orchestration dengan smart routing ke semua provider. Klik menu untuk detail.</p>
              </div>
            </div>

            {/* Routing animation */}
            <div style={{background:"rgba(13,148,136,.04)",border:"1.5px solid rgba(13,148,136,.15)",borderRadius:14,padding:20,marginBottom:24,marginTop:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                <div>
                  <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:8}}>🎯 Smart Routing — Live View</div>
                  <RoutingAnim/>
                </div>
                <div>
                  <div style={{fontWeight:800,fontSize:13,color:"#0284c7",marginBottom:8}}>📡 API Integration</div>
                  <ApiAnim/>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:8,textAlign:"center"}}>
                    Ganti <code>base_url</code> → Orchestra routing otomatis
                  </div>
                </div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:20}}>
              {/* Menu list */}
              <div style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",padding:8,height:"fit-content",position:"sticky",top:20}}>
                <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.5px",padding:"4px 8px",marginBottom:4}}>
                  {ORCHESTRA_MENUS.length} Menu
                </div>
                {ORCHESTRA_MENUS.map((m,i)=>(
                  <button key={i} onClick={()=>setActiveMenu(i)}
                    style={{
                      width:"100%",textAlign:"left",padding:"9px 10px",borderRadius:9,border:"none",
                      background: activeMenu===i ? `${m.color}15` : "transparent",
                      cursor:"pointer",display:"flex",alignItems:"center",gap:8,marginBottom:2,
                    }}>
                    <span style={{fontSize:16}}>{m.icon}</span>
                    <span style={{fontSize:12,fontWeight:activeMenu===i?700:500,color:activeMenu===i?m.color:"#475569"}}>{m.title}</span>
                  </button>
                ))}
              </div>

              {/* Menu detail */}
              <div style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",overflow:"hidden"}}>
                <div style={{padding:"20px 24px",background:`${orchestraMenu.color}10`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:44,height:44,borderRadius:12,background:orchestraMenu.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                    {orchestraMenu.icon}
                  </div>
                  <div>
                    <div style={{fontWeight:900,fontSize:17,color:"#0a1628"}}>{orchestraMenu.title}</div>
                    <div style={{fontSize:12,color:"#64748b"}}>{orchestraMenu.short}</div>
                  </div>
                </div>
                <div style={{padding:"20px 24px"}}>
                  <pre style={{margin:0,whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:13,color:"#334155",lineHeight:1.8}}>
                    {orchestraMenu.detail}
                  </pre>
                </div>
                <div style={{padding:"14px 24px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between"}}>
                  <button onClick={()=>setActiveMenu(Math.max(0,activeMenu-1))} disabled={activeMenu===0}
                    style={{padding:"7px 16px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"#fff",color:"#64748b",fontWeight:600,cursor:"pointer",fontSize:13,opacity:activeMenu===0?.4:1}}>
                    ← Sebelumnya
                  </button>
                  <span style={{fontSize:12,color:"#94a3b8",alignSelf:"center"}}>{activeMenu+1} / {ORCHESTRA_MENUS.length}</span>
                  {activeMenu < ORCHESTRA_MENUS.length-1 ? (
                    <button onClick={()=>setActiveMenu(activeMenu+1)}
                      style={{padding:"7px 16px",borderRadius:8,background:orchestraMenu.color,border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>
                      Berikutnya →
                    </button>
                  ) : (
                    <button onClick={()=>navTo("antivirus")}
                      style={{padding:"7px 16px",borderRadius:8,background:"linear-gradient(135deg,#dc2626,#f97316)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>
                      Pelajari Antivirus →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ ANTIVIRUS ══════════════════════════════════════════════════════ */}
        {section==="antivirus"&&(
          <div style={{maxWidth:960}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#dc2626,#f97316)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🦠</div>
              <div>
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0,letterSpacing:"-0.5px"}}>Antivirus (ClamAV) — Panduan Lengkap</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>ClamAV terintegrasi penuh dalam Guardian AI. Signature auto-update, scan real-time, karantina otomatis.</p>
              </div>
            </div>

            {/* AV status animation */}
            <div style={{background:"rgba(220,38,38,.04)",border:"1.5px solid rgba(220,38,38,.15)",borderRadius:14,padding:20,marginBottom:24,marginTop:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,textAlign:"center"}}>
                {[
                  {icon:"🔄",label:"Signature DB",value:"8.4M signatures",color:"#16a34a"},
                  {icon:"⏱",label:"Last Update",value:"< 6 jam lalu",color:"#0284c7"},
                  {icon:"📁",label:"Files Scanned Today",value:"Loading...",color:"#7c3aed"},
                ].map((s,i)=>(
                  <div key={i} style={{padding:"14px",background:"rgba(255,255,255,.8)",borderRadius:10,border:"1px solid #f1f5f9"}}>
                    <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
                    <div style={{fontSize:11,color:"#94a3b8"}}>{s.label}</div>
                    <div style={{fontSize:14,fontWeight:700,color:s.color,marginTop:2}}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:14,padding:"10px 14px",background:"rgba(34,197,94,.07)",borderRadius:8,border:"1px solid rgba(34,197,94,.2)",fontSize:12,color:"#16a34a",textAlign:"center"}}>
                ✅ ClamAV aktif dan berjalan di dalam container guardian-engine. Tidak perlu install terpisah.
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:20}}>
              {/* Section list */}
              <div style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",padding:8,height:"fit-content",position:"sticky",top:20}}>
                {ANTIVIRUS_SECTIONS.map((s,i)=>(
                  <button key={i} onClick={()=>setActiveMenu(i)}
                    style={{
                      width:"100%",textAlign:"left",padding:"9px 10px",borderRadius:9,border:"none",
                      background: activeMenu===i ? `${s.color}15` : "transparent",
                      cursor:"pointer",display:"flex",alignItems:"center",gap:8,marginBottom:2,
                    }}>
                    <span style={{fontSize:16}}>{s.icon}</span>
                    <span style={{fontSize:12,fontWeight:activeMenu===i?700:500,color:activeMenu===i?s.color:"#475569"}}>{s.title}</span>
                  </button>
                ))}
              </div>

              {/* Detail */}
              <div style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",overflow:"hidden"}}>
                <div style={{padding:"20px 24px",background:`${antivirusSection.color}10`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:44,height:44,borderRadius:12,background:antivirusSection.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
                    {antivirusSection.icon}
                  </div>
                  <div>
                    <div style={{fontWeight:900,fontSize:17,color:"#0a1628"}}>{antivirusSection.title}</div>
                    <div style={{fontSize:12,color:"#64748b"}}>{antivirusSection.short}</div>
                  </div>
                </div>
                <div style={{padding:"20px 24px"}}>
                  <pre style={{margin:0,whiteSpace:"pre-wrap",fontFamily:"inherit",fontSize:13,color:"#334155",lineHeight:1.8}}>
                    {antivirusSection.detail}
                  </pre>
                </div>
                <div style={{padding:"14px 24px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between"}}>
                  <button onClick={()=>setActiveMenu(Math.max(0,activeMenu-1))} disabled={activeMenu===0}
                    style={{padding:"7px 16px",borderRadius:8,border:"1.5px solid #e2e8f0",background:"#fff",color:"#64748b",fontWeight:600,cursor:"pointer",fontSize:13,opacity:activeMenu===0?.4:1}}>
                    ← Sebelumnya
                  </button>
                  <span style={{fontSize:12,color:"#94a3b8",alignSelf:"center"}}>{activeMenu+1} / {ANTIVIRUS_SECTIONS.length}</span>
                  {activeMenu < ANTIVIRUS_SECTIONS.length-1 ? (
                    <button onClick={()=>setActiveMenu(activeMenu+1)}
                      style={{padding:"7px 16px",borderRadius:8,background:antivirusSection.color,border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>
                      Berikutnya →
                    </button>
                  ) : (
                    <button onClick={()=>navTo("api")}
                      style={{padding:"7px 16px",borderRadius:8,background:"linear-gradient(135deg,#16a34a,#0d9488)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>
                      API Integration →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ API INTEGRATION ═══════════════════════════════════════════════ */}
        {section==="api"&&(
          <div style={{maxWidth:860}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#16a34a,#0d9488)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🤖</div>
              <div>
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0}}>API AI Integration (BYOK)</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>Gunakan API key milik Anda sendiri. Orchestra sebagai proxy pintar — key tidak pernah keluar dari server Anda.</p>
              </div>
            </div>

            {/* BYOK principle */}
            <div style={{background:"rgba(34,197,94,.05)",border:"1.5px solid rgba(34,197,94,.2)",borderRadius:14,padding:20,marginBottom:24}}>
              <div style={{fontWeight:800,fontSize:14,color:"#16a34a",marginBottom:12}}>🔑 Prinsip BYOK (Bring Your Own Key)</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                {[
                  {icon:"✅",title:"Key di server Anda",desc:"API key disimpan terenkripsi di database lokal di server Anda sendiri"},
                  {icon:"🚫",title:"Tidak keluar ke AXTO",desc:"Orchestra memanggil provider langsung dari server Anda — AXTO tidak pernah tahu key Anda"},
                  {icon:"🔐",title:"Enkripsi at-rest",desc:"Key tersimpan terenkripsi AES-256. Hanya engine yang bisa membacanya saat runtime"},
                ].map((s,i)=>(
                  <div key={i} style={{padding:"12px",background:"rgba(255,255,255,.8)",borderRadius:10,border:"1px solid rgba(34,197,94,.1)"}}>
                    <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
                    <div style={{fontWeight:700,fontSize:12,color:"#0a1628",marginBottom:4}}>{s.title}</div>
                    <div style={{fontSize:11,color:"#64748b",lineHeight:1.6}}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Code examples */}
            {[
              {lang:"Python",color:"#3b82f6",icon:"🐍",
                code:`from openai import OpenAI

# Ganti base_url ke Orchestra endpoint
client = OpenAI(
    base_url="http://YOUR_SERVER:8080/v1",
    api_key="YOUR_WORKER_TOKEN"  # dari orchestra.yml: worker_token
)

# Request sama persis seperti OpenAI biasa
response = client.chat.completions.create(
    model="auto",   # Orchestra pilih provider terbaik
    # atau: "groq/llama-3.1-8b-instant" untuk spesifik
    # atau: "local/llama3.2" untuk GPU lokal
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user",   "content": "Jelaskan cara kerja Docker"}
    ]
)
print(response.choices[0].message.content)`},
              {lang:"Node.js / TypeScript",color:"#f59e0b",icon:"🟨",
                code:`import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "http://YOUR_SERVER:8080/v1",
  apiKey: "YOUR_WORKER_TOKEN",
});

const completion = await openai.chat.completions.create({
  model: "auto",
  messages: [{ role: "user", content: "Hello!" }],
  stream: true,  // Streaming didukung
});

for await (const chunk of completion) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`},
              {lang:"cURL",color:"#0d9488",icon:"🔧",
                code:`curl -s http://YOUR_SERVER:8080/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_WORKER_TOKEN" \\
  -d '{
    "model": "auto",
    "messages": [
      {"role": "user", "content": "Hello from cURL!"}
    ]
  }' | python3 -m json.tool`},
              {lang:"Langchain / LlamaIndex",color:"#7c3aed",icon:"🦜",
                code:`# Langchain — ganti openai_api_base
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="auto",
    openai_api_base="http://YOUR_SERVER:8080/v1",
    openai_api_key="YOUR_WORKER_TOKEN",
)

response = llm.invoke("Apa itu machine learning?")

# LlamaIndex
from llama_index.llms.openai import OpenAI

llm = OpenAI(
    model="auto",
    api_base="http://YOUR_SERVER:8080/v1",
    api_key="YOUR_WORKER_TOKEN",
)`},
            ].map((ex,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",marginBottom:16,overflow:"hidden"}}>
                <div style={{padding:"12px 20px",background:`${ex.color}10`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:18}}>{ex.icon}</span>
                  <span style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>{ex.lang}</span>
                </div>
                <pre style={{margin:0,padding:"16px 20px",background:"#0a1628",fontSize:12,color:"#e2e8f0",overflow:"auto",lineHeight:1.8,fontFamily:"'JetBrains Mono',monospace"}}>
                  {ex.code}
                </pre>
              </div>
            ))}

            {/* Tips */}
            <div style={{background:"rgba(2,132,199,.05)",border:"1.5px solid rgba(2,132,199,.15)",borderRadius:14,padding:20}}>
              <div style={{fontWeight:800,fontSize:13,color:"#0284c7",marginBottom:12}}>💡 Tips Penggunaan API</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[
                  {title:"Model \"auto\"",desc:"Orchestra pilih provider termurah yang sedang online. Cocok untuk semua use case umum."},
                  {title:"Override routing",desc:"Header X-Orchestra-Routing: cost | quality | local untuk override per-request."},
                  {title:"Streaming",desc:"Tambahkan stream: true di request. Orchestra support SSE streaming ke semua provider."},
                  {title:"Cost tracking",desc:"Setiap response punya header X-Orchestra-Cost dalam USD. Log ini untuk analitik biaya."},
                  {title:"Error handling",desc:"Jika provider gagal, Orchestra auto-retry ke provider berikutnya. Transparent ke client."},
                  {title:"Local GPU gratis",desc:"Set model: \"local/llama3.2\" untuk selalu pakai GPU lokal Anda. Biaya: $0."},
                ].map((t,i)=>(
                  <div key={i} style={{padding:"10px 12px",background:"rgba(255,255,255,.7)",borderRadius:9,border:"1px solid rgba(2,132,199,.1)"}}>
                    <div style={{fontWeight:700,fontSize:12,color:"#0284c7",marginBottom:3}}>{t.title}</div>
                    <div style={{fontSize:11,color:"#64748b",lineHeight:1.6}}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{marginTop:20,padding:"16px 20px",background:"rgba(34,197,94,.05)",border:"1.5px solid rgba(34,197,94,.2)",borderRadius:12,fontSize:13,color:"#16a34a",textAlign:"center"}}>
              ✅ Selesai! Anda sudah menguasai seluruh fitur AXTO. Butuh bantuan? <a href="mailto:hallo@axto.io" style={{color:"#0284c7",fontWeight:700}}>hallo@axto.io</a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
