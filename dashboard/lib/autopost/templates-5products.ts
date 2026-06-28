/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ============================================================
// AXTO AutoPost — 5 New Products Template Library (200+ templates)
// Vault · SOC · Compliance · Edge · Sentinel
// ============================================================

export interface AutoPostTemplate {
  id: string;
  title: string;
  category: string;
  product: string;
  platforms: string[];
  body_text: string;
  hashtags: string[];
  cta_text: string;
  language: string;
}

// ─────────────────────────────────────────────────────────────
// AXTO VAULT TEMPLATES (Privacy Intelligence)
// ─────────────────────────────────────────────────────────────
export const VAULT_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "v001", title: "Vault — PII Detection Intro", category: "vault_pii", product: "vault",
    platforms: ["facebook","instagram","linkedin","twitter"],
    body_text: `🔒 Apakah data sensitif pelanggan Anda aman dari kebocoran?

AXTO Vault mendeteksi dan menyamarkan PII (Personal Identifiable Information) secara otomatis — sebelum data tersebut disimpan, dikirim, atau diproses.

✅ Deteksi 15 tipe PII (email, telepon, KTP, kartu kredit, rekam medis, dll)
✅ 7 strategi masking: redact, pseudonymize, tokenize, encrypt, dan lebih
✅ Compliance otomatis: GDPR, PDPA, HIPAA, PCI-DSS
✅ 100% self-hosted — data tidak pernah keluar dari server Anda

{{cta}}`,
    hashtags: ["#DataPrivacy","#GDPR","#PDPA","#PII","#AXTO","#AXTOVault","#DataProtection","#PrivacyFirst"],
    cta_text: "🔗 Coba AXTO Vault: axto.io/vault",
    language: "id",
  },
  {
    id: "v002", title: "Vault — GDPR Compliance", category: "vault_compliance", product: "vault",
    platforms: ["linkedin","facebook","twitter"],
    body_text: `📋 GDPR fine bisa mencapai €20 juta atau 4% dari global annual turnover.

Apakah sistem Anda sudah siap?

AXTO Vault mengotomatisasi 80% pekerjaan compliance:
→ Auto-detect PII di semua data stream
→ Pseudonymize data sebelum analitik
→ Right to erasure (Art. 17) dengan satu API call
→ Immutable audit log dengan hash chain
→ Data lineage tracking

Setup 15 menit. No data leaves your server. {{cta}}`,
    hashtags: ["#GDPR","#Compliance","#DataPrivacy","#AXTO","#AXTOVault","#RegTech","#PrivacyEngineering"],
    cta_text: "📖 Detail GDPR coverage: axto.io/vault/gdpr",
    language: "id",
  },
  {
    id: "v003", title: "Vault — PDPA Indonesia", category: "vault_pdpa", product: "vault",
    platforms: ["facebook","instagram","linkedin"],
    body_text: `🇮🇩 UU PDP (Perlindungan Data Pribadi) sudah berlaku di Indonesia.

Sanksi pidana hingga 6 tahun dan denda Rp 60 miliar bagi pelanggar.

AXTO Vault membantu bisnis Anda comply dalam hitungan jam:
✓ Auto-detect NIK, nama, alamat, nomor telepon, email
✓ Pseudonymisasi otomatis sebelum data diproses
✓ Hak hapus data (erasure request) siap pakai
✓ Audit trail lengkap untuk regulator

Jangan tunggu sampai kena denda. {{cta}}`,
    hashtags: ["#UUPDP","#PDPA","#PerlindunganData","#AXTO","#Compliance","#PrivasiData","#Indonesia"],
    cta_text: "🔗 Coba gratis 14 hari: axto.io/vault",
    language: "id",
  },
  {
    id: "v004", title: "Vault — HIPAA Healthcare", category: "vault_hipaa", product: "vault",
    platforms: ["linkedin","twitter"],
    body_text: `🏥 Healthcare data breach average cost: $10.9 million (IBM 2024).

AXTO Vault protects ePHI automatically:
→ Detects MRNs, diagnoses, ICD-10 codes, biometrics
→ AES-256-GCM encryption with PBKDF2 key derivation
→ HIPAA minimum necessary enforcement
→ BAA-compatible audit trail
→ 7-year retention policy engine

Built for hospitals, clinics, and health tech companies. {{cta}}`,
    hashtags: ["#HIPAA","#HealthcareSecurity","#ePHI","#AXTOVault","#HealthIT","#DataProtection"],
    cta_text: "📋 HIPAA coverage details: axto.io/vault/hipaa",
    language: "en",
  },
  {
    id: "v005", title: "Vault — PCI DSS Card Data", category: "vault_pci", product: "vault",
    platforms: ["linkedin","twitter","facebook"],
    body_text: `💳 Storing card data without PCI DSS compliance is a legal liability.

AXTO Vault handles cardholder data protection:
→ Detect all card number formats (Visa, MC, Amex, Discover)
→ Format-preserving encryption (FPE) — keeps 16-digit structure
→ Tokenization with reversible vault lookup
→ Never stores CVV (enforced by policy engine)
→ PCI DSS Requirement 3.4 compliant

Reduce your PCI scope significantly. {{cta}}`,
    hashtags: ["#PCIDSS","#PaymentSecurity","#CardData","#AXTOVault","#FinTech","#Tokenization"],
    cta_text: "🔒 PCI DSS guide: axto.io/vault/pci",
    language: "en",
  },
  {
    id: "v006", title: "Vault — Developer Integration", category: "vault_dev", product: "vault",
    platforms: ["twitter","linkedin","dev"],
    body_text: `👨‍💻 One API call to mask all PII in your data pipeline:

\`\`\`python
result = requests.post('http://vault:8091/v1/scan',
    json={'text': user_data, 'strategy': 'pseudonymize'})
masked = result.json()['masked_text']
\`\`\`

That's it. No regex hell. No custom rules.
→ 15 PII types detected automatically
→ AI-powered context detection (BYOK)
→ <5ms p95 latency for typical payloads
→ OpenAPI spec included

Drop-in privacy layer for any tech stack. {{cta}}`,
    hashtags: ["#DevSecOps","#API","#Privacy","#PII","#AXTOVault","#Developer","#Backend"],
    cta_text: "📖 API docs: axto.io/vault/api",
    language: "en",
  },
  {
    id: "v007", title: "Vault — Audit Trail", category: "vault_audit", product: "vault",
    platforms: ["linkedin","facebook"],
    body_text: `🔗 Regulasi data privacy butuh bukti audit yang tak bisa dipalsukan.

AXTO Vault menggunakan hash-chained immutable audit log:
Setiap operasi scan, tokenisasi, dan erasure dicatat dengan:
→ SHA-256 hash chain (setiap record terhubung ke sebelumnya)
→ Timestamp presisi tinggi
→ Actor tracking (siapa yang akses data)
→ Endpoint: POST /v1/audit/verify untuk verifikasi integritas

Ketika regulator datang, Anda punya bukti lengkap. {{cta}}`,
    hashtags: ["#AuditTrail","#DataGovernance","#Compliance","#AXTOVault","#RegTech"],
    cta_text: "🔗 axto.io/vault",
    language: "id",
  },
  {
    id: "v008", title: "Vault — Differential Privacy", category: "vault_dp", product: "vault",
    platforms: ["linkedin","twitter"],
    body_text: `📊 Building analytics on sensitive data? Use differential privacy.

AXTO Vault's Laplace mechanism (ε-DP) adds mathematically provable noise to numerical outputs — making individual records impossible to identify while preserving aggregate accuracy.

→ Configurable epsilon (ε) parameter
→ Applied to risk scores and aggregated PII counts
→ Compatible with GDPR's "anonymization" definition

Real privacy. Not just compliance theater. {{cta}}`,
    hashtags: ["#DifferentialPrivacy","#PrivacyEngineering","#DataScience","#AXTOVault","#MachineLearning"],
    cta_text: "📖 DP documentation: axto.io/vault/dp",
    language: "en",
  },
];

