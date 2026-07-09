[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# 🚀 AXTO AutoPost — Panduan Setup Lengkap

## Daftar Isi
1. [Overview](#overview)
2. [Database Setup](#database-setup)
3. [Environment Variables](#environment-variables)
4. [Setup Platform Social Media](#setup-platform-social-media)
5. [Setup Free Classified Sites](#setup-classified-sites)
6. [Cloudflare Workers Cron](#cloudflare-workers-cron)
7. [Menjalankan AutoPost](#menjalankan-autopost)
8. [Menggunakan Template](#menggunakan-template)
9. [AI Text Variation](#ai-text-variation)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Sistem AutoPost AXTO memungkinkan Anda mem-posting promosi produk AXTO secara otomatis ke:

**📱 Social Media (7 platform):** Facebook, Instagram, Pinterest, Twitter/X, LinkedIn, Telegram, YouTube Community

**📋 Free Classified Sites (11 platform):** Craigslist, OLX, Locanto, ClassifiedAds.com, Gumtree, Oodle, Adpost, Trovit, Vivastreet, Hoobly, FreeAds.in

**Fitur Utama:**
- ✅ 84+ template promosi siap pakai (Bahasa Indonesia & Inggris)
- ✅ AI auto-vary teks agar setiap post unik
- ✅ Penjadwalan otomatis (hourly/daily/weekly)
- ✅ Publish ke semua platform sekaligus
- ✅ History & tracking status

---

## Database Setup

### Jalankan Migrasi D1

```bash
wrangler d1 migrations apply axto-db --remote
```

Tabel yang akan terbuat:
- `autopost_platform_configs`
- `autopost_templates`
- `autopost_posts`
- `autopost_schedules`
- `autopost_analytics`
- `autopost_images`

---

## Environment Variables

Set di Cloudflare Pages → Settings → Environment Variables, atau via wrangler:

```bash
wrangler pages secret put CRON_SECRET --project-name=axto-dashboard
# Opsional — untuk AI text variation:
wrangler pages secret put ANTHROPIC_API_KEY --project-name=axto-dashboard
```

---

## Setup Platform Social Media

### 📘 Facebook
1. Buka https://developers.facebook.com → buat App → tipe "Business"
2. Tambah: "Facebook Login" & "Pages API"
3. Generate Page Access Token dengan permission: `pages_manage_posts`, `pages_read_engagement`
4. **Di Admin Panel AXTO:** Platform: Facebook · Page Access Token · Page ID

### 📸 Instagram Business
1. Gunakan Facebook App yang sama
2. Tambah permission: `instagram_basic`, `instagram_content_publish`
3. Dapatkan Instagram User ID via Graph API
4. **Di Admin Panel AXTO:** Platform: Instagram · Access Token · Instagram User ID
> ⚠️ Instagram **wajib** ada gambar.

### 📌 Pinterest
1. https://developers.pinterest.com → buat App
2. OAuth 2.0 dengan scope: `pins:write`, `boards:read`
3. **Di Admin Panel AXTO:** Platform: Pinterest · Access Token · Board ID

### 🐦 Twitter / X
1. https://developer.twitter.com/en/portal → buat App
2. Permission: "Read and Write"
3. **Di Admin Panel AXTO:** Platform: Twitter · Bearer Token
> ⚠️ Minimal Basic tier ($100/bln) untuk posting.

### 💼 LinkedIn
1. https://www.linkedin.com/developers → buat App
2. Permission: `w_organization_social`
3. **Di Admin Panel AXTO:** Platform: LinkedIn · Access Token · Organization URN

### ✈️ Telegram
1. Chat @BotFather → `/newbot`
2. Add bot ke channel sebagai Administrator
3. **Di Admin Panel AXTO:** Platform: Telegram · Bot Token · Channel ID

---

## Setup Classified Sites

Gunakan Make.com atau Zapier webhook:

1. Buat Scenario → **Webhooks → Custom Webhook**
2. Copy URL webhook → paste di Admin Panel AXTO
3. Tambah module HTTP untuk tiap classified site

---

## Cloudflare Workers Cron

```bash
cd cloudflare-workers/

# Set secret
wrangler secret put CRON_SECRET --config wrangler-autopost.toml

# Deploy worker
wrangler deploy --config wrangler-autopost.toml
```

Jadwal default (di `wrangler-autopost.toml`):
```toml
crons = ["0 */6 * * *"]  # Setiap 6 jam
```

---

## Menjalankan AutoPost

1. Login ke `/admin` → klik **🚀 AutoPost**
2. Tab **Platforms**: setup credentials
3. Tab **Templates**: browse 84+ template
4. Tab **Compose**: tulis/pilih template → publish
5. Tab **Schedules**: buat jadwal otomatis

### Via API
```bash
# Manual trigger
curl -X GET https://axto.io/api/cron/autopost \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## AI Text Variation

Menggunakan **Claude AI** untuk variasi unik per post.
- **Light**: ~30-40% kata berbeda
- **Medium**: ~60-70% berbeda (default)
- **Heavy**: ~100% fresh angle

Butuh: `ANTHROPIC_API_KEY` di CF Pages secrets.

---

## Troubleshooting

- **Post gagal Facebook**: Page Access Token expired → refresh setiap 60 hari
- **Post gagal Instagram**: Pastikan ada `image_url` HTTPS yang valid
- **AI Vary Text tidak jalan**: Cek `ANTHROPIC_API_KEY` sudah diset di CF Pages
- **Cron tidak jalan**: Verifikasi `CRON_SECRET` sama di CF Pages dan Worker

---

*AXTO — AI eXecution & Tools Orchestration | axto.io | hello@axto.io*
