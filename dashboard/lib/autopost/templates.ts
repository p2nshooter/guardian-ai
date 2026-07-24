/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ============================================================
// AXTO AutoPost — Master Template Library (200+ templates)
// Covers: Guardian AI, Orchestra AI, Playbooks, BYOK, Self-Hosted
// ============================================================

import { EXTRA_200_TEMPLATES, EXTRA_BATCH2, EXTRA_BATCH3 } from "./templates_extra200";
import {
  VAULT_ENTERPRISE_TEMPLATES,
  EDGE_ENTERPRISE_TEMPLATES,
  SOC_ENTERPRISE_TEMPLATES,
  COMPLIANCE_ENTERPRISE_TEMPLATES,
  SENTINEL_ENTERPRISE_TEMPLATES,
} from "./templates_enterprise";
import { EN_1000_TEMPLATES } from "./templates_1000en";

export interface AutoPostTemplate {
  id: string;
  title: string;
  category: string;
  platforms: string[];
  body_text: string;
  hashtags: string[];
  cta_text: string;
  image_prompt: string;
  image_url?: string;
  language: string;
  variables?: { key: string; default: string; description: string }[];
}

// ─────────────────────────────────────────────────────────────
// GUARDIAN AI TEMPLATES (Cybersecurity)
// ─────────────────────────────────────────────────────────────
export const GUARDIAN_AI_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "g001",
    title: "Guardian AI – Intro Umum",
    category: "guardian_ai",
    platforms: ["facebook","instagram","linkedin"],
    body_text: `🛡️ Perkenalkan AXTO Guardian AI — mesin keamanan siber bertenaga AI yang melindungi infrastruktur Anda 24/7.

Bukan sekadar antivirus biasa. Guardian AI menganalisis perilaku file secara REAL-TIME, mendeteksi ancaman yang belum pernah terlihat sebelumnya, dan langsung bertindak sebelum kerusakan terjadi.

✅ Analisis statis & behavioral
✅ Threat feed real-time
✅ Multi-server protection
✅ 100% self-hosted — data tidak keluar dari server Anda

{{cta}}`,
    hashtags: ["#CyberSecurity","#AIProtection","#AXTO","#GuardianAI","#KeamananSiber","#ThreatDetection","#SelfHosted"],
    cta_text: "🔗 Pelajari lebih lanjut: axto.io",
    image_prompt: "Dark futuristic cybersecurity shield with AI neural network glowing cyan and blue, professional enterprise tech aesthetic",
    language: "id",
  },
  {
    id: "g002",
    title: "Guardian AI – Behavioral Analysis",
    category: "guardian_ai",
    platforms: ["facebook","twitter","linkedin"],
    body_text: `⚡ Ancaman siber modern tidak terlihat oleh antivirus konvensional.

AXTO Guardian AI menggunakan analisis BEHAVIORAL — artinya ia memantau cara program berperilaku, bukan hanya mencocokkan signature.

Hasilnya? Malware zero-day yang belum ada di database manapun bisa langsung terdeteksi. 🎯

Kompetitor masih pakai metode lama. Kami sudah di masa depan.

{{cta}}`,
    hashtags: ["#ZeroDay","#MalwareDetection","#AXTO","#BehavioralAnalysis","#AIThreat","#CyberIndonesia"],
    cta_text: "🔐 Coba Guardian AI sekarang: axto.io",
    image_prompt: "AI analyzing code patterns with red threat indicators on dark background, cyberpunk style",
    language: "id",
  },
  {
    id: "g003",
    title: "Guardian AI – Multi Server",
    category: "guardian_ai",
    platforms: ["facebook","linkedin","pinterest"],
    body_text: `🖥️ Punya banyak server? AXTO Guardian AI bisa melindungi SEMUA sekaligus dari satu dashboard.

Tidak perlu install solusi berbeda di tiap server. Satu lisensi, satu panel kontrol, semua server terpantau.

Fitur unggulan:
→ Central monitoring dashboard
→ Alert real-time ke email/Telegram
→ Auto-quarantine file berbahaya
→ Log forensik lengkap

Kompetitor charge per-server. Kami? Per-node, jauh lebih hemat. 💡

{{cta}}`,
    hashtags: ["#MultiServer","#GuardianAI","#AXTO","#ServerSecurity","#CyberSecurity","#IT","#Infrastruktur"],
    cta_text: "📊 Lihat paket: axto.io",
    image_prompt: "Multiple servers connected to central AI hub with glowing security shields, network topology visualization",
    language: "id",
  },
  {
    id: "g004",
    title: "Guardian AI – BYOK Advantage",
    category: "guardian_ai",
    platforms: ["linkedin","twitter"],
    body_text: `💡 Kenapa bayar mahal untuk AI yang pakai model mereka, kalau kamu bisa pakai API key milikmu sendiri?

AXTO Guardian AI mendukung BYOK (Bring Your Own Key):
🔑 OpenAI, Claude, Gemini, Groq — semua bisa
🔑 Data Anda hanya melewati API provider pilihan Anda
🔑 Kontrol penuh atas biaya AI

Tidak ada vendor lock-in. Tidak ada biaya tersembunyi. Bebas pilih yang paling cocok untuk bisnis Anda.

{{cta}}`,
    hashtags: ["#BYOK","#BringYourOwnKey","#AXTO","#AIControl","#NVendorLockIn","#CyberSecurity"],
    cta_text: "🚀 Setup BYOK: axto.io/docs",
    image_prompt: "Golden key unlocking AI neural network, professional tech illustration, dark background",
    language: "id",
  },
  {
    id: "g005",
    title: "Guardian AI – No Data Leak",
    category: "guardian_ai",
    platforms: ["facebook","instagram","linkedin"],
    body_text: `🔒 Di era digital ini, privasi data adalah segalanya.

AXTO Guardian AI beroperasi 100% di server Anda sendiri. Tidak ada data yang dikirim ke cloud kami. Tidak ada. Sama sekali.

Ini berbeda dari solusi SaaS lain yang memerlukan akses ke file dan log server Anda.

Dengan AXTO:
✔️ Data tetap di infrastruktur Anda
✔️ Sesuai regulasi GDPR, UU PDP Indonesia
✔️ Audit trail sepenuhnya di tangan Anda
✔️ Zero telemetry ke vendor

Keamanan yang benar-benar aman. 🛡️

{{cta}}`,
    hashtags: ["#DataPrivacy","#SelfHosted","#AXTO","#GDPR","#UUPennyData","#ZeroTrust","#KeamananData"],
    cta_text: "🔐 Self-host hari ini: axto.io",
    image_prompt: "Secure vault with data inside, padlock glowing, no cloud connection, dark professional style",
    language: "id",
  },
  {
    id: "g006",
    title: "Guardian AI – Threat Feed Real-time",
    category: "guardian_ai",
    platforms: ["twitter","linkedin"],
    body_text: `📡 Guardian AI terus belajar dari ancaman global — secara REAL-TIME.

Threat feed kami diperbarui terus menerus dengan:
• IP berbahaya terbaru
• Domain malware aktif
• Hash malware yang baru ditemukan

Artinya sistem Anda selalu satu langkah di depan penyerang.

Coba bandingkan dengan antivirus yang update signature-nya seminggu sekali. 😅

{{cta}}`,
    hashtags: ["#ThreatIntelligence","#ThreatFeed","#GuardianAI","#AXTO","#CyberThreat","#RealTime"],
    cta_text: "⚡ Mulai proteksi: axto.io",
    image_prompt: "Global threat map with red indicators connecting to a central AI shield, dark map visualization",
    language: "id",
  },
  {
    id: "g007",
    title: "Guardian AI – Static Analysis",
    category: "guardian_ai",
    platforms: ["facebook","linkedin"],
    body_text: `🔬 Sebelum file dieksekusi pun, AXTO Guardian AI sudah tahu apakah ia berbahaya.

Analisis statis kami memeriksa:
→ Struktur file secara mendalam
→ Entropy dan obfuscation patterns
→ Import table dan string yang mencurigakan
→ Perbandingan dengan database malware global

Ini bukan magic. Ini ilmu pengetahuan AI yang bekerja untuk Anda. 🧠

{{cta}}`,
    hashtags: ["#StaticAnalysis","#MalwareAnalysis","#GuardianAI","#AXTO","#FileSecurity"],
    cta_text: "🛡️ Pelajari teknologinya: axto.io/docs",
    image_prompt: "Binary code analysis with AI highlighting suspicious patterns in red, clean technical visualization",
    language: "id",
  },
  {
    id: "g008",
    title: "Guardian AI – English Version",
    category: "guardian_ai",
    platforms: ["linkedin","twitter","facebook"],
    body_text: `🛡️ Protect your infrastructure with AXTO Guardian AI — enterprise-grade cybersecurity powered by cutting-edge AI.

What makes us different:
✦ Behavioral + static malware analysis
✦ Real-time global threat feed
✦ 100% self-hosted — your data never leaves your servers
✦ BYOK: use your own OpenAI/Claude/Gemini keys
✦ Multi-server protection from one dashboard

No SaaS subscription that spies on your files. No vendor lock-in. Complete control.

{{cta}}`,
    hashtags: ["#CyberSecurity","#AIProtection","#AXTO","#GuardianAI","#SelfHosted","#BYOK","#Enterprise"],
    cta_text: "🔗 Learn more: axto.io",
    image_prompt: "Enterprise cybersecurity guardian AI shield with blue cyan glow, professional dark background",
    language: "en",
  },
  {
    id: "g009",
    title: "Guardian AI – Iklan Baris Pendek",
    category: "guardian_ai",
    platforms: ["craigslist","olx","locanto","classifiedads"],
    body_text: `🛡️ AXTO Guardian AI – Proteksi Server AI Terdepan

Software keamanan siber bertenaga AI untuk server Linux/Windows Anda.
✅ Deteksi malware zero-day
✅ 100% self-hosted, data tidak keluar server
✅ Multi-server monitoring
✅ Analisis behavioral real-time
✅ Threat feed global
✅ BYOK (pakai API key sendiri)

Cocok untuk: perusahaan IT, hosting provider, e-commerce, fintech, pemerintahan.

Harga terjangkau, jauh lebih hemat dari solusi enterprise lain.

📧 hello@axto.io | 🌐 axto.io`,
    hashtags: [],
    cta_text: "Hubungi kami: hello@axto.io",
    image_prompt: "Simple clean cybersecurity product banner with AXTO branding",
    language: "id",
  },
  {
    id: "g010",
    title: "Guardian AI – Pain Point Hacking",
    category: "guardian_ai",
    platforms: ["facebook","instagram"],
    body_text: `😱 Server kena hack lagi?
😱 File customer bocor ke competitor?
😱 Database dienkripsi ransomware?

Kalau pernah mengalami ini, Anda tahu betapa mahalnya biayanya — baik finansial maupun reputasi.

AXTO Guardian AI hadir untuk memastikan ini TIDAK TERJADI LAGI.

Dengan AI yang memantau setiap aktivitas server 24/7, ancaman dideteksi sebelum jadi kerusakan. Bukan sesudah.

{{cta}}`,
    hashtags: ["#ServerHacked","#Ransomware","#DataBreach","#GuardianAI","#AXTO","#ProteksiServer"],
    cta_text: "🛡️ Lindungi server Anda sekarang: axto.io",
    image_prompt: "Hacker stopped by AI shield, dramatic lighting, cyberpunk aesthetic",
    language: "id",
  },
];

// ─────────────────────────────────────────────────────────────
// ORCHESTRA AI TEMPLATES (AI eXecution & Tools Orchestration)
// ─────────────────────────────────────────────────────────────
export const ORCHESTRA_AI_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "o001",
    title: "Orchestra AI – Intro Umum",
    category: "orchestra_ai",
    platforms: ["facebook","instagram","linkedin"],
    body_text: `🎼 Kelola beban kerja AI Anda dengan cerdas menggunakan AXTO Orchestra AI.

Bayangkan bisa menjalankan ratusan job AI sekaligus, di GPU cluster manapun, dengan routing otomatis ke provider terbaik.

Itulah Orchestra AI. 🚀

→ CPU & GPU worker pools
→ 6 mode routing: cost, latency, load, dll
→ Support OpenAI, Claude, Gemini, Groq, Ollama
→ License-enforced worker limits
→ Auto-scaling

Buat tim AI Anda bekerja lebih efisien dan hemat. 💡

{{cta}}`,
    hashtags: ["#OrchestraAI","#AXTO","#AIWorkflow","#GPUCluster","#AIInfrastruktur","#MachineLearning"],
    cta_text: "⚡ Mulai orkestrasi: axto.io",
    image_prompt: "Orchestra conductor directing AI workers across GPU nodes, cyberpunk futuristic visualization",
    language: "id",
  },
  {
    id: "o002",
    title: "Orchestra AI – 6 Routing Modes",
    category: "orchestra_ai",
    platforms: ["linkedin","twitter"],
    body_text: `🧠 Tidak semua job AI membutuhkan provider yang sama.

AXTO Orchestra AI punya 6 mode routing CERDAS:
1️⃣ Cost Mode — pilih yang termurah
2️⃣ Latency Mode — pilih yang tercepat
3️⃣ Load Balance — distribusi merata
4️⃣ Quality Mode — pilih yang terbaik outputnya
5️⃣ Failover Mode — backup otomatis
6️⃣ Custom Mode — atur sendiri

Hasilnya: efisiensi maksimal, biaya minimal, zero downtime. ⚡

{{cta}}`,
    hashtags: ["#OrchestraAI","#AIRouting","#AXTO","#LoadBalancing","#AIOptimization","#MLOps"],
    cta_text: "📊 Lihat semua fitur: axto.io",
    image_prompt: "Six routing paths visualized as glowing arrows flowing through AI nodes, dark background",
    language: "id",
  },
  {
    id: "o003",
    title: "Orchestra AI – Multi Vendor",
    category: "orchestra_ai",
    platforms: ["facebook","linkedin"],
    body_text: `🌐 Stop bergantung pada SATU provider AI.

AXTO Orchestra AI mendukung SEMUA provider populer:
✅ OpenAI (GPT-4, GPT-3.5)
✅ Anthropic Claude
✅ Google Gemini
✅ Groq (ultra-fast inference)
✅ Ollama (local models)
✅ Dan provider custom lainnya

Kalau satu provider down atau harganya naik — sistem otomatis beralih ke yang lain. Zero disruption. 🎯

{{cta}}`,
    hashtags: ["#MultiVendor","#OrchestraAI","#AXTO","#OpenAI","#Claude","#Gemini","#AIProvider"],
    cta_text: "🔗 Setup multi-vendor: axto.io",
    image_prompt: "Multiple AI provider logos connected to central orchestration hub, digital network visualization",
    language: "id",
  },
  {
    id: "o004",
    title: "Orchestra AI – GPU Cluster",
    category: "orchestra_ai",
    platforms: ["linkedin","twitter","facebook"],
    body_text: `🖥️ Punya GPU cluster tapi tidak dioptimalkan?

AXTO Orchestra AI mengubah idle GPU Anda menjadi mesin produksi AI yang powerful.

• Auto-distribute job ke worker yang tersedia
• Monitor utilisasi GPU secara real-time
• Queue management yang cerdas
• Priority scheduling
• Worker health monitoring

ROI dari infrastructure Anda langsung terasa. 📈

{{cta}}`,
    hashtags: ["#GPUCluster","#OrchestraAI","#AXTO","#MLInfrastructure","#AIProduction","#DeepLearning"],
    cta_text: "⚡ Optimalkan GPU Anda: axto.io",
    image_prompt: "GPU cluster visualization with AI workloads flowing efficiently, professional tech render",
    language: "id",
  },
  {
    id: "o005",
    title: "Orchestra AI – Cost Reduction",
    category: "orchestra_ai",
    platforms: ["facebook","instagram","linkedin"],
    body_text: `💰 Tim AI Anda membakar budget terlalu cepat?

Banyak perusahaan overpay AI API karena tidak ada optimasi. AXTO Orchestra AI mengubah itu:

📉 Kurangi biaya AI hingga 60% dengan:
→ Routing otomatis ke provider termurah
→ Caching respons yang sering diminta
→ Batch processing yang efisien
→ Model selection berdasarkan complexity

Bayar lebih sedikit, dapat output yang sama. Bahkan lebih baik. 🏆

{{cta}}`,
    hashtags: ["#AIOptimization","#CostReduction","#OrchestraAI","#AXTO","#AIBudget","#MLOps"],
    cta_text: "💡 Hitung penghematan Anda: axto.io",
    image_prompt: "Money saving visualization with AI cost reduction graph going down, green financial success",
    language: "id",
  },
  {
    id: "o006",
    title: "Orchestra AI – Classified Ad",
    category: "orchestra_ai",
    platforms: ["craigslist","olx","locanto"],
    body_text: `🎼 AXTO Orchestra AI – Platform Orkestrasi AI Enterprise

Software manajemen workflow AI untuk tim dan perusahaan:
✅ Kelola ratusan AI job secara paralel
✅ Route otomatis ke provider terbaik (OpenAI/Claude/Gemini)
✅ GPU cluster management
✅ 6 mode routing cerdas
✅ 100% self-hosted
✅ BYOK support

Cocok untuk: AI startup, enterprise, GPU farm, AI research team.

Hemat biaya AI hingga 60% dengan routing cerdas.

📧 hello@axto.io | 🌐 axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io",
    image_prompt: "Orchestra AI product banner with workflow visualization",
    language: "id",
  },
  {
    id: "o007",
    title: "Orchestra AI – MLOps Focus",
    category: "orchestra_ai",
    platforms: ["linkedin","twitter"],
    body_text: `⚙️ MLOps yang benar-benar works. Bukan sekedar buzzword.

AXTO Orchestra AI memberikan kontrol nyata atas pipeline AI Anda:

🔧 Job queue dengan priority
🔧 Retry logic otomatis saat failure
🔧 Logging & observability lengkap
🔧 Webhook saat job selesai
🔧 REST API untuk integrasi

Production-ready. Enterprise-grade. Self-hosted. 💪

{{cta}}`,
    hashtags: ["#MLOps","#OrchestraAI","#AXTO","#AIProduction","#MachineLearning","#DevOps"],
    cta_text: "📖 Baca dokumentasi: axto.io/docs",
    image_prompt: "MLOps pipeline visualization with orchestration steps glowing, professional dark background",
    language: "id",
  },
];

// ─────────────────────────────────────────────────────────────
// SELF-HOSTED & BYOK TEMPLATES
// ─────────────────────────────────────────────────────────────
export const SELFHOSTED_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "s001",
    title: "Self-Hosted – Keunggulan Utama",
    category: "self_hosted",
    platforms: ["facebook","instagram","linkedin"],
    body_text: `🏠 Kenapa self-hosted lebih baik dari SaaS untuk keamanan dan AI?

Dengan AXTO yang 100% self-hosted:

🔐 DATA PRIVASI: Semua data ada di server Anda. Tidak ada yang tahu kecuali Anda.
⚡ PERFORMA: Tidak ada latency jaringan ke cloud vendor
💰 BIAYA: Bayar sekali, pakai selamanya — tidak ada subscription bulanan yang terus naik
🛠️ KONTROL: Update kapan mau, konfigurasi sesuai kebutuhan
📋 COMPLIANCE: Mudah audit, cocok untuk regulasi ketat

SaaS cuma nyaman di awal. Jangka panjang, self-hosted jauh lebih hemat dan aman. 📊

{{cta}}`,
    hashtags: ["#SelfHosted","#AXTO","#DataPrivacy","#OnPremise","#EnterpriseIT","#NoCloud"],
    cta_text: "🚀 Deploy sendiri: axto.io",
    image_prompt: "Server in office with padlock and home symbol, cozy but secure, professional illustration",
    language: "id",
  },
  {
    id: "s002",
    title: "Self-Hosted – vs SaaS Comparison",
    category: "self_hosted",
    platforms: ["facebook","linkedin","twitter"],
    body_text: `🆚 Self-Hosted vs SaaS — Mana Yang Lebih Baik?

❌ SaaS biasa:
- Harga naik tiap tahun
- Data kamu ada di server mereka
- Vendor bisa shutdown kapan saja
- Tidak bisa kustomisasi

✅ AXTO Self-Hosted:
- Bayar sekali, pakai selamanya
- Data 100% di server kamu
- Tidak bergantung pada vendor
- Kustomisasi penuh
- Source code transparan

Pilihan profesional untuk bisnis yang serius. 💼

{{cta}}`,
    hashtags: ["#SelfHosted","#AXTO","#VsSaaS","#OnPremise","#DataControl","#EnterpriseChoice"],
    cta_text: "🔗 Bandingkan harga: axto.io",
    image_prompt: "Split screen comparison: cloudy uncertain SaaS vs clear bright self-hosted solution",
    language: "id",
  },
  {
    id: "s003",
    title: "BYOK – Keuntungan Detail",
    category: "byok",
    platforms: ["linkedin","twitter","facebook"],
    body_text: `🔑 BYOK: Revolusi Cara Pakai AI

Bring Your Own Key — artinya kamu pakai API key AI-mu sendiri, bukan yang kami siapkan.

Kenapa ini penting?
✅ Biaya AI langsung ke provider, tidak ada markup
✅ Pilih model AI terbaik sesuai kebutuhan
✅ Kontrol spending AI secara langsung
✅ Data flow ke provider pilihan kamu
✅ Ganti provider kapanpun tanpa ganti platform

AXTO adalah satu-satunya platform yang BENAR-BENAR memberikan kontrol ini. 💪

{{cta}}`,
    hashtags: ["#BYOK","#BringYourOwnKey","#AXTO","#AIControl","#NoMarkup","#AIProvider"],
    cta_text: "⚡ Mulai dengan BYOK: axto.io",
    image_prompt: "Key with AI symbol, freedom and control visualization, gold and dark aesthetic",
    language: "id",
  },
  {
    id: "s004",
    title: "Self-Hosted – For Compliance",
    category: "self_hosted",
    platforms: ["linkedin","facebook"],
    body_text: `📋 Bisnis Anda bergerak di industri yang regulasinya ketat?

Perbankan, kesehatan, pemerintahan, fintech — semua membutuhkan kontrol penuh atas data.

AXTO hadir sebagai solusi:
→ UU PDP Indonesia compliant
→ GDPR ready
→ Tidak ada data keluar negeri tanpa izin
→ Full audit trail
→ Enkripsi end-to-end
→ On-premise deployment

Regulasi adalah tantangan. AXTO membuatnya mudah. ⚖️

{{cta}}`,
    hashtags: ["#Compliance","#AXTO","#UUPDP","#GDPR","#DataGovernance","#FinTech","#RegTech"],
    cta_text: "📊 Konsultasi kepatuhan: hello@axto.io",
    image_prompt: "Legal compliance documents with AI shield, professional corporate style",
    language: "id",
  },
  {
    id: "s005",
    title: "Self-Hosted – English",
    category: "self_hosted",
    platforms: ["linkedin","twitter","facebook"],
    body_text: `🏠 Why AXTO's self-hosted model is the future of enterprise AI.

In a world where data breaches cost millions, AXTO gives you complete control:

✦ 100% on-premise — data never leaves your infrastructure
✦ No subscription price hikes
✦ Full customization and configuration control
✦ Compliance-ready for any regulatory framework
✦ BYOK for transparent AI spending

The enterprise software model is broken. We're fixing it.

{{cta}}`,
    hashtags: ["#SelfHosted","#AXTO","#EnterpriseAI","#DataSovereignty","#OnPremise","#BYOK"],
    cta_text: "🔗 Deploy today: axto.io",
    image_prompt: "Enterprise server room with AI hovering securely inside, professional render",
    language: "en",
  },
];

// ─────────────────────────────────────────────────────────────
// PRICING / VALUE TEMPLATES
// ─────────────────────────────────────────────────────────────
export const PRICING_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "p001",
    title: "Harga – Lebih Hemat dari Kompetitor",
    category: "pricing",
    platforms: ["facebook","instagram"],
    body_text: `💰 Bayar mahal untuk cybersecurity enterprise?

Solusi seperti CrowdStrike, SentinelOne bisa ratusan ribu dollar per tahun untuk enterprise.

AXTO Guardian AI? Sebagian kecil dari harga itu. Dengan fitur yang tidak kalah — bahkan lebih karena Anda punya kontrol penuh.

Kenapa bayar lebih untuk sesuatu yang bisa Anda kontrol sendiri? 🤔

{{cta}}`,
    hashtags: ["#HargaTerjangkau","#AXTO","#GuardianAI","#VsCrowdStrike","#CyberSecurity","#Hemat"],
    cta_text: "💡 Lihat harga: axto.io",
    image_prompt: "Price comparison chart with AXTO clearly winning, green vs red bars",
    language: "id",
  },
  {
    id: "p002",
    title: "Harga – One-time vs Subscription",
    category: "pricing",
    platforms: ["facebook","linkedin"],
    body_text: `📊 Hitung total cost of ownership yang sebenarnya.

Software SaaS lain:
→ $X/bulan × 12 bulan × 5 tahun = 💸💸💸
→ Harga naik setiap renewal
→ Locked-in kontrak

AXTO:
→ Bayar SEKALI
→ Pakai SELAMANYA
→ Tidak ada renewal wajib
→ Update masuk tanpa biaya tambahan

Dalam 2-3 tahun, AXTO sudah balik modal vs solusi berlangganan. 🏆

{{cta}}`,
    hashtags: ["#TCO","#TotalCostOfOwnership","#AXTO","#SaasVsOneTime","#Hemat","#ROI"],
    cta_text: "📈 Hitung ROI Anda: axto.io",
    image_prompt: "ROI graph showing AXTO breaking even then saving money, green upward trend",
    language: "id",
  },
  {
    id: "p003",
    title: "Pricing – Paket Node",
    category: "pricing",
    platforms: ["facebook","linkedin","twitter"],
    body_text: `🖥️ Sistem lisensi AXTO dirancang untuk bisnis yang berkembang.

Bayar berdasarkan JUMLAH NODE yang Anda proteksi — bukan per fitur, bukan per user.

Mulai kecil, scale besar:
• Mulai dari 1 node
• Add node sesuai pertumbuhan
• Tidak ada biaya setup
• Tidak ada biaya per-user

Semakin besar tim Anda, semakin hemat per-node ratio-nya. 📉

{{cta}}`,
    hashtags: ["#NodeLicense","#AXTO","#Scalable","#PricingModel","#EnterpriseIT"],
    cta_text: "🔗 Lihat paket node: axto.io",
    image_prompt: "Node diagram showing scalable architecture, minimal price tags",
    language: "id",
  },
];

// ─────────────────────────────────────────────────────────────
// COMPARISON / USP TEMPLATES
// ─────────────────────────────────────────────────────────────
export const COMPARISON_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "c001",
    title: "Vs Kompetitor – Guardian",
    category: "comparison",
    platforms: ["facebook","linkedin"],
    body_text: `🆚 AXTO Guardian AI vs Antivirus Konvensional

Antivirus biasa:
❌ Hanya deteksi malware yang sudah dikenal
❌ Update signature manual/terjadwal
❌ Tidak bisa analisis perilaku
❌ Tidak ada AI decision-making
❌ Data dikirim ke cloud vendor

AXTO Guardian AI:
✅ Deteksi zero-day dengan behavioral AI
✅ Threat feed real-time otomatis
✅ AI behavioral analysis 24/7
✅ AI-powered decision engine
✅ 100% on-premise, data Anda aman

Pilih yang benar-benar melindungi. Bukan yang hanya terlihat melindungi.

{{cta}}`,
    hashtags: ["#VsAntivirus","#GuardianAI","#AXTO","#ZeroDay","#Perbandingan","#CyberSecurity"],
    cta_text: "🛡️ Coba Guardian AI: axto.io",
    image_prompt: "Guardian AI shield vs traditional antivirus shield, AXTO wins dramatically",
    language: "id",
  },
  {
    id: "c002",
    title: "Vs Kompetitor – Orchestra",
    category: "comparison",
    platforms: ["linkedin","twitter"],
    body_text: `🆚 AXTO Orchestra AI vs Platform AI Lain

Platform lain:
❌ Vendor lock-in ke satu provider AI
❌ Tidak bisa pakai model lokal
❌ Pricing tidak transparan
❌ Data Anda ada di server mereka
❌ Limited routing options

AXTO Orchestra AI:
✅ Multi-vendor: OpenAI, Claude, Gemini, Groq, Ollama
✅ Support model lokal via Ollama
✅ Biaya transparan dengan BYOK
✅ 100% data on-premise
✅ 6 mode routing cerdas

Tidak ada trade-off. Semua keunggulan dalam satu platform. 💪

{{cta}}`,
    hashtags: ["#OrchestraAI","#AXTO","#VsLangChain","#AIOrchestration","#MultiVendor","#NoLockIn"],
    cta_text: "⚡ Bandingkan sekarang: axto.io",
    image_prompt: "AXTO Orchestra winning comparison chart vs competitors, professional infographic",
    language: "id",
  },
  {
    id: "c003",
    title: "USP – 5 Keunggulan Unik AXTO",
    category: "comparison",
    platforms: ["facebook","instagram","linkedin"],
    body_text: `🏆 5 hal yang HANYA ada di AXTO — tidak di platform lain:

1️⃣ BYOK NYATA: API key Anda, bukan simulasi
2️⃣ ZERO TELEMETRY: Tidak ada data kirim ke kami, SAMA SEKALI
3️⃣ DUAL AI ENGINE: Guardian (security) + Orchestra (workflow) dalam satu platform
4️⃣ NODE-BASED LICENSING: Bayar untuk apa yang Anda pakai
5️⃣ SELF-SOVEREIGN: Deploy, konfigurasi, dan kontrol penuh di tangan Anda

Ini bukan marketing. Ini arsitektur yang kami bangun dari hari pertama. 🏗️

{{cta}}`,
    hashtags: ["#UniqueFeatures","#AXTO","#BYOK","#ZeroTelemetry","#SelfSovereign","#Enterprise"],
    cta_text: "🔗 Lihat semua fitur: axto.io",
    image_prompt: "Five pillars of AXTO platform, each glowing with unique colors, professional infographic",
    language: "id",
  },
  {
    id: "c004",
    title: "USP – English Global",
    category: "comparison",
    platforms: ["linkedin","twitter","facebook"],
    body_text: `🌍 What separates AXTO from every other enterprise AI security platform:

🔷 Complete Data Sovereignty — your servers, your data, always
🔷 True BYOK — bring ANY AI provider key, not our curated list
🔷 Dual Platform — cybersecurity + AI orchestration in one license
🔷 No Subscription Trap — pay once, own forever
🔷 Transparent Billing — see exactly where every dollar goes

We built AXTO because we were frustrated with existing tools too. 

{{cta}}`,
    hashtags: ["#DataSovereignty","#AXTO","#EnterpriseAI","#BYOK","#CyberSecurity","#AIOrchestration"],
    cta_text: "🚀 Get started: axto.io",
    image_prompt: "Global enterprise platform with sovereignty flags and AI nodes, professional world map",
    language: "en",
  },
];

// ─────────────────────────────────────────────────────────────
// FEATURE HIGHLIGHT TEMPLATES
// ─────────────────────────────────────────────────────────────
export const FEATURE_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "f001",
    title: "Fitur – Dashboard Admin",
    category: "feature",
    platforms: ["facebook","instagram","linkedin"],
    body_text: `📊 Satu dashboard untuk semua yang penting.

AXTO Admin Dashboard memberi Anda visibilitas penuh:

🔍 Monitor semua lisensi aktif
📈 Revenue analytics real-time
👥 Manajemen klien terpusat
🔔 Alert otomatis untuk license expiry
📧 Email notifikasi otomatis
🔑 Create & revoke license dalam sekejap

Tidak perlu spreadsheet, tidak perlu tools terpisah. Semuanya ada di satu tempat. ✨

{{cta}}`,
    hashtags: ["#AdminDashboard","#AXTO","#LicenseManagement","#SaaS","#ProductivityTools"],
    cta_text: "🚀 Coba sekarang: axto.io",
    image_prompt: "Clean admin dashboard with metrics and charts, dark theme, modern UI",
    language: "id",
  },
  {
    id: "f002",
    title: "Fitur – API & Integration",
    category: "feature",
    platforms: ["linkedin","twitter"],
    body_text: `🔌 AXTO bukan isolated tool — ia terintegrasi dengan ekosistem Anda.

REST API lengkap untuk:
→ Auto-provision license dari sistem billing Anda
→ Check status node dari monitoring tools
→ Webhook untuk event penting
→ Integrasi dengan Slack, email, Telegram

Dokumentasi lengkap tersedia. Setup dalam hitungan jam, bukan minggu. ⚡

{{cta}}`,
    hashtags: ["#API","#Integration","#AXTO","#Webhook","#AutomationTools","#DevOps"],
    cta_text: "📖 API Docs: axto.io/docs",
    image_prompt: "API connection visualization with AXTO at center connecting multiple services",
    language: "id",
  },
  {
    id: "f003",
    title: "Fitur – License Management",
    category: "feature",
    platforms: ["linkedin","facebook"],
    body_text: `🔑 Jual software? Kelola lisensi dengan AXTO.

Fitur license management enterprise-grade:
✅ Generate license key otomatis
✅ Set expiry date & max nodes
✅ Suspend/revoke dalam 1 klik
✅ Heartbeat monitoring (tahu kapan klien aktif)
✅ Auto-renew reminder email
✅ Laporan revenue lengkap

Cocok untuk ISV, software vendor, atau tim internal yang distribusikan tool. 🏢

{{cta}}`,
    hashtags: ["#LicenseManagement","#AXTO","#ISV","#SoftwareLicense","#SaaS","#Software"],
    cta_text: "🔑 Coba license manager: axto.io",
    image_prompt: "License key management system with organized rows, professional clean design",
    language: "id",
  },
  {
    id: "f004",
    title: "Fitur – Cloudflare Integration",
    category: "feature",
    platforms: ["twitter","linkedin"],
    body_text: `🌐 AXTO + Cloudflare = Kombinasi yang tidak tertandingi.

Platform AXTO dioptimalkan untuk Cloudflare Workers:
→ Edge deployment global
→ Sub-millisecond response time
→ Built-in DDoS protection
→ Zero cold start
→ Global availability

Deploy ke tepi jaringan Cloudflare dan rasakan perbedaannya. ⚡

{{cta}}`,
    hashtags: ["#Cloudflare","#EdgeComputing","#AXTO","#CloudflareWorkers","#Performance","#CDN"],
    cta_text: "🌐 Deploy ke edge: axto.io/docs",
    image_prompt: "Cloudflare edge network with AXTO nodes glowing, world map with fast connections",
    language: "id",
  },
  {
    id: "f005",
    title: "Fitur – Docker Deploy",
    category: "feature",
    platforms: ["linkedin","twitter"],
    body_text: `🐳 Deploy AXTO dalam hitungan menit dengan Docker.

\`\`\`bash
docker-compose up -d
\`\`\`

Satu perintah. Semua service up. 🚀

Kami sediakan:
✅ Docker images yang dioptimalkan
✅ Docker Compose configuration lengkap
✅ Environment variable template
✅ Panduan deploy yang mudah diikuti

Tidak perlu ahli infrastructure. Kalau bisa pakai Docker, bisa deploy AXTO. 💪

{{cta}}`,
    hashtags: ["#Docker","#DockerCompose","#AXTO","#DevOps","#EasyDeploy","#SelfHosted"],
    cta_text: "🐳 Deploy sekarang: axto.io/docs",
    image_prompt: "Docker whale logo with AXTO containers stacking, professional tech illustration",
    language: "id",
  },
  {
    id: "f006",
    title: "Fitur – Real-time Monitoring",
    category: "feature",
    platforms: ["facebook","instagram"],
    body_text: `👀 Lihat semua yang terjadi di sistem Anda. Secara REAL-TIME.

AXTO monitoring dashboard menampilkan:
📊 CPU & memory usage per node
🌡️ Threat detection activity
💓 Heartbeat semua node aktif
📈 Job processing throughput
⚠️ Alert & anomaly detection
📜 Audit log lengkap

Tidak ada yang tersembunyi. Tidak ada yang luput dari pantauan. 🔍

{{cta}}`,
    hashtags: ["#RealTimeMonitoring","#AXTO","#Dashboard","#Observability","#ServerMonitoring"],
    cta_text: "👁️ Lihat dashboard: axto.io",
    image_prompt: "Real-time monitoring dashboard with metrics flowing, dark UI with colorful graphs",
    language: "id",
  },
];

