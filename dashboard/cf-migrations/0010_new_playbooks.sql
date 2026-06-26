-- ==============================================================================
-- Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Author & Architect: Yusron Efendi <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- Migration 0010: New Playbooks — 5 New Products (Gap Fill)
-- Categories covered:
--   pc01 copywriting   → Cold DM & Outreach Masterclass
--   pc02 business      → Freelancer Business Kit
--   pc03 content       → YouTube Script Machine
--   pc04 legal-hr      → HR & Hiring Toolkit
--   pc06 saas-startup  → AI Productivity Power Pack
-- Run via: wrangler d1 execute axto-db --file=cf-migrations/0010_new_playbooks.sql
-- ============================================================

-- ── 1. Cold DM & Outreach Masterclass ──────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-copy-004',
  'pc01',
  'cold-dm-outreach-masterclass',
  'Cold DM & Outreach Masterclass',
  '35 prompts to land clients, partners & press — cold',
  'Proven cold email, LinkedIn DM, Twitter/X DM, Instagram DM, and follow-up sequences that get replies from busy people.',
  'Stop getting ghosted. 35 battle-tested outreach prompts for every channel and every goal. Covers: Cold Email (10 prompts — B2B lead generation, agency prospecting, partnership proposal, guest post pitch, podcast guest pitch, investor intro, influencer collab, job inquiry, PR press pitch, conference speaker application), LinkedIn DM (8 prompts — connection + immediate ask, slow-burn relationship opener, job opportunity, collaboration offer, referral request, VC intro, recruiter outreach, mentorship ask), Twitter/X DM (5 prompts — fan-to-customer, creator collab, product feedback ask, affiliate pitch, warm intro follow-up), Instagram DM (5 prompts — brand deal opener, UGC creator pitch, shoutout trade, affiliate invite, influencer partnership), Follow-Up Sequences (7 prompts — bump after 3 days, breakup email, reply-to-positive opener, meeting confirmation, post-call summary, objection handler, closed-lost re-engagement). Each prompt includes subject line A/B variant, tone guide, personalization hooks, and what NOT to say.',
  24,
  39,
  35,
  '📬',
  'NEW',
  'pdf',
  'playbooks/cold-dm-outreach-masterclass.pdf',
  '["chatgpt","claude","gemini","llama"]',
  'en',
  '["cold-email","outreach","linkedin","dm","prospecting","sales"]',
  'Prompt #1 — Cold Email (B2B Lead Generation):

You are a sales development rep at a top-tier B2B company. Write a cold email to [PROSPECT NAME] at [COMPANY] about [YOUR PRODUCT/SERVICE].

Rules:
- Subject line: 5 words max, no buzzwords
- Opening line: hyper-personalized to their [RECENT COMPANY NEWS / LINKEDIN POST / ROLE CHANGE]
- Body: 3 sentences max. 1 pain point, 1 proof, 1 ask
- CTA: single, specific, low-commitment (15-min call, not demo)
- PS line: social proof or urgency

Target: [INDUSTRY], [COMPANY SIZE], [JOB TITLE]
Pain point: [SPECIFIC PROBLEM YOUR PRODUCT SOLVES]
Proof: [RELEVANT CASE STUDY OR STAT]',
  1,
  1,
  4
);

-- ── 2. Freelancer Business Kit ──────────────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-biz-003',
  'pc02',
  'freelancer-business-kit',
  'Freelancer Business Kit',
  '25 prompts to run and grow your freelance business',
  'Proposals that win, rates that stick, clients that stay. Everything a freelancer needs to operate like a professional agency.',
  'The complete back-office for solo professionals. 25 prompts covering every stage of freelance business management. Client Acquisition (6 prompts — service page copy, portfolio case study formatter, Upwork/Fiverr profile optimizer, cold pitch for dream client, referral ask email, testimonial collection message), Proposals & Pricing (5 prompts — project proposal generator, custom quote breakdown, value-based pricing justification, retainer offer, package tier designer), Project Management (5 prompts — kickoff email, scope creep response, progress update email, delay/extension request, project wrap-up summary + upsell), Finance & Admin (5 prompts — invoice message, payment reminder (x3 escalating), overdue final notice, rate increase announcement), Growth (4 prompts — niche positioning statement, LinkedIn profile rewrite for freelancers, thought leadership post template, service productization roadmap). Tested across 500+ freelance engagements in design, writing, development, and consulting.',
  19,
  29,
  25,
  '💼',
  '',
  'pdf',
  'playbooks/freelancer-business-kit.pdf',
  '["chatgpt","claude","gemini"]',
  'en',
  '["freelance","proposal","clients","pricing","business","solopreneur"]',
  'Prompt #1 — Project Proposal Generator:

