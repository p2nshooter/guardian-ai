[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# Guardian AI — Changelog

## v2.1.0 — Tier 2 Production (2026-03-15)

### Bug Fixes
- **CRITICAL** `core.py`: Fixed `ThreatHunter` name collision — `monitor/threat_hunter.py`
  was silently overridden by `threat_hunting.py` import on line 25. Monitor-level AI hunter
  now properly aliased as `AIThreatHunter`.
- `api.py`: Removed duplicate `import json` before module docstring.
- `api.py`: Removed duplicate inner `from fastapi import WebSocket, WebSocketDisconnect`
  (was re-imported inside Support Bot section, causing potential shadowing).
- `threat_hunting.py`: Replaced SQLite-specific `unixepoch('now','subsec')` in all
  HUNT_TEMPLATES with `__GUARDIAN_NOW__` placeholder resolved at runtime via
  `time.time()` — now works on both SQLite and PostgreSQL.

### Tier 2 New Features

#### Distributed Database (PostgreSQL + Redis)
- New file: `engine/src/database_distributed.py`
  - `PostgresDB`: full async PostgreSQL pool via `asyncpg`, same interface as `GuardianDB`
  - `RedisCache`: async Redis client for caching, pub/sub, rate limiting, distributed locks
  - `get_distributed_db()`: returns PostgreSQL connection or None (fallback to SQLite)
  - `get_redis()`: returns Redis client or None
  - Attack graph tables: `attack_graph_nodes`, `attack_graph_edges`
  - Multi-tenant via `tenant_id` column + `ON CONFLICT` upserts
- `database.py`: `get_db()` now transparently routes to PostgreSQL when
  `GUARDIAN_DB_MODE=distributed`, falls back to SQLite (Tier 1 backward-compatible)
- `docker-compose.yml`: Added `guardian-postgres` + `guardian-redis` services
  under `--profile tier2`

#### mTLS Node-to-Core Communication
- New file: `engine/src/mtls.py`
  - `build_client_ssl_context()`: mTLS httpx context for nodes
  - `build_server_ssl_context()`: uvicorn mTLS config for Core
  - `make_mtls_client()`: drop-in httpx.AsyncClient with mTLS
  - CLI tool: `python -m src.mtls gen-ca` / `gen-node <id>`
- `node.py`: `GuardianNode._client` now uses `_build_http_client()` which
  auto-enables mTLS when `GUARDIAN_MTLS_ENABLED=true` and certs exist

#### eBPF Kernel Monitoring
- New file: `engine/src/ebpf_monitor.py`
  - `eBPFMonitor`: hooks `execve` + `tcp_connect` at kernel level via BCC
  - Cannot be bypassed by userspace malware
  - Gracefully disabled if BCC not installed or non-Linux
  - Auto-alerts on suspicious execve paths (`/tmp/`, `curl`, `nc`, `python -c`, etc.)
  - Auto-alerts on connections to known malicious IPs
- `core.py`: eBPF wired into startup/shutdown, callbacks feed `incident_mgr` + `ueba`

#### Attack Graph Visualization
- New file: `engine/src/attack_graph.py`
  - `AttackGraphBuilder`: builds directed graph from incident events
  - PostgreSQL-backed (falls back to in-memory)
  - D3.js / Cytoscape.js compatible JSON output
  - Auto-build from existing incidents via `build_from_incident()`
- New API endpoints:
  - `POST /attack-graph/build/{incident_id}` — build graph from incident
  - `GET  /attack-graph/{incident_id}` — get graph for incident
  - `GET  /attack-graph/` — get full graph

#### Vector Semantic Search
- `engine/src/attack_graph.py`: `SemanticThreatSearch`
  - Pure Python + numpy cosine similarity (no external vector DB)
  - Indexes: 100+ MITRE ATT&CK techniques, IOC patterns, incidents
  - Character n-gram encoding (portable, no model download needed)
- New API endpoint:
  - `POST /hunt/semantic` — natural language threat hunting
  - `POST /hunt/semantic/index-incidents` — re-index all incidents

#### Interactive Remediation Wizard
- New API endpoint: `POST /remediation/wizard/{incident_id}`
  - Step-by-step guided response: Contain → Eradicate → Recover → Postmortem
  - AI recommendation per threat type
  - Auto-updates incident status at each step

#### New Status Endpoints
- `GET /db/status` — shows DB mode, PostgreSQL + Redis connectivity
- `GET /monitor/ebpf/stats` — eBPF kernel monitor statistics

### Configuration
- `config/settings.py`: Added Tier 2 fields:
  `db_mode`, `postgres_url`, `redis_url`, `mtls_enabled`, `mtls_cert_path`,
  `mtls_key_path`, `mtls_ca_path`, `ebpf_enabled`
- `guardian.yml`: Tier 2 block (commented out, ready to activate)
- `engine/requirements.txt`: Added `asyncpg`, `redis[hiredis]`, `reportlab`,
  `cryptography`, `numpy`

## v2.0.0 — Tier 1 Production

- Initial production release
- SQLite database, single-tenant, Isolation Forest ML
- Multi-tenant isolation (filesystem-based)
- Real-time WebSocket alerts
- SIEM forwarder (Splunk, Elastic, Wazuh, Syslog)
- PDF compliance reports
- Email/Slack/Telegram/PagerDuty alerting
- Full NIST SP 800-61 incident response lifecycle
