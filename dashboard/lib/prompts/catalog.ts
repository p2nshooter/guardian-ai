/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * PROMPT LIBRARY — premium, ready-to-run prompts for 24 professional fields at
 * four levels (Basic → Pro → Premium → Elite). Each prompt has a public title +
 * summary (SEO), fill-in {{variables}}, and a full body that is only served to
 * members whose plan unlocks that level (see planForPromptLevel in lib/plans).
 *
 * The public listing (fields, titles, summaries, variables) is safe to index;
 * the full body is returned only by the gated /api/prompts endpoint. This file
 * is the catalogue + a curated seed set; more prompts are appended over time.
 * ============================================================================ */
import type { PromptLevel } from "../plans";
import type { Field, Prompt } from "./types";
import { PROMPTS_A } from "./part-a";
import { PROMPTS_B } from "./part-b";
import { PROMPTS_C } from "./part-c";
import { PROMPTS_D } from "./part-d";
export type { Field, Variable, Prompt } from "./types";

export const LEVELS: { id: PromptLevel; name: string; blurb: string }[] = [
  { id: "basic", name: "Basic", blurb: "Everyday tasks, done fast." },
  { id: "pro", name: "Pro", blurb: "Professional frameworks and structure." },
  { id: "premium", name: "Premium", blurb: "Multi-step expert workflows." },
  { id: "elite", name: "Elite", blurb: "Global-scale, C-level and consulting depth." },
];

export const FIELDS: Field[] = [
  { id: "business", name: "Business & Strategy", icon: "📈", blurb: "Strategy, planning, operations and decisions.", keywords: ["business strategy prompts", "AI business plan", "strategy AI"] },
  { id: "marketing", name: "Marketing", icon: "📣", blurb: "Campaigns, positioning, growth and brand.", keywords: ["marketing prompts", "AI campaign", "growth marketing AI"] },
  { id: "sales", name: "Sales", icon: "🤝", blurb: "Outreach, discovery, objection handling, closing.", keywords: ["sales prompts", "cold email AI", "sales script AI"] },
  { id: "content", name: "Content & SEO", icon: "✍️", blurb: "Articles, SEO briefs, editing and repurposing.", keywords: ["SEO content prompts", "AI article writer", "content brief AI"] },
  { id: "social", name: "Social Media", icon: "📱", blurb: "Posts, hooks, calendars and short-form scripts.", keywords: ["social media prompts", "AI hooks", "content calendar AI"] },
  { id: "ecommerce", name: "E-commerce", icon: "🛒", blurb: "Product copy, listings, CRO and lifecycle.", keywords: ["ecommerce prompts", "product description AI", "Amazon listing AI"] },
  { id: "finance", name: "Finance & Accounting", icon: "💰", blurb: "Analysis, models, budgets and reporting.", keywords: ["finance prompts", "financial analysis AI", "budget AI"] },
  { id: "investing", name: "Investing", icon: "📊", blurb: "Research, theses, memos and risk.", keywords: ["investing prompts", "stock research AI", "investment memo AI"] },
  { id: "legal", name: "Legal", icon: "⚖️", blurb: "Clauses, summaries, letters and research aids.", keywords: ["legal prompts", "contract clause AI", "legal drafting AI"] },
  { id: "compliance", name: "Compliance & Risk", icon: "📋", blurb: "Policies, controls, risk registers and audits.", keywords: ["compliance prompts", "risk assessment AI", "policy AI"] },
  { id: "hr", name: "HR & Recruiting", icon: "🧑‍💼", blurb: "JDs, interviews, reviews and people ops.", keywords: ["HR prompts", "job description AI", "interview questions AI"] },
  { id: "career", name: "Career", icon: "🚀", blurb: "Résumés, cover letters, LinkedIn and negotiation.", keywords: ["career prompts", "resume AI", "cover letter AI"] },
  { id: "education", name: "Education", icon: "🎓", blurb: "Lessons, curricula, quizzes and explanations.", keywords: ["teaching prompts", "lesson plan AI", "study AI"] },
  { id: "research", name: "Academic Research", icon: "🔬", blurb: "Literature, methods, abstracts and review.", keywords: ["research prompts", "literature review AI", "abstract AI"] },
  { id: "health", name: "Health & Wellness", icon: "🩺", blurb: "General wellness, plans and explanations (non-diagnostic).", keywords: ["wellness prompts", "health explainer AI"] },
  { id: "software", name: "Software Development", icon: "💻", blurb: "Design, code, review, tests and docs.", keywords: ["coding prompts", "code review AI", "system design AI"] },
  { id: "data", name: "Data & Analytics", icon: "📐", blurb: "SQL, analysis, dashboards and storytelling.", keywords: ["data prompts", "SQL AI", "analytics AI"] },
  { id: "security", name: "Cybersecurity", icon: "🛡️", blurb: "Triage, hardening, reports and awareness.", keywords: ["cybersecurity prompts", "incident report AI", "security AI"] },
  { id: "design", name: "Design & UX", icon: "🎨", blurb: "Briefs, critique, copy and research.", keywords: ["design prompts", "UX writing AI", "design critique AI"] },
  { id: "product", name: "Product Management", icon: "🧩", blurb: "PRDs, roadmaps, discovery and metrics.", keywords: ["product management prompts", "PRD AI", "roadmap AI"] },
  { id: "ops", name: "Operations & Supply Chain", icon: "🏭", blurb: "Processes, SOPs, logistics and efficiency.", keywords: ["operations prompts", "SOP AI", "supply chain AI"] },
  { id: "realestate", name: "Real Estate", icon: "🏠", blurb: "Listings, analysis, outreach and contracts.", keywords: ["real estate prompts", "listing AI", "property analysis AI"] },
  { id: "hospitality", name: "Hospitality & Travel", icon: "🧳", blurb: "Itineraries, guest comms and marketing.", keywords: ["hospitality prompts", "travel itinerary AI"] },
  { id: "productivity", name: "Personal Productivity", icon: "⏱️", blurb: "Planning, email, notes and decisions.", keywords: ["productivity prompts", "email AI", "planning AI"] },
];

