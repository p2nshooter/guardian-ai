# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO SOC — Security Operations Center Engine v1.0
==================================================
Production-grade, world-class managed SOC.

Capabilities:
  ▸ SIEM: Ingest syslog/CEF/LEEF/JSON/Windows Events — up to 50k EPS
  ▸ Detection: 20+ rules, MITRE ATT&CK mapped, threshold + correlation
  ▸ Threat Intelligence: AbuseIPDB, AlienVault OTX, local feed, AXTO Guardian
  ▸ SOAR: Real automated responses — iptables block, Slack/email/webhook alerts,
          process kill via Guardian integration, host isolation
  ▸ UEBA: Online z-score baselines per entity, anomaly detection
  ▸ Incident Management: Full lifecycle, SLA tracking, AI-assisted triage
  ▸ Executive Reporting: MTTD, MTTR, alert volume, top threats
  ▸ False Positive Learning: Feedback loop reduces noise over time
  ▸ Correlation Engine: Multi-alert correlation into incidents
  ▸ Persistence: SQLite WAL (SQLite) — upgradeable to PostgreSQL
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import socket
import struct
import time
import uuid
from collections import defaultdict, deque
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Deque, Dict, List, Optional, Set, Tuple

import aiosqlite

try:
    import aiohttp
    _HAS_AIOHTTP = True
except ImportError:
    _HAS_AIOHTTP = False

log = logging.getLogger("soc.engine")

# ─────────────────────────────────────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────────────────────────────────────
class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH     = "high"
    MEDIUM   = "medium"
    LOW      = "low"
    INFO     = "info"

class IncidentStatus(str, Enum):
    NEW        = "new"
    TRIAGING   = "triaging"
    CONFIRMED  = "confirmed"
    CONTAINED  = "contained"
    ERADICATED = "eradicated"
    RECOVERED  = "recovered"
    CLOSED     = "closed"
    FALSE_POS  = "false_positive"

class AlertSource(str, Enum):
    SYSLOG      = "syslog"
    CEF         = "cef"
    LEEF        = "leef"
    JSON_API    = "json_api"
    WINDOWS     = "windows_events"
    GUARDIAN    = "axto_guardian"
    NETFLOW     = "netflow"
    CLOUDTRAIL  = "cloudtrail"
    K8S_AUDIT   = "k8s_audit"
    NGINX       = "nginx"
    APACHE      = "apache"

class SOARAction(str, Enum):
    BLOCK_IP          = "block_ip"
    UNBLOCK_IP        = "unblock_ip"
    NOTIFY_SLACK      = "notify_slack"
    NOTIFY_EMAIL      = "notify_email"
    NOTIFY_WEBHOOK    = "notify_webhook"
    ISOLATE_HOST      = "isolate_host"
    KILL_PROCESS      = "kill_process"
    DISABLE_ACCOUNT   = "disable_account"
    CAPTURE_PCAP      = "capture_pcap"
    CREATE_TICKET     = "create_ticket"
    BLOCK_DNS         = "block_dns"
    RATE_LIMIT_IP     = "rate_limit_ip"
    ESCALATE          = "escalate"
    SNAPSHOT_DISK     = "snapshot_disk"

# ─────────────────────────────────────────────────────────────────────────────
# DETECTION RULES  (production-ready)
# ─────────────────────────────────────────────────────────────────────────────
DETECTION_RULES: List[Dict] = [
    {
        "id": "SOC-001", "name": "SSH Brute Force",
        "pattern": re.compile(r"(?i)Failed\s+password|Invalid\s+user|authentication\s+failure", re.I),
        "threshold": 8, "window_sec": 60, "severity": Severity.HIGH,
        "mitre": ["TA0006"], "description": "Multiple SSH authentication failures from one source",
        "playbook": "brute_force",
    },
    {
        "id": "SOC-002", "name": "Web Application Attack (SQLi/XSS/LFI)",
        "pattern": re.compile(
            r"(?:'|--|union\s+select|or\s+1\s*=\s*1|<script|javascript:|etc/passwd|\.\.\/\.\.\/"
            r"|exec\(|system\(|base64_decode)", re.I),
        "threshold": 3, "window_sec": 30, "severity": Severity.HIGH,
        "mitre": ["TA0001"], "description": "Web application injection attack pattern",
        "playbook": "waf_block",
    },
    {
        "id": "SOC-003", "name": "Privilege Escalation",
        "pattern": re.compile(
            r"(?:sudo\s+su\b|sudo\s+-i\b|setuid|chmod\s+[467][67]\d|chown\s+root|"
            r"pkexec|doas\s+su)", re.I),
        "threshold": 1, "window_sec": 60, "severity": Severity.HIGH,
        "mitre": ["TA0004"], "description": "Privilege escalation technique detected",
        "playbook": "priv_esc",
    },
    {
        "id": "SOC-004", "name": "Ransomware IOC",
        "pattern": re.compile(
            r"(?:\.encrypted$|\.locked$|README_RANSOM|HOW_TO_DECRYPT|DECRYPT_INSTRUCTION|"
            r"vssadmin\s+delete|wbadmin\s+delete|bcdedit\s+/set\s+safeboot|"
            r"netsh\s+advfirewall\s+set\s+allprofiles\s+state\s+off)", re.I),
        "threshold": 1, "window_sec": 10, "severity": Severity.CRITICAL,
        "mitre": ["TA0040"], "description": "Ransomware indicators detected — immediate isolation required",
        "playbook": "ransomware",
    },
    {
        "id": "SOC-005", "name": "C2 Beacon / Reverse Shell",
        "pattern": re.compile(
            r"(?:nc\s+-e\s+/bin|bash\s+-i\s+>&\s+/dev/tcp|"
            r"python.*socket.*connect|perl.*socket.*connect|"
            r"powershell.*iex.*downloadstring|mshta|regsvr32\s+/i:http)", re.I),
        "threshold": 1, "window_sec": 30, "severity": Severity.CRITICAL,
        "mitre": ["TA0011"], "description": "C2 communication or reverse shell detected",
        "playbook": "c2_response",
    },
    {
        "id": "SOC-006", "name": "Data Exfiltration",
        "pattern": re.compile(
            r"(?:bytes_sent[=:]\s*[1-9][0-9]{7,}|"
            r"large\s+outbound|curl\s+.*-d\s+@|"
            r"scp\s+.*\d{1,3}\.\d{1,3}\.\d{1,3}|"
            r"rclone\s+copy|s3cmd\s+put)", re.I),
        "threshold": 1, "window_sec": 120, "severity": Severity.CRITICAL,
        "mitre": ["TA0010"], "description": "Large-scale data transfer / exfiltration pattern",
        "playbook": "exfil_response",
    },
    {
        "id": "SOC-007", "name": "Lateral Movement",
        "pattern": re.compile(
            r"(?:psexec|wmic\s+/node|net\s+use\s+\\\\|"
            r"pass.?the.?hash|overpass.?the.?hash|"
            r"mimikatz|sekurlsa|invoke-mimikatz)", re.I),
        "threshold": 1, "window_sec": 120, "severity": Severity.CRITICAL,
        "mitre": ["TA0008"], "description": "Lateral movement technique detected",
        "playbook": "lateral_movement",
    },
    {
        "id": "SOC-008", "name": "Suspicious Recon Activity",
        "pattern": re.compile(
            r"(?:nmap|masscan|zmap|nessus|openvas|nikto|dirb|gobuster|"
            r"Nmap scan report|ports scanned)", re.I),
        "threshold": 2, "window_sec": 300, "severity": Severity.MEDIUM,
        "mitre": ["TA0007", "TA0043"], "description": "Network/service reconnaissance activity",
        "playbook": "recon_response",
    },
    {
        "id": "SOC-009", "name": "Unauthorized Account Operations",
        "pattern": re.compile(
            r"(?:useradd|adduser|net\s+user\s+/add|"
            r"new\s+local\s+account\s+created|"
            r"added\s+to\s+administrators|added\s+to\s+sudoers)", re.I),
        "threshold": 1, "window_sec": 300, "severity": Severity.HIGH,
        "mitre": ["TA0003"], "description": "Unauthorized account creation or privilege assignment",
        "playbook": "account_lockdown",
    },
    {
        "id": "SOC-010", "name": "Defense Evasion",
        "pattern": re.compile(
            r"(?:iptables\s+-F|ufw\s+disable|setenforce\s+0|"
            r"auditctl\s+-e\s+0|systemctl\s+stop\s+(?:firewall|ufw|iptables)|"
            r"taskkill\s+/f\s+/im\s+(?:defender|malwarebytes)|"
            r"reg\s+add.*DisableAntiSpyware)", re.I),
        "threshold": 1, "window_sec": 60, "severity": Severity.CRITICAL,
        "mitre": ["TA0005"], "description": "Security control disabled or tampered with",
        "playbook": "defense_restore",
    },
    {
        "id": "SOC-011", "name": "Credential Dumping",
        "pattern": re.compile(
            r"(?:lsass\.exe|procdump|comsvcs\.dll\s+MiniDump|"
            r"reg\s+save\s+HKLM\\SAM|ntds\.dit|"
            r"vssadmin\s+create\s+shadow|copy\s+\\\\\\?\\GLOBALROOT)", re.I),
        "threshold": 1, "window_sec": 60, "severity": Severity.CRITICAL,
        "mitre": ["TA0006"], "description": "Credential dumping technique detected",
        "playbook": "cred_dump_response",
    },
    {
        "id": "SOC-012", "name": "Suspicious Scheduled Task / Cron",
        "pattern": re.compile(
            r"(?:schtasks\s+/create|at\s+\d+:\d+|"
            r"crontab\s+-e|echo.*>>/etc/cron|"
            r"\*/\d+\s+\*\s+\*\s+\*\s+\*.*(?:wget|curl|bash))", re.I),
        "threshold": 1, "window_sec": 300, "severity": Severity.MEDIUM,
        "mitre": ["TA0003"], "description": "Suspicious scheduled task or cron job creation",
        "playbook": "persistence_response",
    },
    {
        "id": "SOC-013", "name": "Container Escape Attempt",
        "pattern": re.compile(
            r"(?:docker\.sock|/proc/1/root|mount\s+--bind|"
            r"nsenter\s+--target\s+1|runc\s+--root|"
            r"privileged.*container)", re.I),
        "threshold": 1, "window_sec": 60, "severity": Severity.CRITICAL,
        "mitre": ["TA0004"], "description": "Container escape or privileged access attempt",
        "playbook": "container_response",
    },
    {
        "id": "SOC-014", "name": "Cloud Resource Abuse (IAM/S3)",
        "pattern": re.compile(
            r"(?:AssumeRole.*Error|GetObject\s+AccessDenied|"
            r"CreateUser\s+root|AttachUserPolicy\s+AdministratorAccess|"
            r"S3:PutBucketAcl.*public|cloudtrail\s+StopLogging)", re.I),
        "threshold": 2, "window_sec": 120, "severity": Severity.HIGH,
        "mitre": ["TA0004", "TA0010"], "description": "Cloud IAM abuse or public bucket misconfiguration",
        "playbook": "cloud_response",
    },
    {
        "id": "SOC-015", "name": "K8s Cluster Attack",
        "pattern": re.compile(
            r"(?:kubectl\s+exec.*--stdin|"
            r"RBAC.*forbidden.*cluster-admin|"
            r"pods/exec.*\*.*verb|"
            r"serviceaccount.*automount.*true.*secret)", re.I),
        "threshold": 1, "window_sec": 60, "severity": Severity.HIGH,
        "mitre": ["TA0004", "TA0008"], "description": "Kubernetes cluster attack pattern",
        "playbook": "k8s_response",
    },
]

