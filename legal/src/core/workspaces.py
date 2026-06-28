# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) — Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
# ==============================================================================
"""
18 AI Workspace Engines — per AXTO Legal Architecture Spec
Each workspace is an expert AI agent for a specific legal/compliance domain.
"""
import logging
from typing import Optional

logger = logging.getLogger("axto.legal.workspaces")

# ── Workspace Registry ─────────────────────────────────────────────────────────
WORKSPACES = {
    "legal-research": {
        "id": "legal-research",
        "name": "Legal Research Hub",
        "icon": "🔍",
        "category": "research",
        "desc": "Multi-jurisdiction legal research across 195+ countries with AI-powered analysis, citation engine, and real-time regulatory updates.",
        "capabilities": ["jurisdiction_search","citation_generation","case_law_analysis","statute_comparison","regulatory_radar"],
        "task_type": "legal_research",
    },
    "compliance-center": {
        "id": "compliance-center",
        "name": "Compliance Center",
        "icon": "📋",
        "category": "compliance",
        "desc": "50+ regulatory frameworks — GDPR, HIPAA, ISO 27001, SOC 2, OJK, PCI-DSS, FATF, and more. Gap analysis, evidence mapping, and audit-ready reports.",
        "capabilities": ["framework_gap_analysis","control_mapping","compliance_scoring","remediation_planning","audit_report_generation"],
        "task_type": "compliance_check",
    },
    "contract-intelligence": {
        "id": "contract-intelligence",
        "name": "Contract Intelligence",
        "icon": "📄",
        "category": "contracts",
        "desc": "AI-powered contract review, risk scoring, clause extraction, redlining suggestions, and multi-party comparison.",
        "capabilities": ["contract_review","clause_extraction","risk_scoring","redline_suggestions","comparison","drafting_assist"],
        "task_type": "contract_review",
    },
    "regulatory-radar": {
        "id": "regulatory-radar",
        "name": "Regulatory Radar",
        "icon": "📡",
        "category": "monitoring",
        "desc": "Real-time monitoring of legal changes in 195+ jurisdictions. Proactive alerts for regulations affecting your business.",
        "capabilities": ["regulatory_monitoring","change_alerts","impact_assessment","regulatory_calendar","jurisdiction_comparison"],
        "task_type": "legal_research",
    },
    "due-diligence": {
        "id": "due-diligence",
        "name": "Due Diligence Suite",
        "icon": "🏛️",
        "category": "corporate",
        "desc": "M&A, investment, and vendor due diligence. Legal risk assessment, corporate structure analysis, and sanctions screening.",
        "capabilities": ["corporate_structure","sanctions_check","legal_risk_matrix","regulatory_approval","deal_analysis"],
        "task_type": "due_diligence",
    },
    "aml-kyc": {
        "id": "aml-kyc",
        "name": "AML/KYC Intelligence",
        "icon": "🔐",
        "category": "financial",
        "desc": "Anti-money laundering, Know Your Customer, sanctions screening, and financial crime risk assessment across FATF jurisdictions.",
        "capabilities": ["sanctions_screening","pep_check","transaction_monitoring","kyc_workflow","aml_risk_scoring"],
        "task_type": "risk_analysis",
    },
    "ip-trademark": {
        "id": "ip-trademark",
        "name": "IP & Trademark Center",
        "icon": "©️",
        "category": "ip",
        "desc": "Intellectual property research, trademark clearance, patent landscape, and IP protection strategy across 200+ jurisdictions (WIPO Lex).",
        "capabilities": ["trademark_search","patent_analysis","copyright_check","ip_strategy","wipo_search"],
        "task_type": "legal_research",
    },
    "esg-sustainability": {
        "id": "esg-sustainability",
        "name": "ESG & Sustainability",
        "icon": "🌱",
        "category": "esg",
        "desc": "ESG regulatory compliance — CSRD, GRI, IFRS S1/S2, TCFD, SEC climate disclosure, and sustainable finance frameworks.",
        "capabilities": ["esg_gap_analysis","climate_disclosure","sustainability_reporting","greenwashing_check","esg_scoring"],
        "task_type": "compliance_check",
    },
    "litigation-support": {
        "id": "litigation-support",
        "name": "Litigation Support",
        "icon": "⚖️",
        "category": "litigation",
        "desc": "Case strategy, precedent research, argument construction, document review, and outcome prediction.",
        "capabilities": ["precedent_search","argument_analysis","document_review","timeline_build","outcome_prediction"],
        "task_type": "legal_research",
    },
    "labor-employment": {
        "id": "labor-employment",
        "name": "Labor & Employment Law",
        "icon": "👷",
        "category": "employment",
        "desc": "Employment law research across 195+ jurisdictions — hiring, termination, benefits, non-compete, ILO conventions.",
        "capabilities": ["employment_law_search","contract_review","termination_analysis","benefits_check","noncompete_review"],
        "task_type": "legal_research",
    },
    "data-privacy": {
        "id": "data-privacy",
        "name": "Data Privacy Engine",
        "icon": "🛡️",
        "category": "privacy",
        "desc": "GDPR, CCPA, PDPA, UU PDP, and 20+ privacy frameworks. Data mapping, DPIA, consent analysis, and breach response.",
        "capabilities": ["gdpr_analysis","dpia_generation","consent_review","data_mapping","breach_response"],
        "task_type": "compliance_check",
    },
    "corporate-governance": {
        "id": "corporate-governance",
        "name": "Corporate Governance",
        "icon": "🏢",
        "category": "corporate",
        "desc": "Board governance, shareholder rights, corporate structure analysis, and multi-jurisdiction incorporation guidance.",
        "capabilities": ["board_analysis","shareholder_rights","incorporation_guide","governance_framework","board_resolution"],
        "task_type": "legal_research",
    },
    "tax-fiscal": {
        "id": "tax-fiscal",
        "name": "Tax & Fiscal Law",
        "icon": "📊",
        "category": "tax",
        "desc": "Cross-border tax analysis, transfer pricing, OECD MLI, BEPS, FATCA/CRS, and domestic tax compliance.",
        "capabilities": ["tax_treaty_analysis","transfer_pricing","beps_check","fatca_crs","tax_optimization"],
        "task_type": "legal_research",
    },
    "trade-customs": {
        "id": "trade-customs",
        "name": "Trade & Customs Law",
        "icon": "🌐",
        "category": "trade",
        "desc": "International trade law, WTO agreements, customs regulations, ITAR/EAR export controls, and trade remedies.",
        "capabilities": ["hs_code_lookup","trade_agreement_check","customs_duty","itar_ear_check","antidumping"],
        "task_type": "legal_research",
    },
    "real-estate": {
        "id": "real-estate",
        "name": "Real Estate & Property",
        "icon": "🏠",
        "category": "property",
        "desc": "Property law research, title review, lease analysis, zoning compliance, and cross-border property investment.",
        "capabilities": ["title_analysis","lease_review","zoning_check","property_transaction","cross_border_property"],
        "task_type": "contract_review",
    },
    "dispute-resolution": {
        "id": "dispute-resolution",
        "name": "Dispute Resolution",
        "icon": "🤝",
        "category": "arbitration",
        "desc": "International arbitration, mediation strategy, dispute clause analysis, and enforcement under New York Convention.",
        "capabilities": ["arbitration_research","dispute_strategy","clause_analysis","enforcement_analysis","icc_icsid"],
        "task_type": "legal_research",
    },
    "workflow-automation": {
        "id": "workflow-automation",
        "name": "Legal Workflow Automation",
        "icon": "⚡",
        "category": "workflow",
        "desc": "Automate repetitive legal tasks — contract approval, compliance review, NDA processing, and vendor onboarding.",
        "capabilities": ["workflow_templates","task_routing","approval_tracking","deadline_monitor","auto_escalation"],
        "task_type": "summarization",
    },
    "knowledge-center": {
        "id": "knowledge-center",
        "name": "Legal Knowledge Center",
        "icon": "📚",
        "category": "knowledge",
        "desc": "Build your private legal knowledge base. Upload, index, and query your internal policies, precedents, and legal memos.",
        "capabilities": ["knowledge_upload","semantic_search","policy_comparison","internal_precedent","team_knowledge"],
        "task_type": "legal_research",
    },
}