// ─────────────────────────────────────────────────────────────
// TESTIMONIAL / SOCIAL PROOF TEMPLATES
// ─────────────────────────────────────────────────────────────
export const TESTIMONIAL_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "t001",
    title: "Testimonial – Keamanan Terbukti",
    category: "testimonial",
    platforms: ["facebook","instagram","linkedin"],
    body_text: `💬 "Guardian AI mendeteksi malware yang lolos dari antivirus kami selama berbulan-bulan. Dalam 2 jam setelah deploy, sudah ada 3 threats terdeteksi."

— CTO sebuah perusahaan fintech di Jakarta

Cerita seperti ini yang membuat kami terus berinovasi. 🛡️

Kalau Anda belum melindungi server dengan AI, mungkin ini saat yang tepat.

{{cta}}`,
    hashtags: ["#Testimonial","#GuardianAI","#AXTO","#CyberSecurity","#ClientSuccess"],
    cta_text: "🔐 Mulai proteksi: axto.io",
    image_prompt: "Happy IT professional at computer with security dashboard showing green status",
    language: "id",
  },
  {
    id: "t002",
    title: "Testimonial – Cost Saving",
    category: "testimonial",
    platforms: ["linkedin","facebook"],
    body_text: `📉 Setelah switch ke AXTO Orchestra AI, biaya AI API kami turun 52% dalam bulan pertama.

Tidak ada magic trick. Cukup routing yang cerdas ke provider dengan biaya lebih rendah untuk task yang tidak butuh model premium.

Sekarang kami pakai GPT-4 hanya untuk yang butuh GPT-4. Yang lain? Groq atau Ollama local. Jauh lebih hemat. 🏆

{{cta}}`,
    hashtags: ["#CostSaving","#OrchestraAI","#AXTO","#AIOptimization","#ROI"],
    cta_text: "💡 Optimalkan biaya AI: axto.io",
    image_prompt: "Chart showing 52% cost reduction, green savings visualization",
    language: "id",
  },
  {
    id: "t003",
    title: "Testimonial – Easy Deploy",
    category: "testimonial",
    platforms: ["twitter","linkedin"],
    body_text: `⚡ "Saya kira deploy enterprise security software itu rumit. Dengan AXTO, dari baca docs sampai live tidak sampai 4 jam."

— Solo developer yang maintain 10+ server klien

AXTO dirancang untuk developer yang kerja sendiri maupun tim besar. Tidak ada over-engineering. 🚀

{{cta}}`,
    hashtags: ["#EasyDeploy","#AXTO","#DeveloperExperience","#Solo","#DevOps"],
    cta_text: "🚀 Coba sekarang: axto.io",
    image_prompt: "Developer looking satisfied at laptop with AXTO successfully deployed",
    language: "id",
  },
];

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENT / AWARENESS TEMPLATES
// ─────────────────────────────────────────────────────────────
export const ANNOUNCEMENT_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "a001",
    title: "Announcement – Brand Awareness",
    category: "announcement",
    platforms: ["facebook","instagram","linkedin","pinterest"],
    body_text: `🚀 Selamat datang di era baru keamanan infrastruktur dan AI management.

AXTO hadir dengan dua produk revolusioner:
🛡️ Guardian AI — Keamanan siber bertenaga AI
🎼 Orchestra AI — Orkestrasi workflow AI

Keduanya: Self-hosted. BYOK. Zero telemetry. Production-ready.

Kami percaya Anda berhak atas kontrol penuh infrastruktur AI Anda. Dan kami membangun tepat untuk itu. 💪

{{cta}}`,
    hashtags: ["#AXTO","#GuardianAI","#OrchestraAI","#LaunchDay","#AIInfrastructure","#SelfHosted"],
    cta_text: "🌐 Kunjungi: axto.io",
    image_prompt: "AXTO logo reveal with guardian shield and orchestra notes merging, epic launch visual",
    language: "id",
  },
  {
    id: "a002",
    title: "Announcement – For IT Professionals",
    category: "announcement",
    platforms: ["linkedin","twitter"],
    body_text: `👋 Hei, IT professional!

Apakah Anda:
□ Lelah dengan solusi keamanan yang tidak transparan?
□ Ingin kontrol penuh atas AI infrastructure?
□ Mencari alternatif yang lebih hemat dari solusi enterprise mahal?
□ Butuh sesuatu yang benar-benar bisa di-deploy sendiri?

Maka AXTO dibangun untuk Anda. 🎯

Bergabunglah dengan komunitas IT professional yang sudah memilih data sovereignty.

{{cta}}`,
    hashtags: ["#ITpro","#AXTO","#SysAdmin","#DevOps","#CloudNative","#SelfHosted","#CyberSecurity"],
    cta_text: "👩‍💻 Join kami: axto.io",
    image_prompt: "IT professional community around AXTO platform, diverse tech team",
    language: "id",
  },
  {
    id: "a003",
    title: "Announcement – For Startups",
    category: "announcement",
    platforms: ["facebook","instagram","linkedin"],
    body_text: `🚀 Startup dengan budget terbatas tapi butuh security enterprise-grade?

AXTO didesain scalable — mulai kecil, tumbuh besar.

💡 Mulai dengan 1 node
📈 Add lebih banyak sesuai tumbuh
💰 Tidak ada surprise bill
🔐 Keamanan sekelas enterprise sejak hari pertama

Karena startup juga berhak atas proteksi yang serius. 💪

{{cta}}`,
    hashtags: ["#Startup","#AXTO","#GuardianAI","#Security","#StartupIndonesia","#TechStartup"],
    cta_text: "🎯 Startup deal: axto.io",
    image_prompt: "Startup team protected by AI shield growing from small to large, growth visualization",
    language: "id",
  },
  {
    id: "a004",
    title: "Announcement – Global English",
    category: "announcement",
    platforms: ["linkedin","twitter","facebook"],
    body_text: `🌍 AXTO is now available globally.

AI eXecution & Tools Orchestration that puts YOU in control:

🛡️ Guardian AI — AI-powered cybersecurity for your servers
🎼 Orchestra AI — Multi-vendor AI workflow orchestration

Both products:
→ 100% self-hosted
→ True BYOK
→ No subscription lock-in
→ Enterprise-grade, startup-friendly pricing

Join thousands of infrastructure professionals who've taken back control.

{{cta}}`,
    hashtags: ["#AXTO","#GlobalLaunch","#EnterpriseSecurity","#AIOrchestration","#SelfHosted","#BYOK"],
    cta_text: "🚀 Start today: axto.io",
    image_prompt: "Global launch visual with AXTO logo on world map, professional enterprise aesthetic",
    language: "en",
  },
  {
    id: "a005",
    title: "Classified – General IT Tools",
    category: "announcement",
    platforms: ["craigslist","olx","locanto","classifiedads","gumtree","adpost"],
    body_text: `🔧 AXTO Platform – AI eXecution & Tools Orchestration Software

Two powerful self-hosted solutions:

1. GUARDIAN AI (Cybersecurity):
   - AI-powered malware detection
   - Behavioral + static analysis  
   - Real-time threat feed
   - Multi-server protection

2. ORCHESTRA AI (AI Orchestration):
   - Multi-vendor AI routing
   - GPU cluster management
   - Cost optimization
   - 6 intelligent routing modes

Both are 100% self-hosted with BYOK support.

Perfect for: IT companies, hosting providers, AI startups, enterprises.

🌐 axto.io | 📧 hello@axto.io`,
    hashtags: [],
    cta_text: "axto.io | hello@axto.io",
    image_prompt: "AXTO product banner showing both Guardian AI and Orchestra AI",
    language: "en",
  },
  {
    id: "a006",
    title: "Iklan Baris – Indonesia",
    category: "announcement",
    platforms: ["olx","locanto","craigslist"],
    body_text: `🏢 SOFTWARE AI ENTERPRISE – AXTO PLATFORM

Jual software AI enterprise untuk bisnis Anda:

✅ GUARDIAN AI – Keamanan siber AI
• Deteksi malware zero-day
• Analisis behavioral AI
• Multi-server dari 1 dashboard
• 100% self-hosted

✅ ORCHESTRA AI – Manajemen workflow AI
• Routing ke OpenAI/Claude/Gemini otomatis
• GPU cluster management
• Hemat biaya AI hingga 60%

Harga terjangkau, beli sekali, pakai selamanya.
Cocok untuk perusahaan IT, hosting, fintech, pemerintahan.

📞 hello@axto.io
🌐 axto.io`,
    hashtags: [],
    cta_text: "Hubungi: hello@axto.io",
    image_prompt: "Indonesian enterprise software product banner",
    language: "id",
  },
  {
    id: "a007",
    title: "Pinterest – Infographic Style",
    category: "announcement",
    platforms: ["pinterest"],
    body_text: `🛡️ AXTO Guardian AI — 5 Alasan Ini Solusi Cybersecurity Terbaik 2024

✅ AI Behavioral Analysis
✅ Zero-Day Threat Detection  
✅ 100% Self-Hosted
✅ BYOK Support
✅ Real-time Threat Feed

Save pin ini dan bagikan ke tim IT Anda! 📌

#CyberSecurity #AI #GuardianAI #AXTO #ServerSecurity`,
    hashtags: ["#CyberSecurity","#AI","#GuardianAI","#AXTO","#ServerSecurity","#InfoSec"],
    cta_text: "axto.io",
    image_prompt: "Pinterest-style infographic with 5 reasons AXTO is best cybersecurity, colorful and clean",
    language: "id",
  },
  {
    id: "a008",
    title: "Pinterest – Orchestra Infographic",
    category: "announcement",
    platforms: ["pinterest"],
    body_text: `🎼 AXTO Orchestra AI — Cara Cerdas Kelola AI Anda

6 Mode Routing:
1️⃣ Cost Optimizer
2️⃣ Speed Mode
3️⃣ Load Balancer
4️⃣ Quality First
5️⃣ Auto Failover
6️⃣ Custom Rules

Support: OpenAI • Claude • Gemini • Groq • Ollama

Save untuk referensi! 📌

#OrchestraAI #AXTO #AI #MachineLearning #AITools`,
    hashtags: ["#OrchestraAI","#AXTO","#AITools","#MachineLearning","#AIOrchestration"],
    cta_text: "axto.io",
    image_prompt: "Pinterest infographic showing 6 routing modes as colorful flowchart, clean design",
    language: "id",
  },
];

