"""
AXTO Legal — Legal Knowledge module
====================================
Makes AXTO Legal smarter at reaching legal sources & case law:

  • LEGAL_SOURCES   — curated, well-established OFFICIAL / FREE legal databases,
                      grouped by jurisdiction. These are starting points an admin
                      can extend; the app should verify availability at runtime.
  • FREE_AI_PROVIDERS — public AI providers that offer a FREE tier, so a client
                      can run AXTO Legal at no model cost (BYOK — client supplies
                      their own free key; nothing is shared with AXTO).
  • RESEARCH_PROMPTS — high-value supporting prompts that help a user locate the
                      right statute, regulation, authority or case quickly.

Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
"""
from __future__ import annotations

# ── Curated free/official legal sources (verify availability per deployment) ──
LEGAL_SOURCES: dict[str, list[dict]] = {
    "International": [
        {"name": "EUR-Lex (EU law)", "url": "https://eur-lex.europa.eu", "type": "legislation+case", "free": True},
        {"name": "WorldLII", "url": "https://www.worldlii.org", "type": "aggregator", "free": True},
        {"name": "UN Treaty Collection", "url": "https://treaties.un.org", "type": "treaties", "free": True},
        {"name": "ICJ Decisions", "url": "https://www.icj-cij.org", "type": "case", "free": True},
    ],
    "United States": [
        {"name": "Congress.gov", "url": "https://www.congress.gov", "type": "legislation", "free": True},
        {"name": "GovInfo", "url": "https://www.govinfo.gov", "type": "legislation+register", "free": True},
        {"name": "Cornell Legal Information Institute", "url": "https://www.law.cornell.edu", "type": "code+case", "free": True},
        {"name": "CourtListener (free case law)", "url": "https://www.courtlistener.com", "type": "case", "free": True},
        {"name": "Supreme Court of the U.S.", "url": "https://www.supremecourt.gov", "type": "case", "free": True},
    ],
    "United Kingdom": [
        {"name": "legislation.gov.uk", "url": "https://www.legislation.gov.uk", "type": "legislation", "free": True},
        {"name": "BAILII", "url": "https://www.bailii.org", "type": "case", "free": True},
    ],
    "European Union": [
        {"name": "EUR-Lex", "url": "https://eur-lex.europa.eu", "type": "legislation+case", "free": True},
        {"name": "CURIA (CJEU case law)", "url": "https://curia.europa.eu", "type": "case", "free": True},
    ],
    "Indonesia": [
        {"name": "JDIH BPK (peraturan)", "url": "https://peraturan.bpk.go.id", "type": "legislation", "free": True},
        {"name": "Peraturan.go.id", "url": "https://peraturan.go.id", "type": "legislation", "free": True},
        {"name": "Putusan Mahkamah Agung", "url": "https://putusan3.mahkamahagung.go.id", "type": "case", "free": True},
        {"name": "Mahkamah Konstitusi", "url": "https://www.mkri.id", "type": "case", "free": True},
    ],
    "Australia": [
        {"name": "AustLII", "url": "https://www.austlii.edu.au", "type": "legislation+case", "free": True},
        {"name": "Federal Register of Legislation", "url": "https://www.legislation.gov.au", "type": "legislation", "free": True},
    ],
    "Canada": [
        {"name": "CanLII", "url": "https://www.canlii.org", "type": "legislation+case", "free": True},
        {"name": "Justice Laws Website", "url": "https://laws-lois.justice.gc.ca", "type": "legislation", "free": True},
    ],
    "Singapore": [
        {"name": "Singapore Statutes Online", "url": "https://sso.agc.gov.sg", "type": "legislation", "free": True},
    ],
    "India": [
        {"name": "India Code", "url": "https://www.indiacode.nic.in", "type": "legislation", "free": True},
    ],
}

