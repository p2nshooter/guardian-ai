# AXTO Playbooks — Master Upload & Deploy Checklist
## Covers Migration 0010 (5 playbooks) + Migration 0011 (10 playbooks) = 15 New Products

---

## 🚀 Deploy Order

```bash
# Step 1: Run migrations in order
wrangler d1 execute axto-db --file=cf-migrations/0010_new_playbooks.sql
wrangler d1 execute axto-db --file=cf-migrations/0011_more_playbooks.sql

# Step 2: Push to GitHub (auto-deploys catalog.ts + templates.ts via Cloudflare Pages)
git add .
git commit -m "feat: add 15 new playbooks across all 10 categories"
git push origin main

# Step 3: Verify in DB
wrangler d1 execute axto-db --command="SELECT id, name, price_usd, badge, is_featured, is_active FROM playbooks ORDER BY category_id, id;"
wrangler d1 execute axto-db --command="SELECT id, name, price_usd, original_price, badge FROM playbook_bundles ORDER BY id;"
```

---

## 📊 Full Catalog After Both Migrations (28 Total Playbooks)

| ID | Name | Category | Price | Was | Prompts | Badge | Featured |
|----|------|----------|-------|-----|---------|-------|---------|
| pb-copy-001 | Ultimate Sales Copy Pack | Copywriting | $29 | ~~$49~~ | 50 | BEST SELLER | ✅ |
| pb-copy-002 | Email Sequence Machine | Copywriting | $24 | ~~$39~~ | 71 | — | — |
| pb-copy-003 | Social Media Content Engine | Copywriting | $19 | ~~$34~~ | 90 | POPULAR | ✅ |
| pb-copy-004 | Cold DM & Outreach Masterclass | Copywriting | $24 | ~~$39~~ | 35 | NEW | ✅ |
| pb-copy-005 | Brand Voice & Storytelling Kit | Copywriting | $29 | ~~$49~~ | 20 | — | — |
| pb-biz-001 | Startup Launch Playbook | Business | $34 | ~~$59~~ | 40 | — | ✅ |
| pb-biz-002 | SOP Template Factory | Business | $19 | ~~$29~~ | 25 | — | — |
| pb-biz-003 | Freelancer Business Kit | Business | $19 | ~~$29~~ | 25 | — | — |
| pb-biz-004 | Meeting & Presentation Mastery | Business | $19 | ~~$29~~ | 25 | — | — |
| pb-content-001 | SEO Blog Machine | Content | $19 | ~~$34~~ | 20 | — | — |
| pb-content-002 | YouTube Script Machine | Content | $19 | ~~$34~~ | 30 | NEW | ✅ |
| pb-content-003 | Podcast & Newsletter Engine | Content | $19 | ~~$34~~ | 30 | — | — |
| pb-legal-001 | Legal Document Vault | Legal & HR | $39 | ~~$79~~ | 30 | HIGH VALUE | ✅ |
| pb-legal-002 | HR & Hiring Toolkit | Legal & HR | $24 | ~~$39~~ | 30 | — | — |
| pb-ecom-001 | E-Commerce Conversion Kit | E-Commerce | $24 | ~~$44~~ | 45 | — | — |
| pb-ecom-002 | Amazon FBA Seller Kit | E-Commerce | $24 | ~~$44~~ | 25 | NEW | ✅ |
| pb-ecom-003 | Dropshipping & POD Masterpack | E-Commerce | $19 | ~~$34~~ | 30 | — | — |
| pb-saas-001 | SaaS Growth Playbook | SaaS | $29 | ~~$49~~ | 35 | — | — |
| pb-saas-002 | AI Productivity Power Pack | SaaS | $24 | ~~$39~~ | 40 | POPULAR | ✅ |
| pb-saas-003 | Customer Success Playbook | SaaS | $24 | ~~$39~~ | 30 | — | — |
| pb-edu-001 | Course Creator Blueprint | Education | $19 | ~~$29~~ | 20 | — | — |
| pb-edu-002 | Student Academic Excellence Pack | Education | $14 | ~~$24~~ | 25 | NEW | — |
| pb-career-001 | Career Accelerator Pack | Career | $19 | ~~$34~~ | 30 | POPULAR | ✅ |
| pb-career-002 | LinkedIn & Personal Brand Pro | Career | $19 | ~~$29~~ | 20 | — | ✅ |
| pb-re-001 | Real Estate Agent Kit | Real Estate | $24 | ~~$39~~ | 25 | — | — |
| pb-re-002 | Property Investor Playbook | Real Estate | $24 | ~~$39~~ | 25 | — | — |
| pb-data-001 | Data Analyst Toolkit | Data | $19 | ~~$29~~ | 25 | — | — |
| pb-data-002 | Marketing Analytics Mastery | Data | $24 | ~~$39~~ | 25 | NEW | ✅ |

