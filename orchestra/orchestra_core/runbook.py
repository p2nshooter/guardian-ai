# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
Axto — Embedded Runbook System
Setiap error code punya runbook: penyebab + langkah fix + perintah exact.
Tidak perlu buka docs eksternal. Semua ada di dalam sistem.

Diakses via:
  GET  /runbook/                    → list semua runbook
  GET  /runbook/{code}              → runbook untuk error code tertentu
  GET  /runbook/search?q=worker     → search runbook by keyword
  POST /runbook/context             → kirim error message, dapat runbook yang relevan

Format runbook:
  code:        Unique error identifier (e.g., ORK-001)
  title:       Short description
  symptoms:    Apa yang terlihat
  causes:      Kemungkinan penyebab (ordered by probability)
  steps:       Step-by-step fix instructions
  commands:    Exact commands to run
  escalate_if: Kapan masalah butuh intervensi manual
  prevention:  Cara mencegah di masa depan
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional


# ── Runbook data model ────────────────────────────────────────────────────────

class Runbook:
    def __init__(self, code: str, title: str, component: str,
                 symptoms: List[str], causes: List[str],
                 steps: List[str], commands: List[str],
                 escalate_if: str = "", prevention: str = "",
                 tags: List[str] = None):
        self.code        = code
        self.title       = title
        self.component   = component
        self.symptoms    = symptoms
        self.causes      = causes
        self.steps       = steps
        self.commands    = commands
        self.escalate_if = escalate_if
        self.prevention  = prevention
        self.tags        = tags or []

    def to_dict(self) -> dict:
        return {
            "code":        self.code,
            "title":       self.title,
            "component":   self.component,
            "symptoms":    self.symptoms,
            "causes":      self.causes,
            "steps":       self.steps,
            "commands":    self.commands,
            "escalate_if": self.escalate_if,
            "prevention":  self.prevention,
            "tags":        self.tags,
        }

    def matches(self, query: str) -> bool:
        q = query.lower()
        return (q in self.title.lower()
                or q in self.code.lower()
                or any(q in s.lower() for s in self.symptoms)
                or any(q in c.lower() for c in self.causes)
                or any(q in t.lower() for t in self.tags))


# ── Orchestra Runbooks ────────────────────────────────────────────────────────

