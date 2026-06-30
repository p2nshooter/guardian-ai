/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
export const runtime = "edge";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/locale-provider";
import { FREE_AI_PROVIDERS } from "@/lib/free-ai-providers";

// ─── Types ─────────────────────────────────────────────────────────────────
type Section = "start"|"guardian"|"orchestra"|"antivirus"|"api"|"vault"|"edge"|"soc"|"compliance"|"sentinel"|"legal"|"ai-studio"|"gpu-studio"|"hybrid-studio";

// ─── Setup flow steps ──────────────────────────────────────────────────────
// Steps are defined as functions to support locale
const getSetupSteps = (t: (k:string)=>string, locale: string) => [
  {
    id:"payment", icon:"💳", title: t("setup.step1.title") || "1. Purchase License",
    color:"#0284c7", bg:"rgba(2,132,199,0.08)",
    desc: t("setup.step1.desc") || "Choose your plan at axto.io. Pay via Stripe, PayPal, Xendit, or Midtrans. License key sent to your email instantly.",
    detail:[
      locale==="id" ? "Select Guardian AI, Orchestra AI, or Bundle" : "Choose Guardian AI, Orchestra AI, or Bundle",
      locale==="id" ? "Checkout: masukkan email + metode pembayaran" : "Checkout: enter email + payment method",
      locale==="id" ? "Invoice PDF dikirim to email dalam 60 detik" : "Invoice PDF sent to email within 60 seconds",
      locale==="id" ? "License key muncul at dashboard portal klien" : "License key appears in your client portal",
    ],
    code:"",
    anim:"payment",
  },
  {
    id:"download", icon:"⬇️", title: t("setup.step2.title") || "2. Download Package",
    color:"#0d9488", bg:"rgba(13,148,136,0.08)",
    desc: t("setup.step2.desc") || "Login to portal → Licenses tab → click ⬇ Download. One ZIP contains all Docker images + installer. Works offline.",
    detail:[
      locale==="id" ? "Login: axto.io/portal (email + password or magic link)" : "Login: axto.io/portal (email + password or magic link)",
      locale==="id" ? "Tab Licenses → pilih paket you" : "Licenses tab → find your active license",
      locale==="id" ? "Select format: Docker Linux / EXE Linux / EXE Windows" : "Choose format: Docker Linux / EXE Linux / EXE Windows",
      locale==="id" ? "Click Download → dapat file .zip (300MB–2GB tergantung paket)" : "Click Download → get .zip file (300MB–2GB depending on package)",
      locale==="id" ? "ZIP berisi: Docker images (.tar.gz) + install.sh + README.txt" : "ZIP contains: Docker images (.tar.gz) + install.sh + README.txt",
    ],
    code:"",
    anim:"download",
  },
  {
    id:"license", icon:"🔑",
    title: t("setup.step3.title") || "3. Activate License",
    color:"#7c3aed", bg:"rgba(124,58,237,0.08)",
    desc: t("setup.step3.desc") || "Run install.sh → open browser at http://SERVER:8080 → activation form appears automatically → paste license key from portal → click Activate. Done!",
    detail:[
      t("setup.step3.d1") || "Run: sudo bash install.sh (loads Docker images offline — no internet required)",
      t("setup.step3.d2") || "Run: docker compose up -d",
      t("setup.step3.d3") || "Open browser: http://YOUR_SERVER_IP:8080",
      t("setup.step3.d4") || "Activation wizard appears automatically — no file editing needed",
      t("setup.step3.d5") || "Paste your license key from the portal → click Activate & Start",
      t("setup.step3.d6") || "You are redirected to the dashboard — all features are immediately active",
    ],
    code:`# No config file editing required!
# Enter your license key directly in the browser:
#   http://YOUR_SERVER:8080
#   → Activation Wizard appears automatically
#   → Paste: GUARD-A1B2-C3D4-E5F6-G7H8
#   → Click Activate → Dashboard ready ✓`,
    anim:"license",
  },
  {
    id:"docker", icon:"🐳", title: t("setup.step4.title") || "4. Deploy & Start",
    color:"#2563eb", bg:"rgba(37,99,235,0.08)",
    desc: t("setup.step4.desc") || "Extract ZIP → run install.sh → Docker images loaded offline. PostgreSQL and engine start automatically. Dashboard at port 8080.",
    detail:[
      t("setup.step4.d1") || "Make sure Docker Engine is installed on your server (Docker 20.10+)",
      t("setup.step4.d2") || "Extract ZIP: unzip axto-guardian-bundle-docker-linux.zip",
      t("setup.step4.d3") || "Run: sudo bash install.sh (loads Docker images offline, ~2–3 min)",
      t("setup.step4.d4") || "Run: docker compose up -d",
      t("setup.step4.d5") || "Wait ~60 seconds until all containers report healthy",
      t("setup.step4.d6") || "Open browser: http://YOUR_SERVER:8080 → activation wizard appears",
    ],
    code:`# Extract and install
unzip axto-guardian-bundle-docker-linux.zip
cd guardian-bundle-docker-linux
sudo bash install.sh   # loads images offline — no internet needed

# Start all services
docker compose up -d

# Check container status
docker compose ps

# Open your browser
open http://YOUR_SERVER:8080`,
    anim:"docker",
  },
  {
    id:"exe", icon:"💾",
    title: t("setup.step5.title") || "5. Or Use EXE Binary (No Docker)",
    color:"#dc2626", bg:"rgba(220,38,38,0.08)",
    desc: t("setup.step5.desc") || "Download the EXE binary for Linux or Windows from your portal. Run install.sh / install.bat — the binary starts automatically as a systemd service. Docker is not required.",
    detail:[
      t("setup.step5.d1") || "Download EXE ZIP from portal (e.g. axto-guardian-bundle-exe-linux.zip)",
      t("setup.step5.d2") || "Extract and run: sudo bash install.sh",
      t("setup.step5.d3") || "Windows: run install.bat as Administrator",
      t("setup.step5.d4") || "Binary automatically registers as a systemd service (Linux) or Windows Service",
      t("setup.step5.d5") || "Open browser: http://YOUR_SERVER:8080 → activation wizard",
      t("setup.step5.d6") || "Docker is not required — standalone binary with all dependencies bundled",
    ],
    code:`# Linux — install as systemd service
unzip axto-guardian-bundle-exe-linux.zip
cd guardian-bundle-exe-linux
sudo bash install.sh

# Check service status
systemctl status axto-guardian-core
systemctl status axto-guardian-node

# Windows — Run as Administrator
install.bat`,
    anim:"exe",
  },
  {
    id:"api", icon:"🤖",
    title: t("setup.step6.title") || "6. Connect Your AI API Keys",
    color:"#16a34a", bg:"rgba(22,163,74,0.08)",
    desc: t("setup.step6.desc") || "Orchestra AI is a drop-in replacement for the OpenAI API. Simply change base_url in your application to the Orchestra endpoint. Requests are automatically routed to the best provider.",
    detail:[
      t("setup.step6.d1") || "Orchestra endpoint: http://YOUR_SERVER:8080/v1/chat/completions",
      t("setup.step6.d2") || "Change base_url in your app — no other code changes needed",
      t("setup.step6.d3") || "Orchestra automatically routes to the cheapest / fastest available provider",
      t("setup.step6.d4") || "All requests logged in Console: cost, latency, provider used",
      t("setup.step6.d5") || "BYOK: your API keys stay on your server and never leave it",
    ],
    code:`# Python — only change base_url
from openai import OpenAI
client = OpenAI(
    base_url="http://YOUR_SERVER:8080/v1",
    api_key="YOUR_WORKER_TOKEN"   # Console → Settings → Worker Token
)
response = client.chat.completions.create(
    model="auto",   # Orchestra selects the best provider automatically
    messages=[{"role":"user","content":"Hello!"}]
)`,
    anim:"api",
  },
];

// ─── Guardian menus ─────────────────────────────────────────────────────────
const GUARDIAN_MENUS = [
  { icon:"📊", title:"Dashboard", color:"#0284c7",
    short:"Security command center — threat score, active threats, scan count, blocked attacks",
    detail:`The Dashboard is your real-time security command center.

WHAT IT DISPLAYS:
• Threat Score (0-100): Green = safe, Yellow = needs attention, Red = critical
• Active Threats: Number of active/unresolved threats
• Scans Today: Total files and processes scanned in the last 24 hours
• Blocked Attacks: Total blocked attacks (brute force, malware, intrusion)
• System Resources: CPU, Memory, Disk usage of the Guardian engine itself
• Recent Events Timeline: Last 50 security events in chronological order
• Threat Map: Geographic visualization of attack origins (if IP geolocation enabled)

WHAT TO DO:
→ If Threat Score < 70: check Active Threats immediately
→ Green badge = system healthy and protected
→ Click any metric to drill down into details`,
    anim:"guardian_dashboard" },
  { icon:"🔍", title:"Threat Scanner (7 Layer)", color:"#ef4444",
    short:"7-layer malware detection: hash, magic bytes, entropy, signatures, YARA, AI, behavioral",
    detail:`The File Scanner uses 7 sequential detection layers:

LAYER 1 — Hash Lookup: Compare file hash against malware database updated hourly
LAYER 2 — Magic Bytes: Check file headers to detect disguised executables (e.g. a .jpg that is actually an .exe)
LAYER 3 — Entropy Analysis: Files with high entropy are likely encrypted/packed malware
LAYER 4 — Binary Signatures: Scan for known malicious byte patterns in executables
LAYER 5 — YARA-lito Patterns: Pattern matching for web shells, backdoors, crypto miners
LAYER 6 — AI Deep Scan: Neural network analysis for zero-day and polymorphic malware
LAYER 7 — Behavioral Analysis: Monitors WHAT THE FILE DOES, not just what it is

MENU OPTIONS:
• Scan Now: Run a full scan on a specific directory
• Scan History: View all scan results and findings
• Quarantine: Isolated malicious files (restorable if false positive)
• Whitelist: Exclude specific files/paths from scanning
• Schedule: Set automatic scan intervals (hourly, daily, weekly)`,
    anim:"threat_scanner" },
  { icon:"📁", title:"File Integrity Monitor", color:"#f97316",
    short:"SHA-256 real-time file change tracking — required for SOC2/PCI-DSS/HIPAA",
    detail:`File Integrity Monitor (FIM) tracks file changes in real-time using SHA-256 hashing.

HOW IT WORKS:
1. On first activation: a baseline snapshot of all monitored files is created
2. Every change (create / modify / delete) is compared against the baseline
3. Unauthorized changes trigger an instant alert

MONITORED PATHS (default):
• /etc — system configuration
• /var/www — web server files
• Custom paths can be added in Settings

WHAT IS DETECTED:
• New unexpected files
• Modifications to critical configuration files
• Deletion of important files
• Web shells injected into web folders

COMPLIANCE: Required for SOC 2 Type II, PCI-DSS, HIPAA, ISO 27001

ACTIONS:
• View diff: see exactly what changed
• Acknowledge: mark as authorized (update baseline)
• Alert: mark as unauthorized → create incident`,
    anim:"fim" },
  { icon:"⚙️", title:"Process Monitor", color:"#8b5cf6",
    short:"Detect unauthorized processes, privilege escalation, crypto miners, reverse shells",
    detail:`Process Monitor displays all running processes with a parent-child hierarchy.

WHAT IT DISPLAYS:
• All active processes: PID, name, user, CPU, memory, start time
• Parent-child process tree: see which process spawned which
• Network connections per process
• Files opened by each process

AUTOMATICALLY DETECTED:
• Unauthorized executables: programs not on the whitelist
• Privilege escalation: regular process that obtained root access
• Cryptocurrency miners: processes with high CPU usage connecting to mining pools
• Reverse shells: bash/sh connected to an external IP
• Memory injection: process injecting into another process's memory

ACTIONS PER PROCESS:
• Kill: terminate the process immediately
• Auto-kill rule: set a rule to auto-kill if this pattern appears again
• Whitelist: mark as trusted for the future
• Forensic capture: take a memory dump before killing`,
    anim:"process_monitor" },
  { icon:"🌐", title:"Network Monitor", color:"#06b6d4",
    short:"All connections inbound/outbound, DNS logging, C2 blocking, data exfiltration detection",
    detail:`Network Monitor watches all inbound and outbound network connections in real-time.

WHAT IT DISPLAYS:
• Active connections: source IP, destination IP, port, protocol, process
• Per-connection and total bandwidth
• IP reputation score (threat intelligence database)
• Geographic origin of each connection

WHAT IS DETECTED:
• Port scans: many connections to different ports from one IP
• C2 (Command & Control): connections to known malicious domains or IPs
• Data exfiltration: large uploads to unknown external IPs
• Brute force: many failed login attempts from one IP

DNS LOGGING:
• All DNS queries are recorded
• Blocked: malicious domains are blocked before the connection is made
• DGA detection: domains that appear algorithmically generated (a malware signature)

ACTIONS:
• Block IP: immediately add to firewall blocklist
• Whitelist: mark as trusted
• Rate limit: cap connection speed
• Kill connection: immediately terminate an active connection`,
    anim:"network_monitor" },
  { icon:"🔒", title:"DNS Monitor", color:"#0891b2",
    short:"DNS tunneling, poisoning prevention, malicious domain blocking, DGA detection",
    detail:`DNS Monitor provides a defense layer at the domain name resolution level.

KEY FEATURES:
• DNS Query Log: all DNS queries from all processes on the server
• Real-time blocking: queries to malicious domains are blocked before a connection is made
• Response validation: detects whether a DNS response has been forged (DNS poisoning)

THREATS BLOCKED:
• Malware C2 domains: domains used by malware for command-and-control
• Phishing domains: domains impersonating legitimate sites
• DGA domains: algorithmically generated domains (a malware signature)

DNS TUNNELING DETECTION:
DNS tunneling is a technique where attackers use DNS queries to exfiltrate data.
Guardian detects it via: abnormal subdomain length, high query frequency, and high entropy in subdomain names.

ALLOWLIST & BLOCKLIST:
• Custom blocklist: add specific domains you want blocked
• Allowlist: domains always allowed, even if on a threat list
• Category blocking: block entire categories (malware, phishing, ads)`,
    anim:"dns_monitor" },
  { icon:"🦠", title:"Quarantine", color:"#dc2626",
    short:"Malicious files isolated, restorable if false positive, forensic retention",
    detail:`Quarantine is an isolated storage area for detected malicious files.

HOW IT WORKS:
1. Malicious file is copied to /guardian/quarantine (separate path, non-executable)
2. Original file is deleted or replaced with a placeholder
3. Guardian stores metadata: hash, original path, quarantine reason, timestamp

WHAT YOU CAN DO:
• View Details: see full information about the file
  - SHA-256 hash
  - Detected threat type
  - Which detection layer (1–7) flagged the file
  - Original file path
• Restore: return file to its original location (if false positive)
  - Automatically adds it to the whitelist
• Delete Permanently: remove file from quarantine storage
• Re-analyze: re-scan with the latest signatures
• Download for Analysis: download in encrypted format for offline forensics

RETENTION: Quarantined files are kept for 90 days (default) then automatically purged.

FALSE POSITIVE MANAGEMENT:
If a legitimate application file is flagged as a threat:
1. Click file at quarantine
2. Click Restore
3. Guardian automatic menambah to whitelist
4. File not will at-scan lagi`,
    anim:"quarantine" },
  { icon:"⚡", title:"Incident Response", color:"#f59e0b",
    short:"Auto workflow: Kill → Block → Quarantine → Alert → Generate forensic report. Under 30 seconds",
    detail:`Incident Response is an automated workflow that executes when a critical threat is detected.

AUTOMATED WORKFLOW (dalam urutan):
1. Kill process: Proses malicious dihentikan sewhen
2. Block IP: IP sumber diblokir at firewall
3. Quarantine file: File malicious diisolasi
4. Alert admin: Notifikasi dikirim via email/Slack/Discord/PagerDuty
5. Forensic report: Laporan detail automatic dibuat

WAKTU TOTAL: Under 30 seconds from deteksi to resolusi

KONFIGURASI WORKFLOW:
• Select step mana that aktif (can non-aktifkan beberapa)
• Set threshold: severity berapa that trigger automated response
• Approval mode: beberapa step minta konfirmasi admin dulu
• Escalation: if admin not response dalam X menit, eskalasi to level berikutnya

FORENSIC REPORT BERISI:
• Complete attack timeline
• Semua proses, file, and koneksi that terlibat
• Screenshots status sistem saat insiden
• Rekomendasi remediation
• Format: PDF + JSON for SIEM integration

MANUAL INCIDENT:
Bisa also buat incident manual if menemukan sesuatu that mencurigwill in a manual.`,
    anim:"incident_response" },
  { icon:"🖥️", title:"Node Management", color:"#0284c7",
    short:"Multi-server dashboard. Deploy guardian-node at every server. License tier = max nodes",
    detail:`Node Management is the dashboard for managing all servers protected by Guardian.

CARA KERJA MULTI-NODE:
• 1 Guardian Core = otak pusat (database, API, dashboard)
• N Guardian Nodes = agent ringan at every server that ingin dilindungi
• Node kirim data scan to Core every interval that dikonfigurasi

YANG DITAMPILKAN PER NODE:
• Name: nama server (can at-rename)
• IP Address
• OS & Version
• Status: Online/Offline/Degraded
• Last Heartbeat: kapan terakhir node melapor to core
• Threat Count: total threats found on this node
• Scan Coverage: berapa % filesystem that at-cover

DEPLOY NODE BARU:
1. Di server baru, jalankan docker that sama (guardian-engine:latest)
2. Set env: GUARDIAN_CORE_URL=http://CORE_IP:8080
3. Set env: GUARDIAN_DB_URL=... (sama with core)
4. Node automatic mendaftar to Core dalam 60 detik

LICENSE LIMITS:
• Sentinel: 1 node
• Pro: 20 nodes
• Business: 100 nodes
• Enterprise: 1,000 nodes

ACTIONS:
• Restart Node: restart guardian agent at server tersebut
• Force Scan: run a full scan immediately
• Deregister: hapus node from dashboard`,
    anim:"node_management" },
  { icon:"📋", title:"Compliance Reports", color:"#16a34a",
    short:"One-click: SOC2, ISO27001, HIPAA, PCI-DSS, GDPR reports — siap for audit",
    detail:`Compliance Reports generate laporan kepatuhan standar industri in a automatic.

STANDAR YANG DIDUKUNG:
• SOC 2 Type II
• ISO 27001
• HIPAA
• PCI-DSS
• GDPR

KONTEN SETIAP LAPORAN:
• Access log: siapa mengakses apa and kapan
• Incident history: all security incidents and their resolutions
• Scan results: hasil all scan dalam periode
• File integrity baselines: perubahan file that terdokumentasi
• Network activity summary
• Remediation actions that telah diambil

FORMAT OUTPUT:
• PDF: for kirim to auditor
• JSON/CSV: for SIEM or tool analitik
• API: pull data laporan via API

PERIODE LAPORAN:
• Select rentang tanggal custom
• Preset: 30 hari, 90 hari, 1 tahun
• Scheduled: generate automatic bulanan/tahunan

CATATAN: Laporan this menyediwill data teknis for kepatuhan. Untuk sertifikasi resmi, tetap need auditor tersertifikasi.`,
    anim:"compliance" },
  { icon:"🤖", title:"AI Analyst Chat", color:"#7c3aed",
    short:"BYOK AI assistant: ask 'What happened at 3 AM?', AI has full security context",
    detail:`AI Analyst Chat is a BYOK AI assistant with full access to your server security data.

HOW BYOK WORKS:
• Guardian does NOT send your data to AXTO servers
• Your AI key (entered in guardian.yml) is used directly on your server
• Security data is processed entirely within your own infrastructure
• Total privacy: no third-party cloud processing

EXAMPLE QUESTIONS:
• "What happened at 3 AM?"
• "Show all failed SSH logins this week"
• "Has any new malware been detected?"
• "Create an incident summary for this month for the executive report"
• "Which files are modified most frequently?"
• "Analyze the attack pattern from this IP"

AI CONTEXT AVAILABLE:
• All security logs (real-time and historical)
• All scan results
• All incident reports
• Network activity
• File change history

SUPPORTED PROVIDERS:
• OpenAI GPT-4o / GPT-4o-mini
• Anthropic Claude
• Google Gemini
• Groq (faster and cheaper for many tasks)
• Ollama (local GPU, 100% offline)`,
    anim:"ai_chat" },
  { icon:"⚙️", title:"Settings", color:"#475569",
    short:"Scan intervals, alert channels, AI keys, mTLS, log retention, access control",
    detail:`Settings is the central configuration hub for all aspects of Guardian AI.

SCAN SETTINGS:
• Scan interval: how often automatic scans run (default: every 5 minutes)
• Scan paths: directories to monitor (add / remove)
• Exclusion list: files or folders that should not be scanned
• Scan mode: quick / full / custom

ALERT CHANNELS:
• Email: address for security notifications
• Slack webhook: send alerts to a Slack channel
• Discord webhook: send alerts to a Discord channel
• PagerDuty: integration for on-call escalation
• Custom webhook: any HTTP endpoint

AI CONFIGURATION (BYOK):
• Provider: choose OpenAI / Claude / Gemini / Groq / Ollama
• API key: enter your key (stored encrypted on your server, never sent to AXTO)
• Model: select the model used by the AI Analyst
• Fallback: secondary provider if the primary is unavailable

SECURITY SETTINGS:
• mTLS: mutual TLS for encrypted node ↔ core communication
• API token rotation: rotate tokens on a schedule
• Access control: who can access the dashboard
• 2FA: enforce two-factor authentication for dashboard login

LOG RETENTION:
• Default: 90 days
• Old logs are automatically deleted
• Export logs before deletion if needed`,
    anim:"guardian_settings" },
];