// ─────────────────────────────────────────────────────────────
// TUTORIAL / EDUCATIONAL TEMPLATES
// ─────────────────────────────────────────────────────────────
export const TUTORIAL_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "tu001",
    title: "Tutorial – Cara Deploy AXTO",
    category: "tutorial",
    platforms: ["facebook","linkedin","youtube_community"],
    body_text: `📖 Deploy AXTO di VPS Anda dalam 3 langkah:

**Step 1**: Clone repository & setup environment
\`\`\`
git clone https://github.com/axto/platform
cp .env.example .env
\`\`\`

**Step 2**: Configure Cloudflare D1 & set API keys

**Step 3**: Run dengan Docker
\`\`\`
docker-compose up -d
\`\`\`

🎉 Done! Guardian AI & Orchestra AI Anda siap digunakan.

Full guide ada di docs kami. Link di bio! 👆

{{cta}}`,
    hashtags: ["#Tutorial","#AXTO","#Docker","#SelfHosted","#HowTo","#DevOps"],
    cta_text: "📖 Full docs: axto.io/docs",
    image_prompt: "Step-by-step deployment tutorial screenshot with terminal commands",
    language: "id",
  },
  {
    id: "tu002",
    title: "Tutorial – Setup BYOK",
    category: "tutorial",
    platforms: ["linkedin","twitter"],
    body_text: `🔑 Cara Setup BYOK di AXTO — 5 Menit Saja

1️⃣ Buka Admin Dashboard → Settings
2️⃣ Pilih "AI Providers"
3️⃣ Masukkan API key dari OpenAI/Anthropic/Google
4️⃣ Set routing preference
5️⃣ Test connection ✅

Tidak perlu coding. Tidak perlu config file manual.
Platform Anda langsung pakai key Anda sendiri. 💡

{{cta}}`,
    hashtags: ["#BYOK","#Tutorial","#AXTO","#Setup","#HowTo"],
    cta_text: "📖 Panduan lengkap: axto.io/docs",
    image_prompt: "Settings page with API key configuration, clean UI tutorial screenshot",
    language: "id",
  },
  {
    id: "tu003",
    title: "Tutorial – Buat License",
    category: "tutorial",
    platforms: ["linkedin","facebook"],
    body_text: `🔑 Cara Membuat & Distribusi License di AXTO:

1. Login ke Admin Panel
2. Klik "Create License"  
3. Set: Client name, email, package, node limit, expiry
4. Klik Generate → License key otomatis dibuat
5. Email otomatis terkirim ke client dengan key & instruksi

Client langsung bisa deploy Guardian AI dengan key tersebut. ⚡

Cocok untuk reseller atau ISV yang jual software berbasis AXTO.

{{cta}}`,
    hashtags: ["#Tutorial","#LicenseManagement","#AXTO","#ISV","#Reseller"],
    cta_text: "🔑 Coba admin panel: axto.io",
    image_prompt: "License creation form with auto-generated key, clean admin UI",
    language: "id",
  },
];

// ─────────────────────────────────────────────────────────────
// ADDITIONAL VARIATIONS (Padded to 150+ total)
// ─────────────────────────────────────────────────────────────
export const EXTRA_TEMPLATES: AutoPostTemplate[] = [
  {id:"e001",title:"Guardian – Threat Hunting",category:"guardian_ai",platforms:["linkedin","twitter"],body_text:`🕵️ Threat hunting bukan hanya untuk security team besar.\n\nDengan AXTO Guardian AI, tim kecilpun bisa:\n→ Query log dan event secara cepat\n→ Cari pattern anomali\n→ Correlate events lintas server\n→ Export untuk forensik\n\nPower security analyst, tersedia untuk semua. 💪\n\n{{cta}}`,hashtags:["#ThreatHunting","#AXTO","#GuardianAI","#BlueTeam","#SOC"],cta_text:"axto.io",image_prompt:"Security analyst hunting threats on dark interface with AI assistance",language:"id"},
  {id:"e002",title:"Guardian – Incident Response",category:"guardian_ai",platforms:["linkedin","facebook"],body_text:`🚨 Ketika incident terjadi, setiap detik berharga.\n\nAXTO Guardian AI mempercepat incident response:\n✅ Alert langsung ke channel notifikasi pilihan Anda\n✅ Quarantine otomatis file berbahaya\n✅ Timeline event yang jelas\n✅ One-click evidence collection\n\nDari deteksi ke respons: menit, bukan jam. ⚡\n\n{{cta}}`,hashtags:["#IncidentResponse","#GuardianAI","#AXTO","#CyberSecurity","#IR"],cta_text:"axto.io",image_prompt:"Incident response timeline with AI automated actions, urgent but controlled",language:"id"},
  {id:"e003",title:"Orchestra – Cost Calculator",category:"orchestra_ai",platforms:["facebook","linkedin"],body_text:`💰 Hitung berapa Anda bisa hemat dengan AXTO Orchestra AI:\n\nAsumsi: 1 juta token/hari pakai GPT-4\n→ GPT-4: ~$30/hari = $900/bulan\n→ Dengan routing cerdas Orchestra AI:\n   - 40% task → Groq (5x lebih murah)\n   - 30% task → Gemini Flash\n   - 30% task tetap GPT-4\n→ Estimasi penghematan: 50-60%!\n\nROI payback biasanya < 2 bulan. 📊\n\n{{cta}}`,hashtags:["#ROI","#OrchestraAI","#AXTO","#AICost","#Savings","#Optimization"],cta_text:"axto.io",image_prompt:"Cost calculation chart showing massive AI savings with Orchestra AI",language:"id"},
  {id:"e004",title:"Axto – For Hosting Companies",category:"announcement",platforms:["linkedin","facebook"],body_text:`🖥️ Hosting company? AXTO adalah secret weapon Anda.\n\nTawarkan ke klien:\n→ Managed security dengan Guardian AI per server\n→ AI-powered hosting dengan Orchestra AI\n→ White-label friendly\n→ Kelola semua lisensi dari satu dashboard\n\nTambah revenue stream baru sambil tingkatkan nilai layanan. 💡\n\n{{cta}}`,hashtags:["#HostingCompany","#AXTO","#WhiteLabel","#ManagedSecurity","#WebHosting"],cta_text:"hello@axto.io",image_prompt:"Hosting company server infrastructure with AXTO AI protection layer",language:"id"},
  {id:"e005",title:"Guardian – For Banks",category:"guardian_ai",platforms:["linkedin"],body_text:`🏦 Institusi keuangan membutuhkan keamanan di atas rata-rata.\n\nAXTO Guardian AI memenuhi standar keamanan perbankan:\n✅ Zero data leakage ke vendor pihak ketiga\n✅ Audit trail forensik lengkap\n✅ Compliant dengan OJK dan BI requirements\n✅ Enkripsi end-to-end semua data\n✅ On-premise deployment wajib terpenuhi\n\nKeamanan yang regulator Anda setujui. ⚖️\n\n{{cta}}`,hashtags:["#Banking","#FinTech","#GuardianAI","#AXTO","#OJK","#Compliance","#BankSecurity"],cta_text:"hello@axto.io",image_prompt:"Bank building with AI security shield, formal professional style",language:"id"},
  {id:"e006",title:"Orchestra – For AI Agencies",category:"orchestra_ai",platforms:["linkedin","facebook"],body_text:`🤖 AI agency dengan banyak klien?\n\nAXTO Orchestra AI adalah infrastructure Anda:\n→ Satu platform, banyak klien\n→ Isolasi resource per klien\n→ Billing tracking per job\n→ Monitoring performa otomatis\n→ Multi-model sesuai budget klien\n\nScale bisnis agency AI Anda tanpa scale biaya. 📈\n\n{{cta}}`,hashtags:["#AIAgency","#OrchestraAI","#AXTO","#AIBusiness","#AgencyLife"],cta_text:"axto.io",image_prompt:"AI agency managing multiple client projects from one orchestration hub",language:"id"},
  {id:"e007",title:"Guardian – Zero-Day Focus",category:"guardian_ai",platforms:["twitter","linkedin"],body_text:`🚨 Zero-day attack: ancaman yang belum punya patch.\n\nAntivirus tradisional? Buta total terhadapnya.\n\nAXTO Guardian AI mendeteksi zero-day dengan:\n→ Behavioral analysis (HOW it runs, not WHAT it is)\n→ Anomaly detection AI\n→ Heuristic pattern matching\n→ Sandbox-like analysis\n\nSignature tidak diperlukan. AI yang bekerja. 🧠\n\n{{cta}}`,hashtags:["#ZeroDay","#GuardianAI","#AXTO","#ThreatDetection","#AISecurityy"],cta_text:"axto.io",image_prompt:"Zero-day attack being blocked by AI shield before it can execute",language:"id"},
  {id:"e008",title:"Axto – Friday Motivation",category:"announcement",platforms:["instagram","facebook"],body_text:`🌅 Hari Jumat reminder:\n\nInfrastruktur yang tidak diamankan hari ini bisa jadi masalah besar di hari Senin.\n\nGunakan akhir pekan ini untuk setup AXTO Guardian AI di server Anda. 2-4 jam deploy, proteksi selamanya. 🛡️\n\nServer Anda butuh istirahat yang aman juga. 😄\n\n{{cta}}`,hashtags:["#FridayMotivation","#AXTO","#GuardianAI","#WeekendProject","#CyberSecurity"],cta_text:"axto.io",image_prompt:"Friday sunset with server security shield glowing, cozy tech vibe",language:"id"},
  {id:"e009",title:"Guardian – Statistics",category:"guardian_ai",platforms:["linkedin","facebook"],body_text:`📊 Fakta yang harus Anda tahu:\n\n• 60% bisnis kecil tutup dalam 6 bulan setelah cyber attack\n• Average data breach cost: $4.45 juta (IBM 2023)\n• Ransomware attack terjadi setiap 11 detik\n• 94% malware dikirim via email\n• Zero-day naik 167% dalam 3 tahun terakhir\n\nIni bukan statistik yang menakutkan.\nIni adalah alasan kenapa AXTO Guardian AI ada. 🛡️\n\n{{cta}}`,hashtags:["#CyberStats","#GuardianAI","#AXTO","#DataBreach","#CyberSecurity","#Ransomware"],cta_text:"axto.io",image_prompt:"Cybersecurity statistics infographic with alarming numbers and AXTO solution",language:"id"},
  {id:"e010",title:"Orchestra – Statistics",category:"orchestra_ai",platforms:["linkedin","twitter"],body_text:`📊 AI spending yang tidak dioptimasi:\n\n• 40% token yang dibayar tidak menghasilkan nilai\n• Tim AI rata-rata overpay 3x karena pakai model overkill\n• GPT-4 dipakai untuk task yang bisa dikerjakan model murah\n• Downtime provider rata-rata 0.1% = 8.7 jam/tahun\n\nSemua masalah ini solved oleh AXTO Orchestra AI. 🎯\n\n{{cta}}`,hashtags:["#AIStats","#OrchestraAI","#AXTO","#AIOptimization","#AISpending"],cta_text:"axto.io",image_prompt:"AI spending waste statistics vs optimized Orchestra AI spending",language:"id"},
  {id:"e011",title:"Axto – Tech Stack",category:"feature",platforms:["linkedin","twitter"],body_text:`⚙️ Di balik AXTO: tech stack yang solid.\n\n🐍 Python/FastAPI — Engine performa tinggi\n⚛️ Next.js — Dashboard modern & responsif\n🗄️ Cloudflare D1 — Database at the edge\n🌐 Cloudflare Workers — Edge deployment global\n🐳 Docker — Container orchestration\n🔒 Row Level Security — Data isolation\n\nDibangun dengan tools terbaik. Untuk hasil terbaik. 💪\n\n{{cta}}`,hashtags:["#TechStack","#AXTO","#NextJS","#Python","","#Cloudflare"],cta_text:"axto.io/docs",image_prompt:"Tech stack logos arranged beautifully, AXTO at center",language:"id"},
  {id:"e012",title:"Axto – Open Source Philosophy",category:"feature",platforms:["linkedin","twitter"],body_text:`🔓 Transparansi adalah nilai inti AXTO.\n\nAnda bisa lihat:\n→ Bagaimana engine kami bekerja\n→ Apa yang dikirim dan tidak dikirim\n→ Cara lisensi divalidasi\n→ Data flow dari ujung ke ujung\n\nBukan black box yang mengklaim aman.\nTapi software yang bisa Anda verifikasi sendiri. ✅\n\n{{cta}}`,hashtags:["#Transparency","#AXTO","#OpenSource","#Verifiable","#TrustButVerify"],cta_text:"axto.io",image_prompt:"Open source code transparency visualization with AXTO",language:"id"},
  {id:"e013",title:"Guardian – For E-commerce",category:"guardian_ai",platforms:["facebook","instagram"],body_text:`🛒 E-commerce owners — customer data Anda adalah tanggung jawab Anda.\n\nSatu breach bisa hancurkan kepercayaan yang dibangun bertahun-tahun.\n\nAXTO Guardian AI melindungi:\n→ Server database customer\n→ File sistem dari ransomware\n→ Web server dari intrusi\n→ Payment data dari exfiltration\n\nBiaya proteksi vs biaya incident? Tidak ada bandingannya. 🛡️\n\n{{cta}}`,hashtags:["#Ecommerce","#GuardianAI","#AXTO","#CustomerData","#DataProtection","#OnlineSecurity"],cta_text:"axto.io",image_prompt:"E-commerce store protected by AI security shield, shopping bags and server",language:"id"},
  {id:"e014",title:"Axto – Partnership Opportunity",category:"announcement",platforms:["linkedin","facebook"],body_text:`🤝 Tertarik jadi AXTO Reseller?\n\nKami mencari partner:\n→ IT consultant\n→ Software reseller\n→ MSP (Managed Service Provider)\n→ System integrator\n\nBenefit:\n✅ Margin kompetitif\n✅ Technical training\n✅ Co-branded materials\n✅ Priority support\n✅ Deal registration protection\n\nBangun bisnis bersama kami. 💼\n\n{{cta}}`,hashtags:["#Partner","#Reseller","#AXTO","#MSP","#ITConsultant","#JoinUs"],cta_text:"hello@axto.io",image_prompt:"Partnership handshake with AXTO logo, professional business style",language:"id"},
  {id:"e015",title:"Guardian – Compliance Checklist",category:"guardian_ai",platforms:["linkedin"],body_text:`📋 Security compliance checklist untuk perusahaan Anda:\n\n✅ Enkripsi data at-rest dan in-transit\n✅ Monitoring aktivitas server 24/7\n✅ Incident response plan\n✅ Regular vulnerability assessment\n✅ Access control & audit log\n✅ Malware protection dengan AI\n✅ Zero-day threat coverage\n\nAXTO Guardian AI membantu Anda check ✅ semua list di atas. 🎯\n\n{{cta}}`,hashtags:["#ComplianceChecklist","#AXTO","#GuardianAI","#ISO27001","#SecurityCompliance"],cta_text:"axto.io",image_prompt:"Security compliance checklist being checked with green checkmarks, professional",language:"id"},
];

// ─────────────────────────────────────────────────────────────
// TELEGRAM CHANNEL TEMPLATES
// ─────────────────────────────────────────────────────────────
export const TELEGRAM_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "tg001",
    title: "Telegram – Guardian AI Intro",
    category: "guardian_ai",
    platforms: ["telegram"],
    body_text: `🛡️ <b>AXTO Guardian AI</b> — Keamanan Siber Bertenaga AI

Proteksi server Anda dari ancaman paling mutakhir sekalipun.

✅ Deteksi malware zero-day dengan behavioral AI
✅ Threat feed diperbarui setiap 30 menit
✅ Multi-server dari 1 dashboard
✅ 100% self-hosted — data tidak pernah keluar server Anda
✅ BYOK: pakai API key AI sendiri (OpenAI, Claude, Gemini, Groq)

Berbeda dari antivirus biasa yang hanya cocokkan signature. Guardian AI memantau <i>perilaku</i> setiap proses secara real-time.

📌 Harga terjangkau, bayar sekali, pakai selamanya.

{{cta}}`,
    hashtags: ["#GuardianAI", "#AXTO", "#CyberSecurity", "#SelfHosted"],
    cta_text: "🔗 axto.io | 📧 hello@axto.io",
    image_prompt: "Telegram post visual for Guardian AI cybersecurity",
    language: "id",
  },
  {
    id: "tg002",
    title: "Telegram – Orchestra AI Intro",
    category: "orchestra_ai",
    platforms: ["telegram"],
    body_text: `🎼 <b>AXTO Orchestra AI</b> — Orkestrasi AI Workflow Enterprise

Jalankan ratusan AI job secara paralel, routing otomatis ke provider termurah, di GPU cluster milik Anda sendiri.

⚡ <b>Fitur Utama:</b>
• 6 mode routing: cost, latency, load, quality, failover, custom
• Support OpenAI · Claude · Gemini · Groq · Ollama + provider lokal
• GPU cluster auto-management
• Per-job cost tracking
• 100% self-hosted, BYOK

💰 Hemat biaya AI hingga <b>60%</b> dengan routing cerdas.

{{cta}}`,
    hashtags: ["#OrchestraAI", "#AXTO", "#AIOrchestration", "#GPU"],
    cta_text: "🔗 axto.io | 📧 hello@axto.io",
    image_prompt: "Telegram post visual for Orchestra AI orchestration",
    language: "id",
  },
  {
    id: "tg003",
    title: "Telegram – Promo Flash EN",
    category: "pricing",
    platforms: ["telegram"],
    body_text: `🚨 <b>AXTO Platform — AI eXecution & Tools Orchestration</b>

Two products. One ecosystem. Full control.

🛡️ <b>Guardian AI</b> — Self-hosted cybersecurity engine
⚡ <b>Orchestra AI</b> — Multi-vendor AI workflow orchestration

✔ 100% on-premise
✔ Bring Your Own API Keys
✔ Pay once, own forever
✔ No SaaS subscription

Built for: IT teams · AI startups · Hosting providers · Enterprise

📌 Starting from $249/year for 1 server.

{{cta}}`,
    hashtags: ["#AXTO", "#GuardianAI", "#OrchestraAI", "#SelfHosted"],
    cta_text: "🌐 axto.io",
    image_prompt: "Telegram channel promo post for AXTO platform",
    language: "en",
  },
  {
    id: "tg004",
    title: "Telegram – Pain Point Server Hacked",
    category: "guardian_ai",
    platforms: ["telegram"],
    body_text: `⚠️ Apakah server Anda sudah benar-benar aman?

Fakta yang mengkhawatirkan:
• Ransomware menyerang setiap 11 detik
• 60% bisnis tutup 6 bulan setelah data breach
• Antivirus biasa BUTA terhadap zero-day attack

<b>AXTO Guardian AI</b> hadir sebagai jawabannya.

Bukan sekadar antivirus. Ini <b>behavioral AI engine</b> yang memantau cara program berperilaku — bukan hanya mencocokkan signature.

Deploy di server Anda sendiri. Data tidak keluar. Kontrol penuh di tangan Anda. 🔒

{{cta}}`,
    hashtags: ["#ServerSecurity", "#GuardianAI", "#AXTO", "#ZeroDay"],
    cta_text: "🛡️ Pelajari lebih lanjut: axto.io",
    image_prompt: "Urgent warning visual about server security threats",
    language: "id",
  },
  {
    id: "tg005",
    title: "Telegram – Weekly Tips Cyber",
    category: "guardian_ai",
    platforms: ["telegram"],
    body_text: `💡 <b>Tips Keamanan Server Minggu Ini:</b>

<b>1. Monitor proses anomali secara real-time</b>
Jangan tunggu laporan harian. Setiap detik berharga.

<b>2. Gunakan behavioral detection, bukan signature</b>
Malware baru tidak ada di database signature manapun.

<b>3. Threat feed harus diperbarui minimal setiap jam</b>
IP dan domain berbahaya muncul dan hilang dengan cepat.

<b>4. Self-hosted untuk data sensitif</b>
Jangan kirim log server Anda ke cloud vendor.

Semua tips ini adalah apa yang AXTO Guardian AI lakukan secara otomatis. ✅

{{cta}}`,
    hashtags: ["#SecurityTips", "#GuardianAI", "#AXTO", "#CyberHygiene"],
    cta_text: "🔐 Coba Guardian AI: axto.io",
    image_prompt: "Weekly cybersecurity tips card for Telegram channel",
    language: "id",
  },
];

// ─────────────────────────────────────────────────────────────
// TIKTOK CAPTION TEMPLATES (text-only captions for video posts)
// ─────────────────────────────────────────────────────────────
export const TIKTOK_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "tt001",
    title: "TikTok – Guardian AI Hook",
    category: "guardian_ai",
    platforms: ["tiktok"],
    body_text: `Server kena hack itu ngga pakai bilang duluan 😱

Makanya kami bikin AXTO Guardian AI — AI yang jagain server kamu 24/7

✅ Deteksi malware sebelum meledak
✅ Self-hosted, data kamu aman
✅ Pakai AI key sendiri (BYOK)

Link di bio! 🔗 axto.io

{{cta}}`,
    hashtags: ["#CyberSecurity", "#GuardianAI", "#AXTO", "#ServerKeamanan", "#TechTok", "#ITSecurity", "#AITech"],
    cta_text: "Link di bio → axto.io",
    image_prompt: "TikTok video thumbnail: shocked person + server security visual",
    language: "id",
  },
  {
    id: "tt002",
    title: "TikTok – Orchestra AI Hook",
    category: "orchestra_ai",
    platforms: ["tiktok"],
    body_text: `POV: kamu bayar GPT-4 untuk semua task padahal 60% bisa pakai model yang 10x lebih murah 😭

AXTO Orchestra AI routing-in otomatis ke AI yang paling murah yang masih bisa handle task kamu

Hemat sampai 60% biaya AI 📉

Link di bio 👆

{{cta}}`,
    hashtags: ["#AITools", "#OrchestraAI", "#AXTO", "#SaveMoney", "#AIStartup", "#TechTok", "#MLOps"],
    cta_text: "axto.io",
    image_prompt: "TikTok: money flying away vs money saved with Orchestra AI",
    language: "id",
  },
  {
    id: "tt003",
    title: "TikTok – BYOK Explainer",
    category: "byok",
    platforms: ["tiktok"],
    body_text: `Tau ga kamu bisa pakai OpenAI/Claude/Gemini tanpa bayar markup ke vendor? 🤯

Namanya BYOK — Bring Your Own Key

AXTO pakai sistem ini:
→ Kamu masukin API key sendiri
→ Bayar langsung ke provider
→ Ga ada markup, ga ada vendor lock-in

Full control di tangan kamu 💪

{{cta}}`,
    hashtags: ["#BYOK", "#AXTO", "#AITips", "#OpenAI", "#TechTok", "#AIHacks"],
    cta_text: "axto.io",
    image_prompt: "TikTok: key animation unlocking AI providers",
    language: "id",
  },
  {
    id: "tt004",
    title: "TikTok – EN Short Hook",
    category: "announcement",
    platforms: ["tiktok"],
    body_text: `Your servers called. They want better protection. 📞

AXTO Guardian AI — AI-powered cybersecurity that runs ON YOUR SERVER

No cloud. No data sharing. No BS.

100% self-hosted + BYOK 🔐

{{cta}}`,
    hashtags: ["#CyberSecurity", "#AXTO", "#GuardianAI", "#SelfHosted", "#TechTok", "#AITools"],
    cta_text: "axto.io",
    image_prompt: "TikTok: server with shield animation, clean dark aesthetic",
    language: "en",
  },
];

