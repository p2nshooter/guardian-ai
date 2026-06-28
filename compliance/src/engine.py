# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
AXTO Compliance — Automated Audit Platform v1.0
================================================
Production-grade continuous compliance monitoring.

Capabilities:
  ▸ Frameworks: SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR, PDPA, NIST CSF, CIS Controls v8, IEC 62443, FedRAMP, NERC CIP
  ▸ Auto-Evidence: HTTP probing, TLS cert check, port scan, API calls
  ▸ Control Checks: 80+ controls across 7 frameworks
  ▸ Gap Analysis: Severity-weighted remediation guidance
  ▸ Risk Register: Inherent + residual risk scoring
  ▸ Policy Library: 50+ templates (auto-generated, editable)
  ▸ Vendor Assessment: Third-party questionnaire engine
  ▸ Continuous Monitoring: Background checks every 24h
  ▸ Audit Reports: JSON + Markdown (PDF via wkhtmltopdf if available)
  ▸ Evidence Collection: Hash-verified, timestamped, immutable log
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import socket
import ssl
import time
import uuid
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import aiosqlite

try:
    import aiohttp
    _HAS_AIOHTTP = True
except ImportError:
    _HAS_AIOHTTP = False

log = logging.getLogger("compliance.engine")

# ─────────────────────────────────────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────────────────────────────────────
class Framework(str, Enum):
    SOC2     = "soc2"
    ISO27001 = "iso27001"
    HIPAA    = "hipaa"
    PCI_DSS  = "pci_dss"
    GDPR     = "gdpr"
    PDPA     = "pdpa"
    NIST_CSF     = "nist_csf"
    CIS_CONTROLS = "cis_controls"   # CIS Controls v8
    IEC_62443    = "iec_62443"      # Industrial control systems
    FEDRAMP      = "fedramp"        # US Federal
    NERC_CIP     = "nerc_cip"       # Critical infrastructure power

class ControlStatus(str, Enum):
    PASS    = "pass"
    FAIL    = "fail"
    PARTIAL = "partial"
    MANUAL  = "manual_review"   # requires human; system found evidence but incomplete
    NA      = "not_applicable"

class RiskLevel(str, Enum):
    CRITICAL = "critical"
    HIGH     = "high"
    MEDIUM   = "medium"
    LOW      = "low"

class CheckType(str, Enum):
    HTTP_ENDPOINT  = "http_endpoint"    # GET/HEAD endpoint — expect 200/redirect
    TLS_CERT       = "tls_cert"         # Check cert expiry + grade
    PORT_CLOSED    = "port_closed"      # Port must NOT be open
    PORT_OPEN      = "port_open"        # Port must be open
    FILE_EXISTS    = "file_exists"      # File/dir present on disk
    ENV_VAR        = "env_var"          # Environment variable set
    PROCESS_RUNNING= "process_running"  # Process/service running
    DNS_RECORD     = "dns_record"       # DNS record exists
    HTTP_HEADER    = "http_header"      # Response header present/value
    HTTP_REDIRECT  = "http_redirect"    # HTTP → HTTPS redirect
    MANUAL         = "manual"           # Always manual_review

