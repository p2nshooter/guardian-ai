[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# Axto Platform — Complete Production Guide
> Replaces all SLA human support. Everything you need to run, troubleshoot, and scale.

---

## Quick Reference

| Need | Go To |
|------|-------|
| System broken right now | [Emergency Runbooks](#emergency) |
| Install from scratch | [Installation](#install) |
| Configure alerting | [Alerting Setup](#alerting) |
| SIEM integration | [SIEM Config](#siem) |
| Multi-tenant setup | [Multi-Tenant](#multitenant) |
| AI Support Bot | `GET /support/ui` on any node |
| All error codes | `GET /runbook/` API endpoint |
| API reference | `GET /docs` (disabled in prod, use this guide) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AXTO PLATFORM v2                         │
│                                                             │
│  ┌─────────────────┐    ┌───────────────────────────────┐  │
│  │  ORCHESTRA CORE │    │      GUARDIAN ENGINE          │  │
│  │  :7890          │    │      :8080 (Core)             │  │
│  │                 │    │      :8081 (Node agents)      │  │
│  │  AI Job Queue   │    │                               │  │
│  │  Semantic Route │    │  14 Security Monitors         │  │
│  │  Cost Optimize  │    │  Incident Manager (SOAR)      │  │
│  │  Quality Retry  │    │  Threat Intelligence          │  │
│  │  Autoscaler     │    │  ML Anomaly Detection         │  │
│  │  WebSocket Push │    │  Compliance Engine            │  │
│  └────────┬────────┘    │  Alerting (Email/Slack/TG)    │  │
│           │             │  SIEM Forwarder               │  │
│  ┌────────▼────────┐    │  WebSocket Real-time Push     │  │
│  │  CPU Workers    │    │  Threat Hunting Interface     │  │
│  │  GPU Workers    │    │  PDF Report Generator         │  │
│  │  (on-demand)    │    └───────────────────────────────┘  │
│  └─────────────────┘                                        │
│                                                             │
│  Storage: SQLite WAL (per node)  ←  no cloud DB needed      │
│  Dashboard: Cloudflare D1 + Next.js (optional)              │
└─────────────────────────────────────────────────────────────┘
```

---

<a name="install"></a>
## Installation

### Prerequisites
- Docker + Docker Compose v2.x
- 2GB RAM minimum (4GB recommended)
- 10GB disk space
- Port 7890 (Orchestra), 8080 (Guardian), 7891-7892 (Workers)

### 1. Single-node (minimal)
```bash
git clone https://github.com/your-org/axto
cd axto

# Copy and edit config
cp guardian.example.yml guardian.yml
nano guardian.yml  # Add license_key and ai vendors

# Start everything
docker-compose up -d
```

### 2. Verify startup
```bash
# Guardian
curl http://localhost:8080/health

# Orchestra
curl http://localhost:7890/health

# Deep diagnostic (all components)
curl http://localhost:8080/health/deep | python3 -m json.tool
```

### 3. First-time checklist
- [ ] `curl http://localhost:8080/license/info` → valid=true
- [ ] `curl http://localhost:8080/feed/status` → hashes > 1000
- [ ] `curl http://localhost:7890/api/workers` → at least 1 worker active
- [ ] `curl http://localhost:7890/api/vault/providers` → at least 1 provider
- [ ] Access support UI: `http://localhost:8080/support/ui`

---

## Configuration Reference

### guardian.yml
```yaml
guardian:
  license_key: "YOUR_LICENSE_KEY"
  license_validate_url: "https://axto.ai/api/license-validate"
  
  # AI vendors for threat analysis (optional but recommended)
  ai_pool:
    vendors:
      - provider: anthropic
        api_key: "sk-ant-..."
        model: claude-haiku-4-5-20251001
      - provider: openai
        api_key: "sk-..."
        model: gpt-4o-mini
  
  # Scan configuration
  scan_mode: auto          # auto | manual | off
  scan_interval: 300       # seconds between auto scans
  scan_paths:
    - /host/etc
    - /host/tmp
    - /host/var/www
  
  data_dir: /guardian/data
  api_port: 8080
```

### Environment Variables

**Guardian:**
```bash
GUARDIAN_LICENSE_KEY=xxx
GUARDIAN_NODE_ID=node-01
GUARDIAN_NODE_NAME=production-server-01
GUARDIAN_DATA_DIR=/guardian/data
GUARDIAN_SCAN_MODE=auto
GUARDIAN_SCAN_INTERVAL=300

# Alerting
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_SMTP_USER=alerts@yourcompany.com
ALERT_EMAIL_SMTP_PASS=your-app-password
ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=security@yourcompany.com,cto@yourcompany.com
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
ALERT_TELEGRAM_BOT_TOKEN=1234567:ABCdef...
ALERT_TELEGRAM_CHAT_ID=-1001234567890
ALERT_PAGERDUTY_ROUTING_KEY=xxx

# SIEM
SIEM_TYPE=splunk_hec
SIEM_SPLUNK_URL=https://your-splunk:8088
SIEM_SPLUNK_TOKEN=xxx

# Multi-tenant
GUARDIAN_MULTITENANT=true
GUARDIAN_SUPERADMIN_KEY=your-secret-key

# Threat Intel
OTX_API_KEY=xxx
VIRUSTOTAL_API_KEY=xxx
SHODAN_API_KEY=xxx
```

**Orchestra:**
```bash
ORCHESTRA_CONSOLE_PASSWORD=your-console-password
ORCHESTRA_WORKER_TOKEN=your-worker-secret
DATA_DIR=/data

# Autoscaler
AUTOSCALE_SPAWN_TYPE=docker   # docker | webhook | noop
AUTOSCALE_POLL_INTERVAL=15
AUTOSCALE_COOLDOWN=60
```

---

<a name="alerting"></a>
## Alerting Setup

### Telegram (Recommended — Free, Instant)
1. Create bot: message `@BotFather` → `/newbot`
2. Copy token → `ALERT_TELEGRAM_BOT_TOKEN`
3. Add bot to your group → get chat ID:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getUpdates
   # Look for "chat":{"id":-1001234567890}
   ```
4. Set `ALERT_TELEGRAM_CHAT_ID=-1001234567890`
5. Test: `curl -X POST http://localhost:8080/alerting/test/telegram`

### Slack
1. Create Incoming Webhook: https://api.slack.com/apps → Add App → Incoming Webhooks
2. Copy webhook URL → `ALERT_SLACK_WEBHOOK_URL`
3. Test: `curl -X POST http://localhost:8080/alerting/test/slack`

### Email (SMTP)
```bash
# Gmail example
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_SMTP_USER=you@gmail.com
ALERT_EMAIL_SMTP_PASS=abcd-efgh-ijkl-mnop  # App password, not account password
ALERT_EMAIL_FROM=you@gmail.com
ALERT_EMAIL_TO=team@yourcompany.com
```
Gmail App Password: Google Account → Security → 2FA → App Passwords

### Alert Severity Routing
| Severity | Channels |
|----------|---------|
| CRITICAL | All configured channels |
| HIGH | Slack + Telegram + PagerDuty |
| MEDIUM | Slack + Telegram |
| LOW | Webhook only |

---

<a name="siem"></a>
## SIEM Integration

### Splunk HEC
```bash
SIEM_TYPE=splunk_hec
SIEM_SPLUNK_URL=https://your-splunk-server:8088
SIEM_SPLUNK_TOKEN=your-hec-token
```
Splunk: Settings → Data Inputs → HTTP Event Collector → New Token
Source type: `guardian:security`

### Elasticsearch
```bash
SIEM_TYPE=elastic
SIEM_ELASTIC_URL=https://your-elasticsearch:9200
SIEM_ELASTIC_INDEX=guardian-alerts
SIEM_ELASTIC_API_KEY=your-api-key  # or leave blank for no auth
```
Creates index `guardian-alerts` automatically.

### Wazuh
```bash
SIEM_TYPE=wazuh
SIEM_WAZUH_HOST=wazuh-manager.internal
SIEM_WAZUH_PORT=514
```
Events forwarded as RFC 5424 syslog — Wazuh parses automatically.

### CEF File (any SIEM with log collection)
```bash
SIEM_TYPE=cef_file
SIEM_CEF_FILE=/var/log/guardian/guardian.cef
```
Configure your SIEM agent (Filebeat, NXLog, etc.) to watch this file.

### JSON Lines File (Filebeat/Logstash)
```bash
SIEM_TYPE=json_file
SIEM_JSON_FILE=/var/log/guardian/guardian.jsonl
```
Filebeat config:
```yaml
filebeat.inputs:
  - type: log
    paths: ["/var/log/guardian/guardian.jsonl"]
    json.keys_under_root: true
    json.add_error_key: true
```

---

<a name="multitenant"></a>
## Multi-Tenant Setup (MSSP)

For Managed Security Service Providers managing multiple clients:

```bash
# Enable multi-tenant mode
GUARDIAN_MULTITENANT=true
GUARDIAN_SUPERADMIN_KEY=your-very-secret-mssp-key
```

### Create tenants
```bash
curl -X POST http://localhost:8080/tenants/ \
  -H "X-Superadmin-Key: your-mssp-key" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"client_abc","name":"ABC Corp","plan":"professional"}'
```

### Per-tenant node registration
```bash
# On client's server, set their tenant ID:
GUARDIAN_NODE_ID=abc-node-01
# Node reports to their isolated data directory automatically
```

### View all tenants (MSSP console)
```bash
curl -H "X-Superadmin-Key: your-mssp-key" \
  http://localhost:8080/tenants/aggregate
```

Data isolation: each tenant's data in `/guardian/data/{tenant_id}/`
No data mixing. No shared DB tables.

---

## Threat Hunting

### Built-in Hunt Templates
```bash
# List all templates
curl http://localhost:8080/hunt/templates

# Run a template
curl -X POST http://localhost:8080/hunt/run/malware_last_24h
curl -X POST http://localhost:8080/hunt/run/lateral_movement
curl -X POST http://localhost:8080/hunt/run/data_exfil_candidates
curl -X POST http://localhost:8080/hunt/run/deception_events

# Attack timeline for specific host
curl -X POST http://localhost:8080/hunt/timeline \
  -d '{"host_or_ip":"192.168.1.50","hours":48}'

# Bulk IOC sweep
curl -X POST http://localhost:8080/hunt/ioc-sweep \
  -d '{"iocs":["1.2.3.4","5.6.7.8","malware.exe"]}'
```

### Custom SQL Queries
```bash
# Only SELECT allowed. Max 1000 results.
curl -X POST http://localhost:8080/hunt/query \
  -d '{
    "sql": "SELECT target, COUNT(*) as hits FROM scan_events WHERE verdict='\''malicious'\'' GROUP BY target ORDER BY hits DESC",
    "params": []
  }'
```

---

## Reports

```bash
# Compliance report (HTML, auditor-ready)
curl -X POST http://localhost:8080/reports/compliance/iso27001
curl -X POST http://localhost:8080/reports/compliance/cis
curl -X POST http://localhost:8080/reports/compliance/soc2

# Incident report
curl -X POST http://localhost:8080/reports/incident/INC-1234567890-ABCD

# Executive summary (for board)
curl -X POST http://localhost:8080/reports/executive

# List all generated reports
curl http://localhost:8080/reports/

# Download
curl http://localhost:8080/reports/download/compliance_iso27001_20260315.html \
  -o compliance_report.html
```

---

## Real-time Dashboard (WebSocket)

Connect from any browser or monitoring tool:
```javascript
const ws = new WebSocket('ws://your-guardian:8080/ws/events/dashboard-01');

ws.onmessage = (e) => {
  const event = JSON.parse(e.data);
  console.log(event.type, event.data);
  // Events: alert.new, incident.new, incident.updated,
  //         metric.tick, feed.updated, deception.triggered
};

// Subscribe to specific events only
ws.send(JSON.stringify({
  type: "subscribe",
  events: ["incident.new", "alert.new", "deception.triggered"]
}));
```

---

<a name="emergency"></a>
## Emergency Runbooks

### System completely unresponsive
```bash
docker-compose logs guardian-core --tail 100
docker-compose restart guardian-core
curl http://localhost:8080/health/deep
```

### No AI analysis (all scans returning 'unknown')
```bash
# Check AI pool
curl http://localhost:8080/health/ai_pool
# Check API keys
curl http://localhost:8080/health/credential_vault  # Orchestra
curl http://localhost:7890/health/credential_vault
# Add missing key
curl -X POST -H 'X-Console-Token: TOKEN' \
  http://localhost:7890/api/vault/store \
  -d '{"provider_id":"openai","api_key":"sk-..."}'
```

### Threat feed empty
```bash
# Check network
curl -I https://pub-d69a77d3bbf94764be022e1453b16a10.r2.dev/manifest.json
# Force refresh
curl -X POST http://localhost:8080/feed/refresh
# Wait 60 seconds
sleep 60 && curl http://localhost:8080/feed/status
```

### Queue not processing (Orchestra)
```bash
# Check workers
curl http://localhost:7890/api/workers
# If no workers
docker-compose up -d worker-cpu
# If workers exist but queue growing
curl http://localhost:7890/health/deep  # Check circuit breaker
```

### Disk full
```bash
df -h /guardian/data
# Clean old data
sqlite3 /guardian/data/guardian.db \
  "DELETE FROM scan_events WHERE ts < unixepoch()-604800;"
sqlite3 /guardian/data/guardian.db "VACUUM;"
# Clean old reports
find /guardian/data/reports -mtime +30 -delete
```

### Database locked
```bash
sqlite3 /guardian/data/guardian.db "PRAGMA wal_checkpoint(TRUNCATE);"
# If still locked: find and kill the process holding it
fuser /guardian/data/guardian.db
```

---

## API Quick Reference

### Guardian (port 8080)
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Basic health |
| GET | /health/deep | Full diagnostic |
| POST | /health/{comp}/autofix | Auto-fix component |
| GET | /scan/mode | Get scan mode |
| POST | /scan/mode | Set scan mode |
| POST | /scan/trigger | Trigger immediate scan |
| POST | /scan/file | Scan specific file |
| POST | /scan/ip | Check IP |
| POST | /scan/domain | Check domain |
| GET | /incidents/ | List incidents |
| PATCH | /incidents/{id} | Update incident |
| POST | /incidents/ingest | Ingest alert manually |
| GET | /hunt/templates | Hunt templates |
| POST | /hunt/run/{id} | Run hunt template |
| POST | /hunt/timeline | Attack timeline |
| POST | /hunt/ioc-sweep | Bulk IOC check |
| GET | /compliance/summary | Compliance scores |
| POST | /reports/compliance/{fw} | Generate report |
| GET | /alerting/stats | Alert channel status |
| POST | /alerting/test/{ch} | Test alert channel |
| GET | /siem/stats | SIEM forwarder status |
| GET | /threat-intel/ip/{ip} | Enrich IP |
| GET | /ml/stats | ML model status |
| WS | /ws/events/{id} | Real-time event stream |
| GET | /support/ui | AI Support Bot UI |
| POST | /support/ask | Ask support bot |
| POST | /support/diagnose | Diagnose error |
| GET | /runbook/ | List runbooks |
| GET | /runbook/{code} | Get runbook detail |

### Orchestra (port 7890)
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Basic health |
| GET | /health/deep | Full diagnostic |
| POST | /api/jobs/submit | Submit AI job |
| GET | /api/jobs/queue | Queue status |
| GET | /api/workers | Worker list |
| GET | /api/vault/providers | Stored API keys |
| POST | /api/vault/store | Store API key |
| POST | /api/vault/test/{id} | Test provider |
| GET | /api/routing/status | Routing mode |
| GET | /api/autoscaler/status | Autoscaler state |
| GET | /api/semantic/classify | Test classification |
| GET | /api/performance | Performance stats |
| GET | /api/cost/summary | Cost breakdown |
| GET | /runbook/ | Runbooks |
| POST | /support/ask | AI support bot |
| WS | /support/ws/{id} | Streaming support |

---

## Upgrade Procedure

```bash
# 1. Backup
cp -r /guardian/data /guardian/data.backup.$(date +%Y%m%d)

# 2. Pull new image
docker-compose pull

# 3. Rolling restart (zero downtime)
docker-compose up -d --no-deps guardian-core
sleep 30
curl http://localhost:8080/health  # verify

# 4. Update workers (zero downtime - queue still processing)
docker-compose up -d --no-deps worker-cpu worker-gpu

# 5. Verify
curl http://localhost:8080/health/deep | python3 -m json.tool
```

---

## Monitoring Axto Itself

Add to your existing monitoring (Prometheus/Grafana/Datadog):

```bash
# Health endpoint for uptime monitor
curl http://localhost:8080/health
# Returns: {"status":"ok"} or {"status":"degraded"}

# Metrics for Prometheus (scrape every 30s)
curl http://localhost:8080/health/deep | jq '.score'

# Or use the WebSocket stream to push to your metrics system
```

Recommended alerts to set up in your uptime monitor:
- HTTP 200 on `/health` every 30s
- Score < 60 from `/health/deep` → email alert
- `incident.new` severity=critical → PagerDuty

---

*Axto Platform v2 — Self-service, self-healing, production-grade.*
*For questions the AI Support Bot cannot answer: hello@axto.ai*


---

## TIER 2 ACTIVATION GUIDE

### Prerequisites
- Docker Compose v2+
- Linux host (for eBPF feature)
- Guardian license with Tier 2 entitlement

---

### Step 1 — Start PostgreSQL + Redis

```bash
# Set passwords (change these!)
export POSTGRES_PASSWORD=your_strong_password
export REDIS_PASSWORD=your_redis_password

# Start Tier 2 services
docker compose --profile tier2 up -d guardian-postgres guardian-redis

# Verify
docker compose ps
```

### Step 2 — Update guardian.yml

Uncomment the `tier2:` block and fill in credentials:

```yaml
guardian:
  # ... existing config ...

  tier2:
    db_mode: distributed
    postgres_url: "postgresql://guardian:your_strong_password@guardian-postgres:5432/guardian"
    redis_url: "redis://:your_redis_password@guardian-redis:6379/0"
```

### Step 3 — Restart Core

```bash
docker compose restart guardian-core

# Verify DB mode
curl http://localhost:8080/db/status
# Expected: {"mode":"distributed","postgres_ok":true,"redis_ok":true,"tier":2}
```

---

### mTLS Node-to-Core Setup

```bash
# 1. Generate CA (run once on Core server)
docker exec guardian-core python -m src.mtls gen-ca --out /guardian/certs

# 2. Generate cert for each node
docker exec guardian-core python -m src.mtls gen-node node-1 --out /guardian/certs

# 3. Copy node-1/node.crt, node-1/node.key, node-1/ca.crt to node server ./certs/

# 4. Enable in guardian.yml + env
# GUARDIAN_MTLS_ENABLED=true

# 5. Restart core and node
docker compose restart
```

---

### eBPF Kernel Monitoring Setup

```bash
# 1. Install BCC on the host
apt-get install -y python3-bcc linux-headers-$(uname -r)

# 2. Enable in guardian.yml
# tier2:
#   ebpf_enabled: true

# OR via env
# GUARDIAN_EBPF_ENABLED=true

# 3. Restart node with privileged + SYS_ADMIN (already in docker-compose.yml)
docker compose restart guardian-node

# 4. Verify
curl http://localhost:8080/monitor/ebpf/stats
```

---

### Attack Graph Visualization

```bash
# Build graph for an incident
curl -X POST http://localhost:8080/attack-graph/build/INC-001

# Get graph (D3.js/Cytoscape.js compatible JSON)
curl http://localhost:8080/attack-graph/INC-001

# Get full graph (all incidents)
curl http://localhost:8080/attack-graph/
```

---

### Semantic Threat Hunting

```bash
# Natural language search
curl -X POST http://localhost:8080/hunt/semantic \
  -H 'Content-Type: application/json' \
  -d '{"query": "powershell lateral movement credential dumping", "top_k": 10}'

# Returns: matching MITRE techniques, IOC patterns, recent events
```

---

### Remediation Wizard

```bash
# Start wizard for an incident
curl -X POST http://localhost:8080/remediation/wizard/INC-001 \
  -H 'Content-Type: application/json' \
  -d '{"incident_id": "INC-001", "step": "start"}'

# Steps: start → contain → eradicate → recover → postmortem
curl -X POST http://localhost:8080/remediation/wizard/INC-001 \
  -d '{"incident_id": "INC-001", "step": "contain"}'
```

---

### Tier 2 vs Tier 1 Comparison

| Feature | Tier 1 | Tier 2 |
|---------|--------|--------|
| Database | SQLite (per-node) | PostgreSQL + Redis (distributed) |
| Anomaly detection | Z-score + Isolation Forest | ML model (Isolation Forest/LSTM) |
| Kernel monitoring | psutil (userspace) | eBPF (kernel hooks, unstoppable) |
| Multi-tenant | Filesystem isolation | DB-level isolation + RLS |
| Alert delivery | JSON + WebSocket | Real-time WebSocket + Redis pub/sub |
| SIEM output | File/Syslog | Splunk / Elastic / Wazuh forwarder |
| Compliance reports | Manual PDF | Auto-generated auditor-signed PDF |
| Alerting | Email/Slack/Telegram | + PagerDuty/Discord |
| Node routing | Keyword | Vector embedding semantic search |
| Node-to-Core | HTTP plain | mTLS encrypted mesh |
| Attack timeline | None | Graph-based attack path visualization |
| Remediation | Runbook docs only | Interactive guided wizard |
| Target | SME, mid-market | Enterprise, MSSP, Gov (Fortune 500) |
| Deal size | $200-2k/bln | $2k-20k/bln |
| Nodes | 1-50 | 50-10,000+ |
