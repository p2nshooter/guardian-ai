/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * COMPLIANCE CENTER — client-safe constants: the supported frameworks and the
 * analysis modes. Pure file (no "use client", no server imports) shared by the
 * page and the server task handler.
 * ============================================================================ */

export type FrameworkId = "soc2" | "iso27001" | "gdpr" | "hipaa" | "pci" | "nist" | "uupdp";
export type CompMode = "gap" | "remediation" | "policy" | "questionnaire" | "explain" | "control" | "risk" | "vendor";

export const FRAMEWORKS: { id: FrameworkId; name: string; full: string; blurb: string; focus: string }[] = [
  { id: "soc2", name: "SOC 2", full: "AICPA SOC 2 (Trust Services Criteria)", blurb: "Security, Availability, Confidentiality, Processing Integrity, Privacy.", focus: "Trust Services Criteria (CC1–CC9 common criteria plus the selected categories)" },
  { id: "iso27001", name: "ISO 27001", full: "ISO/IEC 27001:2022", blurb: "Information security management system (ISMS).", focus: "Clauses 4–10 and the Annex A:2022 controls (A.5 organisational, A.6 people, A.7 physical, A.8 technological)" },
  { id: "gdpr", name: "GDPR", full: "EU General Data Protection Regulation", blurb: "EU personal-data protection.", focus: "Lawful basis, data-subject rights, records of processing (Art. 30), DPIAs (Art. 35), breach notification (Art. 33/34), transfers (Ch. V)" },
  { id: "hipaa", name: "HIPAA", full: "US HIPAA Security & Privacy Rules", blurb: "US protected health information (PHI).", focus: "Administrative, Physical and Technical Safeguards (45 CFR §164.308/.310/.312), Privacy Rule, Breach Notification Rule" },
  { id: "pci", name: "PCI DSS", full: "PCI DSS v4.0", blurb: "Payment card data security.", focus: "The 12 requirements across the 6 goals, SAQ scoping, and the customised vs defined approach" },
  { id: "nist", name: "NIST CSF", full: "NIST Cybersecurity Framework 2.0", blurb: "Risk-based cyber programme.", focus: "The six functions — Govern, Identify, Protect, Detect, Respond, Recover — and their categories" },
  { id: "uupdp", name: "UU PDP", full: "Indonesia UU No. 27/2022 (PDP)", blurb: "Indonesia personal-data protection.", focus: "Data-subject rights, lawful processing bases, controller/processor duties, DPO, breach notice (3×24 hours), cross-border transfer" },
];
export const getFramework = (id: string) => FRAMEWORKS.find((f) => f.id === id);
export const isFramework = (x: string): x is FrameworkId => FRAMEWORKS.some((f) => f.id === x);

export const COMP_MODES: { id: CompMode; name: string; icon: string; blurb: string }[] = [
  { id: "gap", name: "Gap analysis", icon: "🔍", blurb: "Audit-style, control-by-control findings with severity and evidence to collect." },
  { id: "remediation", name: "Remediation plan", icon: "🗺️", blurb: "A prioritised 30/60/90-day roadmap with owners and effort." },
  { id: "policy", name: "Policy drafter", icon: "📝", blurb: "Audit-ready policy drafts mapped to the framework's controls." },
  { id: "questionnaire", name: "Questionnaire helper", icon: "✅", blurb: "Draft defensible answers to a vendor security questionnaire." },
  { id: "explain", name: "Explain a control", icon: "💡", blurb: "Plain-language explanation of a control, clause or obligation." },
  { id: "control", name: "Implement a control", icon: "🛠️", blurb: "How to implement one control in your environment, and the evidence an auditor accepts." },
  { id: "risk", name: "Risk assessment", icon: "🎯", blurb: "Identify and score risks, and propose treatments mapped to controls." },
  { id: "vendor", name: "Vendor review", icon: "🤝", blurb: "Review a vendor's answers and documents; list gaps and contract terms to ask for." },
];
export const isCompMode = (x: string): x is CompMode => COMP_MODES.some((m) => m.id === x);
