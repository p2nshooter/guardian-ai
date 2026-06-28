[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hallo@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO Platform — Production Deployment Guide

## Daftar Perubahan (v2.2.1 — 26 March 2026)

### 1. Pricing Consistency — Sesuai lib/stripe.ts
Semua harga sekarang konsisten di seluruh codebase:

| Package Code | Package Name | Price/Year |
|--------------|--------------|------------|
| **Guardian AI** | | |
| `lite` | Guardian Sentinel | $490 |
| `pro` | Guardian Professional | $1,990 |
| `shield` | Guardian Business | $7,990 |
| `aegis` | Guardian Enterprise | $29,900 |
| **Orchestra AI** | | |
| `orchestra_core` | Orchestra Starter | $14,900 |
| `orchestra_scale` | Orchestra Professional | $39,900 |
| `orchestra_unlimited` | Orchestra Enterprise | $89,900 |
| **Bundles** | | |
| `bundle_starter` | Starter Bundle (Professional + Starter) | $14,900 |
| `bundle_professional` | Professional Bundle (Business + Professional) | $39,900 |
| `bundle_enterprise` | Enterprise Bundle (Enterprise + Enterprise) | $99,900 |

### 2. AutoPost Social Media — Simplified
- **Sebelum**: Harus input App ID, App Secret, OAuth setup per platform
- **Sekarang**: Cukup 1 API key Ayrshare untuk SEMUA social media
- Platforms: Facebook, Instagram, Twitter, LinkedIn, Pinterest, YouTube, TikTok, Threads, Telegram

**Cara Setup:**
1. Daftar di [ayrshare.com](https://ayrshare.com)
2. Connect social accounts di dashboard Ayrshare
3. Copy API key → paste di Admin Panel → AutoPost → Connect

### 3. Classified Sites — 100% Free
- 20+ classified sites tanpa register/login/credential
- Direct HTTP POST ke form submission endpoints
- Parallel execution (8 concurrent)

### 4. Engine Builder — Bundle Packaging
Admin dan client bisa download bundle (bukan satuan):

| Bundle ID | Contents | For Packages |
|-----------|----------|--------------|
| `guardian-image-bundle` | 3 Docker images | lite, pro, shield, aegis |
| `guardian-exe-bundle` | 3 Windows EXE | lite, pro, shield, aegis |
| `orchestra-image-bundle` | 3 Docker images | orchestra_* |
| `orchestra-exe-bundle` | 3 Windows EXE | orchestra_* |
| `full-image-bundle` | 6 Docker images | bundle_* |
| `full-exe-bundle` | 6 Windows EXE | bundle_* |

### 5. Client Portal — Auto Bundle Download
Client otomatis dapat bundle sesuai package yang dibeli:
- Endpoint: `/api/portal/bundle?license_id=xxx&type=docker|exe`
- Returns TAR archive dengan semua produk dalam paket

---

## Deployment Steps

### 1. Prerequisites
- Cloudflare Account (Pages, R2, D1)
- GitLab/GitHub repository
- Domain configured

### 2. Environment Variables
```env
# Required
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_token

# Optional (for Ayrshare)
AYRSHARE_API_KEY=your_ayrshare_key

# Cron
CRON_SECRET=random_secret_string
```

### 3. Cloudflare Bindings (wrangler.toml)
```toml
[[d1_databases]]
binding = "DB"
database_name = "axto-db"
database_id = "your-d1-id"

[[r2_buckets]]
binding = "R2_BUILDS"
bucket_name = "axto-builds"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"
```

### 4. Database Schema
Run `schema.sql` in D1 console to create tables.

### 5. Deploy
```bash
npm run deploy
# or
wrangler pages deploy .vercel/output/static --project-name axto
```

---

## Files Changed in This Update

### Core Updates
- `/dashboard/lib/stripe.ts` — Source of truth for pricing
- `/dashboard/lib/product-docs.ts` — Product catalog aligned with stripe.ts
- `/dashboard/lib/i18n.ts` — Translation strings updated

### AutoPost
- `/dashboard/app/admin/autopost/page.tsx` — Simplified UI
- `/dashboard/app/api/admin/autopost/social-push/route.ts` — Ayrshare integration
- `/dashboard/app/api/admin/autopost/classified-push/route.ts` — Free classified sites

### Engine Builder
- `/dashboard/app/api/admin/engine-builder/route.ts` — Real build API
- `/dashboard/app/api/admin/engine-builder/download/route.ts` — Bundle downloads
- `/dashboard/app/admin/engine-builder/page.tsx` — UI with bundle info

### Client Portal
- `/dashboard/app/api/portal/bundle/route.ts` — Client bundle download API

### Landing & Admin
- `/dashboard/app/page.tsx` — Pricing display
- `/dashboard/app/admin/releases/page.tsx` — Pricing banners

### Templates
- `/dashboard/lib/autopost/templates.ts` — Fixed prices
- `/dashboard/lib/autopost/templates_extra200.ts` — Fixed prices & names

---

## Build Engine Real Implementation Notes

Untuk build engine yang benar-benar bisa build Docker images dan EXE:

### Opsi 1: GitLab CI (Recommended)
1. Setup `.gitlab-ci.yml` dengan jobs untuk setiap produk
2. GitLab Runner dengan Docker-in-Docker
3. Push hasil ke Cloudflare R2 via S3 API

### Opsi 2: GitHub Actions
1. Workflow di `.github/workflows/build.yml`
2. Self-hosted runner untuk GPU builds
3. Upload ke R2 via wrangler atau S3

### Opsi 3: External Build Server
1. VPS dengan Docker (Hetzner, Oracle Free, etc.)
2. Webhook trigger dari dashboard
3. Stream upload ke R2 during build

**GPU Worker Build Requirements:**
- 80GB+ disk space (image ~60-80GB)
- NVIDIA GPU untuk testing
- Cross-compilation setup untuk Windows EXE

---

## Testing Checklist

- [ ] Landing page shows correct prices
- [ ] Registration page shows correct packages
- [ ] Checkout creates correct license with package_code
- [ ] Client portal shows correct download bundles
- [ ] Admin engine builder shows all 12 products
- [ ] Bundle downloads work as TAR archives
- [ ] AutoPost connects via Ayrshare popup
- [ ] Classified push works to 20+ sites
- [ ] Schedule save and cron execution