// ─────────────────────────────────────────────────────────────
// YOUTUBE COMMUNITY TEMPLATES
// ─────────────────────────────────────────────────────────────
export const YOUTUBE_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "yt001",
    title: "YouTube Community – Guardian AI Deep Dive",
    category: "guardian_ai",
    platforms: ["youtube_community"],
    body_text: `🛡️ Memperkenalkan AXTO Guardian AI — Mesin Keamanan Siber Berbasis AI

Setelah melihat banyak perusahaan kehilangan data karena antivirus konvensional yang tidak cukup, kami membangun sesuatu yang berbeda.

Guardian AI bukan sekadar antivirus. Ini adalah behavioral AI engine yang:

🔬 Menganalisis CARA program berperilaku, bukan hanya signature-nya
🌐 Menggunakan threat feed global yang diperbarui real-time
🏠 Berjalan 100% di server Anda — tidak ada data yang keluar
🔑 Mendukung BYOK: gunakan OpenAI, Claude, Gemini, Groq, atau Ollama

Pertanyaan untuk komunitas: Apa tantangan keamanan server terbesar yang kalian hadapi saat ini? Comment di bawah 👇

Selengkapnya: axto.io`,
    hashtags: ["#CyberSecurity", "#AIProtection", "#AXTO", "#GuardianAI", "#SelfHosted"],
    cta_text: "Cek selengkapnya: axto.io",
    image_prompt: "YouTube Community post: Guardian AI overview infographic",
    language: "id",
  },
  {
    id: "yt002",
    title: "YouTube Community – Poll Post",
    category: "announcement",
    platforms: ["youtube_community"],
    body_text: `📊 Quick Poll untuk komunitas IT kita:

Apa solusi cybersecurity yang saat ini kalian pakai untuk server?

A) Antivirus komersial biasa
B) Open-source tools (ClamAV, OSSEC, dll)
C) Managed security service
D) Belum ada perlindungan khusus

Comment jawaban kalian! Hasil poll ini akan membantu kami memahami kebutuhan komunitas lebih baik.

---

P.S. — Kalau jawabannya D, mungkin saatnya coba AXTO Guardian AI 😄 axto.io`,
    hashtags: ["#CyberSecurity", "#AXTO", "#ITCommunity", "#Poll"],
    cta_text: "axto.io",
    image_prompt: "YouTube Community poll post about cybersecurity tools",
    language: "id",
  },
  {
    id: "yt003",
    title: "YouTube Community – EN Announcement",
    category: "announcement",
    platforms: ["youtube_community"],
    body_text: `🚀 Big news for the IT and AI infrastructure community!

AXTO Platform is now available globally — two enterprise-grade products that put YOU in full control:

🛡️ Guardian AI — Self-hosted AI cybersecurity
🎼 Orchestra AI — Multi-vendor AI workflow orchestration

What makes AXTO different from everything else out there:

✦ Completely self-hosted (your servers, your data)
✦ True BYOK — bring any AI provider API key
✦ No subscription lock-in (pay once, own forever)
✦ Open architecture — no black box

Whether you're running 1 server or 1,000, AXTO scales with you.

Drop your questions below! 👇 Full details at axto.io`,
    hashtags: ["#AXTO", "#EnterpriseSecurity", "#AIInfrastructure", "#SelfHosted"],
    cta_text: "axto.io",
    image_prompt: "YouTube Community: AXTO global launch announcement visual",
    language: "en",
  },
];

// ─────────────────────────────────────────────────────────────
// FREE CLASSIFIED SITES — EXTENDED TEMPLATES
// Covers: Gumtree, Oodle, Adpost, Trovit, Vivastreet, Hoobly, FreeAds
// ─────────────────────────────────────────────────────────────
export const CLASSIFIED_EXTENDED_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "cl001",
    title: "Gumtree – Guardian AI UK/AU",
    category: "guardian_ai",
    platforms: ["gumtree"],
    body_text: `AXTO Guardian AI — Enterprise Cybersecurity Software | Self-Hosted

Protect your servers with AI-powered threat detection that runs entirely on your own infrastructure.

WHAT IT DOES:
• AI behavioral malware analysis (detects zero-day threats)
• Real-time global threat feed (IPs, domains, malware hashes)
• Multi-server protection from one dashboard
• Static + behavioral analysis combined

KEY BENEFITS:
✓ 100% self-hosted — your data never leaves your servers
✓ BYOK: use your own OpenAI / Claude / Gemini / Groq keys
✓ One-time license — no monthly subscription
✓ Scales from 1 to 1,000+ servers
✓ Docker deployment — up in minutes

IDEAL FOR:
→ UK/AU businesses with data residency requirements
→ IT consultants managing multiple client servers
→ Hosting companies adding managed security services
→ Fintech, healthcare, legal firms with compliance needs

PRICING (GBP):
• Lite (1 server): £118/year
• Pro (20 servers): £473/year
• Shield (100 servers): £2,369/year
• Aegis (1,000 servers): £10,270/year

Contact: hello@axto.io
Website: axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "Gumtree classified ad banner for cybersecurity software",
    language: "en",
  },
  {
    id: "cl002",
    title: "Gumtree – Orchestra AI UK/AU",
    category: "orchestra_ai",
    platforms: ["gumtree"],
    body_text: `AXTO Orchestra AI — AI AI eXecution & Tools Orchestration Software | Self-Hosted

Manage AI workloads intelligently across any combination of providers with automatic cost-first routing.

WHAT IT DOES:
• Routes AI jobs to cheapest available provider automatically
• Manages CPU and GPU worker pools
• Supports: OpenAI, Claude, Gemini, Groq, Ollama + more
• 6 routing modes: cost, latency, load, quality, failover, custom

KEY BENEFITS:
✓ Reduce AI API costs by up to 60%
✓ No vendor lock-in — switch providers anytime
✓ 100% self-hosted, BYOK
✓ One-time license
✓ REST API + webhook integration

IDEAL FOR:
→ AI agencies and consultancies
→ SaaS companies with high AI usage
→ Research teams running GPU workloads
→ Enterprises wanting AI cost control

PRICING (GBP):
• Core (10 workers): £4,661/year
• Scale (50 workers): £14,141/year
• Unlimited: £27,571/year

Contact: hello@axto.io
Website: axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "Gumtree classified for AI orchestration software",
    language: "en",
  },
  {
    id: "cl003",
    title: "Oodle – Guardian AI US",
    category: "guardian_ai",
    platforms: ["oodle"],
    body_text: `FOR SALE: AXTO Guardian AI — Enterprise Cybersecurity Software License

Category: Computers & Software / Security Software

DESCRIPTION:
AXTO Guardian AI is a self-hosted AI-powered cybersecurity engine for Linux/Windows servers. Unlike traditional antivirus, it uses behavioral AI analysis to detect threats that have never been seen before.

FEATURES:
- Zero-day malware detection via behavioral AI
- Real-time threat intelligence feed
- Multi-server management dashboard
- BYOK: bring OpenAI/Claude/Gemini/Groq/Ollama keys
- Docker-based deployment
- 100% on-premise — zero cloud dependency

WHO IS IT FOR:
Small to large businesses, IT consultants, hosting companies, fintech, healthcare, government.

LICENSE TYPES:
• Lite: 1 server — $249/year
• Pro: 20 servers — $990/year
• Shield: 100 servers — $3,990/year
• Aegis: 1,000 servers — $29,900/year

All licenses: one-time purchase option available.

CONTACT: hello@axto.io
WEBSITE: axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "Oodle classified listing for cybersecurity software US",
    language: "en",
  },
  {
    id: "cl004",
    title: "Adpost – Global EN",
    category: "announcement",
    platforms: ["adpost"],
    body_text: `AXTO PLATFORM — ENTERPRISE AI INFRASTRUCTURE SOFTWARE

Two powerful self-hosted products:

━━━━━━━━━━━━━━━━━━━━━━━━
1. GUARDIAN AI (Cybersecurity)
━━━━━━━━━━━━━━━━━━━━━━━━
AI-powered server security:
• Behavioral malware detection (catches zero-days)
• Real-time threat feed updates
• Multi-server unified dashboard
• Static + behavioral analysis

━━━━━━━━━━━━━━━━━━━━━━━━
2. ORCHESTRA AI (AI Orchestration)
━━━━━━━━━━━━━━━━━━━━━━━━
Manage AI workloads at scale:
• Multi-vendor routing (OpenAI/Claude/Gemini/Groq/Ollama)
• GPU cluster management
• 60% AI cost savings
• 6 intelligent routing modes

━━━━━━━━━━━━━━━━━━━━━━━━
COMMON FEATURES (BOTH PRODUCTS):
• 100% self-hosted
• BYOK (Bring Your Own API Keys)
• One-time purchase available
• Docker deployment
• Enterprise-grade

TARGET: IT companies, hosting, AI startups, enterprises, government

CONTACT: hello@axto.io
WEBSITE: axto.io
━━━━━━━━━━━━━━━━━━━━━━━━`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "Adpost global listing for AXTO enterprise platform",
    language: "en",
  },
  {
    id: "cl005",
    title: "Trovit – Software Guardian",
    category: "guardian_ai",
    platforms: ["trovit"],
    body_text: `Guardian AI Security Software - AI-Powered Server Protection

Self-hosted cybersecurity solution with behavioral AI analysis.
Detects zero-day threats • Real-time threat feed • Multi-server • BYOK
From $249/year | Docker deployment | 100% on-premise

hello@axto.io | axto.io`,
    hashtags: [],
    cta_text: "axto.io",
    image_prompt: "Trovit short listing for Guardian AI software",
    language: "en",
  },
  {
    id: "cl006",
    title: "Vivastreet – UK IT Software",
    category: "announcement",
    platforms: ["vivastreet"],
    body_text: `AXTO Platform — Enterprise AI Software | UK Available

Self-hosted AI security and orchestration software for businesses.

GUARDIAN AI: AI cybersecurity for your servers
✓ Behavioural malware detection
✓ Real-time threat intelligence
✓ GDPR/UK GDPR compliant (data stays on your servers)
✓ Lite (1 server): £118/year
✓ Pro (20 servers): £473/year
✓ Shield (100 servers): £2,369/year

ORCHESTRA AI: Multi-vendor AI workflow management
✓ Route AI jobs to cheapest provider automatically
✓ Support for OpenAI, Claude, Gemini, Groq
✓ Save up to 60% on AI costs
✓ Orchestra Core (10 workers): £4,661/year
✓ Orchestra Scale (50 workers): £14,141/year

Both products: one-time licence available, Docker deployment, BYOK.

Suitable for: IT consultancies, SMEs, enterprises, hosting providers

Email: hello@axto.io | Web: axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "Vivastreet UK classified for IT software",
    language: "en",
  },
  {
    id: "cl007",
    title: "Hoobly – Software Listing",
    category: "announcement",
    platforms: ["hoobly"],
    body_text: `AXTO Platform - AI eXecution & Tools Orchestration Software

• Guardian AI: AI-powered server cybersecurity ($249+/yr)
• Orchestra AI: Multi-vendor AI workflow management ($9,900+/yr)
• Both: 100% self-hosted, BYOK, one-time license option

Perfect for IT companies, startups, enterprises.

Contact: hello@axto.io
Website: axto.io`,
    hashtags: [],
    cta_text: "axto.io",
    image_prompt: "Hoobly short software listing",
    language: "en",
  },
  {
    id: "cl008",
    title: "FreeAds.in – India/Asia",
    category: "announcement",
    platforms: ["freeads"],
    body_text: `AXTO Platform - Enterprise AI Software | India & Asia Available

🛡️ GUARDIAN AI — Server Security Software
AI-powered malware detection for your servers
✅ Detects zero-day threats (behavioral analysis)
✅ Self-hosted — data stays in your country
✅ Supports Indian compliance requirements
Price: From $249/year

🎼 ORCHESTRA AI — AI Workflow Software
Manage multiple AI providers (OpenAI, Claude, Gemini) from one platform
✅ Route to cheapest AI provider automatically
✅ Reduce AI costs by 60%
✅ GPU cluster management
Price: From $9,900/year

Both products: BYOK, 100% self-hosted, Docker deployment

Contact: hello@axto.io
Website: axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "FreeAds India listing for enterprise software",
    language: "en",
  },
  {
    id: "cl009",
    title: "OLX – Indonesia Guardian (Lengkap)",
    category: "guardian_ai",
    platforms: ["olx"],
    body_text: `🛡️ JUAL SOFTWARE KEAMANAN SERVER AI — AXTO GUARDIAN AI

Kategori: Komputer & Software / Software Keamanan

DESKRIPSI:
AXTO Guardian AI adalah software keamanan siber bertenaga AI yang berjalan 100% di server Anda sendiri. Tidak perlu langganan cloud, data tidak keluar.

FITUR UNGGULAN:
✅ Deteksi malware zero-day dengan behavioral AI
✅ Threat feed real-time (IP berbahaya, domain malware, hash)
✅ Dashboard multi-server dari satu panel
✅ BYOK: pakai API key AI Anda sendiri
✅ Analisis statis + behavioral
✅ Deploy dengan Docker dalam < 30 menit

COCOK UNTUK:
→ Perusahaan IT dan software house
→ Hosting provider
→ Fintech dan perbankan
→ E-commerce dan marketplace
→ Instansi pemerintah
→ Startup teknologi

HARGA (USD):
• Lite (1 server): $249/tahun
• Pro (20 server): $990/tahun
• Shield (100 server): $3,990/tahun
• Aegis (1.000 server): $29,900/tahun

Tersedia opsi pembelian sekali (lifetime). Pembayaran via Stripe/Midtrans.

📧 hello@axto.io
🌐 axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "OLX Indonesia listing for cybersecurity software",
    language: "id",
  },
  {
    id: "cl010",
    title: "OLX – Indonesia Orchestra (Lengkap)",
    category: "orchestra_ai",
    platforms: ["olx"],
    body_text: `🎼 JUAL SOFTWARE AI ORCHESTRA — AXTO ORCHESTRA AI

Kategori: Komputer & Software / Software Bisnis & Enterprise

DESKRIPSI:
AXTO Orchestra AI adalah platform orkestrasi workflow AI yang mengelola job AI secara cerdas di berbagai provider sekaligus. Hemat biaya AI hingga 60%.

FITUR UNGGULAN:
✅ Routing otomatis ke provider AI termurah
✅ Support OpenAI, Claude, Gemini, Groq, Ollama, dll
✅ GPU cluster management
✅ 6 mode routing cerdas
✅ Job queue dengan prioritas
✅ Per-job cost tracking
✅ 100% self-hosted, BYOK
✅ REST API + webhook

COCOK UNTUK:
→ AI startup dan agensi AI
→ Tim R&D dan riset AI
→ Perusahaan dengan GPU farm
→ Software house yang jual produk berbasis AI
→ Enterprise dengan kebutuhan AI tinggi

HARGA (USD):
• Core (10 worker): $9,900/tahun
• Professional (50 worker): $39,900/tahun
• Unlimited: $59,900/tahun

Tersedia opsi pembelian sekali (lifetime). Pembayaran via Stripe/Midtrans.

📧 hello@axto.io
🌐 axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "OLX Indonesia listing for AI orchestration software",
    language: "id",
  },
  {
    id: "cl011",
    title: "Locanto – ID Guardian",
    category: "guardian_ai",
    platforms: ["locanto"],
    body_text: `AXTO Guardian AI – Software Keamanan Server Bertenaga AI

Proteksi server Anda dari malware, ransomware, dan ancaman zero-day dengan teknologi AI behavioral analysis.

Fitur: Deteksi zero-day • Threat feed real-time • Multi-server • Self-hosted • BYOK
Deploy: Docker, siap dalam < 1 jam
Harga: Mulai $249/tahun (dibayar dalam USD)

Cocok untuk: perusahaan IT, hosting, fintech, e-commerce, pemerintah

📧 hello@axto.io | 🌐 axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "Locanto Indonesia listing for server security software",
    language: "id",
  },
  {
    id: "cl012",
    title: "ClassifiedAds – EN Full",
    category: "announcement",
    platforms: ["classifiedads"],
    body_text: `AXTO PLATFORM — AI eXecution & Tools Orchestration Software

=== GUARDIAN AI (Cybersecurity) ===
AI-powered server protection running 100% on your infrastructure.
• Behavioral + static malware analysis
• Real-time global threat feed
• Multi-server dashboard
• BYOK (OpenAI/Claude/Gemini/Groq/Ollama)
• One-time license from $249/year

=== ORCHESTRA AI (AI Orchestration) ===
Manage AI workloads across multiple providers intelligently.
• Cost-first routing across 9+ AI vendors
• GPU cluster management
• Reduce AI costs by 60%
• 6 routing modes
• One-time license from $9,900/year

=== BOTH PRODUCTS ===
✓ 100% self-hosted (your servers, your data)
✓ True BYOK (your API keys, your billing)
✓ Docker deployment (up in minutes)
✓ Enterprise-grade architecture

CONTACT: hello@axto.io
WEBSITE: https://axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "ClassifiedAds full listing for AXTO platform",
    language: "en",
  },
  {
    id: "cl013",
    title: "Craigslist – Guardian AI US Tech",
    category: "guardian_ai",
    platforms: ["craigslist"],
    body_text: `**AXTO Guardian AI — Enterprise Cybersecurity Software (Self-Hosted)**

AI-powered malware detection and threat intelligence for your servers. 100% on-premise deployment — your data never leaves your infrastructure.

---WHAT IT IS---
A behavioral AI security engine that detects threats based on HOW programs behave, not just database signatures. Catches zero-days that traditional antivirus misses.

---KEY FEATURES---
* Zero-day detection via behavioral AI analysis
* Real-time threat feed (IPs, domains, file hashes)
* Multi-server management from one dashboard
* Bring Your Own API Keys (OpenAI/Claude/Gemini/Groq/Ollama)
* Docker deployment — running in under an hour
* Works air-gapped (24h grace mode)

---PRICING---
* Lite (1 server): $249/year
* Pro (20 servers): $990/year
* Shield (100 servers): $3,990/year
* Aegis (1,000 servers): $29,900/year

One-time purchase options available.

---GOOD FIT FOR---
IT shops, hosting companies, fintech, healthcare, legal, government, e-commerce, startups.

hello@axto.io
https://axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "Craigslist US tech listing for cybersecurity software",
    language: "en",
  },
  {
    id: "cl014",
    title: "Craigslist – Orchestra AI US Tech",
    category: "orchestra_ai",
    platforms: ["craigslist"],
    body_text: `**AXTO Orchestra AI — Multi-Vendor AI AI eXecution & Tools Orchestration (Self-Hosted)**

Manage AI workloads intelligently across OpenAI, Claude, Gemini, Groq, and Ollama from one self-hosted platform. Cut AI costs by up to 60%.

---WHAT IT IS---
An on-premise AI orchestration layer that sits between your apps and AI providers. Routes each job to the cheapest provider that meets the quality bar, with automatic failover.

---KEY FEATURES---
* Cost-first routing across 9+ AI providers
* GPU cluster auto-management
* 6 routing modes (cost, latency, load, quality, failover, custom)
* Per-job cost tracking and budget enforcement
* Job queue with priority tiers
* BYOK — your API keys, your billing
* REST API + webhooks

---PRICING---
* Core (10 workers): $9,900/year
* Professional (50 workers): $39,900/year
* Unlimited: $59,900/year

---GOOD FIT FOR---
AI agencies, AI startups, SaaS companies with high AI usage, GPU farms, research teams, enterprises.

hello@axto.io
https://axto.io`,
    hashtags: [],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "Craigslist US tech listing for AI orchestration software",
    language: "en",
  },
];

// ─────────────────────────────────────────────────────────────
// INDUSTRY-SPECIFIC TEMPLATES
// ─────────────────────────────────────────────────────────────
export const INDUSTRY_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "in001",
    title: "Industri – Healthcare / Rumah Sakit",
    category: "guardian_ai",
    platforms: ["linkedin", "facebook"],
    body_text: `🏥 Rumah sakit dan klinik menyimpan data pasien yang sangat sensitif.

Satu kebocoran data bisa:
→ Merusak kepercayaan pasien
→ Melanggar regulasi HIPAA/BPJS
→ Mengakibatkan denda besar
→ Mengancam operasional

AXTO Guardian AI hadir khusus untuk healthcare:
✅ Data pasien tidak pernah keluar dari server rumah sakit
✅ Zero telemetry ke vendor manapun
✅ Audit trail forensik untuk compliance
✅ Deteksi ransomware sebelum enkripsi data mulai
✅ Self-hosted sesuai regulasi data kesehatan

Proteksi data pasien Anda sekarang. Sebelum terlambat. 🔐

{{cta}}`,
    hashtags: ["#Healthcare", "#MedicalDataSecurity", "#GuardianAI", "#AXTO", "#HIPAA", "#DataPasien"],
    cta_text: "Konsultasi: hello@axto.io | axto.io",
    image_prompt: "Hospital server room protected by AI shield, medical data security visual",
    language: "id",
  },
  {
    id: "in002",
    title: "Industri – Government / Pemerintahan",
    category: "guardian_ai",
    platforms: ["linkedin"],
    body_text: `🏛️ Infrastruktur digital pemerintahan membutuhkan standar keamanan tertinggi.

AXTO Guardian AI memenuhi kebutuhan instansi pemerintah:

⚖️ KEPATUHAN REGULASI
→ Kominfo security compliance
→ BSSN framework alignment
→ Data tidak keluar yurisdiksi Indonesia

🔒 KEAMANAN TERTINGGI
→ Zero vendor dependency
→ Full audit trail
→ Air-gapped operation support
→ Hardware-bound license

🏠 KEDAULATAN DATA
→ 100% on-premise di data center pemerintah
→ Tidak ada akses remote dari vendor
→ Source code verifiable

Untuk keperluan tender dan procurement, hubungi kami. 📋

{{cta}}`,
    hashtags: ["#Pemerintahan", "#SiberNasional", "#GuardianAI", "#AXTO", "#BSSN", "#Kominfo"],
    cta_text: "📧 hello@axto.io | 🌐 axto.io",
    image_prompt: "Government building with AI cybersecurity shield, official formal style",
    language: "id",
  },
  {
    id: "in003",
    title: "Industri – Education / Universitas",
    category: "orchestra_ai",
    platforms: ["linkedin", "facebook"],
    body_text: `🎓 Universitas dan lembaga riset kini berlomba memanfaatkan AI.

Tapi biaya AI bisa sangat mahal untuk penelitian skala besar.

AXTO Orchestra AI menjawab kebutuhan akademik:

📚 UNTUK RISET
→ Jalankan experiment AI masif dengan biaya minimal
→ Route ke Ollama (local) dulu, API cloud jika perlu
→ Budget enforcement per project/departemen
→ Full cost visibility untuk laporan riset

🏫 UNTUK INSTITUSI
→ Kelola akses AI untuk seluruh departemen
→ Satu platform, banyak peneliti
→ GPU cluster universitas dioptimalkan
→ Tidak ada data penelitian ke vendor luar

Bantu riset AI Indonesia berkembang dengan infrastruktur yang tepat. 🇮🇩

{{cta}}`,
    hashtags: ["#Universitas", "#AIResearch", "#OrchestraAI", "#AXTO", "#PendidikanTinggi", "#Riset"],
    cta_text: "📧 hello@axto.io | 🌐 axto.io",
    image_prompt: "University research lab with AI orchestration, academic professional setting",
    language: "id",
  },
  {
    id: "in004",
    title: "Industri – MSP / IT Consultant EN",
    category: "announcement",
    platforms: ["linkedin"],
    body_text: `🔧 Attention Managed Service Providers & IT Consultants

AXTO Platform gives you a powerful new revenue stream.

THE OPPORTUNITY:
→ Add AI-powered cybersecurity to every client's package
→ Offer AI workflow optimization as a premium service
→ White-label friendly architecture
→ Manage all client licenses from one admin dashboard

WHAT YOU GET:
✦ Guardian AI: resell AI cybersecurity (clients self-host, you manage)
✦ Orchestra AI: resell AI cost optimization
✦ Per-license dashboard visibility
✦ Automated email delivery of keys
✦ Reseller margin opportunities

TECHNICAL:
→ Docker deployment (< 1 hour per client)
→ BYOK means clients keep their own AI costs
→ License management built into admin panel

If you manage 10+ servers for clients, this conversation is worth having.

→ hello@axto.io`,
    hashtags: ["#MSP", "#ITConsultant", "#AXTO", "#ManagedSecurity", "#ResellerOpportunity"],
    cta_text: "hello@axto.io | axto.io",
    image_prompt: "MSP managing multiple client servers with AXTO platform overview",
    language: "en",
  },
];