# ── Public AI providers with a FREE tier (BYOK — client supplies own key) ─────
FREE_AI_PROVIDERS: list[dict] = [
    {"id": "groq", "name": "Groq (free tier, very fast)", "base_url": "https://api.groq.com/openai/v1",
     "openai_compatible": True, "note": "Free tier with rate limits. Get a key at console.groq.com."},
    {"id": "gemini", "name": "Google Gemini (free tier)", "base_url": "https://generativelanguage.googleapis.com",
     "openai_compatible": False, "note": "Free tier via Google AI Studio (aistudio.google.com)."},
    {"id": "openrouter", "name": "OpenRouter (free models)", "base_url": "https://openrouter.ai/api/v1",
     "openai_compatible": True, "note": "Several models are free (look for ':free'). Key at openrouter.ai."},
    {"id": "mistral", "name": "Mistral (free tier)", "base_url": "https://api.mistral.ai/v1",
     "openai_compatible": True, "note": "Free tier on la Plateforme (console.mistral.ai)."},
    {"id": "huggingface", "name": "Hugging Face Inference (free tier)", "base_url": "https://api-inference.huggingface.co",
     "openai_compatible": False, "note": "Free serverless inference with limits (huggingface.co)."},
    {"id": "ollama", "name": "Ollama (local, fully free, air-gapped)", "base_url": "http://localhost:11434/v1",
     "openai_compatible": True, "note": "Runs entirely on your hardware — no key, no cost, no data leaves the network."},
]

# ── Supporting research prompts (find the right source/case fast) ─────────────
RESEARCH_PROMPTS: list[dict] = [
    {"id": "locate-statute", "title": "Locate the governing statute",
     "prompt": ("You are a senior legal researcher. Given the topic \"{topic}\" in jurisdiction \"{jurisdiction}\", "
                "identify the primary statute(s) that govern it. Return: statute name, citation, the responsible "
                "authority, and the official source URL to verify. If uncertain, say so explicitly and suggest the "
                "closest authoritative source to check — never invent a citation.")},
    {"id": "find-caselaw", "title": "Find relevant case law",
     "prompt": ("Act as a litigation research assistant. For the issue \"{issue}\" under \"{jurisdiction}\" law, list up "
                "to 5 leading cases. For each: case name, court, year, the principle it establishes, and where to read "
                "it (official/free database). Flag any case you are not confident is real and recommend verification.")},
    {"id": "regulator-map", "title": "Identify the regulatory authority",
     "prompt": ("For the activity \"{activity}\" in \"{jurisdiction}\", identify the regulator(s), the key regulations "
                "they enforce, and the official portal for filings/guidance. Provide source links to verify.")},
    {"id": "cross-jurisdiction", "title": "Compare across jurisdictions",
     "prompt": ("Compare how \"{topic}\" is regulated across these jurisdictions: {jurisdictions}. Produce a concise "
                "table: jurisdiction | governing instrument | key obligation | penalty | official source. Note material "
                "differences a practitioner must watch for.")},
    {"id": "framework-crosswalk", "title": "Map a topic to compliance frameworks",
     "prompt": ("Map the topic \"{topic}\" to the relevant controls across these frameworks: {frameworks}. For each, "
                "give the control reference and what evidence demonstrates compliance.")},
]


def sources_for(jurisdiction: str) -> list[dict]:
    """Return curated sources for a jurisdiction (case-insensitive), plus International."""
    j = (jurisdiction or "").strip().lower()
    out: list[dict] = []
    for key, items in LEGAL_SOURCES.items():
        if key.lower() == j or key == "International":
            out.extend(items)
    # de-dup by url preserving order
    seen, uniq = set(), []
    for s in out:
        if s["url"] not in seen:
            seen.add(s["url"]); uniq.append(s)
    return uniq


def free_providers() -> list[dict]:
    return FREE_AI_PROVIDERS


def render_prompt(prompt_id: str, **vars) -> str:
    for p in RESEARCH_PROMPTS:
        if p["id"] == prompt_id:
            try:
                return p["prompt"].format(**vars)
            except KeyError as e:
                missing = str(e).strip("'")
                return p["prompt"].replace("{" + missing + "}", f"[{missing}]")
    return ""
