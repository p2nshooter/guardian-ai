-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- Migration 0011: New Playbooks Batch 2 — 10 Additional Products
-- Run AFTER 0010_new_playbooks.sql
-- Categories covered:
--   pc06 saas-startup  → Customer Success Playbook
--   pc05 ecommerce     → Amazon FBA Seller Kit
--   pc05 ecommerce     → Dropshipping & POD Masterpack
--   pc07 education     → Student Academic Excellence Pack
--   pc08 career        → LinkedIn & Personal Brand Pro
--   pc09 real-estate   → Property Investor Playbook
--   pc10 data-analytics→ Marketing Analytics Mastery
--   pc01 copywriting   → Brand Voice & Storytelling Kit
--   pc02 business      → Meeting & Presentation Mastery
--   pc03 content       → Podcast & Newsletter Engine
-- Run via: wrangler d1 execute axto-db --file=cf-migrations/0011_more_playbooks.sql
-- ============================================================

-- ── 1. Customer Success Playbook ────────────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-saas-003', 'pc06', 'customer-success-playbook',
  'Customer Success Playbook',
  '30 prompts to reduce churn and grow net revenue retention',
  'Onboarding calls, health score narratives, QBR decks, churn risk interventions, renewal plays, and expansion conversations — all scripted.',
  'Complete post-sale relationship toolkit. 30 prompts for CSMs, Account Managers, and SaaS founders. Onboarding & Activation (7 prompts — kickoff call agenda, implementation plan, training outline, feature adoption email series, milestone announcement, power user identification, 30-day check-in script), Health Monitoring & Risk (6 prompts — at-risk intervention email, disengaged user re-activation, executive sponsor outreach, health score narrative, support escalation, usage drop alert response), Retention & Renewal (7 prompts — renewal conversation script, multi-year justification, price increase communication, renewal negotiation, QBR deck outline, ROI summary, renewal objection handler), Expansion & Upsell (5 prompts — upsell discovery script, expansion proposal, new seat introduction, feature upgrade pitch, referral program intro), Offboarding & Win-Back (5 prompts — cancellation save script, exit interview email, cancellation confirmation + re-engagement, 90-day win-back campaign, loss analysis for product team).',
  24, 39, 30,
  '🤝', '', 'pdf', 'playbooks/customer-success-playbook.pdf',
  '["chatgpt","claude","gemini"]', 'en',
  '["customer-success","churn","retention","saas","account-management","renewal"]',
  'Prompt #1 — Kickoff Call Agenda:

You are a Senior CSM. Create a structured kickoff call agenda for [CUSTOMER] who just signed up for [PRODUCT].

Include:
- Pre-call checklist (what CSM should know)
- 60-min agenda with timestamps
- Success criteria discussion framework
- Mutual action plan template
- Internal handoff notes section

Customer type: [SMB/MID-MARKET/ENTERPRISE]
Primary use case: [USE CASE]',
  0, 1, 6
);

-- ── 2. Amazon FBA Seller Kit ────────────────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-ecom-002', 'pc05', 'amazon-fba-seller-kit',
  'Amazon FBA Seller Kit',
  '25 prompts to rank, convert, and scale on Amazon',
  'A+ Content, listing optimization, keyword research prompts, review generation, competitor analysis, and seller account communications.',
  'For Amazon sellers — private label, wholesale, or arbitrage. Listing Optimization (8 prompts — product title formula, 5 bullet points that trigger buying decisions, HTML product description, A+ Content panel copy, A+ comparison chart, backend search terms strategy, variation differentiation, bundle listing copy), Launch & Ranking (5 prompts — launch email sequence, Vine reviewer invitation, seed Q&A, early review request, product insert card copy), Competitive Intelligence (4 prompts — competitor SWOT, negative review gap analysis, price positioning, market gap identifier), Seller Communications (5 prompts — customer inquiry response, A-to-Z claim response, negative review public reply, removal request, brand registry infringement report), Scaling (3 prompts — supplier negotiation, 3PL evaluation, PPC ad copy for Sponsored Products). Includes Amazon TOS compliance notes throughout.',
  24, 44, 25,
  '📦', 'NEW', 'pdf', 'playbooks/amazon-fba-seller-kit.pdf',
  '["chatgpt","claude","gemini"]', 'en',
  '["amazon","fba","ecommerce","listing","ppc","seller"]',
  'Prompt #1 — Amazon Product Title Formula:

