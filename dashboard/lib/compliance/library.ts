/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * COMPLIANCE CENTER v4 — the policy templates (sections + the controls each
 * one evidences), the vendor-risk questionnaire and the risk categories.
 * Pure data: no React, no server imports.
 * ============================================================================ */
import type { FrameworkId } from "./frameworks";

export interface PolicyTemplate { id: string; name: string; purpose: string; sections: string[]; controls: Partial<Record<FrameworkId, string[]>> }

const STD = ["Purpose", "Scope", "Roles and responsibilities"];
const END = ["Exceptions", "Enforcement", "Review and approval"];
const P = (id: string, name: string, purpose: string, body: string[], controls: PolicyTemplate["controls"]): PolicyTemplate => ({ id, name, purpose, sections: [...STD, ...body, ...END], controls });

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  P("infosec", "Information Security Policy", "Sets management's direction and commitment for protecting information.", ["Security objectives", "Policy framework and supporting documents", "Risk-based approach", "Compliance and monitoring"],
    { iso27001: ["A.5.1", "A.5.4"], soc2: ["CC5.3", "CC1.1"], nist: ["GV.PO"], pci: ["12.1"], hipaa: ["164.316(a)"] }),
  P("aup", "Acceptable Use Policy", "Defines how staff may use company systems, devices and data.", ["Permitted use", "Prohibited use", "E-mail, internet and AI tools", "Monitoring notice"],
    { iso27001: ["A.5.10"], pci: ["12.2"], hipaa: ["164.310(b)"] }),
  P("access", "Access Control Policy", "Grants access on least privilege and need to know, and removes it on time.", ["Access principles", "Requesting and approving access", "Privileged access", "Access reviews", "Joiners, movers and leavers"],
    { iso27001: ["A.5.15", "A.5.18", "A.8.2", "A.8.3"], soc2: ["CC6.1", "CC6.2", "CC6.3"], nist: ["PR.AA"], pci: ["7.1", "7.2", "7.3"], hipaa: ["164.308(a)(4)(ii)(B)", "164.308(a)(4)(ii)(C)"], uupdp: ["Pasal 39"] }),
  P("auth", "Password and Authentication Standard", "Sets the rules for passwords, MFA and authentication secrets.", ["Password requirements", "Multi-factor authentication", "Service and API credentials", "Storage of authentication secrets"],
    { iso27001: ["A.5.17", "A.8.5"], soc2: ["CC6.1"], pci: ["8.3", "8.4", "8.6"], hipaa: ["164.308(a)(5)(ii)(D)", "164.312(d)"] }),
  P("asset", "Asset Management Policy", "Keeps an owned, current inventory of information and technology assets.", ["Asset inventory", "Ownership", "Lifecycle and disposal", "Scope of regulated environments"],
    { iso27001: ["A.5.9", "A.5.11"], soc2: ["CC3.2"], nist: ["ID.AM"], pci: ["12.5"], hipaa: ["164.310(d)(2)(iii)"] }),
  P("classification", "Data Classification and Handling Policy", "Classifies information and defines how each class is handled.", ["Classification levels", "Labelling", "Handling rules per level", "Special categories of personal data"],
    { iso27001: ["A.5.12", "A.5.13"], soc2: ["C1.1"], gdpr: ["Art. 9"], uupdp: ["Pasal 4"] }),
  P("crypto", "Cryptography and Key Management Policy", "Defines approved encryption and how keys are generated, stored and rotated.", ["Approved algorithms", "Encryption at rest", "Encryption in transit", "Key lifecycle", "Certificates"],
    { iso27001: ["A.8.24"], soc2: ["CC6.1", "CC6.7"], pci: ["3.5", "3.6", "3.7", "4.2"], hipaa: ["164.312(a)(2)(iv)", "164.312(e)(2)(ii)"] }),
  P("incident", "Incident Response Plan", "Prepares the organisation to detect, respond to and learn from incidents.", ["Definitions and severity levels", "Response team and contacts", "Detection and reporting", "Containment, eradication and recovery", "Evidence handling", "Post-incident review"],
    { iso27001: ["A.5.24", "A.5.25", "A.5.26", "A.5.27", "A.5.28", "A.6.8"], soc2: ["CC7.3", "CC7.4", "CC7.5"], nist: ["RS.MA", "RS.AN", "RS.MI"], pci: ["12.10"], hipaa: ["164.308(a)(6)(ii)"] }),
  P("bcdr", "Business Continuity and Disaster Recovery Plan", "Keeps critical services running and restores them within agreed targets.", ["Business impact analysis", "RTO and RPO targets", "Recovery strategies", "Communication plan", "Testing schedule"],
    { iso27001: ["A.5.29", "A.5.30", "A.8.14"], soc2: ["CC9.1", "A1.3"], nist: ["RC.RP", "RC.CO"], hipaa: ["164.308(a)(7)(ii)(B)", "164.308(a)(7)(ii)(C)", "164.308(a)(7)(ii)(D)"] }),
  P("backup", "Backup Policy", "Ensures data can be restored after loss, corruption or ransomware.", ["What is backed up", "Frequency and retention", "Encryption and off-site copies", "Restore testing"],
    { iso27001: ["A.8.13"], soc2: ["A1.2"], nist: ["PR.DS"], hipaa: ["164.308(a)(7)(ii)(A)"] }),
  P("change", "Change Management Policy", "Makes changes to systems authorised, tested and reversible.", ["Change types", "Request, review and approval", "Testing and rollback", "Emergency changes", "Segregation of environments"],
    { iso27001: ["A.8.32", "A.8.31", "A.8.19"], soc2: ["CC8.1"], nist: ["PR.PS"], pci: ["6.5"] }),
  P("sdlc", "Secure Development Policy", "Builds security into software from design to release.", ["Security requirements", "Secure coding standards", "Code review", "Security testing", "Dependencies and supply chain", "Release approval"],
    { iso27001: ["A.8.25", "A.8.26", "A.8.27", "A.8.28", "A.8.29"], soc2: ["CC8.1"], nist: ["PR.PS"], pci: ["6.2", "6.4"], gdpr: ["Art. 25"] }),
  P("vuln", "Vulnerability and Patch Management Policy", "Finds and fixes vulnerabilities within risk-based timelines.", ["Scanning scope and frequency", "Severity and remediation timelines", "Penetration testing", "Exceptions and compensating controls"],
    { iso27001: ["A.8.8"], soc2: ["CC7.1"], nist: ["ID.RA"], pci: ["6.3", "11.3", "11.4"] }),
  P("logging", "Logging and Monitoring Policy", "Records security-relevant events and reviews them to detect misuse.", ["Events to log", "Log protection and retention", "Time synchronisation", "Review and alerting"],
    { iso27001: ["A.8.15", "A.8.16", "A.8.17"], soc2: ["CC7.2"], nist: ["DE.CM", "DE.AE"], pci: ["10.2", "10.3", "10.4", "10.5", "10.6"], hipaa: ["164.312(b)", "164.308(a)(1)(ii)(D)"] }),
  P("vendor", "Third-Party Risk Management Policy", "Assesses and monitors suppliers that access data or systems.", ["Vendor tiering", "Due diligence before onboarding", "Contract requirements (security, DPA)", "Ongoing monitoring", "Offboarding"],
    { iso27001: ["A.5.19", "A.5.20", "A.5.21", "A.5.22"], soc2: ["CC9.2", "P6.4"], nist: ["GV.SC"], pci: ["12.8"], hipaa: ["164.308(b)(1)", "164.314(a)"], gdpr: ["Art. 28"], uupdp: ["Pasal 37", "Pasal 51"] }),
  P("physical", "Physical Security Policy", "Protects offices, data rooms and equipment from unauthorised access and damage.", ["Secure areas", "Entry controls and visitors", "Equipment protection", "Clear desk and clear screen"],
    { iso27001: ["A.7.1", "A.7.2", "A.7.3", "A.7.4", "A.7.7"], soc2: ["CC6.4"], pci: ["9.2", "9.3"], hipaa: ["164.310(a)(2)(ii)", "164.310(a)(2)(iii)"] }),
  P("hr", "Human Resources Security Policy", "Covers security before, during and after employment.", ["Background screening", "Terms of employment and NDAs", "Disciplinary process", "Termination and return of assets"],
    { iso27001: ["A.6.1", "A.6.2", "A.6.4", "A.6.5", "A.6.6"], soc2: ["CC1.4", "CC1.5"], pci: ["12.7"], hipaa: ["164.308(a)(3)(ii)(B)", "164.308(a)(3)(ii)(C)"] }),
  P("training", "Security Awareness and Training Policy", "Makes every person able to recognise and report security risks.", ["Onboarding training", "Annual refresher", "Phishing simulations", "Role-based training", "Records of completion"],
    { iso27001: ["A.6.3"], soc2: ["CC2.2"], nist: ["PR.AT"], pci: ["12.6", "5.4"], hipaa: ["164.308(a)(5)(ii)(A)"] }),
  P("remote", "Remote Work and BYOD Policy", "Keeps data safe on home networks and personal devices.", ["Eligible devices", "Minimum device security", "Network and VPN", "Lost or stolen devices"],
    { iso27001: ["A.6.7", "A.8.1", "A.7.9"], pci: ["1.5"], hipaa: ["164.310(c)"] }),
  P("retention", "Data Retention and Disposal Policy", "Keeps records only as long as needed and disposes of them securely.", ["Retention schedule", "Legal holds", "Secure deletion and destruction", "Media re-use"],
    { iso27001: ["A.5.33", "A.8.10", "A.7.14"], soc2: ["P4.2", "P4.3", "C1.2", "CC6.5"], pci: ["3.2", "9.4"], hipaa: ["164.310(d)(2)(i)", "164.316(b)"], gdpr: ["Art. 5", "Art. 17"], uupdp: ["Pasal 42–43"] }),
  P("privacy", "Privacy Notice", "Tells people what personal data is collected, why, and their rights.", ["Who we are and how to contact us", "Data we collect", "Purposes and lawful bases", "Sharing and transfers", "Retention", "Your rights", "Complaints"],
    { soc2: ["P1.1"], gdpr: ["Art. 13–14", "Art. 12"], uupdp: ["Pasal 5", "Pasal 21"] }),
  P("dsr", "Data Subject Rights Procedure", "Handles access, correction, deletion and other requests on time.", ["Receiving and verifying requests", "Deadlines", "Access and portability", "Rectification and erasure", "Objection and restriction", "Records of requests"],
    { soc2: ["P5.1", "P5.2", "P8.1"], gdpr: ["Art. 12", "Art. 15", "Art. 16", "Art. 17", "Art. 18", "Art. 20", "Art. 21"], uupdp: ["Pasal 6", "Pasal 7", "Pasal 8", "Pasal 9", "Pasal 11", "Pasal 13"] }),
  P("breach", "Personal Data Breach Notification Procedure", "Assesses breaches and notifies regulators and people within legal deadlines.", ["Breach assessment", "Notification deadlines by law", "Content of notices", "Breach register"],
    { soc2: ["P6.6"], gdpr: ["Art. 33", "Art. 34"], hipaa: ["164.404", "164.406", "164.408"], uupdp: ["Pasal 46"] }),
  P("dpia", "Data Protection Impact Assessment Procedure", "Assesses high-risk processing before it starts.", ["When a DPIA is required", "Assessment steps", "Consultation", "Approval and review"],
    { gdpr: ["Art. 35", "Art. 36"], uupdp: ["Pasal 34"] }),
  P("risk", "Risk Management Policy", "Identifies, assesses and treats information-security risks consistently.", ["Risk criteria and appetite", "Risk assessment method", "Risk treatment", "Risk register and reporting"],
    { iso27001: ["A.5.7"], soc2: ["CC3.1", "CC3.2", "CC3.4", "CC5.1"], nist: ["GV.RM", "ID.RA"], pci: ["12.3"], hipaa: ["164.308(a)(1)(ii)(A)", "164.308(a)(1)(ii)(B)"] }),
  P("cloud", "Cloud Security Policy", "Governs how cloud services are selected, configured and exited.", ["Approved providers", "Shared responsibility", "Configuration baselines", "Identity and keys in the cloud", "Exit strategy"],
    { iso27001: ["A.5.23"], soc2: ["CC9.2"], nist: ["GV.SC"] }),
];

