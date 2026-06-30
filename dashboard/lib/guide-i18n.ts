/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
/**
 * AXTO Platform — Multilingual Setup Guide Content
 * 10 Languages: EN, ID, ZH, AR, ES, FR, DE, PT, JA, KO
 * Used by: /guide page (in-dashboard) + /api/guide/pdf (downloadable PDF)
 */

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",    flag: "🇬🇧", dir: "ltr" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩", dir: "ltr" },
  { code: "zh", label: "中文",       flag: "🇨🇳", dir: "ltr" },
  { code: "ar", label: "العربية",    flag: "🇸🇦", dir: "rtl" },
  { code: "es", label: "Español",    flag: "🇪🇸", dir: "ltr" },
  { code: "fr", label: "Français",   flag: "🇫🇷", dir: "ltr" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪", dir: "ltr" },
  { code: "pt", label: "Português",  flag: "🇧🇷", dir: "ltr" },
  { code: "ja", label: "日本語",     flag: "🇯🇵", dir: "ltr" },
  { code: "ko", label: "한국어",     flag: "🇰🇷", dir: "ltr" },
] as const;

export type LangCode = typeof SUPPORTED_LANGUAGES[number]["code"];

export interface GuideSection {
  title: string;
  content: string;
}

export interface ProductGuide {
  productName: string;
  overview: string;
  architecture: { component: string; role: string }[];
  features: { name: string; description: string }[];
  setupSteps: string[];
  configExample: string;
  verifyCommand: string;
  verifyExpected: string;
}

export interface FullGuide {
  title: string;
  subtitle: string;
  prerequisites: string[];
  downloadSteps: string[];
  guardian: ProductGuide;
  orchestra: ProductGuide;
  antivirus: { name: string; description: string }[];
  support: { label: string; value: string }[];
  pdfFooter: string;
}

