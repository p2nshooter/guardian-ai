[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO Deployer — One-Click Deploy ke Cloudflare

Double-click `.exe` → SQL masuk D1 → PDF masuk R2 → langsung aktif di semua halaman.

---

## Cara Kerja

```
Double-click .exe
      │
      ├─ PHASE 1: SQL Migrations → Cloudflare D1
      │   ├─ Baca semua file di cf-migrations/*.sql
      │   ├─ Cek mana yang belum dijalankan
      │   └─ Jalankan via Cloudflare D1 REST API
      │         → Playbook metadata masuk database
      │
      └─ PHASE 2: PDF Files → Cloudflare R2
          ├─ Baca semua file di playbooks-pdf/*.pdf
          ├─ Cek mana yang belum ada di R2
          └─ Upload via S3-compatible API
                → File PDF siap didownload

Setelah selesai → otomatis aktif di:
  ✅ /admin/playbooks    (CRUD admin panel)
  ✅ /playbooks          (landing page catalog)
  ✅ /portal             (client dashboard)
  ✅ Download link       (setelah client beli)
```

---

## Setup Pertama (sekali saja)

### 1. Install Node.js
Download dari **https://nodejs.org** → pilih versi **LTS**

### 2. Isi credentials
```
Rename: .env.example  →  .env
Buka .env dengan Notepad, isi 5 nilai:
```

| Variable | Cara dapat |
|---|---|
| `CF_ACCOUNT_ID` | Cloudflare Dashboard → kanan atas → Account ID |
| `CF_API_TOKEN` | Profile → API Tokens → Create Token *(lihat di bawah)* |
| `D1_DATABASE_ID` | Workers & Pages → D1 → klik database → Database ID |
| `R2_ACCESS_KEY_ID` | R2 → Manage R2 API Tokens → Create API Token |
| `R2_SECRET_ACCESS_KEY` | Sama seperti di atas |

**Buat CF_API_TOKEN:**
1. Buka https://dash.cloudflare.com/profile/api-tokens
2. **Create Token** → **Create Custom Token**
3. Tambahkan 2 permissions:
   - `Account` → `D1` → `Edit`
   - `Account` → `Cloudflare R2 Storage` → `Edit`
4. Klik **Continue to summary** → **Create Token**
5. Copy token ke `.env`

### 3. Build .exe

**Windows** → double-click `build-exe.bat`

**Mac/Linux:**
```bash
chmod +x build-exe.sh && ./build-exe.sh
```

Hasil build ada di `dist/axto-deploy-windows.exe`

---

## Cara Pakai (setiap kali ada playbook baru)

```
1. Tambahkan SQL migration baru di cf-migrations/
   (atau sudah otomatis dari repo)

2. Taruh file PDF di playbooks-pdf/
   Nama file harus = slug playbook + .pdf
   Contoh: ultimate-sales-copy-pack.pdf

3. Double-click axto-deploy-windows.exe

4. Tunggu selesai → semua halaman langsung aktif
```

---

## Nama File PDF (48 file)

### Copywriting & Marketing
```
ultimate-sales-copy-pack.pdf          email-sequence-machine.pdf
social-media-content-engine.pdf       cold-dm-outreach-masterclass.pdf
brand-voice-storytelling-kit.pdf      pr-media-kit-builder.pdf
video-sales-letter-pack.pdf           wellness-coach-fitness-biz-kit.pdf
```

### Business & Strategy
```
startup-launch-playbook.pdf           sop-template-factory.pdf
freelancer-business-kit.pdf           meeting-presentation-mastery.pdf
consulting-advisory-kit.pdf           negotiation-deals-mastery.pdf
restaurant-food-business-kit.pdf
```

### Content Creation
```
seo-blog-machine.pdf                  youtube-script-machine.pdf
podcast-newsletter-engine.pdf         tiktok-content-machine.pdf
linkedin-article-newsletter-pro.pdf
```

### Legal & HR
```
legal-document-vault.pdf              hr-hiring-toolkit.pdf
compliance-policy-generator.pdf
```

### E-Commerce & Sales
```
ecommerce-conversion-kit.pdf          amazon-fba-seller-kit.pdf
dropshipping-pod-masterpack.pdf       etsy-handmade-seller-kit.pdf
```

### SaaS & Startup
```
saas-growth-playbook.pdf              ai-productivity-power-pack.pdf
customer-success-playbook.pdf         product-hunt-app-launch-kit.pdf
api-developer-marketing-kit.pdf
```

### Education & Training
```
course-creator-blueprint.pdf          student-academic-excellence-pack.pdf
corporate-training-ld-kit.pdf         language-learning-tutor-kit.pdf
```

### Resume & Career
```
career-accelerator-pack.pdf           linkedin-personal-brand-pro.pdf
executive-leadership-pack.pdf         remote-job-hunter-kit.pdf
```

### Real Estate
```
real-estate-agent-kit.pdf             property-investor-playbook.pdf
airbnb-short-term-rental-kit.pdf      commercial-real-estate-kit.pdf
```

### Data & Analytics
```
data-analyst-toolkit.pdf              marketing-analytics-mastery.pdf
business-intelligence-reporting-kit.pdf  financial-modeling-forecasting-kit.pdf
```

---

## Opsi di .env

| Variable | Default | Fungsi |
|---|---|---|
| `FORCE_MIGRATIONS` | `false` | `true` = jalankan ulang semua SQL |
| `FORCE_REUPLOAD` | `false` | `true` = upload ulang semua PDF |
| `R2_PREFIX` | `playbooks/` | Path prefix di dalam bucket |

---

## Troubleshooting

**"D1 API error: Authentication error"**
→ CF_API_TOKEN salah atau expired → buat token baru

**"D1 API error: Database not found"**
→ D1_DATABASE_ID salah → cek di Cloudflare Dashboard → D1

**"Bucket tidak ditemukan"**
→ R2_BUCKET_NAME salah → pastikan nama bucket sama persis

**Migration jalan tapi playbook tidak muncul di admin**
→ Kemungkinan SQL file belum ada di cf-migrations/
→ Atau koneksi ke D1 berhasil tapi INSERT gagal → cek log error di terminal

**PDF ter-skip terus padahal mau upload ulang**
→ Set `FORCE_REUPLOAD=true` di .env