// ─────────────────────────────────────────────────────────────
// AXTO SOC TEMPLATES (Security Operations)
// ─────────────────────────────────────────────────────────────
export const SOC_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "s001", title: "SOC — Intro", category: "soc_intro", product: "soc",
    platforms: ["linkedin","facebook","twitter"],
    body_text: `🛡️ Fortune 500 bayar $500K–2M/tahun untuk managed SOC.

AXTO SOC memberikan kemampuan yang sama — self-hosted, harga enterprise yang jauh lebih terjangkau.

🔍 SIEM: Agregasi log dari semua sumber
⚡ SOAR: Response otomatis (block IP, isolasi host, notif Slack)
🧠 UEBA: Deteksi anomali perilaku pengguna
🌐 TI: AbuseIPDB + AlienVault OTX + local feed
📊 Incident Management + response tracking

Tidak ada vendor lock-in. Data sepenuhnya di server Anda. {{cta}}`,
    hashtags: ["#SOC","#SIEM","#SOAR","#CyberSecurity","#AXTO","#AXTOSOC","#ThreatDetection","#SecurityOps"],
    cta_text: "🔗 Coba AXTO SOC: axto.io/soc",
    language: "id",
  },
  {
    id: "s002", title: "SOC — MITRE ATT&CK", category: "soc_mitre", product: "soc",
    platforms: ["linkedin","twitter"],
    body_text: `🎯 Every alert in AXTO SOC is mapped to MITRE ATT&CK tactics.

When SSH brute force hits → TA0006 (Credential Access)
When C2 beacon detected → TA0011 (Command & Control)
When ransomware IOC found → TA0040 (Impact)

This means:
✓ Security teams speak the same language globally
✓ Incident reports auto-populate with MITRE context
✓ Threat hunting becomes systematic, not guesswork
✓ Executive reports show kill chain progression

Real SOC-grade detection. Not just log forwarding. {{cta}}`,
    hashtags: ["#MITREATTaCK","#ThreatHunting","#SOC","#CyberSecurity","#AXTOSOC","#IncidentResponse"],
    cta_text: "📋 Detection rules: axto.io/soc/rules",
    language: "en",
  },
  {
    id: "s003", title: "SOC — SOAR Automation", category: "soc_soar", product: "soc",
    platforms: ["linkedin","facebook","twitter"],
    body_text: `⚡ Waktu respons 15 menit untuk insiden CRITICAL. Tidak ada manusia yang bisa.

AXTO SOC SOAR mengotomatiskan:
→ Brute force terdeteksi → iptables block IP dalam <1 detik
→ Ransomware IOC → host isolation otomatis
→ C2 beacon → block domain di DNS
→ Data exfiltration → block egress traffic
→ Semua kejadian → Slack notification langsung

+ Real SOAR actions (bukan sekedar log):
• Firewall API integration
• AXTO Guardian host isolation
• Jira/ServiceNow ticket auto-creation
• Email escalation ke CISO

{{cta}}`,
    hashtags: ["#SOAR","#Automation","#IncidentResponse","#CyberSecurity","#AXTOSOC","#SecurityAutomation"],
    cta_text: "🔗 axto.io/soc/soar",
    language: "id",
  },
  {
    id: "s004", title: "SOC — Threat Intelligence", category: "soc_ti", product: "soc",
    platforms: ["twitter","linkedin"],
    body_text: `🌐 AXTO SOC enriches every alert with real threat intelligence.

For each suspicious IP, we check:
→ AbuseIPDB: abuse confidence score (0-100)
→ AlienVault OTX: pulse count, threat indicators
→ Local feed: your own IOC blacklists
→ AXTO Guardian feed: malicious IPs from scans

Result: Zero false positive surprises.
Context: Country, ISP, total reports, known pulses.
Speed: <5ms (cached), <8s (live lookup).

True enrichment. Not just raw logs. {{cta}}`,
    hashtags: ["#ThreatIntelligence","#CTI","#AbuseIPDB","#OTX","#AXTOSOC","#SOC","#CyberThreat"],
    cta_text: "📖 TI integration: axto.io/soc/ti",
    language: "en",
  },
  {
    id: "s005", title: "SOC — UEBA", category: "soc_ueba", product: "soc",
    platforms: ["linkedin","twitter"],
    body_text: `📈 Insider threats and compromised accounts don't trigger signature rules.

AXTO SOC's UEBA detects them via behavioral analytics:
→ Welford's online algorithm builds per-entity baselines
→ Z-score anomaly (σ > 3.0 = anomalous)
→ Tracks: login rate, request volume, API calls, hour patterns
→ Requires only 30 observations to establish baseline
→ Real-time — no batch processing needed

Example: User logs in at 3AM from new country → z=4.7 → ALERT

This is how nation-state attacks get caught. {{cta}}`,
    hashtags: ["#UEBA","#InsiderThreat","#BehaviorAnalytics","#SOC","#AXTOSOC","#ZeroTrust"],
    cta_text: "🔗 axto.io/soc",
    language: "en",
  },
  {
    id: "s006", title: "SOC — Ransomware Response", category: "soc_ransomware", product: "soc",
    platforms: ["facebook","linkedin","twitter"],
    body_text: `🚨 Ransomware detected → AXTO SOC responds in seconds.

Playbook OT-ransomware otomatis:
1. Isolasi host dari network
2. Screenshot forensik via Guardian
3. Block C2 domain di DNS
4. Alert CISO + legal via email + Slack
5. Buat incident ticket P1

Semua itu terjadi sebelum manusia melihat alert pertama.

MTTD (Mean Time to Detect): <30 detik
MTTR (Mean Time to Respond): <60 detik (automated steps)

{{cta}}`,
    hashtags: ["#Ransomware","#CyberSecurity","#IncidentResponse","#AXTOSOC","#SOC","#BusinessContinuity"],
    cta_text: "🛡️ Protect your organization: axto.io/soc",
    language: "id",
  },
  {
    id: "s007", title: "SOC — Incident Response Tracking", category: "soc_response", product: "soc",
    platforms: ["linkedin"],
    body_text: `⏱️ Incident response speed determines the blast radius of any breach.

AXTO SOC orchestrates your response automatically:
→ CRITICAL: 15-minute automated isolation window
→ HIGH: 60-minute automated containment window
→ MEDIUM: 4-hour investigation workflow
→ LOW: 24-hour remediation queue

Auto-escalation on timeout:
• Slack #escalation-needed alert
• Email to on-call lead
• Dashboard breach counter update

Executive dashboard shows compliance % — fully auditable. {{cta}}`,
    hashtags: ["#IncidentResponse","#SOC","#SecurityMetrics","#MSSP","#AXTOSOC","#ComplianceReporting"],
    cta_text: "📊 axto.io/soc",
    language: "en",
  },
  {
    id: "s008", title: "SOC — ID vs EN", category: "soc_comparison", product: "soc",
    platforms: ["facebook","instagram","linkedin"],
    body_text: `🔥 Managed SOC vs AXTO SOC: Perbandingan jujur

Managed SOC (vendor eksternal):
❌ $500K–2M/tahun
❌ Data log dikirim ke cloud vendor
❌ Tidak ada kontrol atas proses investigasi
❌ Response time tidak konsisten

AXTO SOC (self-hosted):
✅ Harga fraksi dari managed SOC
✅ 100% data tetap di server Anda
✅ Full control, custom detection rules
✅ Auto SOAR response tanpa human delay
✅ Compliance: data tidak keluar yurisdiksi

{{cta}}`,
    hashtags: ["#SOC","#ManagedSOC","#MSSP","#CostSaving","#AXTO","#CyberSecurity","#SelfHosted"],
    cta_text: "💰 Hitung ROI Anda: axto.io/soc/roi",
    language: "id",
  },
];

