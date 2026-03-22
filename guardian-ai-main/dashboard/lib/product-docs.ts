/**
 * AXTO Product Documentation — Interactive Guides
 * Replaces human SLA support. Every menu, every function, explained.
 */

export interface DocSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  content: string; // markdown-like content
}

export interface ProductDoc {
  product: string;
  name: string;
  icon: string;
  description: string;
  quickStart: string;
  sections: DocSection[];
}

// ═══════════════════════════════════════════════════════════════
// GUARDIAN AI DOCUMENTATION
// ═══════════════════════════════════════════════════════════════

export const GUARDIAN_DOCS: ProductDoc = {
  product: "guardian",
  name: "Guardian AI",
  icon: "🛡️",
  description: "AI-powered cybersecurity engine for server protection",
  quickStart: `1. Download docker-compose.yml from your portal
2. Edit guardian.yml → paste your license key
3. Run: docker compose up -d
4. Open http://your-server:8080 → Guardian Dashboard
5. Guardian will automatically start scanning your server`,
  sections: [
    // ── DASHBOARD ──
    {
      id: "dashboard",
      title: "Dashboard Overview",
      icon: "📊",
      description: "Real-time security status and threat overview",
      content: `The Dashboard is your security command center. It shows:

• **Threat Score** — Overall security health (0-100). Green = safe, Yellow = attention needed, Red = critical threats detected.
• **Active Threats** — Number of currently active/unresolved threats. Click to see details.
• **Scans Today** — How many files and processes were scanned in the last 24 hours.
• **Blocked Attacks** — Total attacks blocked (brute force, malware, intrusion attempts).
• **System Resources** — CPU, Memory, Disk usage of the Guardian engine itself.
• **Recent Events Timeline** — Last 50 security events in chronological order.
• **Threat Map** — Geographic visualization of attack origins (if IP geolocation is enabled).

**What to do:**
- If Threat Score drops below 70, check Active Threats immediately
- Green badges = system is healthy and protected
- Click any metric to drill down into details`
    },
    // ── FILE SCANNER ──
    {
      id: "file-scanner",
      title: "File Scanner",
      icon: "📁",
      description: "7-layer malware detection engine",
      content: `Guardian's File Scanner uses 7 detection layers:

**Layer 1 — Hash Lookup**: Compares file hashes against known malware databases (updated hourly).
**Layer 2 — Magic Bytes**: Checks file headers to detect disguised executables (e.g., .jpg that's actually .exe).
**Layer 3 — Entropy Analysis**: High-entropy files may be encrypted/packed malware.
**Layer 4 — Binary Signatures**: Scans for known malicious byte patterns in executables.
**Layer 5 — YARA-like Patterns**: Custom pattern matching for web shells, backdoors, crypto miners.
**Layer 6 — AI Deep Scan**: Neural network analysis for zero-day and polymorphic malware.
**Layer 7 — Behavioral Analysis**: Monitors what files DO, not just what they ARE.

**Menu Options:**
- **Scan Now** — Trigger immediate full scan of specified directory
- **Scan History** — View all past scan results with findings
- **Quarantine** — Isolated malicious files (can restore if false positive)
- **Whitelist** — Exclude specific files/paths from scanning
- **Schedule** — Set automatic scan intervals (hourly, daily, weekly)
- **Settings** — Configure scan depth, file size limits, excluded extensions`
    },
    // ── PROCESS MONITOR ──
    {
      id: "process-monitor",
      title: "Process Monitor",
      icon: "⚙️",
      description: "Real-time process tracking and anomaly detection",
      content: `Monitors every running process on your server in real-time.

**Features:**
- **Process List** — All running processes with PID, user, CPU%, memory, start time
- **Process Tree** — Parent-child relationship visualization
- **Anomaly Detection** — AI flags unusual processes (unknown executables, privilege escalation, unusual resource usage)
- **Auto-Kill** — Automatically terminate processes matching threat rules
- **History** — Historical process timeline for forensic analysis

**Alert Types:**
- 🔴 **Critical**: Unknown process running as root, process injection detected
- 🟡 **Warning**: High CPU usage by unknown process, suspicious child process spawning
- 🟢 **Info**: New legitimate process started, process terminated normally

**What to do when alert fires:**
1. Click the alert to see process details
2. Check the process path — is it a known application?
3. If suspicious: click "Kill Process" → Guardian quarantines it
4. If legitimate: click "Whitelist" to prevent future alerts`
    },
    // ── NETWORK MONITOR ──
    {
      id: "network-monitor",
      title: "Network Monitor",
      icon: "🌐",
      description: "Inbound/outbound traffic analysis and firewall",
      content: `Monitors all network connections to and from your server.

**Tabs:**
- **Live Connections** — All active TCP/UDP connections with remote IP, port, state, bytes transferred
- **Blocked IPs** — IPs that Guardian has auto-blocked (brute force, scan attempts, known malicious)
- **DNS Queries** — All DNS lookups made by your server (detects C2 callbacks, DNS tunneling)
- **Bandwidth** — Real-time bandwidth usage by process/connection
- **Firewall Rules** — Custom allow/deny rules you can add

**Auto-Protection:**
- Brute force detection: 5+ failed SSH/FTP logins → IP blocked for 24 hours
- Port scan detection: Sequential port probing → IP blocked permanently
- C2 detection: Connection to known command-and-control domains → blocked + alert
- Data exfiltration: Unusual large outbound transfers → flagged + alert

**Manual Actions:**
- Block IP: Click any connection → "Block IP" (temporary or permanent)
- Whitelist IP: Add trusted IPs that should never be blocked
- Export: Download connection logs as CSV for SIEM integration`
    },
    // ── FIM (File Integrity) ──
    {
      id: "fim",
      title: "File Integrity Monitor (FIM)",
      icon: "🔒",
      description: "Detect unauthorized file changes",
      content: `Tracks changes to critical system files and directories.

**How it works:**
1. Guardian creates a baseline hash (SHA-256) of all monitored files
2. Periodically re-scans and compares hashes
3. Any change triggers an alert with exact diff

**Default monitored paths:**
- /etc/ (system configuration)
- /usr/bin/, /usr/sbin/ (system binaries)
- /var/www/ (web content — detects defacement)
- /root/.ssh/ (SSH keys — detects unauthorized access)
- Custom paths you configure

**Alert Details Show:**
- Which file changed
- Old hash vs new hash
- Timestamp of change
- Which user/process made the change (if available)
- Diff view (what exactly changed)

**Menu Options:**
- **Baseline** — Create/update the baseline snapshot
- **Monitored Paths** — Add or remove paths to watch
- **Alerts** — View all detected changes
- **Compliance** — Generate FIM report for SOC2/ISO auditors`
    },
    // ── COMPLIANCE ──
    {
      id: "compliance",
      title: "Compliance Reports",
      icon: "📋",
      description: "Auto-generated audit reports for SOC2, ISO 27001, PCI-DSS",
      content: `One-click compliance report generation.

**Supported Frameworks:**
- **SOC 2 Type II** — Service Organization Control (access, availability, security)
- **ISO 27001** — Information Security Management System
- **PCI-DSS** — Payment Card Industry Data Security Standard
- **HIPAA** — Health Insurance Portability (healthcare data)
- **GDPR** — General Data Protection Regulation (EU data privacy)

**Each report includes:**
- Audit trail summary (who accessed what, when)
- Security incident log (detections, responses, resolutions)
- File integrity status
- Access control review
- Network security posture
- Vulnerability assessment results

**How to use:**
1. Go to Compliance tab
2. Select framework (e.g., SOC 2)
3. Select date range
4. Click "Generate Report"
5. Download PDF — ready for your auditor`
    },
    // ── SETTINGS ──
    {
      id: "settings",
      title: "Settings & Configuration",
      icon: "⚙️",
      description: "License, alerts, integrations, and system config",
      content: `**License:**
- View license key, expiry, and server binding
- Reset machine binding (if you moved servers)

**Alert Channels:**
- Email — Add email addresses for alerts
- Slack — Paste Slack webhook URL for instant channel notifications
- Discord — Paste Discord webhook URL
- PagerDuty — Integration key for on-call escalation
- Webhook — Any custom HTTP endpoint

**Integrations:**
- SIEM Forward — Send logs to Splunk, ELK, Datadog, QRadar
- Syslog — Forward to syslog server

**System:**
- Update — Check for Guardian engine updates
- Backup — Export configuration
- Logs — View Guardian engine logs
- About — Version info and license details`
    },
  ],
};