export const getField = (id: string) => FIELDS.find((f) => f.id === id);

/* ── Curated premium seed prompts. Each body is written to be genuinely useful:
 * it sets a role, asks clarifying-safe assumptions, works step by step, and
 * specifies the output format. Variables use {{double_braces}}. ───────────── */
const P = (p: Prompt) => p;
const SEED: Prompt[] = [
  // Business
  P({ id: "biz-swot", field: "business", level: "basic", title: "SWOT analysis", summary: "A clear SWOT for any company or product, with prioritised takeaways.",
    variables: [{ key: "company", label: "Company / product" }, { key: "market", label: "Market / segment" }],
    template: "You are a strategy consultant. Produce a SWOT analysis for {{company}} in the {{market}} market.\nRules: be specific and evidence-based; no generic filler. For each quadrant give 3–5 concrete points. Then add a 'Top 3 priorities' section that turns the SWOT into actions with an owner and a 30-day first step.\nFormat: four short sections (Strengths, Weaknesses, Opportunities, Threats) as bullet lists, then Priorities as a numbered list." }),
  P({ id: "biz-gtm", field: "business", level: "premium", title: "Go-to-market plan", summary: "A full GTM plan: ICP, positioning, channels, pricing, funnel and 90-day plan.",
    variables: [{ key: "product", label: "Product" }, { key: "icp", label: "Ideal customer" }, { key: "budget", label: "Budget", placeholder: "e.g. US$50k/quarter" }],
    template: "Act as a VP of Growth. Build a go-to-market plan for {{product}} targeting {{icp}} with a budget of {{budget}}.\nWork in this order and show your reasoning briefly at each step: 1) sharpen the ICP and the problem, 2) positioning statement and 3 differentiators, 3) pricing and packaging hypothesis, 4) channel plan ranked by expected CAC/payback with why, 5) full-funnel metrics and targets, 6) a 90-day execution plan (weeks 1–2, 3–6, 7–12) with owners and success criteria, 7) the top risks and how you'll de-risk them.\nFormat: headed sections; use tables for channels, pricing and the 90-day plan." }),
  P({ id: "biz-board", field: "business", level: "elite", title: "Board-ready strategy memo", summary: "A concise, decision-forcing board memo with options, trade-offs and a recommendation.",
    variables: [{ key: "company", label: "Company" }, { key: "decision", label: "Decision to make" }, { key: "context", label: "Key context / constraints" }],
    template: "You are the CEO writing to your board. Write a decision memo on: {{decision}} for {{company}}. Context: {{context}}.\nStructure (max ~1,200 words): 1) Recommendation up front (one paragraph), 2) Situation and why now, 3) Options considered (a table: Option | Upside | Downside | Cost | Reversibility), 4) The recommended option and the reasoning, 5) Financial impact and key assumptions, 6) Risks and mitigations, 7) What we need from the board (specific asks) and the decision timeline.\nTone: candid, quantified, no hedging. State assumptions explicitly and flag what would change the recommendation." }),
  // Marketing
  P({ id: "mkt-campaign", field: "marketing", level: "pro", title: "Integrated campaign brief", summary: "A campaign brief with objective, audience, message, channels and KPIs.",
    variables: [{ key: "product", label: "Product / offer" }, { key: "audience", label: "Audience" }, { key: "goal", label: "Primary goal" }],
    template: "Act as a marketing director. Write an integrated campaign brief to achieve {{goal}} for {{product}} with {{audience}}.\nInclude: single-minded proposition, 3 message pillars, channel mix with role of each channel, a hero creative concept + 3 supporting ideas, a 6-week timeline, budget split, and KPIs with targets and a measurement plan.\nFormat: brief with headers; timeline and budget as tables. Keep the proposition to one sentence." }),
  P({ id: "mkt-elite-global", field: "marketing", level: "elite", title: "Multi-market launch strategy", summary: "A global launch across markets: localisation, sequencing, budget and risk.",
    variables: [{ key: "product", label: "Product" }, { key: "markets", label: "Markets", placeholder: "e.g. US, EU, SEA" }, { key: "budget", label: "Total budget" }],
    template: "You are a global CMO. Design a launch strategy for {{product}} across {{markets}} with a total budget of {{budget}}.\nCover: market prioritisation and sequencing (with the scoring you used), per-market positioning and localisation (language, culture, regulation, payment norms), channel strategy per market, a phased budget allocation, org/partners needed, a consolidated KPI dashboard, and the top cross-market risks with contingencies.\nFormat: executive summary, then a market-by-market table and a phased roadmap. Be explicit about assumptions per market." }),
  // Sales
  P({ id: "sales-cold", field: "sales", level: "basic", title: "Cold email that gets replies", summary: "A short, personalised cold email with a clear ask and a strong subject line.",
    variables: [{ key: "product", label: "What you sell" }, { key: "prospect", label: "Prospect / role" }, { key: "trigger", label: "Reason to reach out now" }],
    template: "Write a cold email from me selling {{product}} to {{prospect}}. Reason to reach out: {{trigger}}.\nRules: 3 short paragraphs max, no jargon, one specific insight about their world, one clear low-friction ask (a 15-min call), and a P.S. Give 3 subject-line options (<45 chars). Sound human, not salesy." }),
  P({ id: "sales-meddicc", field: "sales", level: "premium", title: "Deal qualification & plan (MEDDICC)", summary: "Qualify a deal with MEDDICC and produce a close plan with next steps.",
    variables: [{ key: "deal", label: "Deal / account" }, { key: "notes", label: "What you know so far" }],
    template: "Act as a sales coach. Using MEDDICC, qualify this deal: {{deal}}. Notes: {{notes}}.\nFor each element (Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion, Competition) state what we know, what's missing, and the exact question or action to fill the gap. Then give a risk rating, a mutual close plan with dates, and the single most important next step.\nFormat: a MEDDICC table + a close plan table." }),
  // Content & SEO
  P({ id: "seo-brief", field: "content", level: "pro", title: "SEO content brief", summary: "A brief an writer can follow: intent, outline, entities, FAQs and internal links.",
    variables: [{ key: "keyword", label: "Target keyword" }, { key: "audience", label: "Audience" }],
    template: "Act as an SEO strategist. Create a content brief for the keyword '{{keyword}}' for {{audience}}.\nInclude: search intent and the job the reader wants done, a target title (<60 chars) and meta description (<155 chars), an H2/H3 outline that fully covers the topic, entities/terms to include, questions to answer (People Also Ask style), suggested internal links and a strong CTA, plus word-count and tone guidance. Do not write the article — just the brief." }),
  P({ id: "seo-article", field: "content", level: "premium", title: "Long-form article writer", summary: "A complete, well-structured, non-fluffy article from a brief or outline.",
    variables: [{ key: "topic", label: "Topic" }, { key: "keyword", label: "Primary keyword" }, { key: "audience", label: "Audience" }],
    template: "Write a comprehensive, original article on {{topic}} for {{audience}}, optimised for '{{keyword}}' without keyword stuffing.\nRequirements: a hook that states the payoff, clear H2/H3 structure, concrete examples and data placeholders marked [SOURCE], short paragraphs, a comparison table where useful, an FAQ, and a conclusion with a next step. Avoid clichés and filler. Use Markdown." }),
  // Software
  P({ id: "dev-review", field: "software", level: "pro", title: "Senior code review", summary: "A rigorous review: correctness, security, performance, tests and clarity.",
    variables: [{ key: "language", label: "Language / stack" }, { key: "context", label: "What the code does" }],
    template: "Act as a staff engineer reviewing {{language}} code that {{context}}. I'll paste the code next.\nReview for, in priority order: correctness bugs and edge cases, security issues, concurrency/async pitfalls, performance, API/design clarity, and missing tests. For each finding give: severity, the exact problem, why it matters, and a concrete fix (with a code snippet). End with the 3 things to fix first. Be specific; don't restate the code." }),
  P({ id: "dev-arch", field: "software", level: "elite", title: "System design & trade-offs", summary: "An end-to-end system design with capacity, data model, failure modes and trade-offs.",
    variables: [{ key: "system", label: "System to design" }, { key: "scale", label: "Scale / constraints", placeholder: "e.g. 10M DAU, <100ms p99" }],
    template: "Design {{system}} to meet: {{scale}}. Act as a principal engineer.\nCover: requirements (functional + non-functional), a capacity estimate (traffic, storage, bandwidth) with the math, the high-level architecture (components and why), the data model and access patterns, the API, how you handle scale (caching, sharding, queues), failure modes and how the system degrades, observability, security, and the top 3 trade-offs you made with alternatives. Use diagrams-as-text where helpful. State assumptions." }),
  // Data
  P({ id: "data-sql", field: "data", level: "basic", title: "SQL from a plain-English question", summary: "Correct, readable SQL for your question, with an explanation and caveats.",
    variables: [{ key: "dialect", label: "SQL dialect", placeholder: "e.g. PostgreSQL, BigQuery" }, { key: "schema", label: "Tables / columns" }],
    template: "You are a senior data analyst using {{dialect}}. Given this schema: {{schema}}, I'll ask a question in plain English.\nReturn: (1) a clean, commented SQL query, (2) a one-line explanation of the approach, (3) any assumptions about the data, (4) a note on performance if the tables are large. Prefer CTEs over nested subqueries; never invent columns not in the schema." }),
  // Finance
  P({ id: "fin-model", field: "finance", level: "premium", title: "Financial model plan & assumptions", summary: "The structure and assumptions for a 3-statement or unit-economics model.",
    variables: [{ key: "business", label: "Business" }, { key: "purpose", label: "Purpose", placeholder: "e.g. fundraise, budgeting" }],
    template: "Act as a CFO. Plan a financial model for {{business}} for the purpose of {{purpose}}.\nDeliver: the drivers and assumptions (with sensible ranges and sources to validate), the model structure (tabs and how they link), the key outputs (P&L, cash flow, unit economics, runway), the scenarios to run (base/bull/bear), and the sanity checks. Present assumptions as a table (Driver | Assumption | Range | How to validate). Do not fabricate numbers — mark inputs as [INPUT]." }),
  // HR
  P({ id: "hr-jd", field: "hr", level: "basic", title: "Job description that attracts talent", summary: "An inclusive, specific JD with outcomes, must-haves and a real day-in-the-life.",
    variables: [{ key: "role", label: "Role" }, { key: "company", label: "Company" }, { key: "level", label: "Seniority" }],
    template: "Write a job description for a {{level}} {{role}} at {{company}}.\nInclude: a one-paragraph hook, the outcomes this person will own in the first 12 months, must-have vs nice-to-have skills (keep must-haves short and real), a realistic day-in-the-life, how success is measured, and an inclusive equal-opportunity note. Avoid buzzwords and unrealistic 'unicorn' lists. Keep it scannable." }),
  // Career
  P({ id: "career-resume", field: "career", level: "pro", title: "Résumé bullet rewriter", summary: "Turn duties into achievement bullets with metrics and strong verbs.",
    variables: [{ key: "role", label: "Your role" }, { key: "target", label: "Target job" }],
    template: "Act as an executive résumé writer. I'm a {{role}} applying for {{target}}. I'll paste my current bullets.\nRewrite each as an achievement: strong verb + what you did + measurable impact, tailored to the target job's keywords. Where a metric is missing, ask me for it with [NEED: metric]. Keep each bullet to one line. Then suggest a 2-line professional summary." }),
  // Legal (aids only — not advice)
  P({ id: "legal-plain", field: "legal", level: "basic", title: "Explain a contract clause in plain language", summary: "A clear, neutral explanation of what a clause means and what to watch for.",
    variables: [{ key: "context", label: "Your situation / role", placeholder: "e.g. I'm the tenant" }],
    template: "You are a legal explainer (not my lawyer). I'll paste a clause. My situation: {{context}}.\nExplain in plain language: what it means, what it obliges each side to do, the realistic risks for me, and 2–3 questions I should ask before signing. Add a one-line disclaimer that this is general information, not legal advice. Do not invent legal citations." }),
  // Security
  P({ id: "sec-incident", field: "security", level: "premium", title: "Incident report from raw notes", summary: "A clear incident report: timeline, impact, root cause and actions.",
    variables: [{ key: "system", label: "System affected" }, { key: "audience", label: "Audience", placeholder: "e.g. execs, customers" }],
    template: "Act as an incident commander. From the notes I paste, write an incident report for {{system}} aimed at {{audience}}.\nInclude: executive summary, timeline (UTC), impact (who/what/how long), root cause (and contributing factors), what we did, what we'll do to prevent recurrence (with owners and dates), and lessons learned. Be factual and blameless. Don't speculate beyond the notes — mark gaps as [UNKNOWN]." }),
  // Product
  P({ id: "pm-prd", field: "product", level: "pro", title: "One-page PRD", summary: "A crisp PRD: problem, users, solution, scope, metrics and risks.",
    variables: [{ key: "feature", label: "Feature / product" }, { key: "user", label: "Primary user" }],
    template: "Act as a senior PM. Write a one-page PRD for {{feature}} for {{user}}.\nSections: problem & evidence, goals and non-goals, target user and top jobs-to-be-done, the proposed solution (with the smallest valuable version), scope (in/out), success metrics with targets, key risks and open questions, and a rough milestone plan. Keep it tight and decision-oriented." }),
  // Productivity
  P({ id: "prod-email", field: "productivity", level: "basic", title: "Turn messy notes into a clear email", summary: "A concise, well-structured email from your rough notes, in the right tone.",
    variables: [{ key: "recipient", label: "Recipient" }, { key: "tone", label: "Tone", placeholder: "e.g. warm, formal, firm" }],
    template: "Rewrite my rough notes into a clear email to {{recipient}} in a {{tone}} tone.\nKeep it short: a one-line purpose up front, the key points as tight sentences or bullets, a specific ask with any deadline, and a friendly close. Give 2 subject-line options. Fix grammar; don't add facts I didn't give." }),
  P({ id: "prod-decide", field: "productivity", level: "pro", title: "Decision framework for a tough call", summary: "Structure a hard decision with options, criteria, weights and a recommendation.",
    variables: [{ key: "decision", label: "The decision" }, { key: "constraints", label: "Constraints / what matters most" }],
    template: "Help me decide: {{decision}}. What matters most / constraints: {{constraints}}.\nWork it through: 1) restate the real decision and the deadline, 2) list the genuine options (including 'do nothing'), 3) pick 4–6 decision criteria and weight them, 4) score each option against the criteria in a table, 5) name the key uncertainties and what would change the answer, 6) give a clear recommendation and the smallest reversible first step. Be honest about trade-offs." }),

  // Business (more)
  P({ id: "biz-okrs", field: "business", level: "pro", title: "OKRs for a team or quarter", summary: "Sharp objectives and measurable key results, aligned and not sandbagged.",
    variables: [{ key: "team", label: "Team / company" }, { key: "focus", label: "Quarter's focus" }],
    template: "Act as an operating partner. Draft OKRs for {{team}} with this quarter's focus: {{focus}}.\nRules: 2–3 objectives (qualitative, inspiring, time-bound); 3–4 key results each (measurable, with a baseline and target, outcome not output); flag any KR that's really a task; add the top dependencies and how you'll review progress weekly. Present as a clean list, then a one-line note on the biggest risk to hitting them." }),

  // Marketing (more)
  P({ id: "mkt-ideas", field: "marketing", level: "basic", title: "30 content ideas that convert", summary: "A month of on-brand content ideas mapped to funnel stages.",
    variables: [{ key: "brand", label: "Brand / product" }, { key: "audience", label: "Audience" }],
    template: "Give me 30 content ideas for {{brand}} aimed at {{audience}}.\nSpread them across the funnel: awareness (10), consideration (10), conversion (10). For each: a working title, the format (post/video/guide/email), the angle/hook, and the single action it should drive. Avoid generic ideas — tie each to a real pain or desire of the audience. Group by funnel stage." }),

  // Sales (more)
  P({ id: "sales-discovery", field: "sales", level: "pro", title: "Discovery call plan", summary: "A discovery script that uncovers pain, impact and the buying process.",
    variables: [{ key: "product", label: "What you sell" }, { key: "prospect", label: "Prospect / role" }],
    template: "Act as a sales leader. Build a discovery call plan for selling {{product}} to {{prospect}}.\nInclude: a warm opener, the 8–10 best open questions (grouped: current state, pain & impact, desired outcome, decision process, budget/timing), how to quantify the cost of inaction, traps to avoid, a strong summary/next-step close, and the exact info to capture in the CRM afterwards. Keep questions genuinely curious, not leading." }),

  // Content (more)
  P({ id: "content-repurpose", field: "content", level: "basic", title: "Repurpose one piece into ten", summary: "Turn a single article, video or talk into a week of multi-channel content.",
    variables: [{ key: "source", label: "Source piece" }, { key: "channels", label: "Channels", placeholder: "e.g. LinkedIn, X, email" }],
    template: "I'll paste {{source}}. Repurpose it into 10 pieces for {{channels}} without sounding repetitive.\nFor each piece: the channel, the format, the hook/opening line, and the core idea it carries. Keep the original's substance; adapt tone and length per channel. Include at least one email, one long-form post, and several short posts. End with a suggested 5-day posting order." }),

  // Social Media
  P({ id: "social-hooks", field: "social", level: "basic", title: "Scroll-stopping hooks", summary: "15 sharp opening lines for short-form posts on any topic.",
    variables: [{ key: "topic", label: "Topic" }, { key: "platform", label: "Platform", placeholder: "e.g. LinkedIn, TikTok, X" }],
    template: "Write 15 scroll-stopping hooks about {{topic}} for {{platform}}.\nMix the patterns: bold claim, counter-intuitive truth, specific number/result, question, mistake-to-avoid, story open. Keep each under ~12 words, native to the platform, and not clickbait you can't pay off. Mark the 3 you'd test first and say why." }),
  P({ id: "social-calendar", field: "social", level: "pro", title: "30-day content calendar", summary: "A themed, mixed-format posting calendar with hooks and CTAs.",
    variables: [{ key: "brand", label: "Brand / creator" }, { key: "goal", label: "Goal", placeholder: "e.g. grow, sell, nurture" }, { key: "platform", label: "Platform" }],
    template: "Act as a social media strategist. Build a 30-day calendar for {{brand}} on {{platform}} to {{goal}}.\nDefine 3–4 content pillars, then a table with: day, pillar, format, hook, core message, CTA, and the metric it targets. Balance value/educational, personal/story, and promotional (roughly 3:1). Add posting cadence and 5 evergreen ideas to reuse. Keep it realistic for one person to produce." }),
  P({ id: "social-script", field: "social", level: "premium", title: "Short-form video script", summary: "A tight 30–60s script with hook, beats, B-roll and on-screen text.",
    variables: [{ key: "topic", label: "Topic" }, { key: "cta", label: "Desired action" }],
    template: "Write a 30–60 second short-form video script about {{topic}} ending in: {{cta}}.\nFormat as a table: timecode | spoken line | on-screen text | B-roll/visual. Open with a 1–2s pattern-interrupt hook, keep sentences punchy, build curiosity so viewers stay to the end, and land the CTA naturally. Add 3 alternative hooks and a caption with 5 relevant hashtags." }),

  // E-commerce
  P({ id: "ecom-product", field: "ecommerce", level: "basic", title: "Product description that sells", summary: "Benefit-led product copy with features, use cases and an SEO title.",
    variables: [{ key: "product", label: "Product" }, { key: "customer", label: "Ideal customer" }],
    template: "Write a product description for {{product}} aimed at {{customer}}.\nInclude: an SEO-friendly title (<60 chars), a one-line value hook, a short benefit-led paragraph, a bulleted features→benefits list, who it's perfect for, and a reassurance line (guarantee/returns). Sound like a helpful expert, not a hard sell. Give a 155-char meta description too." }),
  P({ id: "ecom-listing", field: "ecommerce", level: "pro", title: "Marketplace listing optimizer", summary: "Optimise a title, bullets and A+ content for search and conversion.",
    variables: [{ key: "product", label: "Product" }, { key: "marketplace", label: "Marketplace", placeholder: "e.g. Amazon, Etsy" }, { key: "keywords", label: "Target keywords" }],
    template: "Act as a marketplace listing specialist for {{marketplace}}. Optimise a listing for {{product}} targeting: {{keywords}}.\nDeliver: a keyword-rich but readable title, 5 benefit-led bullet points, a scannable description, backend/search terms, 5 A+ / image content ideas, and the top objection to answer. Follow {{marketplace}} conventions and avoid banned/claim language. Note any compliance flags." }),
  P({ id: "ecom-lifecycle", field: "ecommerce", level: "premium", title: "Lifecycle email flows", summary: "Welcome, abandoned-cart and post-purchase flows with timing and copy angles.",
    variables: [{ key: "brand", label: "Brand" }, { key: "product", label: "Product / category" }],
    template: "Act as a retention/CRM lead. Design lifecycle email flows for {{brand}} selling {{product}}.\nCover three flows — welcome, abandoned cart, and post-purchase — each as a table: email #, timing, goal, subject line, and the core message/offer angle. Add the key segmentation, one success metric per flow, and the guardrails (frequency, discount discipline). Keep it on-brand and non-spammy." }),

  // Finance (more)
  P({ id: "fin-budget", field: "finance", level: "basic", title: "Personal or team budget plan", summary: "A clear budget structure with categories, targets and a review rhythm.",
    variables: [{ key: "context", label: "Whose budget", placeholder: "e.g. household, small team" }, { key: "income", label: "Income / total available" }],
    template: "Help me build a budget for {{context}} with {{income}} available.\nStructure it: fixed costs, variable costs, savings/reserve, and discretionary — with a suggested % split and why. Show it as a table (Category | Target | Notes), flag the riskiest line, suggest one automation to stick to it, and a simple monthly review checklist. Mark my inputs as [INPUT]; don't invent my numbers." }),

  // Investing
  P({ id: "inv-research", field: "investing", level: "pro", title: "Company research framework", summary: "A structured company deep-dive: business, moat, financials, risks and valuation lenses.",
    variables: [{ key: "company", label: "Company / ticker" }, { key: "angle", label: "Your question", placeholder: "e.g. is the moat durable?" }],
    template: "Act as an equity analyst (educational, not investment advice). Research {{company}} focused on: {{angle}}.\nCover: what the business actually does and how it makes money, the moat and competitive dynamics, unit economics and financial health (growth, margins, cash, debt), management and capital allocation, key risks, and the bull vs bear case. List the specific data points I should pull and where to find them. End with 'What would change my mind'. Add a one-line not-advice disclaimer; never fabricate figures — mark them [VERIFY]." }),
  P({ id: "inv-memo", field: "investing", level: "elite", title: "Investment thesis memo", summary: "A disciplined investment memo with thesis, valuation range, catalysts and risks.",
    variables: [{ key: "asset", label: "Asset / company" }, { key: "horizon", label: "Time horizon" }],
    template: "Write an investment thesis memo on {{asset}} over a {{horizon}} horizon (educational, not advice).\nStructure: one-paragraph thesis, why the opportunity exists (what the market misprices), the variant perception, a valuation range with the key assumptions and a simple scenario table (bear/base/bull), catalysts and timing, the risks and what breaks the thesis, position-sizing logic, and the monitoring signals. Be intellectually honest and quantify. Mark all figures as [VERIFY] and add a not-advice disclaimer." }),

  // Legal (more)
  P({ id: "legal-summary", field: "legal", level: "pro", title: "Contract summary & risk flags", summary: "A neutral summary of a contract with obligations, dates and risk flags (not advice).",
    variables: [{ key: "role", label: "Your role", placeholder: "e.g. vendor, client" }, { key: "priorities", label: "What you care about", placeholder: "e.g. liability, termination" }],
    template: "You are a contract analyst (not my lawyer). I'll paste a contract. My role: {{role}}. Priorities: {{priorities}}.\nProduce: a plain-language summary; a table of key obligations (who | must do what | by when); payment, term and termination terms; a risk-flag list ranked high/medium/low with the clause reference and why; and the questions to raise before signing. Note anything unusual or one-sided. Do not invent citations or clauses not present; add a not-legal-advice line." }),

  // Compliance & Risk
  P({ id: "comp-policy", field: "compliance", level: "pro", title: "Policy document drafter", summary: "A clear, auditable policy with scope, roles, controls and review cadence.",
    variables: [{ key: "policy", label: "Policy topic", placeholder: "e.g. data retention, acceptable use" }, { key: "org", label: "Organisation / context" }],
    template: "Act as a compliance officer. Draft a {{policy}} policy for {{org}}.\nInclude: purpose and scope, definitions, roles and responsibilities, the policy statements/rules, the controls that enforce them, exceptions and approval process, enforcement/consequences, related standards, and a review cadence with an owner. Write in clear, auditable language. Mark anything that needs legal/jurisdiction review as [REVIEW]. Don't cite specific laws unless I provide them." }),
  P({ id: "comp-risk", field: "compliance", level: "premium", title: "Risk register & assessment", summary: "A structured risk register with likelihood, impact, controls and treatment.",
    variables: [{ key: "scope", label: "Scope / initiative" }, { key: "context", label: "Context / known concerns" }],
    template: "Act as a risk manager. Build a risk register for {{scope}}. Context: {{context}}.\nDeliver a table: risk ID | description | category | likelihood (1–5) | impact (1–5) | inherent score | existing controls | residual score | treatment (accept/mitigate/transfer/avoid) | owner | due date. Then summarise the top 5 risks, quick wins, and the biggest gap in current controls. Be specific to the scope; flag assumptions." }),

  // HR (more)
  P({ id: "hr-interview", field: "hr", level: "pro", title: "Structured interview kit", summary: "Competency-based questions, a scorecard and red flags for a role.",
    variables: [{ key: "role", label: "Role" }, { key: "competencies", label: "Key competencies" }],
    template: "Act as a hiring manager coach. Build a structured interview kit for {{role}} assessing: {{competencies}}.\nFor each competency: 2 behavioural questions (STAR-style), what a strong vs weak answer looks like, and one probing follow-up. Add a 1–4 scorecard with anchors, a short work-sample/practical suggestion, common red flags, and an inclusive, consistent process note. Keep it fair and job-relevant." }),

  // Career (more)
  P({ id: "career-cover", field: "career", level: "basic", title: "Tailored cover letter", summary: "A specific, non-generic cover letter matched to a job and company.",
    variables: [{ key: "role", label: "Target role" }, { key: "company", label: "Company" }, { key: "highlight", label: "Your top proof point" }],
    template: "Write a cover letter for {{role}} at {{company}}. My strongest proof point: {{highlight}}.\nKeep it under ~250 words: a hook that shows you understand their need, one paragraph of specific, evidence-backed value (use my proof point), a line on why this company specifically, and a confident close with a clear next step. No clichés, no restating the résumé. If key facts are missing, mark them [NEED]." }),

  // Education
  P({ id: "edu-lesson", field: "education", level: "basic", title: "Lesson plan", summary: "A clear lesson plan with objectives, activities, checks and differentiation.",
    variables: [{ key: "topic", label: "Topic" }, { key: "level", label: "Learner level / age" }, { key: "time", label: "Duration" }],
    template: "Act as an experienced teacher. Create a {{time}} lesson plan on {{topic}} for {{level}} learners.\nInclude: learning objectives (measurable), a hook, a step-by-step sequence (with timings), a main activity, checks for understanding, differentiation for strugglers and fast finishers, materials, and a short exit ticket to assess learning. Keep it practical and engaging." }),
  P({ id: "edu-curriculum", field: "education", level: "pro", title: "Course / curriculum outline", summary: "A module-by-module curriculum with outcomes, assessments and sequencing.",
    variables: [{ key: "subject", label: "Subject / course" }, { key: "audience", label: "Learners" }, { key: "length", label: "Length", placeholder: "e.g. 6 weeks" }],
    template: "Design a {{length}} curriculum on {{subject}} for {{audience}}.\nProvide: overall learning outcomes, a module-by-module breakdown (each with outcomes, key topics, an activity, and an assessment), how modules build on each other, the balance of theory vs practice, a capstone/project, and how you'll measure success. Present modules as a table. Flag prerequisites and common misconceptions to address." }),

  // Academic Research
  P({ id: "res-litreview", field: "research", level: "pro", title: "Literature review plan", summary: "A rigorous plan to scope, search, screen and synthesise a literature review.",
    variables: [{ key: "question", label: "Research question" }, { key: "discipline", label: "Field / discipline" }],
    template: "Act as a research methodologist. Plan a literature review for: {{question}} in {{discipline}}.\nCover: how to refine the question (e.g. PICO-style), search strategy (databases, keywords, boolean strings), inclusion/exclusion criteria, a screening workflow, how to extract and organise findings (a synthesis matrix), how to appraise quality, and how to structure the write-up. Note likely gaps and biases to watch. Do not fabricate sources; give me the search strings to run myself." }),
  P({ id: "res-abstract", field: "research", level: "premium", title: "Structured abstract & framing", summary: "A publishable-style abstract and sharpened framing from your draft.",
    variables: [{ key: "topic", label: "Study topic" }, { key: "type", label: "Study type", placeholder: "e.g. empirical, review" }],
    template: "Act as an academic editor. From the details I paste about my {{type}} study on {{topic}}, write a structured abstract (Background, Methods, Results, Conclusion) within ~250 words.\nThen: suggest 5 keywords, sharpen the contribution statement (what's novel and why it matters), flag any overclaiming, and list what a reviewer would most likely challenge. Use only the information I provide — mark missing results as [NEED]. Keep it precise and jargon-appropriate." }),

  // Health & Wellness (non-diagnostic)
  P({ id: "health-plan", field: "health", level: "basic", title: "Wellness routine plan", summary: "A balanced, realistic wellness plan (general info, not medical advice).",
    variables: [{ key: "goal", label: "Goal", placeholder: "e.g. more energy, better sleep" }, { key: "constraints", label: "Constraints", placeholder: "e.g. time, equipment" }],
    template: "Act as a wellness coach (general information, not medical advice). Build a realistic weekly routine to help with {{goal}}, given: {{constraints}}.\nCover: movement, sleep, nutrition basics, and stress/recovery — each with 2–3 concrete, small habits and how to start. Present a simple weekly schedule, a way to track progress, and 3 common pitfalls. Encourage me to consult a qualified professional for anything medical, and never diagnose or recommend medication/dosages." }),

  // Design & UX
  P({ id: "design-microcopy", field: "design", level: "basic", title: "UX microcopy that guides", summary: "Clear, friendly microcopy for buttons, empty states, errors and tooltips.",
    variables: [{ key: "product", label: "Product / screen" }, { key: "voice", label: "Brand voice", placeholder: "e.g. friendly, precise" }],
    template: "Act as a UX writer. Write microcopy for {{product}} in a {{voice}} voice.\nProvide options for: primary/secondary buttons, an empty state, a success message, 3 error messages (clear cause + next step, no blame), a permission/confirm dialog, and 2 tooltips. Keep it concise, action-oriented and accessible; avoid jargon and dark patterns. Give 2 variants for the trickiest ones." }),
  P({ id: "design-critique", field: "design", level: "pro", title: "Design & UX critique", summary: "A structured critique against usability heuristics with prioritised fixes.",
    variables: [{ key: "artifact", label: "What to critique", placeholder: "e.g. a signup flow" }, { key: "goal", label: "User goal" }],
    template: "Act as a senior product designer. Critique {{artifact}} where the user's goal is {{goal}}. I'll describe or paste it.\nEvaluate against usability heuristics (clarity, hierarchy, feedback, error prevention, accessibility, cognitive load). For each issue: severity, the heuristic it breaks, why it hurts the user, and a concrete fix. Note what's working too. End with the top 3 changes ranked by impact vs effort. Be specific, not generic." }),

  // Operations & Supply Chain
  P({ id: "ops-sop", field: "ops", level: "basic", title: "Standard operating procedure (SOP)", summary: "A clear, repeatable SOP anyone can follow, with roles and checks.",
    variables: [{ key: "process", label: "Process" }, { key: "owner", label: "Who performs it" }],
    template: "Write a standard operating procedure for {{process}}, performed by {{owner}}.\nInclude: purpose, scope, roles, prerequisites/tools, numbered step-by-step instructions (each starting with an action verb), decision points, quality checks, what to do when something goes wrong, and how success is verified. Keep steps unambiguous so a new hire could follow them. Add a short revision/version note." }),
  P({ id: "ops-improve", field: "ops", level: "pro", title: "Process improvement analysis", summary: "Diagnose a process, find waste and bottlenecks, propose measurable fixes.",
    variables: [{ key: "process", label: "Process to improve" }, { key: "problem", label: "Symptom / pain" }],
    template: "Act as an operations/Lean consultant. Improve {{process}} where the pain is: {{problem}}.\nWork through: map the current steps and hand-offs, identify bottlenecks and the 8 wastes, quantify likely impact, root-cause the top issues (5 Whys), then propose prioritised improvements (quick wins vs bigger bets) with expected effect, effort, and how to measure it. Present a before/after summary and a 30/60/90 rollout. Flag assumptions to validate with data." }),

  // Real Estate
  P({ id: "re-listing", field: "realestate", level: "basic", title: "Property listing that sells", summary: "Compelling, accurate listing copy with highlights and a call to action.",
    variables: [{ key: "property", label: "Property details" }, { key: "buyer", label: "Target buyer" }],
    template: "Write a property listing for {{property}} aimed at {{buyer}}.\nInclude: a punchy headline, an opening that sells the lifestyle, a scannable highlights list (rooms, features, upgrades), neighbourhood/location benefits, and a clear call to action to book a viewing. Be accurate and specific — no fair-housing-risky or exaggerated claims. Give a short version for portals and a longer version for the brochure." }),
  P({ id: "re-analysis", field: "realestate", level: "pro", title: "Rental / investment property analysis", summary: "Analyse a deal: cash flow, returns, assumptions and risks (not advice).",
    variables: [{ key: "property", label: "Property / price" }, { key: "strategy", label: "Strategy", placeholder: "e.g. buy-to-let, flip" }],
    template: "Act as a real-estate investment analyst (educational, not advice). Analyse {{property}} for a {{strategy}} strategy.\nLay out the assumptions (purchase, financing, rent, costs, vacancy) as [INPUT] fields, then compute the key metrics (cash flow, cap rate, cash-on-cash, and for a flip: margin) with the formulas shown. Add a simple sensitivity (rent/rate/cost changes), the main risks, and what would make you walk away. Don't invent local figures — mark them [VERIFY]." }),

  // Hospitality & Travel
  P({ id: "hosp-itinerary", field: "hospitality", level: "basic", title: "Custom travel itinerary", summary: "A day-by-day itinerary tuned to interests, pace and budget.",
    variables: [{ key: "destination", label: "Destination" }, { key: "days", label: "Length" }, { key: "travellers", label: "Who's travelling / interests" }],
    template: "Plan a {{days}} itinerary for {{destination}} for {{travellers}}.\nFor each day: a theme, morning/afternoon/evening plan, a mix of must-sees and local gems, realistic timing and travel between spots, food suggestions, and a rough budget band. Add booking-ahead tips, one rainy-day alternative, and a note on getting around. Keep the pace human — don't over-pack the days. Flag anything seasonal to verify." }),
  P({ id: "hosp-guest", field: "hospitality", level: "pro", title: "Guest communication templates", summary: "Warm, on-brand messages across the guest journey, including issue recovery.",
    variables: [{ key: "property", label: "Property / brand" }, { key: "voice", label: "Tone", placeholder: "e.g. warm, upscale" }],
    template: "Act as a guest-experience manager for {{property}}. Write message templates in a {{voice}} tone for: booking confirmation, pre-arrival info, welcome/check-in, a mid-stay check, checkout & review request, and a service-recovery message for a complaint.\nEach: short, personal (use [placeholders]), on-brand, with a clear next step. For the recovery message, acknowledge, apologise sincerely, fix, and offer a gesture without over-promising. Keep them reusable." }),
];

/** The full catalogue: the seed set plus the four catalogue parts, ordered by field then level. */
const LEVEL_ORDER: PromptLevel[] = ["basic", "pro", "premium", "elite"];
export const PROMPTS: Prompt[] = [...SEED, ...PROMPTS_A, ...PROMPTS_B, ...PROMPTS_C, ...PROMPTS_D]
  .sort((a, b) => FIELDS.findIndex((f) => f.id === a.field) - FIELDS.findIndex((f) => f.id === b.field) || LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));

export const promptsByField = (field: string) => PROMPTS.filter((p) => p.field === field);
export const getPrompt = (id: string) => PROMPTS.find((p) => p.id === id);

/** Public view — safe to index/expose (no full template body). */
export function publicPrompt(p: Prompt) {
  return { id: p.id, field: p.field, level: p.level, title: p.title, summary: p.summary, variables: p.variables, models: p.models, tags: p.tags };
}