// ─── Orchestra menus ────────────────────────────────────────────────────────
const ORCHESTRA_MENUS = [
  { icon:"📊", title:"Console Dashboard", color:"#0d9488",
    short:"Active workers, queue depth, requests/min, cost today, provider health, P50/P95 latency",
    detail:`The Console Dashboard is the command center for your AI workload orchestration.

ACCESS: http://YOUR_SERVER:8080/console (login with the Console Password set in the Settings UI)

REAL-TIME METRICS:
• Active Workers: how many CPU+GPU workers are currently running
• Queue Depth: how many requests are waiting to be processed
• Requests/min: current processing throughput
• Cost Today: total AI API spend for today (USD)
• Provider Health: status of all configured providers
• Latency P50/P95: median and 95th percentile response time

CHARTS:
• Request volume (last 24 hours)
• Cost per provider (side-by-side comparison)
• Queue depth trend
• Worker utilization

STATUS INDICATORS:
• 🟢 All workers active and healthy
• 🟡 Degraded: some workers offline or queue is high
• 🔴 Critical: all workers offline or budget limit exceeded

QUICK ACTIONS:
• Scale up workers: add a CPU worker with one click
• Pause queue: temporarily stop processing
• Clear queue: remove all pending requests
• Export metrics: download as CSV`,
    anim:"orchestra_dashboard" },
  { icon:"🔌", title:"AI Providers", color:"#0284c7",
    short:"OpenAI, Claude, Gemthis, Groq, DeepSeek, Ollama, any OpenAI-compatible API",
    detail:`AI Providers is the configuration panel for all AI providers used by Orchestra for routing.

SUPPORTED PROVIDERS:
• OpenAI: GPT-4o, GPT-4o-mini, o1, and more
• Anthropic Claude: Claude 3.5 Sonnet, Haiku, Opus
• Google Gemini: Gemini 1.5 Pro, Flash
• Groq: Llama, Mixtral (very fast inference)
• DeepSeek: DeepSeek V2, R1 (very cost-effective)
• Mistral AI: Mistral Large, Small
• Ollama: local models on your own GPU (free!)
• Any OpenAI-compatible: any custom endpoint

PER-PROVIDER INFO:
• Status: Online / Offline / Degraded
• Current latency: in milliseconds
• Cost/1K tokens: price per request
• Error rate: % of failed requests
• Rate limit remaining: remaining API quota

CONFIGURATION:
• Add new provider: enter API key + base URL
• Temporarily disable: pause a provider without deleting its configuration
• Set priority: which provider is preferred in routing decisions
• Cost cap: automatically stop using a provider if its spend exceeds a limit

BYOK PRINCIPLE: All API keys are stored on your server. Orchestra never sees your keys.`,
    anim:"ai_providers" },
  { icon:"🎯", title:"Routing Strategies", color:"#7c3aed",
    short:"6 mode: cost_first, quality_first, smart_balance, round_robin, local_first, failover",
    detail:`Routing Strategies determine how Orchestra selects a provider for every request.

6 ROUTING MODES:

1. COST FIRST (default):
   → Always picks the cheapest online provider
   → Best for: batch processing, non-urgent tasks
   → Example: DeepSeek is often selected (very low cost)

2. QUALITY FIRST:
   → Selects the provider with the highest-ranked model (GPT-4o or Claude Opus)
   → Best for: critical tasks that demand the best possible output
   → More expensive, but highest quality

3. SMART BALANCE (recommended):
   → Scoring: cost × quality × latency combined
   → Orchestra calculates the optimal choice automatically
   → Adapts in real-time based on live performance data

4. ROUND ROBIN:
   → Distributes requests evenly across all active providers
   → Best for: rate limit management
   → All providers receive an equal share of load

5. LOCAL FIRST:
   → Prioritizes your local GPU (Ollama) first
   → Falls back to cloud providers if the GPU is full or offline
   → Free for all requests your local GPU can handle

6. FAILOVER:
   → Primary provider → if it fails → secondary → tertiary
   → Best for: high availability when you cannot tolerate downtime
   → Failover order is set manually

PER-REQUEST OVERRIDE:
You can override the routing strategy per request using the X-Orchestra-Routing header`,
    anim:"routing" },
  { icon:"💻", title:"Workers (CPU)", color:"#2563eb",
    short:"Cloud API workers — config: provider, model, concurrency. Auto-scale on queue depth",
    detail:`CPU Workers are processes that handle requests to cloud AI providers (OpenAI, Claude, etc.).

HOW IT WORKS:
• Each CPU worker = one concurrent connection to a provider
• A worker picks a job from the queue, sends it to the provider, and returns the result
• Multiple workers run in parallel for high throughput

PER-WORKER CONFIGURATION:
• Provider: OpenAI / Claude / Gemini / Groq / etc.
• Model: specific model to use (gpt-4o-mini, claude-haiku, etc.)
• Concurrency: how many parallel requests per worker (default: 5)
• Rate limit: maximum requests/minute to this provider

DEPLOYING A NEW WORKER:
In docker-compose.yml, duplicate the worker-cpu service:
  worker-cpu-2:
    image: axto/orchestra-worker-cpu:TAG  # included in the downloaded ZIP
    environment:
      - WORKER_PROVIDER=groq  # different provider
      - WORKER_CONCURRENCY=10

MONITORING:
• Worker health: Online / Offline / Error
• Request count: total requests processed
• Error rate: % that failed
• Current queue assignment: which jobs are being processed

AUTOSCALER:
When queue depth exceeds the threshold, the autoscaler adds workers automatically (configure in Settings)`,
    anim:"cpu_workers" },
  { icon:"🎮", title:"Workers (GPU)", color:"#7c3aed",
    short:"Local inference via Ollama/vLLM. NVIDIA GPU + nvidia-docker. WORKER_IDLE_SHUTDOWN",
    detail:`GPU Workers menjalankan inferensi model lokal menggunwill GPU your own — gratis, privat, offline.

KEBUTUHAN:
• NVIDIA GPU (minimal 8GB VRAM for Llama-3 8B)
• nvidia-docker (NVIDIA Container Toolkit) terinstall
• Docker with runtime: nvidia

HOW IT WORKS:
• GPU Worker menggunwill Ollama or vLLM for inferensi lokal
• Model LLM berjalan sepenuhnya on your server
• Zero cost per token — only bayar listrik
• 100% private — data not keluar from server

MODEL YANG BISA DIJALANKAN:
• Llama 3.2 (1B, 3B, 8B, 70B)
• Mistral 7B
• Gemma 2 (9B, 27B)
• DeepSeek R1 (lokal)
• Qwen 2.5
• Dan ratusan model from Ollama hub

KONFIGURASI docker-compose.yml:
  worker-gpu:
    runtime: nvidia
    environment:
      - WORKER_MODEL=llama3.2  (nama model at Ollama)
      - OLLAMA_BASE_URL=http://localhost:11434
      - WORKER_IDLE_SHUTDOWN=300  (mati automatic setelah 5 menit idle)

WORKER_IDLE_SHUTDOWN:
• 0 = worker selalu menyala (konsumsi GPU terus)
• 300 = mati automatic setelah 5 menit not ada request (hemat listrik)
• Worker restart automatic when ada request baru`,
    anim:"gpu_workers" },
  { icon:"📋", title:"Job Queue", color:"#f97316",
    short:"Priority tiers: urgent/normal/batch. Retry, timeout, dead letter queue",
    detail:`The Job Queue is a prioritized queue of all AI requests waiting to be processed.

HOW IT WORKS:
• Setiap request that masuk to Orchestra masuk to queue dulu
• Workers mengambil job from queue sesuai prioritas
• Jika all worker sibuk, request menunggu at queue (not at-reject)

PRIORITY TIERS:
• URGENT: proses pertama, skip antrian (for request real-time user)
• NORMAL (default): antrian FIFO biasa
• BATCH: proses terakhir, setelah urgent and normal selesai

CARA SET PRIORITY:
Request header: X-Orchestra-Priority: urgent | normal | batch

RETRY POLICY:
• Max retries: berapa kali retry if gagal (default: 3)
• Retry delay: tunggu berapa detik senot yet retry
• Jika all retry gagal: masuk Dead Letter Queue

TIMEOUT:
• Request timeout: berapa lama tunggu respons provider
• Queue timeout: hapus job if terlalu lama at queue

DEAD LETTER QUEUE (DLQ):
• Job that gagal setelah all retry masuk DLQ
• Review DLQ at dashboard
• Bisa retry manual or hapus

MONITORING:
• Queue depth: how many jobs are waiting now
• Average wait time: rata-rata lama menunggu
• Processing time: rata-rata lama diproses
• DLQ size: berapa job that gagal`,
    anim:"job_queue" },
  { icon:"💰", title:"Cost Analytics", color:"#16a34a",
    short:"Per provider/model/day: tokens, cost USD, latency. CSV export. Daily budget cap",
    detail:`Cost Analytics memberikan visibilitas penuh atas biaya AI that dikeluarkan.

BREAKDOWN BIAYA:
• Per provider: OpenAI vs Claude vs Gemthis vs Groq
• Per model: gpt-4o vs gpt-4o-mthis vs claude-haiku
• Per hari/minggu/bulan
• Per aplikasi (if pakai multiple app with API key berbeda)

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
• Saving opportunities: berapa that can dihemat with routing more baik

DAILY BUDGET CAP:
Di Console → Settings or orchestra.yml:
  budget:
    daily_limit_usd: 50    # hard stop at $50/hari
    alert_at_percent: 80   # alert at $40 (80%)

Ketika limit tercapai: Orchestra reject request baru sampai hari berikutnya (midnight UTC)

EXPORT:
• CSV: download data for analitik sendiri
• JSON API: pull data cost via API for integrasi billing internal`,
    anim:"cost_analytics" },
  { icon:"📈", title:"Autoscaler", color:"#0891b2",
    short:"Auto-scale workers berdasarkan queue depth, max workers, scale-down delay",
    detail:`Autoscaler in a automatic menambah and mengurangi workers berdasarkan beban.

HOW IT WORKS:
• Monitor queue depth every 10 detik
• Jika queue > threshold: tambah worker baru
• Jika queue kosong > delay: hapus worker idle (hemat resource/cost)

KONFIGURASI (via Settings UI or orchestra.yml):
  autoscaler:
    enabled: true
    threshold: 20        # tambah worker if queue > 20 job
    max_cpu_workers: 10  # maksimum 10 CPU workers sekaligus
    max_gpu_workers: 4   # maksimum 4 GPU workers
    scale_down_delay_seconds: 300  # tunggu 5 menit senot yet scale down

SCALE UP EVENT:
• Queue depth melewati threshold
• Orchestra spawn worker baru from docker image that sama
• Worker baru join pool dalam 30-60 detik

SCALE DOWN EVENT:
• Queue kosong selama more from delay that dikonfigurasi
• Worker at-stop in a graceful (selesaikan job that sedang berjalan dulu)
• GPU workers can pakai WORKER_IDLE_SHUTDOWN that more agresif

LOG AUTOSCALER:
Semua scale up/down events tercatat at log for audit and debugging

MANUAL OVERRIDE:
• Dashboard: tombol "Add Worker" and "Remove Worker"
• Scale up darurat if banyak request masuk tiba-tiba`,
    anim:"autoscaler" },
  { icon:"🔗", title:"API Endpoint", color:"#0284c7",
    short:"OpenAI-compatible endpoint. Drop-in replacement. Streaming, tools, multimodal support",
    detail:`The Orchestra API Endpoint is a drop-in replacement for the OpenAI API.

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
• "groq/llama-3.1-8b": request langsung to Groq with model spesifik
• "local/llama3.2": request to GPU lokal

FEATURES:
• Streaming: Server-Sent Events (SSE)
• Function calling / tools
• Multimodal (vision) if provider mendukung
• Retry automatic if provider gagal`,
    anim:"api_endpoint" },
  { icon:"🔔", title:"Webhooks", color:"#f59e0b",
    short:"Events: job_completed, job_failed, worker_offline, budget_80%, budget_exceeded",
    detail:`Webhooks mengirim notifikasi to sistem you when event penting terjaat.

EVENTS YANG TERSEDIA:
• job_completed: every request selesai diproses
• job_failed: request gagal setelah all retry
• worker_offline: worker not merespons
• budget_80%: penggunaan mencapai 80% from daily limit
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
Via Console → Settings → AI Providers:
  webhooks:
    - url: "https://your-server.com/webhook"
      events: ["job_failed", "worker_offline", "budget_exceeded"]
      secret: "YOUR_WEBHOOK_SECRET"  # for validasi HMAC

VALIDASI WEBHOOK:
Header X-Orchestra-Signature berisi HMAC-SHA256 signature.
Validate at your endpoint for security.

USE CASES:
• Slack/Discord notification saat worker down
• Auto-billing alert saat budget hampir habis
• Log failed jobs to sistem monitoring you (Datadog, Grafana, dll)`,
    anim:"webhooks" },
  { icon:"⚙️", title:"Settings", color:"#475569",
    short:"License key, AI keys BYOK, worker tokens, console password, autoscaler, budget, CORS",
    detail:`Settings is the central configuration hub for Orchestra AI — all changes apply without restart.

LICENSE:
• Tampilkan license key that aktif
• Status: aktif/expired/invalid
• Tanggal expiry
• Tombol refresh validasi

AI KEYS (BYOK):
• Add, ubah, hapus API key provider
• Key tersimpan terenkripsi at database lokal
• TIDAK pernah dikirim to AXTO or pihak ketiga

SECURITY:
• Console password: password for akses /console dashboard
• Worker token: token that dipakai workers for autentikasi to core
• Rotate tokens: change tokens periodically for security
• CORS origins: domain that boleh akses API endpoint

AUTOSCALER CONFIG:
• Enable/disable autoscaler
• Threshold, max workers, scale-down delay (lihat section Autoscaler)

BUDGET:
• Daily limit USD: 0 = not ada limit
• Alert threshold: persen from limit for trigger alert
• Reset timezone: UTC (default) or timezone lokal

LOG SETTINGS:
• Log retention: berapa hari log disimpan (default: 90)
• Log level: info/warn/error
• Export logs: download all log sebagai CSV

CORS:
• Allowed origins: domain that boleh call API from browser
• * = allow all (not aman for production)
• Spesifikkan: https://yourapp.com`,
    anim:"orchestra_settings" },
];

