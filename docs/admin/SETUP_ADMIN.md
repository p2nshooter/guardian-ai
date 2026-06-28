[//]: # (==============================================================================)
[//]: # (Copyright (c) 2024-2026 Axto AI. All rights reserved.)
[//]: # (Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure)
[//]: # (Maintained by: Axto AI <hallo@axto.io>)
[//]: # (Proprietary and Confidential. Unauthorized copying is strictly prohibited.)
[//]: # (==============================================================================)
# AXTO Admin — Setup Guide

## Requirements

- Node.js 20+
- Wrangler CLI: `npm install -g wrangler`
- Cloudflare account

## Initial Setup (sekali saja)

```bash
# 1. Login ke Cloudflare
wrangler login

# 2. Setup semua CF resources (D1, KV, R2, CF Pages project)
export CF_API_TOKEN=your_cf_api_token
export CF_ACCOUNT_ID=your_account_id
./setup.sh
```

## Dashboard (CF Pages — Git Integration)

CF Pages build Next.js secara native. Tidak perlu build lokal.

**Setup sekali di Cloudflare Dashboard:**

1. Buka https://dash.cloudflare.com → **Workers & Pages → Create**
2. Pilih **Pages → Connect to Git**
3. Pilih repo GitHub ini
4. Konfigurasi:
   - **Framework preset**: Next.js
   - **Root directory**: `dashboard`
   - **Build command**: `npm run build`
   - **Build output**: *(kosongkan — CF Pages detect otomatis)*
5. Klik **Save and Deploy**

Setelah ini, setiap push ke branch `main` → CF Pages otomatis build dan deploy.

## D1 Database

```bash
# Create
wrangler d1 create axto-db

# Isi database_id ke dashboard/wrangler.toml

# Run migrations
cd dashboard
wrangler d1 migrations apply axto-db --remote

# Query (debug)
wrangler d1 execute axto-db --remote --command="SELECT * FROM users"
```

## Secrets (CF Pages)

```bash
wrangler pages secret put JWT_SECRET        --project-name=axto-dashboard
wrangler pages secret put ENCRYPTION_KEY    --project-name=axto-dashboard
wrangler pages secret put RESEND_API_KEY    --project-name=axto-dashboard
wrangler pages secret put CRON_SECRET       --project-name=axto-dashboard
```

## First Admin User

```bash
wrangler d1 execute axto-db --remote --command="
  INSERT INTO users (id, email, role, created_at)
  VALUES (lower(hex(randomblob(16))), 'hallo@axto.io', 'admin', datetime('now'))
"
```

## Workers & R2

```bash
# Deploy Workers
cd cloudflare && wrangler deploy --env production
cd cloudflare-workers && wrangler deploy --config wrangler-autopost.toml

# Upload threat feed ke R2
wrangler r2 object put guardian-threat-feed/malicious_ips.json     --file=threat-feed/malicious_ips.json     --content-type=application/json
wrangler r2 object put guardian-threat-feed/malicious_domains.json --file=threat-feed/malicious_domains.json --content-type=application/json
wrangler r2 object put guardian-threat-feed/malware_hashes.json    --file=threat-feed/malware_hashes.json    --content-type=application/json
```

## Backup D1

```bash
wrangler d1 export axto-db --output=backup-$(date +%Y%m%d).sql --remote
```

## GitHub Secrets yang Dibutuhkan

| Secret | Cara dapat |
|--------|-----------|
| `CF_API_TOKEN` | Cloudflare → My Profile → API Tokens |
| `CF_ACCOUNT_ID` | Cloudflare → Overview (kanan atas) |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `RESEND_API_KEY` | resend.com → API Keys |
| `CRON_SECRET` | String random bebas |