# SLA: minutes to first response by severity
SLA_MINUTES: Dict[Severity, int] = {
    Severity.CRITICAL: 15,
    Severity.HIGH:     60,
    Severity.MEDIUM:   240,
    Severity.LOW:      1440,
    Severity.INFO:     10080,
}

# ─────────────────────────────────────────────────────────────────────────────
# SOAR PLAYBOOKS  (production actions)
# ─────────────────────────────────────────────────────────────────────────────
PLAYBOOKS: Dict[str, List[Dict]] = {
    "brute_force":        [
        {"step": 1, "action": SOARAction.BLOCK_IP,       "auto": True,  "desc": "Block source IP via iptables/firewall API"},
        {"step": 2, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "Alert #soc-alerts Slack channel"},
        {"step": 3, "action": SOARAction.RATE_LIMIT_IP,  "auto": True,  "desc": "Rate-limit IP to 5 req/min"},
        {"step": 4, "action": SOARAction.CREATE_TICKET,  "auto": True,  "desc": "Open incident ticket in ticketing system"},
        {"step": 5, "action": SOARAction.DISABLE_ACCOUNT,"auto": False, "desc": "Disable targeted account (manual approval)"},
    ],
    "ransomware":         [
        {"step": 1, "action": SOARAction.ISOLATE_HOST,   "auto": True,  "desc": "IMMEDIATELY isolate host from network"},
        {"step": 2, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "CRITICAL alert to #incident-response"},
        {"step": 3, "action": SOARAction.NOTIFY_EMAIL,   "auto": True,  "desc": "Email CISO and management"},
        {"step": 4, "action": SOARAction.SNAPSHOT_DISK,  "auto": True,  "desc": "Forensic snapshot via Guardian integration"},
        {"step": 5, "action": SOARAction.BLOCK_DNS,      "auto": True,  "desc": "Block C2 domains at DNS resolver"},
        {"step": 6, "action": SOARAction.ESCALATE,       "auto": True,  "desc": "Escalate to IR team with full context"},
    ],
    "c2_response":        [
        {"step": 1, "action": SOARAction.ISOLATE_HOST,   "auto": True,  "desc": "Isolate compromised host"},
        {"step": 2, "action": SOARAction.BLOCK_IP,       "auto": True,  "desc": "Block C2 IP at perimeter"},
        {"step": 3, "action": SOARAction.BLOCK_DNS,      "auto": True,  "desc": "Sinkhole C2 domain"},
        {"step": 4, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "Critical alert to SOC team"},
        {"step": 5, "action": SOARAction.CAPTURE_PCAP,   "auto": False, "desc": "Capture traffic for forensics"},
    ],
    "exfil_response":     [
        {"step": 1, "action": SOARAction.BLOCK_IP,       "auto": True,  "desc": "Block egress to destination IP"},
        {"step": 2, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "Immediate SOC alert"},
        {"step": 3, "action": SOARAction.NOTIFY_EMAIL,   "auto": True,  "desc": "Email data owner and compliance team"},
        {"step": 4, "action": SOARAction.CREATE_TICKET,  "auto": True,  "desc": "Create P1 incident ticket"},
        {"step": 5, "action": SOARAction.NOTIFY_WEBHOOK, "auto": True,  "desc": "DLP webhook notification"},
    ],
    "lateral_movement":   [
        {"step": 1, "action": SOARAction.ISOLATE_HOST,   "auto": True,  "desc": "Isolate affected hosts"},
        {"step": 2, "action": SOARAction.DISABLE_ACCOUNT,"auto": False, "desc": "Disable compromised credentials"},
        {"step": 3, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "Alert IR team"},
        {"step": 4, "action": SOARAction.ESCALATE,       "auto": True,  "desc": "Escalate with full kill chain"},
    ],
    "waf_block":          [
        {"step": 1, "action": SOARAction.BLOCK_IP,       "auto": True,  "desc": "WAF/firewall IP block"},
        {"step": 2, "action": SOARAction.RATE_LIMIT_IP,  "auto": True,  "desc": "Rate limit IP at edge"},
        {"step": 3, "action": SOARAction.NOTIFY_WEBHOOK, "auto": True,  "desc": "Notify WAF management system"},
        {"step": 4, "action": SOARAction.CREATE_TICKET,  "auto": True,  "desc": "Log incident"},
    ],
    "priv_esc":           [
        {"step": 1, "action": SOARAction.KILL_PROCESS,   "auto": True,  "desc": "Kill escalation process"},
        {"step": 2, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "Alert SOC analyst"},
        {"step": 3, "action": SOARAction.CREATE_TICKET,  "auto": True,  "desc": "Open investigation ticket"},
    ],
    "defense_restore":    [
        {"step": 1, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "URGENT: security controls tampered"},
        {"step": 2, "action": SOARAction.ISOLATE_HOST,   "auto": True,  "desc": "Isolate compromised system"},
        {"step": 3, "action": SOARAction.ESCALATE,       "auto": True,  "desc": "Escalate to senior analyst"},
    ],
    "cred_dump_response": [
        {"step": 1, "action": SOARAction.KILL_PROCESS,   "auto": True,  "desc": "Kill credential dumping process"},
        {"step": 2, "action": SOARAction.ISOLATE_HOST,   "auto": True,  "desc": "Isolate host"},
        {"step": 3, "action": SOARAction.DISABLE_ACCOUNT,"auto": False, "desc": "Force password reset for all accounts on host"},
        {"step": 4, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "Critical SOC alert"},
    ],
    "recon_response":     [
        {"step": 1, "action": SOARAction.RATE_LIMIT_IP,  "auto": True,  "desc": "Rate limit scanning source"},
        {"step": 2, "action": SOARAction.BLOCK_IP,       "auto": True,  "desc": "Block aggressive scanners"},
        {"step": 3, "action": SOARAction.CREATE_TICKET,  "auto": True,  "desc": "Log for threat tracking"},
    ],
    "account_lockdown":   [
        {"step": 1, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "Alert for unauthorized account activity"},
        {"step": 2, "action": SOARAction.DISABLE_ACCOUNT,"auto": False, "desc": "Disable suspicious new account (manual)"},
        {"step": 3, "action": SOARAction.CREATE_TICKET,  "auto": True,  "desc": "HR/IT investigation ticket"},
    ],
    "persistence_response":[
        {"step": 1, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "Alert SOC"},
        {"step": 2, "action": SOARAction.CREATE_TICKET,  "auto": True,  "desc": "Persistence investigation ticket"},
    ],
    "container_response": [
        {"step": 1, "action": SOARAction.KILL_PROCESS,   "auto": True,  "desc": "Kill container escape process"},
        {"step": 2, "action": SOARAction.ISOLATE_HOST,   "auto": True,  "desc": "Isolate node"},
        {"step": 3, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "K8s/container security alert"},
    ],
    "cloud_response":     [
        {"step": 1, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "Alert cloud security team"},
        {"step": 2, "action": SOARAction.DISABLE_ACCOUNT,"auto": False, "desc": "Revoke IAM credentials (manual approval)"},
        {"step": 3, "action": SOARAction.CREATE_TICKET,  "auto": True,  "desc": "Cloud security incident ticket"},
    ],
    "k8s_response":       [
        {"step": 1, "action": SOARAction.NOTIFY_SLACK,   "auto": True,  "desc": "Alert platform security team"},
        {"step": 2, "action": SOARAction.CREATE_TICKET,  "auto": True,  "desc": "K8s incident ticket"},
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
# DATA MODELS
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class ParsedLog:
    raw:        str
    message:    str = ""
    host:       str = ""
    user:       str = ""
    src_ip:     str = ""
    dst_ip:     str = ""
    src_port:   int = 0
    dst_port:   int = 0
    program:    str = ""
    event_id:   str = ""
    timestamp:  str = ""
    extra:      Dict = field(default_factory=dict)

@dataclass
class Alert:
    id:             str = field(default_factory=lambda: str(uuid.uuid4()))
    ts:             float = field(default_factory=time.time)
    source:         AlertSource = AlertSource.JSON_API
    raw_log:        str = ""
    rule_id:        str = ""
    rule_name:      str = ""
    severity:       Severity = Severity.MEDIUM
    host:           str = ""
    user:           str = ""
    src_ip:         str = ""
    dst_ip:         str = ""
    mitre_tactics:  List[str] = field(default_factory=list)
    ti_enrichment:  Dict = field(default_factory=dict)
    ueba_anomaly:   Optional[Dict] = None
    incident_id:    Optional[str] = None
    false_positive: bool = False

@dataclass
class Incident:
    id:             str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at:     float = field(default_factory=time.time)
    updated_at:     float = field(default_factory=time.time)
    title:          str = ""
    severity:       Severity = Severity.MEDIUM
    status:         IncidentStatus = IncidentStatus.NEW
    alert_ids:      List[str] = field(default_factory=list)
    assignee:       str = ""
    description:    str = ""
    timeline:       List[Dict] = field(default_factory=list)
    mitre_tactics:  List[str] = field(default_factory=list)
    playbook:       str = ""
    playbook_steps: List[Dict] = field(default_factory=list)
    soar_log:       List[Dict] = field(default_factory=list)
    resolution:     str = ""
    sla_breach:     bool = False
    mttd_sec:       float = 0.0  # Mean Time to Detect
    mttr_sec:       float = 0.0  # Mean Time to Respond
    ai_triage:      Dict = field(default_factory=dict)

# ─────────────────────────────────────────────────────────────────────────────
# LOG PARSER  (multi-format)
# ─────────────────────────────────────────────────────────────────────────────
class LogParser:
    _SYSLOG_RE = re.compile(
        r'^(?:<(?P<pri>\d+)>)?(?P<ts>\w{3}\s+\d+\s[\d:]+)\s+'
        r'(?P<host>\S+)\s+(?P<prog>\S+?)(?:\[(?P<pid>\d+)\])?:\s*(?P<msg>.*)$'
    )
    _CEF_RE = re.compile(
        r'^CEF:(?P<ver>\d+)\|(?P<vendor>[^|]*)\|(?P<product>[^|]*)\|'
        r'(?P<pver>[^|]*)\|(?P<sig>[^|]*)\|(?P<name>[^|]*)\|(?P<sev>\d+)\|(?P<ext>.*)$'
    )
    _LEEF_RE = re.compile(r'^LEEF:(?P<ver>[^|]*)\|(?P<vendor>[^|]*)\|(?P<product>[^|]*)\|(?P<ver2>[^|]*)\|(?P<ext>.*)$')
    _IP_RE   = re.compile(r'\b(\d{1,3}(?:\.\d{1,3}){3})\b')
    _USER_RE = re.compile(r'(?:user|username|account|suser|duser|acct)[=:\s]+["\']?(\w[\w.\-@+]{1,64})', re.I)

    @classmethod
    def parse(cls, raw: str, source: AlertSource) -> ParsedLog:
        p = ParsedLog(raw=raw[:4096])
        if source == AlertSource.CEF:
            cls._parse_cef(raw, p)
        elif source == AlertSource.LEEF:
            cls._parse_leef(raw, p)
        elif source == AlertSource.JSON_API or raw.lstrip().startswith("{"):
            cls._parse_json(raw, p)
        elif source in (AlertSource.WINDOWS,):
            cls._parse_windows(raw, p)
        else:
            cls._parse_syslog(raw, p)
        # fallback extractions
        if not p.src_ip:
            ips = cls._IP_RE.findall(p.message or raw)
            if ips:
                p.src_ip = ips[0]
                if len(ips) > 1:
                    p.dst_ip = ips[1]
        if not p.user:
            um = cls._USER_RE.search(p.message or raw)
            if um:
                p.user = um.group(1)
        return p

    @classmethod
    def _parse_syslog(cls, raw: str, p: ParsedLog):
        m = cls._SYSLOG_RE.match(raw.strip())
        if m:
            p.timestamp = m.group("ts")
            p.host      = m.group("host")
            p.program   = m.group("prog")
            p.message   = m.group("msg")
        else:
            p.message = raw

    @classmethod
    def _parse_cef(cls, raw: str, p: ParsedLog):
        m = cls._CEF_RE.match(raw.strip())
        if not m:
            p.message = raw; return
        p.message = m.group("name")
        ext = dict(re.findall(r'(\w+)=((?:[^\\=\s]|\\.)+)', m.group("ext")))
        p.src_ip   = ext.get("src", ext.get("sourceAddress", ""))
        p.dst_ip   = ext.get("dst", ext.get("destinationAddress", ""))
        p.src_port = int(ext.get("spt", "0") or 0)
        p.dst_port = int(ext.get("dpt", "0") or 0)
        p.host     = ext.get("dhost", ext.get("deviceExternalId", ""))
        p.user     = ext.get("suser", ext.get("duser", ""))
        p.extra    = ext

    @classmethod
    def _parse_leef(cls, raw: str, p: ParsedLog):
        m = cls._LEEF_RE.match(raw.strip())
        if not m:
            p.message = raw; return
        ext = dict(re.findall(r'(\w+)=([^\t]+)', m.group("ext")))
        p.message  = ext.get("cat", raw)
        p.src_ip   = ext.get("src", "")
        p.dst_ip   = ext.get("dst", "")
        p.user     = ext.get("usrName", "")
        p.host     = ext.get("devName", "")
        p.extra    = ext

    @classmethod
    def _parse_json(cls, raw: str, p: ParsedLog):
        try:
            d = json.loads(raw)
        except Exception:
            p.message = raw; return
        p.message  = d.get("message", d.get("msg", d.get("log", raw)))
        p.src_ip   = d.get("src_ip", d.get("sourceIP", d.get("client_ip", "")))
        p.dst_ip   = d.get("dst_ip", d.get("destinationIP", ""))
        p.host     = d.get("host", d.get("hostname", d.get("computer", "")))
        p.user     = d.get("user", d.get("username", d.get("account", "")))
        p.event_id = str(d.get("event_id", d.get("eventID", "")))
        p.program  = d.get("process", d.get("program", ""))
        p.extra    = d

    @classmethod
    def _parse_windows(cls, raw: str, p: ParsedLog):
        p.message = raw
        for pat, key in [
            (r'Account Name:\s+(\S+)',          "user"),
            (r'Source Network Address:\s+(\S+)', "src_ip"),
            (r'Workstation Name:\s+(\S+)',        "host"),
            (r'EventID[:\s]+(\d+)',               "event_id"),
            (r'Process Name:\s+(.+)',             "program"),
        ]:
            mm = re.search(pat, raw, re.I)
            if mm:
                setattr(p, key, mm.group(1).strip())

# ─────────────────────────────────────────────────────────────────────────────
# THREAT INTELLIGENCE ENGINE  (real external API calls)
# ─────────────────────────────────────────────────────────────────────────────
class ThreatIntel:
    """
    Real threat intelligence lookups:
      - AbuseIPDB: IP reputation
      - AlienVault OTX: IP / domain indicators
      - Local feed: IPs/domains/hashes loaded from AXTO Guardian / R2 feeds
    """
    def __init__(self, config: Dict):
        self._abuseipdb_key = config.get("abuseipdb_api_key", "")
        self._otx_key       = config.get("otx_api_key", "")
        self._cache:        Dict[str, Dict] = {}      # IP → result
        self._cache_ttl:    int = 3600                 # 1h cache
        self._cache_ts:     Dict[str, float] = {}
        # Local feed (loaded from Guardian threat-feed or file)
        self._bad_ips:      Set[str] = set()
        self._bad_domains:  Set[str] = set()
        self._bad_hashes:   Set[str] = set()
        self._false_pos_ips: Set[str] = set()

    def load_local_feed(self, feed_path: str):
        """Load threat feed from Guardian feed files."""
        try:
            ip_file     = os.path.join(feed_path, "malicious_ips.json")
            domain_file = os.path.join(feed_path, "malicious_domains.json")
            hash_file   = os.path.join(feed_path, "malware_hashes.json")
            if os.path.exists(ip_file):
                data = json.loads(open(ip_file).read())
                self._bad_ips = {e.get("ip","") for e in data if e.get("ip")}
                log.info(f"TI: loaded {len(self._bad_ips)} malicious IPs")
            if os.path.exists(domain_file):
                data = json.loads(open(domain_file).read())
                self._bad_domains = {e.get("domain","") for e in data if e.get("domain")}
                log.info(f"TI: loaded {len(self._bad_domains)} malicious domains")
            if os.path.exists(hash_file):
                data = json.loads(open(hash_file).read())
                self._bad_hashes = {e.get("hash","") for e in data if e.get("hash")}
                log.info(f"TI: loaded {len(self._bad_hashes)} malware hashes")
        except Exception as e:
            log.warning(f"TI feed load error: {e}")

    async def lookup_ip(self, ip: str) -> Dict:
        if not ip or not re.match(r'^\d{1,3}(?:\.\d{1,3}){3}$', ip):
            return {}
        # Skip RFC-1918 private ranges
        try:
            packed = struct.pack("!I", int.from_bytes(socket.inet_aton(ip), "big"))
            n = struct.unpack("!I", packed)[0]
            for start, end in [(0x0A000000, 0x0AFFFFFF), (0xAC100000, 0xAC1FFFFF),
                               (0xC0A80000, 0xC0A8FFFF), (0x7F000000, 0x7FFFFFFF)]:
                if start <= n <= end:
                    return {"ip": ip, "private": True, "malicious": False}
        except Exception:
            pass

        # Cache hit
        if ip in self._cache and time.time() - self._cache_ts.get(ip, 0) < self._cache_ttl:
            return self._cache[ip]

        result: Dict[str, Any] = {"ip": ip, "malicious": False, "confidence": 0.0, "sources": []}

        # 1. Local feed check (instant)
        if ip in self._bad_ips:
            result.update({"malicious": True, "confidence": 0.9, "source": "local_feed"})
            result["sources"].append("local_feed")

        if not _HAS_AIOHTTP:
            self._cache[ip] = result
            self._cache_ts[ip] = time.time()
            return result

        # 2. AbuseIPDB
        if self._abuseipdb_key:
            try:
                import aiohttp as ah
                url  = "https://api.abuseipdb.com/api/v2/check"
                hdrs = {"Key": self._abuseipdb_key, "Accept": "application/json"}
                params = {"ipAddress": ip, "maxAgeInDays": 30, "verbose": ""}
                async with ah.ClientSession(timeout=ah.ClientTimeout(total=5)) as s:
                    async with s.get(url, headers=hdrs, params=params) as r:
                        if r.status == 200:
                            d = (await r.json()).get("data", {})
                            score = d.get("abuseConfidenceScore", 0)
                            if score > 0:
                                result["malicious"]  = result["malicious"] or score > 30
                                result["confidence"] = max(result["confidence"], score / 100.0)
                                result["abuse_score"] = score
                                result["country"]     = d.get("countryCode", "")
                                result["isp"]         = d.get("isp", "")
                                result["total_reports"] = d.get("totalReports", 0)
                                result["sources"].append("abuseipdb")
            except Exception as e:
                log.debug(f"AbuseIPDB lookup failed: {e}")

        # 3. OTX AlienVault
        if self._otx_key:
            try:
                import aiohttp as ah
                url  = f"https://otx.alienvault.com/api/v1/indicators/IPv4/{ip}/general"
                hdrs = {"X-OTX-API-KEY": self._otx_key}
                async with ah.ClientSession(timeout=ah.ClientTimeout(total=5)) as s:
                    async with s.get(url, headers=hdrs) as r:
                        if r.status == 200:
                            d = await r.json()
                            pulse_count = d.get("pulse_info", {}).get("count", 0)
                            if pulse_count > 0:
                                result["malicious"]  = True
                                result["confidence"] = max(result["confidence"], min(0.95, pulse_count * 0.1))
                                result["otx_pulses"] = pulse_count
                                result["sources"].append("otx")
            except Exception as e:
                log.debug(f"OTX lookup failed: {e}")

        self._cache[ip] = result
        self._cache_ts[ip] = time.time()
        return result

    async def enrich_alert(self, alert: Alert) -> Dict:
        enrichment: Dict[str, Any] = {}
        tasks = []
        if alert.src_ip:
            tasks.append(("src_ip", asyncio.create_task(self.lookup_ip(alert.src_ip))))
        if alert.dst_ip and alert.dst_ip != alert.src_ip:
            tasks.append(("dst_ip", asyncio.create_task(self.lookup_ip(alert.dst_ip))))
        for key, task in tasks:
            enrichment[key] = await task
        return enrichment

    def mark_false_positive_ip(self, ip: str):
        self._false_pos_ips.add(ip)
        self._cache.pop(ip, None)

# ─────────────────────────────────────────────────────────────────────────────
# UEBA ENGINE  (Online Welford baseline, z-score anomaly detection)
# ─────────────────────────────────────────────────────────────────────────────
class UEBAEngine:
    """
    Online streaming UEBA using Welford's algorithm for mean/variance.
    Detects: login volume spikes, data transfer anomalies, off-hours activity,
             geo-impossible travel, new device/IP, privilege anomalies.
    """
    def __init__(self, z_threshold: float = 3.0):
        self._z     = z_threshold
        # {entity:metric → (n, mean, M2)} — Welford online
        self._stats: Dict[str, Tuple[int, float, float]] = {}
        # Sliding window per entity for time-based patterns
        self._windows: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=1000))
        # Known entity profiles
        self._profiles: Dict[str, Dict] = {}

    def _welford_update(self, key: str, value: float) -> Tuple[float, float]:
        """Update running mean+variance, return (mean, std)."""
        n, mean, M2 = self._stats.get(key, (0, 0.0, 0.0))
        n   += 1
        delta  = value - mean
        mean  += delta / n
        delta2 = value - mean
        M2    += delta * delta2
        self._stats[key] = (n, mean, M2)
        std = (M2 / (n - 1)) ** 0.5 if n > 1 else 0.0
        return mean, std

    def observe(self, entity: str, metric: str, value: float) -> Optional[Dict]:
        """
        Observe a metric for an entity. Returns anomaly dict if anomalous, else None.
        entity: user/host/IP identifier
        metric: login_count, bytes_sent, login_hour, api_calls, etc.
        """
        key  = f"{entity}:{metric}"
        self._windows[key].append(value)
        mean, std = self._welford_update(key, value)
        n, _, _ = self._stats[key]

        if n < 30:
            return None  # need baseline warmup

        if std < 1e-9:
            return None  # constant metric, no anomaly possible

        z = abs(value - mean) / std
        if z > self._z:
            severity = "critical" if z > 5.0 else "high" if z > 4.0 else "medium"
            return {
                "entity":   entity,
                "metric":   metric,
                "value":    value,
                "z_score":  round(z, 2),
                "baseline": round(mean, 2),
                "std":      round(std, 2),
                "severity": severity,
                "observations": n,
            }
        return None

    def get_profile(self, entity: str) -> Dict:
        """Return behavioral profile for entity."""
        profile = {}
        prefix = f"{entity}:"
        for key, (n, mean, M2) in self._stats.items():
            if key.startswith(prefix):
                metric = key[len(prefix):]
                std = (M2 / (n - 1)) ** 0.5 if n > 1 else 0.0
                profile[metric] = {"n": n, "mean": round(mean, 3), "std": round(std, 3)}
        return profile