You are an Amazon SEO specialist. Write an optimized product title for [PRODUCT] in [CATEGORY].

Rules:
- Lead with primary keyword
- Include brand, key feature, size/quantity
- Under 200 characters
- No promotional phrases (TOS violation)
- Capitalize each word

Primary keyword: [KEYWORD]
Key differentiator: [DIFFERENTIATOR]',
  1, 1, 2
);

-- ── 3. Dropshipping & POD Masterpack ───────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-ecom-003', 'pc05', 'dropshipping-pod-masterpack',
  'Dropshipping & POD Masterpack',
  '30 prompts to launch and run a product business without inventory',
  'Niche research, supplier scripts, Shopify store copy, Facebook ad creatives, TikTok product scripts, and customer service automation.',
  'For Shopify, Etsy, TeeSpring, and AliExpress-based sellers. Niche & Product Research (5 prompts — winning product criteria analyzer, sub-niche finder, trend vs evergreen evaluator, supplier vetting script, profit margin narrative), Store Setup (7 prompts — homepage hero copy, product page copy, about page trust builder, FAQ page, shipping policy, returns policy, popup email capture offer), Advertising (8 prompts — Facebook ad copy 3 angles, TikTok organic script, TikTok paid 15s+30s, Google Shopping title optimizer, Pinterest description, influencer seeding pitch, UGC creative brief), Customer Service (5 prompts — WISMO response, delayed shipping explanation, dispute response, refund handler, review follow-up), Scaling (5 prompts — abandoned cart email x3, post-purchase upsell, SMS cart recovery, loyalty program intro, referral invite).',
  19, 34, 30,
  '🎁', '', 'pdf', 'playbooks/dropshipping-pod-masterpack.pdf',
  '["chatgpt","claude","gemini","llama"]', 'en',
  '["dropshipping","print-on-demand","shopify","etsy","tiktok","facebook-ads"]',
  'Prompt #1 — Winning Product Criteria Analyzer:

You are a dropshipping expert. Score this product for viability: [PRODUCT]

Score (1-10) on:
1. Wow Factor (scroll-stopping?)
2. Problem-Solution Fit
3. Perceived Value vs Cost (2-4x markup possible?)
4. Impulse Buy Score
5. Market Saturation (lower = more saturated)
6. Ad Creativeability (demonstrable in video?)
7. Return Rate Risk

Final verdict + recommended price + 3 target audiences.',
  0, 1, 3
);

-- ── 4. Student Academic Excellence Pack ────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-edu-002', 'pc07', 'student-academic-excellence-pack',
  'Student Academic Excellence Pack',
  '25 prompts to study smarter, write better, and ace every exam',
  'Essay writing, research paper structure, exam prep, note summarization, citation generation, and study plan builders.',
  'For high school and university students. Writing (8 prompts — essay outline builder, thesis statement generator, argumentative essay structure, literature review framework, research paper introduction, conclusion writer, abstract generator, citation/bibliography formatter APA/MLA/Chicago), Research & Analysis (5 prompts — research question narrower, source evaluation, statistical data interpreter, counter-argument builder, gap in literature identifier), Studying & Retention (7 prompts — Feynman technique explainer, spaced repetition schedule, exam question predictor, analogy generator, active recall flashcards, mind map outline, 1-page cheat sheet), Academic Communication (5 prompts — professor email (extension/clarification/feedback), peer review comments, group project task assignment, presentation script from outline, thesis defense Q&A prep). Designed to build skills, not bypass learning.',
  14, 24, 25,
  '📚', 'NEW', 'pdf', 'playbooks/student-academic-excellence-pack.pdf',
  '["chatgpt","claude","gemini"]', 'en',
  '["student","academic","essay","research","studying","university"]',
  'Prompt #1 — Essay Outline Builder:

