-- ==============================================================================
-- Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Author & Architect: Yusron Efendi <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- Migration 0009: AXTO Playbooks — Digital Product Marketplace
-- Stores playbook metadata in D1, files in R2 bucket
-- ============================================================

-- Playbook categories
CREATE TABLE IF NOT EXISTS playbook_categories (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT '📄',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO playbook_categories (id, slug, name, description, icon, sort_order) VALUES
  ('pc01','copywriting','Copywriting & Marketing','Sales pages, email sequences, ad copy, social media scripts','✍️',1),
  ('pc02','business','Business & Strategy','Business plans, pitch decks, SOPs, proposals, company profiles','💼',2),
  ('pc03','content','Content Creation','Blog posts, YouTube scripts, newsletters, LinkedIn posts','📝',3),
  ('pc04','legal-hr','Legal & HR','Contracts, NDAs, policies, employment agreements, termination letters','⚖️',4),
  ('pc05','ecommerce','E-Commerce & Sales','Product descriptions, store copy, customer service templates','🛒',5),
  ('pc06','saas-startup','SaaS & Startup','User personas, feature specs, onboarding flows, investor updates','🚀',6),
  ('pc07','education','Education & Training','Course curriculum, lesson plans, quiz generators, feedback templates','🎓',7),
  ('pc08','career','Resume & Career','CV rewriters, cover letters, interview prep, LinkedIn optimizers','👔',8),
  ('pc09','real-estate','Real Estate','Listing descriptions, buyer/seller emails, property comparisons','🏠',9),
  ('pc10','data-analytics','Data & Analytics','Data analysis prompts, SQL generators, report summarizers','📊',10);

-- Individual playbook items
CREATE TABLE IF NOT EXISTS playbooks (
  id              TEXT PRIMARY KEY,
  category_id     TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  subtitle        TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  long_description TEXT NOT NULL DEFAULT '',
  price_usd       REAL NOT NULL DEFAULT 0,
  original_price  REAL NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',
  
  -- Content
  prompt_count    INTEGER NOT NULL DEFAULT 1,
  file_format     TEXT NOT NULL DEFAULT 'pdf',
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  r2_key          TEXT NOT NULL DEFAULT '',
  preview_text    TEXT NOT NULL DEFAULT '',
  
  -- Display
  icon            TEXT NOT NULL DEFAULT '📄',
  badge           TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT NOT NULL DEFAULT '',
  
  -- Metadata
  compatible_with TEXT NOT NULL DEFAULT '["chatgpt","claude","gemini"]',
  language        TEXT NOT NULL DEFAULT 'en',
  version         TEXT NOT NULL DEFAULT '1.0',
  tags            TEXT NOT NULL DEFAULT '[]',
  
  -- Stats
  download_count  INTEGER NOT NULL DEFAULT 0,
  rating_avg      REAL NOT NULL DEFAULT 0,
  rating_count    INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  is_featured     INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES playbook_categories(id)
);
CREATE INDEX IF NOT EXISTS idx_pb_category ON playbooks(category_id);
CREATE INDEX IF NOT EXISTS idx_pb_slug ON playbooks(slug);
CREATE INDEX IF NOT EXISTS idx_pb_active ON playbooks(is_active, is_featured, sort_order);

-- Playbook bundles (multiple playbooks sold as pack)
CREATE TABLE IF NOT EXISTS playbook_bundles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  price_usd       REAL NOT NULL DEFAULT 0,
  original_price  REAL NOT NULL DEFAULT 0,
  playbook_ids    TEXT NOT NULL DEFAULT '[]',
  badge           TEXT NOT NULL DEFAULT '',
  is_featured     INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Purchases (links client to purchased playbooks)
CREATE TABLE IF NOT EXISTS playbook_purchases (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL DEFAULT '',
  client_email    TEXT NOT NULL,
  playbook_id     TEXT,
  bundle_id       TEXT,
  amount_usd      REAL NOT NULL DEFAULT 0,
  gateway         TEXT NOT NULL DEFAULT 'stripe',
  payment_ref     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','refunded')),
  download_count  INTEGER NOT NULL DEFAULT 0,
  max_downloads   INTEGER NOT NULL DEFAULT 10,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pbp_email ON playbook_purchases(client_email);
CREATE INDEX IF NOT EXISTS idx_pbp_playbook ON playbook_purchases(playbook_id);
CREATE INDEX IF NOT EXISTS idx_pbp_ref ON playbook_purchases(payment_ref);

-- Reviews
CREATE TABLE IF NOT EXISTS playbook_reviews (
  id           TEXT PRIMARY KEY,
  playbook_id  TEXT NOT NULL,
  client_email TEXT NOT NULL,
  rating       INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment      TEXT NOT NULL DEFAULT '',
  is_approved  INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (playbook_id) REFERENCES playbooks(id)
);
CREATE INDEX IF NOT EXISTS idx_pbr_playbook ON playbook_reviews(playbook_id);

-- ============================================================
-- Seed: 48 Playbook Products
-- ============================================================
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-1','pc06','ai-productivity-power-pack','AI Productivity Power Pack',24,35,40,'🚀','POPULAR','["chatgpt","claude","gemini"]','en',1,1,'playbooks/ai-productivity-power-pack.pdf',47088,'pdf',1,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-2','pc09','airbnb-short-term-rental-kit','Airbnb & Short-Term Rental Kit',19,30,25,'🏠','NEW','["chatgpt","claude","gemini"]','en',0,1,'playbooks/airbnb-short-term-rental-kit.pdf',32776,'pdf',2,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-3','pc05','amazon-fba-seller-kit','Amazon FBA Seller Kit',24,35,25,'🛒','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/amazon-fba-seller-kit.pdf',32717,'pdf',3,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-4','pc06','api-developer-marketing-kit','API & Developer Marketing Kit',24,35,20,'🚀','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/api-developer-marketing-kit.pdf',26199,'pdf',4,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-5','pc01','brand-voice-storytelling-kit','Brand Voice & Storytelling Kit',29,45,20,'✍️','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/brand-voice-storytelling-kit.pdf',23398,'pdf',5,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-6','pc10','business-intelligence-reporting-kit','Business Intelligence & Reporting Kit',24,35,25,'📊','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/business-intelligence-reporting-kit.pdf',32847,'pdf',6,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-7','pc08','career-accelerator-pack','Career Accelerator Pack',19,30,30,'👔','POPULAR','["chatgpt","claude","gemini"]','en',1,1,'playbooks/career-accelerator-pack.pdf',36881,'pdf',7,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-8','pc01','cold-dm-outreach-masterclass','Cold DM & Outreach Masterclass',24,35,35,'✍️','NEW','["chatgpt","claude","gemini"]','en',0,1,'playbooks/cold-dm-outreach-masterclass.pdf',34651,'pdf',8,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-9','pc09','commercial-real-estate-kit','Commercial Real Estate Kit',24,35,20,'🏠','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/commercial-real-estate-kit.pdf',26089,'pdf',9,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-10','pc04','compliance-policy-generator','Compliance & Policy Generator',29,45,25,'⚖️','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/compliance-policy-generator.pdf',32940,'pdf',10,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-11','pc02','consulting-advisory-kit','Consulting & Advisory Kit',29,45,25,'💼','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/consulting-advisory-kit.pdf',32145,'pdf',11,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-12','pc07','corporate-training-ld-kit','Corporate Training & L&D Kit',24,35,25,'🎓','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/corporate-training-ld-kit.pdf',32901,'pdf',12,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-13','pc07','course-creator-blueprint','Course Creator Blueprint',19,30,20,'🎓','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/course-creator-blueprint.pdf',26117,'pdf',13,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-14','pc06','customer-success-playbook','Customer Success Playbook',24,35,30,'🚀','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/customer-success-playbook.pdf',36548,'pdf',14,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-15','pc10','data-analyst-toolkit','Data Analyst Toolkit',19,30,25,'📊','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/data-analyst-toolkit.pdf',32493,'pdf',15,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-16','pc05','dropshipping-pod-masterpack','Dropshipping & POD Masterpack',19,30,30,'🛒','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/dropshipping-pod-masterpack.pdf',37377,'pdf',16,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-17','pc05','ecommerce-conversion-kit','E-Commerce Conversion Kit',24,35,45,'🛒','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/ecommerce-conversion-kit.pdf',52949,'pdf',17,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-18','pc01','email-sequence-machine','Email Sequence Machine',24,35,71,'✍️','','["chatgpt","claude","gemini"]','en',1,1,'playbooks/email-sequence-machine.pdf',74394,'pdf',18,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-19','pc05','etsy-handmade-seller-kit','Etsy & Handmade Seller Kit',19,30,25,'🛒','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/etsy-handmade-seller-kit.pdf',32946,'pdf',19,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-20','pc08','executive-leadership-pack','Executive Leadership Pack',29,45,25,'👔','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/executive-leadership-pack.pdf',32542,'pdf',20,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-21','pc10','financial-modeling-forecasting-kit','Financial Modeling & Forecasting Kit',24,35,20,'📊','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/financial-modeling-forecasting-kit.pdf',26399,'pdf',21,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-22','pc02','freelancer-business-kit','Freelancer Business Kit',19,30,25,'💼','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/freelancer-business-kit.pdf',31942,'pdf',22,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-23','pc04','hr-hiring-toolkit','HR & Hiring Toolkit',24,35,30,'⚖️','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/hr-hiring-toolkit.pdf',37036,'pdf',23,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-24','pc07','language-learning-tutor-kit','Language Learning & Tutor Kit',14,20,20,'🎓','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/language-learning-tutor-kit.pdf',26161,'pdf',24,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-25','pc04','legal-document-vault','Legal Document Vault',39,60,30,'⚖️','HIGH VALUE','["chatgpt","claude","gemini"]','en',1,1,'playbooks/legal-document-vault.pdf',37080,'pdf',25,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-26','pc03','linkedin-article-newsletter-pro','LinkedIn Article & Newsletter Pro',19,30,20,'📝','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/linkedin-article-newsletter-pro.pdf',26567,'pdf',26,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-27','pc08','linkedin-personal-brand-pro','LinkedIn & Personal Brand Pro',19,30,20,'👔','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/linkedin-personal-brand-pro.pdf',26471,'pdf',27,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-28','pc10','marketing-analytics-mastery','Marketing Analytics Mastery',24,35,25,'📊','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/marketing-analytics-mastery.pdf',32496,'pdf',28,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-29','pc02','meeting-presentation-mastery','Meeting & Presentation Mastery',19,30,25,'💼','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/meeting-presentation-mastery.pdf',33079,'pdf',29,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-30','pc02','negotiation-deals-mastery','Negotiation & Deals Mastery',19,30,20,'💼','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/negotiation-deals-mastery.pdf',26273,'pdf',30,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-31','pc03','podcast-newsletter-engine','Podcast & Newsletter Engine',19,30,30,'📝','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/podcast-newsletter-engine.pdf',37291,'pdf',31,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-32','pc01','pr-media-kit-builder','PR & Media Kit Builder',19,30,20,'✍️','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/pr-media-kit-builder.pdf',25801,'pdf',32,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-33','pc06','product-hunt-app-launch-kit','Product Hunt & App Launch Kit',19,30,20,'🚀','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/product-hunt-app-launch-kit.pdf',26425,'pdf',33,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-34','pc09','property-investor-playbook','Property Investor Playbook',24,35,25,'🏠','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/property-investor-playbook.pdf',32585,'pdf',34,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-35','pc09','real-estate-agent-kit','Real Estate Agent Kit',24,35,25,'🏠','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/real-estate-agent-kit.pdf',32117,'pdf',35,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-36','pc08','remote-job-hunter-kit','Remote & Freelance Job Hunter Kit',14,20,20,'👔','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/remote-job-hunter-kit.pdf',26559,'pdf',36,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-37','pc02','restaurant-food-business-kit','Restaurant & Food Business Kit',19,30,25,'💼','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/restaurant-food-business-kit.pdf',32583,'pdf',37,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-38','pc06','saas-growth-playbook','SaaS Growth Playbook',29,45,35,'🚀','','["chatgpt","claude","gemini"]','en',1,1,'playbooks/saas-growth-playbook.pdf',36849,'pdf',38,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-39','pc03','seo-blog-machine','SEO Blog Machine',19,30,20,'📝','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/seo-blog-machine.pdf',22570,'pdf',39,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-40','pc01','social-media-content-engine','Social Media Content Engine',19,30,90,'✍️','POPULAR','["chatgpt","claude","gemini"]','en',1,1,'playbooks/social-media-content-engine.pdf',93859,'pdf',40,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-41','pc02','sop-template-factory','SOP Template Factory',19,30,25,'💼','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/sop-template-factory.pdf',28844,'pdf',41,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-42','pc02','startup-launch-playbook','Startup Launch Playbook',34,50,40,'💼','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/startup-launch-playbook.pdf',46062,'pdf',42,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-43','pc07','student-academic-excellence-pack','Student Academic Excellence Pack',14,20,25,'🎓','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/student-academic-excellence-pack.pdf',32295,'pdf',43,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-44','pc03','tiktok-content-machine','TikTok Content Machine',19,30,30,'📝','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/tiktok-content-machine.pdf',36871,'pdf',44,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-45','pc01','ultimate-sales-copy-pack','Ultimate Sales Copy Pack',29,45,50,'✍️','BEST SELLER','["chatgpt","claude","gemini"]','en',1,1,'playbooks/ultimate-sales-copy-pack.pdf',53887,'pdf',45,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-46','pc01','video-sales-letter-pack','Video Sales Letter (VSL) Pack',34,50,15,'✍️','HIGH VALUE','["chatgpt","claude","gemini"]','en',1,1,'playbooks/video-sales-letter-pack.pdf',19488,'pdf',46,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-47','pc01','wellness-coach-fitness-biz-kit','Wellness Coach & Fitness Business Kit',19,30,25,'✍️','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/wellness-coach-fitness-biz-kit.pdf',29403,'pdf',47,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbooks (id, category_id, slug, name, price_usd, original_price, prompt_count, icon, badge, compatible_with, language, is_featured, is_active, r2_key, file_size_bytes, file_format, sort_order, created_at, updated_at) VALUES ('pb-48','pc03','youtube-script-machine','YouTube Script Machine',19,30,30,'📝','','["chatgpt","claude","gemini"]','en',0,1,'playbooks/youtube-script-machine.pdf',36890,'pdf',48,datetime('now'),datetime('now'));

-- Count: 48 playbook products

-- ============================================================
-- Seed: Playbook Bundles
-- ============================================================
INSERT OR IGNORE INTO playbook_bundles (id, slug, name, description, price_usd, original_price, playbook_ids, badge, is_featured, is_active, sort_order, created_at, updated_at) VALUES ('bundle-mega','mega-bundle-all-access','Mega Bundle — All Access','Every playbook in our catalog. 400+ prompts. Lifetime access.',99,290,'["pb-1","pb-2","pb-3","pb-4","pb-5","pb-6","pb-7","pb-8","pb-9","pb-10","pb-11","pb-12","pb-13","pb-14","pb-15","pb-16","pb-17","pb-18","pb-19","pb-20","pb-21","pb-22","pb-23","pb-24","pb-25","pb-26","pb-27","pb-28","pb-29","pb-30","pb-31","pb-32","pb-33","pb-34","pb-35","pb-36","pb-37","pb-38","pb-39","pb-40","pb-41","pb-42","pb-43","pb-44","pb-45","pb-46","pb-47","pb-48"]','BEST VALUE',1,1,1,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbook_bundles (id, slug, name, description, price_usd, original_price, playbook_ids, badge, is_featured, is_active, sort_order, created_at, updated_at) VALUES ('bundle-biz','business-starter-bundle','Business Starter Bundle','Startup Playbook + SOP Factory + Legal Vault',59,92,'["pb-9","pb-10","pb-21"]','SAVE 36%',1,1,2,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO playbook_bundles (id, slug, name, description, price_usd, original_price, playbook_ids, badge, is_featured, is_active, sort_order, created_at, updated_at) VALUES ('bundle-creator','content-creator-bundle','Content Creator Bundle','Sales Copy + Social Media + SEO Blog Machine',49,67,'["pb-1","pb-3","pb-16"]','SAVE 27%',0,1,3,datetime('now'),datetime('now'));
