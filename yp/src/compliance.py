# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
"""
YP Compliance — real controls engine.

Ships genuine control catalogs for the major frameworks (each control has an
id, title, and the fact key it evaluates), evaluates a submitted `facts` map
against them, and returns a real pass/fail/gap report with remediation and a
compliance percentage. It also pulls live evidence from YP's own event log so
"we redact PII" or "we keep an audit trail" is backed by actual runtime data,
not just a checkbox — keeping compliance interconnected with the rest of YP.
"""
from __future__ import annotations
from dataclasses import dataclass


@dataclass
class Control:
    id: str
    title: str
    fact: str            # key in the submitted facts dict expected to be truthy
    remediation: str


# Real control catalogs (representative core controls per framework).
FRAMEWORKS: dict[str, dict] = {
    "gdpr": {
        "name": "GDPR",
        "controls": [
            Control("gdpr.6", "Lawful basis for processing recorded", "lawful_basis_documented",
                    "Document a lawful basis (consent, contract, legitimate interest) per data flow."),
            Control("gdpr.25", "Data protection by design & default (redaction)", "pii_redaction_enabled",
                    "Enable PII redaction before data leaves your systems (YP privacy layer)."),
            Control("gdpr.30", "Records of processing activities", "processing_records_kept",
                    "Maintain a register of processing activities."),
            Control("gdpr.32", "Security of processing (encryption/audit)", "audit_trail_enabled",
                    "Keep an immutable audit trail and encrypt data at rest/in transit."),
            Control("gdpr.33", "Breach notification process (72h)", "breach_process_documented",
                    "Define a 72-hour breach-notification runbook."),
            Control("gdpr.17", "Right to erasure supported", "erasure_supported",
                    "Provide a mechanism to erase a data subject's records on request."),
        ],
    },
    "hipaa": {
        "name": "HIPAA",
        "controls": [
            Control("hipaa.164.312a", "Access control (unique user IDs)", "access_control_enabled",
                    "Enforce unique user identification and least-privilege access."),
            Control("hipaa.164.312b", "Audit controls", "audit_trail_enabled",
                    "Record and examine activity in systems that contain PHI."),
            Control("hipaa.164.312e", "Transmission security (encryption)", "encryption_in_transit",
                    "Encrypt PHI in transit; redact before third-party AI calls."),
            Control("hipaa.164.308a", "Risk analysis", "risk_assessment_done",
                    "Conduct and document a security risk analysis."),
            Control("hipaa.phi_redaction", "PHI minimization before AI processing", "phi_redaction_enabled",
                    "Strip PHI before sending prompts to any AI provider (YP privacy layer)."),
        ],
    },
    "soc2": {
        "name": "SOC 2",
        "controls": [
            Control("soc2.cc6.1", "Logical access controls", "access_control_enabled",
                    "Restrict logical access to authorized users."),
            Control("soc2.cc7.2", "Security monitoring / detection", "monitoring_enabled",
                    "Continuously monitor for anomalies (YP SOC engine)."),
            Control("soc2.cc7.3", "Incident response", "incident_response_plan",
                    "Maintain and test an incident-response plan."),
            Control("soc2.cc4.1", "Audit logging", "audit_trail_enabled",
                    "Retain audit logs of security-relevant events."),
            Control("soc2.a1.2", "Availability / backups", "backups_configured",
                    "Configure and test backups and recovery."),
        ],
    },
    "iso27001": {
        "name": "ISO 27001",
        "controls": [
            Control("iso.a5", "Information security policies", "security_policy_documented",
                    "Publish and maintain an information-security policy."),
            Control("iso.a8", "Asset management / inventory", "asset_inventory_maintained",
                    "Maintain an inventory of assets (YP OT/asset module)."),
            Control("iso.a9", "Access control", "access_control_enabled",
                    "Manage access based on business need."),
            Control("iso.a12", "Operations security / logging", "audit_trail_enabled",
                    "Log and monitor operational activity."),
            Control("iso.a16", "Incident management", "incident_response_plan",
                    "Manage information-security incidents consistently."),
        ],
    },
    "pci_dss": {
        "name": "PCI-DSS",
        "controls": [
            Control("pci.3", "Protect stored cardholder data (mask/redact)", "financial_redaction_enabled",
                    "Mask/redact PAN; never store more than allowed (YP privacy layer)."),
            Control("pci.4", "Encrypt cardholder data in transit", "encryption_in_transit",
                    "Use strong cryptography over open networks."),
            Control("pci.8", "Identify & authenticate access", "access_control_enabled",
                    "Assign unique IDs; enforce authentication."),
            Control("pci.10", "Track & monitor access (audit)", "audit_trail_enabled",
                    "Log all access to cardholder data and system components."),
            Control("pci.11", "Regularly test security", "vuln_scanning_enabled",
                    "Run regular vulnerability scans and monitoring."),
        ],
    },
    "fedramp": {
        "name": "FedRAMP",
        "controls": [
            Control("fr.ac", "Access control (AC family)", "access_control_enabled",
                    "Implement NIST 800-53 AC controls."),
            Control("fr.au", "Audit & accountability (AU family)", "audit_trail_enabled",
                    "Implement AU controls; retain and review logs."),
            Control("fr.si", "System & information integrity", "monitoring_enabled",
                    "Flaw remediation, monitoring, and integrity verification."),
            Control("fr.cm", "Configuration management", "config_baseline_documented",
                    "Maintain secure configuration baselines."),
            Control("fr.ir", "Incident response", "incident_response_plan",
                    "Establish an incident-response capability."),
        ],
    },
}


