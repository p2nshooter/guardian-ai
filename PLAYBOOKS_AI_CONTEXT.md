# AXTO Playbooks — AI Context (BACA INI SEBELUM APAPUN)
> **Dokumen ini wajib dibaca AI sebelum menyentuh apapun di project ini.**
> Semua keputusan arsitektur, struktur file, dan status pekerjaan ada di sini.

---

## INSTRUKSI UTAMA UNTUK AI BERIKUTNYA

```
JANGAN buat kategori baru.
JANGAN buat migration SQL baru untuk playbook.
JANGAN ubah catalog.ts.
JANGAN ubah templates.ts.

TUGAS SEKARANG: Buat file PDF NYATA untuk setiap playbook.
48 PDF. Isi prompt lengkap. Siap dijual ke customer.
```

Status saat ini:
- DONE: Database schema (0009_playbooks.sql)
- DONE: 48 playbook metadata di catalog.ts
- DONE: SQL migrations 0009 sampai 0012
- DONE: 42 autopost social media templates
- DONE: axto-deploy-windows.exe tool
- DONE: .env.example + PANDUAN-SETUP-ENV.pdf
- DONE: .gitignore sudah exclude pdf, .env, dist/
- TODO: 48 file PDF isi prompt — INI TUGASMU

---

## 1. Konsep AXTO Playbooks

AXTO Playbooks adalah marketplace digital produk berisi koleksi AI prompt
yang dikemas sebagai PDF dan dijual ke customer.

Flow deploy:
1. Owner buat PDF (isi prompt)
2. Double-click axto-deploy-windows.exe
3. SQL masuk Cloudflare D1 (metadata)
4. PDF masuk Cloudflare R2 (file)
5. Website otomatis sinkron — tampil di admin, landing page, portal client

Flow pembelian customer:
1. Customer buka /playbooks
2. Pilih playbook, bayar (Stripe/PayPal)
3. Login ke /portal, tab Playbooks
4. Klik Download — PDF dari R2 terdelivery

---

## 2. Struktur File — WAJIB DIPATUHI

guardian-ai/
  dashboard/
    app/
      playbooks/page.tsx        <- Katalog publik
      portal/page.tsx           <- Dashboard client (download)
      admin/playbooks/page.tsx  <- CRUD admin
      api/playbooks/            <- GET catalog, POST checkout
      api/playbooks/download/   <- Deliver PDF dari R2
      api/admin/playbooks/      <- CRUD + upload endpoint
    lib/
      playbooks/catalog.ts      <- DONE: 48 playbook definitions
      autopost/templates.ts     <- DONE: 42 promo templates
    cf-migrations/
      0009_playbooks.sql        <- DONE: schema tables
      0010_new_playbooks.sql    <- DONE: batch 1
      0011_more_playbooks.sql   <- DONE: batch 2
      0012_playbooks_batch3.sql <- DONE: batch 3 + bundles

  axto-uploader/
    src/uploader.js             <- DONE: D1 + R2 deploy script
    package.json
    build-exe.bat               <- Build .exe di Windows
    .env.example
    PANDUAN-SETUP-ENV.pdf       <- Panduan visual credentials

  playbooks-pdf/                <- FOLDER INI KOSONG - HARUS DIISI
    BACA-INI.txt
    [48 PDF BELUM ADA]

  .env                          <- TIDAK masuk GitHub
  .gitignore                    <- Exclude .env, playbooks-pdf/, dist/
  PLAYBOOKS_AI_CONTEXT.md       <- File ini

ATURAN LOKASI FILE:
- File PDF: playbooks-pdf/ saja (TIDAK ke dashboard, TIDAK ke repo code)
- PDF tidak masuk GitHub (sudah di .gitignore)
- Nama file PDF harus = slug playbook + .pdf

---

## 3. Database Schema D1