You are an academic writing tutor. Help me build a structured outline for an essay on [TOPIC].

Provide:
1. Strong thesis statement (arguable claim)
2. 3-4 body sections with topic sentence + 2-3 evidence points + transition
3. Counter-argument section (steel-man the opposing view)
4. Conclusion strategy (synthesis not summary)
5. 3 recommended sources to find

Essay topic: [TOPIC] | Word count: [LENGTH]
Level: [HIGH SCHOOL/UNDERGRAD/POSTGRAD]',
  0, 1, 1
);

-- ── 5. LinkedIn & Personal Brand Pro ───────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-career-002', 'pc08', 'linkedin-personal-brand-pro',
  'LinkedIn & Personal Brand Pro',
  '20 prompts to build a magnetic professional presence online',
  'LinkedIn profile optimization, thought leadership content, networking messages, creator strategy, and personal brand positioning.',
  'For ambitious professionals, executives, consultants, and knowledge workers. Profile Optimization (5 prompts — headline formula, About section story arc rewrite, Featured section curation, Skills prioritization, Recommendations request), Content Strategy (7 prompts — personal story post, contrarian opinion post, behind-the-scenes post, data/insight post, carousel outline 10 slides, re-share with commentary, milestone announcement), Networking & Outreach (5 prompts — connection request, recruiter reply, comment depth response, post-IRL meeting DM, thank-you after informational interview), Brand Architecture (3 prompts — positioning statement, content pillars definition, 90-day content calendar outline). Includes algorithm notes for each post type.',
  19, 29, 20,
  '🌟', '', 'pdf', 'playbooks/linkedin-personal-brand-pro.pdf',
  '["chatgpt","claude","gemini"]', 'en',
  '["linkedin","personal-brand","networking","career","thought-leadership","professional"]',
  'Prompt #1 — LinkedIn Headline Formula:

You are a LinkedIn optimization expert. Rewrite my headline to maximize profile views and recruiter interest.

Write 5 variations:
- A: Role-forward (job seekers)
- B: Value-forward (consultants)
- C: Niche-forward (specialists)
- D: Result-forward (sales/BD)
- E: Creator-forward (thought leaders)

Current headline: [HEADLINE]
Target: [WHO YOU WANT TO ATTRACT]
Career goal: [JOB SEEKING / CLIENTS / AUTHORITY]',
  1, 1, 2
);

-- ── 6. Property Investor Playbook ───────────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-re-002', 'pc09', 'property-investor-playbook',
  'Property Investor Playbook',
  '25 prompts for buy-to-let, flips, and portfolio growth',
  'Deal analysis scripts, lender pitches, tenant communications, renovation briefs, property manager onboarding, and investor networking.',
  'For real estate investors, landlords, and property entrepreneurs. Deal Analysis (5 prompts — investment property ROI narrative, BRRRR strategy evaluator, short-term rental income estimator, commercial vs residential comparison, deal rejection letter), Financing & Lenders (4 prompts — private lender pitch, bank loan interview prep, refinance justification memo, JV partnership proposal), Tenant Management (6 prompts — tenant screening questions, welcome letter, rent increase notice, lease violation warning, eviction process email, move-out checklist), Property Operations (5 prompts — renovation contractor brief, property manager onboarding, maintenance response, insurance claim documentation, utility transfer coordination), Investor Network (5 prompts — meetup intro, deal sourcing message to wholesalers, earnest money offer letter, off-market inquiry, portfolio performance update).',
  24, 39, 25,
  '🏗️', '', 'pdf', 'playbooks/property-investor-playbook.pdf',
  '["chatgpt","claude","gemini"]', 'en',
  '["real-estate","investing","landlord","rental","property","brrrr"]',
  'Prompt #1 — Investment Property ROI Analysis:

You are a real estate investment analyst. Analyze this buy-to-let property.

