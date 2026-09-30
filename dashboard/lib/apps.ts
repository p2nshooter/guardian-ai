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
    short: "36 expert legal workspaces for 200+ jurisdictions — research, case building, contracts, litigation and compliance.",
    hero: "A private AI legal team in your browser. Pick any country, state or province, upload the case file, and get it rebuilt against current law — from the constitution down to regional regulations — with sources, risk ratings and a strategy. Plus 35 more expert workspaces for research, contracts, litigation and compliance.",
    steps: [
      "Choose the jurisdiction — country, then state/province and city — and a workspace such as Case Builder or Contract Review.",
      "Upload the documents (PDF, DOCX, TXT, e-mails) or describe the matter. Text is extracted in your browser.",
      "Get a structured, sourced analysis — with live research on current law when your AI supports it — then save it to the matter or export to Word/PDF.",
    ],
    features: [
      { title: "200+ jurisdictions, down to the province", desc: "Every country plus the EU and international law; states, provinces and special regimes (Aceh, Québec, Scotland, DIFC, Louisiana…) and your city or regency." },
      { title: "Case Builder", desc: "Upload a case file and get parties, a sourced chronology, legal issues, the applicable law from the constitution down, element-by-element analysis, evidence gaps, deadlines and strategy." },
      { title: "Current law, with sources", desc: "Live research checks each statute and decision against official sources and lists what it retrieved — and old-vs-new law is compared for the date of your facts." },
      { title: "36 expert workspaces", desc: "Research memos, contract review & drafting, due diligence, pleadings, arbitration, criminal analysis, compliance, privacy, AML, employment, IP, tax, ESG, AI governance and more." },
      { title: "Encrypted matters", desc: "Documents and results are saved per matter, encrypted with a key unique to your account." },
      { title: "Export anywhere", desc: "Word (.docx), PDF and Markdown exports, ready for your letterhead." },
    ],
    useCases: ["Rebuilding a case file for trial", "Contract review & redlining", "Legal research memos with sources", "Due diligence red-flag reports", "Pleadings, appeals and legal opinions", "Multi-country compliance surveys"],
    selfHosted: "legal",
    keywords: ["legal AI", "AI lawyer", "AI legal research", "AI contract review", "case analysis AI", "legal document drafting AI", "due diligence AI", "AI hukum Indonesia"],
  },
  {
    slug: "prompts", live: true, name: "Prompt Library", icon: "📚", color: "#7c3aed",
    short: "Premium, ready-to-run prompts for 24 professions — from quick tasks to global-scale strategy.",
    hero: "Hundreds of expert prompts organised by profession and level — Basic, Pro, Premium and Elite. Fill in the blanks, copy to any AI, or run instantly inside AXTO.",
    steps: [
      "Browse by field (e.g. Marketing, Legal, Finance) or search.",
      "Fill in the highlighted variables — company, audience, market…",
      "Copy it anywhere or press Run to get the result in AI Studio.",
    ],
    features: [
      { title: "24 fields", desc: "Business, marketing, sales, legal, finance, HR, software, data, security, health, education, real estate and more." },
      { title: "4 levels", desc: "Basic for everyday tasks up to Elite for multi-country, board-level work." },
      { title: "Fill-in variables", desc: "Every prompt has clearly marked inputs so you get tailored output, not generic text." },
      { title: "Works everywhere", desc: "Use with AXTO AI Studio, ChatGPT, Claude, Gemini or any model." },
    ],
    useCases: ["Marketing campaigns", "Sales outreach", "Financial analysis", "Hiring & HR", "Product strategy"],
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
      { title: "Bring your own key", desc: "You pay your provider directly at their price — no markup and no usage cap from AXTO. Free tiers (Gemini, Groq) work too." },
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
    short: "Gap analysis, remediation plans and policies for SOC 2, ISO 27001, GDPR, HIPAA and more.",
    hero: "Answer a short guided assessment and get an audit-style gap analysis, a prioritised remediation plan and ready-to-edit policy drafts for the frameworks you need.",
    steps: [
      "Choose a framework — SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS, NIST CSF or Indonesia's UU PDP.",
      "Describe your organisation and current controls.",
      "Receive a gap report, a remediation roadmap and policy templates.",
    ],
    features: [
      { title: "7 frameworks", desc: "SOC 2, ISO/IEC 27001, GDPR, HIPAA, PCI DSS v4, NIST CSF 2.0 and UU PDP." },
      { title: "Gap analysis", desc: "Control-by-control findings with severity and evidence to collect." },
      { title: "Remediation roadmap", desc: "30/60/90-day plan with owners and effort estimates." },
      { title: "Policy generator", desc: "Draft information security, privacy, access-control and incident-response policies." },
    ],
    useCases: ["Audit readiness", "Vendor security questionnaires", "Privacy programmes", "Policy writing"],
    selfHosted: "compliance",
    keywords: ["compliance gap analysis", "SOC 2 readiness", "ISO 27001 gap analysis", "GDPR compliance tool", "policy generator"],
  },
  {
    slug: "security", live: true, name: "Security Analyst", icon: "🛡️", color: "#0284c7",
    short: "Paste logs or alerts — get triage, MITRE ATT&CK mapping, IOCs and an incident report.",
    hero: "An AI security analyst on demand. Paste raw logs, alerts or a suspicious script and get a clear verdict, the attacker techniques involved, extracted indicators and a ready-to-send incident report.",
    steps: [
      "Paste logs, an alert or a suspicious command.",
      "Choose what you need — triage, IOC extraction or a full incident report.",
      "Get findings mapped to MITRE ATT&CK with recommended containment steps.",
    ],
    features: [
      { title: "Alert triage", desc: "Verdict (benign / suspicious / malicious), severity and reasoning in plain language." },
      { title: "MITRE ATT&CK mapping", desc: "Tactics and technique IDs for every finding." },
      { title: "IOC extraction", desc: "IPs, domains, URLs, hashes and emails pulled out automatically — even before the AI runs." },
      { title: "Incident reports", desc: "Executive summary, timeline, impact and next steps, ready to share." },
    ],
    useCases: ["SOC alert triage", "Log investigation", "Phishing analysis", "Incident write-ups"],
    selfHosted: "guardian",
    keywords: ["AI security analyst", "log analysis AI", "MITRE ATT&CK mapping", "incident report generator", "IOC extractor"],
  },
];

export function getCloudApp(slug: string): CloudApp | undefined {
  return CLOUD_APPS.find((a) => a.slug === slug);
}

export function minTierForApp(slug: string): Tier {
  return planForApp(slug);
}