**Total prompts in catalog: ~831 prompts across 28 playbooks**

---

## 📦 Bundle Summary (7 Bundles)

| Bundle | Includes | Price | Original | Savings |
|--------|----------|-------|----------|---------|
| Mega Bundle — All Access | All 28 playbooks | $99 | ~~$581~~ | 83% |
| Business Starter Bundle | biz-001,002,003,004 + legal-001 | $69 | ~~$130~~ | 47% |
| Content Creator Bundle | copy-001,003 + content-001,002,003 | $59 | ~~$115~~ | 49% |
| Growth Machine Bundle | copy-004 + saas-001,002,003 | $69 | ~~$136~~ | 49% |
| E-Commerce Empire Bundle | ecom-001,002,003 | $49 | ~~$87~~ | 44% |
| Career & Brand Bundle | career-001,002 | $29 | ~~$48~~ | 40% |
| Data & Analytics Bundle | data-001,002 | $34 | ~~$63~~ | 46% |

---

## 📁 R2 File Upload Checklist

Upload each PDF to R2 bucket `axto-storage` at the listed key path.
Admin panel: `/admin/playbooks` → click "Upload" for each row.

### Migration 0010 Files (5 PDFs)
- [ ] `playbooks/cold-dm-outreach-masterclass.pdf` → pb-copy-004
- [ ] `playbooks/freelancer-business-kit.pdf` → pb-biz-003
- [ ] `playbooks/youtube-script-machine.pdf` → pb-content-002
- [ ] `playbooks/hr-hiring-toolkit.pdf` → pb-legal-002
- [ ] `playbooks/ai-productivity-power-pack.pdf` → pb-saas-002

### Migration 0011 Files (10 PDFs)
- [ ] `playbooks/customer-success-playbook.pdf` → pb-saas-003
- [ ] `playbooks/amazon-fba-seller-kit.pdf` → pb-ecom-002
- [ ] `playbooks/dropshipping-pod-masterpack.pdf` → pb-ecom-003
- [ ] `playbooks/student-academic-excellence-pack.pdf` → pb-edu-002
- [ ] `playbooks/linkedin-personal-brand-pro.pdf` → pb-career-002
- [ ] `playbooks/property-investor-playbook.pdf` → pb-re-002
- [ ] `playbooks/marketing-analytics-mastery.pdf` → pb-data-002
- [ ] `playbooks/brand-voice-storytelling-kit.pdf` → pb-copy-005
- [ ] `playbooks/meeting-presentation-mastery.pdf` → pb-biz-004
- [ ] `playbooks/podcast-newsletter-engine.pdf` → pb-content-003

---

## 📝 PDF Content Outlines

### pb-copy-004 — Cold DM & Outreach Masterclass (35 prompts)
```
SECTION 1: COLD EMAIL (Prompts 1–10)
  1. B2B Lead Generation | 2. Agency Prospecting | 3. Partnership Proposal
  4. Guest Post Pitch | 5. Podcast Guest Pitch | 6. Investor Intro
  7. Influencer Collab | 8. Job Inquiry | 9. PR Press Pitch | 10. Speaker Application

SECTION 2: LINKEDIN DM (Prompts 11–18)
  11. Connection + Immediate Ask | 12. Slow-Burn Opener | 13. Job Opportunity
  14. Collaboration Offer | 15. Referral Request | 16. VC/Investor Intro
  17. Recruiter Outreach | 18. Mentorship Ask

SECTION 3: TWITTER/X DM (Prompts 19–23)
  19. Fan-to-Customer | 20. Creator Collab | 21. Product Feedback Ask
  22. Affiliate Pitch | 23. Warm Intro Follow-Up

SECTION 4: INSTAGRAM DM (Prompts 24–28)
  24. Brand Deal Opener | 25. UGC Creator Pitch | 26. Shoutout Trade
  27. Affiliate Invite | 28. Influencer Partnership

SECTION 5: FOLLOW-UP SEQUENCES (Prompts 29–35)
  29. 3-Day Bump | 30. Breakup Email | 31. Reply-to-Positive Opener
  32. Meeting Confirmation | 33. Post-Call Summary | 34. Objection Handler
  35. Closed-Lost Re-Engagement (6 months)

BONUS: 10 Subject Line Formulas + 5 Things That Kill Response Rates
```