You are a senior freelance consultant. Write a professional project proposal for [CLIENT NAME] at [COMPANY] for [PROJECT TYPE].

Include these sections:
1. Executive Summary (2-3 sentences, speak to their business outcome, not your process)
2. Understanding of the Brief (restate their problem in your words — shows you listened)
3. Proposed Approach (3-5 numbered phases with deliverables per phase)
4. Timeline (table format: Phase | Deliverable | Duration | Your Availability)
5. Investment (tiered: Good / Better / Best with prices)
6. Why Me (3 bullet points, outcomes not credentials)
7. Next Steps (exactly what happens after they say yes)

Project type: [DESIGN/DEVELOPMENT/WRITING/CONSULTING]
Budget range: [AMOUNT]
Client industry: [INDUSTRY]
Key concern they expressed: [CONCERN]',
  0,
  1,
  3
);

-- ── 3. YouTube Script Machine ───────────────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-content-002',
  'pc03',
  'youtube-script-machine',
  'YouTube Script Machine',
  '30 prompts for hooks, scripts & thumbnails that get clicks',
  'Full video scripts, title formulas, thumbnail copy, end screens, and channel growth playbooks — built for YouTube creators.',
  '30 prompts engineered specifically for YouTube. Each prompt outputs a complete, ready-to-record script with timestamps, b-roll notes, and editing cues. Script Types (12 prompts — tutorial how-to, product review, reaction video, story-time vlog, mini-documentary, talking head educational, listicle countdown, challenge video, collaboration intro, channel trailer, subscriber milestone, Q&A compilation), Hook Engineering (5 prompts — pattern interrupt hook, curiosity gap hook, controversy hook, promise hook, story hook — each with 3 alternative openings), Title & Thumbnail (6 prompts — title generator (10 variants), thumbnail headline, click bait vs integrity balance, A/B title tester, thumbnail concept brief, title SEO optimizer), Channel Growth (7 prompts — channel description, about page, playlist description, community post, Shorts repurpose from long-form, YouTube Shorts native script, end screen CTA copy). Optimized for audience retention with [TIMESTAMP] markers, re-engagement hooks at 30%, 50%, and 70% marks, and subscriber conversion CTAs.',
  19,
  34,
  30,
  '🎬',
  'NEW',
  'pdf',
  'playbooks/youtube-script-machine.pdf',
  '["chatgpt","claude","gemini"]',
  'en',
  '["youtube","video","script","content","creator","hooks"]',
  'Prompt #1 — Tutorial / How-To Video Script:

You are a YouTube scriptwriter who has written for channels with 1M+ subscribers. Write a complete video script for a tutorial on [TOPIC].

Output format:
[HOOK — 0:00-0:30]
Open with a pattern interrupt: show the finished result or end state immediately. Then say: "In this video, I''ll show you exactly how to [OUTCOME] in [TIMEFRAME] — even if [BIGGEST OBJECTION]."

[INTRO — 0:30-1:00]
Brief credibility + what they will have by end of video. Do NOT say "welcome back."

[MAIN CONTENT — timestamps every 2-3 min]
Step-by-step with: instruction → why it matters → common mistake to avoid

[RETENTION HOOK at 50% mark]
"Before we get to [MOST EXCITING PART], I need to show you [PREREQUISITE] — and most people skip this."

[CTA — final 60 seconds]
Subscribe pitch tied to this video''s topic. Suggest next video. End card copy.

Include b-roll suggestions in [BRACKETS] throughout.

Video topic: [TOPIC]
Target audience: [BEGINNER/INTERMEDIATE/ADVANCED] [NICHE] [WHO WANT TO...]
Video length goal: [5/10/15/20 minutes]',
  1,
  1,
  2
);

-- ── 4. HR & Hiring Toolkit ──────────────────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-legal-002',
  'pc04',
  'hr-hiring-toolkit',
  'HR & Hiring Toolkit',
  '30 prompts for recruiting, onboarding & team management',
  'Job descriptions that attract A-players, interview frameworks that reveal real talent, and HR communications that build great culture.',
  '30 prompts for HR professionals, hiring managers, and startup founders. Hiring Funnel (10 prompts — job description writer (attracts culture-fit over keyword-stuffers), LinkedIn sourcing message, screening call script, technical assessment brief, take-home project brief, reference check script, offer letter, rejection letter (respectful), hiring decision matrix, role scorecard), Onboarding (6 prompts — 30/60/90 day plan generator, first-day welcome email, buddy/mentor assignment note, tools & access request email, new hire introduction for team, first 1-on-1 agenda), Performance Management (6 prompts — quarterly review template, performance improvement plan (PIP), promotion recommendation memo, written warning letter, merit increase announcement, goal-setting framework (OKR/SMART)), Culture & Communication (8 prompts — all-hands meeting agenda, team offsite planning brief, employee recognition message, departure announcement, HR policy explainer, conflict mediation template, salary band communication, return-to-office policy memo). NOTE: Templates are starting points — adapt to your jurisdiction and HR policies.',
  24,
  39,
  30,
  '🧑‍💼',
  '',
  'pdf',
  'playbooks/hr-hiring-toolkit.pdf',
  '["chatgpt","claude","gemini"]',
  'en',
  '["hr","hiring","recruiting","onboarding","management","team"]',
  'Prompt #1 — Job Description Writer (A-Player Magnet):

