[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO Vault — Complete Client Setup Guide
### AI Privacy Layer | Version 1.0

---

> **Vault transforms your AI integration into a compliance-ready, privacy-first system — in under 5 minutes. Zero infrastructure changes required.**

---

## Table of Contents

1. [What is AXTO Vault?](#what-is-vault)
2. [How It Works](#how-it-works)
3. [Prerequisites](#prerequisites)
4. [Quick Start — 5 Minutes](#quick-start)
5. [Detailed Installation](#detailed-installation)
   - [Docker (Recommended)](#docker-installation)
   - [Windows EXE](#windows-installation)
   - [Linux Bare Metal](#linux-bare-metal)
6. [Configuration Reference](#configuration)
7. [Application Integration](#integration)
   - [Python (OpenAI SDK)](#python)
   - [Node.js / TypeScript](#nodejs)
   - [Anthropic SDK](#anthropic)
   - [REST / cURL](#rest)
   - [Next.js / Vercel Edge](#nextjs)
   - [Laravel / PHP](#php)
   - [Go](#go)
8. [Dashboard & APIs](#dashboard)
9. [Redaction Policies](#policies)
10. [What Gets Redacted](#redaction-reference)
11. [Audit Log & Compliance](#compliance)
12. [Multi-Server Deployment](#multi-server)
13. [Reverse Proxy Setup (Nginx / Caddy)](#reverse-proxy)
14. [Security Hardening](#security)
15. [Monitoring & Alerting](#monitoring)
16. [Troubleshooting](#troubleshooting)
17. [FAQ](#faq)
18. [Support](#support)

---

## 1. What Is AXTO Vault? {#what-is-vault}

AXTO Vault is a **transparent AI privacy proxy**. It sits between your application and any AI provider (OpenAI, Anthropic, Gemini, Groq, Mistral, DeepSeek, Ollama, Azure OpenAI) and automatically:

1. **Intercepts** every AI API request from your application
2. **Redacts** sensitive data (PII, PHI, Financial) by replacing with safe tokens
3. **Forwards** the sanitized request to your chosen AI provider using your own API key
4. **Receives** the AI's response
5. **Re-injects** the original values back into the response
6. **Returns** the full, unredacted response to your application

**Your application and users never notice anything changed.** The AI provider never sees sensitive data.

### Key Principles

| Principle | Detail |
|-----------|--------|
| **100% BYOK** | Your AI API keys stored in vault.yml on your server. AXTO never sees them. |
| **Self-hosted** | Vault runs on your infrastructure. Data never crosses your perimeter. |
| **Zero code change** | Replace `api.openai.com` with your Vault address. That's all. |
| **Compliance-first** | Audit trail for SOC 2, HIPAA, GDPR, PCI-DSS, ISO 27001 included. |
| **Latency-transparent** | Sub-10ms overhead. Regex-first, no external calls during redaction. |

---

## 2. How It Works {#how-it-works}

```
Your App
   │
   │  POST /v1/chat/completions
   │  {"messages": [{"role":"user","content":"Patient John Smith (SSN: 123-45-6789)..."}]}
   │
   ▼
┌─────────────────────────────────────┐
│           AXTO VAULT                │
│                                     │
│  1. Parse messages                  │
│  2. Detect sensitive entities       │
│     → SSN: 123-45-6789              │
│     → Name: John Smith              │
│  3. Replace with tokens             │
│     → [VAULT_SSN_1]                 │
│     → [VAULT_PII_NAME_1]            │
│  4. Store session map:              │
│     [VAULT_SSN_1] → "123-45-6789"   │
│     [VAULT_PII_NAME_1] → "John Smith"│
└───────────────┬─────────────────────┘
                │
                │  POST api.openai.com/v1/chat/completions
                │  {"messages": [{"role":"user","content":"Patient [VAULT_PII_NAME_1] (SSN: [VAULT_SSN_1])..."}]}
                │  Authorization: Bearer sk-YOUR-OWN-KEY
                │
                ▼
         AI PROVIDER (OpenAI, etc.)
         [sees only safe tokens, not real data]
                │
                │  Response with tokens
                │
                ▼
┌─────────────────────────────────────┐
│           AXTO VAULT                │
│                                     │
│  5. Receive AI response             │
│  6. Re-inject from session map      │
│     [VAULT_SSN_1] → "123-45-6789"   │
│     [VAULT_PII_NAME_1] → "John Smith"│
│  7. Log to audit trail (masked)     │
└───────────────┬─────────────────────┘
                │
                │  Response with ORIGINAL values restored
                │
                ▼
Your App (receives full response as normal)
```

---

## 3. Prerequisites {#prerequisites}

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Linux (Ubuntu 20.04+), Windows 10/11 | Ubuntu 22.04 LTS |
| Docker | 20.10+ | 24.0+ with Docker Compose v2 |
| RAM | 512 MB | 1 GB |
| Disk | 1 GB | 5 GB (for audit logs) |
| CPU | 1 core | 2+ cores |
| AI API Key | At least 1 provider | Multiple for redundancy |
| License Key | Required (from axto.io/portal) | — |
| Network | Outbound to AI provider only | — |

**You do NOT need:**
- PostgreSQL / Redis (SQLite included)
- Additional cloud services
- Static IP address
- Domain name (can use IP)

---

## 4. Quick Start — 5 Minutes {#quick-start}

### Step 1 — Download from portal

```
https://axto.io/portal → Licenses → Download → Docker (Linux)
```

### Step 2 — Extract

```bash
mkdir axto-vault && cd axto-vault
unzip vault-package.zip
# Contents: vault-compose.yml, vault.yml, vault-core.tar.gz
```

### Step 3 — Load Docker image

```bash
docker load < vault-core.tar.gz
# Output: Loaded image: axto/vault-core:latest
```

### Step 4 — Configure vault.yml

Open `vault.yml` and fill in:

```yaml
vault:
  license_key: "VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX"  # Your key from portal
  ai_pool:
    vendors:
      - provider: openai
        api_key: "sk-YOUR-OPENAI-API-KEY"
        default_model: "gpt-4o-mini"
```

### Step 5 — Start

```bash
docker compose -f vault-compose.yml up -d
```

### Step 6 — Verify

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "ok",
  "product": "vault",
  "version": "1.0.0",
  "license": "starter",
  "valid": true,
  "stats": {
    "requests_today": 0,
    "redactions_today": 0,
    "providers_active": 1,
    "policies_active": 1
  }
}
```

### Step 7 — Point your app to Vault

Change ONE line in your application:

```python
# Before:
client = OpenAI(api_key="sk-...")

# After:
client = OpenAI(api_key="anything", base_url="http://YOUR_SERVER_IP:8080/v1")
```

**Done.** Every AI request is now protected.

---

## 5. Detailed Installation {#detailed-installation}

### Docker Installation {#docker-installation}

**docker-compose.yml** (production-ready):

```yaml
version: "3.9"

services:
  vault-core:
    image: axto/vault-core:latest
    container_name: vault-core
    restart: unless-stopped
    ports:
      - "8080:8080"   # Change to "127.0.0.1:8080:8080" behind nginx
    volumes:
      - ./vault.yml:/vault/config/vault.yml:ro
      - vault-data:/vault/data
      - vault-logs:/vault/logs
    environment:
      - VAULT_CONFIG=/vault/config/vault.yml
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

volumes:
  vault-data:    # Stores license key, policies, SQLite audit DB
  vault-logs:    # Application logs

# Optional: Add to existing network
# networks:
#   default:
#     external: true
#     name: your-app-network
```

**Commands:**

```bash
# Start
docker compose -f vault-compose.yml up -d

# View logs
docker logs -f vault-core

# Stop
docker compose -f vault-compose.yml down

# Update (after pulling new image)
docker compose -f vault-compose.yml pull
docker compose -f vault-compose.yml up -d --force-recreate

# Backup audit data
docker run --rm -v vault-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/vault-backup-$(date +%Y%m%d).tar.gz -C /data .
```

---

### Windows Installation {#windows-installation}

1. **Download** `vault-core-windows.exe` from your portal
2. **Install Docker Desktop** (https://docs.docker.com/desktop/install/windows-install/)
3. **Enable WSL 2** backend in Docker Desktop settings
4. **Create `vault.yml`** in the same directory as the EXE
5. **Double-click** `vault-core-windows.exe` — it loads the Docker image automatically
6. **Open** http://localhost:8080 — enter your license key
7. Your Vault is running at `http://localhost:8080`

**To run as Windows Service:**

```powershell
# Using NSSM (https://nssm.cc/download)
nssm install "AXTO Vault" "C:\axto-vault\vault-core-windows.exe"
nssm set "AXTO Vault" AppDirectory "C:\axto-vault"
nssm start "AXTO Vault"
```

---

### Linux Bare Metal {#linux-bare-metal}

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# 2. Extract vault package
mkdir /opt/axto-vault && cd /opt/axto-vault
unzip vault-package.zip

# 3. Load image
docker load < vault-core.tar.gz

# 4. Configure
nano vault.yml  # Add your license key and AI API key

# 5. Start
docker compose -f vault-compose.yml up -d

# 6. Configure systemd (auto-start on reboot)
sudo systemctl enable docker
docker update --restart unless-stopped vault-core
```

---

## 6. Configuration Reference {#configuration}

### vault.yml — All Options

```yaml
vault:
  # ── License (required) ─────────────────────────────────
  license_key: "VAULT-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  license_validate_url: "https://axto.io/api/license-validate"

  # ── AI Vendor Pool (BYOK — required, at least 1) ───────
  ai_pool:
    vendors:

      # OpenAI
      - provider: openai
        api_key: "sk-YOUR-KEY"
        default_model: "gpt-4o-mini"

      # Anthropic Claude (optional — add for per-project routing)
      # - provider: anthropic
      #   api_key: "sk-ant-YOUR-KEY"
      #   default_model: "claude-haiku-4-5-20251001"

      # Google Gemini
      # - provider: gemini
      #   api_key: "AIza-YOUR-KEY"
      #   default_model: "gemini-2.0-flash"

      # Groq (ultra-fast, cheap)
      # - provider: groq
      #   api_key: "gsk_YOUR-KEY"
      #   default_model: "llama-3.1-8b-instant"

      # Mistral
      # - provider: mistral
      #   api_key: "YOUR-KEY"
      #   default_model: "mistral-small-latest"

      # DeepSeek (great reasoning, low cost)
      # - provider: deepseek
      #   api_key: "sk-YOUR-KEY"
      #   default_model: "deepseek-chat"

      # Ollama (local, free — no internet needed)
      # - provider: ollama
      #   base_url: "http://ollama:11434"
      #   default_model: "llama3"

      # Azure OpenAI
      # - provider: azure
      #   api_key: "YOUR-AZURE-KEY"
      #   base_url: "https://YOUR_RESOURCE.openai.azure.com"
      #   default_model: "gpt-4o"

  # ── Storage ──────────────────────────────────────────────
  data_dir: /vault/data       # License key, policies, audit DB
  log_dir:  /vault/logs       # Application logs

  # ── Audit Settings ───────────────────────────────────────
  # audit_store_originals: false  # NEVER enable — stores real PII (privacy risk!)
  # audit_retention_days: 90      # How long to keep audit logs

  # ── Rate Limiting ────────────────────────────────────────
  # rate_limit_per_minute: 0      # 0 = unlimited

  # ── Server ───────────────────────────────────────────────
  # api_host: "0.0.0.0"
  # api_port: 8080
  # heartbeat_interval: 3600      # License check interval (seconds)
```

---

## 7. Application Integration {#integration}

### Python (OpenAI SDK) {#python}

```python
from openai import OpenAI

# Simply change base_url to your Vault server
client = OpenAI(
    api_key="anything",  # Vault uses your vault.yml key — this is ignored
    base_url="http://YOUR_VAULT_SERVER:8080/v1",
)

# Use exactly as before — no other code changes needed
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user",   "content": "Summarize this customer record: John Smith, DOB: 1985-03-15, Email: john@example.com"},
    ]
)

print(response.choices[0].message.content)
# AI received: "...customer record: [VAULT_PII_NAME_1], DOB: [VAULT_DOB_1], Email: [VAULT_EMAIL_1]"
# You receive: response with full names/emails re-injected

# Optional: Route to specific policy via project_id
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[...],
    extra_body={"project_id": "healthcare-strict"},  # Vault policy name
)
```

**Environment-based configuration:**

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "vault-proxy"),
    base_url=os.getenv("AI_BASE_URL", "http://vault:8080/v1"),
)
```

`.env` file:
```
AI_BASE_URL=http://your-vault:8080/v1
OPENAI_API_KEY=vault-proxy
```

### Node.js / TypeScript {#nodejs}

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey:  process.env.AI_API_KEY  || "vault-proxy",
  baseURL: process.env.AI_BASE_URL || "http://your-vault:8080/v1",
});

const response = await client.chat.completions.create({
  model:    "gpt-4o-mini",
  messages: [{ role: "user", content: "..." }],
});
```

**Next.js API route:**

```typescript
// app/api/chat/route.ts
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({
  apiKey:  "vault-proxy",
  baseURL: process.env.VAULT_URL || "http://vault:8080/v1",
});

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });
  return NextResponse.json(response);
}
```

### Anthropic SDK {#anthropic}

```python
import anthropic

# Point Anthropic SDK to Vault
client = anthropic.Anthropic(
    api_key="anything",
    base_url="http://YOUR_VAULT_SERVER:8080",
)

message = client.messages.create(
    model="claude-haiku-4-5-20251001",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Patient record: Jane Doe, DOB 1990-01-01"}],
)
print(message.content[0].text)
```

### REST / cURL {#rest}

```bash
# Standard OpenAI-compatible call
curl http://YOUR_VAULT_SERVER:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Summarize: SSN 123-45-6789, Card 4532-1234-5678-9012"}
    ]
  }'

# With policy routing
curl http://YOUR_VAULT_SERVER:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-Vault-Project: healthcare-policy" \
  -d '{"model":"gpt-4o-mini","messages":[...]}'
```

### PHP / Laravel {#php}

```php
<?php
// config/services.php
return [
    'openai' => [
        'key'  => 'vault-proxy',
        'url'  => env('VAULT_URL', 'http://vault:8080/v1'),
    ],
];

// Using openai-php/client
use OpenAI;
$client = OpenAI::factory()
    ->withApiKey('vault-proxy')
    ->withBaseUri(config('services.openai.url'))
    ->make();
```

### Go {#go}

```go
package main

import (
    "context"
    "github.com/sashabaranov/go-openai"
)

func main() {
    config := openai.DefaultConfig("vault-proxy")
    config.BaseURL = "http://your-vault:8080/v1"
    client := openai.NewClientWithConfig(config)

    resp, err := client.CreateChatCompletion(context.Background(),
        openai.ChatCompletionRequest{
            Model: openai.GPT4oMini,
            Messages: []openai.ChatCompletionMessage{
                {Role: "user", Content: "SSN: 123-45-6789"},
            },
        },
    )
    // ...
}
```

---

## 8. Dashboard & APIs {#dashboard}

| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | Activation wizard (first run only) |
| `/health` | GET | Health check, stats, license status |
| `/vault/test` | POST | Test redaction without forwarding to AI |
| `/vault/stats` | GET | Aggregated redaction statistics |
| `/vault/stats/timeline` | GET | Daily stats (last 7 days by default) |
| `/vault/audit` | GET | Audit log (paginated, filter by project) |
| `/vault/audit/{id}/redactions` | GET | Redactions for a specific request |
| `/vault/policies` | GET/POST | List / create redaction policies |
| `/vault/policies/{id}` | GET/PUT/DELETE | Get / update / delete policy |
| `/vault/providers` | GET | List configured AI providers + stats |
| `/vault/providers/test` | POST | Test provider connectivity |
| `/support` | GET | AI support chat interface |
| `/ws/audit` | WebSocket | Real-time audit event stream |
| `/v1/chat/completions` | POST | OpenAI-compatible proxy |
| `/v1/messages` | POST | Anthropic-compatible proxy |
| `/v1/{path}` | ANY | Generic OpenAI passthrough |

---

## 9. Redaction Policies {#policies}

Create per-project policies for granular control:

```bash
# Create a healthcare policy
curl -X POST http://localhost:8080/vault/policies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Healthcare Strict",
    "description": "Full PHI/PII protection for EHR integration",
    "redact_pii": true,
    "redact_phi": true,
    "redact_financial": false,
    "whitelist_domains": ["our-hospital.com"],
    "ai_provider": "anthropic",
    "ai_model": "claude-haiku-4-5-20251001",
    "redact_custom_patterns": [
      "(?i)patient\\s+id[:\\s]+[A-Z0-9-]{6,20}",
      "(?i)bed\\s+number[:\\s]+\\d+"
    ]
  }'
```

**Use in requests:**

```python
# Via project_id field
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[...],
    extra_body={"project_id": "Healthcare Strict"}
)

# Or via header
headers = {"X-Vault-Project": "Healthcare Strict"}
```

---

## 10. What Gets Redacted {#redaction-reference}

### PII Patterns (50+)

| Data Type | Example Input | Token |
|-----------|--------------|-------|
| Email | `john@example.com` | `[VAULT_EMAIL_1]` |
| Phone | `+1-800-555-0123` | `[VAULT_PHONE_1]` |
| SSN (US) | `123-45-6789` | `[VAULT_SSN_1]` |
| Passport | `P1234567` | `[VAULT_PASSPORT_1]` |
| National ID (KTP) | `3201234567890001` | `[VAULT_NATIONAL_ID_1]` |
| IP Address | `192.168.1.100` | `[VAULT_IP_ADDRESS_1]` |
| MAC Address | `AA:BB:CC:DD:EE:FF` | `[VAULT_MAC_ADDRESS_1]` |
| URL with credentials | `https://user:pass@host` | `[VAULT_URL_CREDENTIALS_1]` |
| Street address | `123 Main Street` | `[VAULT_ADDRESS_1]` |
| Date of birth (in context) | `born: 1985-03-15` | `[VAULT_DOB_1]` |
| Name (in context) | `patient: John Smith` | `[VAULT_PII_NAME_1]` |

### PHI Patterns (HIPAA-grade)

| Data Type | Example Input | Token |
|-----------|--------------|-------|
| Medical record # | `MRN: 123456` | `[VAULT_MRN_1]` |
| ICD code | `E11.9` | `[VAULT_ICD_CODE_1]` |
| Lab value | `glucose 126 mg/dL` | `[VAULT_LAB_VALUE_1]` |
| Insurance ID | `policy: AB123456789` | `[VAULT_INSURANCE_ID_1]` |
| Medication + dosage | `500mg Metformin` | `[VAULT_MEDICATION_DOSAGE_1]` |
| Blood type | `blood type: A+` | `[VAULT_BLOOD_TYPE_1]` |

### Financial Patterns

| Data Type | Example Input | Token |
|-----------|--------------|-------|
| Credit card | `4532-1234-5678-9012` | `[VAULT_CREDIT_CARD_1]` |
| IBAN | `GB29NWBK60161331926819` | `[VAULT_IBAN_1]` |
| Bank account | `account: 12345678` | `[VAULT_BANK_ACCOUNT_1]` |
| API key | `sk-abc123...` | `[VAULT_API_KEY_1]` |
| Crypto wallet | `0x742d35Cc6634C05...` | `[VAULT_CRYPTO_WALLET_1]` |
| Tax ID (NPWP) | `12.345.678.9-012.345` | `[VAULT_TAX_ID_1]` |
| EIN | `12-3456789` | `[VAULT_EIN_1]` |

---

## 11. Audit Log & Compliance {#compliance}

```bash
# View recent audit log
curl "http://localhost:8080/vault/audit?limit=20"

# Filter by project
curl "http://localhost:8080/vault/audit?project_id=Healthcare Strict&limit=50"

# Get redaction details for a specific request
curl "http://localhost:8080/vault/audit/REQ_ID_HERE/redactions"

# Get statistics
curl "http://localhost:8080/vault/stats"

# Get 30-day timeline
curl "http://localhost:8080/vault/stats/timeline?days=30"
```

**Compliance standards covered:**

| Standard | What Vault Provides |
|----------|-------------------|
| HIPAA | PHI redaction, audit trail with access logging, policy management |
| GDPR | PII redaction, audit trail, policy-based processing records |
| SOC 2 | Audit log, access controls, change management via policies |
| PCI-DSS | Card/financial data redaction, audit trail |
| ISO 27001 | Data classification, audit trail, policy enforcement |
| PDPA (SEA) | Personal data protection, audit trail |

---

## 12. Multi-Server Deployment {#multi-server}

For high availability, run multiple Vault instances behind a load balancer:

```yaml
# Load balancer (Nginx)
upstream vault_cluster {
    least_conn;
    server vault-1:8080;
    server vault-2:8080;
    server vault-3:8080;
}

server {
    listen 443 ssl;
    location / {
        proxy_pass http://vault_cluster;
    }
}
```

**Important:** All Vault instances must share the same `vault-data` volume (or NFS mount) for consistent audit logs and session consistency.

---

## 13. Reverse Proxy Setup {#reverse-proxy}

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name vault.yourdomain.com;

    ssl_certificate     /etc/nginx/certs/vault.crt;
    ssl_certificate_key /etc/nginx/certs/vault.key;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_read_timeout 300s;
        client_max_body_size 10M;
    }
}
```

### Caddy

```
vault.yourdomain.com {
    reverse_proxy localhost:8080
}
```

---

## 14. Security Hardening {#security}

```yaml
# Bind to localhost only (behind nginx)
environment:
  - VAULT_API_HOST=127.0.0.1

# Or restrict in Docker
ports:
  - "127.0.0.1:8080:8080"
```

**Firewall rules:**

```bash
# Allow only your app server to reach Vault
ufw allow from YOUR_APP_SERVER_IP to any port 8080
ufw deny 8080
```

**vault.yml security:**

```bash
# Restrict file permissions
chmod 600 vault.yml
chown root:root vault.yml
```

---

## 15. Monitoring {#monitoring}

```bash
# Health check (use in your monitoring system)
curl -sf http://vault:8080/health | jq .valid

# Prometheus-compatible (add to your scrape config)
# /health returns JSON — use json_exporter or similar

# Docker health
docker inspect --format='{{.State.Health.Status}}' vault-core
```

---

## 16. Troubleshooting {#troubleshooting}

**License error (402):**
```bash
curl http://localhost:8080/health | jq .valid
# If false: check license_key in vault.yml, verify internet connectivity
docker logs vault-core | grep "license"
```

**Provider error (502):**
```bash
# Test your AI provider connection
curl -X POST http://localhost:8080/vault/providers/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}'
```

**Redaction not working:**
```bash
# Test redaction without forwarding to AI
curl -X POST http://localhost:8080/vault/test \
  -H "Content-Type: application/json" \
  -d '{"text": "My email is test@example.com"}'
```

**Logs:**
```bash
docker logs -f vault-core
docker logs vault-core --since 1h
```

**Reset activation:**
```bash
docker exec vault-core rm /vault/data/license.key
docker restart vault-core
# Vault returns to activation wizard
```

---

## 17. FAQ {#faq}

**Q: Does Vault slow down my AI requests?**
A: Less than 10ms overhead. The regex engine runs in memory — no external service calls during redaction.

**Q: What if Vault is down? Does my app break?**
A: Yes — Vault is in the request path. For production, run multiple instances behind a load balancer, or implement a fallback in your app.

**Q: Does Vault store my original data?**
A: No. Audit logs store only masked versions (first 2 + last 2 chars). The `audit_store_originals` option is disabled by default and should never be enabled.

**Q: Can I use Vault with streaming responses?**
A: v1.0 supports standard (non-streaming) requests. Streaming support is on the roadmap.

**Q: Does Vault support vision / multi-modal requests?**
A: Yes — Vault redacts text parts of multi-modal content. Image data is passed through unmodified.

**Q: What happens if a redaction token appears in the response (e.g., the AI says "[VAULT_EMAIL_1]")?**
A: Vault re-injects the original value. The token is replaced throughout the entire response JSON.

**Q: Can I whitelist certain domains or names from redaction?**
A: Yes — use `whitelist_domains` in your policy. E.g., `["axto.io", "our-company.com"]`.

---

## 18. Support {#support}

| Channel | Details |
|---------|---------|
| **AI Support Chat** | http://YOUR_VAULT_SERVER:8080/support |
| **Portal** | https://axto.io/portal |
| **Email** | hello@axto.io |
| **Guide** | https://axto.io/guide |
| **Health API** | http://YOUR_VAULT_SERVER:8080/health |

---

*© AXTO Platform — AI eXecution & Tools Orchestration*
*100% BYOK — Your keys, your data, your infrastructure. Built for enterprises that take privacy seriously.*