playbooks table:
  id           TEXT PK      -- "pb-copy-001"
  category_id  TEXT FK      -- "pc01"
  slug         TEXT UNIQUE  -- "ultimate-sales-copy-pack"
  name         TEXT
  price_usd    REAL
  prompt_count INTEGER
  r2_key       TEXT         -- "playbooks/{slug}.pdf"
  is_featured  INTEGER      -- 1 = tampil di landing page
  is_active    INTEGER      -- 1 = bisa dibeli
  badge        TEXT         -- "NEW", "POPULAR", "BEST SELLER"

R2 Storage:
  Bucket: axto-storage
  Path:   playbooks/{slug}.pdf
  Contoh: playbooks/ultimate-sales-copy-pack.pdf

---

## 4. Kategori Sudah Ada (JANGAN tambah lagi)

pc01 copywriting    Copywriting & Marketing
pc02 business       Business & Strategy
pc03 content        Content Creation
pc04 legal-hr       Legal & HR
pc05 ecommerce      E-Commerce & Sales
pc06 saas-startup   SaaS & Startup
pc07 education      Education & Training
pc08 career         Resume & Career
pc09 real-estate    Real Estate
pc10 data-analytics Data & Analytics

---

## 5. 48 Playbooks yang Harus Dibuat PDF-nya

Format: ID | slug (= nama file .pdf) | Nama | Prompts | Harga

COPYWRITING & MARKETING (8):
pb-copy-001 | ultimate-sales-copy-pack            | Ultimate Sales Copy Pack              | 50 | $29
pb-copy-002 | email-sequence-machine              | Email Sequence Machine                | 71 | $24
pb-copy-003 | social-media-content-engine         | Social Media Content Engine           | 90 | $19
pb-copy-004 | cold-dm-outreach-masterclass        | Cold DM & Outreach Masterclass        | 35 | $24
pb-copy-005 | brand-voice-storytelling-kit        | Brand Voice & Storytelling Kit        | 20 | $29
pb-copy-006 | pr-media-kit-builder                | PR & Media Kit Builder                | 20 | $19
pb-copy-007 | video-sales-letter-pack             | Video Sales Letter (VSL) Pack         | 15 | $34
pb-copy-008 | wellness-coach-fitness-biz-kit      | Wellness Coach & Fitness Business Kit | 25 | $19

BUSINESS & STRATEGY (7):
pb-biz-001  | startup-launch-playbook             | Startup Launch Playbook               | 40 | $34
pb-biz-002  | sop-template-factory                | SOP Template Factory                  | 25 | $19
pb-biz-003  | freelancer-business-kit             | Freelancer Business Kit               | 25 | $19
pb-biz-004  | meeting-presentation-mastery        | Meeting & Presentation Mastery        | 25 | $19
pb-biz-005  | consulting-advisory-kit             | Consulting & Advisory Kit             | 25 | $29
pb-biz-006  | negotiation-deals-mastery           | Negotiation & Deals Mastery           | 20 | $19
pb-biz-007  | restaurant-food-business-kit        | Restaurant & Food Business Kit        | 25 | $19

CONTENT CREATION (5):
pb-content-001 | seo-blog-machine                | SEO Blog Machine                      | 20 | $19
pb-content-002 | youtube-script-machine          | YouTube Script Machine                | 30 | $19
pb-content-003 | podcast-newsletter-engine       | Podcast & Newsletter Engine           | 30 | $19
pb-content-004 | tiktok-content-machine          | TikTok Content Machine                | 30 | $19
pb-content-005 | linkedin-article-newsletter-pro | LinkedIn Article & Newsletter Pro     | 20 | $19

LEGAL & HR (3):
pb-legal-001 | legal-document-vault              | Legal Document Vault                  | 30 | $39
pb-legal-002 | hr-hiring-toolkit                 | HR & Hiring Toolkit                   | 30 | $24
pb-legal-003 | compliance-policy-generator       | Compliance & Policy Generator         | 25 | $29