# ── Workspace Prompts ─────────────────────────────────────────────────────────
WORKSPACE_PROMPTS = {
    "legal-research": """You are an expert legal researcher with deep knowledge of laws in 195+ countries.
For the query below, provide:
1. **Direct Answer** — plain language, 2-3 sentences
2. **Jurisdiction Analysis** — for each relevant jurisdiction: law name, article/section, year, citation
3. **Cross-Jurisdiction Comparison** — key differences between jurisdictions
4. **Confidence Score** (0-100%) — how confident in this information
5. **Verification Needed** — flag any areas where the law may have recently changed
6. **Recommended Actions** — practical next steps
7. **Disclaimer** — note this is legal information, not legal advice

⚠️ Never fabricate citations. If uncertain, note the confidence clearly.

Format: JSON with keys: direct_answer, jurisdiction_analysis, comparison, confidence_score, verification_needed, recommended_actions, disclaimer, sources_used
""",

    "compliance-center": """You are a compliance expert covering 50+ regulatory frameworks globally.
For the compliance query below, provide:
1. **Applicable Frameworks** — list all relevant regulations with jurisdiction
2. **Compliance Status** — COMPLIANT / PARTIAL / NON-COMPLIANT per framework
3. **Gap Analysis** — specific non-compliant items with article references
4. **Risk Level** — CRITICAL / HIGH / MEDIUM / LOW with justification
5. **Remediation Steps** — numbered, prioritized action list
6. **Timeline** — realistic implementation timeline
7. **Confidence Score** (0-100%)

Format: JSON with keys: frameworks, compliance_status, gaps, risk_level, remediation_steps, timeline, confidence_score
""",

    "contract-intelligence": """You are a contract law expert with experience across common law and civil law systems.
Analyze the contract/clause below and provide:
1. **Document Type** — what kind of agreement
2. **Parties & Roles** — identify all parties
3. **Key Clauses** — list all significant provisions
4. **Risk Assessment** — for each clause: risk level (CRITICAL/HIGH/MEDIUM/LOW), reason
5. **Redline Suggestions** — proposed revisions for high-risk clauses
6. **Missing Clauses** — important provisions absent from this agreement
7. **Governing Law** — jurisdiction and applicable law
8. **Overall Score** — risk score 0-100 (100 = highest risk)

Format: JSON with keys: document_type, parties, key_clauses, risk_assessment, redline_suggestions, missing_clauses, governing_law, overall_score
""",

    "aml-kyc": """You are an AML/KYC compliance specialist with expertise in FATF recommendations, 
global sanctions, and financial crime prevention across all major jurisdictions.
For the AML/KYC query below, analyze:
1. **Risk Classification** — customer/transaction risk: HIGH/MEDIUM/LOW
2. **Red Flags Identified** — specific suspicious indicators
3. **Applicable AML Rules** — relevant FATF recommendations, local laws
4. **Required KYC Documents** — jurisdiction-specific document requirements
5. **Sanctions Check** — applicable sanction lists (OFAC, EU, UN, UK)
6. **Recommended Actions** — specific compliance steps
7. **Reporting Obligations** — SAR/STR requirements if applicable

Format: JSON with keys: risk_classification, red_flags, applicable_rules, kyc_requirements, sanctions_status, recommended_actions, reporting_obligations
""",

    "due-diligence": """You are a due diligence expert specializing in M&A, investment, and vendor assessment.
Conduct due diligence analysis for the subject below:
1. **Corporate Structure** — entity type, jurisdiction, beneficial ownership flags
2. **Legal Risk Matrix** — identified legal risks by category (regulatory, litigation, IP, labor)
3. **Sanctions & PEP** — screening result and risk level
4. **Regulatory Approvals** — required approvals for the transaction
5. **Red Flags** — items requiring immediate attention
6. **Deal Killers** — factors that may block the transaction
7. **Recommended Next Steps** — specific due diligence actions

Format: JSON with keys: corporate_structure, risk_matrix, sanctions_pep, regulatory_approvals, red_flags, deal_killers, next_steps
""",

    "data-privacy": """You are a data protection expert specializing in global privacy law.
Analyze the privacy matter below with focus on:
1. **Applicable Privacy Laws** — all relevant regulations by jurisdiction
2. **Legal Basis** — lawful basis for processing (GDPR Article 6, etc.)
3. **Data Subject Rights** — rights triggered and how to fulfill them
4. **DPIA Required?** — yes/no with justification (GDPR Article 35 criteria)
5. **Data Transfers** — cross-border transfer mechanisms required
6. **Breach Assessment** — if applicable: severity, notification requirements, timeline
7. **Remediation** — specific privacy-compliant implementation steps

Format: JSON with keys: applicable_laws, legal_basis, data_subject_rights, dpia_required, data_transfers, breach_assessment, remediation
""",

    "esg-sustainability": """You are an ESG and sustainability compliance expert.
Analyze the ESG matter below considering:
1. **Applicable Frameworks** — CSRD, GRI, IFRS S1/S2, TCFD, SEC climate rules, etc.
2. **Mandatory vs Voluntary** — what is legally required vs best practice
3. **Disclosure Requirements** — specific disclosure obligations with deadlines
4. **Greenwashing Risk** — assessment of marketing/reporting claims
5. **Gap Analysis** — current vs required sustainability disclosures
6. **Recommended Actions** — specific ESG improvement steps
7. **Jurisdiction-Specific** — local ESG regulatory requirements

Format: JSON with keys: frameworks, mandatory_requirements, disclosure_requirements, greenwashing_risk, gap_analysis, recommended_actions, jurisdiction_notes
""",
}