// ═══════════════════════════════════════════════════════════════
// ORCHESTRA AI DOCUMENTATION
// ═══════════════════════════════════════════════════════════════

export const ORCHESTRA_DOCS: ProductDoc = {
  product: "orchestra",
  name: "Orchestra AI",
  icon: "⚡",
  description: "AI workflow orchestration — route, manage, and optimize AI workloads",
  quickStart: `1. Download orchestra-compose.yml from your portal
2. Edit orchestra.yml:
   - Paste your license key
   - Add AI provider API keys (OpenAI, Claude, Gemini, etc.)
   - Configure routing strategy
3. Run: docker compose -f orchestra-compose.yml up -d
4. API available at http://your-server:8080/v1/chat/completions
5. Console at http://your-server:8080/console`,
  sections: [
    // ── CONSOLE ──
    {
      id: "console",
      title: "Console Dashboard",
      icon: "📊",
      description: "Real-time AI workload overview",
      content: `The Console is your AI operations center.

**Metrics:**
- **Active Workers** — Number of CPU and GPU workers currently running
- **Queue Depth** — Jobs waiting to be processed
- **Requests/min** — Current throughput
- **Avg Latency** — Average response time across all providers
- **Cost Today** — Running total of API costs for the day
- **Budget Remaining** — How much of your daily budget is left

**Provider Status Panel:**
- Green dot = provider healthy and responding
- Yellow dot = provider slow (latency > threshold)
- Red dot = provider down or returning errors
- Each provider shows: requests served, avg latency, cost, error rate

**What to do:**
- If queue depth is growing → consider adding more workers or switching to faster providers
- If cost is high → switch to cost_first routing strategy
- If a provider is red → Orchestra auto-fails-over, but you may want to check your API key`
    },
    // ── PROVIDERS ──
    {
      id: "providers",
      title: "AI Providers",
      icon: "🤖",
      description: "Configure and manage AI provider connections",
      content: `Add and manage your AI provider API keys.

**Supported Providers:**
- **OpenAI** — GPT-4o, GPT-4o-mini, GPT-3.5 (api_key required)
- **Anthropic Claude** — Claude Sonnet, Claude Haiku (api_key required)
- **Google Gemini** — Gemini Pro, Gemini Flash (api_key required)
- **Groq** — Llama, Mixtral (api_key required, ultra-fast inference)
- **DeepSeek** — DeepSeek Chat, Coder (api_key required)
- **Mistral** — Mistral Large, Medium, Small (api_key required)
- **Ollama** — Local models (no API key needed, runs on your GPU)
- **Custom** — Any OpenAI-compatible endpoint (vLLM, text-generation-inference)

**Per-provider settings:**
- API Key — your provider key (stored locally, never sent to AXTO)
- Base URL — custom endpoint (for self-hosted or proxy)
- Models — which models to enable for routing
- Weight — priority weight for routing decisions
- Max concurrent — rate limit per provider
- Timeout — max seconds to wait for response

**BYOK Guarantee:**
All API keys are stored in orchestra.yml on YOUR server.
AXTO never sees, stores, or transmits your provider API keys.
Only license heartbeat (license_key + machine_id) contacts AXTO servers.`
    },
    // ── ROUTING ──
    {
      id: "routing",
      title: "Routing Strategies",
      icon: "🔀",
      description: "6 intelligent routing modes",
      content: `Orchestra routes each AI request to the optimal provider.

**6 Strategies:**

**1. cost_first** — Always pick the cheapest provider
- Best for: High volume, cost-sensitive workloads
- Trade-off: May use lower-quality models for complex tasks

**2. quality_first** — Always pick the best model
- Best for: Critical tasks requiring highest quality
- Trade-off: Highest cost per request

**3. smart_balance** — Cost × quality optimized
- Best for: Most production workloads
- How it works: Scores each provider on quality and cost, routes to best value
- Recommended as default strategy

**4. round_robin** — Even distribution across all providers
- Best for: Testing, benchmarking, avoiding rate limits
- How it works: Each request goes to next provider in rotation

**5. local_first** — Prefer local GPU, fallback to cloud
- Best for: Privacy-sensitive data, maximizing GPU investment
- How it works: Routes to Ollama/local first, only uses cloud when local is busy

**6. failover** — Cascade through provider priority list
- Best for: Maximum reliability
- How it works: Try provider 1 → if error, try provider 2 → etc.

**Change strategy:**
Edit orchestra.yml → routing.strategy: "smart_balance"
Or via Console → Settings → Routing Strategy dropdown`
    },
    // ── WORKERS ──
    {
      id: "workers",
      title: "Workers (CPU & GPU)",
      icon: "🖥️",
      description: "Manage processing workers",
      content: `Workers are the processes that execute AI jobs.

**Worker Types:**
- **CPU Worker** — Handles API calls to cloud providers (OpenAI, Claude, etc.)
- **GPU Worker** — Runs local models on NVIDIA GPUs (Ollama, vLLM)

**Console Shows:**
- Worker ID, type, status (idle/busy/error)
- Current job being processed
- Jobs completed, errors, uptime
- CPU/GPU/Memory usage per worker

**Autoscaler:**
When enabled, Orchestra automatically:
- Spins up new workers when queue grows
- Scales down when idle (saves resources)
- Respects min/max worker limits you set

**Configuration (orchestra.yml):**
workers:
  cpu_count: 4         # number of CPU workers
  gpu_count: 1         # number of GPU workers (0 if no GPU)
  autoscale: true      # enable autoscaling
  min_workers: 2       # minimum always running
  max_workers: 16      # maximum cap

**GPU Setup:**
- Requires NVIDIA GPU with CUDA drivers
- Install nvidia-container-toolkit
- Use GPU compose: docker compose -f orchestra-compose-gpu.yml up -d`
    },
    // ── JOB QUEUE ──
    {
      id: "job-queue",
      title: "Job Queue",
      icon: "📋",
      description: "View and manage pending AI jobs",
      content: `The Job Queue shows all AI requests being processed.

**Job States:**
- 🟢 **Completed** — Successfully processed and response returned
- 🔵 **Processing** — Currently being handled by a worker
- 🟡 **Queued** — Waiting for an available worker
- 🔴 **Failed** — Error occurred (timeout, provider error, etc.)
- ⚪ **Cancelled** — Manually cancelled or expired

**Job Details:**
- Request ID, timestamp
- Provider used, model
- Input tokens, output tokens
- Latency (ms)
- Cost (USD)
- Error message (if failed)

**Priority Tiers:**
- **High** — Processed first (for real-time user-facing requests)
- **Normal** — Standard processing order
- **Low** — Processed last (for batch/background jobs)
- **Batch** — Accumulated and processed in bulk (cheapest)

Set priority via API header: X-Priority: high|normal|low|batch`
    },
    // ── COST & ANALYTICS ──
    {
      id: "analytics",
      title: "Cost & Analytics",
      icon: "📈",
      description: "Track spending, usage, and performance",
      content: `Comprehensive analytics for your AI operations.

**Cost Dashboard:**
- Daily spend by provider (bar chart)
- Cost per request trend (line chart)
- Provider cost comparison
- Budget usage (% of daily limit)
- Projected monthly cost

**Usage Metrics:**
- Requests per hour/day/week
- Token usage (input vs output)
- Model distribution (which models used most)
- Error rate by provider
- P50/P95/P99 latency

**Budget Controls:**
- daily_budget_usd: 50.0 — hard daily limit
- At 80% → warning alert
- At 100% → switches to cheapest provider or pauses
- Monthly budget tracking

**Export:**
- CSV export for accounting
- Grafana/Datadog integration via webhook
- API endpoint for custom dashboards`
    },
    // ── API REFERENCE ──
    {
      id: "api",
      title: "API Reference",
      icon: "🔌",
      description: "OpenAI-compatible API endpoint",
      content: `Orchestra exposes an OpenAI-compatible API.

**Base URL:** http://your-server:8080

**Chat Completions:**
POST /v1/chat/completions
{
  "model": "auto",  // or specific: "gpt-4o", "claude-sonnet"
  "messages": [{"role": "user", "content": "Hello!"}],
  "temperature": 0.7
}

**Special Headers:**
- X-Priority: high|normal|low|batch
- X-Provider: openai|anthropic|google (force specific provider)
- X-Budget-Max: 0.05 (max cost for this request in USD)

**Model Names:**
- "auto" → Orchestra picks the best model based on routing strategy
- "gpt-4o" → Force OpenAI GPT-4o
- "claude-sonnet" → Force Anthropic Claude Sonnet
- "gemini-pro" → Force Google Gemini Pro
- "local" → Force local Ollama model

**Response** is 100% OpenAI-compatible — drop-in replacement.
Just change your base URL from api.openai.com to your Orchestra server.`
    },
    // ── SETTINGS ──
    {
      id: "settings",
      title: "Settings",
      icon: "⚙️",
      description: "License, routing, alerts, and system config",
      content: `**License:**
- View license key, expiry, server binding
- Worker limit based on your plan

**Routing:**
- Change routing strategy
- Set provider weights
- Configure failover order

**Alerts:**
- Budget threshold alerts
- Provider down alerts
- Queue depth alerts
- Webhook URL for notifications

**System:**
- Update Orchestra engine
- Export/import configuration
- View logs
- API key management`
    },
  ],
};