E-COMMERCE & SALES (4):
pb-ecom-001 | ecommerce-conversion-kit           | E-Commerce Conversion Kit             | 45 | $24
pb-ecom-002 | amazon-fba-seller-kit              | Amazon FBA Seller Kit                 | 25 | $24
pb-ecom-003 | dropshipping-pod-masterpack        | Dropshipping & POD Masterpack         | 30 | $19
pb-ecom-004 | etsy-handmade-seller-kit           | Etsy & Handmade Seller Kit            | 25 | $19

SAAS & STARTUP (5):
pb-saas-001 | saas-growth-playbook               | SaaS Growth Playbook                  | 35 | $29
pb-saas-002 | ai-productivity-power-pack         | AI Productivity Power Pack            | 40 | $24
pb-saas-003 | customer-success-playbook          | Customer Success Playbook             | 30 | $24
pb-saas-004 | product-hunt-app-launch-kit        | Product Hunt & App Launch Kit         | 20 | $19
pb-saas-005 | api-developer-marketing-kit        | API & Developer Marketing Kit         | 20 | $24

EDUCATION & TRAINING (4):
pb-edu-001 | course-creator-blueprint            | Course Creator Blueprint              | 20 | $19
pb-edu-002 | student-academic-excellence-pack    | Student Academic Excellence Pack      | 25 | $14
pb-edu-003 | corporate-training-ld-kit           | Corporate Training & L&D Kit         | 25 | $24
pb-edu-004 | language-learning-tutor-kit         | Language Learning & Tutor Kit         | 20 | $14

RESUME & CAREER (4):
pb-career-001 | career-accelerator-pack          | Career Accelerator Pack               | 30 | $19
pb-career-002 | linkedin-personal-brand-pro      | LinkedIn & Personal Brand Pro         | 20 | $19
pb-career-003 | executive-leadership-pack        | Executive Leadership Pack             | 25 | $29
pb-career-004 | remote-job-hunter-kit            | Remote & Freelance Job Hunter Kit     | 20 | $14

REAL ESTATE (4):
pb-re-001 | real-estate-agent-kit               | Real Estate Agent Kit                 | 25 | $24
pb-re-002 | property-investor-playbook          | Property Investor Playbook            | 25 | $24
pb-re-003 | airbnb-short-term-rental-kit        | Airbnb & Short-Term Rental Kit        | 25 | $19
pb-re-004 | commercial-real-estate-kit          | Commercial Real Estate Kit            | 20 | $24

DATA & ANALYTICS (4):
pb-data-001 | data-analyst-toolkit               | Data Analyst Toolkit                  | 25 | $19
pb-data-002 | marketing-analytics-mastery        | Marketing Analytics Mastery           | 25 | $24
pb-data-003 | business-intelligence-reporting-kit| Business Intelligence & Reporting Kit | 25 | $24
pb-data-004 | financial-modeling-forecasting-kit | Financial Modeling & Forecasting Kit  | 20 | $24

---

## 6. Standar PDF yang Harus Dibuat

STRUKTUR SETIAP PDF:
  Halaman 1 = Cover
    - Nama playbook (besar, bold)
    - Subtitle/tagline
    - "AXTO Playbooks" branding
    - Jumlah prompt + kategori
    - Compatible: ChatGPT, Claude, Gemini

  Halaman 2 = Table of Contents
    - Daftar semua prompt dengan nomor
    - Dikelompokkan per section

  Halaman 3 sampai N = Isi Prompt
    Setiap prompt WAJIB punya:
    - Nomor dan nama prompt
    - Tujuan (satu kalimat)
    - Kotak prompt (teks lengkap dengan [PLACEHOLDER])
    - Cara pakai: penjelasan setiap [PLACEHOLDER]
    - Tips penggunaan
    - Label: ChatGPT / Claude / Gemini

  Halaman Terakhir = Bonus & CTA
    - Bonus section jika ada
    - "Temukan lebih banyak di axto.io/playbooks"

