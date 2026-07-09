[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO Platform — Client Setup Guide

Welcome to AXTO. This guide covers everything you need to deploy Guardian AI and Orchestra AI on your infrastructure. Total setup time: under 30 minutes.

---

## Prerequisites

Before you begin, ensure you have:

- A Linux server (Ubuntu 20.04+, Debian 11+, CentOS 8+, or any Docker-compatible OS)
- Docker Engine 20.10+ and Docker Compose v2+
- At least one AI provider API key (OpenAI, Anthropic, Google, Groq, or a local Ollama instance)
- Your AXTO license key (available at https://axto.io/portal after purchase)
- Minimum 2 GB RAM and 10 GB disk space per product

---

## 1. Download Your Package

1. Sign in to your client portal at **https://axto.io/portal**
2. Navigate to the **Licenses** tab
3. Locate your active license and click the **Download** button
4. Select your preferred format:
   - **Docker (Linux)** — recommended for production servers
   - **EXE (Linux)** — standalone binary, no Docker required
   - **EXE (Windows)** — for Windows Server environments
5. Extract the downloaded archive:

```bash
unzip axto-package.zip
cd axto-package
```

The archive contains:
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Guardian AI Docker Compose stack |
| `orchestra-compose.yml` | Orchestra AI Docker Compose stack |
| `guardian.yml` | Guardian AI configuration |
| `orchestra.yml` | Orchestra AI configuration |
| `install.sh` | Automated installer (loads Docker images offline) |
| `README.txt` | Quick-start reference |

---

## 2. Guardian AI — Complete Setup

Guardian AI is your AI-powered cybersecurity engine. It consists of three components:

### 2.1 Architecture Overview

| Component | Container | Role |
|-----------|-----------|------|
| **Guardian Core** | `guardian-core` | Central API server, web dashboard, threat analysis engine, compliance reporting. Always required. |
| **Guardian Node** | `guardian-node` | Agent that runs on each protected server. Scans files, monitors processes, watches network activity, and reports to Core. |
| **Guardian Antivirus** | `guardian-antivirus` | ClamAV-based antivirus engine. Provides signature-based scanning alongside Guardian's AI behavioral analysis. Optional but recommended. |

### 2.2 Configuration

Open `guardian.yml` in any text editor:

```bash
nano guardian.yml
```

Required fields:

```yaml
guardian:
  # Your license key — find it at https://axto.io/portal
  license_key: "GUARDIAN-XXXX-XXXX-XXXX-XXXXXXXXXXXX"

  # Scan mode: "auto" (recommended), "manual", or "off"
  scan_mode: "auto"
  scan_interval: 300  # seconds between automatic scans

  # Directories to monitor (mapped via Docker volumes)
  scan_paths:
    - /host
    - /tmp

  # AI providers — add at least one (BYOK: your keys, your control)
  ai_pool:
    vendors:
      - provider: openai
        api_key: "sk-YOUR-OPENAI-KEY"
        model: "gpt-4o-mini"

      # Optional: add more providers for redundancy
      # - provider: anthropic
      #   api_key: "sk-ant-YOUR-KEY"
      #   model: "claude-haiku-4-5-20251001"
      #
      # - provider: groq
      #   api_key: "gsk_YOUR-KEY"
      #   model: "llama-3.1-8b-instant"
```

### 2.3 Deploy

```bash
# Load Docker images (offline, from the downloaded archive)
sudo bash install.sh

# Start all Guardian services
docker compose up -d

# Verify all containers are running
docker compose ps
```

You should see three healthy containers: `guardian-core`, `guardian-node`, and optionally `guardian-antivirus`.

### 2.4 Activate Your License

1. Open your browser and navigate to `http://YOUR_SERVER_IP:8080`
2. The activation wizard appears automatically on first launch
3. Paste your license key from the portal
4. Click **Activate & Start**
5. You are redirected to the Guardian AI dashboard — all features are now active

### 2.5 Guardian Core — Dashboard Features

Once activated, the Guardian Core dashboard provides:

- **Dashboard** — Real-time security overview: threat score (0–100), active threats, scan count, blocked attacks, system resources, recent events timeline.
- **Threat Scanner (7-Layer)** — Multi-layer malware detection: hash lookup, magic bytes, entropy analysis, binary signatures, YARA-like patterns, AI deep scan, and behavioral analysis. Scan on-demand or on schedule.
- **File Integrity Monitor** — SHA-256 real-time file change tracking. Essential for SOC 2, PCI-DSS, and HIPAA compliance. Monitors critical directories and alerts on unauthorized modifications.
- **Process Monitor** — Tracks all running processes with parent-child hierarchy. Detects privilege escalation, cryptocurrency miners, reverse shells, and unauthorized executables. Auto-kill capability.
- **Network Monitor** — Monitors all inbound and outbound connections. Detects port scans, data exfiltration, lateral movement, and connections to known malicious IPs.
- **DNS Monitor** — Detects DNS tunneling, cache poisoning attempts, connections to command-and-control domains, and domain generation algorithm (DGA) patterns.
- **Quarantine** — Isolated storage for detected threats. View details, restore false positives, permanently delete, or re-analyze suspicious files.
- **Incident Response** — Fully automated workflow: detect threat → kill malicious process → block attacker IP at firewall → quarantine affected file → alert administrator → generate forensic report. Total response time: under 30 seconds.
- **Node Management** — Multi-server management dashboard. Each protected server runs a Guardian Node agent. Your license tier determines the maximum number of nodes.
- **Compliance Reports** — One-click report generation for SOC 2 Type II, ISO 27001, HIPAA, PCI-DSS, and GDPR. Includes audit trails, access logs, and incident summaries.
- **AI Analyst Chat** — BYOK-powered AI security assistant. Ask natural language questions: "What happened at 3 AM?", "Show all SSH failures this week", "Summarize threats from the past 24 hours."
- **Settings** — Configure scan intervals, monitored paths, alert channels (email, Slack, Discord, PagerDuty, webhook), AI provider keys, mTLS certificates, log retention policies, and notification preferences.

### 2.6 Guardian Node — Agent Deployment

Deploy a Guardian Node on each server you want to protect:

```bash
# On the additional server:
docker run -d \
  --name guardian-node \
  --restart unless-stopped \
  --privileged \
  -e GUARDIAN_CORE_URL=http://CORE_SERVER_IP:8080 \
  -e GUARDIAN_NODE_NAME=$(hostname) \
  -v /:/host:ro \
  -v /tmp:/tmp \
  registry.gitlab.com/axto-platform/guardian-ai/guardian-engine:latest \
  python -m src
```

The node automatically registers with Guardian Core and begins scanning.

### 2.7 Guardian Antivirus

The antivirus module runs alongside Guardian Core and provides traditional signature-based scanning via ClamAV, complementing Guardian's AI behavioral analysis:

- Automatic signature database updates (hourly)
- Real-time on-access file scanning
- Scheduled full system scans
- Quarantine integration with Guardian Core
- Supports custom scan rules and exclusion lists

---

## 3. Orchestra AI — Complete Setup

Orchestra AI is your AI orchestration platform. It routes AI workloads across multiple providers with intelligent cost optimization.

### 3.1 Architecture Overview

| Component | Container | Role |
|-----------|-----------|------|
| **Orchestra Core** | `orchestra-core` | Central API server, web console, job router, cost analytics, provider health monitoring. Always required. |
| **Worker CPU** | `orchestra-worker-cpu` | Handles AI requests via cloud API providers (OpenAI, Claude, Gemini, Groq, DeepSeek). No GPU required. |
| **Worker GPU** | `orchestra-worker-gpu` | Runs local AI inference using your NVIDIA GPUs via Ollama or vLLM. Requires NVIDIA GPU + nvidia-docker runtime. |

### 3.2 Configuration

Open `orchestra.yml` in any text editor:

```yaml
orchestra:
  # Your license key
  license_key: "ORCH-XXXX-XXXX-XXXX-XXXX"

  host: "0.0.0.0"
  port: 8080
  log_level: "INFO"

  # Routing strategy
  ai_pool:
    routing_mode: "cost_first"    # Options: cost_first, quality_first,
                                  # smart_balance, round_robin, local_first, failover
    budget_daily_usd: 50.0        # Daily spending cap (0 = unlimited)

    vendors:
      - provider: openai
        api_key: "sk-YOUR-KEY"
        default_model: "gpt-4o-mini"

      # Add more providers for routing diversity:
      # - provider: anthropic
      #   api_key: "sk-ant-YOUR-KEY"
      #   default_model: "claude-haiku-4-5-20251001"
      #
      # - provider: groq
      #   api_key: "gsk_YOUR-KEY"
      #   default_model: "llama-3.1-8b-instant"

  # Worker configuration
  workers:
    cpu:
      enabled: true
      count: 4
      max_queue: 100
    gpu:
      enabled: true
      auto_detect: true

  # Job routing tiers
  tiers:
    light:
      max_tokens: 512
      preferred_vendors: ["groq", "gemini", "deepseek"]
    medium:
      max_tokens: 2048
      preferred_vendors: ["deepseek", "gemini", "openai"]
    heavy:
      max_tokens: 8192
      preferred_vendors: ["anthropic", "openai", "mistral"]
```

### 3.3 Deploy

```bash
docker compose -f orchestra-compose.yml up -d

# Verify
docker compose -f orchestra-compose.yml ps
```

### 3.4 Orchestra Core — Console Features

Access the web console at `http://YOUR_SERVER:8080/console`:

- **Console Dashboard** — Real-time overview: active workers, job queue depth, requests per minute, cost today, provider health status, latency metrics.
- **AI Providers** — Manage connected providers: OpenAI, Anthropic Claude, Google Gemini, Groq, DeepSeek, Mistral, Ollama, and any OpenAI-compatible endpoint. Add, remove, or update API keys at any time.
- **Routing Strategies** — Six intelligent routing modes:
  1. **cost_first** — Routes to the cheapest available provider
  2. **quality_first** — Routes to the highest-quality model
  3. **smart_balance** — Optimizes cost × quality score
  4. **round_robin** — Distributes evenly across all providers
  5. **local_first** — Prefers your local GPUs, falls back to cloud
  6. **failover** — Uses primary provider, cascades on failure
- **Workers (CPU)** — Cloud API workers that process requests through remote providers. Configure: provider, model, concurrency level. Auto-scales based on queue depth.
- **Workers (GPU)** — Local inference workers for NVIDIA GPUs. Runs models via Ollama or vLLM. Zero API cost for locally processed requests. Requires nvidia-docker runtime.
- **Job Queue** — Priority-based queue with three tiers: urgent, normal, and batch. Configurable timeout, retry count, and dead letter queue for failed jobs.
- **Cost Analytics** — Detailed cost tracking per provider, model, and day. Token usage, USD cost, average latency. Daily budget cap with automatic provider switching when nearing the limit.
- **Autoscaler** — Automatically adjusts worker count based on queue depth. Configure: threshold, maximum workers, scale-down delay. Budget-aware scaling prevents cost overruns.
- **API Endpoint** — OpenAI-compatible REST API at `http://YOUR_SERVER:8080/v1/chat/completions`. Drop-in replacement for OpenAI SDK — change only the `base_url` in your application.
- **Webhooks** — Event notifications for: job completed, job failed, worker offline, budget exceeded. Send to Slack, Discord, PagerDuty, or any HTTP endpoint.
- **Settings** — License key management, AI provider keys (BYOK), worker authentication tokens, console password, autoscaler configuration, CORS origins, and log retention.

### 3.5 GPU Worker Setup (Optional)

If you have NVIDIA GPUs:

```bash
# 1. Install nvidia-docker runtime
sudo apt-get install nvidia-docker2
sudo systemctl restart docker

# 2. Uncomment the GPU worker section in orchestra-compose.yml

# 3. Restart Orchestra
docker compose -f orchestra-compose.yml up -d
```

### 3.6 Integrate with Your Application

Orchestra AI exposes an OpenAI-compatible API. Update your application:

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://YOUR_SERVER:8080/v1",  # Orchestra endpoint
    api_key="your-orchestra-api-secret",     # From orchestra.yml
)

response = client.chat.completions.create(
    model="auto",  # Orchestra routes automatically
    messages=[{"role": "user", "content": "Hello, world!"}],
)
print(response.choices[0].message.content)
```

---

## 4. Verification Checklist

After deployment, confirm everything is operational:

```bash
# Guardian AI health check
curl http://localhost:8080/health
# Expected: {"status":"ok","license":"valid","nodes":1}

# Orchestra AI health check
curl http://localhost:8080/health
# Expected: {"status":"ok","license":"valid","workers":4}
```

---

## 5. Support

- **Documentation**: https://axto.io/guide
- **Client Portal**: https://axto.io/portal
- **Email**: hello@axto.io
- **Response time**: Within 24 hours for all plans, 4 hours for Enterprise

---

© AXTO Platform. All rights reserved.