You are a talent acquisition director at a high-growth company. Write a job description for [JOB TITLE] that attracts exceptional candidates and self-selects out mediocre ones.

Structure:
1. One-sentence company mission (not a Wikipedia paragraph)
2. "Why this role exists" — the real business problem this person will solve
3. What you''ll do (5-7 bullet points — outcomes, not activities. "Own X" not "Responsible for X")
4. What success looks like in 90 days (3 measurable outcomes)
5. What you bring (5 bullets max — be specific, no "strong communication skills")
6. Why join us (3 REAL reasons — not "fast-paced environment")
7. Compensation range (be transparent)

Role: [JOB TITLE]
Team size: [N PEOPLE]
Reports to: [TITLE]
Key outcomes expected: [WHAT DOES WINNING LOOK LIKE IN YEAR 1]
Must-have experience: [2-3 NON-NEGOTIABLES]
Culture keywords: [3 WORDS THAT DESCRIBE YOUR TEAM]',
  0,
  1,
  5
);

-- ── 5. AI Productivity Power Pack ──────────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-saas-002',
  'pc06',
  'ai-productivity-power-pack',
  'AI Productivity Power Pack',
  '40 prompts to 10x your daily output with AI',
  'Think faster, write better, decide smarter. 40 universal productivity prompts for knowledge workers, managers, and entrepreneurs.',
  'The most versatile pack in the catalog — these 40 prompts work for any role, any industry. Think of it as a personal AI operating system. Thinking & Decision Making (8 prompts — first principles deconstruction, devil''s advocate generator, decision framework (pros/cons/risks/mitigations), second-order consequences analyzer, pre-mortem failure finder, opportunity cost evaluator, mental model applicator, bias checker), Writing & Communication (8 prompts — meeting notes to action items, email triage and response drafts, report from bullet points, presentation narrative builder, document summary (any length → executive brief), passive-to-active voice rewriter, jargon eliminator, translation to "explain like I''m 5"), Research & Learning (8 prompts — topic deep dive in 5 minutes, book/article key lessons extractor, skill learning roadmap, industry landscape briefer, question generator for interviews/research, analogy generator for complex ideas, knowledge gap identifier, expert perspective simulator), Project & Time Management (8 prompts — project plan from goal, meeting agenda generator, status update writer, blocker/bottleneck analyzer, delegation message, priority stack ranker, 1-page strategy doc, retrospective facilitator), Personal Effectiveness (8 prompts — weekly review prompt, career reflection framework, feedback interpreter, personal brand audit, side project evaluator, networking message generator, goal cascade (big goal → weekly tasks), energy audit framework). Works identically in ChatGPT, Claude, Gemini, and any LLM.',
  24,
  39,
  40,
  '⚡',
  'POPULAR',
  'pdf',
  'playbooks/ai-productivity-power-pack.pdf',
  '["chatgpt","claude","gemini","llama","mistral"]',
  'en',
  '["productivity","ai","workflow","decision-making","writing","management"]',
  'Prompt #1 — First Principles Deconstruction:

You are a Socratic thinking partner trained in first-principles reasoning. Break down [PROBLEM / TOPIC / ASSUMPTION] into its fundamental truths.

Process:
1. State the common assumption or conventional wisdom about [TOPIC]
2. Ask: "But WHY is this true? What does it depend on?"
3. Strip away every assumption until you reach bedrock facts
4. List the core components that actually exist (not inherited beliefs)
5. From those components, rebuild: "Given only these truths, what is the optimal solution or understanding?"
6. Show me what changes when you think about it this way

Then give me 3 non-obvious insights that emerge from this analysis.

Topic to deconstruct: [YOUR PROBLEM OR ASSUMPTION]
Context: [INDUSTRY/SITUATION]',
  1,
  1,
  1
);

-- ── Verify inserts ──────────────────────────────────────────────────────────
-- SELECT id, name, price_usd, badge, is_featured FROM playbooks
-- WHERE id IN ('pb-copy-004','pb-biz-003','pb-content-002','pb-legal-002','pb-saas-002');