Calculate and explain:
1. Gross Rental Yield
2. Net Rental Yield (after all costs)
3. Cash-on-Cash Return
4. Break-even occupancy rate
5. 5-year equity projection (3% and 5% scenarios)
6. Key risk factors
7. VERDICT: Buy / Pass / Negotiate

Purchase price: [PRICE] | Monthly rent: [RENT]
Monthly mortgage: [MORTGAGE] | Other costs: [COSTS]',
  0, 1, 2
);

-- ── 7. Marketing Analytics Mastery ─────────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-data-002', 'pc10', 'marketing-analytics-mastery',
  'Marketing Analytics Mastery',
  '25 prompts to turn marketing data into decisions',
  'Campaign performance analysis, attribution modeling, cohort breakdowns, CAC/LTV calculators, A/B test interpreters, and CMO-ready reporting.',
  'Bridges marketing and analytics for marketers who speak data. Campaign Analysis (7 prompts — paid media performance narrative for Google/Meta/TikTok, email campaign breakdown, SEO traffic trend, content ROI narrative, influencer ROI, event/webinar funnel analysis, affiliate channel review), Customer Metrics (5 prompts — CAC calculation and benchmarking, LTV model explanation, payback period analysis, retention curve interpretation, NPS segmentation), Attribution & Funnel (5 prompts — multi-touch attribution comparison, funnel drop-off analysis, UTM strategy brief, dark social explanation for stakeholders, cross-channel journey map), A/B Testing (4 prompts — statistical significance explainer, winning variant write-up, multivariate test design, inconclusive result action plan), Reporting (4 prompts — weekly dashboard commentary, monthly CMO report, board-level metrics summary, marketing QBR outline).',
  24, 39, 25,
  '📈', 'NEW', 'pdf', 'playbooks/marketing-analytics-mastery.pdf',
  '["chatgpt","claude","gemini"]', 'en',
  '["marketing","analytics","data","cac","ltv","reporting","attribution"]',
  'Prompt #1 — Paid Media Performance Narrative:

You are a performance marketing analyst. Write an executive-friendly narrative for this campaign.

Cover:
1. Performance summary (2 sentences vs goal)
2. Top performers and WHY they worked
3. Underperformers + root cause hypothesis
4. Efficiency metrics vs benchmark
5. Audience insights
6. Budget recommendation for next period
7. One bold test to run next

Platform: [GOOGLE/META/TIKTOK] | Spend: [$X] over [PERIOD]
Goal: [AWARENESS/LEADS/PURCHASES] | Target CPA: [$X] | Actual: [$Y]',
  1, 1, 3
);

-- ── 8. Brand Voice & Storytelling Kit ─────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-copy-005', 'pc01', 'brand-voice-storytelling-kit',
  'Brand Voice & Storytelling Kit',
  '20 prompts to make your brand impossible to forget',
  'Brand voice definition, tone guides, founder story, brand manifesto, tagline generation, and message architecture.',
  'For brand strategists, founders, and marketing directors. Brand Foundation (6 prompts — brand voice definition with 4 traits + do/don''t examples, tone-of-voice spectrum, brand values statement with behaviors, brand archetype analysis, messaging hierarchy, key message architecture), Storytelling Assets (7 prompts — founder origin story, brand origin story, customer hero story framework, brand manifesto, villain narrative, brand future vision, about us page rewrite), Campaign-Level Copy (7 prompts — tagline generator 10 options 3 directions, campaign theme naming, launch announcement, product naming brief, brand book intro, company culture page, brand partnership announcement). Each prompt includes tone guidance and alignment questions.',
  29, 49, 20,
  '🎨', '', 'pdf', 'playbooks/brand-voice-storytelling-kit.pdf',
  '["chatgpt","claude","gemini"]', 'en',
  '["brand","storytelling","copywriting","voice","strategy","identity"]',
  'Prompt #1 — Brand Voice Definition:

You are a brand strategist. Define the brand voice for [BRAND NAME].

Deliver:
1. Brand voice in one sentence
2. Four voice traits with: meaning + ✅ example phrase + ❌ what to avoid
3. Vocabulary: 10 words we use, 10 we avoid
4. Tone dial positions (formal↔casual, playful↔serious, bold↔humble)
5. Sample sentence rewrites (generic sentence → 3 brand-voice versions)

