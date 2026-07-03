/* ==============================================================================
 * AXTO — Product Guides (single source of truth)
 * Complete install + usage + feature documentation for every product, rendered
 * consistently in English & Bahasa Indonesia. Every product ships a complete,
 * downloadable guide in place of human/managed support — self-hosted, no SLA.
 *
 * To add/adjust a product, edit ONE entry below; the renderer keeps every
 * language and the website/in-app downloads in sync automatically.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */

export type Lang = "en" | "id";

interface GuideData {
  name: string;
  prefix: string;          // license key prefix, e.g. "LEGL"
  port: number;            // default dashboard port (configurable)
  configStyle: "yml" | "env";
  configFile: string;      // e.g. "legal.env" or "guardian.yml"
  needsLLMKey: boolean;    // true if the product calls LLM providers (BYOK / free / local)
  tagline: Record<Lang, string>;
  overview: Record<Lang, string>;
  features: Record<Lang, string[]>;   // feature descriptions (the "keterangan fitur")
  menus: Record<Lang, [string, string][]>;  // [menu name, what it does]
}

// ── Authoritative ports & prefixes (keep unique to avoid collisions) ──────────
export const PRODUCT_GUIDES: Record<string, GuideData> = {
  guardian: {
    name: "Guardian AI", prefix: "GUARD", port: 8080, configStyle: "yml",
    configFile: "guardian.yml", needsLLMKey: false,
    tagline: { en: "Self-hosted AI cybersecurity for your servers",
               id: "Keamanan siber AI self-hosted untuk server Anda" },
    overview: {
      en: "Guardian detects, quarantines and reports threats across your fleet using 7-layer AI behavioral analysis and the ClamAV engine. It runs entirely on your infrastructure — telemetry never leaves your network.",
      id: "Guardian mendeteksi, mengarantina, dan melaporkan ancaman di seluruh server Anda memakai analisis perilaku AI 7-lapis dan mesin ClamAV. Berjalan sepenuhnya di infrastruktur Anda — telemetri tidak pernah keluar dari jaringan." },
    features: {
      en: ["7-layer AI behavioral analysis with live threat intelligence",
           "Built-in ClamAV scanning with automated quarantine",
           "Real-time alerts to email, Slack and Discord",
           "Scales from 1 to 1,000 servers; eBPF, mTLS mesh and deception at higher tiers",
           "One-click compliance reports for SOC 2 / ISO 27001"],
      id: ["Analisis perilaku AI 7-lapis dengan intelijen ancaman langsung",
           "Pemindaian ClamAV bawaan dengan karantina otomatis",
           "Peringatan real-time ke email, Slack, dan Discord",
           "Skala 1–1.000 server; eBPF, mesh mTLS, dan deception di tier lebih tinggi",
           "Laporan compliance sekali klik untuk SOC 2 / ISO 27001"] },
    menus: {
      en: [["Overview", "Fleet health, threat score and system resources at a glance"],
           ["Threats", "Live detections with severity, source process and recommended action"],
           ["Network", "Real-time bandwidth and connection monitoring per process"],
           ["Compliance", "Generate audit-ready security reports"],
           ["Settings → License", "Expiry, seats and activation status"]],
      id: [["Overview", "Kesehatan server, skor ancaman, dan sumber daya sistem sekilas"],
           ["Threats", "Deteksi langsung dengan tingkat keparahan, proses sumber, dan tindakan disarankan"],
           ["Network", "Pemantauan bandwidth & koneksi real-time per proses"],
           ["Compliance", "Buat laporan keamanan siap audit"],
           ["Settings → License", "Masa berlaku, seat, dan status aktivasi"]] },
  },
  orchestra: {
    name: "Orchestra AI", prefix: "ORCH", port: 8088, configStyle: "yml",
    configFile: "orchestra.yml", needsLLMKey: true,
    tagline: { en: "Self-hosted AI orchestration across 15+ providers",
               id: "Orkestrasi AI self-hosted lintas 15+ provider" },
    overview: {
      en: "Orchestra routes each AI request to the best provider using CPU and GPU workers, with cost caps, smart routing and an OpenAI-compatible API. Bring your own provider keys; nothing is shared with AXTO.",
      id: "Orchestra mengarahkan tiap permintaan AI ke provider terbaik memakai worker CPU & GPU, dengan batas biaya, smart routing, dan API kompatibel OpenAI. Pakai key provider Anda sendiri; tidak ada yang dibagikan ke AXTO." },
    features: {
      en: ["Smart routing across 15+ providers (OpenAI, Anthropic, Gemini, Groq, Ollama…)",
           "CPU and GPU workers with auto-detect and up to 6 routing strategies",
           "Per-budget cost caps and real-time token/cost analytics",
           "Autoscale and scale-to-zero at higher tiers",
           "Drop-in OpenAI-compatible endpoint — no app rewrite"],
      id: ["Smart routing lintas 15+ provider (OpenAI, Anthropic, Gemini, Groq, Ollama…)",
           "Worker CPU & GPU dengan auto-detect dan hingga 6 strategi routing",
           "Batas biaya per-budget dan analitik token/biaya real-time",
           "Autoscale dan scale-to-zero di tier lebih tinggi",
           "Endpoint kompatibel OpenAI — tanpa menulis ulang aplikasi"] },
    menus: {
      en: [["Console", "Live request routing, worker health and throughput"],
           ["Workers", "CPU/GPU worker pool — add, drain, or scale"],
           ["Cost & Usage", "Budget usage, token spend, CSV export for accounting"],
           ["Providers", "Configure provider keys and routing strategy"],
           ["Settings → License", "Worker limits, expiry and activation"]],
      id: [["Console", "Routing permintaan langsung, kesehatan worker, dan throughput"],
           ["Workers", "Pool worker CPU/GPU — tambah, kosongkan, atau skala"],
           ["Cost & Usage", "Pemakaian budget, biaya token, ekspor CSV untuk akuntansi"],
           ["Providers", "Atur key provider dan strategi routing"],
           ["Settings → License", "Batas worker, masa berlaku, dan aktivasi"]] },
  },
  vault: {
    name: "AXTO Vault", prefix: "VAULT", port: 8081, configStyle: "yml",
    configFile: "vault.yml", needsLLMKey: true,
    tagline: { en: "AI privacy proxy — redact PII before it reaches any model",
               id: "Proxy privasi AI — sensor PII sebelum sampai ke model" },
    overview: {
      en: "Vault sits transparently between your app and any AI provider, automatically redacting PII, PHI and financial data — no code changes required. Sensitive values are re-injected on the way back.",
      id: "Vault berada transparan antara aplikasi dan provider AI mana pun, otomatis menyensor data PII, PHI, dan finansial — tanpa perubahan kode. Nilai sensitif disisipkan kembali saat respons." },
    features: {
      en: ["120+ PII/PHI/financial entity types with multiple masking strategies",
           "Transparent proxy — point your base URL at Vault, that's it",
           "Session-based re-injection and a tokenization vault",
           "Aligned with GDPR, PDPA, HIPAA and PCI-DSS",
           "One-click privacy-control evidence reports"],
      id: ["120+ tipe entitas PII/PHI/finansial dengan beberapa strategi masking",
           "Proxy transparan — cukup arahkan base URL ke Vault",
           "Re-injection berbasis sesi dan brankas tokenization",
           "Selaras dengan GDPR, PDPA, HIPAA, dan PCI-DSS",
           "Laporan bukti kontrol privasi sekali klik"] },
    menus: {
      en: [["Overview", "Intercepts/day, redaction rate and policy status"],
           ["Policies", "Enable entity types and choose masking strategy"],
           ["Audit Log", "Every intercept with what was redacted (values never stored)"],
           ["Providers", "Upstream AI providers the proxy forwards to"],
           ["Settings → License", "Request limits, expiry and activation"]],
      id: [["Overview", "Intercept/hari, tingkat redaksi, dan status kebijakan"],
           ["Policies", "Aktifkan tipe entitas dan pilih strategi masking"],
           ["Audit Log", "Tiap intercept dengan apa yang disensor (nilai tidak disimpan)"],
           ["Providers", "Provider AI upstream tujuan proxy"],
           ["Settings → License", "Batas request, masa berlaku, dan aktivasi"]] },
  },
  edge: {
    name: "AXTO Edge", prefix: "EDGE", port: 8082, configStyle: "yml",
    configFile: "edge.yml", needsLLMKey: true,
    tagline: { en: "AI gateway & API management for serving models to customers",
               id: "Gateway AI & manajemen API untuk melayani model ke pelanggan" },
    overview: {
      en: "Edge is a multi-provider AI gateway with per-customer API keys, cost routing, a prompt-injection firewall and usage metering — everything you need to resell or meter AI access.",
      id: "Edge adalah gateway AI multi-provider dengan API key per-pelanggan, cost routing, firewall prompt-injection, dan metering pemakaian — semua yang dibutuhkan untuk menjual ulang atau mengukur akses AI." },
    features: {
      en: ["Multi-provider routing with per-customer API keys",
           "Prompt-injection firewall and content guardrails",
           "Cost routing to the cheapest capable model",
           "Per-customer metering and billing exports",
           "Live analytics by customer, model and endpoint"],
      id: ["Routing multi-provider dengan API key per-pelanggan",
           "Firewall prompt-injection dan guardrail konten",
           "Cost routing ke model termurah yang mampu",
           "Metering per-pelanggan dan ekspor penagihan",
           "Analitik langsung per pelanggan, model, dan endpoint"] },
    menus: {
      en: [["Overview", "Requests, spend and error rate across all customers"],
           ["Customers", "Issue and revoke per-customer API keys with quotas"],
           ["Firewall", "Prompt-injection rules and content policies"],
           ["Billing", "Usage metering and invoice-ready exports"],
           ["Settings → License", "Request limits, expiry and activation"]],
      id: [["Overview", "Permintaan, biaya, dan error rate seluruh pelanggan"],
           ["Customers", "Terbitkan & cabut API key per-pelanggan dengan kuota"],
           ["Firewall", "Aturan prompt-injection dan kebijakan konten"],
           ["Billing", "Metering pemakaian dan ekspor siap-faktur"],
           ["Settings → License", "Batas request, masa berlaku, dan aktivasi"]] },
  },
  soc: {
    name: "AXTO SOC", prefix: "SOC", port: 8083, configStyle: "yml",
    configFile: "soc.yml", needsLLMKey: false,
    tagline: { en: "AI-assisted Security Operations Center (SIEM + SOAR)",
               id: "Security Operations Center berbantuan AI (SIEM + SOAR)" },
    overview: {
      en: "SOC ingests security events (syslog UDP 5514 or REST), correlates them with MITRE ATT&CK and threat intel, and drives incident response with SOAR automation — all self-hosted.",
      id: "SOC menerima event keamanan (syslog UDP 5514 atau REST), mengorelasikannya dengan MITRE ATT&CK dan intelijen ancaman, lalu menggerakkan respons insiden dengan otomasi SOAR — semua self-hosted." },
    features: {
      en: ["Unified SIEM ingest from syslog and REST sources",
           "MITRE ATT&CK mapping with millions of threat indicators",
           "Detection rules with real-time WebSocket event feed",
           "SOAR playbooks for automated response",
           "Executive-ready security reporting"],
      id: ["Ingest SIEM terpadu dari sumber syslog dan REST",
           "Pemetaan MITRE ATT&CK dengan jutaan indikator ancaman",
           "Aturan deteksi dengan feed event WebSocket real-time",
           "Playbook SOAR untuk respons otomatis",
           "Pelaporan keamanan siap eksekutif"] },
    menus: {
      en: [["Live Events", "Event log filtered by severity, source and type"],
           ["Incidents", "Open cases with timeline and response actions"],
           ["Detections", "Rules and MITRE ATT&CK coverage"],
           ["Threat Intel", "Indicators of compromise and enrichment"],
           ["Settings → License", "EPS limits, expiry and activation"]],
      id: [["Live Events", "Log event tersaring per keparahan, sumber, dan tipe"],
           ["Incidents", "Kasus terbuka dengan linimasa dan tindakan respons"],
           ["Detections", "Aturan dan cakupan MITRE ATT&CK"],
           ["Threat Intel", "Indikator kompromi dan pengayaan"],
           ["Settings → License", "Batas EPS, masa berlaku, dan aktivasi"]] },
  },
  compliance: {
    name: "AXTO Compliance", prefix: "CMPL", port: 8084, configStyle: "yml",
    configFile: "compliance.yml", needsLLMKey: false,
    tagline: { en: "Automated audit platform for continuous compliance",
               id: "Platform audit otomatis untuk compliance berkelanjutan" },
    overview: {
      en: "Compliance continuously monitors SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA and NIST CSF, collects evidence automatically and produces audit-ready reports with gap analysis.",
      id: "Compliance terus memantau SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA, dan NIST CSF, mengumpulkan bukti otomatis, dan menghasilkan laporan siap audit dengan analisis gap." },
    features: {
      en: ["Up to 7 frameworks monitored continuously",
           "Automated control checks and evidence collection",
           "Gap analysis with prioritized remediation steps",
           "150+ policy template library with version control",
           "Time-limited read-only access links for external auditors"],
      id: ["Hingga 7 framework dipantau berkelanjutan",
           "Cek kontrol dan pengumpulan bukti otomatis",
           "Analisis gap dengan langkah remediasi berprioritas",
           "Pustaka 150+ template kebijakan dengan kontrol versi",
           "Tautan akses read-only berbatas waktu untuk auditor eksternal"] },
    menus: {
      en: [["Overview", "Framework coverage scores and control status"],
           ["Gap Analysis", "Prioritized control gaps with remediation"],
           ["Controls", "All controls per framework with evidence status"],
           ["Reports", "Generate audit-ready PDF for any framework"],
           ["Settings → License", "Frameworks, expiry and activation"]],
      id: [["Overview", "Skor cakupan framework dan status kontrol"],
           ["Gap Analysis", "Gap kontrol berprioritas dengan remediasi"],
           ["Controls", "Semua kontrol per framework dengan status bukti"],
           ["Reports", "Buat PDF siap audit untuk framework mana pun"],
           ["Settings → License", "Framework, masa berlaku, dan aktivasi"]] },
  },
  sentinel: {
    name: "AXTO Sentinel", prefix: "SNTL", port: 8085, configStyle: "yml",
    configFile: "sentinel.yml", needsLLMKey: false,
    tagline: { en: "Security monitoring for industrial IoT & OT",
               id: "Pemantauan keamanan untuk IoT industri & OT" },
    overview: {
      en: "Sentinel discovers and monitors industrial devices, applies OT detection rules, matches CVEs and produces IEC 62443 / NERC CIP / NIST 800-82 reports — deployable fully air-gapped.",
      id: "Sentinel menemukan & memantau perangkat industri, menerapkan aturan deteksi OT, mencocokkan CVE, dan menghasilkan laporan IEC 62443 / NERC CIP / NIST 800-82 — bisa dipasang sepenuhnya air-gapped." },
    features: {
      en: ["Automatic device inventory with OT protocol detection",
           "OT detection rules and Modbus polling",
           "CVE matching against your device fleet",
           "IEC 62443, NERC CIP and NIST 800-82 reporting",
           "Air-gapped deployment for isolated facilities"],
      id: ["Inventaris perangkat otomatis dengan deteksi protokol OT",
           "Aturan deteksi OT dan polling Modbus",
           "Pencocokan CVE terhadap armada perangkat Anda",
           "Pelaporan IEC 62443, NERC CIP, dan NIST 800-82",
           "Pemasangan air-gapped untuk fasilitas terisolasi"] },
    menus: {
      en: [["Devices", "Live inventory with type, vendor and risk"],
           ["Alerts", "OT rule hits and anomalous behavior"],
           ["Vulnerabilities", "CVE matches per device with severity"],
           ["Reports", "Generate OT compliance reports"],
           ["Settings → License", "Device limits, expiry and activation"]],
      id: [["Devices", "Inventaris langsung dengan tipe, vendor, dan risiko"],
           ["Alerts", "Aturan OT terpicu dan perilaku anomali"],
           ["Vulnerabilities", "Kecocokan CVE per perangkat dengan keparahan"],
           ["Reports", "Buat laporan compliance OT"],
           ["Settings → License", "Batas perangkat, masa berlaku, dan aktivasi"]] },
  },
  antivirus: {
    name: "AXTO Antivirus", prefix: "AV", port: 8086, configStyle: "yml",
    configFile: "antivirus.yml", needsLLMKey: false,
    tagline: { en: "ClamAV + machine-learning endpoint protection",
               id: "Proteksi endpoint ClamAV + machine learning" },
    overview: {
      en: "Antivirus pairs the proven ClamAV engine with YARA rules and machine-learning behavioral detection, exposed through a clean REST API and integrated with Guardian and SOC.",
      id: "Antivirus memadukan mesin ClamAV teruji dengan aturan YARA dan deteksi perilaku machine-learning, lewat REST API yang rapi dan terintegrasi dengan Guardian dan SOC." },
    features: {
      en: ["ClamAV scanning with custom YARA rules",
           "Machine-learning behavioral detection at higher tiers",
           "Clean REST API for on-demand and scheduled scans",
           "Automated quarantine and release workflow",
           "Integrates with Guardian and SOC"],
      id: ["Pemindaian ClamAV dengan aturan YARA kustom",
           "Deteksi perilaku machine-learning di tier lebih tinggi",
           "REST API rapi untuk pindai on-demand & terjadwal",
           "Alur karantina dan pelepasan otomatis",
           "Integrasi dengan Guardian dan SOC"] },
    menus: {
      en: [["Overview", "Scan volume, detections and quarantine status"],
           ["Scans", "On-demand and scheduled scan management"],
           ["Quarantine", "Isolated files with restore/delete actions"],
           ["Rules", "Manage YARA and signature sources"],
           ["Settings → License", "Endpoint limits, expiry and activation"]],
      id: [["Overview", "Volume pindai, deteksi, dan status karantina"],
           ["Scans", "Manajemen pindai on-demand dan terjadwal"],
           ["Quarantine", "File terisolasi dengan aksi pulihkan/hapus"],
           ["Rules", "Kelola sumber YARA dan signature"],
           ["Settings → License", "Batas endpoint, masa berlaku, dan aktivasi"]] },
  },
  studio: {
    name: "AXTO Studio", prefix: "STUD", port: 8087, configStyle: "yml",
    configFile: "studio.yml", needsLLMKey: true,
    tagline: { en: "A workspace for AI & GPU pools — chat, completions, pipelines",
               id: "Workspace untuk pool AI & GPU — chat, completion, pipeline" },
    overview: {
      en: "Studio brings AI Studio, GPU Studio and Hybrid pipelines together with a visual pipeline builder and a REST API, across 5 to 15+ providers — run it on your own GPUs.",
      id: "Studio menyatukan AI Studio, GPU Studio, dan pipeline Hybrid dengan pembuat pipeline visual dan REST API, lintas 5 hingga 15+ provider — jalankan di GPU Anda sendiri." },
    features: {
      en: ["AI Studio, GPU Studio and Hybrid pipelines in one place",
           "Visual pipeline builder with reusable steps",
           "5 to 15+ providers (cloud and local GPU)",
           "REST API and CI/CD webhooks at higher tiers",
           "Bring your own keys — nothing shared with AXTO"],
      id: ["AI Studio, GPU Studio, dan pipeline Hybrid dalam satu tempat",
           "Pembuat pipeline visual dengan langkah yang dapat dipakai ulang",
           "5 hingga 15+ provider (cloud dan GPU lokal)",
           "REST API dan webhook CI/CD di tier lebih tinggi",
           "Pakai key Anda sendiri — tidak ada yang dibagikan ke AXTO"] },
    menus: {
      en: [["AI Studio", "Chat and completions across configured providers"],
           ["GPU Studio", "Local GPU inference and model management"],
           ["Pipelines", "Build, run and schedule hybrid AI pipelines"],
           ["Providers", "Configure provider keys and defaults"],
           ["Settings → License", "Pipeline limits, expiry and activation"]],
      id: [["AI Studio", "Chat dan completion lintas provider terkonfigurasi"],
           ["GPU Studio", "Inferensi GPU lokal dan manajemen model"],
           ["Pipelines", "Bangun, jalankan, dan jadwalkan pipeline AI hybrid"],
           ["Providers", "Atur key provider dan default"],
           ["Settings → License", "Batas pipeline, masa berlaku, dan aktivasi"]] },
  },
  legal: {
    name: "AXTO Legal", prefix: "LEGL", port: 8096, configStyle: "env",
    configFile: "legal.env", needsLLMKey: true,
    tagline: { en: "Enterprise AI for legal research & regulatory compliance",
               id: "AI enterprise untuk riset hukum & compliance regulasi" },
    overview: {
      en: "Legal provides 18 AI workspaces across 195+ jurisdictions and 50+ compliance frameworks with a built-in citation engine. BYOK with an air-gapped option — matter data never leaves your network.",
      id: "Legal menyediakan 18 workspace AI lintas 195+ yurisdiksi dan 50+ framework compliance dengan citation engine bawaan. BYOK dengan opsi air-gapped — data perkara tidak pernah keluar jaringan." },
    features: {
      en: ["18 AI legal workspaces (research, contract review, AML/KYC, ESG…)",
           "195+ country legal packs and 50+ compliance frameworks",
           "Built-in citation engine for verifiable references",
           "BYOK across OpenAI/Anthropic/Gemini/Groq, or local Ollama (air-gapped)",
           "Document analysis with annotated PDF/DOCX export"],
      id: ["18 workspace hukum AI (riset, review kontrak, AML/KYC, ESG…)",
           "195+ country legal pack dan 50+ framework compliance",
           "Citation engine bawaan untuk rujukan yang dapat diverifikasi",
           "BYOK lintas OpenAI/Anthropic/Gemini/Groq, atau Ollama lokal (air-gapped)",
           "Analisis dokumen dengan ekspor PDF/DOCX beranotasi"] },
    menus: {
      en: [["Workspaces", "18 AI legal workspaces for different tasks"],
           ["Documents", "Upload, analyze and export annotated reports"],
           ["Regulatory Updates", "Scheduled pulls of new regulations"],
           ["Jurisdictions", "Manage active country legal packs"],
           ["Settings → License", "Seats, country packs, expiry and activation"]],
      id: [["Workspaces", "18 workspace hukum AI untuk berbagai tugas"],
           ["Documents", "Unggah, analisis, dan ekspor laporan beranotasi"],
           ["Regulatory Updates", "Tarik regulasi baru terjadwal"],
           ["Jurisdictions", "Kelola country legal pack aktif"],
           ["Settings → License", "Seat, country pack, masa berlaku, dan aktivasi"]] },
  },
};