ORCHESTRA_RUNBOOKS: List[Runbook] = [

    Runbook(
        code="ORK-001", title="No Active Workers", component="workers",
        symptoms=[
            "POST /api/jobs/submit returns 'no worker available'",
            "Queue keeps growing, nothing processed",
            "/api/workers returns empty list",
        ],
        causes=[
            "Worker container not started or crashed",
            "Worker heartbeat timeout (>90s) — container running but unhealthy",
            "Worker token mismatch between Core and Worker",
            "License tier exceeded worker limit",
        ],
        steps=[
            "1. Check if worker container is running: `docker ps | grep worker`",
            "2. If not running: start it with docker-compose",
            "3. If running: check worker logs for errors",
            "4. Verify ORCHESTRA_CORE_URL env var in worker matches Core's actual URL",
            "5. Verify ORCHESTRA_WORKER_TOKEN matches in both Core and Worker",
            "6. Check worker registration at GET /api/workers",
        ],
        commands=[
            "docker ps -a | grep orchestra",
            "docker logs orchestra-worker-cpu --tail 50",
            "docker-compose up -d worker-cpu",
            "curl http://localhost:8080/api/workers",
            "curl http://localhost:7891/health",
        ],
        escalate_if="Worker starts but immediately crashes in a loop (restart loop in docker ps)",
        prevention="Set up healthcheck in docker-compose.yml for worker containers",
        tags=["worker", "offline", "queue", "no-workers", "connection"],
    ),

    Runbook(
        code="ORK-002", title="Provider API Key Invalid or Missing", component="credential_vault",
        symptoms=[
            "Jobs consistently fail with 'No API key for provider X'",
            "Error: '401 Unauthorized' in job error field",
            "All jobs going to error status",
        ],
        causes=[
            "API key never added to vault",
            "API key expired or revoked by provider",
            "Wrong provider_id used when storing key",
            "Vault file corrupted or master key changed",
        ],
        steps=[
            "1. List stored providers: GET /api/vault/providers",
            "2. If provider missing: add key via POST /api/vault/store",
            "3. If provider present: test connection via POST /api/vault/test/{provider_id}",
            "4. If test fails: re-add key with fresh API key from provider dashboard",
            "5. Get new API key from: https://platform.openai.com/api-keys (OpenAI)",
        ],
        commands=[
            "curl -H 'X-Console-Token: TOKEN' http://localhost:8080/api/vault/providers",
            """curl -X POST -H 'X-Console-Token: TOKEN' \\
  -d '{"provider_id":"openai","api_key":"sk-..."}' \\
  http://localhost:8080/api/vault/store""",
            "curl -X POST -H 'X-Console-Token: TOKEN' http://localhost:8080/api/vault/test/openai",
        ],
        escalate_if="Vault store returns 500 error — may indicate encryption key corruption",
        prevention="Set calendar reminder 30 days before API key expiry",
        tags=["api-key", "vault", "unauthorized", "401", "provider", "openai", "anthropic"],
    ),

    Runbook(
        code="ORK-003", title="Circuit Breaker Open for Provider", component="circuit_breaker",
        symptoms=[
            "Jobs for specific provider returning 'Circuit OPEN'",
            "Provider working intermittently",
            "High error rate for one provider but others OK",
        ],
        causes=[
            "Provider API having outage or rate limiting",
            "Error rate exceeded circuit threshold (default 50%)",
            "Network issue between Orchestra and provider API",
        ],
        steps=[
            "1. Check circuit status: GET /api/routing/status",
            "2. Check if provider is having outage: visit provider status page",
            "3. Wait for circuit to go half-open (default 60s after opening)",
            "4. Or manually reset: UPDATE workers SET circuit_state='closed' in DB",
            "5. Set routing to use different provider temporarily",
        ],
        commands=[
            "curl -H 'X-Console-Token: TOKEN' http://localhost:8080/api/routing/status",
            f"sqlite3 ./data/orchestra.db \"UPDATE workers SET circuit_state='closed' WHERE circuit_state='open';\"",
            "curl -X PUT -H 'X-Console-Token: TOKEN' http://localhost:8080/api/routing/rules "
            "-d '{\"mode\":\"failover\",\"fallback_chain\":[\"groq\",\"anthropic\",\"openai\"]}'",
        ],
        escalate_if="Circuit keeps opening immediately after reset — provider may be fully down",
        prevention="Configure fallback_chain in routing rules to auto-failover",
        tags=["circuit-breaker", "open", "failover", "provider-down", "outage"],
    ),

    Runbook(
        code="ORK-004", title="Queue Deeply Backlogged", component="queue",
        symptoms=[
            "GET /api/jobs/queue shows thousands of queued jobs",
            "Jobs taking very long to process",
            "New job submissions timing out",
        ],
        causes=[
            "Workers overwhelmed — not enough concurrency",
            "All workers offline (see ORK-001)",
            "Provider rate limiting causing jobs to retry repeatedly",
            "Autoscaler not enabled or not working",
        ],
        steps=[
            "1. Check active workers: GET /api/workers",
            "2. Check worker load: look at load_pct field",
            "3. If workers full: increase WORKER_CONCURRENCY or add workers",
            "4. Enable autoscaler: POST /api/autoscaler/toggle {enabled: true}",
            "5. If provider rate-limited: add delay between retries (routing rules)",
            "6. Emergency: pause queue, drain in-flight, then resume",
        ],
        commands=[
            "curl -H 'X-Console-Token: TOKEN' http://localhost:8080/api/workers",
            "docker-compose scale worker-cpu=3",
            "curl -X POST -H 'X-Console-Token: TOKEN' http://localhost:8080/api/autoscaler/toggle -d '{\"enabled\":true}'",
            "curl -X POST -H 'X-Console-Token: TOKEN' http://localhost:8080/api/jobs/queue/pause",
            "curl -X POST -H 'X-Console-Token: TOKEN' http://localhost:8080/api/jobs/queue/resume",
        ],
        escalate_if="Queue >50,000 jobs and autoscaler not bringing it down after 10 minutes",
        prevention="Set autoscale_enabled=true and configure autoscale_threshold=20 in settings",
        tags=["queue", "backlog", "slow", "processing", "timeout", "performance"],
    ),

    Runbook(
        code="ORK-005", title="Database Locked or Corrupted", component="database",
        symptoms=[
            "500 errors from any API endpoint",
            "Logs show 'database is locked' or 'disk I/O error'",
            "Jobs stuck in 'running' status indefinitely",
        ],
        causes=[
            "WAL file very large — checkpoint not running",
            "Multiple writers contending for lock",
            "Disk full (check ORK-006 first)",
            "Crash during write leaving DB in inconsistent state",
        ],
        steps=[
            "1. FIRST: check disk space (may be root cause)",
            "2. Run WAL checkpoint to merge WAL into main DB",
            "3. If locked: identify process holding lock",
            "4. If corrupted: run integrity check",
            "5. If corrupt: restore from backup",
        ],
        commands=[
            "df -h ./data/",
            "sqlite3 ./data/orchestra.db 'PRAGMA wal_checkpoint(TRUNCATE);'",
            "fuser ./data/orchestra.db",
            "sqlite3 ./data/orchestra.db 'PRAGMA integrity_check;'",
            "cp ./data/orchestra.db ./data/orchestra.db.backup && sqlite3 ./data/orchestra.db '.recover' | sqlite3 ./data/orchestra_recovered.db",
        ],
        escalate_if="Integrity check returns errors and no backup available",
        prevention="Enable automatic WAL checkpoint: set wal_autocheckpoint=1000 in schema",
        tags=["database", "locked", "corrupted", "sqlite", "wal", "integrity"],
    ),

    Runbook(
        code="ORK-006", title="Disk Space Full", component="disk",
        symptoms=[
            "Database write errors",
            "Docker container exiting unexpectedly",
            "'No space left on device' in logs",
        ],
        causes=[
            "Job history accumulating without cleanup",
            "Metrics table growing unbounded",
            "Docker images and logs consuming space",
            "Audit log not rotated",
        ],
        steps=[
            "1. Check disk usage: df -h",
            "2. Find largest files in DATA_DIR",
            "3. Clean old job history (>7 days)",
            "4. Evict expired cache entries",
            "5. Prune old metrics (>7 days)",
            "6. Docker cleanup (images, stopped containers)",
        ],
        commands=[
            "df -h ./data/",
            "du -sh ./data/* | sort -rh | head -10",
            "sqlite3 ./data/orchestra.db 'DELETE FROM jobs WHERE status IN (\"done\",\"error\") AND done_at < unixepoch()-604800;'",
            "sqlite3 ./data/orchestra.db 'DELETE FROM metrics WHERE ts < unixepoch()-604800;'",
            "sqlite3 ./data/orchestra.db 'VACUUM;'",
            "docker system prune -f",
        ],
        escalate_if="Disk usage >95% and cleanup doesn't free enough space",
        prevention="Set up cron job: 0 2 * * * sqlite3 /data/orchestra.db 'DELETE FROM jobs WHERE done_at < unixepoch()-604800;'",
        tags=["disk", "space", "full", "storage", "cleanup", "vacuum"],
    ),

    Runbook(
        code="ORK-007", title="Worker GPU Not Detecting GPU", component="worker_gpu",
        symptoms=[
            "GPU worker health shows gpu.available=false",
            "Image generation running on CPU (very slow)",
            "VRAM=0 in worker health endpoint",
        ],
        causes=[
            "nvidia-smi not available in container",
            "NVIDIA Docker runtime not installed",
            "Container not started with --gpus all flag",
            "Driver version mismatch between host and container",
        ],
        steps=[
            "1. Test GPU access from host: nvidia-smi",
            "2. Test GPU access in container",
            "3. Ensure docker-compose uses deploy.resources.reservations.devices",
            "4. Install nvidia-container-toolkit if missing",
            "5. Restart docker daemon after toolkit install",
        ],
        commands=[
            "nvidia-smi",
            "docker run --gpus all nvidia/cuda:11.0-base nvidia-smi",
            "distribution=$(. /etc/os-release;echo $ID$VERSION_ID) && curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | apt-key add - && curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list > /etc/apt/sources.list.d/nvidia-docker.list",
            "apt-get install -y nvidia-container-toolkit && systemctl restart docker",
        ],
        escalate_if="nvidia-smi works on host but fails in container after toolkit install",
        prevention="Always use docker-compose.yml with proper GPU resource reservation",
        tags=["gpu", "nvidia", "cuda", "docker", "vram", "driver"],
    ),

    Runbook(
        code="ORK-008", title="Semantic Router Always Using Default Category", component="semantic_router",
        symptoms=[
            "All jobs classified as 'default' regardless of content",
            "Cheap models used for code/reasoning tasks",
            "Quality consistently low across all job types",
        ],
        causes=[
            "Messages format wrong (not list of {role, content} dicts)",
            "All messages very short (<50 chars) — insufficient for classification",
            "Keywords in different language than CATEGORIES dict",
        ],
        steps=[
            "1. Test classifier: POST /api/semantic/classify with test message",
            "2. Verify messages format: [{role:user, content:...}]",
            "3. Check if content is long enough (>50 chars)",
            "4. Add language-specific keywords to CATEGORIES if using non-English",
        ],
        commands=[
            """curl -X POST -H 'X-Console-Token: TOKEN' \\
  -d '{"messages":[{"role":"user","content":"write a python function to sort a list"}]}' \\
  http://localhost:8080/api/semantic/classify""",
        ],
        escalate_if="Classifier returns correct category but routing still uses wrong model",
        prevention="Test semantic routing after any changes to routing_engine.py",
        tags=["semantic", "routing", "classification", "category", "model-selection"],
    ),
]