### pb-biz-003 — Freelancer Business Kit (25 prompts)
```
SECTION 1: CLIENT ACQUISITION (Prompts 1–6)
  1. Service Page Copy | 2. Portfolio Case Study | 3. Upwork/Fiverr Profile
  4. Cold Pitch for Dream Client | 5. Referral Ask | 6. Testimonial Collection

SECTION 2: PROPOSALS & PRICING (Prompts 7–11)
  7. Project Proposal | 8. Custom Quote Breakdown | 9. Value-Based Pricing
  10. Retainer Offer | 11. Package Tier Designer

SECTION 3: PROJECT MANAGEMENT (Prompts 12–16)
  12. Kickoff Email | 13. Scope Creep Response | 14. Progress Update
  15. Delay/Extension Request | 16. Wrap-Up + Upsell

SECTION 4: FINANCE & ADMIN (Prompts 17–21)
  17. Invoice Message | 18. Payment Reminder Day 1 | 19. Payment Reminder Day 7
  20. Payment Reminder Day 14 | 21. Rate Increase Announcement

SECTION 5: GROWTH (Prompts 22–25)
  22. Niche Positioning | 23. LinkedIn Profile Rewrite | 24. Thought Leadership Post
  25. Service Productization Roadmap

BONUS: Freelancer Red Flag Checklist (10 client warning signs)
```

### pb-content-002 — YouTube Script Machine (30 prompts)
```
SECTION 1: SCRIPT TEMPLATES (Prompts 1–12)
  1. Tutorial/How-To | 2. Product Review | 3. Reaction Video | 4. Story-Time Vlog
  5. Mini-Documentary | 6. Talking Head Educational | 7. Listicle/Countdown
  8. Challenge Video | 9. Collaboration Intro | 10. Channel Trailer
  11. Subscriber Milestone | 12. Q&A Compilation

SECTION 2: HOOK ENGINEERING (Prompts 13–17)
  13. Pattern Interrupt Hook | 14. Curiosity Gap Hook | 15. Controversy Hook
  16. Bold Promise Hook | 17. Story Hook (3 variants each)

SECTION 3: TITLE & THUMBNAIL (Prompts 18–23)
  18. Title Generator (10 variants) | 19. Thumbnail Headline | 20. Clickbait Balance Test
  21. A/B Title Analyzer | 22. Thumbnail Concept Brief | 23. Title SEO Optimizer

SECTION 4: CHANNEL GROWTH COPY (Prompts 24–30)
  24. Channel Description | 25. About Page | 26. Playlist Description
  27. Community Post | 28. Shorts Repurpose | 29. Shorts Native Script | 30. End Screen CTA

BONUS: Retention Map — Where viewers drop and how to fix it
```