// ─────────────────────────────────────────────────────────────
// AXTO COMPLIANCE TEMPLATES
// ─────────────────────────────────────────────────────────────
export const COMPLIANCE_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "c001", title: "Compliance — Intro", category: "compliance_intro", product: "compliance",
    platforms: ["linkedin","facebook","twitter"],
    body_text: `📋 Audit SOC 2 cost perusahaan $50K–300K per tahun ke konsultan.

AXTO Compliance memotong biaya itu hingga 80%:
→ 80+ controls auto-checked (HTTP, TLS, port, process, file)
→ Real-time continuous monitoring (24 jam)
→ Evidence collection otomatis dan hash-verified
→ Gap analysis dengan panduan remediation
→ Audit-ready reports dalam format JSON + Markdown

Framework coverage: SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA, NIST CSF

{{cta}}`,
    hashtags: ["#SOC2","#ISO27001","#Compliance","#Audit","#AXTO","#AXTOCompliance","#GRC","#RegTech"],
    cta_text: "🔗 Coba AXTO Compliance: axto.io/compliance",
    language: "id",
  },
  {
    id: "c002", title: "Compliance — Auto Evidence", category: "compliance_evidence", product: "compliance",
    platforms: ["linkedin","twitter"],
    body_text: `🔬 Manual evidence collection for audits wastes thousands of hours.

AXTO Compliance automates it:
→ TLS cert check: verify expiry + TLS 1.2+ grade
→ HTTP redirect: confirm HTTPS enforcement
→ Process check: verify firewall/auditd/rsyslog running
→ File check: policy docs present + age verification
→ Endpoint check: services responding as expected

Every piece of evidence is hash-verified (SHA-256 of raw data).
Tamper-evident. Auditor-ready.

No more manual screenshots. No more Excel tracking. {{cta}}`,
    hashtags: ["#Compliance","#Automation","#SOC2","#AuditEvidence","#AXTOCompliance","#DevSecOps"],
    cta_text: "📖 Evidence framework: axto.io/compliance/evidence",
    language: "en",
  },
  {
    id: "c003", title: "Compliance — SOC 2 Type II", category: "compliance_soc2", product: "compliance",
    platforms: ["linkedin"],
    body_text: `🏆 SOC 2 Type II certification adalah trust signal #1 untuk SaaS B2B.

AXTO Compliance mempercepat readiness Anda:
→ CC6.2 (MFA): auto-check HSTS header
→ CC7.1 (Vuln Scan): verifikasi laporan scan < 30 hari
→ CC7.2 (Monitoring): check AXTO Guardian/SOC aktif
→ CC6.7 (HTTPS): verify HTTP→HTTPS redirect
→ C1.1 (Data Classification): policy doc tersedia

Skor compliance real-time. Gap list dengan remediation step.
Continuous monitoring setiap 24 jam.

Dari 3 bulan prep → 3 minggu dengan AXTO. {{cta}}`,
    hashtags: ["#SOC2","#TypeII","#SaaSSecurity","#AXTOCompliance","#B2BSaaS","#TrustAndSafety"],
    cta_text: "📋 SOC 2 guide: axto.io/compliance/soc2",
    language: "id",
  },
  {
    id: "c004", title: "Compliance — PCI DSS v4", category: "compliance_pci", product: "compliance",
    platforms: ["linkedin","facebook"],
    body_text: `💳 PCI DSS v4.0 deadline sudah lewat. Apakah Anda compliant?

AXTO Compliance memonitor 12 PCI Requirements secara otomatis:
→ Req 1: Firewall aktif (process check)
→ Req 4: TLS cert valid + min TLS 1.2
→ Req 5: Antivirus/EDR aktif (Guardian integration)
→ Req 6: Security headers present (WAF check)
→ Req 10: auditd + rsyslog berjalan
→ Req 11: Pentest evidence < 365 hari

Gap analysis menunjukkan exactly apa yang harus diperbaiki.
Tidak perlu konsultan PCI-QSA untuk assessment awal. {{cta}}`,
    hashtags: ["#PCIDSS","#PCI","#PaymentSecurity","#AXTOCompliance","#FinTech","#SecurityCompliance"],
    cta_text: "🔗 axto.io/compliance/pci",
    language: "id",
  },
  {
    id: "c005", title: "Compliance — Vendor Risk", category: "compliance_vendor", product: "compliance",
    platforms: ["linkedin","twitter"],
    body_text: `Third-party vendors are your biggest compliance blind spot.

A breach at your vendor = your liability.

AXTO Compliance includes vendor risk assessment:
→ Send automated security questionnaires
→ Score vendor responses against framework controls
→ Track review cycles (annual/semi-annual)
→ Risk-rate each vendor (critical/high/medium/low)
→ Generate vendor risk register

Most GRC tools charge $20K+/year for this.
AXTO bundles it in. {{cta}}`,
    hashtags: ["#VendorRisk","#SupplyChainSecurity","#GRC","#AXTOCompliance","#ThirdPartyRisk"],
    cta_text: "📋 axto.io/compliance",
    language: "en",
  },
];