async def run_workspace(
    workspace_id: str,
    query: str,
    language: str = "en",
    jurisdictions: Optional[list[str]] = None,
    document_text: str = "",
    context: dict = None,
) -> dict:
    """
    Execute a workspace AI analysis.

    Args:
        workspace_id: One of the 18 workspace IDs
        query: User's question or task
        language: Response language (ISO code)
        jurisdictions: Target jurisdiction codes
        document_text: Extracted document text (for document-based workspaces)
        context: Additional context dict

    Returns:
        Structured analysis result with metadata
    """
    from src.core.llm import get_llm

    ws = WORKSPACES.get(workspace_id)
    if not ws:
        return {"error": f"Unknown workspace: {workspace_id}",
                "available": list(WORKSPACES.keys())}

    llm = get_llm()

    # Build prompt
    system_prompt = WORKSPACE_PROMPTS.get(workspace_id, WORKSPACE_PROMPTS.get(ws["task_type"], ""))
    if not system_prompt:
        system_prompt = f"You are an AI legal expert specializing in {ws['name']}. Analyze the query and provide structured legal guidance in JSON format."

    jur_hint = ""
    if jurisdictions:
        jur_hint = f"\nFocus jurisdictions: {', '.join(j.upper() for j in jurisdictions)}"

    lang_hint = f"\nRespond in language code: {language}"
    if language != "en":
        lang_hint += "\nUse formal, professional legal terminology in the target language."

    doc_section = ""
    if document_text:
        truncated = document_text[:15000]
        doc_section = f"\n\n=== DOCUMENT CONTENT ===\n{truncated}\n=== END DOCUMENT ==="
        if len(document_text) > 15000:
            doc_section += "\n[Document truncated — first 15,000 chars shown]"

    ctx_section = ""
    if context:
        ctx_items = "\n".join(f"- {k}: {v}" for k, v in context.items() if v)
        if ctx_items:
            ctx_section = f"\n\nAdditional Context:\n{ctx_items}"

    full_prompt = f"{jur_hint}{lang_hint}{doc_section}{ctx_section}\n\nQuery/Task:\n{query}"

    try:
        result = await llm.complete_json(
            full_prompt,
            system=system_prompt,
            language=language,
            task_type=ws["task_type"],
        )

        return {
            "workspace":     workspace_id,
            "workspace_name": ws["name"],
            "result":        result,
            "language":      language,
            "jurisdictions": jurisdictions or [],
            "meta": {
                "disclaimer": (
                    "Hasil analisis ini disediakan oleh AXTO Legal AI sebagai bantuan riset hukum. "
                    "Ini adalah informasi hukum, bukan nasihat hukum. Selalu konsultasikan dengan "
                    "konsultan hukum yang berkualifikasi sebelum mengambil keputusan hukum penting. "
                    "© 2024-2026 Axto AI — AXTO (axto.io)"
                ),
                "confidence_note": "Skor kepercayaan mencerminkan ketersediaan informasi dalam basis pengetahuan AI.",
            },
        }

    except Exception as e:
        logger.error("Workspace %s failed: %s", workspace_id, e)
        return {
            "workspace": workspace_id,
            "error":     str(e),
            "message":   "Analisis gagal. Pastikan LLM provider dikonfigurasi dengan benar.",
        }