### pb-legal-002 — HR & Hiring Toolkit (30 prompts)
```
SECTION 1: HIRING FUNNEL (Prompts 1–10)
  1. Job Description | 2. LinkedIn Sourcing Message | 3. Screening Call Script
  4. Technical Assessment | 5. Take-Home Project | 6. Reference Check Script
  7. Offer Letter | 8. Rejection Letter | 9. Hiring Decision Matrix | 10. Role Scorecard

SECTION 2: ONBOARDING (Prompts 11–16)
  11. 30/60/90 Day Plan | 12. First-Day Welcome Email | 13. Buddy Assignment
  14. Tools Access Request | 15. New Hire Team Introduction | 16. First 1-on-1 Agenda

SECTION 3: PERFORMANCE MANAGEMENT (Prompts 17–22)
  17. Quarterly Review | 18. PIP Generator | 19. Promotion Recommendation
  20. Written Warning | 21. Merit Increase Announcement | 22. OKR/SMART Goal Setting

SECTION 4: CULTURE & COMMUNICATIONS (Prompts 23–30)
  23. All-Hands Agenda | 24. Team Offsite Planning | 25. Recognition Message
  26. Departure Announcement | 27. HR Policy Explainer | 28. Conflict Mediation
  29. Salary Band Communication | 30. Return-to-Office Policy

DISCLAIMER: Templates are starting points — consult an employment lawyer.
```

### pb-saas-002 — AI Productivity Power Pack (40 prompts)
```
SECTION 1: THINKING & DECISIONS (Prompts 1–8)
  1. First Principles Deconstruction | 2. Devil's Advocate Generator
  3. Decision Framework | 4. Second-Order Consequences | 5. Pre-Mortem
  6. Opportunity Cost Evaluator | 7. Mental Model Applicator | 8. Bias Checker

SECTION 2: WRITING & COMMUNICATION (Prompts 9–16)
  9. Meeting Notes → Actions | 10. Email Triage + Draft | 11. Bullets → Report
  12. Presentation Narrative | 13. Document Summary | 14. Active Voice Rewriter
  15. Jargon Eliminator | 16. ELI5 Translator

SECTION 3: RESEARCH & LEARNING (Prompts 17–24)
  17. 5-Min Deep Dive | 18. Book/Article Extractor | 19. Skill Roadmap
  20. Industry Landscape Brief | 21. Question Generator | 22. Analogy Generator
  23. Knowledge Gap Finder | 24. Expert Perspective Simulator

SECTION 4: PROJECT & TIME (Prompts 25–32)
  25. Project Plan from Goal | 26. Meeting Agenda | 27. Status Update Writer
  28. Blocker Analyzer | 29. Delegation Message | 30. Priority Ranker
  31. 1-Page Strategy Doc | 32. Retrospective Facilitator

SECTION 5: PERSONAL EFFECTIVENESS (Prompts 33–40)
  33. Weekly Review | 34. Career Reflection | 35. Feedback Interpreter
  36. Personal Brand Audit | 37. Side Project Evaluator | 38. Networking Message
  39. Goal Cascade | 40. Energy Audit

BONUS: How to build your own Prompt Library in Notion/Obsidian
```

### pb-saas-003 — Customer Success Playbook (30 prompts)
```
SECTION 1: ONBOARDING & ACTIVATION (Prompts 1–7)
  1. Kickoff Call Agenda | 2. Implementation Plan Doc | 3. Training Session Outline
  4. Feature Adoption Email Series | 5. Milestone Announcement | 6. Power User ID Email
  7. 30-Day Check-in Script

SECTION 2: HEALTH MONITORING & RISK (Prompts 8–13)
  8. At-Risk Intervention Email | 9. Disengaged User Re-Activation
  10. Executive Sponsor Outreach | 11. Health Score Narrative | 12. Support Escalation
  13. Usage Drop Alert Response

SECTION 3: RETENTION & RENEWAL (Prompts 14–20)
  14. Renewal Conversation Script | 15. Multi-Year Justification
  16. Price Increase Communication | 17. Renewal Negotiation Points
  18. QBR Deck Outline | 19. ROI Summary Generator | 20. Renewal Objection Handler

SECTION 4: EXPANSION & UPSELL (Prompts 21–25)
  21. Upsell Discovery Script | 22. Expansion Proposal Email | 23. New Seat Introduction
  24. Feature Upgrade Pitch | 25. Referral Program Intro to Happy Customers

SECTION 5: OFFBOARDING & WIN-BACK (Prompts 26–30)
  26. Cancellation Save Script | 27. Exit Interview Email
  28. Cancellation Confirmation + Re-Engagement Window | 29. 90-Day Win-Back Campaign
  30. Loss Analysis for Product Team
```