// ─── Antivirus menus ────────────────────────────────────────────────────────
const ANTIVIRUS_SECTIONS = [
  { icon:"🦠", title:"ClamAV Engine", color:"#dc2626",
    short:"ClamAV terintegrasi dalam Guardian. Signature DB auto-update tiap 6 jam",
    detail:`Guardian menggunwill ClamAV sebagai antivirus engine that terintegrasi penuh.

HOW IT WORKS:
• ClamAV berjalan at dalam container guardian-engine (not need install terpisah)
• Signature database (virus definitions) diupdate automatic every 6 jam via freshclam
• Bekerja bersama 7-layer scanner Guardian for deteksi komprehensif

ENABLE VIA Settings or guardian.yml:
  scanner:
    antivirus:
      enabled: true
      engine: clamav
      update_interval: 21600  # 6 jam dalam detik

STATUS DASHBOARD:
• Engine version: versi ClamAV that berjalan
• Signature count: jumlah signature malware that diketahui (biasanya 8+ juta)
• Last update: kapan terakhir signature diupdate
• Scan rate: file per detik that can diproses

COVERAGE:
• Executable files (.exe, .dll, .so, .bin)
• Documents (.pdf, .docx, .xlsx) — for macro malware
• Scripts (.php, .py, .sh, .ps1)
• Archives (.zip, .tar, .gz) — scan isi archive
• Email attachments

KETERBATASAN:
ClamAV very baik for known malware (signature-based).
Untuk zero-day and advanced threats: Guardian AI Deep Scan (Layer 6) and Behavioral Analysis (Layer 7) melengkapi ClamAV.`,
    anim:"clamav" },
  { icon:"📡", title:"Real-time Scan (On-Access)", color:"#f97316",
    short:"Scan automatic every file that dibuat/dimodifikasi — without menunggu schedule",
    detail:`On-Access Scanning is a real-time scan mode that inspects every file as it is created or modified.

HOW IT WORKS:
• Guardian menggunwill Linux inotify/fanotify for monitor perubahan filesystem
• Setiap file baru or that dimodifikasi langsung at-scan senot yet can dieksekusi
• Latency: < 100ms for file kecil, < 2 detik for file besar

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
Ketika file malicious detected:
1. File automatic at-quarantine
2. Alert dikirim via Incident Response workflow
3. Log entry dibuat with detail lengkap

PERFORMANCE IMPACT:
• CPU overhead: ~2-5% tergantung kecepatan write to disk
• Memory: ClamAV engine membutuhkan ~500MB RAM
• Rekomendasi: aktifkan for /var/www and /tmp minimal`,
    anim:"realtime_scan" },
  { icon:"📅", title:"Scheduled Scan", color:"#0891b2",
    short:"Scan penuh terjadwal: harian/mingguan. Lebih dalam from real-time scan",
    detail:`Scheduled Scan is a comprehensive full-system scan that runs on a configured schedule.

PERBEDAAN DENGAN REAL-TIME SCAN:
• On-access: scan file baru/berubah saja (cepat, lightweight)
• Scheduled: scan SEMUA file at path that dikonfigurasi (menyeluruh)

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
• Total file that at-scan
• Threats found (if any)
• Time required
• File that diskip (permission/error)
• Laporan dikirim to alert channels that dikonfigurasi

MANUAL TRIGGER:
Di dashboard: Threat Scanner → Scan Now
Atau via API:
  curl http://localhost:8080/api/scan/start \\
    -H "Authorization: Bearer TOKEN" \\
    -d '{"path":"/var/www","type":"full"}'`,
    anim:"scheduled_scan" },
  { icon:"🔄", title:"Signature Update", color:"#16a34a",
    short:"Auto-update virus signatures tiap 6 jam via freshclam. Manual update tersedia",
    detail:`Signature Update menjaga database virus definitions Guardian selalu terkthis.

PROSES UPDATE OTOMATIS:
• freshclam daemon berjalan at background
• Check server ClamAV for update baru every 6 jam
• Download only delta/diff (bukan full database)
• Database diupdate without restart scanner

STATUS DI DASHBOARD:
• Current signature count: jumlah signature saat this
• Last update: when the last successful update occurred
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
      # Ubah to 3600 (1 jam) for high-risk environment
      # Ubah to 86400 (24 jam) for low-bandwidth server

OFFLINE UPDATE:
Jika server not ada internet:
1. Download database from mesin lain
2. Upload via Guardian API: POST /api/antivirus/upload-db
3. Guardian verifikasi integritas and apply

KOMUNITAS: Guardian menggunwill ClamAV community signatures + custom AXTO signatures for web shell and malware baru.`,
    anim:"sig_update" },
  { icon:"🚫", title:"Quarantine & Remediation", color:"#dc2626",
    short:"Malicious files isolated, threat analysis, false positive restoration, permanent deletion",
    detail:`Antivirus Quarantine terintegrasi with Quarantine utama Guardian — all file malicious masuk to satu tempat.

WORKFLOW WHEN A THREAT IS FOUND:
1. ClamAV / Guardian deteksi file malicious
2. File at-copy to /guardian/quarantine (path terisolasi)
3. File asli dihapus or at-zero (kontennya dihapus tapi metadata dipertahankan)
4. Alert dikirim (email/Slack/Discord sesuai konfigurasi)
5. Incident report dibuat automatic

INFORMASI DI QUARANTINE:
• Threat name (ClamAV signature): e.g. "Win.Trojan.Agent-123456"
• Severity: critical/high/medium/low
• File path asli
• Hash SHA-256
• Waktu deteksi
• Detection engine: ClamAV/Guardian Layer/keduanya

TINDAKAN YANG BISA DIAMBIL:

RESTORE (if false positive):
• Click file → Restore to Original Location
• Guardian automatic tambahkan to whitelist
• File not will at-scan lagi
• Catat alasan restore for audit trail

DELETE PERMANENTLY:
• Delete file in a aman (overwrite with zero bytes)
• Tidak can at-undo
• Cocok for file malware that already dipastikan malicious

SUBMIT FOR ANALYSIS:
• Send sample to ClamAV community (anonymous)
• Membantu update signature database global
• Optional, not required

BATCH ACTIONS:
• Select multiple file at quarantine
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
    {icon:"🛒", label:"Select paket", color:"#0284c7"},
    {icon:"💳", label:"Checkout", color:"#7c3aed"},
    {icon:"✅", label:"Payment successful", color:"#16a34a"},
    {icon:"📧", label:"Invoice to email", color:"#f97316"},
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

        {/* ═══════════════════════════════════════════════════════════════
            AXTO LEGAL GUIDE
        ═══════════════════════════════════════════════════════════════ */}
        {section === "legal" && (
          <div style={{maxWidth:900}}>
            <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",borderRadius:16,padding:"28px 32px",marginBottom:24,color:"#fff"}}>
              <h1 style={{fontSize:24,fontWeight:900,margin:"0 0 6px"}}>⚖️ AXTO Legal — Setup &amp; Usage</h1>
              <p style={{margin:0,fontSize:14,opacity:0.85,lineHeight:1.6}}>
                Self-hosted AI legal intelligence. Deploy in minutes, connect your own AI key, then research the law, analyze contracts, and build documents across 195+ jurisdictions — all on your infrastructure.
              </p>
            </div>
            {[
              { step:1, title:"Deploy with Docker", color:"#4338ca",
                desc:"Download legal-core from your client portal and start it with Docker Compose. Runs fully on your own server — no data leaves your network.",
                code:"# 1. Download legal-core.tar.gz + legal-compose.yml from the portal\ndocker load -i legal-core.tar.gz\n\n# 2. Start the service\ndocker compose -f legal-compose.yml up -d\n\n# 3. Open the console\n#    http://YOUR_SERVER:8080" },
              { step:2, title:"Activate Your License", color:"#4338ca",
                desc:"On first run, paste the license key emailed to you (or shown in your client portal). Activation validates once against axto.io, then works offline.",
                code:"# Console → Settings → License\n# Paste your key:  AXTO-LEGAL-XXXX-XXXX-XXXX\n# Click Activate. Done." },
              { step:3, title:"Connect Your AI Key (BYOK)", color:"#0d9488",
                desc:"AXTO Legal is Bring-Your-Own-Key. Use any free provider from the Setup & Deploy page (Groq, Google AI Studio, OpenRouter…), or run a 100% private local model (Ollama) for privileged matters.",
                code:"# Console → Settings → AI Provider\nprovider: groq                 # or ollama for offline/private\napi_key:  \"gsk_your_free_key\"   # stays on your server\nmodel:    \"llama-3.3-70b\"\n\n# Sensitive matter? Use Ollama — nothing leaves your machine:\n#   provider: ollama   model: llama3.1" },
              { step:4, title:"Legal Research", color:"#4338ca",
                desc:"Ask a legal question in plain language. AXTO Legal searches trusted public sources for your jurisdiction and returns a clear summary with verifiable citations.",
                code:"# Console → Research\n> \"What are the notice requirements to terminate\n>  a commercial lease in Indonesia?\"\n\n# Returns: plain-language answer + statute/case citations\n# you can open and verify." },
              { step:5, title:"Contract Intelligence", color:"#4338ca",
                desc:"Upload a contract (PDF/DOCX). AXTO Legal extracts key clauses, flags risks and missing protections, and explains each point in language anyone can understand.",
                code:"# Console → Contracts → Upload\n#  - Key terms & obligations\n#  - Risk flags (one-sided clauses, gaps)\n#  - Suggested redlines\n#  - Plain-language summary" },
              { step:6, title:"Smart Document Builder", color:"#4338ca",
                desc:"Generate agreements, NDAs, letters and filings from guided templates tailored to your jurisdiction, then export to PDF or Word.",
                code:"# Console → Documents → New\n#  1. Pick a template (NDA, service agreement, …)\n#  2. Answer the guided questions\n#  3. Review the AI-drafted document\n#  4. Export → PDF / DOCX" },
              { step:7, title:"Jurisdiction Packs", color:"#4338ca",
                desc:"Enable the country packs included in your license so research and documents follow local law. Legal source connectors are kept up to date.",
                code:"# Console → Settings → Jurisdictions\n# Toggle the country packs your license includes\n# (Starter: 3 · Professional: 20 · Enterprise: 195+)" },
              { step:8, title:"Privacy & Responsible Use", color:"#dc2626",
                desc:"Everything is self-hosted. For confidential or privileged work, prefer a local model. AXTO Legal is an assistive tool — always have important matters reviewed by a licensed lawyer in your jurisdiction.",
                code:"# Best practice for privileged matters:\n#  • Use a local model (Ollama / vLLM)\n#  • Keep documents on your own storage\n#  • Treat output as a draft, not legal advice" },
            ].map((s,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",marginBottom:16,overflow:"hidden"}}>
                <div style={{padding:"14px 20px",background:`${s.color}12`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:28,height:28,borderRadius:8,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:12}}>{s.step}</div>
                  <span style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>{s.title}</span>
                  <span style={{marginLeft:"auto",fontSize:11,color:"#94a3b8",fontWeight:600}}>Step {s.step} of 8</span>
                </div>
                <div style={{padding:"16px 20px"}}>
                  <p style={{margin:"0 0 12px",fontSize:13,color:"#64748b",lineHeight:1.7,whiteSpace:"pre-line"}}>{s.desc}</p>
                  <pre style={{margin:0,padding:"14px 16px",background:"#0a1628",fontSize:11,color:"#fde68a",overflow:"auto",lineHeight:1.8,borderRadius:10,fontFamily:"'JetBrains Mono',monospace"}}>{s.code}</pre>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            AI STUDIO GUIDE
        ═══════════════════════════════════════════════════════════════ */}
        {section === "ai-studio" && (
          <div>
            <div style={{background:"linear-gradient(135deg,#1e1030,#2d1b69)",borderRadius:16,padding:"28px 32px",marginBottom:28,color:"#fff"}}>
              <div style={{fontSize:32,marginBottom:10}}>🧠</div>
              <h2 style={{fontSize:26,fontWeight:900,marginBottom:8,letterSpacing:"-0.5px"}}>AI Studio</h2>
              <p style={{color:"#c4b5fd",fontSize:14,margin:0,lineHeight:1.7}}>Self-hosted AI workspace for chat, batch processing, multi-model comparison, and prompt management. Connects to 14+ providers using your own API keys. Port <strong>:8091</strong>.</p>
            </div>
            {[
              {step:1,title:"Purchase & Download",color:"#7c3aed",desc:"Purchase an AXTO Studio license at axto.io. Your license key starts with STUD- — this single license unlocks AI Studio plus GPU Studio and Hybrid Studio depending on your plan tier. Download the package from Portal → Licenses → Download.",code:`# Docker Image\ndocker load < axto-ai-studio-2.0.0.tar.gz\n\n# Windows EXE\n./axto-ai-studio.exe  # Auto-opens browser at localhost:8091`},
              {step:2,title:"Server Requirements",color:"#7c3aed",desc:"Minimum: 1 CPU core, 512 MB RAM, 2 GB disk (for SQLite data). Docker 24+ or Windows 10+. Outbound HTTPS access to AI provider APIs (OpenAI, Anthropic, etc.).",code:`# Docker: check version\ndocker --version  # >= 24.0\n\n# Port 8091 must be available\nnc -zv localhost 8091 || echo "Port free"`},
              {step:3,title:"Configure ai-studio.yml",color:"#7c3aed",desc:"Create your configuration file. Only the license_key is required — all other settings are optional.",code:`# ai-studio.yml\nai_studio:\n  license_key: "STUD-XXXX-XXXX-XXXX-XXXX"\n  host: "0.0.0.0"\n  port: 8091\n  session_retention_days: 30\n  log_retention_days: 90`},
              {step:4,title:"Start with Docker",color:"#7c3aed",desc:"Launch AI Studio. On first start, it initializes the SQLite database and validates your license.",code:`# Docker Compose\ndocker compose -f ai-studio-compose.yml up -d\n\n# Verify running\ndocker compose -f ai-studio-compose.yml ps\n\n# View logs\ndocker compose -f ai-studio-compose.yml logs -f ai-studio`},
              {step:5,title:"Start as Windows EXE",color:"#7c3aed",desc:"Double-click axto-ai-studio.exe — it opens your browser automatically at http://localhost:8091. Place ai-studio.yml in the same folder.",code:`# Folder structure:\n# axto-ai-studio.exe\n# ai-studio.yml          ← your config\n# data/studio.db         ← auto-created\n# logs/                  ← auto-created`},
              {step:6,title:"Health Check",color:"#7c3aed",desc:"Verify the service is running and license is active.",code:`curl http://localhost:8091/health\n{\n  "status": "healthy",\n  "product": "ai-studio",\n  "license": { "valid": true, "plan": "enterprise" }\n}`},
              {step:7,title:"Add Your First API Key",color:"#7c3aed",desc:"Dashboard → API Keys sidebar → click '+ Add API Key' button.\n\n① Select Provider (e.g. OpenAI)\n② Enter your API key (sk-...)\n③ Click 'Save & Verify' — green ✓ confirms the key works\n\nSupported: OpenAI, Anthropic, Google Gemini, Groq, Mistral, DeepSeek, xAI Grok, Cohere, Together AI, Fireworks, Perplexity, Ollama (local), LM Studio, Orchestra, Custom endpoints.",code:`# Example via API:\ncurl -X POST http://localhost:8091/api/credentials \\\n  -H "Content-Type: application/json" \\\n  -d '{"action":"add","provider":"openai","label":"My OpenAI","api_key":"sk-..."}'`},
              {step:8,title:"AI Chat — Every Button Explained",color:"#7c3aed",desc:"The main chat interface. Toolbar from left to right:\n\n• API Key dropdown — select which key/provider to use\n• Model dropdown — lists all available models for that provider, grouped by tier (flagship, reasoning, fast)\n• ⚙ Settings — opens the settings panel (temperature, max tokens, system prompt)\n• ✦ New Chat — starts a fresh session\n• ↓ Export — downloads current chat as .txt\n• 🗑 Clear — clears the current chat\n\nSending messages:\n• Press Enter to send (Shift+Enter for new line)\n• Each message shows: model name, latency, cost, token count\n• All sessions auto-saved for 30 days",code:`# Retrieve all sessions:\ncurl -X POST http://localhost:8091/api/sessions \\\n  -d '{"action":"list"}'\n\n# Get a specific session:\ncurl -X POST http://localhost:8091/api/sessions \\\n  -d '{"action":"get","id":"SESSION_ID"}'`},
              {step:9,title:"Model Comparison",color:"#7c3aed",desc:"Compare Models page — test the same prompt across multiple AI models simultaneously.\n\n① Enter System Prompt (optional)\n② Enter your User Prompt\n③ Click '+ Add Model' to add models\n④ For each slot: select API Key + Model\n⑤ Click '▶ Run Comparison'\n\nResults appear side-by-side with latency, cost, and token count per model. Maximum 6 models at once.",code:`# Via API:\ncurl -X POST http://localhost:8091/api/compare \\\n  -d '{"prompt":"Explain quantum computing","targets":[{"credential_id":"ID1","model":"gpt-4o","label":"GPT-4o"},{"credential_id":"ID2","model":"claude-sonnet-4-20250514","label":"Claude"}]}'`},
              {step:10,title:"Batch Processing",color:"#7c3aed",desc:"Batch Processing page — run one prompt template against many inputs automatically.\n\n① Select API Key and Model\n② Enter System Prompt (optional)\n③ Enter inputs — one per line (each becomes a separate AI request)\n④ Click '⚡ Start Batch Job'\n⑤ Switch to 'My Jobs' tab to monitor progress\n⑥ Click 'Results' when done to see all outputs\n⑦ Click '⬇ Export CSV' to download all results\n\nBatches run in the background — you can navigate away.",code:`# Create batch via API:\ncurl -X POST http://localhost:8091/api/batch \\\n  -d '{"action":"create","credential_id":"ID","model":"gpt-4o-mini","inputs":["Prompt 1","Prompt 2"],"title":"My Batch"}'`},
              {step:11,title:"Prompt Library",color:"#7c3aed",desc:"Prompt Library page — save and reuse your best prompts.\n\n① Click '+ Save Prompt' button\n② Enter Title, Category, and Prompt content (use {variable} for dynamic values)\n③ Click 'Save Prompt'\n\nTo use a saved prompt:\n① Click on any prompt card → loads into chat input\n② Star (⭐) icon → marks as favorite\n③ ✕ button → deletes prompt\n\nFilter by category using the dropdown. Search by keyword.",code:`# Save prompt via API:\ncurl -X POST http://localhost:8091/api/prompts \\\n  -d '{"action":"add","title":"Email Writer","content":"Write a professional email about {topic}.","category":"writing"}'`},
              {step:12,title:"Analytics Dashboard",color:"#7c3aed",desc:"Analytics page — monitor your AI usage and costs.\n\n• Top KPIs: requests today, cost today, monthly total, monthly cost\n• Daily Cost chart — 30-day cost trend per day\n• Top Providers — cost breakdown by provider this month\n• Today Detail table — per model breakdown\n\nAll analytics data is local — stored in your SQLite database.",code:`# Fetch usage data:\ncurl http://localhost:8091/api/usage\n\n# Full status:\ncurl http://localhost:8091/api/status`},
              {step:13,title:"WebSocket Streaming",color:"#7c3aed",desc:"AI Studio supports WebSocket for real-time chat streaming. Connect to ws://localhost:8091/ws/chat — send a JSON message and receive streaming chunks.",code:`# WebSocket example (JavaScript):\nconst ws = new WebSocket('ws://localhost:8091/ws/chat');\nws.onopen = () => ws.send(JSON.stringify({\n  credential_id: "CRED_ID",\n  model: "gpt-4o-mini",\n  messages: [{ role: "user", content: "Hello!" }]\n}));\nws.onmessage = (e) => {\n  const d = JSON.parse(e.data);\n  if (d.type === "done") console.log(d.content);\n};`},
              {step:14,title:"Troubleshooting",color:"#7c3aed",desc:"Common issues and solutions:\n\n• 'License invalid' → check ai-studio.yml license_key starts with STUD- (your AXTO Studio license) and that your plan includes the AI Studio module\n• 'Credential not found' → re-add your API key\n• 'Chat error 502' → API key is invalid or expired with the provider\n• 'Session not loading' → clear browser cache\n• EXE won't start → ensure ai-studio.yml is in the same folder as the EXE\n• Port 8091 in use → change port in ai-studio.yml",code:`# Check logs:\ndocker compose -f ai-studio-compose.yml logs ai-studio\n\n# Reset database (caution: deletes all data):\ndocker compose -f ai-studio-compose.yml down -v\ndocker compose -f ai-studio-compose.yml up -d`},
            ].map((s,i)=>(<div key={i} style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",marginBottom:16,overflow:"hidden"}}><div style={{padding:"14px 20px",background:`${s.color}12`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}><div style={{width:28,height:28,borderRadius:8,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:12}}>{s.step}</div><span style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>{s.title}</span><span style={{marginLeft:"auto",fontSize:11,color:"#94a3b8",fontWeight:600}}>Step {s.step} of 14</span></div><div style={{padding:"16px 20px"}}><p style={{margin:"0 0 12px",fontSize:13,color:"#64748b",lineHeight:1.7,whiteSpace:"pre-line"}}>{s.desc}</p><pre style={{margin:0,padding:"14px 16px",background:"#0a1628",fontSize:11,color:"#fde68a",overflow:"auto",lineHeight:1.8,borderRadius:10,fontFamily:"'JetBrains Mono',monospace"}}>{s.code}</pre></div></div>))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            GPU STUDIO GUIDE
        ═══════════════════════════════════════════════════════════════ */}
        {section === "gpu-studio" && (
          <div>
            <div style={{background:"linear-gradient(135deg,#1a0e00,#3d2200)",borderRadius:16,padding:"28px 32px",marginBottom:28,color:"#fff"}}>
              <div style={{fontSize:32,marginBottom:10}}>🎨</div>
              <h2 style={{fontSize:26,fontWeight:900,marginBottom:8,letterSpacing:"-0.5px"}}>GPU Studio</h2>
              <p style={{color:"#fbbf24",fontSize:14,margin:0,lineHeight:1.7}}>Self-hosted creative AI workspace for image and video generation. Connects to Stability AI, Replicate, Fal.ai, ComfyUI, Automatic1111, and any custom GPU endpoint. Port <strong>:8092</strong>.</p>
            </div>
            {[
              {step:1,title:"Purchase & Download",color:"#d97706",desc:"Purchase an AXTO Studio license at axto.io. Your license key starts with STUD- — this single license unlocks GPU Studio plus AI Studio and (on Professional/Enterprise plans) Hybrid Studio. Download from Portal → Licenses → Download.",code:`# Docker Image\ndocker load < axto-gpu-studio-2.0.0.tar.gz\n\n# Windows EXE  \n./axto-gpu-studio.exe  # Opens browser at localhost:8092`},
              {step:2,title:"Server Requirements",color:"#d97706",desc:"GPU Studio itself is lightweight — it calls external GPU endpoints, not running inference locally.\nMinimum: 1 CPU core, 256 MB RAM. Docker 24+ or Windows 10+. Outbound HTTPS to GPU API providers.",code:`# Port 8092 must be available\nnc -zv localhost 8092 || echo "Port free"\n\n# For local ComfyUI/A1111 access:\n# ComfyUI must be running at localhost:8188\n# A1111 must be running at localhost:7860`},
              {step:3,title:"Configure gpu-studio.yml",color:"#d97706",desc:"Create your configuration file.",code:`# gpu-studio.yml\ngpu_studio:\n  license_key: "STUD-XXXX-XXXX-XXXX-XXXX"\n  host: "0.0.0.0"\n  port: 8092\n  session_retention_days: 30`},
              {step:4,title:"Start Service",color:"#d97706",desc:"Launch GPU Studio via Docker or EXE.",code:`# Docker Compose\ndocker compose -f gpu-studio-compose.yml up -d\ndocker compose -f gpu-studio-compose.yml logs -f gpu-studio\n\n# Health check\ncurl http://localhost:8092/health`},
              {step:5,title:"Add Your First Endpoint",color:"#d97706",desc:"Dashboard → GPU Endpoints (sidebar) → click '+ Add Endpoint'.\n\n① Select Provider:\n   • Stability AI → paste your stability.ai API key\n   • Replicate → paste your replicate.com API key\n   • Fal.ai → paste your fal.ai API key\n   • Together AI → paste your together.xyz API key\n   • OpenAI DALL·E → paste your OpenAI key\n   • ComfyUI → set URL to http://localhost:8188\n   • Automatic1111 → set URL to http://localhost:7860\n   • Custom → enter your endpoint URL\n② Enter Label (e.g. 'Production Fal.ai')\n③ Click 'Add & Verify'\n\nGreen ✓ = endpoint reachable. API providers show 'configured'.",code:`# Add via API:\ncurl -X POST http://localhost:8092/api/endpoints \\\n  -d '{"action":"add","provider":"fal","label":"Fal.ai","api_key":"fal-key"}'`},
              {step:6,title:"Generate Images — Every Control Explained",color:"#d97706",desc:"Generate page (default view).\n\nLeft panel controls:\n• Endpoint dropdown — select your connected GPU endpoint\n• Job Type buttons:\n  🖼 Image — standard text-to-image\n  🎬 Video — text-to-video generation\n  🔍 Upscale — upscale an existing image\n• Model dropdown — models available for the selected endpoint\n• Prompt field — describe the image in detail\n• Negative Prompt — what to exclude\n• Quick Style Tags — click to append style keywords\n• Style Preset grid — Cinematic, Anime, Photo, Oil Paint, Sci-Fi, Minimal\n• Aspect Ratio — 1:1, 16:9, 9:16, 4:3, 3:4\n• Steps slider — inference steps (more = better quality, slower)\n• CFG Scale — guidance scale (higher = follows prompt more strictly)\n• Batch Size — number of images per generation\n• Seed — set for reproducible results, -1 for random\n\nClick '✦ Generate Images' to start.",code:`# Generate via API:\ncurl -X POST http://localhost:8092/api/generate \\\n  -d '{"endpoint_id":"EP_ID","prompt":"A sunset over mountains","job_type":"txt2img","model":"fal-ai/flux/schnell","params":{"width":1024,"height":1024,"steps":28}}'`},
              {step:7,title:"Photo Animate Mode",color:"#d97706",desc:"Switch to 👤 Photo Animate mode.\n\n① Upload a portrait photo (JPG/PNG, face clearly visible)\n② Select Animation Type:\n   💬 Talking Head — lip-sync character to audio or text\n   😊 Emotion Drive — add facial expressions\n   🕺 Body Motion — apply motion from reference video\n   🌊 Subtle Alive — add natural micro-movements\n③ For Talking Head: enter text for TTS voice synthesis\n④ Select voice from the Voice for TTS dropdown\n⑤ Click '✦ Generate Animation'\n\nOutput: MP4 video with the animated portrait.",code:`# Photo animate via API:\ncurl -X POST http://localhost:8092/api/generate \\\n  -d '{"endpoint_id":"EP_ID","job_type":"photoanim","model":"fal-ai/lipsync","params":{"animation_type":"talking_head","voice":"alloy"}}'`},
              {step:8,title:"Cartoon & Animation Mode",color:"#d97706",desc:"Click '🎬 Cartoon & Anim' in the top navigation.\n\nCartoon Style: choose from 9 visual styles\n   🏰 Disney 3D, 🤖 Pixar CGI, 🌿 Ghibli, ⚔️ Anime HD,\n   🎨 2D Cartoon, 🐻 Chibi/Cute, 🦸 Comic Book,\n   🧊 Stop Motion, 🌈 Looney Tunes\n\nCharacter Type: Hero, Wizard, Creature, Cute Animal, Superhero, Princess\n\nStoryboard Builder: Add up to 12 frames, click each to select and edit\n\nQuick Templates:\n   🎬 Epic Movie Intro, 🏃 Action Chase, ✨ Magic Transformation,\n   💖 Emotional Close-up, ⚔️ Battle Scene, 🌿 Peaceful Nature\n\nOutput Type: Scene Image, Animated Clip (3-8s), Storyboard Sequence, Character Sheet",code:`# Cartoon generation via API:\ncurl -X POST http://localhost:8092/api/generate \\\n  -d '{"endpoint_id":"EP_ID","job_type":"txt2img","prompt":"Disney 3D hero character","params":{"style":"Disney 3D","width":1024,"height":1024}}'`},
              {step:9,title:"Sound & Music Mode",color:"#d97706",desc:"Click '🔊 Sound & Music' in the top navigation. Three sub-modes:\n\n💥 SFX Tab:\n   • Select category: Cartoon, Impact, Magic, Nature, Sci-Fi, Game, Comedy\n   • Choose a preset SFX or describe your own\n   • Set duration (0.5s – 30s) and output format\n   • Select SFX Engine (ElevenLabs, Stability Audio, AudioCraft)\n   • Click '💥 Generate Sound Effect'\n\n🎵 Music Tab:\n   • Select engine: Suno AI, Udio, MusicGen, Stable Audio\n   • Choose genre: Cartoon Theme, Action/Epic, Emotional, Comedy, Game BGM…\n   • Describe the music in detail\n   • Set duration (15s–3min) and BPM\n   • Click '🎵 Generate Music Track'\n\n🗣 Voice Tab:\n   • Select from 16 language flags\n   • Choose character voice type\n   • Select TTS engine and enter script\n   • Upload voice sample for cloning (optional)\n   • Click '🗣 Generate Voice Audio'",code:`# Sound generation via API:\ncurl -X POST http://localhost:8092/api/generate \\\n  -d '{"endpoint_id":"EP_ID","job_type":"sfx","params":{"engine":"elevenlabs","description":"Cartoon whoosh sound","duration":1.5}}'`},
              {step:10,title:"Gallery",color:"#d97706",desc:"Gallery page — browse all your generated images and videos.\n\n• Filter by folder using the dropdown\n• Check 'Favorites only' to show starred items\n• Filter by type: Images or Videos\n• Hover over any image to see prompt and action buttons\n• ⭐ — toggle favorite\n• ⬇ — download image\n• ✕ — delete from gallery\n• Click image to open fullscreen lightbox\n\nImages are stored in your local database. Gallery clears automatically after 30 days.",code:`# List gallery via API:\ncurl -X POST http://localhost:8092/api/gallery \\\n  -d '{"action":"list","favorites_only":false,"limit":60}'`},
              {step:11,title:"Style Presets",color:"#d97706",desc:"Style Presets page — save reusable generation settings.\n\n① Click '+ Save Preset'\n② Enter: Name, Category, Prompt Prefix, Prompt Suffix, Negative Prompt\n③ Click 'Save Preset'\n\nTo use: click 'Use Preset' on any preset card — it loads the prefix into the Generate prompt field.\n\nPreset categories: photography, illustration, concept-art, anime, product, landscape, portrait, abstract",code:`# Save preset via API:\ncurl -X POST http://localhost:8092/api/presets \\\n  -d '{"action":"add","title":"Cinematic","prompt_prefix":"cinematic 8K photography,","negative_prompt":"blurry, low quality"}'`},
              {step:12,title:"Batch Generation",color:"#d97706",desc:"Batch Generate page — generate many images from a list of prompts.\n\n① Select Endpoint, Model, Job Type\n② Set Width, Height, base parameters\n③ Enter prompts — one per line\n④ Click '⚡ Start Batch Generation'\n⑤ Switch to 'My Jobs' tab to monitor\n⑥ Click 'Results' to view all generated images in a grid",code:`# Create batch via API:\ncurl -X POST http://localhost:8092/api/batch \\\n  -d '{"action":"create","endpoint_id":"EP_ID","job_type":"txt2img","model":"fal-ai/flux/schnell","prompts":["A red sunset","A blue ocean"],"base_params":{"width":512,"height":512}}'`},
              {step:13,title:"Troubleshooting",color:"#d97706",desc:"Common GPU Studio issues:\n\n• 'Endpoint not found' → re-add your endpoint in the Endpoints section\n• 'Generation error 502' → API key invalid or quota exceeded\n• ComfyUI not connecting → verify ComfyUI is running at localhost:8188\n• A1111 not connecting → verify A1111 server is running (--api flag required)\n• 'No output' after generation → check endpoint logs for model errors\n• Port 8092 in use → change port in gpu-studio.yml",code:`# Check GPU Studio logs:\ndocker compose -f gpu-studio-compose.yml logs gpu-studio\n\n# Test ComfyUI endpoint:\ncurl http://localhost:8188/system_stats\n\n# Test A1111 endpoint:\ncurl http://localhost:7860/sdapi/v1/progress`},
            ].map((s,i)=>(<div key={i} style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",marginBottom:16,overflow:"hidden"}}><div style={{padding:"14px 20px",background:`${s.color}12`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}><div style={{width:28,height:28,borderRadius:8,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:12}}>{s.step}</div><span style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>{s.title}</span><span style={{marginLeft:"auto",fontSize:11,color:"#94a3b8",fontWeight:600}}>Step {s.step} of 13</span></div><div style={{padding:"16px 20px"}}><p style={{margin:"0 0 12px",fontSize:13,color:"#64748b",lineHeight:1.7,whiteSpace:"pre-line"}}>{s.desc}</p><pre style={{margin:0,padding:"14px 16px",background:"#0a1628",fontSize:11,color:"#fde68a",overflow:"auto",lineHeight:1.8,borderRadius:10,fontFamily:"'JetBrains Mono',monospace"}}>{s.code}</pre></div></div>))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            HYBRID STUDIO GUIDE
        ═══════════════════════════════════════════════════════════════ */}
        {section === "hybrid-studio" && (
          <div>
            <div style={{background:"linear-gradient(135deg,#001a1a,#003333)",borderRadius:16,padding:"28px 32px",marginBottom:28,color:"#fff"}}>
              <div style={{fontSize:32,marginBottom:10}}>⚡</div>
              <h2 style={{fontSize:26,fontWeight:900,marginBottom:8,letterSpacing:"-0.5px"}}>Hybrid Studio</h2>
              <p style={{color:"#67e8f9",fontSize:14,margin:0,lineHeight:1.7}}>Visual pipeline automation — chain AI text, image generation, voice TTS/STT, sound effects, and translation into fully automated workflows. Port <strong>:8093</strong>.</p>
            </div>
            {[
              {step:1,title:"Purchase & Download",color:"#0891b2",desc:"Purchase an AXTO Studio license at axto.io (Professional or Enterprise plan — Hybrid Studio is not included in Starter). Your license key starts with STUD- and the same key also unlocks AI Studio and GPU Studio. Download from Portal → Licenses → Download.",code:`# Docker Image\ndocker load < axto-hybrid-studio-2.0.0.tar.gz\n\n# Windows EXE\n./axto-hybrid-studio.exe  # Opens browser at localhost:8093`},
              {step:2,title:"Configure & Start",color:"#0891b2",desc:"Create hybrid-studio.yml and launch the service.",code:`# hybrid-studio.yml\nhybrid_studio:\n  license_key: "STUD-XXXX-XXXX-XXXX-XXXX"\n  host: "0.0.0.0"\n  port: 8093\n  log_retention_days: 30\n\n# Start:\ndocker compose -f hybrid-studio-compose.yml up -d\ncurl http://localhost:8093/health`},
              {step:3,title:"Add API Connections",color:"#0891b2",desc:"Before building pipelines, add your API service credentials.\n\nDashboard → Connections page → click '+ Add Connection'.\n\nFor each connection:\n① Select Service (openai, anthropic, google, fal, elevenlabs, suno, etc.)\n② Enter Label (e.g. 'OpenAI Production')\n③ Enter API Key\n④ Click Save\n\nSupported services: OpenAI, Anthropic, Google Gemini, Groq, Mistral, DeepSeek, Fal.ai, Replicate, Stability AI, ElevenLabs, Azure Speech, Suno AI, MusicGen, AssemblyAI, Ayrshare, and any custom HTTP endpoint.",code:`# Add connection via API:\ncurl -X POST http://localhost:8093/api/connections \\\n  -d '{"action":"add","service":"openai","label":"OpenAI","api_key":"sk-..."}'`},
              {step:4,title:"Understanding the Pipeline Builder",color:"#0891b2",desc:"The Pipeline Builder is a visual canvas (main area) where you drag and connect nodes to build automated workflows.\n\nInterface layout:\n• Left sidebar — workflow list (your saved pipelines)\n• Center canvas — where nodes live and connect\n• Right node palette — drag nodes onto the canvas\n• Top toolbar — Run, Mode (Move/Connect/Select), Zoom, History\n\nNode colors:\n🤖 Indigo = AI Text nodes (LLM calls)\n🖼 Amber = GPU Image/Video nodes\n🎙 Purple = Voice/TTS/STT nodes\n💥 Cyan = Sound/Music nodes\n🌐 Teal = Translate/HTTP nodes\n❓ Violet = Logic nodes (Condition, Loop)\n⚡ Green = Trigger/Storage nodes",code:`# List node types:\ncurl http://localhost:8093/api/node-types | jq .node_types`},
              {step:5,title:"The Node Palette — All 18 Node Types",color:"#0891b2",desc:"Click '+ Add Node' or drag from the right palette. 18 node types:\n\nAI Nodes:\n  🤖 AI Text — call any LLM (provider, model, prompt template)\n  🌐 Translate — translate text to any language\n  🌐 HTTP Request — call any external API\n\nGPU Nodes:\n  🖼 Image Gen — generate image from prompt\n  🎬 Video Gen — generate video from text/image\n  👤 Photo Animate — animate portrait with lip-sync\n  ✨ Image Animate — add motion to still images\n  🎬 Cartoon Render — generate cartoon-style visuals\n\nAudio Nodes:\n  🎙 Voice TTS/STT — text-to-speech or speech-to-text in 16 languages\n  🎤 Voice Clone — clone a voice from audio sample\n  💥 Sound FX — generate sound effects\n  🎵 Music Gen — generate background music\n  🎚 Audio Mixer — blend BGM + SFX + Voice tracks\n\nLogic Nodes:\n  ❓ Condition — branch based on output value\n  🔄 Loop — iterate over a list\n  ⚡ Trigger — webhook or schedule trigger\n  💾 Storage — save/load intermediate data\n  ⌨ Code Execute — run a Python/JS snippet",code:`# 18 node types available.\n# Each node has config: provider, model, prompt template,\n# input/output field mappings (use {{node_id.field}} syntax)`},
              {step:6,title:"Building Your First Pipeline",color:"#0891b2",desc:"Create a simple AI → Image pipeline in 5 steps:\n\n① Click '+ New Workflow' in sidebar\n② Name it (e.g. 'Product Visual Generator')\n③ Drag an '🤖 AI Text' node onto canvas\n   → Config: provider=openai, model=gpt-4o-mini\n   → Prompt: 'Write a cinematic image prompt for: {{product}}'\n④ Drag an '🖼 Image Gen' node\n   → Prompt: '{{n1.content}}'\n   → Connect AI Text output → Image Gen input\n⑤ Click 'Save Pipeline'\n⑥ Click '▶ Run' → enter input: {\"product\": \"wireless headphones\"}\n\nThe AI writes the prompt, then the image node generates the visual automatically.",code:`# Run a pipeline via API:\ncurl -X POST http://localhost:8093/api/run \\\n  -d '{"workflow_id":"WF_ID","inputs":{"product":"wireless headphones"}}'`},
              {step:7,title:"Using Templates",color:"#0891b2",desc:"Templates page (top navigation) — start from pre-built pipelines.\n\nFilter categories:\n• 📱 Social — social media content creation\n• ✍️ Content — blog, article generation\n• 🎨 Visuals — image and video workflows\n• 🎬 Video — video production pipelines\n• 🔊 Voice — TTS, STT, translation workflows\n• 🛒 E-commerce — product photography\n• 📊 Data — analysis and reporting\n• 🤖 Automation — CRM, webhook triggers\n• 🎬 Cartoon Film — full cartoon production\n• 🔊 Sound Design — audio production\n• 🌐 Multilingual — localization workflows\n\nFlagship templates:\n  🎬 Cartoon Film Episode (12 nodes) — script → cartoon frames → animate → SFX → BGM → voice → full episode\n  🔊 Full Audio Production (11 nodes) — video → scene analysis → auto SFX → BGM → voice → final mix\n  🌍 Global Content Localizer (14 nodes) — any content → translate 10 languages → regional images → multi-TTS\n\nClick 'Use Template' → creates a copy you can customize.",code:`# List templates:\ncurl -X POST http://localhost:8093/api/templates \\\n  -d '{"action":"list"}'`},
              {step:8,title:"Node Configuration Reference",color:"#0891b2",desc:"Every node uses {{}} template syntax to pass data between nodes.\n\nExamples:\n• AI Text node prompt: 'Write a blog post about {{input.topic}}'\n• Image Gen prompt: '{{ai_node_id.content}}, photorealistic'\n• TTS text: '{{translate_node_id.translated}}'\n• HTTP body: {\"message\": \"{{ai_node.content}}\"}\n\nReserved variables:\n• {{input.KEY}} → pipeline input variables\n• {{NODE_ID.content}} → AI text output\n• {{NODE_ID.translated}} → translation output\n• {{NODE_ID.images}} → generated image URLs\n• {{NODE_ID.audio_bytes}} → TTS audio size",code:`# Example node config in workflow:\n{\n  "id": "n1",\n  "type": "ai",\n  "config": {\n    "provider": "openai",\n    "model": "gpt-4o-mini",\n    "prompt": "Write a tagline for {{input.product}}",\n    "system_prompt": "Be creative and concise."\n  }\n}`},
              {step:9,title:"Run History & Monitoring",color:"#0891b2",desc:"Runs tab (top navigation) — monitor all pipeline executions.\n\nEach run shows:\n• Status: running (blue), done (green), failed (red)\n• Duration, cost, trigger (manual/webhook/schedule)\n• Node-by-node execution log with timing per node\n• Input/output data for each run\n\nWebSocket live monitoring:\nConnect to ws://localhost:8093/ws/pipeline, send {\"run_id\":\"...\"}  and receive real-time node-by-node progress updates.",code:`# List all runs:\ncurl http://localhost:8093/api/runs\n\n# Get specific run:\ncurl http://localhost:8093/api/runs/RUN_ID\n\n# WebSocket progress:\nconst ws = new WebSocket('ws://localhost:8093/ws/pipeline');\nws.onopen = () => ws.send(JSON.stringify({run_id: "RUN_ID"}));\nws.onmessage = e => console.log(JSON.parse(e.data));`},
              {step:10,title:"Scheduling & Automation",color:"#0891b2",desc:"Automate pipeline execution with triggers:\n\n⚡ Webhook Trigger node:\n   • Receives POST requests at /webhook/WORKFLOW_ID\n   • Body becomes pipeline input variables\n   • Use from Zapier, Make, n8n, or any HTTP POST\n\n⏰ Schedule Trigger node:\n   • Set cron expression (e.g. '0 9 * * 1-5' = weekdays at 9am)\n   • Pipeline runs automatically at scheduled time\n   • Output can be sent via HTTP node to Slack, email, CMS, etc.",code:`# Trigger via webhook:\ncurl -X POST http://localhost:8093/webhook/WORKFLOW_ID \\\n  -d '{"product":"New Launch","platform":"Instagram"}'`},
              {step:11,title:"Troubleshooting",color:"#0891b2",desc:"Common Hybrid Studio issues:\n\n• 'Workflow not found' → check the workflow_id in your request\n• 'Connection not found' → add the required API connection first\n• Node fails with 403 → API key for that service is invalid\n• Pipeline stuck at running → check node logs in Run History\n• WebSocket disconnects → reconnect and re-send run_id\n• Port 8093 in use → change port in hybrid-studio.yml",code:`# Check logs:\ndocker compose -f hybrid-studio-compose.yml logs hybrid-studio\n\n# Test connection:\ncurl -X POST http://localhost:8093/api/connections \\\n  -d '{"action":"verify","id":"CONNECTION_ID"}'`},
            ].map((s,i)=>(<div key={i} style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",marginBottom:16,overflow:"hidden"}}><div style={{padding:"14px 20px",background:`${s.color}12`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}><div style={{width:28,height:28,borderRadius:8,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:12}}>{s.step}</div><span style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>{s.title}</span><span style={{marginLeft:"auto",fontSize:11,color:"#94a3b8",fontWeight:600}}>Step {s.step} of 11</span></div><div style={{padding:"16px 20px"}}><p style={{margin:"0 0 12px",fontSize:13,color:"#64748b",lineHeight:1.7,whiteSpace:"pre-line"}}>{s.desc}</p><pre style={{margin:0,padding:"14px 16px",background:"#0a1628",fontSize:11,color:"#fde68a",overflow:"auto",lineHeight:1.8,borderRadius:10,fontFamily:"'JetBrains Mono',monospace"}}>{s.code}</pre></div></div>))}
          </div>
        )}

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
  const { t, locale } = useLocale();
  const [section, setSection] = useState<Section>("start");
  const [guideLang, setGuideLang] = useState("en");
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
    { id:"start" as Section,      icon:"🚀", label:"Setup & Deploy" },
    { id:"guardian" as Section,   icon:"🛡️", label:"Guardian AI" },
    { id:"orchestra" as Section,  icon:"⚡", label:"Orchestra AI" },
    { id:"antivirus" as Section,  icon:"🦠", label:"Antivirus" },
    { id:"vault" as Section,      icon:"🔐", label:"Vault" },
    { id:"edge" as Section,       icon:"🌐", label:"Edge" },
    { id:"soc" as Section,        icon:"🔴", label:"SOC" },
    { id:"compliance" as Section, icon:"📋", label:"Compliance" },
    { id:"sentinel" as Section,   icon:"📡", label:"Sentinel" },
    { id:"legal" as Section,      icon:"⚖️", label:"Legal" },
    { id:"api" as Section,        icon:"🤖", label:"API Integration" },
    { id:"ai-studio" as Section,  icon:"🧠", label:"AI Studio" },
    { id:"gpu-studio" as Section, icon:"🎨", label:"GPU Studio" },
    { id:"hybrid-studio" as Section,icon:"⚡",label:"Hybrid Studio" },
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
          <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Complete setup & feature guide</div>
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

        {/* Language selector + PDF download */}
        <div style={{padding:"12px 16px",borderTop:"1px solid #e2e8f0"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",marginBottom:6}}>Language / PDF</div>
          <select value={guideLang} onChange={e=>setGuideLang(e.target.value)}
            style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #e2e8f0",fontSize:11,marginBottom:6,cursor:"pointer",background:"#fff"}}>
            {[
              {code:"en",label:"🇬🇧 English"},{code:"id",label:"🇮🇩 Indonesia"},{code:"zh",label:"🇨🇳 中文"},
              {code:"ar",label:"🇸🇦 العربية"},{code:"es",label:"🇪🇸 Español"},{code:"fr",label:"🇫🇷 Français"},
              {code:"de",label:"🇩🇪 Deutsch"},{code:"pt",label:"🇧🇷 Português"},{code:"ja",label:"🇯🇵 日本語"},
              {code:"ko",label:"🇰🇷 한국어"},
            ].map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <a href={`/api/guide/pdf?lang=${guideLang}`} download
            style={{display:"block",width:"100%",padding:"7px 0",borderRadius:6,background:"#0284c7",color:"#fff",fontSize:11,fontWeight:700,textAlign:"center",textDecoration:"none",cursor:"pointer"}}>
            ⬇ Download PDF
          </a>
        </div>

        <div style={{padding:"12px 16px",borderTop:"1px solid #e2e8f0",fontSize:11,color:"#94a3b8"}}>
          Support: <a href="mailto:hallo@axto.io" style={{color:"#0284c7"}}>hallo@axto.io</a>
        </div>
      </div>

      {/* ── Content ── */}
      <div ref={contentRef} style={{flex:1,overflow:"auto",padding:"28px 32px",maxHeight:"100vh"}}>

        {/* ════ SETUP & DEPLOY ════════════════════════════════════════════════ */}

          {/* ── Download Guide Button ── */}
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:16 }}>
            <span style={{ fontSize:13, color:"#64748b", fontWeight:600 }}>Download this guide:</span>
            {["en","id"].map(lng => (
              <a key={lng} href={`/api/guide/download?product=${section === "start" ? "guardian" : section}&lang=${lng}&format=html`}
                style={{ padding:"6px 14px", fontSize:12, fontWeight:700, borderRadius:8,
                  background: lng === locale ? "#0284c7" : "rgba(2,132,199,0.08)",
                  color: lng === locale ? "#fff" : "#0284c7",
                  textDecoration:"none", border:"1px solid rgba(2,132,199,0.2)" }}
                download>
                ⬇ {lng.toUpperCase()}
              </a>
            ))}
            <a href={`/api/guide/download?product=${section === "start" ? "guardian" : section}&lang=en&format=md`}
              style={{ padding:"6px 14px", fontSize:12, fontWeight:700, borderRadius:8,
                background:"rgba(13,148,136,0.08)", color:"#0d9488", textDecoration:"none",
                border:"1px solid rgba(13,148,136,0.2)" }}
              download>
              📄 Markdown
            </a>
          </div>
        {section==="start"&&(
          <div style={{maxWidth:900}}>
            <h1 style={{fontSize:26,fontWeight:900,color:"#0a1628",margin:"0 0 4px",letterSpacing:"-0.5px"}}>
              🚀 Setup Guide & Deploy
            </h1>
            <p style={{color:"#64748b",fontSize:14,margin:"0 0 28px"}}>
              Dari pembayaran sampai engine berjalan on your server — ikuti 6 langkah berikut.
            </p>

            {/* Step selector */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:24}}>
              {getSetupSteps(t, locale).map((s,i)=>(
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

            {/* ── Free AI providers (BYOK) ───────────────────────────────── */}
            <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "20px 22px", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: "#0a1628", marginBottom: 4 }}>🆓 Free AI keys to get started (BYOK)</div>
              <p style={{ fontSize: 13, color: "#475569", margin: "0 0 16px", lineHeight: 1.6 }}>
                Every AXTO product is <strong>Bring-Your-Own-Key</strong>. Start at zero cost with any of these free / free-tier providers — or run a fully private, offline model so no data ever leaves your machine.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
                {FREE_AI_PROVIDERS.map(p => (
                  <a key={p.name} href={p.signup} target="_blank" rel="noopener noreferrer"
                    style={{ display: "block", textDecoration: "none", border: `1.5px solid ${p.local ? "rgba(13,148,136,0.35)" : "#e2e8f0"}`, background: p.local ? "rgba(13,148,136,0.04)" : "#f8fafc", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0a1628" }}>{p.name}</span>
                      {p.local
                        ? <span style={{ fontSize: 9, fontWeight: 800, color: "#0d9488", background: "rgba(13,148,136,0.1)", borderRadius: 5, padding: "1px 6px" }}>PRIVATE</span>
                        : <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b" }}>{p.region}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", margin: "5px 0 8px", lineHeight: 1.5 }}>{p.free}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#0284c7" }}>Get key →</div>
                  </a>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "14px 0 0", lineHeight: 1.6 }}>
                🔒 For confidential or regulated matters, prefer a <strong>PRIVATE</strong> local model (Ollama / vLLM / llama.cpp). Cloud free tiers may log or train on free traffic — review each provider's terms before sending sensitive data.
              </p>
            </div>

            {/* Active step detail */}
            {(() => {
              const s = getSetupSteps(t, locale)[setupStep];
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
                      <div style={{fontWeight:800,fontSize:13,color:"#0a1628",marginBottom:14}}>Step-langkah:</div>
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
                            {["Login axto.io/portal","Click tab 'Licenses'","Temukan lisensi aktif","⬇ docker-compose.yml","⬇ Config template"].map((l,i)=>(
                              <div key={i} style={{display:"flex",gap:8,fontSize:12}}>
                                <span style={{color:"#16a34a"}}>✓</span>
                                <span style={{color:"#475569"}}>{l}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {setupStep===2&&(
                          <div style={{background:"#0a1628",borderRadius:8,padding:"10px 14px",fontFamily:"monospace",fontSize:11}}>
                            <div style={{color:"#64748b",marginBottom:6}}># Tidak need edit file!</div>
                            <div style={{color:"#22d3ee"}}>{"  Open: http://SERVER:8080"}</div>
                            <div style={{color:"#22d3ee"}}>{"  → Wizard aktivasi automatic muncul"}</div>
                            <div style={{color:"#22d3ee"}}>{"  → Paste license key from portal"}</div>
                            <div style={{color:"#22c55e"}}>{"  → Click Activate & Start ✓"}</div>
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
                    <span style={{fontSize:12,color:"#94a3b8"}}>Step {setupStep+1} from {getSetupSteps(t, locale).length}</span>
                    {setupStep < getSetupSteps(t, locale).length-1 ? (
                      <button onClick={()=>setSetupStep(setupStep+1)}
                        style={{padding:"8px 18px",borderRadius:9,background:s.color,border:"none",color:"#fff",fontWeight:700,cursor:"pointer"}}>
                        Lanjut →
                      </button>
                    ) : (
                      <button onClick={()=>navTo("guardian")}
                        style={{padding:"8px 18px",borderRadius:9,background:"linear-gradient(135deg,#0284c7,#0d9488)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer"}}>
                        Explore Guardian →
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
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0,letterSpacing:"-0.5px"}}>Guardian AI — Complete Feature Guide</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>Click any menu item below for a detailed walkthrough and live animation.</p>
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
                  <div style={{fontWeight:700,color:"#0a1628",marginBottom:4}}>Automated workflow:</div>
                  <div>Detect → Kill process</div>
                  <div>→ Block IP at firewall</div>
                  <div>→ Quarantine file</div>
                  <div>→ Alert admin</div>
                  <div>→ Generate forensic report</div>
                  <div style={{color:"#dc2626",fontWeight:700,marginTop:4}}>Total: under 30 seconds</div>
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
                      background: activeMenu===i ? (m as any).bg||"rgba(2,132,199,.08)" : "transparent",
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
                    ← Previous
                  </button>
                  <span style={{fontSize:12,color:"#94a3b8",alignSelf:"center"}}>{activeMenu+1} / {GUARDIAN_MENUS.length}</span>
                  {activeMenu < GUARDIAN_MENUS.length-1 ? (
                    <button onClick={()=>setActiveMenu(activeMenu+1)}
                      style={{padding:"7px 16px",borderRadius:8,background:guardianMenu.color,border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>
                      Next →
                    </button>
                  ) : (
                    <button onClick={()=>navTo("orchestra")}
                      style={{padding:"7px 16px",borderRadius:8,background:"linear-gradient(135deg,#0d9488,#0284c7)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13}}>
                      Explore Orchestra →
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
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0,letterSpacing:"-0.5px"}}>Orchestra AI — Complete Feature Guide</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>AI orchestration with smart routing to all provider. Click menu for detail.</p>
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
                    Ganti <code>base_url</code> → Orchestra routing automatic
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
                    ← Previous
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
                      Explore Antivirus →
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
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0,letterSpacing:"-0.5px"}}>Antivirus (ClamAV) — Guide Lengkap</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>ClamAV terintegrasi penuh dalam Guardian AI. Signature auto-update, scan real-time, karantina automatic.</p>
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
                ✅ ClamAV aktif and berjalan at dalam container guardian-engine. Tidak need install terpisah.
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
                    ← Previous
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
                <p style={{color:"#64748b",fontSize:13,margin:0}}>Gunwill API key milik your own. Orchestra sebagai proxy pintar — key not pernah keluar from your server.</p>
              </div>
            </div>

            {/* BYOK principle */}
            <div style={{background:"rgba(34,197,94,.05)",border:"1.5px solid rgba(34,197,94,.2)",borderRadius:14,padding:20,marginBottom:24}}>
              <div style={{fontWeight:800,fontSize:14,color:"#16a34a",marginBottom:12}}>🔑 Prinsip BYOK (Bring Your Own Key)</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                {[
                  {icon:"✅",title:"Key on your server",desc:"API key disimpan terenkripsi at database lokal on your server sendiri"},
                  {icon:"🚫",title:"Tidak keluar to AXTO",desc:"Orchestra memanggil provider langsung from your server — AXTO not pernah tahu key you"},
                  {icon:"🔐",title:"Enkripsi at-rest",desc:"Key tersimpan terenkripsi AES-256. Hanya engine that can membacanya saat runtime"},
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

# Ganti base_url to Orchestra endpoint
client = OpenAI(
    base_url="http://YOUR_SERVER:8080/v1",
    api_key="YOUR_WORKER_TOKEN"  # from Console → Settings → Worker Token
)

# Request sama persis seperti OpenAI biasa
response = client.chat.completions.create(
    model="auto",   # Orchestra pilih provider terbaik
    # or: "groq/llama-3.1-8b-instant" for spesifik
    # or: "local/llama3.2" for GPU lokal
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

response = llm.invoto("Apa that machine learning?")

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
                  {title:"Model \"auto\"",desc:"Orchestra pilih provider termurah that sedang online. Cocok for all use case umum."},
                  {title:"Override routing",desc:"Header X-Orchestra-Routing: cost | quality | local for override per-request."},
                  {title:"Streaming",desc:"Addkan stream: true at request. Orchestra support SSE streaming to all provider."},
                  {title:"Cost tracking",desc:"Setiap response punya header X-Orchestra-Cost dalam USD. Log this for analitik biaya."},
                  {title:"Error handling",desc:"Jika provider gagal, Orchestra auto-retry to provider berikutnya. Transparent to client."},
                  {title:"Local GPU gratis",desc:"Set model: \"local/llama3.2\" for selalu pakai GPU lokal you. Biaya: $0."},
                ].map((t,i)=>(
                  <div key={i} style={{padding:"10px 12px",background:"rgba(255,255,255,.7)",borderRadius:9,border:"1px solid rgba(2,132,199,.1)"}}>
                    <div style={{fontWeight:700,fontSize:12,color:"#0284c7",marginBottom:3}}>{t.title}</div>
                    <div style={{fontSize:11,color:"#64748b",lineHeight:1.6}}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{marginTop:20,padding:"16px 20px",background:"rgba(34,197,94,.05)",border:"1.5px solid rgba(34,197,94,.2)",borderRadius:12,fontSize:13,color:"#16a34a",textAlign:"center"}}>
              ✅ Done! you already menguasai seluruh fitur AXTO. Butuh bantuan? <a href="mailto:hallo@axto.io" style={{color:"#0284c7",fontWeight:700}}>hallo@axto.io</a>
            </div>
          </div>
        )}

        {/* ════ VAULT ══════════════════════════════════════════════════════════ */}
        {section==="vault"&&(
          <div style={{maxWidth:860}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🔐</div>
              <div>
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0}}>AXTO Vault — AI Privacy Layer</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>Auto-redact PII, PHI & financial data before it reaches any AI provider. Self-hosted. Zero cloud upload.</p>
              </div>
            </div>
            {[
              {step:1,title:"Purchase & Download",desc:"Purchase Vault license at axto.io/buy. Navigate to Portal → Downloads → vault-core. Download the Docker image archive.",code:`# Verify download\nsha256sum vault-core-1.1.0.tar.gz\n# Load image\ndocker load < vault-core-1.1.0.tar.gz`,color:"#6366f1"},
              {step:2,title:"Server Requirements",desc:"Minimum: 2 CPU cores, 2 GB RAM, 10 GB disk. Docker 24+, Docker Compose v2. Port 8080 open to your app servers. Outbound HTTPS to axto.io for license validation.",code:`# Verify Docker\ndocker --version   # 24.0+\ndocker compose version  # 2.x`,color:"#6366f1"},
              {step:3,title:"Configure vault.yml",desc:"Edit vault.yml — set your license key, API key, and optional AI provider for enhanced detection.",code:`vault:\n  license_key: "VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX"\n  api_key: "your-strong-api-key"\n  db_path: "/vault/data/vault.db"\n  log_level: "INFO"\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: "sk-..."   # YOUR key — never sent to AXTO\n      model: "gpt-4o-mini"`,color:"#6366f1"},
              {step:4,title:"First Start",desc:"Launch Vault with Docker Compose. The service validates your license on startup and begins listening for redaction requests.",code:`docker compose -f vault-compose.yml up -d\ndocker compose -f vault-compose.yml logs -f vault`,color:"#6366f1"},
              {step:5,title:"Verify — /health",desc:"Confirm the service is running and license is active.",code:`curl http://localhost:8080/health | jq .\n# Expected: status: "ok", license.valid: true`,color:"#6366f1"},
              {step:6,title:"First Redaction",desc:"Send a text payload to Vault and observe PII being redacted before it would reach any AI provider.",code:`curl -X POST http://localhost:8080/v1/redact \\\n  -H "X-Vault-Key: your-api-key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"text":"Contact John Doe at john@example.com or +1-555-0100"}'\n# Returns: {"redacted":"Contact [PERSON] at [EMAIL] or [PHONE]"}`,color:"#6366f1"},
              {step:7,title:"Dashboard Walkthrough",desc:"In AXTO dashboard → Vault: Redaction Log shows every event with entity types detected. Settings tab controls detection sensitivity per entity type. Statistics shows redaction rate, most common PII types, and throughput.",code:`# All redaction events\ncurl http://localhost:8080/v1/log \\\n  -H "X-Vault-Key: your-api-key" | jq .`,color:"#6366f1"},
              {step:8,title:"API Usage",desc:"Three most common patterns: text redaction, batch processing, and reverse lookup (restore redacted values using session token).",code:`# Redact\ncurl -X POST .../v1/redact -d '{"text":"..."}'\n\n# Batch (up to 100 texts)\ncurl -X POST .../v1/redact/batch -d '{"texts":[...]}'\n\n# Stats\ncurl .../v1/stats`,color:"#6366f1"},
              {step:9,title:"Integration",desc:"Point your AI provider client at Vault instead of the AI provider directly. Vault redacts, forwards the clean text, and returns the response. Drop-in for OpenAI-compatible APIs.",code:`# Before (direct to OpenAI)\nclient = OpenAI(base_url="https://api.openai.com/v1")\n\n# After (through Vault — PII auto-redacted)\nclient = OpenAI(base_url="http://vault:8080/v1/proxy")`,color:"#6366f1"},
              {step:10,title:"License Status",desc:"Check license status. Vault enters 4-hour grace period on validation failure. After grace expiry all endpoints return 503.",code:`curl http://localhost:8080/health | jq .license\n# Renew: https://axto.io/renew`,color:"#6366f1"},
              {step:11,title:"Troubleshooting",desc:"Common issues and resolutions for Vault deployments.",code:`# License not valid → check key prefix is VAULT-\n# 503 on endpoints → grace expired, renew at axto.io/renew\n# High latency → check AI provider connectivity\n# False positives → adjust entity_types in vault.yml\n# Logs\ndocker compose -f vault-compose.yml logs vault`,color:"#6366f1"},
            ].map((s,i)=>(<div key={i} style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",marginBottom:16,overflow:"hidden",transition:"all 0.3s ease"}}><div style={{padding:"14px 20px",background:`${s.color}10`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}><div style={{width:28,height:28,borderRadius:8,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:12}}>{s.step}</div><span style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>{s.title}</span><span style={{marginLeft:"auto",fontSize:11,color:"#94a3b8",fontWeight:600}}>Step {s.step} of 11</span></div><div style={{padding:"16px 20px"}}><p style={{margin:"0 0 12px",fontSize:13,color:"#64748b",lineHeight:1.7}}>{s.desc}</p><pre style={{margin:0,padding:"14px 16px",background:"#0a1628",fontSize:11,color:"#86efac",overflow:"auto",lineHeight:1.8,borderRadius:10,fontFamily:"'JetBrains Mono',monospace"}}>{s.code}</pre></div></div>))}
          </div>
        )}

        {/* ════ EDGE ═══════════════════════════════════════════════════════════ */}
        {section==="edge"&&(
          <div style={{maxWidth:860}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#0891b2,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🌐</div>
              <div>
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0}}>AXTO Edge — AI Gateway</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>One endpoint for every AI provider. Routing, caching, rate limiting, cost control — self-hosted.</p>
              </div>
            </div>
            {[
              {step:1,title:"Purchase & Download",desc:"Purchase Edge license at axto.io/buy. Navigate to Portal → Downloads → edge-core.",code:`docker load < edge-core-1.1.0.tar.gz`,color:"#0891b2"},
              {step:2,title:"Server Requirements",desc:"Minimum: 2 CPU cores, 2 GB RAM, 20 GB disk (for cache). Docker 24+. Port 8094 open to app servers.",code:`docker --version && docker compose version`,color:"#0891b2"},
              {step:3,title:"Configure edge.yml",desc:"Set license key, API auth, and your AI provider pool. Edge routes requests across providers automatically.",code:`edge:\n  license_key: "EDGE-XXXX-XXXX-XXXX-XXXXXXXXXXXX"\n  api_key: "your-strong-api-key"\n  port: 8094\n  cache_enabled: true\n  cache_ttl_seconds: 3600\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: "sk-..."     # YOUR key\n      model: "gpt-4o-mini"\n      weight: 70\n    - provider: anthropic\n      api_key: "sk-ant-..." # YOUR key\n      model: "claude-3-5-haiku-20241022"\n      weight: 30`,color:"#0891b2"},
              {step:4,title:"First Start",desc:"Launch Edge. License validation runs at startup. The gateway begins accepting requests once health check passes.",code:`docker compose -f edge-compose.yml up -d\ncurl http://localhost:8094/health`,color:"#0891b2"},
              {step:5,title:"Verify — /health",desc:"Confirm service is running, license valid, and providers reachable.",code:`curl http://localhost:8094/health | jq .\n# status: "ok", license.valid: true`,color:"#0891b2"},
              {step:6,title:"First Routed Request",desc:"Send an OpenAI-compatible request to Edge. It routes to the optimal provider based on your configuration.",code:`curl -X POST http://localhost:8094/v1/chat/completions \\\n  -H "X-Edge-Key: your-api-key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"auto","messages":[{"role":"user","content":"Hello"}]}'`,color:"#0891b2"},
              {step:7,title:"Dashboard Walkthrough",desc:"Dashboard → Edge: Requests tab shows per-request cost, latency, provider used, cache hit/miss. Cost tab shows daily spend by team/user. Cache tab shows hit rate and top cached prompts. Rules tab configures rate limits per API key.",code:`curl http://localhost:8094/v1/stats \\\n  -H "X-Edge-Key: your-api-key" | jq .`,color:"#0891b2"},
              {step:8,title:"API Usage",desc:"Edge is OpenAI API-compatible. Change your base_url to Edge endpoint — no other code changes needed.",code:`# Python\nfrom openai import OpenAI\nclient = OpenAI(base_url="http://edge:8094/v1", api_key="your-edge-key")\nresp = client.chat.completions.create(model="auto", messages=[...])\n\n# Force specific provider\nresp = client.chat.completions.create(model="anthropic/claude-3-5-haiku", messages=[...])`,color:"#0891b2"},
              {step:9,title:"Integration",desc:"Connect Edge to Vault for automatic PII redaction on every routed request. Export metrics to Grafana or your SIEM.",code:`# With Vault in front (PII redact → Edge → AI provider)\nVAULT_URL=http://vault:8080/v1/proxy\nEDGE_URL=http://edge:8094/v1\n\n# Metrics export (Prometheus format)\ncurl http://localhost:8094/metrics`,color:"#0891b2"},
              {step:10,title:"License Status",desc:"Monitor license and trigger manual renewal.",code:`curl http://localhost:8094/health | jq .license\n# Renew: https://axto.io/renew`,color:"#0891b2"},
              {step:11,title:"Troubleshooting",desc:"Common Edge issues and resolutions.",code:`# Provider unreachable → check ai_pool.vendors[].api_key in edge.yml\n# High latency → enable cache_enabled: true\n# 503 on endpoints → license expired, renew at axto.io/renew\n# 401 errors → check X-Edge-Key header matches api_key in edge.yml\ndocker compose -f edge-compose.yml logs edge`,color:"#0891b2"},
            ].map((s,i)=>(<div key={i} style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",marginBottom:16,overflow:"hidden",transition:"all 0.3s ease"}}><div style={{padding:"14px 20px",background:`${s.color}10`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}><div style={{width:28,height:28,borderRadius:8,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:12}}>{s.step}</div><span style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>{s.title}</span><span style={{marginLeft:"auto",fontSize:11,color:"#94a3b8",fontWeight:600}}>Step {s.step} of 11</span></div><div style={{padding:"16px 20px"}}><p style={{margin:"0 0 12px",fontSize:13,color:"#64748b",lineHeight:1.7}}>{s.desc}</p><pre style={{margin:0,padding:"14px 16px",background:"#0a1628",fontSize:11,color:"#7dd3fc",overflow:"auto",lineHeight:1.8,borderRadius:10,fontFamily:"'JetBrains Mono',monospace"}}>{s.code}</pre></div></div>))}
          </div>
        )}

        {/* ════ SOC ════════════════════════════════════════════════════════════ */}
        {section==="soc"&&(
          <div style={{maxWidth:860}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#dc2626,#b91c1c)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🔴</div>
              <div>
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0}}>AXTO SOC — Security Operations Center</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>AI-augmented SIEM, UEBA, SOAR. Threat detection without log exfiltration. Self-hosted.</p>
              </div>
            </div>
            {[
              {step:1,title:"Purchase & Download",desc:"Purchase SOC license at axto.io/buy. Navigate to Portal → Downloads → soc-core.",code:`docker load < soc-core-1.1.0.tar.gz`,color:"#dc2626"},
              {step:2,title:"Server Requirements",desc:"Minimum: 4 CPU cores, 8 GB RAM, 100 GB disk (log storage). Docker 24+. Port 8092 open to log sources. Outbound HTTPS to threat intel feeds.",code:`# Verify resources\nfree -h     # 8 GB+ RAM\ndf -h /     # 100 GB+ disk\ndocker --version`,color:"#dc2626"},
              {step:3,title:"Configure soc.yml",desc:"Set license key, API key, log retention, and BYOK AI provider for behavioral analysis.",code:`soc:\n  license_key: "SOC-XXXX-XXXX-XXXX-XXXXXXXXXXXX"\n  api_key: "your-strong-api-key"\n  db_path: "/soc/data/soc.db"\n  log_retention_days: 90\n  ueba_enabled: true\n  ti_enrichment_enabled: true\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: "sk-..."   # YOUR key\n      model: "gpt-4o-mini"`,color:"#dc2626"},
              {step:4,title:"First Start",desc:"Launch SOC. License validation runs at startup. UEBA baseline building begins automatically.",code:`docker compose -f soc-compose.yml up -d\ndocker compose -f soc-compose.yml logs -f soc`,color:"#dc2626"},
              {step:5,title:"Verify — /health",desc:"Confirm service health, license status, and engine readiness.",code:`curl http://localhost:8092/health | jq .\n# status: "ok", license.valid: true, engine_ready: true`,color:"#dc2626"},
              {step:6,title:"First Log Ingestion",desc:"Send a batch of log lines to SOC. The engine parses, enriches with threat intel, runs UEBA, and generates alerts.",code:`curl -X POST http://localhost:8092/v1/ingest \\\n  -H "X-SOC-Key: your-api-key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"logs":["Failed login for root from 185.220.101.5","sudo: 3 incorrect password attempts"],"source":"syslog"}'\n# Returns: alerts_created, alert_ids`,color:"#dc2626"},
              {step:7,title:"Dashboard Walkthrough",desc:"Dashboard → SOC: Alerts tab lists all detections with severity, MITRE ATT&CK mapping, and TI enrichment. Incidents tab tracks open cases with MTTD/MTTR. UEBA tab shows behavioral anomalies by user/host. Rules tab manages custom detection rules.",code:`# Dashboard stats\ncurl http://localhost:8092/v1/dashboard \\\n  -H "X-SOC-Key: your-api-key" | jq .`,color:"#dc2626"},
              {step:8,title:"API Usage",desc:"Key endpoints for alert management, log ingestion, and incident tracking.",code:`# Query alerts (high severity, unresolved)\ncurl ".../v1/alerts?severity=high&false_positive=false"\n\n# List open incidents\ncurl ".../v1/incidents?status=open"\n\n# Run SOAR playbook action\ncurl -X POST .../v1/playbook/run \\\n  -d '{"incident_id":"...","action":"block_ip","target":"1.2.3.4"}'`,color:"#dc2626"},
              {step:9,title:"Integration",desc:"Forward logs via syslog, connect to AXTO Sentinel for OT events, or integrate with Slack for alert notifications.",code:`# Syslog forwarding (rsyslog)\n# /etc/rsyslog.d/axto-soc.conf\n*.* @@soc-server:514;RSYSLOG_SyslogProtocol23Format\n\n# Slack webhook\ncurl -X POST http://localhost:8092/v1/config \\\n  -d '{"notification_webhook":"https://hooks.slack.com/..."}'`,color:"#dc2626"},
              {step:10,title:"License Status",desc:"Monitor license. SOC enters 4-hour grace on validation failure.",code:`curl http://localhost:8092/health | jq .license\n# Renew: https://axto.io/renew`,color:"#dc2626"},
              {step:11,title:"Troubleshooting",desc:"Common SOC deployment issues.",code:`# High memory → reduce log_retention_days in soc.yml\n# No alerts → verify log source format matches source parameter\n# 503 on endpoints → license expired\n# TI enrichment slow → check outbound connectivity\ndocker compose -f soc-compose.yml logs soc`,color:"#dc2626"},
            ].map((s,i)=>(<div key={i} style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",marginBottom:16,overflow:"hidden",transition:"all 0.3s ease"}}><div style={{padding:"14px 20px",background:`${s.color}10`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}><div style={{width:28,height:28,borderRadius:8,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:12}}>{s.step}</div><span style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>{s.title}</span><span style={{marginLeft:"auto",fontSize:11,color:"#94a3b8",fontWeight:600}}>Step {s.step} of 11</span></div><div style={{padding:"16px 20px"}}><p style={{margin:"0 0 12px",fontSize:13,color:"#64748b",lineHeight:1.7}}>{s.desc}</p><pre style={{margin:0,padding:"14px 16px",background:"#0a1628",fontSize:11,color:"#fca5a5",overflow:"auto",lineHeight:1.8,borderRadius:10,fontFamily:"'JetBrains Mono',monospace"}}>{s.code}</pre></div></div>))}
          </div>
        )}

        {/* ════ COMPLIANCE ═════════════════════════════════════════════════════ */}
        {section==="compliance"&&(
          <div style={{maxWidth:860}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#16a34a,#15803d)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📋</div>
              <div>
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0}}>AXTO Compliance — Automated Audit Platform</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>Continuous SOC 2, ISO 27001, HIPAA, PCI-DSS monitoring. Audit-ready every day. Self-hosted.</p>
              </div>
            </div>
            {[
              {step:1,title:"Purchase & Download",desc:"Purchase Compliance license at axto.io/buy. Navigate to Portal → Downloads → compliance-core.",code:`docker load < compliance-core-1.1.0.tar.gz`,color:"#16a34a"},
              {step:2,title:"Server Requirements",desc:"Minimum: 2 CPU cores, 4 GB RAM, 50 GB disk. Docker 24+. Port 8093 open to dashboard. Outbound HTTPS for cloud provider integrations.",code:`docker --version && docker compose version`,color:"#16a34a"},
              {step:3,title:"Configure compliance.yml",desc:"Set license key, select frameworks to monitor, and configure cloud provider integrations.",code:`compliance:\n  license_key: "CMPL-XXXX-XXXX-XXXX-XXXXXXXXXXXX"\n  api_key: "your-strong-api-key"\n  db_path: "/compliance/data/compliance.db"\n  frameworks: ["soc2", "iso27001", "hipaa"]\n  evidence_auto_collect: true\n  audit_retention_days: 365\n\n# Optional: cloud provider integration\naws:\n  access_key_id: ""     # Read-only IAM key\n  secret_access_key: ""\n  region: "us-east-1"`,color:"#16a34a"},
              {step:4,title:"First Start",desc:"Launch Compliance. Initial gap analysis runs automatically on startup.",code:`docker compose -f compliance-compose.yml up -d\ndocker compose -f compliance-compose.yml logs -f compliance`,color:"#16a34a"},
              {step:5,title:"Verify — /health",desc:"Confirm service health and license status.",code:`curl http://localhost:8093/health | jq .\n# status: "ok", license.valid: true`,color:"#16a34a"},
              {step:6,title:"First Gap Analysis",desc:"Run a framework gap analysis to see your current compliance posture and prioritized remediation list.",code:`curl -X POST http://localhost:8093/v1/gap-analysis \\\n  -H "X-Compliance-Key: your-api-key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"framework":"soc2"}'\n# Returns: control_gaps[], coverage_percent, priority_items[]`,color:"#16a34a"},
              {step:7,title:"Dashboard Walkthrough",desc:"Dashboard → Compliance: Overview shows coverage % per framework with traffic-light status. Controls tab lists all controls with pass/fail/partial status. Evidence tab shows collected evidence by control. Policies tab manages policy documents with version history. Reports tab generates audit-ready exports.",code:`curl http://localhost:8093/v1/dashboard \\\n  -H "X-Compliance-Key: your-api-key" | jq .`,color:"#16a34a"},
              {step:8,title:"API Usage",desc:"Key endpoints for control status, evidence collection, and report generation.",code:`# Control status\ncurl ".../v1/controls?framework=soc2&status=failing"\n\n# Trigger evidence collection\ncurl -X POST ".../v1/evidence/collect" \\\n  -d '{"framework":"soc2","control_id":"CC6.1"}'\n\n# Generate audit report (PDF)\ncurl ".../v1/reports/generate?framework=soc2&format=pdf"`,color:"#16a34a"},
              {step:9,title:"Integration",desc:"Connect to AWS/GCP/Azure for automated control evidence. Link GitHub/GitLab for change management evidence.",code:`# AWS integration (read-only)\ncurl -X POST .../v1/integrations/aws \\\n  -d '{"access_key_id":"...","secret_access_key":"...","region":"us-east-1"}'\n\n# GitHub integration\ncurl -X POST .../v1/integrations/github \\\n  -d '{"token":"ghp_...","org":"your-org"}'`,color:"#16a34a"},
              {step:10,title:"License Status",desc:"Monitor license expiry. Compliance enters 4-hour grace on validation failure.",code:`curl http://localhost:8093/health | jq .license\n# Renew: https://axto.io/renew`,color:"#16a34a"},
              {step:11,title:"Troubleshooting",desc:"Common Compliance deployment issues.",code:`# Evidence not collecting → check cloud integration credentials\n# Gap analysis timeout → reduce framework scope initially\n# 503 on endpoints → license expired, renew\n# Missing controls → verify framework list in compliance.yml\ndocker compose -f compliance-compose.yml logs compliance`,color:"#16a34a"},
            ].map((s,i)=>(<div key={i} style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",marginBottom:16,overflow:"hidden",transition:"all 0.3s ease"}}><div style={{padding:"14px 20px",background:`${s.color}10`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}><div style={{width:28,height:28,borderRadius:8,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:12}}>{s.step}</div><span style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>{s.title}</span><span style={{marginLeft:"auto",fontSize:11,color:"#94a3b8",fontWeight:600}}>Step {s.step} of 11</span></div><div style={{padding:"16px 20px"}}><p style={{margin:"0 0 12px",fontSize:13,color:"#64748b",lineHeight:1.7}}>{s.desc}</p><pre style={{margin:0,padding:"14px 16px",background:"#0a1628",fontSize:11,color:"#86efac",overflow:"auto",lineHeight:1.8,borderRadius:10,fontFamily:"'JetBrains Mono',monospace"}}>{s.code}</pre></div></div>))}
          </div>
        )}

        {/* ════ SENTINEL ═══════════════════════════════════════════════════════ */}
        {section==="sentinel"&&(
          <div style={{maxWidth:860}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#ca8a04,#d97706)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📡</div>
              <div>
                <h1 style={{fontSize:24,fontWeight:900,color:"#0a1628",margin:0}}>AXTO Sentinel — IoT/OT Security Platform</h1>
                <p style={{color:"#64748b",fontSize:13,margin:0}}>Passive industrial network monitoring. ICS/SCADA visibility without agents. Self-hosted.</p>
              </div>
            </div>
            {[
              {step:1,title:"Purchase & Download",desc:"Purchase Sentinel license at axto.io/buy. Navigate to Portal → Downloads → sentinel-core.",code:`docker load < sentinel-core-1.1.0.tar.gz`,color:"#ca8a04"},
              {step:2,title:"Server Requirements",desc:"Minimum: 4 CPU cores, 8 GB RAM, 100 GB disk. Docker 24+. Port 8095. Network interface with access to OT network segment (mirrored port or TAP).",code:`# Verify network interface visibility\nip link show\n# Identify interface connected to OT network mirror port`,color:"#ca8a04"},
              {step:3,title:"Configure sentinel.yml",desc:"Set license key, network interface for passive monitoring, and industrial protocol settings.",code:`sentinel:\n  license_key: "SNTL-XXXX-XXXX-XXXX-XXXXXXXXXXXX"\n  api_key: "your-strong-api-key"\n  db_path: "/sentinel/data/sentinel.db"\n  monitor_interface: "eth1"  # Mirror/TAP interface\n  protocols: ["modbus","dnp3","ethernet_ip","profinet","bacnet"]\n  asset_discovery: true\n  alert_retention_days: 90\n\nai_pool:\n  vendors:\n    - provider: openai\n      api_key: "sk-..."   # YOUR key\n      model: "gpt-4o-mini"`,color:"#ca8a04"},
              {step:4,title:"First Start",desc:"Launch Sentinel. Asset discovery begins passively on startup — no traffic generated into OT network.",code:`docker compose -f sentinel-compose.yml up -d\ndocker compose -f sentinel-compose.yml logs -f sentinel`,color:"#ca8a04"},
              {step:5,title:"Verify — /health",desc:"Confirm service health, license, and interface capture active.",code:`curl http://localhost:8095/health | jq .\n# status: "ok", license.valid: true, capture_active: true`,color:"#ca8a04"},
              {step:6,title:"First Asset Discovery",desc:"Check automatically discovered OT assets after 5–10 minutes of passive monitoring.",code:`curl http://localhost:8095/v1/assets \\\n  -H "X-Sentinel-Key: your-api-key" | jq .\n# Returns: [{device_type, vendor, model, firmware, ip, last_seen}]`,color:"#ca8a04"},
              {step:7,title:"Dashboard Walkthrough",desc:"Dashboard → Sentinel: Network Map shows visual topology of all discovered OT assets grouped by Purdue level. Assets tab lists all devices with CVE exposure. Alerts tab shows protocol anomalies and threat detections. Vulnerabilities tab shows CVEs by device with severity.",code:`curl http://localhost:8095/v1/dashboard \\\n  -H "X-Sentinel-Key: your-api-key" | jq .`,color:"#ca8a04"},
              {step:8,title:"API Usage",desc:"Key endpoints for asset management, alerts, and vulnerability tracking.",code:`# List assets with CVE count\ncurl ".../v1/assets?has_cves=true"\n\n# Protocol anomaly alerts\ncurl ".../v1/alerts?type=protocol_anomaly"\n\n# Purdue model violations\ncurl ".../v1/topology/violations"`,color:"#ca8a04"},
              {step:9,title:"Integration",desc:"Forward Sentinel alerts to AXTO SOC for unified IT/OT visibility. Export to SIEM via syslog or REST.",code:`# Forward to AXTO SOC\nsentinel:\n  siem_forward_url: "http://soc:8092/v1/ingest"\n  siem_format: "json_api"\n\n# Syslog forward\nsentinel:\n  syslog_host: "siem.internal"\n  syslog_port: 514`,color:"#ca8a04"},
              {step:10,title:"License Status",desc:"Monitor license. Sentinel enters 4-hour grace on validation failure.",code:`curl http://localhost:8095/health | jq .license\n# Renew: https://axto.io/renew`,color:"#ca8a04"},
              {step:11,title:"Troubleshooting",desc:"Common Sentinel deployment issues.",code:`# No assets discovered → verify monitor_interface in sentinel.yml\n# Check mirror port is configured on your managed switch\n# Capture not active → run container with --network host or --cap-add NET_RAW\n# Protocol not parsed → add to protocols list in sentinel.yml\n# 503 on endpoints → license expired\ndocker compose -f sentinel-compose.yml logs sentinel`,color:"#ca8a04"},
            ].map((s,i)=>(<div key={i} style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",marginBottom:16,overflow:"hidden",transition:"all 0.3s ease"}}><div style={{padding:"14px 20px",background:`${s.color}10`,borderBottom:"1px solid #f1f5f9",display:"flex",gap:12,alignItems:"center"}}><div style={{width:28,height:28,borderRadius:8,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:12}}>{s.step}</div><span style={{fontWeight:800,fontSize:14,color:"#0a1628"}}>{s.title}</span><span style={{marginLeft:"auto",fontSize:11,color:"#94a3b8",fontWeight:600}}>Step {s.step} of 11</span></div><div style={{padding:"16px 20px"}}><p style={{margin:"0 0 12px",fontSize:13,color:"#64748b",lineHeight:1.7}}>{s.desc}</p><pre style={{margin:0,padding:"14px 16px",background:"#0a1628",fontSize:11,color:"#fde68a",overflow:"auto",lineHeight:1.8,borderRadius:10,fontFamily:"'JetBrains Mono',monospace"}}>{s.code}</pre></div></div>))}
          </div>
        )}

      </div>
    </div>
  );
}