# ── Guardian Runbooks ─────────────────────────────────────────────────────────

GUARDIAN_RUNBOOKS: List[Runbook] = [

    Runbook(
        code="GRD-001", title="Threat Feed Empty or Stale", component="threat_feed",
        symptoms=[
            "GET /feed/status shows 0 hashes/IPs/domains",
            "All scans returning 'clean' regardless of file",
            "Last updated timestamp is very old",
        ],
        causes=[
            "Network blocked to R2 bucket (check firewall)",
            "First startup — feed not yet downloaded",
            "R2 bucket URL changed or unavailable",
        ],
        steps=[
            "1. Check network connectivity to R2: curl https://pub-d69a77d3bbf94764be022e1453b16a10.r2.dev/manifest.json",
            "2. Trigger manual refresh: POST /feed/refresh",
            "3. Check logs for download errors",
            "4. Verify threat_feed_url in guardian.yml",
        ],
        commands=[
            "curl -I https://pub-d69a77d3bbf94764be022e1453b16a10.r2.dev/malware_hashes.json",
            "curl -X POST http://localhost:8080/feed/refresh",
            "docker logs guardian-core --tail 100 | grep feed",
        ],
        escalate_if="Feed refresh triggers but feed stays empty after 5 minutes",
        prevention="Monitor /feed/status endpoint — alert if hash count drops below 1000",
        tags=["feed", "empty", "threat", "ioc", "download", "r2"],
    ),

    Runbook(
        code="GRD-002", title="License Validation Failing", component="license",
        symptoms=[
            "GET /license/info returns valid=false",
            "Logs show 'License validation failed'",
            "Some features disabled",
        ],
        causes=[
            "license_key not set in guardian.yml or GUARDIAN_LICENSE_KEY env var",
            "license_validate_url not set or wrong",
            "Network blocked to axto.ai",
            "License expired",
        ],
        steps=[
            "1. Check license_key is set: echo $GUARDIAN_LICENSE_KEY",
            "2. Check license_validate_url is set in guardian.yml",
            "3. Test network: curl https://axto.ai/health",
            "4. Trigger re-validation: POST /license/validate",
            "5. If expired: renew at https://axto.ai/portal",
        ],
        commands=[
            "echo $GUARDIAN_LICENSE_KEY | head -c 20",
            "curl https://axto.ai/health",
            "cat /guardian/config/guardian.yml | grep license",
            "curl -X POST http://localhost:8080/license/validate",
        ],
        escalate_if="License shows 'expired' — requires renewal at portal",
        prevention="Monitor expiry date in /license/info, renew 30 days before expiry",
        tags=["license", "validation", "expired", "key", "activation"],
    ),

    Runbook(
        code="GRD-003", title="Guardian Node Not Reporting to Core", component="node",
        symptoms=[
            "GET /node/list shows node missing or offline",
            "Alerts from that node not appearing in dashboard",
            "Node scan results not being correlated",
        ],
        causes=[
            "GUARDIAN_CORE_URL wrong in node container env",
            "Network between node and core blocked",
            "Node container crashed",
            "Core API not responding",
        ],
        steps=[
            "1. Check node container is running: docker ps | grep guardian-node",
            "2. Check GUARDIAN_CORE_URL env var in node container",
            "3. Test connectivity from node to core",
            "4. Check node logs for registration errors",
            "5. Check core logs for incoming registration requests",
        ],
        commands=[
            "docker ps | grep guardian",
            "docker exec guardian-node env | grep GUARDIAN_CORE_URL",
            "docker exec guardian-node curl http://guardian-core:8080/health",
            "docker logs guardian-node --tail 50",
            "docker logs guardian-core --tail 50 | grep register",
        ],
        escalate_if="Node and Core can ping each other but registration still fails with 4xx error",
        prevention="Use docker internal DNS names (not IP addresses) for GUARDIAN_CORE_URL",
        tags=["node", "offline", "registration", "heartbeat", "connectivity"],
    ),

    Runbook(
        code="GRD-004", title="UEBA Generating Too Many False Positives", component="ueba",
        symptoms=[
            "Constant alerts about normal processes (nginx, systemd)",
            "Every login flagged as anomaly",
            "Alert fatigue — team ignoring all UEBA alerts",
        ],
        causes=[
            "UEBA profiles not yet built (insufficient history < 5 observations)",
            "Process whitelist too narrow",
            "System change (new software installed) causing baseline shift",
        ],
        steps=[
            "1. Check UEBA profile count: GET /monitor/ueba/stats",
            "2. If profiles < 100, need more training time (normal in first 24-48h)",
            "3. Mark specific entities as false positive: POST /monitor/ueba/false-positive",
            "4. Add known-safe processes to RESOURCE_WHITELIST in ueba.py",
            "5. Wait 24-48h for baseline to stabilize after software changes",
        ],
        commands=[
            "curl http://localhost:8080/monitor/ueba/stats",
            "curl http://localhost:8080/monitor/ueba/anomalies",
            "curl -X POST http://localhost:8080/monitor/ueba/false-positive -d '{\"entity_id\":\"nginx\"}'",
        ],
        escalate_if="False positive rate >50% even after 7 days of training",
        prevention="Deploy Guardian on a stable system baseline before enabling UEBA alerts",
        tags=["ueba", "false-positive", "alert-fatigue", "baseline", "behavior"],
    ),

    Runbook(
        code="GRD-005", title="Deception Artifacts Triggered by Legitimate Process", component="deception",
        symptoms=[
            "Alert: DECEPTION TRIGGERED by process 'backup-agent' or similar",
            "Known legitimate backup/monitoring tool flagged",
            "Alert confidence 0.98 but process is known-safe",
        ],
        causes=[
            "Backup agent legitimately reading credential files",
            "Monitoring tool checking /etc/ directories",
            "DevOps automation accessing deployment configs",
        ],
        steps=[
            "1. Check which process triggered: look at accessor_name in alert",
            "2. Verify process is truly legitimate: check process path, parent, signature",
            "3. If legitimate: add process to deception exclusion list in deception.py",
            "4. Move deception artifacts to paths not accessed by legitimate tools",
            "5. Review deception_triggered incident: update to false_positive=true",
        ],
        commands=[
            "curl http://localhost:8080/monitor/deception/status",
            "curl http://localhost:8080/incidents/ | python3 -m json.tool | grep deception",
            "curl -X PATCH http://localhost:8080/incidents/INC-XXXXX -d '{\"false_positive\":true}'",
        ],
        escalate_if="Unknown process accessing deception artifacts — treat as real compromise",
        prevention="Map legitimate tools before planting deception artifacts",
        tags=["deception", "false-positive", "honeypot", "backup", "monitoring"],
    ),

    Runbook(
        code="GRD-006", title="Incident Manager Playbook Step Failing", component="incident_manager",
        symptoms=[
            "Incident playbook stuck at specific step",
            "GET /incidents/{id} shows action status='failed'",
            "Block IP step failing repeatedly",
        ],
        causes=[
            "iptables not available in container (needs --cap-add NET_ADMIN)",
            "Process kill failing due to permissions (not root)",
            "Target file already deleted before quarantine step",
        ],
        steps=[
            "1. Check incident detail: GET /incidents/{incident_id}",
            "2. Look at playbook_actions[].detail for error message",
            "3. For iptables failures: ensure container has NET_ADMIN capability",
            "4. For permission failures: verify Guardian container runs as root or with CAP_SYS_ADMIN",
            "5. Failed steps can be manually executed via Response API",
        ],
        commands=[
            "curl http://localhost:8080/incidents/INC-XXXXX",
            "docker inspect guardian-core | grep -A5 CapAdd",
            "docker run --cap-add NET_ADMIN ...",
            "curl -X POST http://localhost:8080/response/block-ip -d '{\"ip\":\"1.2.3.4\"}'",
        ],
        escalate_if="Multiple critical playbook steps failing — manual incident response required",
        prevention="Add NET_ADMIN and SYS_ADMIN capabilities to guardian-core docker-compose",
        tags=["incident", "playbook", "iptables", "permissions", "block-ip", "quarantine"],
    ),

    Runbook(
        code="GRD-007", title="Compliance Check Failing Unexpectedly", component="compliance",
        symptoms=[
            "GET /compliance/cis shows FAIL for known-configured settings",
            "SSH check failing even though SSH is configured correctly",
            "Compliance score dropped after system update",
        ],
        causes=[
            "Config file location changed in newer OS version",
            "New package installed with different sshd_config path",
            "Compliance check running before system fully started",
        ],
        steps=[
            "1. Run compliance for specific framework: POST /compliance/cis/run",
            "2. Check the 'evidence' field in failing check for what was found",
            "3. Manually verify the check target path exists",
            "4. If OS/distro difference: check compliance.py check function path assumptions",
        ],
        commands=[
            "curl -X POST http://localhost:8080/compliance/cis/run",
            "curl http://localhost:8080/compliance/cis | python3 -m json.tool",
            "ls -la /etc/ssh/sshd_config",
            "sshd -T | grep -E 'permitrootlogin|passwordauthentication|x11forwarding'",
        ],
        escalate_if="CRITICAL checks failing in production and cannot be fixed quickly",
        prevention="Run compliance baseline immediately after new system deployment",
        tags=["compliance", "cis", "nist", "ssh", "hardening", "false-fail"],
    ),
]