### pb-ecom-002 — Amazon FBA Seller Kit (25 prompts)
```
SECTION 1: LISTING OPTIMIZATION (Prompts 1–8)
  1. Product Title Formula | 2. 5 Bullet Points (Buy-Trigger) | 3. HTML Product Description
  4. A+ Content Main Panel | 5. A+ Comparison Chart | 6. Backend Search Terms Strategy
  7. Variation Differentiation | 8. Bundle Listing Copy

SECTION 2: LAUNCH & RANKING (Prompts 9–13)
  9. Launch Email Sequence | 10. Vine Reviewer Invitation | 11. Seed Q&A
  12. Early Review Request | 13. Product Insert Card Copy

SECTION 3: COMPETITIVE INTELLIGENCE (Prompts 14–17)
  14. Competitor Listing SWOT | 15. Negative Review Gap Analysis
  16. Price Positioning Narrative | 17. Market Gap Identifier

SECTION 4: SELLER COMMUNICATIONS (Prompts 18–22)
  18. Customer Inquiry Response | 19. A-to-Z Claim Response | 20. Negative Review Reply
  21. Removal Request to Amazon | 22. Brand Registry Infringement Report

SECTION 5: SCALING (Prompts 23–25)
  23. Supplier Negotiation Script | 24. 3PL Evaluation Criteria | 25. PPC Ad Copy

NOTE: All prompts include Amazon TOS compliance notes.
```

### pb-ecom-003 — Dropshipping & POD Masterpack (30 prompts)
```
SECTION 1: NICHE & PRODUCT RESEARCH (Prompts 1–5)
  1. Winning Product Criteria Analyzer | 2. Niche Sub-Market Finder
  3. Trend vs Evergreen Evaluator | 4. Supplier Vetting Script | 5. Profit Margin Narrative

SECTION 2: STORE SETUP (Prompts 6–12)
  6. Homepage Hero Copy | 7. Product Page Copy | 8. About Page Trust Builder
  9. FAQ Page | 10. Shipping Policy | 11. Returns Policy | 12. Popup/Email Capture Offer

SECTION 3: ADVERTISING (Prompts 13–20)
  13. Facebook Ad (Pain Angle) | 14. Facebook Ad (Desire Angle) | 15. Facebook Ad (Social Proof)
  16. TikTok Organic Demo Script | 17. TikTok Paid 15s | 18. TikTok Paid 30s
  19. Influencer Seeding Pitch | 20. UGC Creative Brief

SECTION 4: CUSTOMER SERVICE (Prompts 21–25)
  21. WISMO Response | 22. Delayed Shipping Explanation | 23. Dispute/Chargeback Response
  24. Refund Request Handler | 25. 5-Star Review Follow-Up Ask

SECTION 5: SCALING & AUTOMATION (Prompts 26–30)
  26. Abandoned Cart Email 1 | 27. Abandoned Cart Email 2 | 28. Abandoned Cart Email 3
  29. Post-Purchase Upsell Offer | 30. Referral Invite
```

### pb-edu-002 — Student Academic Excellence Pack (25 prompts)
```
SECTION 1: WRITING (Prompts 1–8)
  1. Essay Outline Builder | 2. Thesis Statement Generator | 3. Argumentative Essay Structure
  4. Literature Review Framework | 5. Research Paper Introduction | 6. Conclusion Writer
  7. Abstract Generator | 8. Citation/Bibliography Formatter (APA/MLA/Chicago)

SECTION 2: RESEARCH & ANALYSIS (Prompts 9–13)
  9. Research Question Narrower | 10. Source Evaluation Framework
  11. Statistical Data Interpreter | 12. Counter-Argument Builder | 13. Gap in Literature Finder

SECTION 3: STUDYING & RETENTION (Prompts 14–20)
  14. Feynman Technique Explainer | 15. Spaced Repetition Schedule | 16. Exam Question Predictor
  17. Analogy Generator | 18. Active Recall Flashcard Creator | 19. Mind Map Outline
  20. 1-Page Cheat Sheet Summarizer

SECTION 4: ACADEMIC COMMUNICATION (Prompts 21–25)
  21. Professor Email (Extension/Clarification/Feedback) | 22. Peer Review Comments
  23. Group Project Task Assignment | 24. Presentation Script from Outline
  25. Thesis Defense Q&A Prep

Note: Designed to build skills, not bypass learning.
```