// ─────────────────────────────────────────────────────────────
// ENGAGEMENT / SOFT-SELL TEMPLATES
// ─────────────────────────────────────────────────────────────
export const ENGAGEMENT_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "eg001",
    title: "Engagement – Pertanyaan Keamanan",
    category: "guardian_ai",
    platforms: ["facebook", "instagram", "linkedin"],
    body_text: `🤔 Pertanyaan jujur untuk para IT professional:

Berapa lama waktu yang dibutuhkan untuk mendeteksi jika server Anda SEDANG dikompromikan saat ini?

A) Real-time (< 1 menit)
B) Beberapa jam
C) Hari atau minggu
D) Saya tidak tahu

Studi IBM menunjukkan rata-rata 207 hari untuk mendeteksi breach. Hampir 7 bulan. 😱

Itulah mengapa behavioral AI detection sangat penting — bukan laporan harian, tapi deteksi real-time.

Comment pilihan Anda! 👇

{{cta}}`,
    hashtags: ["#CyberSecurity", "#AXTO", "#GuardianAI", "#ITSecurity", "#DataBreach", "#ServerProtection"],
    cta_text: "Cek solusinya: axto.io",
    image_prompt: "Engaging question post about cybersecurity detection time",
    language: "id",
  },
  {
    id: "eg002",
    title: "Engagement – Mitos vs Fakta",
    category: "guardian_ai",
    platforms: ["instagram", "facebook", "linkedin"],
    body_text: `🔴 MITOS vs ✅ FAKTA tentang Keamanan Server:

🔴 "Linux tidak butuh antivirus"
✅ Linux tetap rentan terhadap malware, rootkit, dan ransomware

🔴 "Server di balik firewall sudah aman"
✅ Ancaman terbesar datang dari dalam (insider threat, supply chain)

🔴 "Kami terlalu kecil untuk jadi target"
✅ 43% serangan siber menyasar bisnis kecil

🔴 "Antivirus sudah cukup"
✅ Zero-day tidak ada di database antivirus manapun

Fakta lebih menyeramkan dari mitos. 😅

AXTO Guardian AI hadir untuk realitas ini — behavioral AI detection yang tidak bergantung pada database signature. 🛡️

{{cta}}`,
    hashtags: ["#MitosvsFakta", "#CyberSecurity", "#GuardianAI", "#AXTO", "#ServerSecurity", "#InfoSec"],
    cta_text: "Pelajari cara kerja Guardian AI: axto.io",
    image_prompt: "Myth vs fact infographic about cybersecurity, engaging visual",
    language: "id",
  },
  {
    id: "eg003",
    title: "Engagement – Behind The Build",
    category: "announcement",
    platforms: ["linkedin", "twitter"],
    body_text: `💡 Kenapa kami membangun AXTO?

Kami frustrasi dengan keadaan tools keamanan dan AI yang ada:

→ SaaS yang klaim "aman" tapi butuh akses ke server Anda
→ AI tools yang lock-in ke satu provider
→ Harga berlangganan yang naik terus tanpa nilai tambah
→ Black box yang tidak bisa diverifikasi

Jadi kami memutuskan: bangun sendiri, sesuai prinsip yang benar.

✦ Data sovereignty bukan opsi — itu default
✦ BYOK bukan feature — itu arsitektur
✦ Self-hosted bukan kompromi — itu keunggulan

Satu tahun kemudian, AXTO lahir.

Apakah kami melewatkan sesuatu yang Anda butuhkan? Comment di bawah 👇

{{cta}}`,
    hashtags: ["#BehindTheBuild", "#AXTO", "#Founder", "#ProductStory", "#SelfHosted", "#EnterpriseAI"],
    cta_text: "axto.io",
    image_prompt: "Founder story visual: building AXTO, journey from frustration to product",
    language: "id",
  },
  {
    id: "eg004",
    title: "Engagement – EN Community Question",
    category: "announcement",
    platforms: ["linkedin", "twitter"],
    body_text: `Quick question for the IT and AI engineering community:

What's your biggest frustration with current AI infrastructure tools?

A) Vendor lock-in (forced to use one provider)
B) Data leaving your infrastructure  
C) Unpredictable / rising costs
D) Lack of control and customization

Drop your answer below — building AXTO around exactly these pain points and want to make sure we're solving the right problems.

(If the answer is "all of the above" — that's why we built AXTO 😄)

axto.io`,
    hashtags: ["#AIInfrastructure", "#AXTO", "#Community", "#DevOps", "#EnterpriseAI"],
    cta_text: "axto.io",
    image_prompt: "Community poll post asking about AI infrastructure frustrations",
    language: "en",
  },
  {
    id: "eg005",
    title: "Engagement – Checklist Post",
    category: "guardian_ai",
    platforms: ["instagram", "pinterest", "facebook"],
    body_text: `✅ Server Security Checklist — Simpan ini!

Cek satu per satu:

□ Monitoring proses real-time aktif
□ Behavioral detection (bukan hanya signature)
□ Threat feed diperbarui < 1 jam sekali
□ Multi-server dari satu dashboard
□ Data tidak dikirim ke cloud vendor
□ Zero-day detection capability
□ Audit log lengkap tersedia
□ Incident response plan ada

Berapa yang sudah ✅ di sistem Anda?

Kalau < 5, mungkin saatnya evaluasi ulang security stack Anda.

AXTO Guardian AI membantu check semua item di atas. 🛡️

{{cta}}`,
    hashtags: ["#SecurityChecklist", "#GuardianAI", "#AXTO", "#CyberSecurity", "#SaveThis", "#ITSecurity"],
    cta_text: "axto.io",
    image_prompt: "Server security checklist infographic, clean and shareable design",
    language: "id",
  },
];