Brand: [NAME] | Industry: [INDUSTRY]
Target customer: [AUDIENCE] | Key competitor: [COMPETITOR]',
  0, 1, 5
);

-- ── 9. Meeting & Presentation Mastery ─────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-biz-004', 'pc02', 'meeting-presentation-mastery',
  'Meeting & Presentation Mastery',
  '25 prompts to run meetings that matter and present with impact',
  'Agenda templates, slide narratives, exec briefings, persuasive presentation structures, facilitation scripts, and follow-up communications.',
  'For managers, consultants, and executives. Meeting Design (7 prompts — agenda with pre-read brief, decision-only meeting framework, brainstorm facilitation script, difficult conversation prep, project status template, retrospective design, skip-level agenda), Presentation Building (8 prompts — Minto Pyramid structure, problem-solution-benefit narrative, data story arc, change management pitch deck, budget approval presentation, new initiative proposal, workshop design, keynote outline for external audiences), Meeting Communications (5 prompts — pre-meeting briefing, notes to stakeholders, action items ownership email, decision documentation, escalation to leadership), Facilitation & Influence (5 prompts — consensus building script, handling objections, conflict de-escalation, buy-in builder for skeptics, closing with clear commitments).',
  19, 29, 25,
  '🎤', '', 'pdf', 'playbooks/meeting-presentation-mastery.pdf',
  '["chatgpt","claude","gemini"]', 'en',
  '["meetings","presentations","leadership","communication","business","facilitation"]',
  'Prompt #1 — Executive Meeting Agenda + Pre-Read:

You are a Chief of Staff. Create a meeting agenda and pre-read for an exec meeting on [TOPIC].

Pre-Read (sent 24h before):
- 1-page context: situation, why it matters, what decision is needed
- Supporting data
- 2-3 questions attendees should consider

60-min Agenda:
- 0:00-0:05 Context recap
- 0:05-0:20 Topic A — Decision
- 0:20-0:40 Topic B — Discussion
- 0:40-0:55 Q&A
- 0:55-1:00 Commitments + owners

Purpose: [DECIDE/INFORM/ALIGN/BRAINSTORM]
Decision needed: [SPECIFIC DECISION]',
  0, 1, 4
);

-- ── 10. Podcast & Newsletter Engine ───────────────────────────────────────
INSERT OR IGNORE INTO playbooks (
  id, category_id, slug, name, subtitle,
  description, long_description,
  price_usd, original_price, prompt_count,
  icon, badge, file_format, r2_key,
  compatible_with, language, tags, preview_text,
  is_featured, is_active, sort_order
) VALUES (
  'pb-content-003', 'pc03', 'podcast-newsletter-engine',
  'Podcast & Newsletter Engine',
  '30 prompts to grow a loyal audience through audio and email',
  'Episode scripts, show notes, interview prep, newsletter frameworks, subject line formulas, subscriber growth, and repurposing workflows.',
  'For podcasters and newsletter writers. Podcast Production (10 prompts — solo episode script, interview guest prep with 10 questions, intro/outro writer, episode title + SEO description, show notes from bullets, listener Q&A structure, miniseries arc planner, mid-roll ad read, 30s social teaser, season premiere announcement), Newsletter Writing (12 prompts — issue framework hook→story→lesson→CTA, subject line generator 10 options, preview text optimizer, welcome email, 3-email re-engagement campaign, referral announcement, paid tier upgrade pitch, curated links with commentary, reader survey, controversial opinion issue, roundup issue, milestone issue), Growth & Distribution (8 prompts — podcast guesting pitch, cross-newsletter swap pitch, Spotify/Apple description, podcast website homepage, newsletter landing page, social clip caption, Substack/Beehiiv bio, listener review request). Includes 1 episode → 8 content pieces repurposing workflow.',
  19, 34, 30,
  '🎙️', '', 'pdf', 'playbooks/podcast-newsletter-engine.pdf',
  '["chatgpt","claude","gemini"]', 'en',
  '["podcast","newsletter","audience","email","content","creator"]',
  'Prompt #1 — Solo Episode Script Framework:

You are a podcast scriptwriter for top-ranked shows. Write a complete solo episode on [TOPIC].

Structure:
[COLD OPEN 0:00-0:30]: Start mid-story. No intro yet.
[HOOK]: Why does this matter right now?
[ROADMAP]: 3 things they will get.
[MAIN CONTENT]: 3 segments, stories, data, examples.
[KEY INSIGHT]: The 1 thing they remember.
[ACTION STEP]: Specific, do-it-today simple.
[OUTRO]: Thank listener, tease next episode, subscribe CTA.

Topic: [TOPIC] | Audience: [WHO LISTENS]
Length goal: [15/30/45 min] | Tone: [CONVERSATIONAL/EDUCATIONAL/MOTIVATIONAL]',
  0, 1, 3
);