### pb-career-002 — LinkedIn & Personal Brand Pro (20 prompts)
```
SECTION 1: PROFILE OPTIMIZATION (Prompts 1–5)
  1. Headline Formula (5 versions) | 2. About Section Story Arc Rewrite
  3. Featured Section Curation Strategy | 4. Skills Prioritization | 5. Recommendations Request

SECTION 2: CONTENT STRATEGY (Prompts 6–12)
  6. Personal Story Post | 7. Contrarian Opinion Post | 8. Behind-the-Scenes Post
  9. Data/Insight Post | 10. Carousel Outline (10 slides) | 11. Re-share with Commentary
  12. Milestone Announcement

SECTION 3: NETWORKING & OUTREACH (Prompts 13–17)
  13. Connection Request Message | 14. Reply to Recruiter | 15. Comment Depth Response
  16. Post-IRL Meeting DM | 17. Thank-You After Informational Interview

SECTION 4: BRAND ARCHITECTURE (Prompts 18–20)
  18. Personal Brand Positioning Statement | 19. Content Pillars Definition (3-5 topics)
  20. 90-Day LinkedIn Content Calendar Outline

Includes: Algorithm notes and engagement tactics for each post type.
```

### pb-re-002 — Property Investor Playbook (25 prompts)
```
SECTION 1: DEAL ANALYSIS (Prompts 1–5)
  1. Investment Property ROI Narrative | 2. BRRRR Strategy Evaluator
  3. Short-Term Rental Income Estimator | 4. Commercial vs Residential Comparison
  5. Deal Rejection Letter to Seller

SECTION 2: FINANCING & LENDERS (Prompts 6–9)
  6. Private Lender Pitch Script | 7. Bank Loan Interview Prep
  8. Refinance Justification Memo | 9. JV Partnership Proposal

SECTION 3: TENANT MANAGEMENT (Prompts 10–15)
  10. Tenant Screening Interview Questions | 11. Welcome Letter for New Tenants
  12. Rent Increase Notice | 13. Lease Violation Warning | 14. Eviction Process Email
  15. Move-Out Inspection Checklist Request

SECTION 4: PROPERTY OPERATIONS (Prompts 16–20)
  16. Renovation Contractor Brief (Scope of Work) | 17. Property Manager Onboarding Email
  18. Maintenance Request Response | 19. Insurance Claim Documentation | 20. Utility Transfer

SECTION 5: INVESTOR NETWORK (Prompts 21–25)
  21. Real Estate Meetup Introduction | 22. Deal Sourcing Message to Wholesalers
  23. Earnest Money Offer Letter | 24. Off-Market Property Inquiry | 25. Portfolio Update for Investors
```

### pb-data-002 — Marketing Analytics Mastery (25 prompts)
```
SECTION 1: CAMPAIGN ANALYSIS (Prompts 1–7)
  1. Paid Media Performance Narrative (Google/Meta/TikTok) | 2. Email Campaign Breakdown
  3. SEO Traffic Trend Analysis | 4. Content ROI Calculator Narrative
  5. Influencer Campaign ROI | 6. Event/Webinar Funnel Analysis | 7. Affiliate Channel Review

SECTION 2: CUSTOMER METRICS (Prompts 8–12)
  8. CAC Calculation & Benchmarking | 9. LTV Model Explanation
  10. Payback Period Analysis | 11. Retention Curve Interpretation | 12. NPS Segmentation

SECTION 3: ATTRIBUTION & FUNNEL (Prompts 13–17)
  13. Multi-Touch Attribution Comparison | 14. Funnel Drop-Off Root Cause
  15. UTM Strategy Brief | 16. Dark Social Explanation for Stakeholders
  17. Cross-Channel Customer Journey Map

SECTION 4: A/B TESTING (Prompts 18–21)
  18. Statistical Significance Explainer | 19. Winning Variant Write-Up
  20. Multivariate Test Design Brief | 21. Inconclusive Result Action Plan

SECTION 5: REPORTING (Prompts 22–25)
  22. Weekly Marketing Dashboard Commentary | 23. Monthly CMO Report Narrative
  24. Board-Level Metrics Summary | 25. Marketing QBR Presentation Outline
```