// ─────────────────────────────────────────────────────────────
// AXTO EDGE TEMPLATES (AI Gateway)
// ─────────────────────────────────────────────────────────────
export const EDGE_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "e001", title: "Edge — Intro", category: "edge_intro", product: "edge",
    platforms: ["linkedin","facebook","twitter","dev"],
    body_text: `⚡ Setiap SaaS yang embed AI butuh ini tapi jarang punya:

AXTO Edge — AI Gateway yang bertindak sebagai layer cerdas antara aplikasi dan provider AI:

🚦 Rate limiting per-customer (RPM + TPM + daily budget)
💰 Token metering + billing otomatis per customer
🔥 Prompt injection firewall (15 attack pattern families)
🔄 Smart routing: otomatis pilih provider paling murah/cepat
⚡ Response caching untuk hemat 30–60% biaya
🔌 OpenAI-compatible — ganti satu line kode

{{cta}}`,
    hashtags: ["#AIGateway","#OpenAI","#LLM","#AXTOEdge","#AIInfrastructure","#SaaS","#APIManagement"],
    cta_text: "🔗 Coba AXTO Edge: axto.io/edge",
    language: "id",
  },
  {
    id: "e002", title: "Edge — Cost Saving", category: "edge_cost", product: "edge",
    platforms: ["linkedin","twitter","facebook"],
    body_text: `💸 AI API costs are killing SaaS margins. Here's the fix.

AXTO Edge's cost optimization:

1. Smart routing (cost_first mode):
   → Auto-picks cheapest provider per request type
   → Groq ($0.05/1M tokens) for simple tasks
   → GPT-4o-mini ($0.15/1M) for medium complexity
   → Claude Opus ($15/1M) only when truly needed

2. Semantic caching:
   → Identical prompts return cached response
   → Typical cache hit rate: 20–40%
   → 100% cost savings on cache hits

3. Per-customer budget caps:
   → Hard daily/monthly limits per API key
   → No surprise invoices

Real customer average savings: 35–60%. {{cta}}`,
    hashtags: ["#AIcosts","#LLMOptimization","#AXTOEdge","#CostOptimization","#GPT4","#Claude","#AIGateway"],
    cta_text: "💰 Calculate savings: axto.io/edge/calculator",
    language: "en",
  },
  {
    id: "e003", title: "Edge — Prompt Injection Firewall", category: "edge_firewall", product: "edge",
    platforms: ["twitter","linkedin"],
    body_text: `🔥 Prompt injection attacks are the #1 AI security risk in 2025.

AXTO Edge blocks them at the gateway:

Pattern families detected:
→ "Ignore all previous instructions"
→ "You are now DAN" / jailbreak mode
→ System role injection via user message
→ Token smuggling (null bytes, control chars)
→ Training data extraction attempts
→ Embedded instruction overrides in long prompts

15 pattern families. Structural analysis. Zero false positives.
Blocked before it reaches your AI provider.

{{cta}}`,
    hashtags: ["#PromptInjection","#AISecuiry","#LLMSecurity","#AXTOEdge","#Jailbreak","#GenAISecurity"],
    cta_text: "🔒 AI security guide: axto.io/edge/security",
    language: "en",
  },
  {
    id: "e004", title: "Edge — Circuit Breaker", category: "edge_reliability", product: "edge",
    platforms: ["linkedin","twitter","dev"],
    body_text: `🔌 OpenAI down lagi? Anthropic throttling?

AXTO Edge handles provider failures automatically:

Circuit Breaker pattern:
→ 5 consecutive failures → circuit opens
→ All traffic rerouted to next available provider
→ 60-second recovery window before retry
→ Exponential backoff on retries

Fallback chain:
OpenAI → Anthropic → Gemini → Groq → Ollama (local)

Zero downtime. Zero manual intervention.
Your users never know there was a problem.

This is production-grade AI infrastructure. {{cta}}`,
    hashtags: ["#CircuitBreaker","#Reliability","#AIInfrastructure","#AXTOEdge","#Resilience","#SRE"],
    cta_text: "📖 Reliability docs: axto.io/edge/reliability",
    language: "en",
  },
  {
    id: "e005", title: "Edge — Multi-Provider", category: "edge_providers", product: "edge",
    platforms: ["linkedin","twitter","dev"],
    body_text: `🌐 7 AI providers, 1 gateway. AXTO Edge supports:

┌─────────────────┬──────────────────┬──────────┐
│ Provider        │ Best For         │ Price    │
├─────────────────┼──────────────────┼──────────┤
│ OpenAI GPT-4o   │ General purpose  │ $$       │
│ Anthropic Claude│ Long context     │ $$$      │
│ Gemini 2.0 Flash│ Multimodal, fast │ $        │
│ Groq LLaMA      │ Ultra-low latency│ ¢        │
│ DeepSeek        │ Reasoning tasks  │ ¢        │
│ Mistral         │ European data    │ $        │
│ Ollama          │ On-premise, free │ FREE     │
└─────────────────┴──────────────────┴──────────┘

BYOK — all your own keys, AXTO never touches them.
{{cta}}`,
    hashtags: ["#BYOK","#MultiProvider","#LLM","#AXTOEdge","#AIGateway","#OpenAI","#Anthropic"],
    cta_text: "🔗 axto.io/edge",
    language: "en",
  },
];