// ── Localized section labels ──────────────────────────────────────────────────
interface LocalizedLabels {
  prereq: string; getlic: string; config: string; start: string; menus: string;
  feats: string; enforce: string; trouble: string; support: string;
  docker: string; cpu: string; lickey: string; llm: string; buy: string;
  open: string; appears: string; enf: string[]; resp: string;
}
const L: Record<Lang, LocalizedLabels> = {
  en: { prereq: "Prerequisites", getlic: "1. Get your license", config: "2. Configure",
        start: "3. Start", menus: "4. Dashboard menus & usage", feats: "Key features",
        enforce: "License enforcement", trouble: "Troubleshooting", support: "Support",
        docker: "Docker 24+ and Docker Compose v2+", cpu: "2+ CPU cores, 4+ GB RAM",
        lickey: "license key (prefix", llm: "An LLM provider key (OpenAI / Anthropic / Gemini / Groq) or a local Ollama install — free and local options are fully supported",
        buy: "Purchase at axto.io, or activate a manually-issued key with no portal account. Your key looks like",
        open: "Open", appears: "— the activation screen appears automatically",
        enf: ["Validated against axto.io; responses are Ed25519-signed and verified locally",
              "4-hour offline grace if the license server is unreachable",
              "A disabled (OFF) or expired license blocks requests until restored"],
        resp: "response within 1 business day" },
  id: { prereq: "Persyaratan", getlic: "1. Dapatkan lisensi", config: "2. Konfigurasi",
        start: "3. Jalankan", menus: "4. Menu dashboard & penggunaan", feats: "Fitur utama",
        enforce: "Penegakan lisensi", trouble: "Troubleshooting", support: "Support",
        docker: "Docker 24+ dan Docker Compose v2+", cpu: "Min. 2 CPU core, 4 GB RAM",
        lickey: "license key (prefix", llm: "Key LLM provider (OpenAI / Anthropic / Gemini / Groq) atau Ollama lokal — opsi gratis dan lokal didukung penuh",
        buy: "Beli di axto.io, atau aktivasi key terbitan manual tanpa akun portal. Key Anda berbentuk",
        open: "Buka", appears: "— layar aktivasi muncul otomatis",
        enf: ["Divalidasi ke axto.io; respons ditandatangani Ed25519 & diverifikasi lokal",
              "Grace offline 4 jam bila server lisensi tak terjangkau",
              "Lisensi OFF / kedaluwarsa memblokir request hingga dipulihkan"],
        resp: "respons dalam 1 hari kerja" },
};