-- ── Also update bundles in playbook_bundles table (if using DB for bundles) ─
INSERT OR IGNORE INTO playbook_bundles (
  id, slug, name, description, price_usd, original_price,
  playbook_ids, badge, is_featured, is_active, sort_order
) VALUES
  ('bundle-ecommerce', 'ecommerce-empire-bundle',
   'E-Commerce Empire Bundle',
   'E-Commerce Conversion Kit + Amazon FBA Seller Kit + Dropshipping & POD Masterpack — sell everywhere online.',
   49, 87,
   '["pb-ecom-001","pb-ecom-002","pb-ecom-003"]',
   'SAVE 44%', 0, 1, 5),
  ('bundle-career', 'career-brand-bundle',
   'Career & Brand Bundle',
   'Career Accelerator Pack + LinkedIn & Personal Brand Pro — get hired faster and build an audience that brings opportunities.',
   29, 48,
   '["pb-career-001","pb-career-002"]',
   'SAVE 40%', 0, 1, 6),
  ('bundle-data', 'data-analytics-bundle',
   'Data & Analytics Bundle',
   'Data Analyst Toolkit + Marketing Analytics Mastery — turn data into decisions across ops and marketing.',
   34, 63,
   '["pb-data-001","pb-data-002"]',
   'SAVE 46%', 0, 1, 7);

-- Update mega bundle original_price to reflect full catalog value
UPDATE playbook_bundles
SET original_price = 581, description = 'Every single playbook in our catalog. Lifetime access to all 28 current playbooks across all 10 categories.'
WHERE id = 'bundle-mega';

-- Update existing bundles with new members
UPDATE playbook_bundles
SET playbook_ids = '["pb-biz-001","pb-biz-002","pb-legal-001","pb-biz-003","pb-biz-004"]',
    description = 'Startup Playbook + SOP Factory + Legal Vault + Freelancer Kit + Meeting Mastery — everything to launch and run a business.',
    original_price = 130, badge = 'SAVE 47%'
WHERE id = 'bundle-biz';

UPDATE playbook_bundles
SET playbook_ids = '["pb-copy-001","pb-copy-003","pb-content-001","pb-content-002","pb-content-003"]',
    description = 'Sales Copy + Social Media Engine + SEO Blog + YouTube Scripts + Podcast & Newsletter — dominate every channel.',
    original_price = 115, badge = 'SAVE 49%'
WHERE id = 'bundle-creator';

UPDATE playbook_bundles
SET playbook_ids = '["pb-copy-004","pb-saas-001","pb-saas-002","pb-saas-003"]',
    description = 'Cold Outreach + SaaS Growth + AI Productivity + Customer Success — acquire, convert, retain.',
    original_price = 136, badge = 'NEW', price_usd = 69
WHERE id = 'bundle-growth';

-- ── Verify ──────────────────────────────────────────────────────────────────
-- SELECT id, name, price_usd, badge, is_featured FROM playbooks ORDER BY category_id, id;
-- SELECT id, name, price_usd, original_price FROM playbook_bundles ORDER BY id;
