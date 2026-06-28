[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hallo@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO AutoPost - Panduan Penggunaan (UPDATED)

## Perubahan yang Dilakukan

### 1. Social Media Auto-Post (Simplified)
**Sebelum:** Harus input App ID, App Secret, OAuth setup per platform  
**Sekarang:** Cukup 1 API key Ayrshare untuk SEMUA social media

**Cara Setup:**
1. Buka [ayrshare.com](https://ayrshare.com) → Daftar gratis
2. Di dashboard Ayrshare → **Social Accounts** → klik Login ke setiap sosmed (Facebook, Instagram, Twitter, LinkedIn, Pinterest, TikTok, YouTube, Threads, Telegram)
3. Copy **API Key** dari dashboard
4. Di admin panel → AutoPost → Klik **Connect** → Paste API key
5. Selesai! Semua social media terhubung.

**Keuntungan:**
- ✅ Tidak perlu bikin App di setiap platform
- ✅ Tidak perlu App ID / App Secret
- ✅ Tidak perlu OAuth setup manual
- ✅ 1 klik connect untuk semua platform
- ✅ Free plan: 30 post/bulan

---

### 2. Classified Sites Auto-Push (100% FREE)
**Sebelum:** Beberapa classified butuh register/login/kredensial  
**Sekarang:** 20+ classified sites, semua 100% GRATIS tanpa register/login apapun

**Cara Pakai:**
1. Di admin panel → AutoPost → Tab "Scheduler"
2. Pada section "Classified Sites Auto-Push" → Aktifkan toggle
3. Set interval posting (10 menit - mingguan)
4. Klik **Save**
5. Atau klik **Push Now** untuk langsung push ke semua sites

**Daftar 20+ Free Classified Sites:**
- FreeAdLists (USA)
- WallClassifieds (Global)
- PostFreeAds (USA)
- FreeGlobalAds (Global)
- ClassifiedsFactor (USA)
- USAFreeClassifieds (USA)
- AdlandPro (Global)
- ClassifiedsForFree (Global)
- FreeAdList (USA)
- Kugli (Global)
- FreeAdsTime (Global)
- H1Ad (USA)
- Expatriates (Global)
- OzFreeOnline (Australia)
- FreeAdsIndia (India)
- Geebo (USA)
- Bedpage (USA)
- ClassifiedAds (Global)
- SoMuch Directory (Global)
- 9Sites (Global)
- + Google & Bing Ping (SEO)

**Keuntungan:**
- ✅ 100% gratis, tidak perlu register
- ✅ Tidak perlu login
- ✅ Tidak perlu input kredensial apapun
- ✅ Direct HTTP POST ke form submission
- ✅ Parallel execution (cepat)
- ✅ 1 setting interval untuk semua sites

---

## Fitur Auto-Post

### A. Scheduler
- Set interval posting otomatis (10 menit - mingguan)
- Pilih bahasa (Indonesia / English / Keduanya)
- Toggle on/off kapan saja

### B. Templates
- 200+ template iklan siap pakai
- Dipilih random otomatis
- Support multi-bahasa

### C. History
- Lihat semua post yang sudah dipublish
- Status: published / failed
- Detail per platform

---

## API Endpoints

### Social Media Push
```
POST /api/admin/autopost/social-push
Body: { "language": "id" | "en" }
```

### Classified Push
```
POST /api/admin/autopost/classified-push
Body: { "language": "id" | "en" }
```

### Cron Job (untuk scheduler otomatis)
```
GET /api/cron/autopost?secret=YOUR_CRON_SECRET
```

---

## Environment Variables

```env
# Ayrshare (opsional, bisa juga disimpan via UI)
AYRSHARE_API_KEY=your_ayrshare_api_key

# Cron secret untuk scheduler
CRON_SECRET=your_random_secret_string

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Cloudflare Cron Setup

Tambahkan di `wrangler.toml`:
```toml
[triggers]
crons = ["0 * * * *"]  # Setiap jam
```

Atau gunakan Cloudflare Workers Cron Triggers di dashboard.