### pb-copy-005 — Brand Voice & Storytelling Kit (20 prompts)
```
SECTION 1: BRAND FOUNDATION (Prompts 1–6)
  1. Brand Voice Definition (4 traits + do/don't) | 2. Tone-of-Voice Spectrum
  3. Brand Values Statement (with behaviors) | 4. Brand Archetype Analysis
  5. Messaging Hierarchy | 6. Key Message Architecture (30s/3min/10min)

SECTION 2: STORYTELLING ASSETS (Prompts 7–13)
  7. Founder Origin Story | 8. Brand Origin Story
  9. Customer Hero Story Framework | 10. Brand Manifesto
  11. Villain Narrative (What You Stand Against) | 12. Brand Future Vision Story
  13. About Us Page Rewrite

SECTION 3: CAMPAIGN-LEVEL COPY (Prompts 14–20)
  14. Tagline Generator (10 options, 3 directions) | 15. Campaign Theme Naming
  16. Launch Announcement | 17. Product Naming Brief | 18. Brand Book Introduction
  19. Company Culture Page | 20. Brand Partnership Announcement
```

### pb-biz-004 — Meeting & Presentation Mastery (25 prompts)
```
SECTION 1: MEETING DESIGN (Prompts 1–7)
  1. Executive Agenda + Pre-Read | 2. Decision-Only Meeting Framework
  3. Brainstorm Facilitation Script | 4. Difficult Conversation Prep
  5. Project Status Template | 6. Retrospective Design | 7. Skip-Level Agenda

SECTION 2: PRESENTATION BUILDING (Prompts 8–15)
  8. Minto Pyramid Structure | 9. Problem-Solution-Benefit Narrative
  10. Data Presentation Story Arc | 11. Change Management Pitch Deck
  12. Budget Approval Presentation | 13. New Initiative Proposal
  14. Workshop Session Design | 15. Keynote Outline (External Audiences)

SECTION 3: MEETING COMMUNICATIONS (Prompts 16–20)
  16. Pre-Meeting Briefing Document | 17. Meeting Notes to Stakeholders
  18. Action Items Ownership Email | 19. Decision Documentation Record
  20. Escalation to Leadership Email

SECTION 4: FACILITATION & INFLUENCE (Prompts 21–25)
  21. Consensus Building Script | 22. Handling Objections in a Meeting
  23. Conflict De-Escalation Language | 24. Buy-In Builder for Skeptics
  25. Closing a Meeting with Clear Commitments
```

### pb-content-003 — Podcast & Newsletter Engine (30 prompts)
```
SECTION 1: PODCAST PRODUCTION (Prompts 1–10)
  1. Solo Episode Script | 2. Interview Guest Prep Kit (10 questions)
  3. Intro/Outro Script Writer | 4. Episode Title + SEO Description
  5. Show Notes from Transcript Bullets | 6. Listener Q&A Episode Structure
  7. Miniseries Arc Planner | 8. Mid-Roll Ad Read Script
  9. Social Teaser (30s clip caption) | 10. Season Premiere Announcement

SECTION 2: NEWSLETTER WRITING (Prompts 11–22)
  11. Newsletter Issue Framework (Hook→Story→Lesson→CTA)
  12. Subject Line Generator (10 options) | 13. Preview Text Optimizer
  14. Welcome Email | 15. Re-Engagement Campaign (3 emails)
  16. Referral Announcement | 17. Paid Tier Upgrade Pitch
  18. Curated Links + Commentary | 19. Reader Survey Email
  20. Controversial Opinion Issue | 21. Roundup Issue (5 links)
  22. Milestone Issue

SECTION 3: GROWTH & DISTRIBUTION (Prompts 23–30)
  23. Podcast Guesting Pitch | 24. Cross-Newsletter Swap Pitch
  25. Spotify/Apple Description | 26. Podcast Website Homepage Copy
  27. Newsletter Landing Page | 28. Social Clip Caption (episode promo)
  29. Substack/Beehiiv Bio | 30. Listener Review Request

BONUS: 1 Episode → 8 Content Pieces Repurposing Workflow
```

---

## 🧪 Full QA Checklist

