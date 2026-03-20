# AXTO — AI eXecution & Tools Orchestration — Production Checklist

## Prerequisites
```bash
# Install di Termux atau server
pkg install nodejs git openssl
npm install -g wrangler
```

## 1. Clone & Config

```bash
git clone https://github.com/USERNAME/axto-platform.git
cd axto-platform

# Set secrets
export CF_API_TOKEN="your-cloudflare-api-token"   # CF → My Profile → API Tokens
export CF_ACCOUNT_ID="your-account-id"            # CF → Right sidebar → Account ID
```

## 2. Cloudflare Setup (otomatis)

```bash
bash setup.sh
# Script akan:
# - Buat D1 database
# - Buat KV namespace
# - Buat R2 buckets
# - Auto-patch wrangler.toml
# - Buat CF Pages project
# - Run D1 migrations
# - Buat admin user
# - Generate & set JWT_SECRET + ENCRYPTION_KEY
```

## 3. GitHub Repository

```bash
# Buat repo di GitHub (nama: axto-platform)
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/axto-platform.git
git push -u origin main
```

## 4. GitHub Secrets

Di GitHub → repo → Settings → Secrets → Actions → New secret:

| Secret | Value |
|--------|-------|
| `CF_API_TOKEN` | Cloudflare API Token |
| `CF_ACCOUNT_ID` | Cloudflare Account ID |

Sisanya (JWT_SECRET, ENCRYPTION_KEY, dll) sudah di-set oleh setup.sh ke CF Pages.

## 5. Domain

```bash
# Di Cloudflare Dashboard → Workers & Pages → axto-dashboard → Custom domains
# Tambah: axto.io dan www.axto.io
```

## 6. Set RESEND_API_KEY (email)

```bash
# Daftar gratis di resend.com
echo "re_xxxx_yourkey" | wrangler pages secret put RESEND_API_KEY \
  --project-name=axto-dashboard
```

## 7. Set CRON_SECRET

```bash
echo "$(openssl rand -hex 32)" | wrangler pages secret put CRON_SECRET \
  --project-name=axto-dashboard

# Set juga di Workers
echo "SAME_SECRET" | wrangler secret put CRON_SECRET \
  --config cloudflare-workers/wrangler-autopost.toml
```

## 8. Verify Deploy

```bash
# Push ke main → Actions otomatis deploy
git push origin main

# Cek status di GitHub Actions
# Setelah deploy, test:
curl https://axto.io/api/health
```

## 9. First Login

```bash
# Login via magic link
# Buka: https://axto.io/auth/login
# Masukkan email admin yang didaftarkan di setup.sh
# Cek email untuk magic link

# Set admin password (opsional — untuk login tanpa magic link):
curl -X POST https://axto.io/api/admin \
  -H "Cookie: axto_session=SESSION_FROM_MAGIC_LINK" \
  -H "Content-Type: application/json" \
  -d '{"action":"set_password","targetEmail":"hallo@axto.io","newPassword":"YourStrongPassword123!"}'
```

## 10. Configure Payment Gateways

```
https://axto.io/admin → Payment Gateways → Configure masing-masing
```

## 11. Threat Intel API Keys (opsional, semua gratis)

```bash
cd cloudflare-workers

# MalwareBazaar: https://bazaar.abuse.ch/account/
echo "YOUR_KEY" | wrangler secret put MALWAREBAZAAR_API_KEY \
  --config wrangler-threat-intel.toml

# AlienVault OTX: https://otx.alienvault.com/
echo "YOUR_KEY" | wrangler secret put OTX_API_KEY \
  --config wrangler-threat-intel.toml
```

## 12. GHCR Package Visibility

```
GitHub → Settings → Packages → guardian-engine → Package settings → Public
GitHub → Settings → Packages → orchestra-engine → Package settings → Public
```

## Backup D1

```bash
wrangler d1 export axto-db --output=backup-$(date +%Y%m%d).sql --remote
```
