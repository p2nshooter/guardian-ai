[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hello@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO — Production Setup Guide

## What's Included in This Patch

### Files Modified / Added

```
dashboard/
├── app/
│   ├── page.tsx                        ✅ Landing page — multi-language, SEO, JSON-LD
│   ├── layout.tsx                      ✅ Full SEO metadata, viewport, OpenGraph
│   ├── globals.css                     ✅ Mobile-first, accessibility
│   ├── sitemap.ts                      ✅ Dynamic sitemap for Google
│   ├── robots.ts                       ✅ Robots.txt configuration
│   ├── middleware.ts                   ✅ Edge route protection
│   ├── next.config.js                  ✅ CF Pages optimized config
│   ├── auth/login/page.tsx             ✅ Multi-language login UI
│   ├── admin/page.tsx                  ✅ Admin dashboard, mobile-first
│   ├── portal/page.tsx                 ✅ Client portal — complete, accessible
│   └── api/
│       ├── auth/route.ts               ✅ Login — fixed D1 binding
│       ├── auth/callback/route.ts      ✅ Magic link callback — secure redirect
│       ├── auth/me/route.ts            ✅ Session check
│       ├── auth/logout/route.ts        ✅ Logout — GET + POST
│       ├── health/route.ts             ✅ /api/health — diagnostic endpoint
│       ├── license-validate/route.ts   ✅ Engine heartbeat — CORS, complete checks
│       └── portal/route.ts             ✅ Portal data API — complete
├── lib/
│   ├── db.ts                           ✅ D1 binding — 4-path detection
│   └── i18n.ts                         ✅ Multi-language + multi-currency
└── public/
    └── manifest.json                   ✅ PWA manifest
.github/workflows/deploy.yml            ✅ Complete CI/CD workflow
diagnose-login.sh                       ✅ Login diagnostic script
```

---

## 1. Apply This Patch

```bash
# From your axto-v2 repo root:
unzip axto-production.zip
cp -r axto-production/dashboard/ ./dashboard/
cp -r axto-production/.github/  ./.github/
cp axto-production/diagnose-login.sh ./

git add .
git commit -m "production: complete platform overhaul — login fix, SEO, multi-lang, multi-currency"
git push origin main
```

---

## 2. Required GitHub Secrets

Go to your repo → Settings → Secrets → Actions:

| Secret | How to Get |
|--------|------------|
| `CLOUDFLARE_API_TOKEN` | CF Dashboard → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | CF Dashboard → right sidebar |
| `CF_D1_DATABASE_ID` | `npx wrangler d1 list` |
| `CF_KV_NAMESPACE_ID` | `npx wrangler kv namespace list` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Your strong admin password |
| `RESEND_API_KEY` | resend.com → API Keys |
| `CRON_SECRET` | `openssl rand -hex 16` |

---

## 3. First-Time Setup

```bash
export CLOUDFLARE_API_TOKEN=your_token
export CLOUDFLARE_ACCOUNT_ID=your_account_id

# Run D1 migrations
cd dashboard
npx wrangler d1 migrations apply axto-db --remote

# Create admin user
npx wrangler d1 execute axto-db --remote --command="
  INSERT OR IGNORE INTO users (id, email, role, created_at, updated_at)
  VALUES (lower(hex(randomblob(16))), 'hello@axto.io', 'admin', datetime('now'), datetime('now'))
"

# Set secrets
openssl rand -hex 32 | npx wrangler pages secret put JWT_SECRET --project-name=axto-dashboard
openssl rand -hex 32 | npx wrangler pages secret put ENCRYPTION_KEY --project-name=axto-dashboard
echo "your_resend_key" | npx wrangler pages secret put RESEND_API_KEY --project-name=axto-dashboard
```

---

## 4. Verify Deployment

```bash
# 1. Health check
curl https://axto.io/api/health
# Expected: {"status":"ok","checks":{"d1_binding":"ok",...}}

# 2. Test login
curl -X POST https://axto.io/api/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"magic_link","email":"your@email.com"}'
# Expected: {"ok":true,"message":"..."}

# 3. Test license validate
curl -X POST https://axto.io/api/license-validate \
  -H "Content-Type: application/json" \
  -d '{"license_key":"GUARD-XXXX-XXXX","machine_id":"test-123"}'
```

---

## 5. SEO Configuration

The platform includes:
- **JSON-LD structured data** (Organization, SoftwareApplication, FAQPage)
- **OpenGraph** tags for social sharing
- **Dynamic sitemap** at `/sitemap.xml`
- **robots.txt** at `/robots.txt`
- **hreflang** for 3 languages (en, id, zh)
- **Semantic HTML** (header, nav, main, article, section, footer)
- **ARIA labels** on all interactive elements

For Google Search Console:
1. Submit `https://axto.io/sitemap.xml`
2. Add your Google Search Console verification code in `app/layout.tsx`
3. Monitor Core Web Vitals

---

## 6. Multi-Language & Currency

Supported languages (auto-detected from IP):
- 🇮🇩 Indonesian (ID)
- 🇺🇸 English (EN)
- 🇨🇳 Chinese Simplified (ZH)
- 🇸🇦 Arabic (AR, RTL)

Supported currencies (auto-detected from IP):
IDR, USD, SGD, MYR, EUR, GBP, AED, CNY, JPY, AUD

All content in `dashboard/lib/i18n.ts`.

---

## 7. BYOK Privacy Architecture

Your clients' AI keys are completely private:
- Keys are set in `guardian.yml` / `orchestra.yml` on the **client's own server**
- AXTO Platform only receives license validation heartbeats
- No AI data, prompts, or responses are ever sent to AXTO
- Each heartbeat only contains: license_key, machine_id, product name, node count
- All heartbeat data is stored encrypted in Cloudflare D1

This is enforced at the architecture level — AXTO has no capability to see client data.