// ── Vendor risk questionnaire (weights 1–3) ───────────────────────────────────
export type Answer = "yes" | "partial" | "no" | "na";
export interface VendorQuestion { id: string; domain: string; q: string; weight: 1 | 2 | 3 }
export const VENDOR_QUESTIONS: VendorQuestion[] = [
  { id: "cert", domain: "Assurance", q: "Holds a current SOC 2 Type II report or ISO 27001 certificate", weight: 3 },
  { id: "pentest", domain: "Assurance", q: "Independent penetration test in the last 12 months", weight: 2 },
  { id: "policy", domain: "Governance", q: "Maintains an approved information-security policy", weight: 1 },
  { id: "owner", domain: "Governance", q: "Has a named security officer / contact", weight: 1 },
  { id: "dpa", domain: "Privacy", q: "Signs a data processing agreement (DPA) with required terms", weight: 3 },
  { id: "location", domain: "Privacy", q: "Discloses where data is stored and processed; transfers have safeguards", weight: 2 },
  { id: "subproc", domain: "Privacy", q: "Lists sub-processors and gives notice of changes", weight: 1 },
  { id: "mfa", domain: "Access", q: "Enforces MFA for staff and administrator access", weight: 3 },
  { id: "sso", domain: "Access", q: "Supports SSO / SCIM for customer accounts", weight: 1 },
  { id: "review", domain: "Access", q: "Reviews privileged access at least quarterly", weight: 2 },
  { id: "rest", domain: "Data protection", q: "Encrypts customer data at rest", weight: 3 },
  { id: "transit", domain: "Data protection", q: "Encrypts data in transit (TLS 1.2+)", weight: 3 },
  { id: "delete", domain: "Data protection", q: "Deletes or returns data at contract end, with confirmation", weight: 2 },
  { id: "vuln", domain: "Operations", q: "Patches critical vulnerabilities within a defined SLA", weight: 2 },
  { id: "logs", domain: "Operations", q: "Keeps security logs and monitors them for anomalies", weight: 2 },
  { id: "backup", domain: "Resilience", q: "Backs up data and tests restores", weight: 2 },
  { id: "bcp", domain: "Resilience", q: "Has a tested business-continuity / disaster-recovery plan", weight: 2 },
  { id: "ir", domain: "Incidents", q: "Has an incident-response plan and notifies customers of breaches within a defined time", weight: 3 },
  { id: "insurance", domain: "Incidents", q: "Carries cyber insurance", weight: 1 },
  { id: "training", domain: "People", q: "Trains staff on security at least yearly and screens new hires", weight: 1 },
];

export type Criticality = "low" | "medium" | "high" | "critical";
export type DataAccess = "none" | "internal" | "confidential" | "personal" | "sensitive";
export const CRITICALITIES: Criticality[] = ["low", "medium", "high", "critical"];
export const DATA_ACCESS: DataAccess[] = ["none", "internal", "confidential", "personal", "sensitive"];

export const RISK_CATEGORIES = ["security", "privacy", "operational", "vendor", "legal", "financial", "strategic"] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];