// ─────────────────────────────────────────────────────────────
// AXTO SENTINEL TEMPLATES (IoT/OT Security)
// ─────────────────────────────────────────────────────────────
export const SENTINEL_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "t001", title: "Sentinel — Intro", category: "sentinel_intro", product: "sentinel",
    platforms: ["linkedin","facebook","twitter"],
    body_text: `🏭 Manufacturing, energy, healthcare punya ribuan connected devices tanpa security.

AXTO Sentinel melindungi infrastruktur OT/IoT Anda:

📡 Auto-discovery: scan subnet, fingerprint PLC/HMI/SCADA/kamera
🔍 Real Modbus polling: baca register, deteksi anomali (Welford z-score)
🌐 Threat intelligence: NVD CVE matching per device
⚡ 15 OT security rules (IEC 62443, NERC CIP, NIST 800-82)
🔒 MQTT anonymous access detection (raw protocol check)
🤖 AI triage untuk insiden CRITICAL/HIGH (BYOK)

Pasar OT security: $30B+ by 2028. Pemain sedikit. {{cta}}`,
    hashtags: ["#OTSecurity","#IoTSecurity","#ICS","#SCADA","#IndustrialCyber","#AXTOSentinel","#CriticalInfrastructure"],
    cta_text: "🔗 Protect your OT: axto.io/sentinel",
    language: "id",
  },
  {
    id: "t002", title: "Sentinel — Modbus Security", category: "sentinel_modbus", product: "sentinel",
    platforms: ["linkedin","twitter"],
    body_text: `⚠️ Modbus TCP has ZERO authentication by default.

Port 502 open = anyone on the network can read/write PLC registers.

AXTO Sentinel addresses this:
→ Discovers all Modbus-enabled devices on your OT subnet
→ Monitors register values with Welford baseline (μ ± 3σ)
→ Alerts on value anomalies (temperature spike, pressure change)
→ Detects unauthorized function codes (DNP3 rule OT-011)
→ No Modbus library dependency — pure raw TCP ADU implementation

When PLC register values deviate from baseline → immediate alert.
Before process failure. Before safety incident.

{{cta}}`,
    hashtags: ["#Modbus","#PLCSecurity","#OTSecurity","#ICS","#SCADA","#AXTOSentinel","#IndustrialIoT"],
    cta_text: "🔗 axto.io/sentinel/modbus",
    language: "en",
  },
  {
    id: "t003", title: "Sentinel — CVE Matching", category: "sentinel_cve", product: "sentinel",
    platforms: ["linkedin","twitter"],
    body_text: `🔴 Siemens S7-300, Schneider Modicon, Allen-Bradley, Hikvision...
Perangkat lama dengan CVE yang tidak di-patch = attack surface terbuka.

AXTO Sentinel mendeteksi ini otomatis:
→ Fingerprint perangkat via banner grab + port profiling
→ Match ke database 13+ known device fingerprints
→ Query NVD API untuk CVE terbaru per vendor/product
→ Alert ketika high-severity CVE (CVSS ≥ 7) ditemukan

Contoh: Kamera Hikvision CVE-2021-36260 (CVSS 9.8) — unauthenticated RCE.
Sentinel mendeteksi dan alert sebelum dieksploitasi.

{{cta}}`,
    hashtags: ["#CVE","#VulnerabilityManagement","#OTSecurity","#ICS","#AXTOSentinel","#ICSVulnerability"],
    cta_text: "🔗 axto.io/sentinel/cve",
    language: "id",
  },
  {
    id: "t004", title: "Sentinel — IEC 62443", category: "sentinel_compliance", product: "sentinel",
    platforms: ["linkedin"],
    body_text: `📋 IEC 62443 is the gold standard for industrial cybersecurity.

AXTO Sentinel continuously monitors compliance:

SR 1.1 (Asset Identification): ✓ Auto-discovery inventory
SR 1.2 (Software Process Auth): ✓ MQTT/OPC-UA auth check
SR 2.6 (Physical Lock): ⚠️ PLC programming mode detection
SR 3.3 (Security Monitoring): ✓ SOC/Guardian integration check
SR 6.1 (Response): ✓ Welford anomaly baseline monitoring
SR 7.1 (DoS Protection): ✓ Device dropout detection

Compliance report generated at /v1/compliance/iec62443 
Ready for ISA99 certification audit. {{cta}}`,
    hashtags: ["#IEC62443","#ISA99","#OTSecurity","#ICSCompliance","#AXTOSentinel","#IndustrialCybersecurity"],
    cta_text: "📋 IEC 62443 guide: axto.io/sentinel/iec62443",
    language: "en",
  },
  {
    id: "t005", title: "Sentinel — Ransomware OT", category: "sentinel_ransomware", product: "sentinel",
    platforms: ["linkedin","facebook","twitter"],
    body_text: `💀 Colonial Pipeline. Oldsmar water treatment. Merck. Norsk Hydro.

Semua contoh ransomware yang menyerang infrastruktur OT/ICS.
Rata-rata downtime: 16 hari. Kerugian: $4.47M.

AXTO Sentinel deteksi early indicators:
→ File ekstensi .encrypted/.locked di OT network shares
→ vssadmin shadow copy deletion (OT-004)
→ Defensive tools disabled (OT-010)
→ C2 beacon pattern dari engineering workstation
→ IT→OT boundary violation (new connection)

Isolasi sebelum propagasi.
Alert sebelum shutdown. {{cta}}`,
    hashtags: ["#OTRansomware","#ColonialPipeline","#ICSCyber","#AXTOSentinel","#CriticalInfrastructure","#NERC"],
    cta_text: "🛡️ Protect your OT: axto.io/sentinel",
    language: "id",
  },
];