const GUIDES: Record<LangCode, FullGuide> = {
  en: {
    title: "AXTO Platform — Setup Guide",
    subtitle: "Complete deployment guide for Guardian AI, Orchestra AI, and all components.",
    prerequisites: [
      "Linux server (Ubuntu 20.04+, Debian 11+, CentOS 8+, or any Docker-compatible OS)",
      "Docker Engine 20.10+ and Docker Compose v2+",
      "At least one AI provider API key (OpenAI, Anthropic, Google, Groq, or local Ollama)",
      "Your AXTO license key (available at https://axto.io/portal after purchase)",
      "Minimum 2 GB RAM and 10 GB disk space per product",
    ],
    downloadSteps: [
      "Sign in to your client portal at https://axto.io/portal",
      "Navigate to the Licenses tab",
      "Click the Download button next to your active license",
      "Select format: Docker (Linux) / EXE (Linux) / EXE (Windows)",
      "Extract: unzip axto-package.zip && cd axto-package",
    ],
    guardian: {
      productName: "Guardian AI",
      overview: "AI-powered cybersecurity engine providing 7-layer threat detection, automated incident response, file integrity monitoring, and compliance reporting. Fully self-hosted — your data never leaves your infrastructure.",
      architecture: [
        { component: "Guardian Core", role: "Central API server, web dashboard, threat analysis engine, compliance reporting. Install this first." },
        { component: "Guardian Node", role: "Agent deployed on each protected server. Scans files, monitors processes, watches network activity, reports to Core." },
        { component: "Guardian Antivirus", role: "ClamAV-based antivirus engine. Signature-based scanning alongside AI behavioral analysis. Optional but recommended." },
      ],
      features: [
        { name: "Dashboard", description: "Real-time security command center. Threat score (0–100), active threats, scan count, blocked attacks, system resources, event timeline. Green = safe, Yellow = attention needed, Red = critical." },
        { name: "Threat Scanner (7-Layer)", description: "Multi-layer malware detection: (1) Hash Lookup against hourly-updated malware DB, (2) Magic Bytes — detect disguised executables, (3) Entropy Analysis — identify encrypted/packed malware, (4) Binary Signatures — known malicious byte patterns, (5) YARA-like Patterns — web shells, backdoors, miners, (6) AI Deep Scan — neural network for zero-day threats, (7) Behavioral Analysis — monitors what files DO, not just what they are." },
        { name: "File Integrity Monitor", description: "Real-time SHA-256 file change tracking. Monitors critical directories (/etc, /var/www, custom paths). Alerts on unauthorized modifications. Required for SOC 2, PCI-DSS, HIPAA compliance. Baseline comparison with drift detection." },
        { name: "Process Monitor", description: "Tracks all running processes with parent-child hierarchy. Detects privilege escalation, cryptocurrency miners, reverse shells, unauthorized executables. Auto-kill capability for confirmed threats." },
        { name: "Network Monitor", description: "Monitors all inbound/outbound connections. Detects port scans, data exfiltration, lateral movement, connections to known malicious IPs. Real-time bandwidth analytics." },
        { name: "DNS Monitor", description: "Detects DNS tunneling, cache poisoning, C2 domain connections, DGA (Domain Generation Algorithm) patterns. Blocks known malicious domains in real-time." },
        { name: "Quarantine", description: "Isolated storage for detected threats. View threat details, restore false positives, permanently delete, or re-analyze. Shows which detection layer (1–7) flagged each file." },
        { name: "Incident Response", description: "Fully automated workflow: Detect → Kill process → Block IP at firewall → Quarantine file → Alert admin → Generate forensic report. Total response time under 30 seconds." },
        { name: "Node Management", description: "Multi-server dashboard. Each protected server runs a Guardian Node agent. View status, threat count, last scan time, resource usage per node. Force scan, restart agent, or remove nodes." },
        { name: "Compliance Reports", description: "One-click PDF generation for SOC 2 Type II, ISO 27001, HIPAA, PCI-DSS, and GDPR. Includes audit trails, access logs, incident summaries, and remediation records." },
        { name: "AI Analyst Chat", description: "BYOK-powered AI security assistant. Ask natural language questions: 'What happened at 3 AM?', 'Show SSH failures this week', 'Analyze attack patterns from this IP'. Full context of your security data." },
        { name: "Settings", description: "Configure scan intervals, monitored paths, alert channels (email, Slack, Discord, PagerDuty, webhook), AI provider keys, mTLS certificates, log retention, and notification preferences." },
      ],
      setupSteps: [
        "Run the installer: sudo bash install.sh",
        "Start services: docker compose up -d",
        "Open browser: http://YOUR_SERVER_IP:8080",
        "Paste your license key in the activation wizard",
        "Click 'Activate & Start' — dashboard is immediately active",
        "Deploy Guardian Node on additional servers for multi-server protection",
      ],
      configExample: `guardian:
  license_key: "GUARDIAN-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  scan_mode: "auto"
  scan_interval: 300
  scan_paths:
    - /host
    - /tmp
  ai_pool:
    vendors:
      - provider: openai
        api_key: "sk-YOUR-KEY"
        model: "gpt-4o-mini"`,
      verifyCommand: 'curl http://localhost:8080/health',
      verifyExpected: '{"status":"ok","license":"valid","nodes":1}',
    },
    orchestra: {
      productName: "Orchestra AI",
      overview: "AI orchestration platform that routes workloads across multiple providers (OpenAI, Claude, Gemini, Groq, DeepSeek, Ollama) with intelligent cost optimization, failover, GPU management, and budget control. Self-hosted, BYOK.",
      architecture: [
        { component: "Orchestra Core", role: "Central API server, web console, job router, cost analytics, provider health monitoring. Always required." },
        { component: "Worker CPU", role: "Handles AI requests via cloud API providers. No GPU required. Configure provider, model, and concurrency." },
        { component: "Worker GPU", role: "Local AI inference using NVIDIA GPUs via Ollama or vLLM. Zero API cost. Requires nvidia-docker runtime." },
      ],
      features: [
        { name: "Console Dashboard", description: "Real-time overview at localhost:8080/console. Active workers, job queue depth, requests/min, daily cost, provider health, latency metrics." },
        { name: "AI Providers", description: "Manage all connected providers: OpenAI, Anthropic Claude, Google Gemini, Groq, DeepSeek, Mistral, Ollama, and any OpenAI-compatible endpoint. Add, update, or remove keys anytime." },
        { name: "Routing Strategies", description: "Six modes: (1) cost_first — cheapest provider, (2) quality_first — best model, (3) smart_balance — cost × quality optimized, (4) round_robin — even distribution, (5) local_first — prefer local GPUs, (6) failover — cascade on errors." },
        { name: "Workers (CPU)", description: "Cloud API workers processing requests through remote providers. Configurable: provider, model, concurrency level. Auto-scales based on queue depth." },
        { name: "Workers (GPU)", description: "Local inference workers for NVIDIA GPUs. Runs models via Ollama/vLLM. Zero API cost for locally processed requests. Requires nvidia-docker." },
        { name: "Job Queue", description: "Priority-based queue: urgent, normal, batch tiers. Configurable timeout, retry count, dead letter queue. Jobs auto-classified by token count into light/medium/heavy tiers." },
        { name: "Cost Analytics", description: "Detailed per-provider, per-model, per-day tracking: token usage, USD cost, average latency. Daily budget cap with automatic provider switching." },
        { name: "Autoscaler", description: "Automatically adjusts worker count based on queue depth. Configure threshold, max workers, scale-down delay. Budget-aware to prevent cost overruns." },
        { name: "API Endpoint", description: "OpenAI-compatible REST API at /v1/chat/completions. Drop-in replacement — change only base_url in your app. Supports streaming, function calling, vision." },
        { name: "Webhooks", description: "Event notifications: job_completed, job_failed, worker_offline, budget_exceeded. Send to Slack, Discord, PagerDuty, or any HTTP endpoint." },
        { name: "Settings", description: "License key, AI provider keys (BYOK), worker tokens, console password, autoscaler config, CORS origins, log retention. All changes apply without restart." },
      ],
      setupSteps: [
        "Edit orchestra.yml — enter license key + AI API keys",
        "Start: docker compose -f orchestra-compose.yml up -d",
        "Console: http://YOUR_SERVER:8080/console",
        "API endpoint: http://YOUR_SERVER:8080/v1/chat/completions",
        "In your app: replace OpenAI base_url with Orchestra endpoint",
        "Optional: uncomment GPU worker section for local inference",
      ],
      configExample: `orchestra:
  license_key: "ORCH-XXXX-XXXX-XXXX-XXXX"
  ai_pool:
    routing_mode: "cost_first"
    budget_daily_usd: 50.0
    vendors:
      - provider: openai
        api_key: "sk-YOUR-KEY"
        default_model: "gpt-4o-mini"`,
      verifyCommand: 'curl http://localhost:8080/health',
      verifyExpected: '{"status":"ok","license":"valid","workers":4}',
    },
    antivirus: [
      { name: "ClamAV Engine", description: "Industry-standard open-source antivirus engine integrated with Guardian AI. Provides signature-based detection complementing Guardian's AI behavioral analysis." },
      { name: "Real-time Scan (On-Access)", description: "Monitors file system events in real-time. Every file created or modified is automatically scanned. Threats are immediately quarantined." },
      { name: "Scheduled Scan", description: "Comprehensive full-system scans on a configurable schedule (hourly, daily, weekly). More thorough than on-access scanning." },
      { name: "Signature Updates", description: "ClamAV signature database updated automatically every hour. Covers millions of known malware signatures, including latest threats." },
      { name: "Quarantine & Remediation", description: "Detected threats are automatically moved to isolated quarantine. View details, restore false positives, permanently delete, or submit for further analysis." },
    ],
    support: [
      { label: "Documentation", value: "https://axto.io/guide" },
      { label: "Client Portal", value: "https://axto.io/portal" },
      { label: "Email Support", value: "hallo@axto.io" },
      { label: "Response Time", value: "24h (Standard), 4h (Enterprise)" },
    ],
    pdfFooter: "© AXTO Platform. All rights reserved. https://axto.io",
  },

  // ── Indonesian ──────────────────────────────────────────
  id: {
    title: "AXTO Platform — Panduan Setup",
    subtitle: "Panduan lengkap untuk deploy Guardian AI, Orchestra AI, dan semua komponen.",
    prerequisites: [
      "Server Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+, atau OS yang kompatibel dengan Docker)",
      "Docker Engine 20.10+ dan Docker Compose v2+",
      "Minimal satu API key AI provider (OpenAI, Anthropic, Google, Groq, atau Ollama lokal)",
      "License key AXTO (tersedia di https://axto.io/portal setelah pembelian)",
      "Minimal 2 GB RAM dan 10 GB ruang disk per produk",
    ],
    downloadSteps: [
      "Login ke portal klien di https://axto.io/portal",
      "Buka tab Licenses",
      "Klik tombol Download di samping lisensi aktif Anda",
      "Pilih format: Docker (Linux) / EXE (Linux) / EXE (Windows)",
      "Ekstrak: unzip axto-package.zip && cd axto-package",
    ],
    guardian: {
      productName: "Guardian AI",
      overview: "Mesin keamanan siber bertenaga AI dengan deteksi ancaman 7 lapis, respons insiden otomatis, pemantauan integritas file, dan pelaporan kepatuhan. Sepenuhnya self-hosted — data Anda tidak pernah meninggalkan infrastruktur Anda.",
      architecture: [
        { component: "Guardian Core", role: "Server API pusat, dashboard web, mesin analisis ancaman, pelaporan kepatuhan. Install ini terlebih dahulu." },
        { component: "Guardian Node", role: "Agen yang di-deploy di setiap server yang dilindungi. Memindai file, memantau proses, mengawasi aktivitas jaringan." },
        { component: "Guardian Antivirus", role: "Mesin antivirus berbasis ClamAV. Pemindaian berbasis signature melengkapi analisis behavioral AI. Opsional tapi direkomendasikan." },
      ],
      features: [
        { name: "Dashboard", description: "Pusat komando keamanan real-time. Skor ancaman (0–100), ancaman aktif, jumlah scan, serangan yang diblokir, sumber daya sistem, timeline event." },
        { name: "Threat Scanner (7 Lapis)", description: "Deteksi malware multi-lapis: (1) Hash Lookup, (2) Magic Bytes, (3) Analisis Entropi, (4) Signature Biner, (5) Pola YARA, (6) AI Deep Scan, (7) Analisis Behavioral." },
        { name: "File Integrity Monitor", description: "Pelacakan perubahan file real-time menggunakan SHA-256. Memantau direktori kritis. Wajib untuk kepatuhan SOC 2, PCI-DSS, HIPAA." },
        { name: "Process Monitor", description: "Memantau semua proses berjalan. Mendeteksi eskalasi hak akses, crypto miner, reverse shell. Kemampuan auto-kill." },
        { name: "Network Monitor", description: "Memantau semua koneksi masuk/keluar. Mendeteksi port scan, eksfiltrasi data, pergerakan lateral." },
        { name: "DNS Monitor", description: "Mendeteksi DNS tunneling, cache poisoning, koneksi domain C2, pola DGA." },
        { name: "Quarantine", description: "Penyimpanan terisolasi untuk ancaman terdeteksi. Lihat detail, pulihkan false positive, hapus permanen." },
        { name: "Incident Response", description: "Alur kerja otomatis: Deteksi → Kill proses → Blokir IP → Karantina file → Alert admin → Laporan forensik. Total di bawah 30 detik." },
        { name: "Node Management", description: "Dashboard multi-server. Lihat status, jumlah ancaman, waktu scan terakhir per node." },
        { name: "Compliance Reports", description: "Generasi PDF satu klik: SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR." },
        { name: "AI Analyst Chat", description: "Asisten AI keamanan berbasis BYOK. Tanya: 'Apa yang terjadi jam 3 pagi?', 'Tampilkan kegagalan SSH minggu ini'." },
        { name: "Settings", description: "Konfigurasi interval scan, path, channel alert, kunci AI, sertifikat mTLS, retensi log." },
      ],
      setupSteps: [
        "Jalankan installer: sudo bash install.sh",
        "Mulai layanan: docker compose up -d",
        "Buka browser: http://IP_SERVER_ANDA:8080",
        "Paste license key di wizard aktivasi",
        "Klik 'Activate & Start' — dashboard langsung aktif",
        "Deploy Guardian Node di server tambahan untuk proteksi multi-server",
      ],
      configExample: `guardian:
  license_key: "GUARDIAN-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  scan_mode: "auto"
  scan_interval: 300
  ai_pool:
    vendors:
      - provider: openai
        api_key: "sk-KEY-ANDA"
        model: "gpt-4o-mini"`,
      verifyCommand: 'curl http://localhost:8080/health',
      verifyExpected: '{"status":"ok","license":"valid","nodes":1}',
    },
    orchestra: {
      productName: "Orchestra AI",
      overview: "Platform orkestrasi AI yang merutekan beban kerja ke beberapa provider dengan optimasi biaya cerdas, failover, manajemen GPU, dan kontrol anggaran.",
      architecture: [
        { component: "Orchestra Core", role: "Server API pusat, konsol web, router job, analitik biaya. Selalu diperlukan." },
        { component: "Worker CPU", role: "Menangani permintaan via cloud AI provider. Tanpa GPU." },
        { component: "Worker GPU", role: "Inferensi lokal menggunakan GPU NVIDIA via Ollama/vLLM. Biaya API nol." },
      ],
      features: [
        { name: "Console Dashboard", description: "Ikhtisar real-time: worker aktif, kedalaman antrian, biaya harian, kesehatan provider." },
        { name: "AI Providers", description: "Kelola provider: OpenAI, Claude, Gemini, Groq, DeepSeek, Mistral, Ollama." },
        { name: "Routing Strategies", description: "6 mode: cost_first, quality_first, smart_balance, round_robin, local_first, failover." },
        { name: "Workers (CPU)", description: "Worker API cloud. Konfigurasi: provider, model, level konkurensi. Auto-scale." },
        { name: "Workers (GPU)", description: "Worker inferensi lokal untuk GPU NVIDIA. Biaya nol untuk request lokal." },
        { name: "Job Queue", description: "Antrian berbasis prioritas: urgent, normal, batch. Timeout dan retry yang dapat dikonfigurasi." },
        { name: "Cost Analytics", description: "Pelacakan detail per provider/model/hari. Batas anggaran harian." },
        { name: "Autoscaler", description: "Penyesuaian jumlah worker otomatis berdasarkan kedalaman antrian." },
        { name: "API Endpoint", description: "REST API kompatibel OpenAI di /v1/chat/completions. Drop-in replacement." },
        { name: "Webhooks", description: "Notifikasi event: job selesai, gagal, worker offline, anggaran terlampaui." },
        { name: "Settings", description: "License key, kunci AI (BYOK), token worker, password konsol, konfigurasi autoscaler." },
      ],
      setupSteps: [
        "Edit orchestra.yml — masukkan license key + API key AI",
        "Mulai: docker compose -f orchestra-compose.yml up -d",
        "Konsol: http://SERVER_ANDA:8080/console",
        "API endpoint: http://SERVER_ANDA:8080/v1/chat/completions",
        "Di aplikasi Anda: ganti base_url OpenAI dengan endpoint Orchestra",
        "Opsional: uncomment bagian GPU worker untuk inferensi lokal",
      ],
      configExample: `orchestra:
  license_key: "ORCH-XXXX-XXXX-XXXX-XXXX"
  ai_pool:
    routing_mode: "cost_first"
    budget_daily_usd: 50.0
    vendors:
      - provider: openai
        api_key: "sk-KEY-ANDA"
        default_model: "gpt-4o-mini"`,
      verifyCommand: 'curl http://localhost:8080/health',
      verifyExpected: '{"status":"ok","license":"valid","workers":4}',
    },
    antivirus: [
      { name: "ClamAV Engine", description: "Mesin antivirus open-source terintegrasi dengan Guardian AI." },
      { name: "Real-time Scan", description: "Memantau event file system secara real-time. Setiap file yang dibuat atau dimodifikasi otomatis dipindai." },
      { name: "Scheduled Scan", description: "Scan penuh terjadwal (per jam, harian, mingguan)." },
      { name: "Signature Updates", description: "Database signature ClamAV diperbarui otomatis setiap jam." },
      { name: "Quarantine & Remediation", description: "Ancaman otomatis dipindahkan ke karantina terisolasi." },
    ],
    support: [
      { label: "Dokumentasi", value: "https://axto.io/guide" },
      { label: "Portal Klien", value: "https://axto.io/portal" },
      { label: "Email Support", value: "hallo@axto.io" },
      { label: "Waktu Respons", value: "24 jam (Standar), 4 jam (Enterprise)" },
    ],
    pdfFooter: "© AXTO Platform. Hak cipta dilindungi. https://axto.io",
  },

  // ── Simplified stubs for 8 more languages ─────────────
  // Each has the same structure, translated appropriately
  zh: { title: "AXTO 平台 — 设置指南", subtitle: "Guardian AI 和 Orchestra AI 的完整部署指南。", prerequisites: ["Linux 服务器 (Ubuntu 20.04+, Debian 11+)", "Docker Engine 20.10+ 和 Docker Compose v2+", "至少一个 AI 提供商 API 密钥", "AXTO 许可证密钥 (购买后在 https://axto.io/portal 获取)", "每个产品最低 2 GB RAM 和 10 GB 磁盘"], downloadSteps: ["登录 https://axto.io/portal", "打开“许可证”标签", "点击下载按钮", "选择格式: Docker / EXE", "解压: unzip axto-package.zip"], guardian: { productName: "Guardian AI", overview: "AI 驱动的网络安全引擎，7层威胁检测，自动事件响应，文件完整性监控，合规报告。完全自托管。", architecture: [{ component: "Guardian Core", role: "中央 API 服务器、Web 仪表板、威胁分析引擎。" }, { component: "Guardian Node", role: "部署在每台受保护服务器上的代理。" }, { component: "Guardian Antivirus", role: "基于 ClamAV 的防病毒引擎。" }], features: [{ name: "仪表板", description: "实时安全命令中心。威胁评分、活动威胁、扫描计数。" }, { name: "威胁扫描器 (7层)", description: "多层恶意软件检测：哈希查找、魔术字节、熵分析、二进制签名、YARA 模式、AI 深度扫描、行为分析。" }, { name: "文件完整性监控", description: "实时 SHA-256 文件更改跟踪。" }, { name: "进程监控", description: "跟踪所有运行进程，检测权限提升。" }, { name: "网络监控", description: "监控所有入站/出站连接。" }, { name: "DNS 监控", description: "检测 DNS 隧道、缓存中毒、C2 域连接。" }, { name: "隔离区", description: "检测到的威胁的隔离存储。" }, { name: "事件响应", description: "自动工作流：检测→终止进程→阻止 IP→隔离文件→警报→取证报告。30秒内完成。" }, { name: "节点管理", description: "多服务器仪表板。" }, { name: "合规报告", description: "一键生成 SOC 2、ISO 27001、HIPAA、PCI-DSS、GDPR 报告。" }, { name: "AI 分析师聊天", description: "BYOK AI 安全助手。" }, { name: "设置", description: "扫描间隔、路径、警报通道、AI 密钥、mTLS 证书。" }], setupSteps: ["运行安装程序: sudo bash install.sh", "启动服务: docker compose up -d", "打开浏览器: http://服务器IP:8080", "粘贴许可证密钥", "点击“激活”", "在其他服务器部署 Guardian Node"], configExample: "guardian:\n  license_key: \"GUARDIAN-XXXX\"\n  ai_pool:\n    vendors:\n      - provider: openai\n        api_key: \"sk-YOUR-KEY\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, orchestra: { productName: "Orchestra AI", overview: "AI 编排平台，智能路由多个提供商，成本优化。", architecture: [{ component: "Orchestra Core", role: "中央 API、控制台、路由器。" }, { component: "Worker CPU", role: "云 API 工作器。" }, { component: "Worker GPU", role: "本地 GPU 推理。" }], features: [{ name: "控制台", description: "实时概览。" }, { name: "AI 提供商", description: "管理所有连接的提供商。" }, { name: "路由策略", description: "6种模式。" }, { name: "CPU 工作器", description: "云 API 请求处理。" }, { name: "GPU 工作器", description: "本地 GPU 推理。" }, { name: "作业队列", description: "优先级队列。" }, { name: "成本分析", description: "详细费用跟踪。" }, { name: "自动扩展", description: "自动调整工作器数量。" }, { name: "API 端点", description: "OpenAI 兼容 API。" }, { name: "Webhooks", description: "事件通知。" }, { name: "设置", description: "许可证密钥、AI 密钥、配置。" }], setupSteps: ["编辑 orchestra.yml", "启动: docker compose -f orchestra-compose.yml up -d", "控制台: http://服务器:8080/console", "API: http://服务器:8080/v1/chat/completions", "替换应用中的 base_url", "可选: 启用 GPU 工作器"], configExample: "orchestra:\n  license_key: \"ORCH-XXXX\"\n  ai_pool:\n    routing_mode: \"cost_first\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, antivirus: [{ name: "ClamAV", description: "防病毒引擎。" }, { name: "实时扫描", description: "文件创建时自动扫描。" }, { name: "定期扫描", description: "全系统扫描计划。" }, { name: "签名更新", description: "每小时自动更新。" }, { name: "隔离", description: "威胁隔离存储。" }], support: [{ label: "文档", value: "https://axto.io/guide" }, { label: "门户", value: "https://axto.io/portal" }, { label: "邮件", value: "hallo@axto.io" }], pdfFooter: "© AXTO Platform. 版权所有。" },

  ar: { title: "منصة AXTO — دليل الإعداد", subtitle: "دليل النشر الكامل لـ Guardian AI و Orchestra AI.", prerequisites: ["خادم Linux", "Docker Engine 20.10+", "مفتاح API واحد على الأقل", "مفتاح ترخيص AXTO", "2 غيغابايت رام كحد أدنى"], downloadSteps: ["سجل الدخول في https://axto.io/portal", "افتح تبويب التراخيص", "انقر تنزيل", "اختر الصيغة", "فك الضغط"], guardian: { productName: "Guardian AI", overview: "محرك أمن سيبراني مدعوم بالذكاء الاصطناعي مع كشف تهديدات 7 طبقات.", architecture: [{ component: "Guardian Core", role: "خادم API مركزي ولوحة تحكم." }, { component: "Guardian Node", role: "وكيل على كل خادم محمي." }, { component: "Guardian Antivirus", role: "محرك مكافحة فيروسات ClamAV." }], features: [{ name: "لوحة التحكم", description: "مركز قيادة الأمن في الوقت الحقيقي." }, { name: "ماسح التهديدات (7 طبقات)", description: "كشف البرمجيات الخبيثة متعدد الطبقات." }, { name: "مراقب سلامة الملفات", description: "تتبع تغييرات الملفات SHA-256." }, { name: "مراقب العمليات", description: "تتبع جميع العمليات الجارية." }, { name: "مراقب الشبكة", description: "مراقبة جميع الاتصالات." }, { name: "مراقب DNS", description: "كشف أنفاق DNS." }, { name: "الحجر الصحي", description: "تخزين معزول للتهديدات." }, { name: "الاستجابة للحوادث", description: "سير عمل آلي في أقل من 30 ثانية." }, { name: "إدارة العقد", description: "لوحة تحكم متعددة الخوادم." }, { name: "تقارير الامتثال", description: "SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR." }, { name: "محلل AI", description: "مساعد أمني بالذكاء الاصطناعي." }, { name: "الإعدادات", description: "تكوين مركزي." }], setupSteps: ["شغل المثبت", "ابدأ الخدمات", "افتح المتصفح", "الصق مفتاح الترخيص", "انقر تفعيل", "انشر العقد الإضافية"], configExample: "guardian:\n  license_key: \"GUARDIAN-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, orchestra: { productName: "Orchestra AI", overview: "منصة تنسيق الذكاء الاصطناعي.", architecture: [{ component: "Orchestra Core", role: "خادم مركزي." }, { component: "Worker CPU", role: "معالج API سحابي." }, { component: "Worker GPU", role: "استدلال محلي GPU." }], features: [{ name: "لوحة التحكم", description: "نظرة عامة في الوقت الحقيقي." }, { name: "مزودي AI", description: "إدارة المزودين." }, { name: "استراتيجيات التوجيه", description: "6 أوضاع." }, { name: "عمال CPU", description: "معالجة طلبات API." }, { name: "عمال GPU", description: "استدلال محلي." }, { name: "قائمة المهام", description: "قائمة أولويات." }, { name: "تحليل التكاليف", description: "تتبع مفصل." }, { name: "التوسع التلقائي", description: "تعديل تلقائي." }, { name: "نقطة API", description: "متوافق مع OpenAI." }, { name: "Webhooks", description: "إشعارات الأحداث." }, { name: "الإعدادات", description: "التكوين." }], setupSteps: ["حرر orchestra.yml", "ابدأ Docker", "افتح الكونسول", "API جاهز", "حدث base_url", "اختياري: GPU"], configExample: "orchestra:\n  license_key: \"ORCH-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, antivirus: [{ name: "ClamAV", description: "محرك مكافحة الفيروسات." }, { name: "فحص فوري", description: "فحص تلقائي." }, { name: "فحص مجدول", description: "فحص شامل." }, { name: "تحديث التوقيعات", description: "تحديث كل ساعة." }, { name: "الحجر", description: "عزل التهديدات." }], support: [{ label: "التوثيق", value: "https://axto.io/guide" }, { label: "البوابة", value: "https://axto.io/portal" }, { label: "البريد", value: "hallo@axto.io" }], pdfFooter: "© AXTO Platform." },

  es: { title: "AXTO Platform — Guía de Configuración", subtitle: "Guía completa de implementación para Guardian AI y Orchestra AI.", prerequisites: ["Servidor Linux (Ubuntu 20.04+)", "Docker Engine 20.10+", "Al menos una clave API de proveedor de IA", "Clave de licencia AXTO", "Mínimo 2 GB RAM"], downloadSteps: ["Inicie sesión en https://axto.io/portal", "Abra la pestaña Licencias", "Haga clic en Descargar", "Seleccione formato", "Extraiga el archivo"], guardian: { productName: "Guardian AI", overview: "Motor de ciberseguridad impulsado por IA con detección de amenazas de 7 capas, respuesta automatizada a incidentes y reportes de cumplimiento.", architecture: [{ component: "Guardian Core", role: "Servidor API central, panel de control, motor de análisis." }, { component: "Guardian Node", role: "Agente en cada servidor protegido." }, { component: "Guardian Antivirus", role: "Motor antivirus ClamAV." }], features: [{ name: "Panel de Control", description: "Centro de mando de seguridad en tiempo real." }, { name: "Escáner de Amenazas (7 Capas)", description: "Detección multicapa de malware." }, { name: "Monitor de Integridad", description: "Seguimiento de cambios de archivos SHA-256." }, { name: "Monitor de Procesos", description: "Seguimiento de todos los procesos." }, { name: "Monitor de Red", description: "Monitoreo de conexiones." }, { name: "Monitor DNS", description: "Detección de túneles DNS." }, { name: "Cuarentena", description: "Almacenamiento aislado para amenazas." }, { name: "Respuesta a Incidentes", description: "Flujo automatizado en menos de 30 segundos." }, { name: "Gestión de Nodos", description: "Panel multi-servidor." }, { name: "Reportes de Cumplimiento", description: "SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR." }, { name: "Chat AI Analista", description: "Asistente de seguridad IA." }, { name: "Configuración", description: "Configuración central." }], setupSteps: ["Ejecute el instalador", "Inicie servicios", "Abra navegador", "Pegue clave de licencia", "Haga clic en Activar", "Despliegue nodos adicionales"], configExample: "guardian:\n  license_key: \"GUARDIAN-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, orchestra: { productName: "Orchestra AI", overview: "Plataforma de orquestación de IA con optimización de costos.", architecture: [{ component: "Orchestra Core", role: "Servidor central." }, { component: "Worker CPU", role: "Procesador API en la nube." }, { component: "Worker GPU", role: "Inferencia local GPU." }], features: [{ name: "Consola", description: "Vista general en tiempo real." }, { name: "Proveedores IA", description: "Gestión de proveedores." }, { name: "Estrategias de Enrutamiento", description: "6 modos." }, { name: "Workers CPU", description: "Procesamiento de solicitudes API." }, { name: "Workers GPU", description: "Inferencia local." }, { name: "Cola de Trabajos", description: "Cola prioritaria." }, { name: "Análisis de Costos", description: "Seguimiento detallado." }, { name: "Autoescalado", description: "Ajuste automático." }, { name: "Endpoint API", description: "Compatible con OpenAI." }, { name: "Webhooks", description: "Notificaciones." }, { name: "Configuración", description: "Configuración central." }], setupSteps: ["Edite orchestra.yml", "Inicie Docker", "Abra consola", "API lista", "Actualice base_url", "Opcional: GPU"], configExample: "orchestra:\n  license_key: \"ORCH-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, antivirus: [{ name: "ClamAV", description: "Motor antivirus." }, { name: "Escaneo en tiempo real", description: "Escaneo automático." }, { name: "Escaneo programado", description: "Escaneo completo." }, { name: "Actualización de firmas", description: "Cada hora." }, { name: "Cuarentena", description: "Aislamiento de amenazas." }], support: [{ label: "Documentación", value: "https://axto.io/guide" }, { label: "Portal", value: "https://axto.io/portal" }, { label: "Email", value: "hallo@axto.io" }], pdfFooter: "© AXTO Platform. Todos los derechos reservados." },

  fr: { title: "AXTO Platform — Guide d'Installation", subtitle: "Guide complet de déploiement pour Guardian AI et Orchestra AI.", prerequisites: ["Serveur Linux", "Docker Engine 20.10+", "Au moins une clé API", "Clé de licence AXTO", "Minimum 2 Go RAM"], downloadSteps: ["Connectez-vous à https://axto.io/portal", "Ouvrez l'onglet Licences", "Cliquez sur Télécharger", "Sélectionnez le format", "Extrayez le fichier"], guardian: { productName: "Guardian AI", overview: "Moteur de cybersécurité alimenté par l'IA avec détection de menaces à 7 couches.", architecture: [{ component: "Guardian Core", role: "Serveur API central et tableau de bord." }, { component: "Guardian Node", role: "Agent sur chaque serveur protégé." }, { component: "Guardian Antivirus", role: "Moteur antivirus ClamAV." }], features: [{ name: "Tableau de Bord", description: "Centre de commande sécurité en temps réel." }, { name: "Scanner de Menaces (7 Couches)", description: "Détection multicouche de malware." }, { name: "Moniteur d'Intégrité", description: "Suivi des modifications de fichiers SHA-256." }, { name: "Moniteur de Processus", description: "Suivi de tous les processus." }, { name: "Moniteur Réseau", description: "Surveillance des connexions." }, { name: "Moniteur DNS", description: "Détection de tunnels DNS." }, { name: "Quarantaine", description: "Stockage isolé pour les menaces." }, { name: "Réponse aux Incidents", description: "Workflow automatisé en moins de 30 secondes." }, { name: "Gestion des Nœuds", description: "Tableau de bord multi-serveur." }, { name: "Rapports de Conformité", description: "SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR." }, { name: "Chat Analyste IA", description: "Assistant sécurité IA." }, { name: "Paramètres", description: "Configuration centrale." }], setupSteps: ["Exécutez l'installateur", "Démarrez les services", "Ouvrez le navigateur", "Collez la clé de licence", "Cliquez sur Activer", "Déployez des nœuds supplémentaires"], configExample: "guardian:\n  license_key: \"GUARDIAN-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, orchestra: { productName: "Orchestra AI", overview: "Plateforme d'orchestration IA avec optimisation des coûts.", architecture: [{ component: "Orchestra Core", role: "Serveur central." }, { component: "Worker CPU", role: "Processeur API cloud." }, { component: "Worker GPU", role: "Inférence locale GPU." }], features: [{ name: "Console", description: "Vue d'ensemble en temps réel." }, { name: "Fournisseurs IA", description: "Gestion des fournisseurs." }, { name: "Stratégies de Routage", description: "6 modes." }, { name: "Workers CPU", description: "Traitement des requêtes." }, { name: "Workers GPU", description: "Inférence locale." }, { name: "File d'Attente", description: "File prioritaire." }, { name: "Analytique Coûts", description: "Suivi détaillé." }, { name: "Autoscaling", description: "Ajustement automatique." }, { name: "Endpoint API", description: "Compatible OpenAI." }, { name: "Webhooks", description: "Notifications." }, { name: "Paramètres", description: "Configuration." }], setupSteps: ["Éditez orchestra.yml", "Démarrez Docker", "Ouvrez la console", "API prête", "Mettez à jour base_url", "Optionnel: GPU"], configExample: "orchestra:\n  license_key: \"ORCH-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, antivirus: [{ name: "ClamAV", description: "Moteur antivirus." }, { name: "Scan temps réel", description: "Scan automatique." }, { name: "Scan programmé", description: "Scan complet." }, { name: "Mises à jour", description: "Chaque heure." }, { name: "Quarantaine", description: "Isolation des menaces." }], support: [{ label: "Documentation", value: "https://axto.io/guide" }, { label: "Portail", value: "https://axto.io/portal" }, { label: "Email", value: "hallo@axto.io" }], pdfFooter: "© AXTO Platform. Tous droits réservés." },

  de: { title: "AXTO Platform — Einrichtungsanleitung", subtitle: "Vollständige Bereitstellungsanleitung für Guardian AI und Orchestra AI.", prerequisites: ["Linux-Server", "Docker Engine 20.10+", "Mindestens ein AI-API-Schlüssel", "AXTO-Lizenzschlüssel", "Mindestens 2 GB RAM"], downloadSteps: ["Melden Sie sich an bei https://axto.io/portal", "Öffnen Sie den Reiter Lizenzen", "Klicken Sie auf Herunterladen", "Wählen Sie das Format", "Entpacken Sie die Datei"], guardian: { productName: "Guardian AI", overview: "KI-gestütztes Cybersecurity-System mit 7-Schichten-Bedrohungserkennung.", architecture: [{ component: "Guardian Core", role: "Zentraler API-Server und Dashboard." }, { component: "Guardian Node", role: "Agent auf jedem geschützten Server." }, { component: "Guardian Antivirus", role: "ClamAV-Antivirus-Engine." }], features: [{ name: "Dashboard", description: "Echtzeit-Sicherheitszentrale." }, { name: "Bedrohungsscanner (7 Schichten)", description: "Mehrschichtige Malware-Erkennung." }, { name: "Dateiintegritätsmonitor", description: "SHA-256 Dateiänderungsverfolgung." }, { name: "Prozessmonitor", description: "Verfolgung aller laufenden Prozesse." }, { name: "Netzwerkmonitor", description: "Verbindungsüberwachung." }, { name: "DNS-Monitor", description: "DNS-Tunnel-Erkennung." }, { name: "Quarantäne", description: "Isolierter Speicher für Bedrohungen." }, { name: "Vorfallreaktion", description: "Automatisierter Workflow in unter 30 Sekunden." }, { name: "Knotenverwaltung", description: "Multi-Server-Dashboard." }, { name: "Compliance-Berichte", description: "SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR." }, { name: "KI-Analyst-Chat", description: "KI-Sicherheitsassistent." }, { name: "Einstellungen", description: "Zentrale Konfiguration." }], setupSteps: ["Installer ausführen", "Dienste starten", "Browser öffnen", "Lizenzschlüssel einfügen", "Aktivieren klicken", "Zusätzliche Knoten bereitstellen"], configExample: "guardian:\n  license_key: \"GUARDIAN-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, orchestra: { productName: "Orchestra AI", overview: "KI-Orchestrierungsplattform mit Kostenoptimierung.", architecture: [{ component: "Orchestra Core", role: "Zentraler Server." }, { component: "Worker CPU", role: "Cloud-API-Prozessor." }, { component: "Worker GPU", role: "Lokale GPU-Inferenz." }], features: [{ name: "Konsole", description: "Echtzeit-Übersicht." }, { name: "KI-Anbieter", description: "Anbieterverwaltung." }, { name: "Routing-Strategien", description: "6 Modi." }, { name: "CPU-Worker", description: "API-Anfragenverarbeitung." }, { name: "GPU-Worker", description: "Lokale Inferenz." }, { name: "Auftragswarteschlange", description: "Prioritätswarteschlange." }, { name: "Kostenanalyse", description: "Detaillierte Verfolgung." }, { name: "Autoskalierung", description: "Automatische Anpassung." }, { name: "API-Endpunkt", description: "OpenAI-kompatibel." }, { name: "Webhooks", description: "Benachrichtigungen." }, { name: "Einstellungen", description: "Konfiguration." }], setupSteps: ["orchestra.yml bearbeiten", "Docker starten", "Konsole öffnen", "API bereit", "base_url aktualisieren", "Optional: GPU"], configExample: "orchestra:\n  license_key: \"ORCH-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, antivirus: [{ name: "ClamAV", description: "Antivirus-Engine." }, { name: "Echtzeitscan", description: "Automatisches Scannen." }, { name: "Geplanter Scan", description: "Vollständiger Scan." }, { name: "Signatur-Updates", description: "Stündlich." }, { name: "Quarantäne", description: "Bedrohungsisolierung." }], support: [{ label: "Dokumentation", value: "https://axto.io/guide" }, { label: "Portal", value: "https://axto.io/portal" }, { label: "E-Mail", value: "hallo@axto.io" }], pdfFooter: "© AXTO Platform. Alle Rechte vorbehalten." },

  pt: { title: "AXTO Platform — Guia de Configuração", subtitle: "Guia completo de implantação para Guardian AI e Orchestra AI.", prerequisites: ["Servidor Linux", "Docker Engine 20.10+", "Pelo menos uma chave API de IA", "Chave de licença AXTO", "Mínimo 2 GB RAM"], downloadSteps: ["Acesse https://axto.io/portal", "Abra a aba Licenças", "Clique em Download", "Selecione o formato", "Extraia o arquivo"], guardian: { productName: "Guardian AI", overview: "Motor de cibersegurança com detecção de ameaças em 7 camadas.", architecture: [{ component: "Guardian Core", role: "Servidor API central e painel." }, { component: "Guardian Node", role: "Agente em cada servidor protegido." }, { component: "Guardian Antivirus", role: "Motor antivírus ClamAV." }], features: [{ name: "Painel", description: "Centro de comando de segurança em tempo real." }, { name: "Scanner de Ameaças (7 Camadas)", description: "Detecção multicamada de malware." }, { name: "Monitor de Integridade", description: "Rastreamento SHA-256." }, { name: "Monitor de Processos", description: "Rastreamento de processos." }, { name: "Monitor de Rede", description: "Monitoramento de conexões." }, { name: "Monitor DNS", description: "Detecção de túneis DNS." }, { name: "Quarentena", description: "Armazenamento isolado." }, { name: "Resposta a Incidentes", description: "Fluxo automatizado em menos de 30 segundos." }, { name: "Gestão de Nós", description: "Painel multi-servidor." }, { name: "Relatórios de Conformidade", description: "SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR." }, { name: "Chat Analista IA", description: "Assistente de segurança IA." }, { name: "Configurações", description: "Configuração central." }], setupSteps: ["Execute o instalador", "Inicie os serviços", "Abra o navegador", "Cole a chave de licença", "Clique em Ativar", "Implante nós adicionais"], configExample: "guardian:\n  license_key: \"GUARDIAN-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, orchestra: { productName: "Orchestra AI", overview: "Plataforma de orquestração de IA com otimização de custos.", architecture: [{ component: "Orchestra Core", role: "Servidor central." }, { component: "Worker CPU", role: "Processador API na nuvem." }, { component: "Worker GPU", role: "Inferência local GPU." }], features: [{ name: "Console", description: "Visão geral em tempo real." }, { name: "Provedores IA", description: "Gerenciamento de provedores." }, { name: "Estratégias de Roteamento", description: "6 modos." }, { name: "Workers CPU", description: "Processamento de requisições." }, { name: "Workers GPU", description: "Inferência local." }, { name: "Fila de Trabalhos", description: "Fila prioritária." }, { name: "Análise de Custos", description: "Rastreamento detalhado." }, { name: "Autoescalonamento", description: "Ajuste automático." }, { name: "Endpoint API", description: "Compatível com OpenAI." }, { name: "Webhooks", description: "Notificações." }, { name: "Configurações", description: "Configuração." }], setupSteps: ["Edite orchestra.yml", "Inicie Docker", "Abra console", "API pronta", "Atualize base_url", "Opcional: GPU"], configExample: "orchestra:\n  license_key: \"ORCH-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, antivirus: [{ name: "ClamAV", description: "Motor antivírus." }, { name: "Scan tempo real", description: "Scan automático." }, { name: "Scan agendado", description: "Scan completo." }, { name: "Atualizações", description: "A cada hora." }, { name: "Quarentena", description: "Isolamento de ameaças." }], support: [{ label: "Documentação", value: "https://axto.io/guide" }, { label: "Portal", value: "https://axto.io/portal" }, { label: "Email", value: "hallo@axto.io" }], pdfFooter: "© AXTO Platform. Todos os direitos reservados." },

  ja: { title: "AXTO Platform — セットアップガイド", subtitle: "Guardian AI と Orchestra AI の完全なデプロイガイド。", prerequisites: ["Linux サーバー", "Docker Engine 20.10+", "AI プロバイダーの API キー1つ以上", "AXTO ライセンスキー", "最低 2 GB RAM"], downloadSteps: ["https://axto.io/portal にログイン", "ライセンスタブを開く", "ダウンロードをクリック", "形式を選択", "展開: unzip axto-package.zip"], guardian: { productName: "Guardian AI", overview: "7層の脅威検出、自動インシデント対応、コンプライアンスレポートを備えたAI搭載サイバーセキュリティエンジン。", architecture: [{ component: "Guardian Core", role: "中央APIサーバー、ダッシュボード。" }, { component: "Guardian Node", role: "保護対象サーバーのエージェント。" }, { component: "Guardian Antivirus", role: "ClamAVアンチウイルスエンジン。" }], features: [{ name: "ダッシュボード", description: "リアルタイムセキュリティコマンドセンター。" }, { name: "脅威スキャナー（7層）", description: "多層マルウェア検出。" }, { name: "ファイル整合性モニター", description: "SHA-256ファイル変更追跡。" }, { name: "プロセスモニター", description: "全プロセスの追跡。" }, { name: "ネットワークモニター", description: "接続監視。" }, { name: "DNSモニター", description: "DNSトンネル検出。" }, { name: "検疫", description: "脅威の隔離ストレージ。" }, { name: "インシデント対応", description: "30秒以内の自動ワークフロー。" }, { name: "ノード管理", description: "マルチサーバーダッシュボード。" }, { name: "コンプライアンスレポート", description: "SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR。" }, { name: "AIアナリストチャット", description: "AIセキュリティアシスタント。" }, { name: "設定", description: "中央設定。" }], setupSteps: ["インストーラーを実行", "サービスを開始", "ブラウザを開く", "ライセンスキーを貼り付け", "アクティベートをクリック", "追加ノードをデプロイ"], configExample: "guardian:\n  license_key: \"GUARDIAN-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, orchestra: { productName: "Orchestra AI", overview: "コスト最適化を備えたAIオーケストレーションプラットフォーム。", architecture: [{ component: "Orchestra Core", role: "中央サーバー。" }, { component: "Worker CPU", role: "クラウドAPIプロセッサー。" }, { component: "Worker GPU", role: "ローカルGPU推論。" }], features: [{ name: "コンソール", description: "リアルタイム概要。" }, { name: "AIプロバイダー", description: "プロバイダー管理。" }, { name: "ルーティング戦略", description: "6モード。" }, { name: "CPUワーカー", description: "APIリクエスト処理。" }, { name: "GPUワーカー", description: "ローカル推論。" }, { name: "ジョブキュー", description: "優先度キュー。" }, { name: "コスト分析", description: "詳細追跡。" }, { name: "オートスケーラー", description: "自動調整。" }, { name: "APIエンドポイント", description: "OpenAI互換。" }, { name: "Webhooks", description: "通知。" }, { name: "設定", description: "設定。" }], setupSteps: ["orchestra.ymlを編集", "Dockerを起動", "コンソールを開く", "API準備完了", "base_urlを更新", "オプション: GPU"], configExample: "orchestra:\n  license_key: \"ORCH-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, antivirus: [{ name: "ClamAV", description: "アンチウイルスエンジン。" }, { name: "リアルタイムスキャン", description: "自動スキャン。" }, { name: "スケジュールスキャン", description: "フルスキャン。" }, { name: "署名更新", description: "毎時。" }, { name: "検疫", description: "脅威の隔離。" }], support: [{ label: "ドキュメント", value: "https://axto.io/guide" }, { label: "ポータル", value: "https://axto.io/portal" }, { label: "メール", value: "hallo@axto.io" }], pdfFooter: "© AXTO Platform." },

  ko: { title: "AXTO Platform — 설정 가이드", subtitle: "Guardian AI 및 Orchestra AI의 완전한 배포 가이드.", prerequisites: ["Linux 서버", "Docker Engine 20.10+", "AI 제공자 API 키 최소 1개", "AXTO 라이선스 키", "최소 2GB RAM"], downloadSteps: ["https://axto.io/portal 로그인", "라이선스 탭 열기", "다운로드 클릭", "형식 선택", "압축 해제"], guardian: { productName: "Guardian AI", overview: "7계층 위협 탐지, 자동 인시던트 대응, 컴플라이언스 보고 기능의 AI 사이버보안 엔진.", architecture: [{ component: "Guardian Core", role: "중앙 API 서버 및 대시보드." }, { component: "Guardian Node", role: "보호 대상 서버의 에이전트." }, { component: "Guardian Antivirus", role: "ClamAV 안티바이러스 엔진." }], features: [{ name: "대시보드", description: "실시간 보안 커맨드 센터." }, { name: "위협 스캐너 (7계층)", description: "다계층 맬웨어 탐지." }, { name: "파일 무결성 모니터", description: "SHA-256 파일 변경 추적." }, { name: "프로세스 모니터", description: "모든 프로세스 추적." }, { name: "네트워크 모니터", description: "연결 모니터링." }, { name: "DNS 모니터", description: "DNS 터널링 탐지." }, { name: "격리", description: "위협 격리 저장소." }, { name: "인시던트 대응", description: "30초 이내 자동 워크플로." }, { name: "노드 관리", description: "멀티서버 대시보드." }, { name: "컴플라이언스 보고서", description: "SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR." }, { name: "AI 분석가 채팅", description: "AI 보안 어시스턴트." }, { name: "설정", description: "중앙 설정." }], setupSteps: ["설치 프로그램 실행", "서비스 시작", "브라우저 열기", "라이선스 키 붙여넣기", "활성화 클릭", "추가 노드 배포"], configExample: "guardian:\n  license_key: \"GUARDIAN-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, orchestra: { productName: "Orchestra AI", overview: "비용 최적화를 갖춘 AI 오케스트레이션 플랫폼.", architecture: [{ component: "Orchestra Core", role: "중앙 서버." }, { component: "Worker CPU", role: "클라우드 API 프로세서." }, { component: "Worker GPU", role: "로컬 GPU 추론." }], features: [{ name: "콘솔", description: "실시간 개요." }, { name: "AI 제공자", description: "제공자 관리." }, { name: "라우팅 전략", description: "6가지 모드." }, { name: "CPU 워커", description: "API 요청 처리." }, { name: "GPU 워커", description: "로컬 추론." }, { name: "작업 큐", description: "우선순위 큐." }, { name: "비용 분석", description: "상세 추적." }, { name: "오토스케일러", description: "자동 조정." }, { name: "API 엔드포인트", description: "OpenAI 호환." }, { name: "Webhooks", description: "알림." }, { name: "설정", description: "설정." }], setupSteps: ["orchestra.yml 편집", "Docker 시작", "콘솔 열기", "API 준비 완료", "base_url 업데이트", "선택사항: GPU"], configExample: "orchestra:\n  license_key: \"ORCH-XXXX\"", verifyCommand: "curl http://localhost:8080/health", verifyExpected: '{"status":"ok"}' }, antivirus: [{ name: "ClamAV", description: "안티바이러스 엔진." }, { name: "실시간 스캔", description: "자동 스캔." }, { name: "예약 스캔", description: "전체 스캔." }, { name: "서명 업데이트", description: "매시." }, { name: "격리", description: "위협 격리." }], support: [{ label: "문서", value: "https://axto.io/guide" }, { label: "포털", value: "https://axto.io/portal" }, { label: "이메일", value: "hallo@axto.io" }], pdfFooter: "© AXTO Platform." },
};

export function getGuide(lang: LangCode): FullGuide {
  return GUIDES[lang] || GUIDES.en;
}

export default GUIDES;
