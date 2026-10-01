/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * CLOUD APPS — run in the browser, no Docker, included in a subscription.
 * Used by the public /apps pages, the member portal launcher and plan gating.
 * ============================================================================ */
import { planForApp, type Tier } from "./plans";

export interface CloudApp {
  slug: string;
  live: boolean;               // false = "Coming soon" until the app passes its release gate
  name: string;
  icon: string;
  color: string;               // accent (hex)
  short: string;               // one line, for cards
  hero: string;                // 1–2 sentences, for the app page
  steps: string[];             // "how it works" — plain language
  features: { title: string; desc: string }[];
  useCases: string[];
  selfHosted?: string;         // matching self-hosted product slug
  keywords: string[];          // SEO
}

export const CLOUD_APPS: CloudApp[] = [
  {
    slug: "legal", live: true, name: "Legal AI", icon: "⚖️", color: "#4f46e5",
    short: "36 expert legal workspaces for 200+ jurisdictions, plus redline, playbook review, a clause library, deadline and citation tools.",
    hero: "A private AI legal team in your browser. Pick any country, state or province, upload the case file, and get it rebuilt against current law — from the constitution down to regional regulations — with sources, risk ratings and a strategy. Plus 35 more expert workspaces for research, contracts, litigation and compliance — and on-device tools to redline contract versions, review them against your playbook, count deadlines and check every citation.",
    steps: [
      "Choose the jurisdiction — country, then state/province and city — and a workspace such as Case Builder or Contract Review.",
      "Upload the documents (PDF, DOCX, TXT, e-mails) or describe the matter. Text is extracted in your browser.",
      "Get a structured, sourced analysis — with live research on current law when your AI supports it — then save it to the matter or export to Word/PDF.",
    ],
    features: [
      { title: "200+ jurisdictions, down to the province", desc: "Every country plus the EU and international law; states, provinces and special regimes (Aceh, Québec, Scotland, DIFC, Louisiana…) and your city or regency." },
      { title: "Case Builder", desc: "Upload a case file and get parties, a sourced chronology, legal issues, the applicable law from the constitution down, element-by-element analysis, evidence gaps, deadlines and strategy." },
      { title: "36 expert workspaces", desc: "Research memos, contract review & drafting, due diligence, pleadings, arbitration, criminal analysis, compliance, privacy, AML, employment, IP, tax, ESG, AI governance and more." },
      { title: "Redline, playbook, clauses, deadlines & citations", desc: "On your device: compare contract versions word by word, check them against your playbook, fill clause templates, count deadlines with public holidays (.ics export), verify every citation and search across the matter's documents." },
      { title: "Current law, with sources", desc: "Live research checks each statute and decision against official sources and lists what it retrieved — and old-vs-new law is compared for the date of your facts." },
      { title: "Your own playbooks and clauses", desc: "Build playbooks with standard and fallback positions, red-flag phrases and automatic checks (caps, periods, governing law), and keep your own clause wording — encrypted per account." },
      { title: "Encrypted matters", desc: "Documents and results are saved per matter, encrypted with a key unique to your account." },
      { title: "Export anywhere", desc: "Word (.docx), PDF and Markdown exports, ready for your letterhead." },
    ],
    useCases: ["Rebuilding a case file for trial", "Contract review & redlining", "Legal research memos with sources", "Due diligence red-flag reports", "Pleadings, appeals and legal opinions", "Multi-country compliance surveys"],
    selfHosted: "legal",
    keywords: ["legal AI", "AI lawyer", "AI legal research", "AI contract review", "contract redline tool", "legal deadline calculator", "case analysis AI", "legal document drafting AI", "due diligence AI", "AI hukum Indonesia"],
  },
  {
    slug: "prompts", live: true, name: "Prompt Library", icon: "📚", color: "#7c3aed",
    short: "240 expert prompts for 24 professions — run them here, compare models, build your own prompts and multi-step workflows.",
    hero: "240 expert prompts organised by profession and level — Basic, Pro, Premium and Elite. Fill in the variables (or let a saved profile do it), run on your own AI with streaming, compare up to three models, and turn prompts into multi-step workflows.",
    steps: [
      "Browse 24 fields and four levels, search, or open your favourites and collections.",
      "Fill in the variables — or apply a saved profile with your company, product and audience.",
      "Run it here on your own AI, compare models side by side, follow up, and save the result.",
    ],
    features: [
      { title: "240 prompts, 24 fields, 4 levels", desc: "Ten expert prompts per field, from Basic everyday tasks to Elite board-level and multi-country work — each with clear fill-in variables." },
      { title: "Run and compare in place", desc: "Stream results from your own model, ask follow-ups, and run the same prompt on up to three models side by side." },
      { title: "Your own prompts and optimiser", desc: "Write prompts with {{variables}}, keep them in collections and favourites, and let the AI optimise them." },
      { title: "Workflows and profiles", desc: "Chain steps so each builds on the previous output, and save variable profiles that fill prompts automatically; export or import everything as JSON." },
    ],
    useCases: ["Marketing campaigns", "Sales outreach", "Financial analysis", "Hiring & HR", "Product strategy", "Content workflows"],
    keywords: ["AI prompt library", "premium ChatGPT prompts", "Claude prompts", "business prompts", "prompt templates"],
  },
  {
    slug: "studio", live: true, name: "AI Studio", icon: "🧠", color: "#0f766e",
    short: "Every leading AI model in one private workspace — files, images, voice, artifacts and side-by-side comparison.",
    hero: "One private workspace for every leading model, on your own keys. Attach documents and images, dictate by voice, preview the pages and diagrams the AI writes, compare up to three models side by side, and keep your own assistants — with every conversation saved, searchable and encrypted.",
    steps: [
      "Pick a model — or an assistant with its own instructions — or switch on Compare to ask up to three models at once.",
      "Type, dictate or drop in files and images; documents are read on your device.",
      "Refine with regenerate, edit & resend and answer versions; preview artifacts; export to Markdown, Word, JSON or PDF.",
    ],
    features: [
      { title: "Every leading model, side by side", desc: "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity and more — or your own endpoint — and one message to up to three of them at once." },
      { title: "Files, images and voice", desc: "Attach PDFs, Word files, code and images (read on your device), paste or drag them in, or dictate by voice." },
      { title: "Live code and artifacts", desc: "Highlighted code with copy and download; HTML, SVG and Mermaid answers render in a sandboxed preview." },
      { title: "Your own assistants", desc: "Saved personas with their own instructions and creativity, plus templates for engineering, marketing, contracts, data, tutoring and translation." },
      { title: "Answer versions", desc: "Regenerate, edit & resend, and flip between every version of an answer." },
      { title: "Organised and private", desc: "Encrypted history with search, pinned chats and folders — never used for training." },
      { title: "Export anywhere", desc: "Markdown, Word, JSON or print to PDF, plus Prompt Library prompts with one keystroke (/)." },
      { title: "Your own key — or a model on your device", desc: "You pay your provider directly at their price — no markup and no usage cap from AXTO; free tiers (Gemini, Groq) work too. Or switch on Local Mode and run on Ollama or LM Studio on your own computer: the prompt is built in your browser and the answer comes from your model, so the AI request never goes through AXTO." },
    ],
    useCases: ["Writing & editing", "Research & document summaries", "Model comparison", "Code help & prototypes", "Diagrams & landing pages", "Translation"],
    selfHosted: "studio",
    keywords: ["AI studio", "multi-model AI chat", "BYOK AI chat", "Claude and GPT in one place", "compare AI models", "ChatGPT alternative"],
  },
  {
    slug: "clipper", live: true, name: "Clipper", icon: "🎬", color: "#db2777",
    short: "Turn long videos into viral short clips — scored, reframed, captioned and rendered on your own device.",
    hero: "Upload a podcast, webinar or interview — even hours long — and get its best moments as ready-to-post clips: ranked by a virality score, auto-reframed around the speaker, with animated captions, a hook title and your brand. Edit by editing the transcript, then render MP4s on your own device. The video never leaves it; only a compressed speech track goes to your own transcription provider.",
    steps: [
      "Drop in a video (MP4, MOV, WebM, MKV — up to several hours) or import captions you already have.",
      "Your speech-to-text key transcribes it; your AI key ranks the strongest moments with a virality score, a hook, a caption and hashtags.",
      "Fine-tune each clip in the live editor — trim, cut words, drop fillers and pauses, reframe, style captions — then render MP4s, captions and thumbnails on your device.",
    ],
    features: [
      { title: "Virality score with four sub-scores", desc: "Every moment is rated for hook, flow, value and trend, with the reason it should perform, a scroll-stopping title, a caption and hashtags." },
      { title: "8 animated caption styles", desc: "Bold Pop, Karaoke, Highlight Box, Neon, Typewriter, Emoji and more — word-by-word from precise timings, with your fonts and colours." },
      { title: "Auto-reframe with face tracking", desc: "On-device face tracking keeps the speaker in frame for 9:16, 4:5, 1:1 or 16:9 — plus split-screen for two speakers and a blurred-background fit." },
      { title: "Private by design", desc: "The video never leaves your device; only a compressed speech track goes to your own transcription provider." },
      { title: "Edit by editing the transcript", desc: "Click a word to jump, select words to cut them, remove filler words and long pauses automatically, and correct any caption." },
      { title: "Brand kit and hook titles", desc: "Your logo, colours and default style on every clip, a hook title for the first seconds and a progress bar." },
      { title: "Render on your device", desc: "MP4 (or WebM converted to MP4), batch rendering, SRT/VTT captions on the clip's own clock and PNG thumbnails." },
      { title: "Repurpose the whole video", desc: "YouTube chapters, a summary, a blog article, an X thread, a LinkedIn post, a newsletter, a description and pull quotes." },
    ],
    useCases: ["Podcast clips", "Webinar highlights", "Course snippets", "Founder & sales videos", "Interview and panel highlights", "Multilingual captions"],
    keywords: ["AI video clipper", "long video to shorts", "auto captions", "podcast clips AI", "OpusClip alternative", "AI reframe video", "virality score"],
  },
  {
    slug: "vault", live: true, name: "Privacy Vault", icon: "🔒", color: "#4338ca",
    short: "Find and redact personal data and secrets in text, Word, Excel, PDFs and images — on your device — then ask AI safely.",
    hero: "65 kinds of personal data and secrets — emails, cards and IBANs, API keys and passwords, and national IDs from 19 countries — found with a confidence score and redacted in your browser. Redact whole batches of Word, Excel, PDF and scanned files, ask your own AI about the redacted text and get the answer back with the originals restored. The original never leaves your device.",
    steps: [
      "Paste text, open a document, or drop a whole batch of files.",
      "Review every finding in place — keep it, redact it, or accept a low-confidence suggestion — under a GDPR, UU PDP, HIPAA or PCI DSS profile.",
      "Copy, download or ZIP the redacted result, ask your AI safely, and restore the originals later with your encrypted key.",
    ],
    features: [
      { title: "65 data types, scored", desc: "Emails, phones, cards and IBANs (checksum-validated), secrets and API keys, and national IDs from 19 countries — each with a confidence score from validation and nearby keywords." },
      { title: "True redaction for files", desc: "Word and Excel are redacted in place; PDFs are rebuilt as images with black boxes so nothing can be copied back; scans and photos are read with on-device OCR." },
      { title: "Safe AI", desc: "Ask your own AI about the redacted text — it only sees placeholders, and your browser puts the originals back into the answer." },
      { title: "Runs on your device", desc: "Detection, OCR and redaction happen in your browser. Only the redacted version is ever sent or saved." },
      { title: "Five redaction styles", desc: "Numbered tokens, realistic synthetic values, stable hashes, partial or full masking." },
      { title: "Encrypted key file", desc: "Export the placeholder map protected by your password (AES-256-GCM) and restore any document or AI reply later." },
      { title: "Compliance profiles and custom rules", desc: "GDPR, UU PDP, HIPAA, PCI DSS and developer-secrets presets, adjustable sensitivity, your own regex patterns and always / never lists." },
      { title: "Audit report", desc: "A per-file report of what was redacted — counts only, never the values." },
    ],
    useCases: ["Safe AI prompts", "GDPR / UU PDP data minimisation", "Redacting contracts and HR files", "Sharing documents with vendors", "Support ticket sanitising", "Removing secrets from logs"],
    selfHosted: "vault",
    keywords: ["PII redaction tool", "redact personal data", "redact PDF", "data masking online", "GDPR redaction", "anonymise document for ChatGPT"],
  },
  {
    slug: "compliance", live: true, name: "Compliance Center", icon: "📋", color: "#16a34a",
    short: "Run your compliance programme — 342 real controls, evidence, risks, policies and vendors for ISO 27001, SOC 2, NIST CSF, PCI DSS, HIPAA, GDPR and UU PDP.",
    hero: "A compliance workspace in your browser: track every control of seven frameworks with owners, due dates and encrypted evidence, map work across frameworks, keep a risk register and vendor reviews, draft and approve policies with your own AI, and export a readiness report or ISO 27001 Statement of Applicability.",
    steps: [
      "Describe your organisation and choose the frameworks in scope — ISO 27001, SOC 2, NIST CSF 2.0, PCI DSS v4, HIPAA, GDPR or Indonesia's UU PDP.",
      "Work through the controls: status, owner, due date, notes and evidence files; copy finished work to the equivalent controls of your other frameworks.",
      "Add risks, policies and vendors, ask your AI advisor for gaps and plans, then export the readiness report, SoA and CSVs.",
    ],
    features: [
      { title: "342 real controls, 7 frameworks", desc: "ISO/IEC 27001:2022 Annex A (93), SOC 2 TSC, NIST CSF 2.0 (22 categories), PCI DSS v4.0.1, the HIPAA Security Rule, GDPR and UU PDP — with status, owner, due date, notes and N/A justification." },
      { title: "Evidence and cross-framework mapping", desc: "Attach evidence files, stored encrypted in your account; controls are mapped across frameworks so finished work can be copied to its equivalents for review." },
      { title: "Risks, policies and vendors", desc: "Risk register with a 5×5 inherent / residual heat map, 26 policy templates with AI drafts, versions and approvals, and a weighted vendor questionnaire with risk tiers." },
      { title: "Readiness reports and exports", desc: "Readiness per framework and domain, overdue controls, a readiness report (Markdown, Word, PDF), an ISO 27001 Statement of Applicability, and CSV / JSON exports." },
      { title: "AI advisor on your keys", desc: "Gap analysis, remediation plans, control implementation, risk and vendor reviews and questionnaire answers from a programme briefing built on your device." },
    ],
    useCases: ["ISO 27001 certification", "SOC 2 readiness", "GDPR and UU PDP programmes", "Vendor security reviews", "Policy writing", "Audit preparation"],
    selfHosted: "compliance",
    keywords: ["compliance management software", "SOC 2 readiness", "ISO 27001 Statement of Applicability", "GDPR compliance tool", "UU PDP compliance", "risk register", "vendor risk assessment", "policy generator"],
  },
  {
    slug: "security", live: true, name: "Security Analyst", icon: "🛡️", color: "#0284c7",
    short: "Investigate incidents as cases — logs parsed on your device, MITRE ATT&CK, IOCs, phishing analysis, reports and detection rules.",
    hero: "A complete investigation workspace. Add logs, alerts or raw e-mails: parsing, detection, IOC extraction and phishing analysis run in your browser. Your own AI reviews a compact case briefing — never your raw logs — and every case exports as an incident report, STIX 2.1 indicators or Sigma, KQL, SPL, YARA and Suricata rules.",
    steps: [
      "Open a case and add evidence — logs (JSON, CloudTrail, Windows XML, syslog, CEF, LEEF, Apache/Nginx, CSV), alerts or raw e-mails.",
      "Review the detections, event timeline, indicators and MITRE ATT&CK matrix computed on your device.",
      "Ask your AI analyst, then export the incident report, STIX 2.1 indicators and detection rules.",
    ],
    features: [
      { title: "Log analytics on your device", desc: "Nine log formats parsed in the browser into one event table with a timeline, top hosts, users and sources, severity filters and brute-force detection." },
      { title: "MITRE ATT&CK matrix", desc: "46 behaviour rules map activity to 14 tactics and 130+ techniques; add your own findings, plus the techniques your AI names." },
      { title: "IOCs and phishing analysis", desc: "IPs, domains, URLs, hashes and e-mails extracted and defanged, with verdicts and lookups; .eml analysis checks SPF, DKIM, DMARC, links and attachments." },
      { title: "Reports and detection rules", desc: "Incident report (Markdown, Word, PDF), STIX 2.1 bundle, blocklists and Sigma, KQL, SPL, YARA and Suricata rules generated from the case." },
      { title: "Decoder", desc: "CyberChef-style recipes with Magic auto-detection: Base64, hex, PowerShell -EncodedCommand, gzip, XOR, JWT and 22 operations in all." },
      { title: "AI analyst on your keys", desc: "Triage, IOC enrichment, hunting, hardening and incident writing on your own model, from a briefing built on the device." },
    ],
    useCases: ["SOC alert triage", "Log investigation", "Phishing analysis", "Threat hunting", "Incident reports", "Detection engineering"],
    selfHosted: "guardian",
    keywords: ["AI security analyst", "log analysis AI", "MITRE ATT&CK mapping", "incident report generator", "IOC extractor", "phishing email analyzer", "Sigma rule generator", "CyberChef alternative"],
  },
];

export function getCloudApp(slug: string): CloudApp | undefined {
  return CLOUD_APPS.find((a) => a.slug === slug);
}

export function minTierForApp(slug: string): Tier {
  return planForApp(slug);
}