# ── Combined registry ─────────────────────────────────────────────────────────

ALL_RUNBOOKS: Dict[str, Runbook] = {
    rb.code: rb for rb in ORCHESTRA_RUNBOOKS + GUARDIAN_RUNBOOKS
}


def get_runbook(code: str) -> Optional[Runbook]:
    return ALL_RUNBOOKS.get(code.upper())


def search_runbooks(query: str, component: str = "") -> List[Runbook]:
    results = [rb for rb in ALL_RUNBOOKS.values() if rb.matches(query)]
    if component:
        results = [rb for rb in results if rb.component == component]
    return results


def get_runbook_for_error(error_message: str) -> List[Runbook]:
    """
    Given a raw error message, return relevant runbooks.
    Uses keyword matching — not AI (fast, offline).
    """
    em = error_message.lower()
    keyword_map = {
        "no worker":              "ORK-001",
        "no api key":             "ORK-002",
        "circuit open":           "ORK-003",
        "queue full":             "ORK-004",
        "database is locked":     "ORK-005",
        "disk i/o error":         "ORK-005",
        "no space left":          "ORK-006",
        "vram":                   "ORK-007",
        "gpu not detected":       "ORK-007",
        "default category":       "ORK-008",
        "threat feed":            "GRD-001",
        "feed empty":             "GRD-001",
        "license":                "GRD-002",
        "valid=false":            "GRD-002",
        "node not reporting":     "GRD-003",
        "false positive":         "GRD-004",
        "ueba":                   "GRD-004",
        "deception triggered":    "GRD-005",
        "playbook":               "GRD-006",
        "iptables":               "GRD-006",
        "compliance":             "GRD-007",
    }

    found_codes = set()
    for kw, code in keyword_map.items():
        if kw in em:
            found_codes.add(code)

    return [ALL_RUNBOOKS[c] for c in found_codes if c in ALL_RUNBOOKS]


def list_all(component: str = "") -> List[dict]:
    rbs = list(ALL_RUNBOOKS.values())
    if component:
        rbs = [rb for rb in rbs if rb.component == component]
    return [{"code": rb.code, "title": rb.title, "component": rb.component,
             "tags": rb.tags} for rb in rbs]