// ── Combined export ───────────────────────────────────────────────────────────
export const ALL_NEW_PRODUCT_TEMPLATES: AutoPostTemplate[] = [
  ...VAULT_TEMPLATES,
  ...SOC_TEMPLATES,
  ...COMPLIANCE_TEMPLATES,
  ...EDGE_TEMPLATES,
  ...SENTINEL_TEMPLATES,
];

export const NEW_TEMPLATE_CATEGORIES = [
  "vault_pii", "vault_compliance", "vault_pdpa", "vault_hipaa", "vault_pci", "vault_dev", "vault_audit", "vault_dp",
  "soc_intro", "soc_mitre", "soc_soar", "soc_ti", "soc_ueba", "soc_ransomware", "soc_sla", "soc_comparison",
  "compliance_intro", "compliance_evidence", "compliance_soc2", "compliance_pci", "compliance_vendor",
  "edge_intro", "edge_cost", "edge_firewall", "edge_reliability", "edge_providers",
  "sentinel_intro", "sentinel_modbus", "sentinel_cve", "sentinel_compliance", "sentinel_ransomware",
  "studio_intro", "studio_ai", "studio_gpu", "studio_hybrid", "studio_byok",
];

// ─────────────────────────────────────────────────────────────
// AXTO STUDIO TEMPLATES
// ─────────────────────────────────────────────────────────────
export const STUDIO_TEMPLATES: AutoPostTemplate[] = [
  {
    id: "st001", title: "Studio — Platform Intro EN", category: "studio_intro", product: "studio",
    platforms: ["facebook","instagram","linkedin","twitter"],
    body_text: `🧠 Introducing AXTO Studio — Your AI & GPU, Your Rules.

The first self-hosted AI workspace where YOU bring the keys, and WE provide the studio.

✅ AI Studio — Chat with OpenAI, Claude, Gemini, Groq using YOUR API keys
✅ GPU Studio — Connect RunPod, Lambda, or your own GPU servers
✅ Hybrid Studio — Chain cloud AI + local GPU in one pipeline
✅ Complete data privacy — everything stored on YOUR server

Why pay per-token to middlemen when you can use your own keys in a professional studio?

Starting at $49/mo. Self-hosted. Enterprise-grade.

{{cta}}`,
    hashtags: ["#AI","#GPU","#BYOK","#AXTOStudio","#SelfHosted","#AIStudio","#GPUCompute","#MLOps"],
    cta_text: "🔗 Try AXTO Studio: axto.io/register?pkg=trial_studio",
    language: "en",
  },
  {
    id: "st002", title: "Studio — BYOK Advantage", category: "studio_byok", product: "studio",
    platforms: ["facebook","linkedin","twitter"],
    body_text: `🔐 Stop paying AI middlemen double. Use YOUR API keys in a professional studio.

The problem: You pay OpenAI/Anthropic for tokens, then pay ANOTHER platform for the workspace.

AXTO Studio solution:
→ Bring your OWN API keys (OpenAI, Claude, Gemini, Groq, DeepSeek, 10+ providers)
→ Route through our enterprise studio — $49/mo flat
→ Zero per-token markup from AXTO
→ All data stored on YOUR server, never on ours

Compare: Vercel AI SDK $20-100/mo + usage fees vs AXTO Studio $49/mo flat.

{{cta}}`,
    hashtags: ["#BYOK","#AI","#CostOptimization","#AXTOStudio","#SelfHosted","#OpenAI","#Claude"],
    cta_text: "🔗 Start your trial: axto.io/register?pkg=trial_studio",
    language: "en",
  },
  {
    id: "st003", title: "Studio — Intro ID", category: "studio_intro", product: "studio",
    platforms: ["facebook","instagram","linkedin","twitter"],
    body_text: `🧠 AXTO Studio — Platform AI & GPU Profesional, 100% di Server Anda.

Bawa API key sendiri, gunakan studio kelas enterprise kami:

✅ AI Studio — Chat dengan OpenAI, Claude, Gemini pakai KEY ANDA
✅ GPU Studio — Hubungkan RunPod, Lambda, atau GPU server Anda
✅ Hybrid Studio — Gabungkan AI cloud + GPU lokal dalam 1 pipeline
✅ Data 100% di server ANDA — AXTO tidak pernah melihat prompt Anda

Mulai $49/bulan. Self-hosted. Profesional.

{{cta}}`,
    hashtags: ["#AI","#GPU","#BYOK","#AXTOStudio","#SelfHosted","#AIIndonesia","#StartupIndonesia"],
    cta_text: "🔗 Coba AXTO Studio: axto.io/register?pkg=trial_studio",
    language: "id",
  },
  {
    id: "st004", title: "Studio — GPU Pool", category: "studio_gpu", product: "studio",
    platforms: ["facebook","linkedin","twitter"],
    body_text: `⚡ Your GPU. Your Models. Professional Management.

AXTO GPU Studio connects to YOUR GPU infrastructure:

🖥️ RunPod, Lambda, vast.ai, or your own NVIDIA servers
📊 Real-time GPU health monitoring & VRAM tracking
🤖 One-click model deployment (Ollama, vLLM, TGI)
🔒 Credentials encrypted & isolated per account

No shared GPU pools. No noisy neighbors. Your hardware, your models, our enterprise dashboard.

{{cta}}`,
    hashtags: ["#GPU","#CUDA","#MLOps","#AXTOStudio","#SelfHosted","#MachineLearning","#DeepLearning"],
    cta_text: "🔗 Connect your GPU: axto.io/register?pkg=studio_starter",
    language: "en",
  },
  {
    id: "st005", title: "Studio — Hybrid Pipeline", category: "studio_hybrid", product: "studio",
    platforms: ["facebook","linkedin","twitter"],
    body_text: `🔀 The smartest AI infrastructure: Cloud + Local GPU in one pipeline.

AXTO Hybrid Studio lets you build intelligent routing:

"If my GPU is idle → route to local Llama 3. If busy → fallback to GPT-4o. If cost > $0.05/req → use DeepSeek."

✅ Visual pipeline builder
✅ AI + GPU nodes in one workflow
✅ Smart cost optimization
✅ All using YOUR credentials

This is how enterprise teams run AI at scale without overspending.

{{cta}}`,
    hashtags: ["#AI","#HybridAI","#GPU","#CostOptimization","#AXTOStudio","#MLPipeline","#AIInfrastructure"],
    cta_text: "🔗 Build your pipeline: axto.io/register?pkg=studio_professional",
    language: "en",
  },
];