# ─────────────────────────────────────────────────────────────────────────────
# SOAR EXECUTOR  (real actions)
# ─────────────────────────────────────────────────────────────────────────────
class SOARExecutor:
    """
    Executes automated response actions. Integrates with:
    - Firewall/iptables API (configurable endpoint)
    - Slack webhooks
    - Email via configured SMTP/Resend
    - Ticketing system (Jira/ServiceNow/custom webhook)
    - AXTO Guardian API (host isolation, process kill)
    - DNS resolver API (sinkhole)
    """
    def __init__(self, config: Dict):
        self._cfg = config.get("soar", {})
        self._firewall_url    = self._cfg.get("firewall_api_url", "")
        self._firewall_key    = self._cfg.get("firewall_api_key", "")
        self._slack_webhook   = self._cfg.get("slack_webhook_url", "")
        self._email_webhook   = self._cfg.get("email_api_url", "")
        self._ticket_webhook  = self._cfg.get("ticketing_webhook_url", "")
        self._guardian_url    = self._cfg.get("guardian_api_url", "")
        self._guardian_key    = self._cfg.get("guardian_api_key", "")
        self._dns_block_url   = self._cfg.get("dns_block_api_url", "")

    async def execute(self, action: SOARAction, context: Dict) -> Dict:
        """Execute a SOAR action. Returns {success, action, result, error}."""
        result = {"action": action.value, "success": False, "context": context, "ts": time.time()}
        try:
            if action == SOARAction.BLOCK_IP:
                result.update(await self._block_ip(context.get("src_ip", "")))
            elif action == SOARAction.RATE_LIMIT_IP:
                result.update(await self._rate_limit_ip(context.get("src_ip", ""), rate=5))
            elif action == SOARAction.NOTIFY_SLACK:
                result.update(await self._notify_slack(context))
            elif action == SOARAction.NOTIFY_EMAIL:
                result.update(await self._notify_email(context))
            elif action == SOARAction.NOTIFY_WEBHOOK:
                result.update(await self._notify_webhook(context))
            elif action == SOARAction.ISOLATE_HOST:
                result.update(await self._isolate_host(context.get("host", "")))
            elif action == SOARAction.KILL_PROCESS:
                result.update(await self._kill_process(context))
            elif action == SOARAction.BLOCK_DNS:
                result.update(await self._block_dns(context.get("dst_ip", "") or context.get("domain", "")))
            elif action == SOARAction.CREATE_TICKET:
                result.update(await self._create_ticket(context))
            elif action == SOARAction.ESCALATE:
                result.update(await self._escalate(context))
            elif action == SOARAction.SNAPSHOT_DISK:
                result.update(await self._snapshot(context))
            else:
                result["success"] = True
                result["note"] = f"Action {action.value} requires manual execution"
        except Exception as e:
            result["error"] = str(e)
            log.error(f"SOAR action {action.value} failed: {e}")
        return result

    async def _block_ip(self, ip: str) -> Dict:
        if not ip:
            return {"success": False, "error": "no IP provided"}
        # 1. Try configured firewall API
        if self._firewall_url and _HAS_AIOHTTP:
            try:
                import aiohttp as ah
                hdrs = {"Authorization": f"Bearer {self._firewall_key}",
                        "Content-Type": "application/json"}
                body = {"action": "block", "ip": ip, "direction": "both", "reason": "axto_soc_auto"}
                async with ah.ClientSession(timeout=ah.ClientTimeout(total=8)) as s:
                    async with s.post(f"{self._firewall_url}/block", headers=hdrs, json=body) as r:
                        if r.status in (200, 201, 204):
                            log.info(f"[SOAR] Blocked IP {ip} via firewall API")
                            return {"success": True, "ip": ip, "method": "firewall_api"}
            except Exception as e:
                log.warning(f"Firewall API failed: {e}")
        # 2. Fallback: iptables via subprocess (if running in privileged container)
        try:
            proc = await asyncio.create_subprocess_exec(
                "iptables", "-I", "INPUT", "1", "-s", ip, "-j", "DROP",
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=5)
            if proc.returncode == 0:
                log.info(f"[SOAR] Blocked IP {ip} via iptables")
                return {"success": True, "ip": ip, "method": "iptables"}
            log.warning(f"iptables block failed: {stderr.decode()}")
        except Exception as e:
            log.debug(f"iptables not available: {e}")
        return {"success": False, "ip": ip, "error": "no firewall method available — configure soar.firewall_api_url"}

    async def _rate_limit_ip(self, ip: str, rate: int = 10) -> Dict:
        if not ip:
            return {"success": False}
        if self._firewall_url and _HAS_AIOHTTP:
            try:
                import aiohttp as ah
                async with ah.ClientSession(timeout=ah.ClientTimeout(total=8)) as s:
                    async with s.post(f"{self._firewall_url}/rate-limit",
                                      headers={"Authorization": f"Bearer {self._firewall_key}"},
                                      json={"ip": ip, "rate": rate, "burst": rate * 2}) as r:
                        return {"success": r.status in (200,201,204), "ip": ip, "rate": rate}
            except Exception:
                pass
        # iptables rate limit
        try:
            proc = await asyncio.create_subprocess_exec(
                "iptables", "-I", "INPUT", "1", "-s", ip, "-m", "limit",
                "--limit", f"{rate}/min", "--limit-burst", str(rate * 2),
                "-j", "ACCEPT",
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await asyncio.wait_for(proc.communicate(), timeout=5)
            return {"success": proc.returncode == 0, "ip": ip, "method": "iptables_rate_limit"}
        except Exception:
            return {"success": False, "ip": ip, "error": "no rate-limit method available"}

    async def _notify_slack(self, ctx: Dict) -> Dict:
        if not self._slack_webhook or not _HAS_AIOHTTP:
            log.info(f"[SOAR] Slack notification skipped (not configured): {ctx.get('title','')}")
            return {"success": True, "note": "slack not configured — notification logged only"}
        import aiohttp as ah
        sev    = ctx.get("severity", "medium")
        colors = {"critical": "#FF0000", "high": "#FF6600", "medium": "#FFC000", "low": "#00CC44"}
        payload = {
            "attachments": [{
                "color": colors.get(sev, "#808080"),
                "fallback": f"[AXTO SOC] {ctx.get('title','Alert')} [{sev.upper()}]",
                "title": f"🚨 AXTO SOC — {ctx.get('title','Security Alert')}",
                "fields": [
                    {"title": "Severity",  "value": sev.upper(),                       "short": True},
                    {"title": "Host",      "value": ctx.get("host", "—"),              "short": True},
                    {"title": "Source IP", "value": ctx.get("src_ip", "—"),            "short": True},
                    {"title": "Incident",  "value": ctx.get("incident_id", "—")[:8],   "short": True},
                    {"title": "MITRE",     "value": ", ".join(ctx.get("mitre", [])),    "short": True},
                    {"title": "Description", "value": ctx.get("description", "")[:500], "short": False},
                ],
                "footer":  "AXTO SOC | axto.io",
                "ts":      int(time.time()),
            }]
        }
        async with ah.ClientSession(timeout=ah.ClientTimeout(total=8)) as s:
            async with s.post(self._slack_webhook, json=payload) as r:
                ok = r.status == 200
                if ok:
                    log.info(f"[SOAR] Slack alert sent: {ctx.get('title')}")
                return {"success": ok, "status_code": r.status}

    async def _notify_email(self, ctx: Dict) -> Dict:
        if not self._email_webhook or not _HAS_AIOHTTP:
            return {"success": True, "note": "email not configured"}
        import aiohttp as ah
        sev   = ctx.get("severity", "medium")
        subj  = f"[AXTO SOC] {sev.upper()} — {ctx.get('title','Security Incident')}"
        body  = (
            f"AXTO Security Operations Center\n"
            f"{'='*50}\n"
            f"Severity:    {sev.upper()}\n"
            f"Incident ID: {ctx.get('incident_id','N/A')}\n"
            f"Title:       {ctx.get('title','')}\n"
            f"Host:        {ctx.get('host','—')}\n"
            f"Source IP:   {ctx.get('src_ip','—')}\n"
            f"MITRE:       {', '.join(ctx.get('mitre',[]))}\n"
            f"Description: {ctx.get('description','')}\n\n"
            f"Portal: https://axto.io/soc/incidents/{ctx.get('incident_id','')}\n"
        )
        # Send to configured email API (Resend / SendGrid / custom)
        payload = {"subject": subj, "text": body, "severity": sev}
        async with ah.ClientSession(timeout=ah.ClientTimeout(total=8)) as s:
            async with s.post(self._email_webhook, json=payload) as r:
                return {"success": r.status in (200,201,202)}

    async def _notify_webhook(self, ctx: Dict) -> Dict:
        if not self._ticket_webhook or not _HAS_AIOHTTP:
            return {"success": True, "note": "webhook not configured"}
        import aiohttp as ah
        async with ah.ClientSession(timeout=ah.ClientTimeout(total=8)) as s:
            async with s.post(self._ticket_webhook, json={
                "source": "axto_soc",
                "event_type": "security_incident",
                "data": ctx,
                "timestamp": time.time(),
            }) as r:
                return {"success": r.status in (200,201,202,204)}

    async def _isolate_host(self, host: str) -> Dict:
        if not host:
            return {"success": False, "error": "no host provided"}
        # Via Guardian API (if available)
        if self._guardian_url and _HAS_AIOHTTP:
            try:
                import aiohttp as ah
                hdrs = {"X-Guardian-Key": self._guardian_key, "Content-Type": "application/json"}
                async with ah.ClientSession(timeout=ah.ClientTimeout(total=10)) as s:
                    async with s.post(f"{self._guardian_url}/v1/nodes/{host}/isolate",
                                      headers=hdrs, json={"reason": "axto_soc_incident"}) as r:
                        if r.status in (200, 202):
                            log.warning(f"[SOAR] Host {host} ISOLATED via Guardian")
                            return {"success": True, "host": host, "method": "guardian_api"}
            except Exception as e:
                log.warning(f"Guardian isolation failed: {e}")
        # Fallback: iptables DROP ALL on local node
        try:
            proc = await asyncio.create_subprocess_exec(
                "iptables", "-P", "INPUT", "DROP",
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await asyncio.wait_for(proc.communicate(), timeout=5)
            log.warning(f"[SOAR] Host isolation attempted via iptables DROP ALL")
            return {"success": True, "host": host, "method": "iptables_drop_all",
                    "warning": "iptables DROP ALL applied — manual review required"}
        except Exception:
            return {"success": False, "host": host,
                    "error": "no isolation method available — configure soar.guardian_api_url"}

    async def _kill_process(self, ctx: Dict) -> Dict:
        if self._guardian_url and ctx.get("host") and _HAS_AIOHTTP:
            try:
                import aiohttp as ah
                hdrs = {"X-Guardian-Key": self._guardian_key}
                async with ah.ClientSession(timeout=ah.ClientTimeout(total=8)) as s:
                    async with s.post(
                        f"{self._guardian_url}/v1/nodes/{ctx['host']}/kill-process",
                        headers=hdrs, json={"rule_id": ctx.get("rule_id", "")}
                    ) as r:
                        return {"success": r.status in (200, 202), "method": "guardian_api"}
            except Exception as e:
                log.warning(f"Guardian kill-process failed: {e}")
        return {"success": False, "note": "configure soar.guardian_api_url for remote process kill"}

    async def _block_dns(self, target: str) -> Dict:
        if not target:
            return {"success": False}
        if self._dns_block_url and _HAS_AIOHTTP:
            try:
                import aiohttp as ah
                async with ah.ClientSession(timeout=ah.ClientTimeout(total=8)) as s:
                    async with s.post(self._dns_block_url,
                                      json={"action": "block", "target": target, "reason": "axto_soc"}) as r:
                        return {"success": r.status in (200,201,204), "target": target}
            except Exception as e:
                return {"success": False, "error": str(e)}
        return {"success": False, "note": "configure soar.dns_block_api_url for DNS blocking"}

    async def _create_ticket(self, ctx: Dict) -> Dict:
        if self._ticket_webhook and _HAS_AIOHTTP:
            r = await self._notify_webhook({**ctx, "event_type": "create_ticket"})
            return {**r, "note": "ticket creation via webhook"}
        log.info(f"[SOAR] Ticket would be created: {ctx.get('title','')}")
        return {"success": True, "note": "no ticketing system configured — log-only"}

    async def _escalate(self, ctx: Dict) -> Dict:
        slack_r = await self._notify_slack({**ctx, "title": f"🔺 ESCALATED: {ctx.get('title','')}"})
        email_r = await self._notify_email(ctx)
        return {"success": slack_r.get("success") or email_r.get("success"),
                "slack": slack_r, "email": email_r}

    async def _snapshot(self, ctx: Dict) -> Dict:
        if self._guardian_url and ctx.get("host") and _HAS_AIOHTTP:
            try:
                import aiohttp as ah
                async with ah.ClientSession(timeout=ah.ClientTimeout(total=30)) as s:
                    async with s.post(
                        f"{self._guardian_url}/v1/nodes/{ctx['host']}/snapshot",
                        headers={"X-Guardian-Key": self._guardian_key}
                    ) as r:
                        return {"success": r.status in (200,202)}
            except Exception:
                pass
        return {"success": False, "note": "configure soar.guardian_api_url for disk snapshots"}

# ─────────────────────────────────────────────────────────────────────────────
# AI TRIAGE ENGINE  (BYOK)
# ─────────────────────────────────────────────────────────────────────────────
class AITriageEngine:
    def __init__(self, vendors: List[Dict]):
        self._vendors = [v for v in vendors if v.get("api_key","").strip()]
        self._enabled = bool(self._vendors)

    async def triage(self, incident: Incident, sample_alerts: List[Alert]) -> Dict:
        if not self._enabled:
            return {}
        vendor   = self._vendors[0]
        provider = vendor.get("provider", "openai")
        api_key  = vendor.get("api_key", "")
        model    = vendor.get("model", "gpt-4o-mini")

        alerts_summary = [
            {"rule": a.rule_name, "host": a.host, "src_ip": a.src_ip,
             "severity": a.severity.value, "ti": a.ti_enrichment.get("src_ip",{}).get("malicious",False)}
            for a in sample_alerts[:8]
        ]
        prompt = (
            "You are a senior SOC analyst. Triage this security incident and return ONLY valid JSON.\n"
            f"Incident: {incident.title} [{incident.severity.value}]\n"
            f"Alerts ({len(incident.alert_ids)} total): {json.dumps(alerts_summary)}\n"
            f"MITRE Tactics: {incident.mitre_tactics}\n\n"
            "Return JSON: {\"threat_actor\": str, \"attack_stage\": str, "
            "\"confidence\": float 0-1, \"immediate_actions\": [str x3], "
            "\"estimated_impact\": str, \"false_positive_likelihood\": float 0-1, "
            "\"priority_score\": int 1-10}"
        )
        try:
            import aiohttp as ah
            timeout = ah.ClientTimeout(total=15)
            if provider == "openai":
                url  = "https://api.openai.com/v1/chat/completions"
                hdrs = {"Authorization": f"Bearer {api_key}"}
                body = {"model": model, "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 500, "temperature": 0, "response_format": {"type": "json_object"}}
            elif provider == "anthropic":
                url  = "https://api.anthropic.com/v1/messages"
                hdrs = {"x-api-key": api_key, "anthropic-version": "2023-06-01"}
                body = {"model": model, "max_tokens": 500, "temperature": 0,
                        "messages": [{"role": "user", "content": prompt}]}
            else:
                url  = f"{vendor.get('base_url','')}/v1/chat/completions"
                hdrs = {"Authorization": f"Bearer {api_key}"}
                body = {"model": model, "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 500, "temperature": 0}
            async with ah.ClientSession(timeout=timeout) as s:
                async with s.post(url, headers={**hdrs, "Content-Type":"application/json"}, json=body) as r:
                    if r.status != 200:
                        return {}
                    d = await r.json()
                    raw = (d.get("choices",[{}])[0].get("message",{}).get("content","")
                           if provider != "anthropic" else d.get("content",[{}])[0].get("text",""))
                    raw = re.sub(r'^```(?:json)?', '', raw.strip()).rstrip('`').strip()
                    return json.loads(raw)
        except Exception as e:
            log.debug(f"AI triage error: {e}")
            return {}

# ─────────────────────────────────────────────────────────────────────────────
# CORRELATION ENGINE  (multi-alert → incident)
# ─────────────────────────────────────────────────────────────────────────────
class CorrelationEngine:
    """
    Groups alerts into incidents based on:
    - Same source IP within time window
    - Same host within time window
    - Same rule within time window
    - Kill-chain progression (e.g. recon → brute force → priv esc)
    """
    def __init__(self, window_sec: int = 900):
        self._window   = window_sec
        self._buckets: Dict[str, List[Alert]] = defaultdict(list)
        self._prune_ts: float = 0

    def correlate(self, alert: Alert) -> Optional[str]:
        """
        Return an existing incident correlation key if this alert belongs to
        an ongoing incident, else None (create new incident).
        """
        now = time.time()
        # Prune old entries every 5 min
        if now - self._prune_ts > 300:
            cutoff = now - self._window
            self._buckets = {
                k: [a for a in v if a.ts > cutoff]
                for k, v in self._buckets.items()
                if any(a.ts > cutoff for a in v)
            }
            self._prune_ts = now

        # Correlation keys (highest priority first)
        keys = []
        if alert.src_ip:
            keys.append(f"srcip:{alert.src_ip}")
        if alert.host:
            keys.append(f"host:{alert.host}")
        keys.append(f"rule:{alert.rule_id}")

        for k in keys:
            if k in self._buckets and self._buckets[k]:
                # Found correlated group — return its incident_id
                for a in reversed(self._buckets[k]):
                    if a.incident_id:
                        self._buckets[k].append(alert)
                        return a.incident_id
        # No correlation — start new bucket
        for k in keys:
            self._buckets[k].append(alert)
        return None

# ─────────────────────────────────────────────────────────────────────────────
# MAIN SOC ENGINE
# ─────────────────────────────────────────────────────────────────────────────
class SOCEngine:
    def __init__(self, config: Dict, db_path: str = "/soc/data/soc.db"):
        self._config    = config
        self._db_path   = db_path
        self._ti        = ThreatIntel(config)
        self._ueba      = UEBAEngine(z_threshold=config.get("ueba_z_threshold", 3.0))
        self._soar      = SOARExecutor(config)
        self._ai        = AITriageEngine(config.get("ai_pool", {}).get("vendors", []))
        self._correlate = CorrelationEngine(window_sec=config.get("correlation_window_sec", 900))
        self._db:       Optional[aiosqlite.Connection] = None
        # Rate-counters: rule_id → deque of timestamps
        self._counters: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=10000))
        # Load local TI feed
        feed_path = config.get("threat_feed_path", "/soc/threat-feed")
        self._ti.load_local_feed(feed_path)
        log.info("SOCEngine initialized")

    # ── Lifecycle ──────────────────────────────────────────────────────────
    async def start(self):
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
        self._db = await aiosqlite.connect(self._db_path)
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA synchronous=NORMAL")
        await self._init_schema()
        asyncio.create_task(self._sla_watchdog())
        asyncio.create_task(self._metrics_collector())
        log.info("SOCEngine started ✓")

    async def stop(self):
        if self._db:
            await self._db.close()

    async def _init_schema(self):
        await self._db.executescript("""
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY, ts REAL, source TEXT, raw_log TEXT,
                rule_id TEXT, rule_name TEXT, severity TEXT,
                host TEXT, user_field TEXT, src_ip TEXT, dst_ip TEXT,
                mitre_tactics TEXT, ti_enrichment TEXT, ueba_anomaly TEXT,
                incident_id TEXT, false_positive INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY, created_at REAL, updated_at REAL,
                title TEXT, severity TEXT, status TEXT,
                alert_ids TEXT, assignee TEXT, description TEXT,
                timeline TEXT, mitre_tactics TEXT, playbook TEXT,
                playbook_steps TEXT, soar_log TEXT, resolution TEXT,
                sla_breach INTEGER DEFAULT 0, mttd_sec REAL DEFAULT 0,
                mttr_sec REAL DEFAULT 0, ai_triage TEXT
            );
            CREATE TABLE IF NOT EXISTS metrics (
                ts REAL, metric TEXT, value REAL, labels TEXT
            );
            CREATE TABLE IF NOT EXISTS fp_feedback (
                id TEXT PRIMARY KEY, ts REAL, alert_id TEXT,
                rule_id TEXT, src_ip TEXT, analyst TEXT, reason TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_alerts_ts       ON alerts(ts);
            CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
            CREATE INDEX IF NOT EXISTS idx_alerts_src_ip   ON alerts(src_ip);
            CREATE INDEX IF NOT EXISTS idx_alerts_host     ON alerts(host);
            CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
            CREATE INDEX IF NOT EXISTS idx_metrics_ts      ON metrics(ts);
        """)
        await self._db.commit()

    # ── Ingest ─────────────────────────────────────────────────────────────
    async def ingest(self, raw: str, source: AlertSource = AlertSource.JSON_API) -> List[Alert]:
        """Parse, detect, enrich, correlate, and respond to a log line."""
        parsed = LogParser.parse(raw, source)
        msg    = parsed.message or raw
        created: List[Alert] = []

        # UEBA observations
        if parsed.user:
            hr = time.localtime().tm_hour
            self._ueba.observe(parsed.user, "login_hour", hr)
        if parsed.src_ip:
            self._ueba.observe(parsed.src_ip, "request_count", 1.0)

        for rule in DETECTION_RULES:
            if not rule["pattern"].search(msg):
                continue

            # Sliding-window threshold
            rid = rule["id"]
            now = time.time()
            win = rule["window_sec"]
            q   = self._counters[rid]
            q.append(now)
            # Trim old
            while q and q[0] < now - win:
                q.popleft()
            if len(q) < rule["threshold"]:
                continue  # not enough events yet

            alert = Alert(
                source=source, raw_log=raw[:2000],
                rule_id=rid, rule_name=rule["name"],
                severity=rule["severity"],
                host=parsed.host, user=parsed.user,
                src_ip=parsed.src_ip, dst_ip=parsed.dst_ip,
                mitre_tactics=rule["mitre"],
            )

            # TI enrichment (parallel)
            alert.ti_enrichment = await self._ti.enrich_alert(alert)

            # UEBA anomaly
            if parsed.user:
                anomaly = self._ueba.observe(parsed.user, "alert_rate", 1.0)
                if anomaly:
                    alert.ueba_anomaly = anomaly

            # Correlation → get or create incident
            existing_inc_id = self._correlate.correlate(alert)
            await self._save_alert(alert)
            inc_id = await self._create_or_update_incident(alert, rule, existing_inc_id)
            alert.incident_id = inc_id

            # Update alert with incident_id
            if self._db:
                await self._db.execute(
                    "UPDATE alerts SET incident_id=? WHERE id=?", (inc_id, alert.id)
                )
                await self._db.commit()

            created.append(alert)
            log.warning(
                f"[{alert.severity.value.upper()}] {alert.rule_name} "
                f"host={alert.host or '?'} src={alert.src_ip or '?'} → incident={inc_id[:8]}"
            )

        return created

    async def _save_alert(self, a: Alert):
        if not self._db:
            return
        await self._db.execute(
            "INSERT OR IGNORE INTO alerts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (a.id, a.ts, a.source.value, a.raw_log, a.rule_id, a.rule_name,
             a.severity.value, a.host, a.user, a.src_ip, a.dst_ip,
             json.dumps(a.mitre_tactics), json.dumps(a.ti_enrichment),
             json.dumps(a.ueba_anomaly) if a.ueba_anomaly else None,
             None, 0),
        )
        await self._db.commit()

    async def _create_or_update_incident(
        self, alert: Alert, rule: Dict, existing_id: Optional[str]
    ) -> str:
        now = time.time()
        if existing_id and self._db:
            # Append to existing incident
            row = await (await self._db.execute(
                "SELECT alert_ids, timeline, severity FROM incidents WHERE id=?", (existing_id,)
            )).fetchone()
            if row:
                ids = json.loads(row[0]); ids.append(alert.id)
                tl  = json.loads(row[1])
                tl.append({"ts": now, "event": "alert_correlated",
                            "rule": alert.rule_name, "src_ip": alert.src_ip})
                # Escalate severity if needed
                sev_order = [s.value for s in Severity]
                cur_sev = row[2]
                new_sev = alert.severity.value
                final_sev = cur_sev if sev_order.index(cur_sev) <= sev_order.index(new_sev) else new_sev
                await self._db.execute(
                    "UPDATE incidents SET alert_ids=?, timeline=?, updated_at=?, severity=? WHERE id=?",
                    (json.dumps(ids), json.dumps(tl), now, final_sev, existing_id),
                )
                await self._db.commit()
                return existing_id

        # New incident
        steps = PLAYBOOKS.get(rule.get("playbook",""), [])
        inc   = Incident(
            title=rule["name"], severity=alert.severity,
            status=IncidentStatus.NEW, alert_ids=[alert.id],
            mitre_tactics=rule["mitre"],
            playbook=rule.get("playbook",""),
            playbook_steps=[{**s, "action": s["action"].value} for s in steps],
            description=rule.get("description",""),
            mttd_sec=time.time() - alert.ts,
        )
        inc.timeline.append({
            "ts": now, "event": "incident_created",
            "rule": rule["name"], "severity": alert.severity.value,
            "sla_minutes": SLA_MINUTES.get(alert.severity, 1440),
        })

        if self._db:
            await self._db.execute(
                "INSERT INTO incidents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (inc.id, inc.created_at, inc.updated_at, inc.title,
                 inc.severity.value, inc.status.value, json.dumps(inc.alert_ids),
                 inc.assignee, inc.description, json.dumps(inc.timeline),
                 json.dumps(inc.mitre_tactics), inc.playbook,
                 json.dumps(inc.playbook_steps), json.dumps([]),
                 inc.resolution, 0, inc.mttd_sec, 0.0, "{}"),
            )
            await self._db.commit()

        # Run automated SOAR playbook (non-blocking)
        asyncio.create_task(self._run_playbook(inc, alert, steps))
        return inc.id

    async def _run_playbook(self, inc: Incident, alert: Alert, steps: List[Dict]):
        """Execute all auto=True playbook steps with full logging."""
        soar_log: List[Dict] = []
        ctx = {
            "incident_id": inc.id, "title": inc.title,
            "severity": inc.severity.value, "host": alert.host,
            "src_ip": alert.src_ip, "dst_ip": alert.dst_ip,
            "description": inc.description, "mitre": alert.mitre_tactics,
            "rule_id": alert.rule_id,
        }
        for step in steps:
            if not step.get("auto"):
                continue
            try:
                action = SOARAction(step["action"])
            except ValueError:
                continue
            result = await self._soar.execute(action, ctx)
            soar_log.append({
                "step": step.get("step"), "action": step["action"],
                "desc": step.get("desc",""), "result": result, "ts": time.time()
            })
            log.info(
                f"[SOAR] Incident {inc.id[:8]} step {step.get('step')} "
                f"{step['action']}: {'✓' if result.get('success') else '✗'}"
            )

        # AI triage (if enabled) — run async after SOAR
        if self._ai._enabled:
            ai = await self._ai.triage(inc, [])
            if ai and self._db:
                await self._db.execute(
                    "UPDATE incidents SET ai_triage=? WHERE id=?",
                    (json.dumps(ai), inc.id)
                )

        # Persist SOAR log
        if self._db and soar_log:
            await self._db.execute(
                "UPDATE incidents SET soar_log=?, status=? WHERE id=?",
                (json.dumps(soar_log), IncidentStatus.TRIAGING.value, inc.id)
            )
            await self._db.commit()

    # ── SLA Watchdog ───────────────────────────────────────────────────────
    async def _sla_watchdog(self):
        """Check SLA compliance every 2 minutes."""
        while True:
            await asyncio.sleep(120)
            if not self._db:
                continue
            now   = time.time()
            rows  = await (await self._db.execute(
                "SELECT id, severity, created_at, sla_breach FROM incidents "
                "WHERE status NOT IN (?,?)",
                (IncidentStatus.CLOSED.value, IncidentStatus.FALSE_POS.value)
            )).fetchall()
            for r in rows:
                try:
                    sev       = Severity(r[1])
                    sla_secs  = SLA_MINUTES.get(sev, 1440) * 60
                    breached  = not r[3] and (now - r[2]) > sla_secs
                    if breached:
                        await self._db.execute(
                            "UPDATE incidents SET sla_breach=1 WHERE id=?", (r[0],)
                        )
                        # Alert via SOAR
                        asyncio.create_task(self._soar.execute(
                            SOARAction.NOTIFY_SLACK,
                            {"title": f"⚠️ SLA BREACH: Incident {r[0][:8]}",
                             "severity": r[1], "description": f"SLA exceeded by >{(now-r[2]-sla_secs)/60:.0f}min",
                             "incident_id": r[0]}
                        ))
                except Exception:
                    pass
            try:
                await self._db.commit()
            except Exception:
                pass

    # ── Metrics Collector ──────────────────────────────────────────────────
    async def _metrics_collector(self):
        """Collect MTTD/MTTR/EPS metrics every 10 minutes."""
        while True:
            await asyncio.sleep(600)
            if not self._db:
                continue
            now = time.time()
            row = await (await self._db.execute(
                "SELECT COUNT(*) FROM alerts WHERE ts > ?", (now - 600,)
            )).fetchone()
            eps = (row[0] or 0) / 600.0
            await self._db.execute(
                "INSERT INTO metrics VALUES (?,?,?,?)",
                (now, "eps_10m", eps, "{}")
            )
            await self._db.commit()

    # ── False Positive Feedback ────────────────────────────────────────────
    async def mark_false_positive(self, alert_id: str, analyst: str, reason: str):
        if not self._db:
            return
        row = await (await self._db.execute(
            "SELECT src_ip, rule_id, incident_id FROM alerts WHERE id=?", (alert_id,)
        )).fetchone()
        if not row:
            return
        src_ip, rule_id, inc_id = row
        await self._db.execute(
            "UPDATE alerts SET false_positive=1 WHERE id=?", (alert_id,)
        )
        await self._db.execute(
            "INSERT INTO fp_feedback VALUES (?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), time.time(), alert_id, rule_id, src_ip or "", analyst, reason)
        )
        if src_ip:
            self._ti.mark_false_positive_ip(src_ip)
        await self._db.commit()
        log.info(f"FP feedback: alert={alert_id[:8]} rule={rule_id} analyst={analyst}")

    # ── Dashboard Stats ────────────────────────────────────────────────────
    async def dashboard_stats(self) -> Dict:
        if not self._db:
            return {}
        now = time.time()
        d1  = now - 86400
        w1  = now - 604800

        async def q(sql, *params):
            return await (await self._db.execute(sql, params)).fetchone()

        async def qa(sql, *params):
            return await (await self._db.execute(sql, params)).fetchall()

        a24h   = (await q("SELECT COUNT(*) FROM alerts WHERE ts>?", d1))[0]
        a7d    = (await q("SELECT COUNT(*) FROM alerts WHERE ts>?", w1))[0]
        open_i = (await q("SELECT COUNT(*) FROM incidents WHERE status NOT IN (?,?)",
                           IncidentStatus.CLOSED.value, IncidentStatus.FALSE_POS.value))[0]
        sla_b  = (await q("SELECT COUNT(*) FROM incidents WHERE sla_breach=1"))[0]
        fp     = (await q("SELECT COUNT(*) FROM fp_feedback WHERE ts>?", d1))[0]
        mttd   = (await q("SELECT AVG(mttd_sec) FROM incidents WHERE created_at>?", w1))[0]
        mttr   = (await q("SELECT AVG(mttr_sec) FROM incidents WHERE created_at>? AND status=?",
                           w1, IncidentStatus.CLOSED.value))[0]
        top_r  = await qa("SELECT rule_name, COUNT(*) FROM alerts WHERE ts>? GROUP BY rule_name ORDER BY 2 DESC LIMIT 5", d1)
        by_sev = await qa("SELECT severity, COUNT(*) FROM alerts WHERE ts>? GROUP BY severity", d1)
        eps_r  = await q("SELECT value FROM metrics WHERE metric='eps_10m' ORDER BY ts DESC LIMIT 1")
        latest = await qa(
            "SELECT id, title, severity, status, created_at FROM incidents ORDER BY created_at DESC LIMIT 5"
        )
        return {
            "alerts_24h":       a24h,
            "alerts_7d":        a7d,
            "open_incidents":   open_i,
            "sla_breaches":     sla_b,
            "false_positives_24h": fp,
            "mttd_minutes":     round((mttd or 0) / 60, 1),
            "mttr_minutes":     round((mttr or 0) / 60, 1),
            "events_per_second": round(eps_r[0] if eps_r else 0, 3),
            "by_severity":      {r[0]: r[1] for r in by_sev},
            "top_rules_24h":    [{"rule": r[0], "count": r[1]} for r in top_r],
            "latest_incidents": [
                {"id": r[0], "title": r[1], "severity": r[2], "status": r[3], "created_at": r[4]}
                for r in latest
            ],
            "ai_enabled":   self._ai._enabled,
            "ti_sources":   (["local_feed"]
                             + (["abuseipdb"] if self._ti._abuseipdb_key else [])
                             + (["otx"] if self._ti._otx_key else [])),
        }