ATURAN PENULISAN PROMPT:
  1. Harus bisa langsung di-copy-paste ke ChatGPT/Claude/Gemini
  2. Gunakan [PLACEHOLDER] dengan huruf kapital dalam kurung kotak
  3. Sertakan role-playing: "You are a [ROLE]..."
  4. Tentukan output format yang spesifik
  5. Tulis dalam Bahasa Inggris

NAMING FILE:
  BENAR:  ultimate-sales-copy-pack.pdf   (= slug persis)
  SALAH:  Ultimate Sales Copy Pack.pdf
  SALAH:  ultimate_sales_copy_pack.pdf
  SALAH:  pb-copy-001.pdf

---

## 7. Cara Membuat PDF dengan Python

Gunakan Python + ReportLab (sudah tersedia).
Output ke /mnt/user-data/outputs/ lalu user download.

Warna brand AXTO:
  AXTO_BLUE   = #1E40AF
  AXTO_DARK   = #1D1D1F
  AXTO_LIGHT  = #EFF6FF
  PROMPT_BG   = #1E1E1E  (kotak prompt, dark background)
  PROMPT_FG   = #D4D4D4  (teks di kotak prompt)
  ACCENT      = #F6821F  (Cloudflare orange, aksen)

Satu script Python per playbook, atau batch beberapa sekaligus.
Ikuti standar format section 6.

---

## 8. Prioritas Pembuatan

Buat urutan ini:
PRIORITAS 1 (featured + harga tinggi):
  1. ultimate-sales-copy-pack.pdf       $29 BEST SELLER
  2. legal-document-vault.pdf           $39 HIGH VALUE
  3. video-sales-letter-pack.pdf        $34 HIGH VALUE
  4. startup-launch-playbook.pdf        $34
  5. saas-growth-playbook.pdf           $29

PRIORITAS 2 (popular):
  6. social-media-content-engine.pdf    $19 POPULAR 90 prompts
  7. career-accelerator-pack.pdf        $19 POPULAR
  8. ai-productivity-power-pack.pdf     $24 POPULAR 40 prompts
  9. cold-dm-outreach-masterclass.pdf   $24 NEW
  10. email-sequence-machine.pdf        $24 71 prompts

PRIORITAS 3:
  Sisanya 38 playbook dalam urutan bebas.

---

## 9. Yang TIDAK Boleh Dilakukan

DILARANG:
  - Buat kategori baru
  - Tambah playbook ke catalog.ts
  - Buat migration SQL baru untuk playbook
  - Ubah schema database
  - Ubah API routes
  - Taruh PDF di dalam dashboard/ atau folder repo
  - Buat PDF dengan nama berbeda dari slug

DIIZINKAN:
  - Buat file PDF dengan Python + ReportLab
  - Output ke /mnt/user-data/outputs/
  - Konten prompt lengkap, spesifik, siap pakai

---

## 10. Stack Teknologi Ringkas

Frontend     : Next.js (next-on-pages) -> Cloudflare Pages
Database     : Cloudflare D1 (SQLite)
File Storage : Cloudflare R2
Deploy kode  : GitHub -> Cloudflare Pages (auto)
Deploy data  : axto-deploy-windows.exe (manual, double-click)
Payment      : Stripe + PayPal
Email        : Resend
PDF content  : Di luar repo, upload via .exe ke R2

---

## 11. Ringkasan Pekerjaan Sudah Selesai

Sesi 1: Schema + 13 playbook awal
Sesi 2: Batch 1 (5 playbooks) + Batch 2 (10 playbooks) + autopost templates
Sesi 3: Batch 3 (20 playbooks) + 7 new bundles + 16 new autopost templates
Sesi 4: axto-deploy-windows.exe + .env guide PDF + PLAYBOOKS_AI_CONTEXT.md ini

Yang tersisa: 48 file PDF konten prompt.

---
Last updated: Sesi AI ke-4
Project: AXTO Playbooks by axto.io