### Database
- [ ] All 28 playbooks present with is_active = 1
- [ ] All 7 bundles present with correct playbook_ids
- [ ] Featured count = 10 (check with SQL below)
- [ ] No duplicate slugs

```sql
-- Run these to verify everything is correct:
SELECT COUNT(*) as total FROM playbooks WHERE is_active = 1;
-- Expected: 28

SELECT COUNT(*) as featured FROM playbooks WHERE is_featured = 1 AND is_active = 1;
-- Expected: ~10

SELECT id, name, price_usd, original_price, badge FROM playbook_bundles ORDER BY id;
-- Expected: 7 bundles

SELECT category_id, COUNT(*) as count FROM playbooks GROUP BY category_id ORDER BY category_id;
-- Expected: all 10 categories have at least 1 playbook
```

### Frontend
- [ ] `/playbooks` — 28 cards visible in grid
- [ ] `/playbooks?category=copywriting` — 5 cards (copy-001 to 005)
- [ ] `/playbooks?category=ecommerce` — 3 cards
- [ ] `/playbooks?category=saas-startup` — 3 cards
- [ ] Category filter shows all 10 categories
- [ ] Badge labels render correctly (NEW, POPULAR, BEST SELLER, HIGH VALUE)
- [ ] Featured cards appear in landing page /#playbooks section

### Purchase Flow
- [ ] Stripe test purchase on 1 new playbook from each migration
- [ ] `/portal` → Playbooks tab → download button appears post-purchase
- [ ] R2 download URL works and returns PDF

### Admin Panel
- [ ] `/admin/playbooks` — all 28 rows visible
- [ ] File status shows "⬆️ Upload needed" for rows without PDF
- [ ] After upload, status shows "✅ Uploaded"
- [ ] Edit, disable, and price-update functions work

### AutoPost
- [ ] `/admin/autopost` → template library shows play001–play026 (26 playbook templates total)
- [ ] Templates filter by language (en/id) works
- [ ] Templates filter by platform works
- [ ] Scheduled posts use new templates in rotation

---

## 📣 AutoPost Templates Added (play001–play026)

| ID | Title | Language | Platforms |
|----|-------|----------|-----------|
| play001 | Playbooks Launch | EN | facebook, linkedin, twitter |
| play002 | Sales Copy Pack Promo | EN | facebook, instagram, linkedin |
| play003 | Legal Vault Promo | EN | linkedin, facebook |
| play004 | Mega Bundle Promo (old) | EN | all |
| play005 | Playbooks ID Promo | ID | facebook, instagram |
| play006 | Cold Outreach Masterclass | EN | linkedin, twitter, facebook |
| play007 | Freelancer Kit | EN | instagram, linkedin, twitter |
| play008 | YouTube Script Machine | EN | youtube, instagram, twitter |
| play009 | HR Hiring Toolkit | EN | linkedin, facebook |
| play010 | AI Productivity Pack EN | EN | all |
| play011 | AI Productivity Pack ID | ID | facebook, instagram |
| play012 | Growth Machine Bundle | EN | facebook, linkedin, instagram |
| play013 | Customer Success Playbook | EN | linkedin, facebook, twitter |
| play014 | Amazon FBA Seller Kit | EN | facebook, instagram, linkedin |
| play015 | Dropshipping & POD | EN | facebook, instagram, tiktok |
| play016 | Student Academic Pack EN | EN | instagram, twitter, facebook |
| play017 | Student Pack ID | ID | instagram, facebook |
| play018 | LinkedIn Brand Pro | EN | linkedin, twitter |
| play019 | Property Investor Playbook | EN | facebook, linkedin, instagram |
| play020 | Marketing Analytics | EN | linkedin, twitter, facebook |
| play021 | Brand Voice Kit | EN | linkedin, instagram, facebook |
| play022 | Meeting Presentation | EN | linkedin, facebook, twitter |
| play023 | Podcast & Newsletter | EN | instagram, twitter, linkedin, facebook |
| play024 | E-Commerce Empire Bundle | EN | facebook, instagram, linkedin |
| play025 | Mega Bundle Updated EN | EN | all platforms |
| play026 | Mega Bundle Updated ID | ID | facebook, instagram |