function configBlock(g: GuideData, lang: Lang): string {
  const api = lang === "en" ? "choose-a-strong-api-key" : "pilih-api-key-kuat";
  if (g.configStyle === "env") {
    let s = `${g.prefix}_LICENSE_KEY=${g.prefix}-YOUR-KEY-HERE\n${g.prefix}_API_KEY=${api}\n${g.prefix}_API_PORT=${g.port}`;
    if (g.needsLLMKey) s += `\n# LLM (BYOK) — or use local Ollama for air-gapped:\n${g.prefix}_LLM_PROVIDER=openai\n${g.prefix}_LLM_API_KEY=sk-...`;
    return "```ini\n" + s + "\n```";
  }
  let s = `${g.name.toLowerCase().split(" ")[0]}:\n  license_key: "${g.prefix}-YOUR-KEY-HERE"\n  port: ${g.port}\n  api_key: "${api}"`;
  if (g.needsLLMKey) s += `\n\n# LLM providers (BYOK) — or local Ollama for air-gapped\nproviders:\n  - provider: openai\n    api_key: "sk-..."`;
  return "```yaml\n" + s + "\n```";
}

export function renderGuide(product: string, lang: Lang = "en"): string {
  const g = PRODUCT_GUIDES[product];
  if (!g) return "";
  const t = L[lang];
  const disp = g.name.startsWith("AXTO") ? g.name : `AXTO ${g.name}`;
  const lines: string[] = [];
  lines.push(`# ${disp} — ${lang === "en" ? "Setup & Usage Guide" : "Panduan Setup & Penggunaan"}`);
  lines.push("");
  lines.push(`> ${g.tagline[lang]} · axto.io`);
  lines.push("");
  lines.push(g.overview[lang]);
  lines.push("");
  lines.push(`## ${t.prereq}`);
  lines.push(`- ${t.docker}`);
  lines.push(`- ${t.cpu}`);
  lines.push(`- ${disp} ${t.lickey}: \`${g.prefix}-\`)`);
  if (g.needsLLMKey) lines.push(`- ${t.llm}`);
  lines.push("");
  lines.push(`## ${t.getlic}`);
  lines.push(`${t.buy} \`${g.prefix}-XXXX-XXXX-XXXX-XXXX\`.`);
  lines.push("");
  lines.push(`## ${t.config} \`${g.configFile}\``);
  lines.push(configBlock(g, lang));
  lines.push("");
  lines.push(`## ${t.start}`);
  lines.push("```bash");
  lines.push(`docker compose -f docker-compose.yml up -d ${product}`);
  lines.push(`# ${t.open} http://YOUR_SERVER:${g.port} ${t.appears}`);
  lines.push("```");
  lines.push("");
  lines.push(`## ${t.menus}`);
  for (const [name, desc] of g.menus[lang]) lines.push(`- **${name}** — ${desc}`);
  lines.push("");
  lines.push(`## ${t.feats}`);
  for (const f of g.features[lang]) lines.push(`- ${f}`);
  lines.push("");
  lines.push(`## ${t.enforce}`);
  for (const e of t.enf) lines.push(`- ${e}`);
  lines.push("");
  lines.push(`## ${t.support}`);
  lines.push(`hallo@axto.io · ${t.resp}`);
  lines.push("");
  lines.push("---");
  lines.push(lang === "id"
    ? "Penafian: Perangkat Lunak ini hanya alat bantu; semua keputusan dan tanggung jawab ada pada pengguna. Disediakan \u201csebagaimana adanya\u201d tanpa jaminan. Sejauh diizinkan hukum, AXTO (axto.io) tidak bertanggung jawab atas kerugian apa pun yang timbul dari penggunaannya."
    : "Disclaimer: This Software is an assistive tool only; all decisions and responsibility rest with the user. It is provided \u201cas is\u201d without warranty. To the maximum extent permitted by law, AXTO (axto.io) accepts no liability for any loss arising from its use.");
  lines.push("");
  return lines.join("\n");
}

export const GUIDE_PRODUCTS = Object.keys(PRODUCT_GUIDES);