// ─────────────────────────────────────────────────────────────
// Master export: all templates combined
// ─────────────────────────────────────────────────────────────
// ── PLAYBOOKS PROMOTION TEMPLATES ──────────────────────────────────────────
const PLAYBOOKS_TEMPLATES: AutoPostTemplate[] = [
  {id:"play001",title:"Playbooks Launch",category:"announcement",platforms:["facebook","linkedin","twitter"],body_text:`📦 Introducing AXTO Playbooks — Professional AI Prompt Collections\n\nReady-to-use prompt packs for:\n✍️ Copywriting & Sales\n💼 Business & Strategy\n⚖️ Legal Documents\n🛒 E-Commerce\n👔 Career & Resume\n📊 Data Analytics\n\nWorks with ChatGPT, Claude, Gemini. Download instantly.\n\n{{cta}}`,hashtags:["#AIPrompts","#ChatGPT","#Claude","#Playbooks","#AXTO","#Productivity"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Professional AI prompt library with colorful category icons",language:"en"},
  {id:"play002",title:"Sales Copy Pack Promo",category:"announcement",platforms:["facebook","instagram","linkedin"],body_text:`🔥 50 Battle-Tested Sales Copy Prompts — $29\n\nLanding pages, email sequences, Facebook ads, Google ads, product descriptions, and sales letters.\n\nEvery prompt tested across 100+ real campaigns.\n\nStop staring at blank pages. Start converting.\n\n{{cta}}`,hashtags:["#Copywriting","#SalesCopy","#AIPrompts","#Marketing","#ChatGPT"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Sales copywriter workspace with AI assistant",language:"en"},
  {id:"play003",title:"Legal Vault Promo",category:"announcement",platforms:["linkedin","facebook"],body_text:`⚖️ 30 Legal Document Generators — Save Thousands in Lawyer Fees\n\nNDA, contracts, privacy policies, terms of service, and more.\n\nEach prompt produces a complete, professionally structured document.\n\nOnly $39. Works with ChatGPT & Claude.\n\n{{cta}}`,hashtags:["#LegalTech","#AI","#Contracts","#NDA","#StartupTools","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Legal document with AI seal of approval",language:"en"},
  {id:"play004",title:"Mega Bundle Promo",category:"announcement",platforms:["facebook","instagram","linkedin","twitter"],body_text:`💥 MEGA BUNDLE — Every AXTO Playbook for $99 (worth $290)\n\n400+ prompts across 10 categories:\n• Copywriting & Marketing\n• Business & Strategy\n• Legal Documents\n• E-Commerce\n• SaaS & Startup\n• Career & Resume\n• Data Analytics\n• Education\n• Real Estate\n• Content & SEO\n\nLifetime access. Instant download.\n\n{{cta}}`,hashtags:["#AIBundle","#ChatGPT","#Claude","#Gemini","#Productivity","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Premium bundle package with all categories displayed",language:"en"},
  {id:"play005",title:"Playbooks ID Promo",category:"announcement",platforms:["facebook","instagram"],body_text:`📦 AXTO Playbooks — Koleksi Prompt AI Profesional\n\nSiap pakai untuk ChatGPT, Claude, Gemini:\n✍️ Copywriting & Marketing\n💼 Bisnis & Strategi\n⚖️ Dokumen Legal\n🛒 E-Commerce\n👔 Karir & CV\n📊 Data Analytics\n\nDownload langsung. Harga mulai $19.\n\n{{cta}}`,hashtags:["#AIPrompts","#ChatGPT","#AXTO","#Playbooks","#Produktivitas"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Indonesian professional using AI prompts on laptop",language:"id"},

  // ── NEW PLAYBOOK PROMOS ──────────────────────────────────────────────────
  {id:"play006",title:"Cold Outreach Masterclass Promo",category:"announcement",platforms:["linkedin","twitter","facebook"],body_text:`📬 35 Cold Outreach Prompts That Actually Get Replies\n\nStop getting ghosted. This pack covers:\n📧 Cold Email (B2B, PR, Podcast, Investor)\n💼 LinkedIn DM (Prospects, Collabs, VCs)\n📱 Instagram & Twitter/X DMs\n🔁 Follow-Up Sequences (7 templates)\n\nEvery prompt: subject line A/B, personalization hooks, tone guide.\n\nOnly $24 → axto.io/playbooks\n\n{{cta}}`,hashtags:["#ColdEmail","#Outreach","#B2BSales","#LinkedIn","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Professional laptop with inbox full of reply notifications",language:"en"},
  {id:"play007",title:"Freelancer Kit Promo",category:"announcement",platforms:["instagram","linkedin","twitter"],body_text:`💼 25 AI Prompts Every Freelancer Needs\n\nFrom "hey here's my rate" to "thanks for the referral"\n\n✅ Proposals that win projects\n✅ Scope creep responses that don't burn bridges\n✅ Payment reminders that get paid\n✅ Rate increase emails clients actually accept\n\nBuilt for designers, writers, devs, consultants.\n\nOnly $19 → axto.io/playbooks\n\n{{cta}}`,hashtags:["#Freelance","#FreelanceTips","#AIPrompts","#Solopreneur","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Freelancer at coffee shop with laptop, looking confident",language:"en"},
  {id:"play008",title:"YouTube Script Machine Promo",category:"announcement",platforms:["youtube","instagram","twitter"],body_text:`🎬 30 YouTube Script Prompts — From Blank Page to Record-Ready\n\nWhat's inside:\n🪝 5 Hook formulas (curiosity, controversy, pattern interrupt...)\n📝 12 complete video script templates\n🖼️ Title + thumbnail copy generators\n📈 Retention hooks at 30%, 50% and 70% marks\n📊 Channel growth copy (desc, playlists, community posts)\n\nWorks for ANY niche. $19 only.\n\n{{cta}}`,hashtags:["#YouTube","#ContentCreator","#YouTubeTips","#AIPrompts","#VideoScript","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"YouTube creator in front of camera setup with script on screen",language:"en"},
  {id:"play009",title:"HR Hiring Toolkit Promo",category:"announcement",platforms:["linkedin","facebook"],body_text:`🧑‍💼 30 HR & Hiring Prompts — Build the Team You Actually Want\n\nIf your job descriptions are attracting the wrong people, these prompts fix that.\n\n📋 Job descriptions that attract A-players\n📞 Screening scripts that reveal real talent\n🎯 30/60/90 day onboarding plans\n📈 Performance reviews, PIPs, and promotion memos\n🤝 Culture communications that don't sound corporate\n\nFor HR teams and hiring managers. $24.\n\n{{cta}}`,hashtags:["#HRtech","#Hiring","#Recruiting","#HRtips","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"HR professional in modern office reviewing resumes with AI assistance",language:"en"},
  {id:"play010",title:"AI Productivity Pack Promo EN",category:"announcement",platforms:["facebook","linkedin","twitter","instagram"],body_text:`⚡ 40 Prompts to 10x Your Daily Output with AI\n\nThe most universal pack we've made — works for any role.\n\n🧠 Think: First principles, devil's advocate, pre-mortem\n✍️ Write: Meeting notes → actions, bullets → reports\n🔍 Research: 5-min deep dives, mental model applicator\n📁 Manage: Project plans, priority stacks, retrospectives\n🎯 Grow: Weekly reviews, goal cascades, energy audits\n\nChatGPT, Claude, Gemini, Llama, Mistral. $24.\n\n{{cta}}`,hashtags:["#Productivity","#AITools","#ChatGPT","#WorkSmarter","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Knowledge worker at clean desk with multiple AI chat windows open, highly productive",language:"en"},
  {id:"play011",title:"AI Productivity Pack Promo ID",category:"announcement",platforms:["facebook","instagram"],body_text:`⚡ 40 Prompt AI untuk 10x Produktivitas Kerja Harian\n\nBerlaku untuk semua profesi — tidak ada batasan industri.\n\n🧠 Berpikir lebih tajam: first principles, pre-mortem\n✍️ Nulis lebih cepat: notulen → action items, poin → laporan\n🔍 Riset lebih efisien: deep dive 5 menit, mental model\n📁 Manajemen proyek: rencana, prioritas, retrospektif\n🎯 Tumbuh lebih terarah: review mingguan, cascade goal\n\nCompatible: ChatGPT, Claude, Gemini. Harga $24.\n\n{{cta}}`,hashtags:["#Produktivitas","#AITools","#ChatGPT","#KerjaLebihCerdas","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Indonesian professional using AI on multiple devices, productive workspace",language:"id"},
  {id:"play012",title:"Growth Machine Bundle Promo",category:"announcement",platforms:["facebook","linkedin","instagram"],body_text:`🚀 New Bundle: Growth Machine — 4 Packs for $69 (worth $136)\n\nEverything you need to grow a business with AI:\n\n📬 Cold DM & Outreach Masterclass (35 prompts) — $24\n📈 SaaS Growth Playbook (35 prompts) — $29\n⚡ AI Productivity Power Pack (40 prompts) — $24\n🤝 Customer Success Playbook (30 prompts) — $24\n\nTotal: 140 prompts. Instant download. 49% off.\n\n{{cta}}`,hashtags:["#AIBundle","#GrowthHacking","#SaaS","#Productivity","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Bundle package with growth chart and AI icons, premium design",language:"en"},

  // ── BATCH 2: NEW PLAYBOOK PROMOS ─────────────────────────────────────────
  {id:"play013",title:"Customer Success Playbook Promo",category:"announcement",platforms:["linkedin","facebook","twitter"],body_text:`🤝 30 Customer Success Prompts — Cut Churn Before It Happens\n\nFor CSMs and SaaS founders:\n📞 Kickoff call agendas that set the right tone\n🚨 At-risk account intervention scripts\n📊 QBR deck outlines that wow executives\n💰 Renewal negotiation talking points\n🚀 Upsell discovery scripts that don't feel pushy\n\nBuild retention. Expand revenue. $24.\n\n{{cta}}`,hashtags:["#CustomerSuccess","#SaaS","#Churn","#Retention","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"SaaS dashboard showing healthy customer health scores and retention metrics",language:"en"},
  {id:"play014",title:"Amazon FBA Kit Promo",category:"announcement",platforms:["facebook","instagram","linkedin"],body_text:`📦 25 Amazon FBA Prompts — Rank Higher, Convert More, Scale Faster\n\nBuilt for Amazon sellers:\n🔍 Product titles that dominate search\n⭐ 5-bullet points that trigger the buy decision\n📸 A+ Content that turns visitors into buyers\n⚖️ A-to-Z claim responses that protect your account\n🏆 Competitor analysis that finds hidden gaps\n\nAll TOS-compliant. $24.\n\n{{cta}}`,hashtags:["#AmazonFBA","#AmazonSeller","#Ecommerce","#AIPrompts","#FBA","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Amazon seller dashboard with rising sales chart and product ranking",language:"en"},
  {id:"play015",title:"Dropshipping POD Promo",category:"announcement",platforms:["facebook","instagram","tiktok"],body_text:`🎁 30 Prompts for Dropshippers & Print-on-Demand Sellers\n\nZero inventory. Maximum output.\n\n🎯 Winning product criteria analyzer\n🛍️ Shopify product pages that convert\n📱 TikTok ad scripts (15s + 30s)\n💬 Customer service responses for every situation\n🔄 Abandoned cart email sequence (3 emails)\n\nFor Shopify, Etsy, TeeSpring, AliExpress. $19.\n\n{{cta}}`,hashtags:["#Dropshipping","#PrintOnDemand","#Shopify","#Ecommerce","#TikTokAds","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Laptop showing Shopify store with product and phone showing TikTok ad",language:"en"},
  {id:"play016",title:"Student Academic Pack Promo EN",category:"announcement",platforms:["instagram","twitter","facebook"],body_text:`📚 25 Academic Prompts for Students Who Want Better Grades\n\nNot a shortcut — a thinking partner.\n\n✍️ Essay outlines that argue clearly\n🔍 Research paper structures that impress\n🧠 Feynman technique for any topic\n📅 Exam question predictor\n🎓 Thesis defense Q&A prep\n\nHigh school to postgrad. Only $14.\n\n{{cta}}`,hashtags:["#StudentLife","#AcademicTips","#University","#StudyTips","#AITools","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"University student at desk with laptop and books, focused and productive",language:"en"},
  {id:"play017",title:"Student Pack Promo ID",category:"announcement",platforms:["instagram","facebook"],body_text:`📚 25 Prompt AI untuk Mahasiswa yang Mau Nilai Lebih Baik\n\nBukan jalan pintas — ini partner berpikir.\n\n✍️ Outline esai yang terstruktur dan berargumen kuat\n🔍 Kerangka makalah penelitian yang mengesankan\n🧠 Teknik Feynman untuk topik apapun\n📅 Prediksi soal ujian\n🎓 Persiapan sidang skripsi/tesis\n\nSMA sampai Pascasarjana. Hanya $14.\n\n{{cta}}`,hashtags:["#MahasiswaIndonesia","#TipsKuliah","#BelajarCerdas","#AITools","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Indonesian university student using laptop for studying, library background",language:"id"},
  {id:"play018",title:"LinkedIn Brand Pro Promo",category:"announcement",platforms:["linkedin","twitter"],body_text:`🌟 20 LinkedIn Prompts That Build a Career-Changing Personal Brand\n\nMost people use LinkedIn wrong. Here's what works:\n\n🔤 Headline formula (5 versions for different goals)\n📖 About section story arc that people actually read\n💡 Thought leadership posts that get real engagement\n🤝 DM scripts that open doors\n🗓️ 90-day content calendar outline\n\nFor professionals who want to be found. $19.\n\n{{cta}}`,hashtags:["#LinkedIn","#PersonalBrand","#CareerTips","#Networking","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Professional with phone showing LinkedIn notifications, modern office",language:"en"},
  {id:"play019",title:"Property Investor Playbook Promo",category:"announcement",platforms:["facebook","linkedin","instagram"],body_text:`🏗️ 25 Real Estate Investor Prompts — Analyze Deals. Manage Tenants. Grow Your Portfolio.\n\nFor active property investors:\n📊 ROI analysis with 5-year projections\n💰 Private lender pitch scripts\n📜 Tenant screening and lease communications\n🔨 Renovation contractor briefs\n🤝 Off-market property inquiry letters\n\nBuy-to-let, BRRRR, flips. $24.\n\n{{cta}}`,hashtags:["#RealEstateInvesting","#PropertyInvestor","#BuyToLet","#BRRRR","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Real estate investor reviewing property spreadsheets with calculator and house model",language:"en"},
  {id:"play020",title:"Marketing Analytics Mastery Promo",category:"announcement",platforms:["linkedin","twitter","facebook"],body_text:`📈 25 Marketing Analytics Prompts — Stop Drowning in Data\n\nFor marketers who want to speak CFO-level:\n\n📊 Campaign performance narratives (Google, Meta, TikTok)\n💰 CAC & LTV models anyone can understand\n🔍 Multi-touch attribution explained to stakeholders\n🧪 A/B test results write-up that convinces\n📋 Monthly CMO report narrative\n\nB2B and B2C. $24.\n\n{{cta}}`,hashtags:["#MarketingAnalytics","#DataDriven","#CMO","#GrowthMarketing","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Marketing analyst in front of data dashboard presenting insights to team",language:"en"},
  {id:"play021",title:"Brand Voice Kit Promo",category:"announcement",platforms:["linkedin","instagram","facebook"],body_text:`🎨 20 Brand Storytelling Prompts — Make Your Brand Impossible to Forget\n\nFor founders and brand strategists:\n\n🗣️ Brand voice definition with do's and don'ts\n📖 Founder origin story (honest, specific, memorable)\n🦸 Customer hero story framework\n✊ Brand manifesto (1 page that rallies people)\n🏷️ Tagline generator (10 options, 3 directions)\n\nMake your brand sound like a person. $29.\n\n{{cta}}`,hashtags:["#BrandStrategy","#Storytelling","#BrandVoice","#Marketing","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Brand strategist working on brand identity moodboard with colorful visuals",language:"en"},
  {id:"play022",title:"Meeting Presentation Mastery Promo",category:"announcement",platforms:["linkedin","facebook","twitter"],body_text:`🎤 25 Prompts to Run Better Meetings and Present with Real Impact\n\nFor managers and consultants who hate wasted time:\n\n📋 Agendas with pre-reads that people actually read\n🎯 Minto Pyramid presentation structure\n🤝 Consensus-building scripts for tough rooms\n📧 Meeting notes → action items automatically\n🗣️ Handling objections in real-time\n\nStop presenting. Start persuading. $19.\n\n{{cta}}`,hashtags:["#LeadershipTips","#Meetings","#Presentations","#Management","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Business leader presenting to engaged executive team in modern conference room",language:"en"},
  {id:"play023",title:"Podcast Newsletter Engine Promo",category:"announcement",platforms:["instagram","twitter","linkedin","facebook"],body_text:`🎙️ 30 Prompts for Podcasters & Newsletter Writers\n\nBuilding an audience that actually trusts you:\n\n🎬 Solo episode scripts (cold open → outro)\n🪝 5 hook formulas that stop the scroll\n📧 Newsletter issue framework that gets opened\n📣 Subject line generator (10 options every time)\n🔄 1 episode → 8 content pieces workflow\n\nFor creators who want to own their audience. $19.\n\n{{cta}}`,hashtags:["#Podcast","#Newsletter","#ContentCreator","#Substack","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Creator recording podcast in home studio with microphone and newsletter on screen",language:"en"},
  {id:"play024",title:"Ecommerce Empire Bundle Promo",category:"announcement",platforms:["facebook","instagram","linkedin"],body_text:`🛒 E-Commerce Empire Bundle — 3 Packs for $49 (worth $87)\n\nSell everywhere. Without the guesswork.\n\n🛒 E-Commerce Conversion Kit (45 prompts) — $24\n📦 Amazon FBA Seller Kit (25 prompts) — $24\n🎁 Dropshipping & POD Masterpack (30 prompts) — $19\n\nTotal: 100 prompts. Shopify, Amazon, Etsy, TikTok Shop.\n44% off. Instant download.\n\n{{cta}}`,hashtags:["#Ecommerce","#AmazonFBA","#Dropshipping","#Shopify","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"E-commerce seller laptop showing Amazon, Shopify, Etsy logos and sales rising",language:"en"},
  {id:"play025",title:"Mega Bundle Updated Promo",category:"announcement",platforms:["facebook","instagram","linkedin","twitter"],body_text:`💥 MEGA BUNDLE — All 28 AXTO Playbooks for $99 (worth $581)\n\n600+ prompts across every category:\n✍️ Copywriting & Brand Voice\n💼 Business, Strategy & Meetings\n📝 Content, YouTube, Podcast & Newsletter\n⚖️ Legal, Contracts & HR\n🛒 E-Commerce, Amazon & Dropshipping\n🚀 SaaS, Growth & Customer Success\n🎓 Education & Career\n🏠 Real Estate (Agent + Investor)\n📊 Data & Marketing Analytics\n⚡ AI Productivity\n\nLifetime access. $99 once.\n\n{{cta}}`,hashtags:["#AIBundle","#AIPrompts","#ChatGPT","#Claude","#Gemini","#Productivity","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Premium all-access bundle with 10 colorful category icons and AXTO branding",language:"en"},
  {id:"play026",title:"Mega Bundle ID Promo Updated",category:"announcement",platforms:["facebook","instagram"],body_text:`💥 MEGA BUNDLE — Semua 28 Playbook AXTO seharga $99 (senilai $581)\n\n600+ prompt di semua kategori:\n✍️ Copywriting & Brand\n💼 Bisnis, Strategi & Presentasi\n📝 Konten, YouTube, Podcast & Newsletter\n⚖️ Legal & HR\n🛒 E-Commerce, Amazon & Dropship\n🚀 SaaS, Growth & Customer Success\n🎓 Edukasi & Karir\n🏠 Properti (Agen + Investor)\n📊 Data & Marketing Analytics\n⚡ Produktivitas AI\n\nAkses seumur hidup. Sekali bayar $99.\n\n{{cta}}`,hashtags:["#AIPrompts","#ChatGPT","#AXTO","#Playbooks","#Produktivitas","#BundleAI"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Indonesian professional surrounded by all 10 playbook category icons, laptop open",language:"id"},

  // ── BATCH 3 AUTOPOST TEMPLATES ───────────────────────────────────────────
  {id:"play027",title:"PR & Media Kit Builder Promo",category:"announcement",platforms:["linkedin","twitter","facebook"],body_text:`📰 20 PR Prompts — Get Press Coverage Without a PR Agency\n\nFor founders who want earned media:\n📄 Press releases journalists actually read\n🎙️ Podcast guest one-sheet that gets bookings\n🔍 HARO responses that get selected\n💬 Reactive media comments ready in minutes\n📋 Company boilerplate (50/100/250-word versions)\n\nGet featured. Stay relevant. $19.\n\n{{cta}}`,hashtags:["#PR","#PublicRelations","#PressRelease","#Founders","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Founder holding newspaper with company featured on front page",language:"en"},
  {id:"play028",title:"VSL Pack Promo",category:"announcement",platforms:["facebook","instagram","linkedin"],body_text:`🎥 15 VSL Scripts That Actually Convert — $34\n\nFor coaches, course creators, and online sellers:\n\n⏱️ 5-min product VSL\n🎯 15-min offer VSL (with timestamps)\n📺 30-60 min webinar scripts\n🪝 Hook sequences that stop the skip\n💰 Offer stack + close sequences\n\nBuilt on PASTOR, AIDA, PAS frameworks.\n\n{{cta}}`,hashtags:["#VSL","#WebinarScript","#Copywriting","#OnlineCourse","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Sales video on laptop with high conversion rate on dashboard",language:"en"},
  {id:"play029",title:"TikTok Content Machine Promo",category:"announcement",platforms:["tiktok","instagram","facebook"],body_text:`🎵 30 TikTok Script Prompts — Stop Guessing What Goes Viral\n\nWhat's inside:\n🎬 10 complete video formats (POV, tutorial, rant, transformation...)\n🪝 6 hook formulas for the first 3 seconds\n🛒 TikTok Shop product demo scripts\n📈 Algorithm growth strategy\n💬 Community engagement scripts\n\nFor creators who want to grow, not just post. $19.\n\n{{cta}}`,hashtags:["#TikTok","#TikTokCreator","#TikTokMarketing","#ContentCreator","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"TikTok creator with phone showing rising views and follower count",language:"en"},
  {id:"play030",title:"TikTok Machine Promo ID",category:"announcement",platforms:["tiktok","instagram","facebook"],body_text:`🎵 30 Prompt Script TikTok — Biar Konten Kamu Viral!\n\nYang ada di dalamnya:\n🎬 10 format video lengkap (POV, tutorial, opini, transformasi...)\n🪝 6 formula hook untuk 3 detik pertama\n🛒 Script produk untuk TikTok Shop\n📈 Strategi algoritma\n💬 Script engagement komunitas\n\nBuat kreator yang mau tumbuh, bukan cuma posting. $19.\n\n{{cta}}`,hashtags:["#TikTokIndonesia","#TikTokCreator","#KontenTikTok","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Indonesian TikTok creator recording video with phone, bright setup",language:"id"},
  {id:"play031",title:"Consulting Advisory Kit Promo",category:"announcement",platforms:["linkedin","facebook"],body_text:`🧩 25 Consulting Prompts — Sell Better. Deliver Faster. Retain More.\n\nFor independent consultants and fractional executives:\n\n🎯 Discovery call script that establishes authority\n📋 Consulting proposal template that converts\n📊 Recommendations report structure\n💰 Retainer offer letter that gets signed\n🔄 Project wrap-up + expansion pitch\n\nCharge more. Worry less. $29.\n\n{{cta}}`,hashtags:["#Consulting","#Freelancer","#FractionalCFO","#BusinessStrategy","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Consultant presenting strategy on whiteboard to executive team",language:"en"},
  {id:"play032",title:"Negotiation Mastery Promo",category:"announcement",platforms:["linkedin","twitter","facebook"],body_text:`🤜 20 Negotiation Prompts — Get Better Deals on Everything\n\n✅ Salary negotiation after job offer\n✅ Vendor price reduction (keep the relationship)\n✅ Partnership revenue share structure\n✅ Contract clause counter-proposals\n✅ Commercial lease negotiation points\n\nEvery prompt uses principled negotiation. BATNA analysis included.\n\nStop leaving money on the table. $19.\n\n{{cta}}`,hashtags:["#Negotiation","#SalaryNegotiation","#BusinessDeals","#Contracts","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Two business people shaking hands after successful deal negotiation",language:"en"},
  {id:"play033",title:"Compliance Policy Generator Promo",category:"announcement",platforms:["linkedin","facebook"],body_text:`📜 25 Compliance & Policy Prompts — Build a Legally Sound Business\n\nFor ops managers and HR directors:\n\n📋 Code of conduct (with employee acknowledgment)\n🔒 GDPR/CCPA-aligned data privacy notice\n🛡️ Anti-harassment and anti-discrimination policy\n🏠 Remote/hybrid work policy\n✅ 8 complete employee handbook sections\n\nPlain language. Legally neutral. $29.\n\n{{cta}}`,hashtags:["#Compliance","#HRPolicy","#GDPR","#EmployeeHandbook","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"HR professional reviewing policy documents on laptop in modern office",language:"en"},
  {id:"play034",title:"Etsy Handmade Seller Kit Promo",category:"announcement",platforms:["instagram","pinterest","facebook"],body_text:`🧶 25 Etsy Seller Prompts — Rank Higher. Convert More. Grow Faster.\n\nFor handmade creators and Etsy shop owners:\n\n🔍 SEO-optimized listing titles that get found\n📖 Product descriptions that make people feel it\n🌟 About page story that builds trust\n📦 Packaging insert card that gets 5-star reviews\n📧 Review generation message that actually works\n\nFor Etsy, Shopify, Handmade at Amazon. $19.\n\n{{cta}}`,hashtags:["#EtsySeller","#HandmadeBusiness","#EtsyShop","#SmallBusiness","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Etsy seller in creative studio with handmade products and laptop",language:"en"},
  {id:"play035",title:"Executive Leadership Pack Promo",category:"announcement",platforms:["linkedin","facebook"],body_text:`👑 25 Executive Communication Prompts — Lead with Clarity and Authority\n\nFor C-suite leaders:\n\n🎤 State of the business all-hands script\n🏦 Board presentation narrative\n📢 Organizational change announcement\n🚨 Crisis communications (holding + full response)\n💼 CEO letter to shareholders\n\nCommunicate like a CEO. Even if you already are one. $29.\n\n{{cta}}`,hashtags:["#ExecutiveLeadership","#CEO","#CSuite","#Leadership","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"CEO addressing company all-hands meeting, confident and clear",language:"en"},
  {id:"play036",title:"Airbnb STR Kit Promo",category:"announcement",platforms:["instagram","facebook","linkedin"],body_text:`🏡 25 Airbnb Host Prompts — More 5-Star Reviews. Higher Occupancy.\n\nFor short-term rental hosts:\n\n🏷️ Listing titles that rank in Airbnb search\n📸 Property descriptions guests can not resist\n💬 Guest messaging sequence (booking → checkout)\n⭐ Review generation for Superhost status\n💰 Direct booking pitch to bypass platform fees\n\nFor Airbnb, VRBO, Booking.com. $19.\n\n{{cta}}`,hashtags:["#Airbnb","#ShortTermRental","#AirbnbHost","#VRBO","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Cozy Airbnb with 5-star reviews and Superhost badge visible",language:"en"},
  {id:"play037",title:"Financial Modeling Kit Promo",category:"announcement",platforms:["linkedin","facebook"],body_text:`💹 20 Financial Modeling Prompts — Speak CFO. Think Investor.\n\nFor founders and finance professionals:\n\n📊 SaaS revenue model assumptions (investor-ready)\n📉 3-scenario model (base/bull/bear)\n💰 Unit economics one-pager (CAC, LTV, payback)\n📋 Board financial highlights (1 page)\n🏦 Fundraising use-of-proceeds narrative\n\nModel it. Narrate it. Win the room. $24.\n\n{{cta}}`,hashtags:["#FinancialModeling","#CFO","#StartupFinance","#FPA","#Investors","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Finance professional presenting financial model to investors with charts",language:"en"},
  {id:"play038",title:"Agency Consulting Bundle Promo",category:"announcement",platforms:["linkedin","facebook","instagram"],body_text:`🧩 Agency & Consulting Bundle — 4 Packs for $69 (worth $111)\n\nEverything to run a premium service business:\n\n💼 Freelancer Business Kit (25 prompts) — $19\n🧩 Consulting & Advisory Kit (25 prompts) — $29\n🎤 Meeting & Presentation Mastery (25 prompts) — $19\n📬 Cold DM & Outreach Masterclass (35 prompts) — $24\n\nTotal: 110 prompts. 38% off.\n\n{{cta}}`,hashtags:["#AgencyLife","#Consulting","#FreelanceBusiness","#AIBundle","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Premium service business owner reviewing client proposals in modern office",language:"en"},
  {id:"play039",title:"Content Creator Pro Bundle Promo",category:"announcement",platforms:["instagram","tiktok","youtube","facebook"],body_text:`📹 Content Creator Pro Bundle — 4 Packs for $59 (worth $101)\n\nMaster every video and text channel:\n\n🎬 YouTube Script Machine (30 prompts) — $19\n🎵 TikTok Content Machine (30 prompts) — $19\n🎙️ Podcast & Newsletter Engine (30 prompts) — $19\n✍️ LinkedIn Article & Newsletter Pro (20 prompts) — $19\n\nTotal: 110 prompts. 42% off.\n\n{{cta}}`,hashtags:["#ContentCreator","#YouTube","#TikTok","#Podcast","#LinkedIn","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Multi-platform content creator with YouTube TikTok and podcast setup all visible",language:"en"},
  {id:"play040",title:"Real Estate Pro Bundle Promo",category:"announcement",platforms:["facebook","instagram","linkedin"],body_text:`🏠 Real Estate Pro Bundle — 4 Packs for $69 (worth $106)\n\nDominate every real estate niche:\n\n🏠 Real Estate Agent Kit — $24\n🏗️ Property Investor Playbook — $24\n🏡 Airbnb & STR Kit — $19\n🏙️ Commercial Real Estate Kit — $24\n\nTotal: 95 prompts. 35% off.\n\n{{cta}}`,hashtags:["#RealEstate","#RealEstateInvesting","#Airbnb","#CommercialRealEstate","#AIPrompts","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Real estate professional with residential commercial and rental properties in background",language:"en"},
  {id:"play041",title:"Mega Bundle 48 Playbooks Promo",category:"announcement",platforms:["facebook","instagram","linkedin","twitter"],body_text:`💥 MEGA BUNDLE — All 48 AXTO Playbooks for $99 (worth $775)\n\n1,000+ prompts. Every category:\n✍️ 8 Copywriting & Brand packs\n💼 7 Business & Strategy packs\n📝 5 Content & Creator packs\n⚖️ 3 Legal, HR & Compliance packs\n🛒 4 E-Commerce packs\n🚀 5 SaaS & Startup packs\n🎓 4 Education packs\n👔 4 Career packs\n🏠 4 Real Estate packs\n📊 4 Data & Finance packs\n\nLifetime access. $99 once. Never expires.\n\n{{cta}}`,hashtags:["#AIBundle","#AIPrompts","#ChatGPT","#Claude","#Gemini","#MegaBundle","#AXTO"],cta_text:"🔗 axto.io/playbooks",image_prompt:"AXTO Mega Bundle premium display with all 10 category icons gold branding",language:"en"},
  {id:"play042",title:"Mega Bundle 48 ID Promo",category:"announcement",platforms:["facebook","instagram"],body_text:`💥 MEGA BUNDLE — Semua 48 Playbook AXTO, $99 (senilai $775)\n\n1.000+ prompt. Semua kategori:\n✍️ 8 pack Copywriting & Brand\n💼 7 pack Bisnis & Strategi\n📝 5 pack Konten & Kreator\n⚖️ 3 pack Legal, HR & Compliance\n🛒 4 pack E-Commerce\n🚀 5 pack SaaS & Startup\n🎓 4 pack Edukasi\n👔 4 pack Karir & LinkedIn\n🏠 4 pack Properti\n📊 4 pack Data & Keuangan\n\nAkses seumur hidup. Bayar $99 sekali.\n\n{{cta}}`,hashtags:["#AIPrompts","#ChatGPT","#AXTO","#MegaBundle","#Produktivitas","#BundleAI"],cta_text:"🔗 axto.io/playbooks",image_prompt:"Indonesian professional with all 10 AXTO playbook categories on screen",language:"id"},
];

// ─────────────────────────────────────────────────────────────────────────────
// VAULT TEMPLATES — AI Privacy Layer (10 templates)
// ─────────────────────────────────────────────────────────────────────────────
export const VAULT_TEMPLATES: AutoPostTemplate[] = [
  {id:"vault001",title:"Vault — Stop Leaking PII to AI Models",category:"vault",platforms:["linkedin","twitter","facebook"],body_text:`Your team is sending customer data to OpenAI, Claude, and Gemini every day.\n\nNames. Emails. Phone numbers. Medical details. Financial records.\n\nAXTO Vault sits between your apps and every AI provider — automatically detecting and redacting PII, PHI, and financial data before it ever leaves your server.\n\nZero cloud upload. Zero data exposure. Full compliance.\n\nEvery AI call. Every provider. Every time.\n\n{{cta}}`,hashtags:["#DataPrivacy","#AICompliance","#GDPR","#HIPAA","#SelfHosted","#AXTO"],cta_text:"🔗 axto.io/vault",image_prompt:"Enterprise server room with data privacy shield blocking PII from AI cloud icons",language:"en"},
  {id:"vault002",title:"Vault — GDPR & HIPAA Without Slowing Down AI",category:"vault",platforms:["linkedin","facebook"],body_text:`GDPR violation fines start at €20M.\nHIPAA penalties reach $1.9M per incident.\n\nBut your developers still need AI to build faster.\n\nAXTO Vault gives you both: automatic PII/PHI redaction on every AI call, with no impact to your development velocity.\n\nNo new policies to enforce. No developer behavior to change. Vault handles it at the infrastructure layer — transparently, in real time.\n\nSelf-hosted. Your server. Your data never leaves.\n\n{{cta}}`,hashtags:["#GDPR","#HIPAA","#DataCompliance","#PrivacyByDesign","#AXTO","#SelfHosted"],cta_text:"🔗 axto.io/vault",image_prompt:"Compliance officer reviewing GDPR and HIPAA checkmarks with AI data redaction system",language:"en"},
  {id:"vault003",title:"Vault ID — Lindungi Data Pelanggan Sebelum ke AI",category:"vault",platforms:["linkedin","facebook","instagram"],body_text:`Setiap hari tim kamu mengirim data pelanggan ke ChatGPT, Claude, dan Gemini.\n\nNama. Email. Nomor HP. Data medis. Data keuangan.\n\nAXTO Vault berdiri di antara aplikasimu dan semua AI provider — mendeteksi dan menyensor PII, PHI, dan data finansial secara otomatis sebelum meninggalkan servermu.\n\nTanpa upload ke cloud. Tanpa exposure data. Compliance penuh.\n\nSelf-hosted. Servermu sendiri.\n\n{{cta}}`,hashtags:["#DataPrivacy","#GDPR","#KeamananData","#SelfHosted","#AXTO","#AIPrivacy"],cta_text:"🔗 axto.io/vault",image_prompt:"Indonesian enterprise server with data privacy shield protecting customer PII from AI providers",language:"id"},
  {id:"vault004",title:"Vault — What Gets Redacted, What Gets Through",category:"vault",platforms:["linkedin","twitter"],body_text:`AXTO Vault detects and redacts:\n\n• Names, emails, phone numbers, addresses\n• SSN, passport, national ID numbers\n• Credit card, bank account, IBAN numbers\n• Medical record numbers, diagnosis codes\n• IP addresses, device identifiers\n• Custom regex patterns you define\n\nAnd passes through everything else — unchanged, undelayed.\n\nYour AI models get context. Your compliance team gets peace of mind.\n\nSelf-hosted. Zero cloud dependency.\n\n{{cta}}`,hashtags:["#PII","#PHI","#DataRedaction","#AIPrivacy","#AXTO"],cta_text:"🔗 axto.io/vault",image_prompt:"Clean technical diagram showing PII redaction flow before AI model ingestion",language:"en"},
  {id:"vault005",title:"Vault — vs Nightfall & AWS Comprehend",category:"vault",platforms:["linkedin","twitter","facebook"],body_text:`Nightfall AI: $0.007/unit — all your data processed in their cloud.\nAWS Comprehend: per-unit pricing, AWS retains your data.\n\nAXTO Vault: flat license, self-hosted, your data never leaves your server.\n\nSame detection quality. Fraction of the cost. Full data sovereignty.\n\nNo per-call charges that compound as your AI usage scales.\nNo third-party SaaS that can be breached, subpoenaed, or discontinued.\n\n{{cta}}`,hashtags:["#DataPrivacy","#SelfHosted","#BYOK","#AICompliance","#AXTO","#CostReduction"],cta_text:"🔗 axto.io/vault",image_prompt:"Cost comparison chart showing self-hosted vault versus cloud PII detection services",language:"en"},
  {id:"vault006",title:"Vault — HealthTech Use Case",category:"vault",platforms:["linkedin","facebook"],body_text:`HealthTech teams face a brutal tradeoff:\n\n→ Use AI to accelerate diagnosis support, patient notes, and care planning\n→ But PHI can never reach a third-party AI model under HIPAA\n\nAXTO Vault eliminates the tradeoff.\n\nEvery clinical note, patient message, and medical record is automatically scrubbed of PHI before reaching any AI provider. The AI gets full context — without the identifiers.\n\nBAA-ready. Self-hosted. Audit trail included.\n\n{{cta}}`,hashtags:["#HealthTech","#HIPAA","#PHI","#MedicalAI","#DataPrivacy","#AXTO"],cta_text:"🔗 axto.io/vault",image_prompt:"Healthcare professional using AI tools with HIPAA compliance shield visible on workstation",language:"en"},
  {id:"vault007",title:"Vault — FinTech Use Case",category:"vault",platforms:["linkedin","twitter"],body_text:`Financial services firms want AI for:\n• Fraud detection narratives\n• Customer support automation\n• Document analysis and KYC\n\nBut sending account numbers, transaction records, and PAN data to OpenAI is a PCI-DSS violation.\n\nAXTO Vault automatically redacts card numbers, account identifiers, and transaction amounts before every AI call — letting your team use AI without the regulatory exposure.\n\nSelf-hosted. PCI-DSS aligned. Full audit logging.\n\n{{cta}}`,hashtags:["#FinTech","#PCIDSS","#DataPrivacy","#BankingAI","#AXTO","#RegTech"],cta_text:"🔗 axto.io/vault",image_prompt:"Fintech developer using AI tools with PCI DSS compliance badge and transaction data being redacted",language:"en"},
  {id:"vault008",title:"Vault — BYOK Policy Explained",category:"vault",platforms:["linkedin","twitter","facebook"],body_text:`A privacy tool that processes your data in someone else's cloud is not a privacy tool.\n\nAXTO Vault is different.\n\nYour configuration, detection rules, and redaction logs stay on your server.\nYour AI provider keys are configured on your server only.\nAXTO receives: your license key and machine ID. Nothing else.\n\nThis is the BYOK (Bring Your Own Keys) model — and it's non-negotiable in every AXTO product.\n\nPrivacy infrastructure that respects privacy. Imagine that.\n\n{{cta}}`,hashtags:["#BYOK","#DataSovereignty","#SelfHosted","#PrivacyFirst","#AXTO"],cta_text:"🔗 axto.io/vault",image_prompt:"Server diagram showing BYOK architecture with AI keys stored locally never sent to vendor",language:"en"},
  {id:"vault009",title:"Vault — Quick Deploy (Docker)",category:"vault",platforms:["linkedin","twitter"],body_text:`AXTO Vault is running in under 10 minutes.\n\ndocker pull axto/vault-core\n# Edit vault.yml with your AI provider keys\ndocker-compose up -d\ncurl http://localhost:8080/health\n\nThat's it. PII/PHI redaction active for every AI call your apps make.\n\nNo agents. No SDKs. No app code changes required.\nPoint your AI provider URL at Vault's endpoint.\n\n{{cta}}`,hashtags:["#Docker","#DevOps","#SelfHosted","#AIPrivacy","#AXTO","#PII"],cta_text:"🔗 axto.io/vault",image_prompt:"Terminal showing AXTO Vault Docker deployment with health check returning green status",language:"en"},
  {id:"vault010",title:"Vault ID — Use Case E-Commerce & Startup",category:"vault",platforms:["instagram","facebook","linkedin"],body_text:`Startup kamu pakai AI untuk:\n• Customer support otomatis\n• Analisis feedback pelanggan\n• Personalisasi produk\n\nTapi data pelanggan (nama, email, nomor HP) tidak boleh masuk ke API pihak ketiga.\n\nAXTO Vault melindungi setiap panggilan AI secara otomatis — redact data sensitif sebelum keluar dari servermu.\n\nBukan SaaS. Bukan cloud third-party. Servermu sendiri, kontrolmu penuh.\n\n{{cta}}`,hashtags:["#Startup","#ECommerce","#DataPrivacy","#GDPR","#SelfHosted","#AXTO"],cta_text:"🔗 axto.io/vault",image_prompt:"Indonesian startup team using AI customer support with data privacy protection visible",language:"id"},
];

// ─────────────────────────────────────────────────────────────────────────────
// EDGE TEMPLATES — AI Gateway & API Management (10 templates)
// ─────────────────────────────────────────────────────────────────────────────
export const EDGE_TEMPLATES: AutoPostTemplate[] = [
  {id:"edge001",title:"Edge — One Endpoint for Every AI Provider",category:"edge",platforms:["linkedin","twitter","facebook"],body_text:`Your engineering team is maintaining API integrations for:\n- OpenAI\n- Anthropic\n- Google Gemini\n- Azure OpenAI\n- Mistral\n- Local Ollama models\n\nEach with different auth, rate limits, error formats, and retry logic.\n\nAXTO Edge gives you one endpoint. One auth model. One observability layer.\n\nRoute any request to any provider — with automatic fallback, caching, cost controls, and rate limiting. Self-hosted, your infrastructure.\n\n{{cta}}`,hashtags:["#AIGateway","#LLMOps","#SelfHosted","#APIManagement","#AXTO"],cta_text:"🔗 axto.io/edge",image_prompt:"Clean architecture diagram showing single AI gateway routing to multiple LLM providers",language:"en"},
  {id:"edge002",title:"Edge — Cut AI Costs 40-70% with Semantic Caching",category:"edge",platforms:["linkedin","twitter"],body_text:`Your AI bill is mostly duplicate requests.\n\nCustomers asking the same questions. Developers running the same prompts. Apps calling the same analysis repeatedly.\n\nAXTO Edge's semantic cache detects near-identical requests and returns cached responses — without touching your AI provider.\n\nReal deployments report 40–70% cost reduction within 30 days.\n\nFlat license. No per-token charge. The savings compound as your usage grows.\n\n{{cta}}`,hashtags:["#LLMCost","#SemanticCache","#AIOptimization","#CostReduction","#AXTO"],cta_text:"🔗 axto.io/edge",image_prompt:"Dashboard showing AI cost reduction graph after implementing semantic caching with AXTO Edge",language:"en"},
  {id:"edge003",title:"Edge — Rate Limiting & Quota Management",category:"edge",platforms:["linkedin","facebook","twitter"],body_text:`One runaway script can exhaust your entire monthly OpenAI budget in an hour.\n\nAXTO Edge enforces:\n• Per-user token quotas\n• Per-team daily spending limits\n• Burst rate limiting per endpoint\n• Hard cost caps per environment\n\nWith automatic fallback to cheaper models when limits approach — so operations continue without budget shock.\n\nSelf-hosted. No per-request SaaS fee. Your rules, your infrastructure.\n\n{{cta}}`,hashtags:["#AIGateway","#RateLimiting","#LLMOps","#CostControl","#AXTO"],cta_text:"🔗 axto.io/edge",image_prompt:"Engineering dashboard showing AI rate limiting and quota management controls per team",language:"en"},
  {id:"edge004",title:"Edge — vs Kong AI Gateway, Portkey, LiteLLM",category:"edge",platforms:["linkedin","twitter"],body_text:`Kong AI Gateway: cloud-dependent, vendor pricing.\nPortkey: SaaS, your requests proxied through their infra.\nLiteLLM: open-source, no enterprise license, no structured setup guidance.\n\nAXTO Edge: self-hosted, enterprise license, full control.\n\nSame capability set — routing, caching, rate limiting, observability.\nZero dependency on third-party SaaS infrastructure.\nYour traffic never leaves your network.\n\n{{cta}}`,hashtags:["#AIGateway","#LLMProxy","#SelfHosted","#LLMOps","#AXTO"],cta_text:"🔗 axto.io/edge",image_prompt:"Feature comparison chart showing AXTO Edge self-hosted advantage over cloud AI gateway providers",language:"en"},
  {id:"edge005",title:"Edge — Intelligent Model Routing",category:"edge",platforms:["linkedin","twitter","facebook"],body_text:`Not every AI request needs GPT-4o.\n\nAXTO Edge routes automatically:\n• Simple classification → cheapest fast model\n• Complex reasoning → most capable model\n• Real-time chat → lowest-latency provider\n• Code generation → specialized code model\n\nBased on your rules: cost per token, latency threshold, capability requirements.\n\nShip smarter. Pay only for what the task actually needs.\n\n{{cta}}`,hashtags:["#ModelRouting","#LLMOps","#AIOptimization","#SmartRouting","#AXTO"],cta_text:"🔗 axto.io/edge",image_prompt:"Intelligent routing diagram showing different AI requests going to optimal LLM models",language:"en"},
  {id:"edge006",title:"Edge — Full Observability on Every AI Call",category:"edge",platforms:["linkedin","twitter"],body_text:`You can't optimize what you can't see.\n\nAXTO Edge logs every AI request with:\n• Model used, tokens in/out, latency\n• Cost per request, per user, per team\n• Cache hit/miss ratio\n• Error rates and fallback events\n• Prompt and response (optional, redacted if Vault is active)\n\nFull observability. No data sent to third parties.\nExport to your SIEM, Grafana, or Elasticsearch.\n\n{{cta}}`,hashtags:["#LLMObservability","#AIMonitoring","#LLMOps","#DataSovereignty","#AXTO"],cta_text:"🔗 axto.io/edge",image_prompt:"Observability dashboard showing real-time AI gateway metrics tokens cost latency and cache performance",language:"en"},
  {id:"edge007",title:"Edge — Zero Downtime with Automatic Failover",category:"edge",platforms:["linkedin","facebook"],body_text:`OpenAI has outages. Anthropic has rate limit errors. Azure has regional incidents.\n\nAXTO Edge handles all of it automatically.\n\nConfigure fallback chains:\nPrimary: gpt-4o → Fallback 1: claude-3-5-sonnet → Fallback 2: local Ollama\n\nWhen the primary provider fails, Edge retries the next in your chain — transparently, without changing a single line of application code.\n\nFive-nines availability. Entirely on your infrastructure.\n\n{{cta}}`,hashtags:["#HighAvailability","#AIGateway","#Failover","#Resilience","#AXTO"],cta_text:"🔗 axto.io/edge",image_prompt:"Resilience diagram showing automatic failover between multiple AI providers with zero downtime",language:"en"},
  {id:"edge008",title:"Edge ID — Satu Endpoint untuk Semua AI Provider",category:"edge",platforms:["linkedin","facebook","instagram"],body_text:`Tim engineeringmu merawat integrasi terpisah untuk:\n- OpenAI\n- Anthropic Claude\n- Google Gemini\n- Model Ollama lokal\n\nMasing-masing dengan auth, rate limit, dan format error yang berbeda.\n\nAXTO Edge: satu endpoint, satu auth, satu layer observabilitas untuk semua AI provider.\n\nRouting otomatis, cache semantik, rate limiting, cost control — di servermu sendiri.\n\n{{cta}}`,hashtags:["#AIGateway","#LLMOps","#SelfHosted","#AXTO","#Infrastruktur","#AIIndonesia"],cta_text:"🔗 axto.io/edge",image_prompt:"Indonesian engineering team with single AI gateway dashboard managing multiple LLM providers",language:"id"},
  {id:"edge009",title:"Edge — A/B Test Your Prompts and Models",category:"edge",platforms:["linkedin","twitter"],body_text:`Which model performs better for your use case?\nWhich prompt version gets higher user satisfaction?\n\nAXTO Edge lets you route a percentage of traffic to different models or prompt variants — measuring cost, latency, and downstream quality metrics in parallel.\n\nShip decisions with data, not gut feel.\n\nNo new infrastructure. No third-party experimentation platform. Built into Edge.\n\n{{cta}}`,hashtags:["#ABTesting","#PromptEngineering","#LLMOps","#AIExperimentation","#AXTO"],cta_text:"🔗 axto.io/edge",image_prompt:"A/B testing dashboard showing two AI model variants being tested with performance metrics",language:"en"},
  {id:"edge010",title:"Edge — BYOK: Your Keys, Your Traffic",category:"edge",platforms:["linkedin","twitter","facebook"],body_text:`Every AI gateway SaaS product is a liability:\n\n→ Your API keys sit in their database\n→ Your prompts and responses traverse their servers\n→ You depend on their uptime\n→ You accept their terms and data practices\n\nAXTO Edge stores your AI provider keys on your server only.\nYour traffic flows from your app → Edge → AI provider. Zero third-party routing.\n\nThis isn't a privacy feature. This is table stakes for enterprise AI.\n\n{{cta}}`,hashtags:["#BYOK","#DataSovereignty","#AIGateway","#EnterpriseAI","#AXTO"],cta_text:"🔗 axto.io/edge",image_prompt:"Enterprise architecture diagram showing AI traffic flowing directly from self-hosted gateway to providers",language:"en"},
];

// ─────────────────────────────────────────────────────────────────────────────
// SOC TEMPLATES — Security Operations Center (10 templates)
// ─────────────────────────────────────────────────────────────────────────────
export const SOC_TEMPLATES: AutoPostTemplate[] = [
  {id:"soc001",title:"SOC — AI-Augmented Threat Detection Without Log Exfiltration",category:"soc",platforms:["linkedin","facebook","twitter"],body_text:`Every SIEM SaaS product has the same fatal flaw:\n\nTo analyze your security logs, they need your security logs.\n\nYour firewall events, authentication failures, endpoint telemetry, and network flows — all shipped to a third-party cloud.\n\nAXTO SOC processes everything on your infrastructure. AI threat detection, UEBA, correlation, and incident response — without a single log line leaving your network.\n\nThis is what security operations should look like.\n\n{{cta}}`,hashtags:["#SIEM","#SOC","#ThreatDetection","#SelfHosted","#CyberSecurity","#AXTO"],cta_text:"🔗 axto.io/soc",image_prompt:"Security operations center with AI threat detection dashboard and self-hosted infrastructure diagram",language:"en"},
  {id:"soc002",title:"SOC — vs Splunk, QRadar, Elastic SIEM",category:"soc",platforms:["linkedin","twitter"],body_text:`Splunk: $150/GB/day ingest cost. Data leaves your network.\nQRadar: six-figure annual contracts. Cloud options ship your logs to IBM.\nElastic SIEM: open-source complexity plus cloud licensing costs.\n\nAXTO SOC: flat enterprise license. Self-hosted. AI-native.\n\nSame detection capabilities — correlation, UEBA, threat intelligence enrichment, incident management.\nFraction of the cost. Zero log exfiltration. Full data sovereignty.\n\n{{cta}}`,hashtags:["#SIEM","#CyberSecurity","#SelfHosted","#ThreatDetection","#AXTO","#SOC"],cta_text:"🔗 axto.io/soc",image_prompt:"Cost and capability comparison chart showing AXTO SOC versus traditional enterprise SIEM vendors",language:"en"},
  {id:"soc003",title:"SOC — UEBA: Catch What Rules Miss",category:"soc",platforms:["linkedin","facebook"],body_text:`Signature-based detection misses:\n\n→ Insider threats from legitimate accounts\n→ Slow-and-low credential theft\n→ Living-off-the-land techniques using native tools\n→ Novel attack patterns with no prior signature\n\nAXTO SOC's UEBA engine builds behavioral baselines for every user and entity — detecting anomalies that no rule would ever catch.\n\nZero-day defense. Insider threat detection. On your infrastructure.\n\n{{cta}}`,hashtags:["#UEBA","#InsiderThreat","#ThreatDetection","#ZeroDay","#CyberSecurity","#AXTO"],cta_text:"🔗 axto.io/soc",image_prompt:"Security analyst reviewing UEBA behavioral baseline dashboard detecting anomalous user activity",language:"en"},
  {id:"soc004",title:"SOC — SOAR Automation: From Alert to Response in Seconds",category:"soc",platforms:["linkedin","twitter","facebook"],body_text:`Mean Time to Respond (MTTR) is the metric that matters in a breach.\n\nAXTO SOC's SOAR engine automates:\n• Host isolation on confirmed threat\n• IP block across firewall and WAF\n• Password reset for compromised accounts\n• Forensic artifact collection\n• Slack/Teams/email alert to on-call analyst\n\nFrom detection to containment: seconds, not hours.\n\nAll automated. All on your infrastructure. All auditable.\n\n{{cta}}`,hashtags:["#SOAR","#IncidentResponse","#CyberSecurity","#Automation","#AXTO","#SOC"],cta_text:"🔗 axto.io/soc",image_prompt:"SOAR automation flow diagram showing alert to automated response workflow timeline",language:"en"},
  {id:"soc005",title:"SOC — Threat Intelligence Enrichment at Scale",category:"soc",platforms:["linkedin","twitter"],body_text:`Raw logs are noise. Context is signal.\n\nAXTO SOC automatically enriches every alert with:\n• IP reputation (VirusTotal, AbuseIPDB, Shodan)\n• Domain threat intelligence\n• File hash verdicts (MalwareBazaar, MISP)\n• CVE data for exploit attempts\n• MITRE ATT&CK technique mapping\n\nYour analysts see context, not raw data. MTTR drops. False positives drop.\n\nAll enrichment queries use your API keys — BYOK, zero data exposure.\n\n{{cta}}`,hashtags:["#ThreatIntelligence","#MITRE","#SOC","#CyberSecurity","#AXTO","#SIEM"],cta_text:"🔗 axto.io/soc",image_prompt:"Alert enrichment dashboard showing IP reputation threat intel and MITRE ATT&CK mapping",language:"en"},
  {id:"soc006",title:"SOC ID — Deteksi Ancaman Tanpa Kirim Log ke Cloud",category:"soc",platforms:["linkedin","facebook","instagram"],body_text:`Semua produk SIEM berbasis cloud punya masalah yang sama:\n\nUntuk menganalisis log keamananmu, mereka butuh log keamananmu.\n\nFirewall events, login failures, endpoint telemetry — semua dikirim ke server pihak ketiga.\n\nAXTO SOC memproses semuanya di infrastrukturmu sendiri. AI threat detection, UEBA, korelasi, incident response — tanpa satu pun baris log meninggalkan jaringanmu.\n\n{{cta}}`,hashtags:["#Keamanan","#SOC","#SIEM","#SelfHosted","#CyberSecurity","#AXTO"],cta_text:"🔗 axto.io/soc",image_prompt:"Indonesian security team monitoring threats with self-hosted SOC dashboard showing local data processing",language:"id"},
  {id:"soc007",title:"SOC — Log Ingestion: Every Source Supported",category:"soc",platforms:["linkedin","twitter"],body_text:`AXTO SOC ingests from every log source your environment uses:\n\n• Syslog (UDP/TCP)\n• Windows Event Forwarding\n• AWS CloudTrail\n• CEF (Common Event Format)\n• LEEF (Log Event Extended Format)\n• JSON API push\n• Custom regex parsers\n\nNo proprietary agents. No vendor lock-in. No per-GB ingest fees.\n\nIf it generates logs, SOC can ingest it.\n\n{{cta}}`,hashtags:["#SIEM","#LogManagement","#SOC","#CyberSecurity","#SelfHosted","#AXTO"],cta_text:"🔗 axto.io/soc",image_prompt:"Multi-source log ingestion architecture diagram showing all data sources flowing into self-hosted SOC",language:"en"},
  {id:"soc008",title:"SOC — Compliance Reporting Built In",category:"soc",platforms:["linkedin","facebook"],body_text:`SOC 2, ISO 27001, PCI-DSS, HIPAA, NIST CSF.\n\nEvery framework requires evidence of:\n• Access monitoring and anomaly detection\n• Incident response procedures and timelines\n• Log retention and integrity\n• Change management audit trails\n\nAXTO SOC generates audit-ready reports for all major frameworks — pulling directly from your security event data.\n\nYour auditor gets structured evidence. You get fewer audit cycles.\n\n{{cta}}`,hashtags:["#SOC2","#ISO27001","#ComplianceReporting","#Audit","#CyberSecurity","#AXTO"],cta_text:"🔗 axto.io/soc",image_prompt:"Compliance officer reviewing automated audit reports from SOC platform showing framework coverage",language:"en"},
  {id:"soc009",title:"SOC — Mean Time to Detect: Under 5 Minutes",category:"soc",platforms:["linkedin","twitter","facebook"],body_text:`Industry average MTTD (Mean Time to Detect) is 197 days.\n\nThat's 197 days an attacker has already been in your network.\n\nAXTO SOC's real-time correlation engine processes logs as they arrive — triggering alerts within seconds of anomalous pattern detection.\n\nWith AI-augmented analysis, the noise-to-signal ratio drops dramatically. Your analysts respond to real threats, not alert fatigue.\n\nMTTD under 5 minutes. MTTR under 30 minutes. On your infrastructure.\n\n{{cta}}`,hashtags:["#MTTD","#MTTR","#ThreatDetection","#SOC","#CyberSecurity","#AXTO"],cta_text:"🔗 axto.io/soc",image_prompt:"Security metrics dashboard showing MTTD under 5 minutes and MTTR under 30 minutes after AXTO SOC deployment",language:"en"},
  {id:"soc010",title:"SOC — For MSSPs and Multi-Tenant Deployments",category:"soc",platforms:["linkedin","facebook"],body_text:`MSSPs managing security operations for multiple clients need:\n\n• Complete tenant isolation — client A never sees client B's data\n• Per-tenant alert rules, escalation paths, and response tracking\n• Consolidated reporting across all clients\n• Configurable retention per client contract\n\nAXTO SOC supports multi-tenant deployments natively — with full isolation, per-tenant dashboards, and white-label reporting.\n\nOne platform. All your clients. Your infrastructure.\n\n{{cta}}`,hashtags:["#MSSP","#ManagedSecurity","#SOC","#MultiTenant","#CyberSecurity","#AXTO"],cta_text:"🔗 axto.io/soc",image_prompt:"MSSP security operations center managing multiple client environments with isolated dashboards",language:"en"},
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE TEMPLATES — Automated Audit Platform (10 templates)
// ─────────────────────────────────────────────────────────────────────────────
export const COMPLIANCE_TEMPLATES: AutoPostTemplate[] = [
  {id:"cmpl001",title:"Compliance — Continuous, Not Point-in-Time",category:"compliance",platforms:["linkedin","twitter","facebook"],body_text:`Annual SOC 2 audits cost $30K–$100K.\nAnd you're only compliant on audit day.\n\nAXTO Compliance monitors your controls continuously — every hour, every day — so you're audit-ready 365 days a year.\n\nWhen an auditor asks for evidence, you export it. You don't scramble to produce it.\n\nContinuous compliance. Self-hosted. No SaaS platform with access to your data.\n\n{{cta}}`,hashtags:["#SOC2","#Compliance","#Audit","#AXTO","#ISO27001","#HIPAA"],cta_text:"🔗 axto.io/compliance",image_prompt:"Compliance dashboard showing continuous monitoring across all control frameworks 365 days",language:"en"},
  {id:"cmpl002",title:"Compliance — vs Vanta, Drata, Secureframe",category:"compliance",platforms:["linkedin","twitter"],body_text:`Vanta: $20K+/year. Your integration data lives on their SaaS platform.\nDrata: similar pricing, similar data exposure model.\nSecureframe: SaaS-hosted, third-party access to your compliance evidence.\n\nAXTO Compliance: flat enterprise license. Self-hosted. Your evidence stays in your environment.\n\nContinuous monitoring. Automated evidence collection. Audit-ready reports.\nAt a fraction of SaaS pricing — with full data sovereignty.\n\n{{cta}}`,hashtags:["#Compliance","#SOC2","#SelfHosted","#AuditReady","#AXTO","#GRC"],cta_text:"🔗 axto.io/compliance",image_prompt:"Pricing comparison showing AXTO Compliance flat license versus annual SaaS compliance platforms",language:"en"},
  {id:"cmpl003",title:"Compliance — Frameworks Covered",category:"compliance",platforms:["linkedin","facebook","twitter"],body_text:`AXTO Compliance monitors controls across:\n\n✅ SOC 2 Type I & Type II (AICPA Trust Services)\n✅ ISO 27001:2022\n✅ HIPAA Security Rule\n✅ PCI-DSS v4.0\n✅ NIST CSF 2.0\n✅ GDPR Technical Controls\n✅ CIS Controls v8\n\nSingle dashboard. All frameworks. Continuous evidence collection.\n\nStart with one framework. Add others without redeployment.\n\n{{cta}}`,hashtags:["#SOC2","#ISO27001","#HIPAA","#PCIDSS","#NIST","#GDPR","#AXTO"],cta_text:"🔗 axto.io/compliance",image_prompt:"Compliance framework coverage dashboard showing SOC2 ISO27001 HIPAA PCIDSS NIST GDPR status",language:"en"},
  {id:"cmpl004",title:"Compliance — Automated Evidence Collection",category:"compliance",platforms:["linkedin","twitter","facebook"],body_text:`The most time-consuming part of any audit is collecting evidence.\n\nScreenshots. Log exports. Policy documents. Access reviews. Change records.\n\nAXTO Compliance automates evidence collection from:\n• AWS, GCP, Azure (infrastructure controls)\n• GitHub/GitLab (change management)\n• Your SSO/IAM provider (access controls)\n• Ticketing systems (incident records)\n• Internal policy document store\n\nWhen the auditor asks — you click export. That's it.\n\n{{cta}}`,hashtags:["#AuditAutomation","#EvidenceCollection","#SOC2","#Compliance","#AXTO"],cta_text:"🔗 axto.io/compliance",image_prompt:"Automated evidence collection flow showing integration with cloud providers and audit export",language:"en"},
  {id:"cmpl005",title:"Compliance ID — Audit-Ready Setiap Hari, Bukan Setahun Sekali",category:"compliance",platforms:["linkedin","facebook","instagram"],body_text:`Audit SOC 2 tahunan biaya $30.000–$100.000.\nDan kamu hanya compliant di hari audit saja.\n\nAXTO Compliance memonitor kontrol secara berkelanjutan — setiap jam, setiap hari — sehingga kamu audit-ready 365 hari setahun.\n\nSelf-hosted. Datamu tidak keluar dari server.\nSatu platform untuk semua framework: SOC 2, ISO 27001, HIPAA, GDPR.\n\n{{cta}}`,hashtags:["#Compliance","#SOC2","#ISO27001","#SelfHosted","#AXTO","#GRC"],cta_text:"🔗 axto.io/compliance",image_prompt:"Indonesian compliance team with continuous monitoring dashboard showing audit readiness score",language:"id"},
  {id:"cmpl006",title:"Compliance — Gap Analysis in Under 1 Hour",category:"compliance",platforms:["linkedin","twitter"],body_text:`Before you can achieve SOC 2, you need to know where you stand.\n\nAXTO Compliance runs a full gap analysis against your chosen framework:\n\n1. Connect your infrastructure (AWS/GCP/Azure)\n2. Connect your identity provider\n3. Connect your code repositories\n4. Run gap analysis → get prioritized control gaps\n\nUnder one hour from deployment to knowing exactly what needs fixing.\n\n{{cta}}`,hashtags:["#GapAnalysis","#SOC2Readiness","#Compliance","#AuditPrep","#AXTO"],cta_text:"🔗 axto.io/compliance",image_prompt:"Gap analysis dashboard showing control coverage percentage by framework with prioritized remediation list",language:"en"},
  {id:"cmpl007",title:"Compliance — Policy Engine & Template Library",category:"compliance",platforms:["linkedin","facebook"],body_text:`Writing compliance policies from scratch wastes weeks.\n\nAXTO Compliance includes a library of 150+ pre-written policy templates aligned to major frameworks:\n\n• Access Control Policy\n• Incident Response Plan\n• Business Continuity Plan\n• Risk Assessment Procedure\n• Vendor Management Policy\n• Data Classification Standard\n\nCustomize, version-control, and link each policy to the controls it satisfies. Your auditor gets a complete policy evidence package.\n\n{{cta}}`,hashtags:["#CompliancePolicies","#SOC2","#PolicyManagement","#GRC","#AXTO"],cta_text:"🔗 axto.io/compliance",image_prompt:"Policy library interface showing 150+ compliance policy templates organized by framework",language:"en"},
  {id:"cmpl008",title:"Compliance — Risk Register and Vendor Risk",category:"compliance",platforms:["linkedin","twitter","facebook"],body_text:`Every SOC 2 and ISO 27001 audit asks the same questions:\n\n→ What are your top 10 risks and how are they mitigated?\n→ What is your vendor risk management process?\n→ How do you assess third-party security posture?\n\nAXTO Compliance maintains your risk register continuously — tracking identified risks, mitigation status, residual risk, and review dates.\n\nVendor assessments tracked in the same platform.\n\n{{cta}}`,hashtags:["#RiskManagement","#VendorRisk","#SOC2","#ISO27001","#GRC","#AXTO"],cta_text:"🔗 axto.io/compliance",image_prompt:"Risk register dashboard showing risk heat map vendor assessments and mitigation tracking",language:"en"},
  {id:"cmpl009",title:"Compliance — SaaS Startups Path to SOC 2",category:"compliance",platforms:["linkedin","twitter"],body_text:`Enterprise customers require SOC 2 before signing.\nYou can't wait 18 months for a traditional compliance program.\n\nAXTO Compliance accelerates the path:\n\nWeek 1: Gap analysis, policy deployment\nWeek 2-4: Control implementation with guided checklists\nMonth 2-3: Evidence collection, auditor readiness review\nMonth 4+: Type I audit, then continuous Type II monitoring\n\nFastest path to the report your enterprise customers are waiting for.\n\n{{cta}}`,hashtags:["#SOC2","#StartupCompliance","#SaaS","#AuditReady","#AXTO","#EnterpriseReady"],cta_text:"🔗 axto.io/compliance",image_prompt:"Startup compliance roadmap showing timeline from gap analysis to SOC 2 Type II report",language:"en"},
  {id:"cmpl010",title:"Compliance — BYOK & No Third-Party Data Access",category:"compliance",platforms:["linkedin","twitter","facebook"],body_text:`A compliance platform that stores your audit evidence on their servers is itself a compliance risk.\n\nAXTO Compliance is self-hosted — your evidence, your policy documents, your control data, and your audit reports stay on your infrastructure.\n\nAXTO never accesses your compliance data.\nAXTO receives only: your license key and machine ID.\n\nCompliance tooling that doesn't create new compliance problems.\n\n{{cta}}`,hashtags:["#DataSovereignty","#BYOK","#SelfHosted","#Compliance","#GRC","#AXTO"],cta_text:"🔗 axto.io/compliance",image_prompt:"Self-hosted compliance architecture showing all audit data stored locally with no external access",language:"en"},
];

// ─────────────────────────────────────────────────────────────────────────────
// SENTINEL TEMPLATES — IoT/OT Security Platform (10 templates)
// ─────────────────────────────────────────────────────────────────────────────
export const SENTINEL_TEMPLATES: AutoPostTemplate[] = [
  {id:"sntl001",title:"Sentinel — ICS/SCADA Security Without Agent Installation",category:"sentinel",platforms:["linkedin","facebook","twitter"],body_text:`You cannot install a traditional security agent on a PLC.\n\nYou cannot install it on an HMI running Windows XP.\nYou cannot install it on a 20-year-old SCADA controller.\n\nAXTO Sentinel uses passive network monitoring — analyzing industrial protocol traffic (Modbus, DNP3, IEC 61850, EtherNet/IP) without touching the device.\n\nComplete OT visibility. Zero footprint on operational devices. Entirely self-hosted.\n\n{{cta}}`,hashtags:["#ICS","#SCADA","#OTSecurity","#IndustrialCyber","#SelfHosted","#AXTO"],cta_text:"🔗 axto.io/sentinel",image_prompt:"Industrial control system network diagram with passive monitoring overlay showing zero agent installation",language:"en"},
  {id:"sntl002",title:"Sentinel — vs Claroty, Dragos, Nozomi Networks",category:"sentinel",platforms:["linkedin","twitter"],body_text:`Claroty: six-figure annual contracts, cloud telemetry to their platform.\nDragos: primarily enterprise, significant deployment costs.\nNozomi Networks: cloud-connected, large-scale pricing.\n\nAXTO Sentinel: flat enterprise license. Fully self-hosted. Your OT telemetry never leaves your network.\n\nSame capability set — protocol analysis, asset inventory, anomaly detection, threat intelligence.\nFraction of the cost. Complete data sovereignty.\n\n{{cta}}`,hashtags:["#OTSecurity","#ICS","#SCADA","#SelfHosted","#IndustrialCyber","#AXTO"],cta_text:"🔗 axto.io/sentinel",image_prompt:"Enterprise OT security comparison showing AXTO Sentinel self-hosted advantage cost and data sovereignty",language:"en"},
  {id:"sntl003",title:"Sentinel — Automatic OT Asset Inventory",category:"sentinel",platforms:["linkedin","facebook","twitter"],body_text:`Most industrial facilities don't have an accurate list of every device on their OT network.\n\nThis is how ransomware spreads undetected.\n\nAXTO Sentinel builds and maintains a complete asset inventory automatically:\n• PLC models, firmware versions, vendor\n• HMI and historian systems\n• Engineering workstations\n• Network infrastructure (switches, routers, firewalls)\n• Connected IoT sensors and actuators\n\nKnow everything. See everything. Protect everything.\n\n{{cta}}`,hashtags:["#OTAssetInventory","#ICS","#SCADA","#OTSecurity","#IndustrialCyber","#AXTO"],cta_text:"🔗 axto.io/sentinel",image_prompt:"OT asset inventory dashboard showing complete industrial network topology with device classification",language:"en"},
  {id:"sntl004",title:"Sentinel — Industrial Protocol Analysis",category:"sentinel",platforms:["linkedin","twitter"],body_text:`Most security tools speak TCP/IP.\nIndustrial networks speak different languages.\n\nAXTO Sentinel understands:\n• Modbus TCP/RTU\n• DNP3\n• IEC 61850 / GOOSE / MMS\n• EtherNet/IP (CIP)\n• PROFINET\n• BACnet (building automation)\n• OPC-UA / OPC-DA\n\nAnomaly detection that understands what normal looks like in your specific industrial environment — not just generic network traffic.\n\n{{cta}}`,hashtags:["#IndustrialProtocol","#Modbus","#OTSecurity","#ICS","#SCADA","#AXTO"],cta_text:"🔗 axto.io/sentinel",image_prompt:"Industrial protocol analysis dashboard showing Modbus DNP3 EtherNet/IP traffic with anomaly highlighting",language:"en"},
  {id:"sntl005",title:"Sentinel — Purdue Model Network Segmentation Visibility",category:"sentinel",platforms:["linkedin","facebook"],body_text:`The Purdue Model defines where IT and OT should be separated.\n\nIn practice, most networks have violations:\n• Level 3 historian talking directly to Level 1 controllers\n• Engineering workstations with dual-homed interfaces\n• Unauthorized lateral movement crossing the DMZ\n\nAXTO Sentinel maps your actual network topology against the Purdue Model — highlighting every segmentation violation in real time.\n\nKnow your actual attack surface. Not your assumed one.\n\n{{cta}}`,hashtags:["#PurdueModel","#NetworkSegmentation","#ICS","#OTSecurity","#IndustrialCyber","#AXTO"],cta_text:"🔗 axto.io/sentinel",image_prompt:"Purdue model diagram showing network segmentation violations highlighted by automated OT security monitoring",language:"en"},
  {id:"sntl006",title:"Sentinel ID — Keamanan IoT/OT Tanpa Agen di Perangkat",category:"sentinel",platforms:["linkedin","facebook","instagram"],body_text:`Kamu tidak bisa pasang security agent di PLC.\nTidak di HMI yang masih Windows XP.\nTidak di SCADA controller berumur 20 tahun.\n\nAXTO Sentinel menggunakan passive network monitoring — menganalisis traffic protokol industri (Modbus, DNP3, EtherNet/IP) tanpa menyentuh perangkat operasional.\n\nVisibilitas OT penuh. Zero footprint. Self-hosted di jaringanmu.\n\n{{cta}}`,hashtags:["#OTSecurity","#IoT","#ICS","#SCADA","#SelfHosted","#AXTO"],cta_text:"🔗 axto.io/sentinel",image_prompt:"Indonesian industrial facility with passive OT network monitoring system showing zero agent deployment",language:"id"},
  {id:"sntl007",title:"Sentinel — Ransomware Detection in OT Environments",category:"sentinel",platforms:["linkedin","twitter","facebook"],body_text:`Colonial Pipeline. Norsk Hydro. Oldsmar Water Treatment.\n\nOT ransomware attacks follow predictable patterns:\n• Initial IT breach via phishing or VPN\n• Lateral movement to the IT/OT boundary\n• Reconnaissance of OT device map\n• Payload deployment targeting HMI/historian\n\nAXTO Sentinel detects each stage — alerting on anomalous reconnaissance, lateral movement, and unexpected connections before the payload reaches operational systems.\n\n{{cta}}`,hashtags:["#OTRansomware","#ICSCyber","#CriticalInfrastructure","#OTSecurity","#AXTO"],cta_text:"🔗 axto.io/sentinel",image_prompt:"OT network security dashboard showing ransomware kill chain detection at each stage before payload deployment",language:"en"},
  {id:"sntl008",title:"Sentinel — Vulnerability Management for Legacy OT Devices",category:"sentinel",platforms:["linkedin","twitter"],body_text:`OT devices can't be patched on a monthly cycle.\n\nSome haven't been patched in years. Some never will be.\n\nAXTO Sentinel tracks known CVEs for every identified device in your environment — prioritizing by exploitability and proximity to critical processes.\n\nYou can't eliminate the vulnerabilities. But you can know exactly where they are, what the risk is, and what compensating controls to put in place.\n\n{{cta}}`,hashtags:["#OTVulnerability","#CVE","#ICS","#SCADA","#OTSecurity","#AXTO"],cta_text:"🔗 axto.io/sentinel",image_prompt:"OT vulnerability management dashboard showing CVE tracking by device type severity and compensating controls",language:"en"},
  {id:"sntl009",title:"Sentinel — Integration with IT Security Stack",category:"sentinel",platforms:["linkedin","facebook"],body_text:`OT security cannot be siloed from IT security.\n\nAXTO Sentinel forwards normalized alerts to your existing IT security stack:\n• Syslog to your SIEM\n• REST API to your SOAR platform\n• STIX/TAXII for threat intelligence sharing\n• CEF format for any CEF-compatible receiver\n• AXTO SOC (native integration for complete IT/OT visibility)\n\nOne unified view of your entire attack surface — IT and OT together.\n\n{{cta}}`,hashtags:["#OTSecurity","#ICSecurity","#SIEM","#SOC","#UnifiedSecurity","#AXTO"],cta_text:"🔗 axto.io/sentinel",image_prompt:"Unified IT/OT security dashboard showing AXTO Sentinel OT alerts integrated with SIEM and SOC platform",language:"en"},
  {id:"sntl010",title:"Sentinel — For Critical Infrastructure & Utilities",category:"sentinel",platforms:["linkedin","twitter","facebook"],body_text:`Critical infrastructure operators face a unique challenge:\n\nThe most catastrophic security failures aren't data breaches.\nThey're process disruptions — power outages, water contamination, pipeline explosions.\n\nAXTO Sentinel is built for operators who need to protect:\n• Electric generation and distribution\n• Water and wastewater treatment\n• Oil and gas pipelines\n• Manufacturing process control\n• Building automation and smart facilities\n\nSelf-hosted. Air-gap compatible. No cloud dependency.\n\n{{cta}}`,hashtags:["#CriticalInfrastructure","#UtilitySecurity","#OTSecurity","#ICS","#EnergySector","#AXTO"],cta_text:"🔗 axto.io/sentinel",image_prompt:"Critical infrastructure security operations showing power grid water treatment and pipeline facilities monitoring",language:"en"},
];

// ═══════════════════════════════════════════════════════════════════════════
// AXTO Free Full-Access Program — the CURRENT ad set ("iklan terbaru")
// ---------------------------------------------------------------------------
// Every priced/trial promo array above is retained in source for reference but
// is NO LONGER POSTED. autopost draws ONLY from these free-program templates,
// so the old paid/7-day-trial ads are effectively removed from circulation.
// Copy: free for one year · full enterprise · no licence · self-hosted · BYOK.
// No prices anywhere — anything beyond the free year is "contact admin".
// ═══════════════════════════════════════════════════════════════════════════
const P_SOCIAL = ["facebook","instagram","linkedin","twitter","telegram","pinterest"];
const P_CLASS  = ["craigslist","olx","locanto","classifiedads","gumtree","adpost","freeads"];
export const FREE_PROGRAM_TEMPLATES: AutoPostTemplate[] = [
  { id:"free001", title:"AXTO — Free Launch (ID)", category:"announcement", platforms:P_SOCIAL,
    body_text:`🎁 GRATIS SATU TAHUN — seluruh aplikasi AXTO, full enterprise.\n\nTanpa lisensi. Tanpa biaya. Tanpa batasan.\nUnduh, jalankan di server Anda sendiri, pakai API key Anda sendiri (BYOK).\n\n🛡️ Guardian · 🎼 Orchestra · 🧠 Studio · 🔒 Vault · 🌐 Edge · 🎯 SOC · 📋 Compliance · 🏭 Sentinel · ⚖️ Legal · 🦠 Antivirus\n\nData Anda tetap milik Anda. Nol telemetry.\n⏳ Penawaran waktu terbatas — hitung mundur berjalan.\n\n{{cta}}`,
    hashtags:["#AXTO","#GratisSetahun","#SelfHosted","#BYOK","#AITools","#Enterprise"], cta_text:"axto.io", image_prompt:"Elegant dark hero with glowing AXTO product logos and a large '1 YEAR FREE' badge, countdown timer, premium gradient", language:"id" },

  { id:"free002", title:"AXTO — Free Launch (EN)", category:"announcement", platforms:P_SOCIAL,
    body_text:`🎁 ONE YEAR FREE — every AXTO app, full enterprise tier.\n\nNo licence key. No payment. No limits.\nDownload, self-host on your own machines, bring your own AI keys.\n\nTen sovereign AI apps · your data never leaves your servers · zero telemetry.\n\n⏳ Limited-time launch — the countdown is live.\n\n{{cta}}`,
    hashtags:["#AXTO","#FreeForAYear","#SelfHostedAI","#BYOK","#Sovereign","#Enterprise"], cta_text:"axto.io", image_prompt:"Premium tech banner, product app icons floating, '1 YEAR FREE' countdown, elegant gradient", language:"en" },

  { id:"free003", title:"Guardian — Free (ID)", category:"guardian_ai", platforms:P_SOCIAL,
    body_text:`🛡️ Guardian AI kini GRATIS setahun — full enterprise.\n\nDeteksi ancaman 7-lapis + respons otomatis < 30 detik, 100% di server Anda.\nTanpa lisensi, tanpa biaya. BYOK. Unduh & pasang via Docker hari ini.\n\n{{cta}}`,
    hashtags:["#GuardianAI","#CyberSecurity","#GratisSetahun","#SelfHosted","#AXTO"], cta_text:"axto.io", image_prompt:"Cyber shield with AI nodes, 'FREE 1 YEAR' ribbon, on-prem server rack, elegant", language:"id" },

  { id:"free004", title:"Orchestra — Free (EN)", category:"orchestra_ai", platforms:P_SOCIAL,
    body_text:`🎼 Orchestra AI — free for a year, full enterprise.\n\nOne endpoint, 15+ AI providers, smart routing to the cheapest/fastest/best. Your keys, your infra. No licence, no bill.\n\nSelf-host it now — the free countdown is running.\n\n{{cta}}`,
    hashtags:["#OrchestraAI","#LLMOps","#FreeForAYear","#BYOK","#AXTO"], cta_text:"axto.io", image_prompt:"AI routing graph across providers, 'FREE 1 YEAR' badge, sleek dark UI", language:"en" },

  { id:"free005", title:"Studio — Free (ID)", category:"feature", platforms:P_SOCIAL,
    body_text:`🧠 AXTO Studio GRATIS setahun — chat, gambar/video, pipeline & API, plus GPU pool.\n\nFull enterprise, tanpa lisensi. Jalankan sendiri, pakai key & GPU Anda.\n⏳ Waktu terbatas.\n\n{{cta}}`,
    hashtags:["#AXTOStudio","#GenAI","#GPU","#GratisSetahun","#SelfHosted"], cta_text:"axto.io", image_prompt:"Creative AI studio workspace, GPU glow, 'FREE 1 YEAR' tag, elegant", language:"id" },

  { id:"free006", title:"No licence — Free (EN)", category:"self_hosted", platforms:P_SOCIAL,
    body_text:`🔑 No licence key. No payment. No cloud lock-in.\n\nThe entire AXTO platform is free for one year at full enterprise. Download, run on your own servers, plug in your own AI keys. Back up anytime — when the year ends, apps lock gracefully and your data stays yours.\n\n{{cta}}`,
    hashtags:["#SelfHostedAI","#BYOK","#DataSovereignty","#AXTO","#FreeForAYear"], cta_text:"axto.io", image_prompt:"Key dissolving into 'FREE', on-prem servers, privacy theme, elegant gradient", language:"en" },

  { id:"free007", title:"Countdown urgency (ID)", category:"engagement", platforms:P_SOCIAL,
    body_text:`⏳ Hitung mundur berjalan.\n\nSelama satu tahun ini, SEMUA aplikasi AXTO gratis — full enterprise, tanpa lisensi. Setelah itu? Kembali berbayar.\n\nAmbil sekarang selagi gratis. Unduh di server Anda sendiri.\n\n{{cta}}`,
    hashtags:["#LimitedTime","#GratisSetahun","#AXTO","#SelfHosted","#AI"], cta_text:"axto.io", image_prompt:"Large elegant countdown timer, product logos, 'FREE ends soon', premium", language:"id" },

  { id:"free008", title:"Free platform — classified (EN)", category:"self_hosted", platforms:P_CLASS,
    body_text:`AXTO — 10 self-hosted AI apps, FREE for one year (full enterprise).\n\nGuardian (security), Orchestra (LLM routing), Studio (AI+GPU), Vault (PII redaction), Edge, SOC, Compliance, Sentinel, Legal, Antivirus.\n\nNo licence. No payment. Docker deploy on your own servers. Bring your own AI keys. Your data never leaves your network.\n\nDownload free: axto.io`,
    hashtags:["#AI","#SelfHosted","#Free","#Enterprise"], cta_text:"axto.io", image_prompt:"Clean product grid of 10 AI apps with 'FREE 1 YEAR'", language:"en" },

  { id:"free009", title:"Free platform — classified (ID)", category:"self_hosted", platforms:P_CLASS,
    body_text:`AXTO — 10 aplikasi AI self-hosted, GRATIS satu tahun (full enterprise).\n\nGuardian, Orchestra, Studio, Vault, Edge, SOC, Compliance, Sentinel, Legal, Antivirus.\n\nTanpa lisensi, tanpa biaya. Deploy via Docker di server sendiri, pakai API key sendiri. Data tidak keluar dari jaringan Anda.\n\nUnduh gratis: axto.io`,
    hashtags:["#AI","#SelfHosted","#Gratis","#Enterprise"], cta_text:"axto.io", image_prompt:"Clean grid of 10 AI apps with 'GRATIS 1 TAHUN'", language:"id" },

  { id:"free010", title:"BYOX sovereignty (EN)", category:"byok", platforms:P_SOCIAL,
    body_text:`Own your entire AI stack. 🔐\n\nAXTO runs fully on your servers — your keys, your models, your data. Free for a full year at enterprise tier, no licence required. No call-home, no telemetry.\n\nDownload and deploy today.\n\n{{cta}}`,
    hashtags:["#BYOX","#DataSovereignty","#SelfHostedAI","#AXTO","#FreeForAYear"], cta_text:"axto.io", image_prompt:"Sovereign data vault, own-your-stack theme, 'FREE 1 YEAR', elegant", language:"en" },
];

// autopost now draws ONLY from the free-program ad set (old arrays deprecated).
export const ALL_TEMPLATES: AutoPostTemplate[] = [...FREE_PROGRAM_TEMPLATES];

export const TEMPLATE_CATEGORIES = [
  { value: "guardian_ai",  label: "🛡️ Guardian AI",    count: GUARDIAN_AI_TEMPLATES.length },
  { value: "orchestra_ai", label: "🎼 Orchestra AI",   count: ORCHESTRA_AI_TEMPLATES.length },
  { value: "vault",        label: "🔐 Vault",          count: VAULT_TEMPLATES.length },
  { value: "edge",         label: "🌐 Edge",           count: EDGE_TEMPLATES.length },
  { value: "soc",          label: "🔴 SOC",            count: SOC_TEMPLATES.length },
  { value: "compliance",   label: "📋 Compliance",     count: COMPLIANCE_TEMPLATES.length },
  { value: "sentinel",     label: "📡 Sentinel",       count: SENTINEL_TEMPLATES.length },
  { value: "self_hosted",  label: "🏠 Self-Hosted",    count: SELFHOSTED_TEMPLATES.filter(t=>t.category==="self_hosted").length },
  { value: "byok",         label: "🔑 BYOK",           count: SELFHOSTED_TEMPLATES.filter(t=>t.category==="byok").length },
  { value: "pricing",      label: "💰 Pricing",        count: PRICING_TEMPLATES.length },
  { value: "comparison",   label: "🆚 Comparison",     count: COMPARISON_TEMPLATES.length },
  { value: "feature",      label: "⚡ Features",       count: FEATURE_TEMPLATES.length },
  { value: "testimonial",  label: "💬 Testimonials",   count: TESTIMONIAL_TEMPLATES.length },
  { value: "announcement", label: "📣 Announcements",  count: ANNOUNCEMENT_TEMPLATES.length },
  { value: "tutorial",     label: "📖 Tutorials",      count: TUTORIAL_TEMPLATES.length },
  { value: "industry",     label: "🏢 Industry",       count: INDUSTRY_TEMPLATES.length },
  { value: "engagement",   label: "💡 Engagement",     count: ENGAGEMENT_TEMPLATES.length },
];

export const PLATFORM_CONFIGS = [
  // Social Media
  { value: "facebook",         label: "Facebook",          icon: "📘", type: "social",      charLimit: 63206, supportsImages: true },
  { value: "instagram",        label: "Instagram",         icon: "📸", type: "social",      charLimit: 2200,  supportsImages: true },
  { value: "pinterest",        label: "Pinterest",         icon: "📌", type: "social",      charLimit: 500,   supportsImages: true },
  { value: "twitter",          label: "Twitter / X",       icon: "🐦", type: "social",      charLimit: 280,   supportsImages: true },
  { value: "linkedin",         label: "LinkedIn",          icon: "💼", type: "social",      charLimit: 3000,  supportsImages: true },
  { value: "telegram",         label: "Telegram Channel",  icon: "✈️", type: "social",      charLimit: 4096,  supportsImages: true },
  { value: "tiktok",           label: "TikTok",            icon: "🎵", type: "social",      charLimit: 2200,  supportsImages: false },
  { value: "youtube_community",label: "YouTube Community", icon: "▶️", type: "social",      charLimit: 5000,  supportsImages: true },
  // Free Classifieds
  { value: "craigslist",    label: "Craigslist",        icon: "🗂️", type: "classified",  charLimit: 5000,  supportsImages: false },
  { value: "olx",           label: "OLX",               icon: "🟠", type: "classified",  charLimit: 2000,  supportsImages: true },
  { value: "locanto",       label: "Locanto",           icon: "📍", type: "classified",  charLimit: 2000,  supportsImages: true },
  { value: "classifiedads", label: "ClassifiedAds.com", icon: "📋", type: "classified",  charLimit: 2000,  supportsImages: true },
  { value: "gumtree",       label: "Gumtree",           icon: "🌿", type: "classified",  charLimit: 3000,  supportsImages: true },
  { value: "oodle",         label: "Oodle",             icon: "🔵", type: "classified",  charLimit: 2000,  supportsImages: true },
  { value: "adpost",        label: "Adpost",            icon: "📢", type: "classified",  charLimit: 2000,  supportsImages: true },
  { value: "trovit",        label: "Trovit",            icon: "🔍", type: "classified",  charLimit: 1500,  supportsImages: false },
  { value: "vivastreet",    label: "Vivastreet",        icon: "🏙️", type: "classified",  charLimit: 2000,  supportsImages: true },
  { value: "hoobly",        label: "Hoobly",            icon: "🐾", type: "classified",  charLimit: 1500,  supportsImages: true },
  { value: "freeads",       label: "FreeAds.in",        icon: "🆓", type: "classified",  charLimit: 2000,  supportsImages: true },
];

export function getTemplatesByCategory(category: string): AutoPostTemplate[] {
  return ALL_TEMPLATES.filter(t => t.category === category);
}

export function getTemplatesByPlatform(platform: string): AutoPostTemplate[] {
  return ALL_TEMPLATES.filter(t => t.platforms.includes(platform));
}

export function getRandomTemplate(filters?: { category?: string; platform?: string; language?: string }): AutoPostTemplate {
  let pool = ALL_TEMPLATES;
  if (filters?.category) pool = pool.filter(t => t.category === filters.category);
  if (filters?.platform) pool = pool.filter(t => t.platforms.includes(filters.platform!));
  if (filters?.language) pool = pool.filter(t => t.language === filters.language);
  if (pool.length === 0) pool = ALL_TEMPLATES;
  return pool[Math.floor(Math.random() * pool.length)];
}