// ═══════════════════════════════════════════════════════════════
// PRODUCT CATALOG (for portal store)
// ═══════════════════════════════════════════════════════════════

export const PRODUCT_CATALOG = {
  guardian: [
    { code: "guardian_sentinel", name: "Guardian Sentinel", servers: 1, price: 249, priceMonthly: 24, icon: "🟢", description: "1 server protection" },
    { code: "guardian_pro", name: "Guardian Pro", servers: 20, price: 990, priceMonthly: 99, icon: "🔵", description: "Up to 20 servers" },
    { code: "guardian_business", name: "Guardian Business", servers: 100, price: 3990, priceMonthly: 399, icon: "🟣", description: "Up to 100 servers" },
    { code: "guardian_enterprise", name: "Guardian Enterprise", servers: 1000, price: 17900, priceMonthly: 1790, icon: "🔴", description: "Up to 1,000 servers" },
  ],
  orchestra: [
    { code: "orchestra_core", name: "Orchestra Core", workers: 10, price: 9900, priceMonthly: 990, icon: "🟢", description: "10 AI workers" },
    { code: "orchestra_scale", name: "Orchestra Scale", workers: 50, price: 29900, priceMonthly: 2990, icon: "🔵", description: "50 AI workers" },
    { code: "orchestra_unlimited", name: "Orchestra Unlimited", workers: -1, price: 59900, priceMonthly: 5990, icon: "🟣", description: "Unlimited workers" },
  ],
};