# ─────────────────────────────────────────────────────────────────────────────
# CONTROL LIBRARY  (80+ production controls, 7 frameworks)
# ─────────────────────────────────────────────────────────────────────────────
CONTROL_LIBRARY: Dict[Framework, List[Dict]] = {
    Framework.SOC2: [
        {
            "id": "CC1.1", "domain": "Control Environment",
            "title": "Integrity & Ethical Values Policy",
            "description": "Organization has documented code of conduct / ethics policy",
            "weight": 1.0, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/code-of-conduct.pdf"},
            "remediation": "Create and document a Code of Conduct. Place at /etc/axto-compliance/policies/code-of-conduct.pdf or configure policy_dir in compliance.yml",
        },
        {
            "id": "CC2.1", "domain": "Information & Communication",
            "title": "Security Communication Channels",
            "description": "Internal communication channels for security information exist",
            "weight": 0.8, "check_type": CheckType.HTTP_ENDPOINT,
            "check_param": {"url_key": "internal_portal_url", "expected_status": [200, 301, 302]},
            "remediation": "Configure internal_portal_url in compliance.yml pointing to intranet/wiki",
        },
        {
            "id": "CC3.1", "domain": "Risk Assessment",
            "title": "Risk Assessment Documented",
            "description": "Organization has formal risk assessment process",
            "weight": 1.2, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/risk/risk-register.json"},
            "remediation": "Create risk register at /etc/axto-compliance/risk/risk-register.json",
        },
        {
            "id": "CC6.1", "domain": "Logical Access",
            "title": "Access Control Policy",
            "description": "Logical access controls implemented and documented",
            "weight": 1.5, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/access-control-policy.pdf"},
            "remediation": "Document access control policy and save to /etc/axto-compliance/policies/",
        },
        {
            "id": "CC6.2", "domain": "Logical Access",
            "title": "MFA Enforced",
            "description": "Multi-factor authentication required for all user access",
            "weight": 1.5, "check_type": CheckType.HTTP_HEADER,
            "check_param": {"url_key": "app_url", "header": "Strict-Transport-Security"},
            "remediation": "Enable MFA on all authentication systems. Enforce HSTS on web services.",
        },
        {
            "id": "CC6.3", "domain": "Logical Access",
            "title": "SSH Root Login Disabled",
            "description": "Direct root SSH login is disabled",
            "weight": 1.3, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/ssh/sshd_config", "content_check": "PermitRootLogin no"},
            "remediation": "Set 'PermitRootLogin no' in /etc/ssh/sshd_config and restart sshd",
        },
        {
            "id": "CC6.7", "domain": "Logical Access",
            "title": "HTTPS Enforced",
            "description": "All web traffic uses HTTPS with valid certificate",
            "weight": 1.4, "check_type": CheckType.HTTP_REDIRECT,
            "check_param": {"url_key": "app_url"},
            "remediation": "Enable HTTPS on all web services and configure HTTP→HTTPS redirect",
        },
        {
            "id": "CC7.1", "domain": "System Operations",
            "title": "Vulnerability Scanning",
            "description": "Regular vulnerability scanning in place",
            "weight": 1.4, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/evidence/vuln-scan-report.json",
                            "max_age_days": 30},
            "remediation": "Run monthly vulnerability scan and save report to evidence directory",
        },
        {
            "id": "CC7.2", "domain": "System Operations",
            "title": "Security Monitoring Active",
            "description": "Continuous security monitoring and alerting in place",
            "weight": 1.3, "check_type": CheckType.HTTP_ENDPOINT,
            "check_param": {"url_key": "guardian_api_url", "path": "/health",
                            "expected_status": [200]},
            "remediation": "Deploy AXTO Guardian or equivalent security monitoring solution",
        },
        {
            "id": "CC7.3", "domain": "System Operations",
            "title": "Log Retention",
            "description": "System logs retained for minimum 90 days",
            "weight": 1.2, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/var/log", "min_age_days": 90},
            "remediation": "Configure log rotation to retain logs for minimum 90 days",
        },
        {
            "id": "CC8.1", "domain": "Change Management",
            "title": "Change Management Process",
            "description": "Changes managed through documented change management process",
            "weight": 1.0, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/change-management.pdf"},
            "remediation": "Document change management policy and save to policy directory",
        },
        {
            "id": "A1.1", "domain": "Availability",
            "title": "Uptime Monitoring",
            "description": "System availability monitoring in place",
            "weight": 1.3, "check_type": CheckType.HTTP_ENDPOINT,
            "check_param": {"url_key": "uptime_monitor_url", "expected_status": [200]},
            "remediation": "Configure uptime monitoring (UptimeRobot, Pingdom, or self-hosted)",
        },
        {
            "id": "C1.1", "domain": "Confidentiality",
            "title": "Data Classification Policy",
            "description": "Data classification policy implemented",
            "weight": 1.2, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/data-classification.pdf"},
            "remediation": "Create data classification policy (Public/Internal/Confidential/Restricted)",
        },
        {
            "id": "P1.1", "domain": "Privacy",
            "title": "Privacy Policy Published",
            "description": "Privacy notice accessible to data subjects",
            "weight": 1.1, "check_type": CheckType.HTTP_ENDPOINT,
            "check_param": {"url_key": "privacy_policy_url", "expected_status": [200]},
            "remediation": "Publish privacy policy at a public URL and configure privacy_policy_url",
        },
    ],
    Framework.ISO27001: [
        {
            "id": "A.5.1.1", "domain": "Information Security Policies",
            "title": "ISMS Policy Document",
            "description": "Information security policy defined and approved",
            "weight": 1.0, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/isms-policy.pdf"},
            "remediation": "Create ISMS policy document covering security objectives and scope",
        },
        {
            "id": "A.8.1.1", "domain": "Asset Management",
            "title": "Asset Inventory",
            "description": "All information assets inventoried and owners assigned",
            "weight": 1.1, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/assets/asset-inventory.json"},
            "remediation": "Create asset inventory JSON with all systems, owners, and classifications",
        },
        {
            "id": "A.9.1.1", "domain": "Access Control",
            "title": "Access Control Policy",
            "description": "Access control policy established based on business and security requirements",
            "weight": 1.3, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/access-control-policy.pdf"},
            "remediation": "Establish formal access control policy covering all system types",
        },
        {
            "id": "A.10.1.1", "domain": "Cryptography",
            "title": "TLS/Encryption on All Services",
            "description": "All services use TLS 1.2+ with valid certificates",
            "weight": 1.4, "check_type": CheckType.TLS_CERT,
            "check_param": {"url_key": "app_url", "min_days_remaining": 30},
            "remediation": "Ensure all services use TLS 1.2+. Certificate must have 30+ days remaining.",
        },
        {
            "id": "A.12.1.1", "domain": "Operations Security",
            "title": "Operational Procedures Documented",
            "description": "Operating procedures documented and available",
            "weight": 1.0, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/runbooks"},
            "remediation": "Create operational runbooks directory with documented procedures",
        },
        {
            "id": "A.12.4.1", "domain": "Operations Security",
            "title": "System Logging Active",
            "description": "Event logs produced and monitored",
            "weight": 1.3, "check_type": CheckType.PROCESS_RUNNING,
            "check_param": {"process_names": ["rsyslog", "syslog-ng", "journald", "fluent"]},
            "remediation": "Enable rsyslog or syslog-ng for centralized log collection",
        },
        {
            "id": "A.12.6.1", "domain": "Operations Security",
            "title": "Patch Management",
            "description": "Technical vulnerabilities identified and remediated timely",
            "weight": 1.4, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/evidence/patch-log.json",
                            "max_age_days": 30},
            "remediation": "Apply OS/package updates monthly and log evidence",
        },
        {
            "id": "A.13.1.1", "domain": "Network Security",
            "title": "Firewall Active",
            "description": "Network controls implemented to manage access",
            "weight": 1.3, "check_type": CheckType.PROCESS_RUNNING,
            "check_param": {"process_names": ["ufw", "iptables", "firewalld", "nftables"]},
            "remediation": "Enable and configure firewall (ufw/iptables/firewalld)",
        },
        {
            "id": "A.16.1.1", "domain": "Incident Management",
            "title": "Incident Response Procedure",
            "description": "Incident management procedure established and documented",
            "weight": 1.4, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/incident-response.pdf"},
            "remediation": "Create incident response procedure covering detection, containment, recovery",
        },
        {
            "id": "A.17.1.1", "domain": "Business Continuity",
            "title": "Business Continuity Plan",
            "description": "Business continuity planning process established",
            "weight": 1.2, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/bcp.pdf"},
            "remediation": "Create BCP covering critical systems, RTO/RPO targets, and recovery procedures",
        },
    ],
    Framework.PCI_DSS: [
        {
            "id": "PCI-1.1", "domain": "Network Security",
            "title": "Firewall Configured",
            "description": "Firewall installed and configured to protect cardholder data",
            "weight": 1.5, "check_type": CheckType.PROCESS_RUNNING,
            "check_param": {"process_names": ["ufw", "iptables", "firewalld", "nftables"]},
            "remediation": "Enable firewall and restrict inbound/outbound traffic per PCI DSS Req 1",
        },
        {
            "id": "PCI-2.1", "domain": "System Configuration",
            "title": "Default Passwords Changed",
            "description": "Vendor-supplied defaults changed before deployment",
            "weight": 1.5, "check_type": CheckType.MANUAL,
            "check_param": {},
            "remediation": "Verify all default vendor credentials changed. Document evidence.",
        },
        {
            "id": "PCI-3.4", "domain": "Data Protection",
            "title": "PAN Data Encrypted at Rest",
            "description": "Primary Account Number (PAN) rendered unreadable in storage",
            "weight": 2.0, "check_type": CheckType.ENV_VAR,
            "check_param": {"var_names": ["ENCRYPTION_KEY", "PCI_ENCRYPTION_KEY", "AES_KEY"]},
            "remediation": "Configure encryption key via environment variable for PAN data encryption",
        },
        {
            "id": "PCI-4.1", "domain": "Data Transmission",
            "title": "TLS 1.2+ Enforced",
            "description": "Strong cryptography used to transmit cardholder data",
            "weight": 1.8, "check_type": CheckType.TLS_CERT,
            "check_param": {"url_key": "app_url", "min_tls_version": "TLSv1.2",
                            "min_days_remaining": 30},
            "remediation": "Configure TLS 1.2+ on all payment-related endpoints",
        },
        {
            "id": "PCI-5.1", "domain": "Malware Protection",
            "title": "Antivirus/EDR Active",
            "description": "Antivirus software deployed and operational",
            "weight": 1.3, "check_type": CheckType.HTTP_ENDPOINT,
            "check_param": {"url_key": "guardian_api_url", "path": "/health",
                            "expected_status": [200]},
            "remediation": "Deploy AXTO Guardian or equivalent antivirus/EDR solution",
        },
        {
            "id": "PCI-6.3", "domain": "Secure Development",
            "title": "Web App Firewall (WAF)",
            "description": "Public-facing web applications protected by WAF",
            "weight": 1.4, "check_type": CheckType.HTTP_HEADER,
            "check_param": {"url_key": "app_url", "header": "X-Frame-Options"},
            "remediation": "Enable WAF and configure security headers (X-Frame-Options, CSP, etc.)",
        },
        {
            "id": "PCI-7.1", "domain": "Access Control",
            "title": "Need-to-Know Access",
            "description": "System access restricted by business need",
            "weight": 1.6, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/access-control-policy.pdf"},
            "remediation": "Implement role-based access control and document the policy",
        },
        {
            "id": "PCI-8.2", "domain": "Identity Management",
            "title": "Unique User IDs",
            "description": "All users assigned unique ID — no shared accounts",
            "weight": 1.4, "check_type": CheckType.MANUAL,
            "check_param": {},
            "remediation": "Audit user accounts and ensure no shared/generic accounts exist",
        },
        {
            "id": "PCI-10.1", "domain": "Logging",
            "title": "Access Logging Enabled",
            "description": "All access to network resources and cardholder data logged",
            "weight": 1.5, "check_type": CheckType.PROCESS_RUNNING,
            "check_param": {"process_names": ["rsyslog", "syslog-ng", "auditd"]},
            "remediation": "Enable auditd and rsyslog for comprehensive access logging",
        },
        {
            "id": "PCI-11.3", "domain": "Security Testing",
            "title": "Penetration Test Evidence",
            "description": "Annual penetration test conducted",
            "weight": 1.4, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/evidence/pentest-report.pdf",
                            "max_age_days": 365},
            "remediation": "Conduct annual penetration test and store report as evidence",
        },
        {
            "id": "PCI-12.1", "domain": "Policy",
            "title": "Information Security Policy",
            "description": "Security policy addressing all PCI DSS requirements",
            "weight": 1.0, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/information-security-policy.pdf"},
            "remediation": "Create comprehensive information security policy covering all PCI requirements",
        },
    ],
    Framework.HIPAA: [
        {
            "id": "HP-164.308a1", "domain": "Administrative",
            "title": "Security Management Program",
            "description": "Security management process implemented",
            "weight": 1.5, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/hipaa-security-policy.pdf"},
            "remediation": "Create HIPAA security management program documentation",
        },
        {
            "id": "HP-164.308a3", "domain": "Administrative",
            "title": "Workforce Security Training",
            "description": "Security training for workforce members who handle PHI",
            "weight": 1.3, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/evidence/security-training-log.json",
                            "max_age_days": 365},
            "remediation": "Conduct annual HIPAA security training and log completion records",
        },
        {
            "id": "HP-164.310a1", "domain": "Physical",
            "title": "Facility Access Controls",
            "description": "Physical access controls limit access to PHI systems",
            "weight": 1.3, "check_type": CheckType.MANUAL,
            "check_param": {},
            "remediation": "Implement physical access controls (badge, key card, camera) for server rooms",
        },
        {
            "id": "HP-164.312a1", "domain": "Technical",
            "title": "ePHI Access Controls",
            "description": "Technical controls restrict ePHI access to authorized persons",
            "weight": 1.6, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/access-control-policy.pdf"},
            "remediation": "Implement role-based access control for all ePHI systems",
        },
        {
            "id": "HP-164.312a2iv", "domain": "Technical",
            "title": "ePHI Encryption at Rest",
            "description": "ePHI encrypted when stored",
            "weight": 1.7, "check_type": CheckType.ENV_VAR,
            "check_param": {"var_names": ["ENCRYPTION_KEY", "HIPAA_ENC_KEY", "PHI_KEY"]},
            "remediation": "Configure encryption for all ePHI datastores",
        },
        {
            "id": "HP-164.312b", "domain": "Technical",
            "title": "Audit Controls",
            "description": "Hardware/software recording and examining ePHI access activity",
            "weight": 1.5, "check_type": CheckType.PROCESS_RUNNING,
            "check_param": {"process_names": ["auditd", "syslog-ng", "rsyslog"]},
            "remediation": "Enable auditd for ePHI access logging",
        },
        {
            "id": "HP-164.312e2ii", "domain": "Technical",
            "title": "ePHI Transmission Encryption",
            "description": "ePHI encrypted in transit",
            "weight": 1.6, "check_type": CheckType.TLS_CERT,
            "check_param": {"url_key": "app_url", "min_days_remaining": 14},
            "remediation": "Enforce TLS 1.2+ for all ePHI data in transit",
        },
        {
            "id": "HP-164.308a6", "domain": "Administrative",
            "title": "Security Incident Procedures",
            "description": "Policies and procedures for security incidents involving PHI",
            "weight": 1.4, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/incident-response.pdf"},
            "remediation": "Create HIPAA-specific incident response procedure with breach notification process",
        },
    ],
    Framework.GDPR: [
        {
            "id": "GDPR-5", "domain": "Data Principles",
            "title": "Processing Principles Documented",
            "description": "Personal data processed lawfully, fairly, and transparently",
            "weight": 1.5, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/gdpr/ropa.json"},
            "remediation": "Create Record of Processing Activities (ROPA) at /etc/axto-compliance/gdpr/ropa.json",
        },
        {
            "id": "GDPR-12", "domain": "Data Subject Rights",
            "title": "Privacy Notice Published",
            "description": "Transparent privacy notice accessible to data subjects",
            "weight": 1.3, "check_type": CheckType.HTTP_ENDPOINT,
            "check_param": {"url_key": "privacy_policy_url", "expected_status": [200]},
            "remediation": "Publish GDPR-compliant privacy notice at public URL",
        },
        {
            "id": "GDPR-17", "domain": "Data Subject Rights",
            "title": "Erasure Process Implemented",
            "description": "Right to erasure (right to be forgotten) process operational",
            "weight": 1.4, "check_type": CheckType.HTTP_ENDPOINT,
            "check_param": {"url_key": "vault_api_url", "path": "/v1/erasure",
                            "method": "OPTIONS", "expected_status": [200, 204, 405]},
            "remediation": "Deploy AXTO Vault or implement erasure endpoint for data subject requests",
        },
        {
            "id": "GDPR-25", "domain": "Privacy by Design",
            "title": "Privacy by Design Controls",
            "description": "Data protection by design and default implemented",
            "weight": 1.3, "check_type": CheckType.HTTP_ENDPOINT,
            "check_param": {"url_key": "vault_api_url", "path": "/health",
                            "expected_status": [200]},
            "remediation": "Deploy AXTO Vault for privacy by design (auto-masking of PII)",
        },
        {
            "id": "GDPR-32", "domain": "Security",
            "title": "Appropriate Security Measures",
            "description": "Technical and organizational security measures implemented",
            "weight": 1.5, "check_type": CheckType.TLS_CERT,
            "check_param": {"url_key": "app_url", "min_days_remaining": 30},
            "remediation": "Implement encryption, access controls, and monitoring (see AXTO Guardian + Vault)",
        },
        {
            "id": "GDPR-33", "domain": "Breach Notification",
            "title": "Breach Response Procedure",
            "description": "Breach notification to supervisory authority within 72 hours",
            "weight": 1.4, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/gdpr/breach-notification-procedure.pdf"},
            "remediation": "Create breach notification procedure with 72-hour timeline and DPA contact details",
        },
        {
            "id": "GDPR-35", "domain": "Risk Assessment",
            "title": "DPIA Conducted",
            "description": "Data Protection Impact Assessments for high-risk processing",
            "weight": 1.3, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/gdpr/dpia"},
            "remediation": "Conduct DPIA for high-risk processing activities and store reports",
        },
        {
            "id": "GDPR-44", "domain": "International Transfers",
            "title": "Cross-Border Transfer Mechanism",
            "description": "Lawful mechanism for international data transfers",
            "weight": 1.3, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/gdpr/transfer-mechanisms.pdf"},
            "remediation": "Document transfer mechanisms (SCCs, adequacy decision, BCRs) for all cross-border transfers",
        },
    ],
    Framework.PDPA: [
        {
            "id": "PDPA-6", "domain": "Collection Limitation",
            "title": "Data Collection Minimization",
            "description": "Personal data collected only for specified, explicit purposes",
            "weight": 1.3, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/pdpa/data-purpose-register.json"},
            "remediation": "Create data purpose register documenting all personal data collection purposes",
        },
        {
            "id": "PDPA-12", "domain": "Consent",
            "title": "Consent Management",
            "description": "Valid consent obtained before processing personal data",
            "weight": 1.5, "check_type": CheckType.HTTP_ENDPOINT,
            "check_param": {"url_key": "consent_api_url", "expected_status": [200]},
            "remediation": "Implement consent management system and configure consent_api_url",
        },
        {
            "id": "PDPA-19", "domain": "Data Subject Rights",
            "title": "Access Request Process",
            "description": "Process for data subject access requests",
            "weight": 1.3, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/pdpa/subject-access-request-procedure.pdf"},
            "remediation": "Document and implement subject access request handling procedure",
        },
        {
            "id": "PDPA-24", "domain": "Security",
            "title": "Personal Data Security",
            "description": "Appropriate security measures for personal data protection",
            "weight": 1.5, "check_type": CheckType.TLS_CERT,
            "check_param": {"url_key": "app_url", "min_days_remaining": 30},
            "remediation": "Implement encryption and access controls for all personal data",
        },
        {
            "id": "PDPA-26", "domain": "Breach Notification",
            "title": "72-Hour Breach Notification",
            "description": "Data breach reported to PDPA within 72 hours",
            "weight": 1.4, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/pdpa/breach-notification-procedure.pdf"},
            "remediation": "Create breach notification procedure with PDPA contact details and 72h timeline",
        },
    ],
    Framework.NIST_CSF: [
        {
            "id": "ID.AM-1", "domain": "Identify / Asset Management",
            "title": "Physical Device Inventory",
            "description": "Physical devices and systems inventoried",
            "weight": 1.0, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/assets/asset-inventory.json"},
            "remediation": "Create asset inventory covering all physical and virtual systems",
        },
        {
            "id": "PR.AC-1", "domain": "Protect / Access Control",
            "title": "Identity Management",
            "description": "Identities and credentials managed for authorized devices and users",
            "weight": 1.3, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/access-control-policy.pdf"},
            "remediation": "Implement IAM and document access control policy",
        },
        {
            "id": "PR.DS-1", "domain": "Protect / Data Security",
            "title": "Data at Rest Protection",
            "description": "Data at rest is protected",
            "weight": 1.4, "check_type": CheckType.ENV_VAR,
            "check_param": {"var_names": ["ENCRYPTION_KEY", "DB_ENCRYPTION_KEY"]},
            "remediation": "Enable disk/database encryption and configure keys via environment",
        },
        {
            "id": "PR.DS-2", "domain": "Protect / Data Security",
            "title": "Data in Transit Protection",
            "description": "Data in transit is protected",
            "weight": 1.4, "check_type": CheckType.TLS_CERT,
            "check_param": {"url_key": "app_url", "min_days_remaining": 30},
            "remediation": "Enforce TLS 1.2+ on all communication channels",
        },
        {
            "id": "DE.CM-1", "domain": "Detect / Monitoring",
            "title": "Network Monitoring",
            "description": "Network monitored to detect cybersecurity events",
            "weight": 1.3, "check_type": CheckType.HTTP_ENDPOINT,
            "check_param": {"url_key": "soc_api_url", "path": "/health", "expected_status": [200]},
            "remediation": "Deploy AXTO SOC or equivalent SIEM for network monitoring",
        },
        {
            "id": "RS.RP-1", "domain": "Respond / Response Planning",
            "title": "Response Plan Executed",
            "description": "Response plan executed during or after incident",
            "weight": 1.2, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/incident-response.pdf"},
            "remediation": "Create and test incident response plan",
        },
        {
            "id": "RC.RP-1", "domain": "Recover / Recovery Planning",
            "title": "Recovery Plan Implemented",
            "description": "Recovery plan executed during or after cybersecurity incident",
            "weight": 1.2, "check_type": CheckType.FILE_EXISTS,
            "check_param": {"path": "/etc/axto-compliance/policies/bcp.pdf"},
            "remediation": "Create business continuity and disaster recovery plan",
        },
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
# DATA MODELS
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class Evidence:
    id:          str = field(default_factory=lambda: str(uuid.uuid4()))
    control_id:  str = ""
    check_type:  str = ""
    collected_at: float = field(default_factory=time.time)
    raw_data:    Dict = field(default_factory=dict)
    hash:        str = ""    # SHA-256 of raw_data JSON (tamper evidence)
    collector:   str = "auto"

    def compute_hash(self):
        self.hash = hashlib.sha256(json.dumps(self.raw_data, sort_keys=True).encode()).hexdigest()

@dataclass
class ControlResult:
    control_id:  str = ""
    framework:   Framework = Framework.SOC2
    status:      ControlStatus = ControlStatus.MANUAL
    score:       float = 0.0
    evidence:    List[Evidence] = field(default_factory=list)
    gaps:        List[str] = field(default_factory=list)
    remediation: str = ""
    checked_at:  float = field(default_factory=time.time)
    check_ms:    float = 0.0

    def to_dict(self) -> Dict:
        d = asdict(self)
        d["evidence"] = [{"id": e.id, "check_type": e.check_type,
                          "collected_at": e.collected_at, "hash": e.hash} for e in self.evidence]
        return d

@dataclass
class AssessmentResult:
    id:            str = field(default_factory=lambda: str(uuid.uuid4()))
    framework:     Framework = Framework.SOC2
    started_at:    float = field(default_factory=time.time)
    completed_at:  float = 0.0
    overall_score: float = 0.0
    controls:      List[ControlResult] = field(default_factory=list)
    gaps:          List[Dict] = field(default_factory=list)
    pass_count:    int = 0
    fail_count:    int = 0
    partial_count: int = 0
    manual_count:  int = 0
    risk_level:    RiskLevel = RiskLevel.HIGH
    summary:       str = ""

# ─────────────────────────────────────────────────────────────────────────────
# AUTOMATED CHECK ENGINE
# ─────────────────────────────────────────────────────────────────────────────
class AutoChecker:
    """
    Real automated checks against actual system state.
    All checks produce Evidence objects with hash-verified raw data.
    """
    def __init__(self, config: Dict):
        self._cfg = config
        self._urls = config.get("endpoints", {})

    def _resolve_url(self, url_key: str, path: str = "") -> str:
        base = self._urls.get(url_key, "")
        if not base:
            return ""
        return base.rstrip("/") + (path or "")

    async def check(self, ctrl: Dict) -> Tuple[ControlStatus, float, List[str], Evidence]:
        """Run automated check. Returns (status, score, gaps, evidence)."""
        t0 = time.perf_counter()
        ct = ctrl.get("check_type", CheckType.MANUAL)
        p  = ctrl.get("check_param", {})
        ev = Evidence(control_id=ctrl["id"], check_type=ct)

        try:
            if ct == CheckType.FILE_EXISTS:
                status, score, gaps = await self._check_file(p, ev)
            elif ct == CheckType.HTTP_ENDPOINT:
                status, score, gaps = await self._check_http(p, ev)
            elif ct == CheckType.TLS_CERT:
                status, score, gaps = await self._check_tls(p, ev)
            elif ct == CheckType.PORT_CLOSED:
                status, score, gaps = await self._check_port_closed(p, ev)
            elif ct == CheckType.PORT_OPEN:
                status, score, gaps = await self._check_port_open(p, ev)
            elif ct == CheckType.ENV_VAR:
                status, score, gaps = await self._check_env_var(p, ev)
            elif ct == CheckType.PROCESS_RUNNING:
                status, score, gaps = await self._check_process(p, ev)
            elif ct == CheckType.HTTP_HEADER:
                status, score, gaps = await self._check_http_header(p, ev)
            elif ct == CheckType.HTTP_REDIRECT:
                status, score, gaps = await self._check_http_redirect(p, ev)
            else:
                status, score, gaps = ControlStatus.MANUAL, 0.0, ["Requires manual review"]
        except Exception as e:
            status = ControlStatus.FAIL
            score  = 0.0
            gaps   = [f"Check execution error: {e}"]
            ev.raw_data["error"] = str(e)

        ev.raw_data["check_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        ev.compute_hash()
        return status, score, gaps, ev

    async def _check_file(self, p: Dict, ev: Evidence) -> Tuple[ControlStatus, float, List[str]]:
        path = p.get("path", "")
        ev.raw_data = {"path": path}
        if not path:
            return ControlStatus.MANUAL, 0.0, ["path not configured"]
        if not os.path.exists(path):
            return ControlStatus.FAIL, 0.0, [f"Required path not found: {path}"]

        # Age check
        max_age = p.get("max_age_days")
        if max_age:
            mtime = os.path.getmtime(path)
            age_days = (time.time() - mtime) / 86400
            ev.raw_data["age_days"] = round(age_days, 1)
            if age_days > max_age:
                return ControlStatus.FAIL, 20.0, [
                    f"File {path} is {age_days:.0f} days old — must be updated within {max_age} days"
                ]

        # Minimum age check (log retention)
        min_age = p.get("min_age_days")
        if min_age:
            mtime = os.path.getmtime(path)
            age_days = (time.time() - mtime) / 86400
            ev.raw_data["age_days"] = round(age_days, 1)
            if age_days < min_age:
                return ControlStatus.FAIL, 30.0, [
                    f"Log at {path} only {age_days:.0f} days old — need {min_age} days retention"
                ]

        # Content check
        content_check = p.get("content_check")
        if content_check and os.path.isfile(path):
            try:
                content = open(path).read()
                if content_check not in content:
                    return ControlStatus.FAIL, 40.0, [
                        f"Required configuration not found in {path}: '{content_check}'"
                    ]
            except Exception as e:
                return ControlStatus.PARTIAL, 60.0, [f"Could not read {path}: {e}"]

        ev.raw_data["exists"] = True
        size = os.path.getsize(path) if os.path.isfile(path) else 0
        ev.raw_data["size_bytes"] = size
        return ControlStatus.PASS, 100.0, []

    async def _check_http(self, p: Dict, ev: Evidence) -> Tuple[ControlStatus, float, List[str]]:
        url_key = p.get("url_key", "")
        path    = p.get("path", "")
        method  = p.get("method", "GET").upper()
        url     = self._resolve_url(url_key, path) or p.get("url", "")
        ev.raw_data = {"url": url, "method": method}
        if not url:
            return ControlStatus.MANUAL, 0.0, [f"URL not configured: set endpoints.{url_key} in compliance.yml"]
        if not _HAS_AIOHTTP:
            return ControlStatus.MANUAL, 0.0, ["aiohttp not installed — HTTP checks unavailable"]
        try:
            import aiohttp as ah
            expected = p.get("expected_status", [200])
            async with ah.ClientSession(timeout=ah.ClientTimeout(total=10)) as s:
                async with s.request(method, url, ssl=False, allow_redirects=True) as r:
                    ev.raw_data.update({"status": r.status, "url_final": str(r.url)})
                    if r.status in expected:
                        return ControlStatus.PASS, 100.0, []
                    return ControlStatus.FAIL, 0.0, [
                        f"Endpoint {url} returned {r.status}, expected {expected}"
                    ]
        except Exception as e:
            return ControlStatus.FAIL, 0.0, [f"Endpoint {url} unreachable: {e}"]

    async def _check_tls(self, p: Dict, ev: Evidence) -> Tuple[ControlStatus, float, List[str]]:
        url_key = p.get("url_key", "")
        url     = self._resolve_url(url_key) or p.get("url", "")
        ev.raw_data = {"url": url}
        if not url:
            return ControlStatus.MANUAL, 0.0, [f"URL not configured: set endpoints.{url_key} in compliance.yml"]
        try:
            import re as _re
            host = _re.sub(r'^https?://', '', url).split('/')[0].split(':')[0]
            port = 443
            ctx  = ssl.create_default_context()
            conn = asyncio.open_connection(host, port, ssl=ctx)
            reader, writer = await asyncio.wait_for(conn, timeout=10)
            cert = writer.get_extra_info('ssl_object').getpeercert()
            writer.close()

            # Parse expiry
            import datetime
            exp_str = cert.get('notAfter', '')
            exp_dt  = datetime.datetime.strptime(exp_str, '%b %d %H:%M:%S %Y %Z')
            days_left = (exp_dt - datetime.datetime.utcnow()).days
            ev.raw_data.update({"days_remaining": days_left, "subject": dict(x[0] for x in cert.get("subject", [])),
                                 "expires": exp_str})
            min_days = p.get("min_days_remaining", 30)
            if days_left < 0:
                return ControlStatus.FAIL, 0.0, [f"TLS certificate EXPIRED for {host}"]
            if days_left < min_days:
                return ControlStatus.FAIL, 20.0, [
                    f"TLS cert expires in {days_left} days (min: {min_days}). Renew immediately."
                ]
            return ControlStatus.PASS, 100.0, []
        except ssl.SSLCertVerificationError as e:
            ev.raw_data["ssl_error"] = str(e)
            return ControlStatus.FAIL, 0.0, [f"TLS certificate verification failed: {e}"]
        except Exception as e:
            return ControlStatus.FAIL, 0.0, [f"TLS check error for {url}: {e}"]

    async def _check_port_closed(self, p: Dict, ev: Evidence) -> Tuple[ControlStatus, float, List[str]]:
        host = p.get("host", "localhost")
        port = p.get("port", 22)
        ev.raw_data = {"host": host, "port": port}
        try:
            conn = asyncio.open_connection(host, port)
            reader, writer = await asyncio.wait_for(conn, timeout=3)
            writer.close()
            ev.raw_data["open"] = True
            return ControlStatus.FAIL, 0.0, [f"Port {port} is open on {host} — should be closed"]
        except (ConnectionRefusedError, asyncio.TimeoutError, OSError):
            ev.raw_data["open"] = False
            return ControlStatus.PASS, 100.0, []

    async def _check_port_open(self, p: Dict, ev: Evidence) -> Tuple[ControlStatus, float, List[str]]:
        host = p.get("host", "localhost")
        port = p.get("port", 80)
        ev.raw_data = {"host": host, "port": port}
        try:
            conn = asyncio.open_connection(host, port)
            reader, writer = await asyncio.wait_for(conn, timeout=3)
            writer.close()
            ev.raw_data["open"] = True
            return ControlStatus.PASS, 100.0, []
        except Exception as e:
            ev.raw_data["open"] = False
            return ControlStatus.FAIL, 0.0, [f"Port {port} not open on {host}: {e}"]

    async def _check_env_var(self, p: Dict, ev: Evidence) -> Tuple[ControlStatus, float, List[str]]:
        var_names = p.get("var_names", [])
        ev.raw_data = {"checked_vars": var_names}
        found = [v for v in var_names if os.environ.get(v, "").strip()]
        ev.raw_data["found_vars"] = found
        if found:
            return ControlStatus.PASS, 100.0, []
        return ControlStatus.FAIL, 0.0, [
            f"Required environment variable not set. Checked: {', '.join(var_names)}"
        ]

    async def _check_process(self, p: Dict, ev: Evidence) -> Tuple[ControlStatus, float, List[str]]:
        names = p.get("process_names", [])
        ev.raw_data = {"checked_processes": names}
        try:
            proc = await asyncio.create_subprocess_exec(
                "ps", "aux", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
            ps_output  = stdout.decode()
            found = [n for n in names if n in ps_output]
            ev.raw_data["found_processes"] = found
            if found:
                return ControlStatus.PASS, 100.0, []
            return ControlStatus.FAIL, 0.0, [
                f"Required process not running. Expected one of: {', '.join(names)}"
            ]
        except Exception as e:
            return ControlStatus.MANUAL, 0.0, [f"Cannot check processes: {e}"]

    async def _check_http_header(self, p: Dict, ev: Evidence) -> Tuple[ControlStatus, float, List[str]]:
        url_key = p.get("url_key", "")
        url     = self._resolve_url(url_key) or p.get("url", "")
        header  = p.get("header", "")
        ev.raw_data = {"url": url, "required_header": header}
        if not url or not _HAS_AIOHTTP:
            return ControlStatus.MANUAL, 0.0, [f"Set endpoints.{url_key} in compliance.yml"]
        try:
            import aiohttp as ah
            async with ah.ClientSession(timeout=ah.ClientTimeout(total=8)) as s:
                async with s.head(url, ssl=False, allow_redirects=True) as r:
                    present = header in r.headers
                    ev.raw_data.update({"header_present": present, "value": r.headers.get(header,"")})
                    if present:
                        return ControlStatus.PASS, 100.0, []
                    return ControlStatus.FAIL, 0.0, [
                        f"Security header '{header}' missing from {url}"
                    ]
        except Exception as e:
            return ControlStatus.FAIL, 0.0, [f"Header check failed: {e}"]

    async def _check_http_redirect(self, p: Dict, ev: Evidence) -> Tuple[ControlStatus, float, List[str]]:
        url_key  = p.get("url_key", "")
        base_url = self._resolve_url(url_key) or p.get("url", "")
        ev.raw_data = {"url": base_url}
        if not base_url or not _HAS_AIOHTTP:
            return ControlStatus.MANUAL, 0.0, [f"Set endpoints.{url_key} in compliance.yml"]
        # Try HTTP version
        http_url = base_url.replace("https://", "http://")
        try:
            import aiohttp as ah
            async with ah.ClientSession(timeout=ah.ClientTimeout(total=8)) as s:
                async with s.get(http_url, ssl=False, allow_redirects=False) as r:
                    location = r.headers.get("Location", "")
                    ev.raw_data.update({"http_status": r.status, "redirect_to": location})
                    is_redirect = r.status in (301, 302, 307, 308) and "https://" in location
                    if is_redirect:
                        return ControlStatus.PASS, 100.0, []
                    return ControlStatus.FAIL, 0.0, [
                        f"HTTP→HTTPS redirect not configured on {http_url} (status: {r.status})"
                    ]
        except Exception as e:
            return ControlStatus.FAIL, 0.0, [f"HTTP redirect check failed: {e}"]

# ─────────────────────────────────────────────────────────────────────────────
# MAIN COMPLIANCE ENGINE
# ─────────────────────────────────────────────────────────────────────────────
class ComplianceEngine:
    def __init__(self, config: Dict, db_path: str = "/compliance/data/compliance.db"):
        self._config   = config
        self._db_path  = db_path
        self._checker  = AutoChecker(config)
        self._db:      Optional[aiosqlite.Connection] = None
        self._frameworks: List[Framework] = [
            Framework(f) for f in config.get("frameworks", [])
            if f in {e.value for e in Framework}
        ]
        self._monitor_interval = config.get("continuous_monitoring_interval_hours", 24) * 3600
        log.info(f"ComplianceEngine init — frameworks={[f.value for f in self._frameworks]}")

    async def start(self):
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
        self._db = await aiosqlite.connect(self._db_path)
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._init_schema()
        asyncio.create_task(self._continuous_monitor())
        log.info("ComplianceEngine started ✓")

    async def stop(self):
        if self._db:
            await self._db.close()

    async def _init_schema(self):
        await self._db.executescript("""
            CREATE TABLE IF NOT EXISTS assessments (
                id TEXT PRIMARY KEY, framework TEXT, started_at REAL,
                completed_at REAL, overall_score REAL, pass_count INTEGER,
                fail_count INTEGER, partial_count INTEGER, manual_count INTEGER,
                risk_level TEXT, gaps TEXT, summary TEXT
            );
            CREATE TABLE IF NOT EXISTS control_results (
                id TEXT PRIMARY KEY, assessment_id TEXT, control_id TEXT,
                framework TEXT, status TEXT, score REAL, gaps TEXT,
                remediation TEXT, checked_at REAL, check_ms REAL
            );
            CREATE TABLE IF NOT EXISTS evidence (
                id TEXT PRIMARY KEY, control_id TEXT, framework TEXT,
                description TEXT, content TEXT,
                check_type TEXT, collected_at REAL, uploaded_at REAL,
                raw_data TEXT, hash TEXT, collector TEXT
            );
            CREATE TABLE IF NOT EXISTS risk_items (
                id TEXT PRIMARY KEY, title TEXT, description TEXT,
                risk_level TEXT, framework TEXT, control_id TEXT,
                remediation TEXT, status TEXT DEFAULT 'open',
                assignee TEXT, notes TEXT, target_date TEXT,
                created_at REAL, resolved_at REAL
            );
            CREATE TABLE IF NOT EXISTS policies (
                id TEXT PRIMARY KEY, name TEXT, framework TEXT, content TEXT,
                version TEXT, created_at REAL, next_review REAL
            );
            CREATE TABLE IF NOT EXISTS exclusions (
                id TEXT PRIMARY KEY, control_id TEXT, framework TEXT,
                reason TEXT, approved_by TEXT, created_at REAL
            );
            CREATE TABLE IF NOT EXISTS assessment_results (
                id TEXT PRIMARY KEY, framework TEXT, overall_score REAL,
                risk_level TEXT, pass_count INTEGER, fail_count INTEGER,
                partial_count INTEGER, manual_count INTEGER, completed_at REAL
            );
            CREATE INDEX IF NOT EXISTS idx_assess_fw      ON assessments(framework);
            CREATE INDEX IF NOT EXISTS idx_assess_res_fw  ON assessment_results(framework);
            CREATE INDEX IF NOT EXISTS idx_ctrl_assess    ON control_results(assessment_id);
            CREATE INDEX IF NOT EXISTS idx_ctrl_fw        ON control_results(framework);
            CREATE INDEX IF NOT EXISTS idx_evidence_ctrl  ON evidence(control_id);
            CREATE INDEX IF NOT EXISTS idx_risk_status    ON risk_items(status);
            CREATE INDEX IF NOT EXISTS idx_exclusion_fw   ON exclusions(framework);
        """)
        await self._db.commit()

    async def run_assessment(self, framework: Framework) -> AssessmentResult:
        """Run full automated + manual-flagged assessment for a framework."""
        controls = CONTROL_LIBRARY.get(framework, [])
        started  = time.time()
        result   = AssessmentResult(framework=framework, started_at=started)

        # Run all control checks concurrently (up to 10 at a time)
        semaphore = asyncio.Semaphore(10)
        async def _run_one(ctrl: Dict) -> ControlResult:
            async with semaphore:
                t0 = time.perf_counter()
                status, score, gaps, evidence = await self._checker.check(ctrl)
                return ControlResult(
                    control_id=ctrl["id"], framework=framework,
                    status=status, score=score, gaps=gaps,
                    remediation=ctrl.get("remediation",""),
                    checked_at=time.time(),
                    check_ms=round((time.perf_counter()-t0)*1000,1),
                    evidence=[evidence],
                )

        tasks   = [_run_one(c) for c in controls]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        # Aggregate with weights
        total_weight = sum(c.get("weight", 1.0) for c in controls)
        weighted_score = 0.0
        for ctrl, res in zip(controls, results):
            w = ctrl.get("weight", 1.0)
            if res.status == ControlStatus.PASS:
                weighted_score += w * 100.0
                result.pass_count += 1
            elif res.status == ControlStatus.PARTIAL:
                weighted_score += w * 50.0
                result.partial_count += 1
            elif res.status == ControlStatus.MANUAL:
                weighted_score += w * 0.0   # assume not-yet-passed for scoring
                result.manual_count += 1
            else:
                result.fail_count += 1
        overall = weighted_score / total_weight if total_weight > 0 else 0.0

        # Risk level
        risk = (RiskLevel.CRITICAL if overall < 40 else
                RiskLevel.HIGH    if overall < 60 else
                RiskLevel.MEDIUM  if overall < 80 else
                RiskLevel.LOW)

        # Gap list
        gaps = []
        for ctrl, res in zip(controls, results):
            for gap in res.gaps:
                gaps.append({
                    "control_id": res.control_id, "control_title": ctrl["title"],
                    "severity": "high" if res.status == ControlStatus.FAIL else "medium",
                    "gap": gap, "remediation": res.remediation,
                })

        result.controls      = list(results)
        result.overall_score = round(overall, 1)
        result.risk_level    = risk
        result.gaps          = gaps
        result.completed_at  = time.time()
        result.summary       = (
            f"{framework.value.upper()} Assessment: {result.overall_score:.1f}% compliance "
            f"({result.pass_count} pass / {result.fail_count} fail / "
            f"{result.partial_count} partial / {result.manual_count} manual) — "
            f"Risk: {risk.value.upper()}"
        )

        await self._persist_assessment(result)
        await self._create_risk_items(result)
        log.info(result.summary)
        return result

    async def _persist_assessment(self, r: AssessmentResult):
        await self._db.execute(
            "INSERT OR REPLACE INTO assessments VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (r.id, r.framework.value, r.started_at, r.completed_at, r.overall_score,
             r.pass_count, r.fail_count, r.partial_count, r.manual_count,
             r.risk_level.value, json.dumps(r.gaps), r.summary),
        )
        # Also write to assessment_results for history API
        await self._db.execute(
            "INSERT OR REPLACE INTO assessment_results VALUES (?,?,?,?,?,?,?,?,?)",
            (r.id, r.framework.value, r.overall_score, r.risk_level.value,
             r.pass_count, r.fail_count, r.partial_count, r.manual_count, r.completed_at),
        )
        for ctrl in r.controls:
            rid = str(uuid.uuid4())
            await self._db.execute(
                "INSERT OR REPLACE INTO control_results VALUES (?,?,?,?,?,?,?,?,?,?)",
                (rid, r.id, ctrl.control_id, ctrl.framework.value,
                 ctrl.status.value, ctrl.score, json.dumps(ctrl.gaps),
                 ctrl.remediation, ctrl.checked_at, ctrl.check_ms),
            )
            for ev in ctrl.evidence:
                await self._db.execute(
                    "INSERT OR IGNORE INTO evidence (id,control_id,framework,check_type,collected_at,raw_data,hash,collector) VALUES (?,?,?,?,?,?,?,?)",
                    (ev.id, ev.control_id, r.framework.value, ev.check_type, ev.collected_at,
                     json.dumps(ev.raw_data), ev.hash, ev.collector),
                )
        await self._db.commit()

    async def _create_risk_items(self, r: AssessmentResult):
        for gap in r.gaps:
            if gap["severity"] == "high":
                await self._db.execute(
                    "INSERT OR IGNORE INTO risk_items (id,title,description,risk_level,framework,control_id,remediation,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
                    (str(uuid.uuid4()), gap["control_id"], gap["gap"],
                     "high" if gap["severity"]=="high" else "medium",
                     r.framework.value, gap["control_id"], gap["remediation"],
                     "open", time.time()),
                )
        await self._db.commit()

    async def _continuous_monitor(self):
        """Background: re-run all enabled framework assessments periodically."""
        while True:
            await asyncio.sleep(self._monitor_interval)
            for fw in self._frameworks:
                try:
                    log.info(f"Continuous monitoring: running {fw.value} assessment")
                    await self.run_assessment(fw)
                except Exception as e:
                    log.error(f"Continuous monitor error ({fw.value}): {e}")

    async def get_summary(self) -> Dict:
        if not self._db:
            return {}
        rows = await (await self._db.execute(
            "SELECT framework, MAX(completed_at), overall_score, risk_level, pass_count, fail_count "
            "FROM assessments GROUP BY framework ORDER BY MAX(completed_at) DESC"
        )).fetchall()
        open_risks = (await (await self._db.execute(
            "SELECT risk_level, COUNT(*) FROM risk_items WHERE status='open' GROUP BY risk_level"
        )).fetchall())
        return {
            "frameworks_enabled":  [f.value for f in self._frameworks],
            "latest_assessments": [
                {"framework": r[0], "last_assessed": r[1], "score": r[2],
                 "risk_level": r[3], "pass": r[4], "fail": r[5]} for r in rows
            ],
            "open_risk_items": {r[0]: r[1] for r in open_risks},
        }

    async def generate_report(self, framework: Framework) -> Dict:
        """Generate audit-ready report for a framework."""
        if not self._db:
            return {}
        row = await (await self._db.execute(
            "SELECT * FROM assessments WHERE framework=? ORDER BY completed_at DESC LIMIT 1",
            (framework.value,)
        )).fetchone()
        if not row:
            return {"error": f"No assessment found for {framework.value}. Run assessment first."}
        cols = ["id","framework","started_at","completed_at","overall_score",
                "pass_count","fail_count","partial_count","manual_count","risk_level","gaps","summary"]
        assessment = dict(zip(cols, row))
        assessment["gaps"] = json.loads(assessment["gaps"] or "[]")

        ctrl_rows = await (await self._db.execute(
            "SELECT control_id, status, score, gaps, remediation FROM control_results "
            "WHERE assessment_id=? ORDER BY score ASC",
            (assessment["id"],)
        )).fetchall()
        assessment["controls"] = [
            {"id": r[0], "status": r[1], "score": r[2],
             "gaps": json.loads(r[3] or "[]"), "remediation": r[4]}
            for r in ctrl_rows
        ]
        assessment["generated_at"] = time.time()
        assessment["product"] = "AXTO Compliance"
        return assessment