def list_frameworks() -> list:
    return [{"id": fid, "name": f["name"], "control_count": len(f["controls"])}
            for fid, f in FRAMEWORKS.items()]


def evaluate(framework_id: str, facts: dict, runtime_evidence: dict | None = None) -> dict:
    """
    Evaluate `facts` against a framework's controls. runtime_evidence lets YP
    auto-satisfy certain controls from its own live state (e.g. redaction is on,
    audit trail has entries) so the report reflects reality, not just claims.
    """
    fw = FRAMEWORKS.get(framework_id)
    if not fw:
        return {"error": "unknown_framework", "available": list(FRAMEWORKS.keys())}

    facts = dict(facts or {})
    # Fold YP's own runtime truths in as evidence-backed facts.
    ev = runtime_evidence or {}
    if ev.get("redaction_active"):
        for k in ("pii_redaction_enabled", "phi_redaction_enabled", "financial_redaction_enabled"):
            facts.setdefault(k, True)
    if ev.get("audit_events", 0) > 0:
        facts.setdefault("audit_trail_enabled", True)
    if ev.get("soc_active"):
        facts.setdefault("monitoring_enabled", True)
    if ev.get("assets_inventoried", 0) > 0:
        facts.setdefault("asset_inventory_maintained", True)

    results = []
    passed = 0
    for c in fw["controls"]:
        ok = bool(facts.get(c.fact))
        if ok:
            passed += 1
        results.append({
            "control_id": c.id, "title": c.title, "fact": c.fact,
            "status": "pass" if ok else "gap",
            "remediation": None if ok else c.remediation,
            "evidence_backed": c.fact in (facts.keys() & _EVIDENCE_FACTS) and ev != {},
        })
    total = len(fw["controls"])
    pct = round(100.0 * passed / total, 1) if total else 0.0
    return {
        "framework": fw["name"], "framework_id": framework_id,
        "controls_total": total, "controls_passed": passed,
        "compliance_pct": pct,
        "gaps": [r for r in results if r["status"] == "gap"],
        "results": results,
    }


_EVIDENCE_FACTS = {
    "pii_redaction_enabled", "phi_redaction_enabled", "financial_redaction_enabled",
    "audit_trail_enabled", "monitoring_enabled", "asset_inventory_maintained",
}
