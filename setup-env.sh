#!/bin/bash
# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
# ═══════════════════════════════════════════════════════════════════════════════
# AXTO Platform — Environment Variables Setup
# Jalankan script ini SEKALI untuk generate semua env variables yang diperlukan
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  AXTO Platform — Environment Setup Generator                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Auto-generate BUILD_WEBHOOK_SECRET ────────────────────────────────────────
BUILD_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n' | head -c 64)
echo "✅ BUILD_WEBHOOK_SECRET generated: ${BUILD_SECRET:0:12}..."

# ── Summary ───────────────────────────────────────────────────────────────────
cat << INFO

═══════════════════════════════════════════════════════════════════════
📋 ENVIRONMENT VARIABLES YANG PERLU DI-SET
═══════════════════════════════════════════════════════════════════════

Ada 2 tempat yang perlu di-set: GitLab CI/CD dan Cloudflare Pages.

┌─────────────────────────────────────────────────────────────────────
│ 1. GITLAB CI/CD VARIABLES
│    Settings → CI/CD → Variables → Add Variable
├─────────────────────────────────────────────────────────────────────
│
│  CF_R2_ACCESS_KEY     = (dari Cloudflare → R2 → Manage R2 API Tokens)
│  CF_R2_SECRET_KEY     = (dari Cloudflare → R2 → Manage R2 API Tokens)
│  CF_ACCOUNT_ID        = (dari Cloudflare Dashboard → URL bar: /xxxxxxxx)
│  R2_BUCKET_NAME       = axto-builds
│  DASHBOARD_URL        = (URL dashboard kamu, contoh: https://axto.io)
│  BUILD_WEBHOOK_SECRET = ${BUILD_SECRET}
│
│  ⚠️  DASHBOARD_URL = sama persis dengan NEXT_PUBLIC_APP_URL di CF Pages
│  ⚠️  BUILD_WEBHOOK_SECRET = secret random untuk keamanan webhook callback
│      dari GitLab CI ke dashboard setelah build selesai
│
└─────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────
│ 2. CLOUDFLARE PAGES ENVIRONMENT VARIABLES
│    CF Pages → [project] → Settings → Environment variables
├─────────────────────────────────────────────────────────────────────
│
│  NEXT_PUBLIC_APP_URL   = https://axto.io (URL domain kamu)
│  GITLAB_TOKEN          = (dari GitLab → Settings → Access Tokens → api scope)
│  GITLAB_PROJECT        = axto-platform/guardian-ai (path repo di GitLab)
│  BUILD_WEBHOOK_SECRET  = ${BUILD_SECRET}
│
│  ⚠️  NEXT_PUBLIC_APP_URL = URL final setelah domain di-set di CF Pages
│  ⚠️  GITLAB_TOKEN = Personal Access Token dari GitLab dengan scope "api"
│  ⚠️  BUILD_WEBHOOK_SECRET = HARUS SAMA dengan yang di GitLab CI
│
│  [Sudah ada — tidak perlu diubah jika sudah di-set]:
│  DB (D1 binding), R2_BUILDS (R2 binding), KV (KV binding)
│
└─────────────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════════
📖 PENJELASAN
═══════════════════════════════════════════════════════════════════════

DASHBOARD_URL:
  Ini adalah URL production dashboard kamu.
  Contoh: https://axto.io atau https://dashboard.company.com
  HARUS SAMA dengan NEXT_PUBLIC_APP_URL di CF Pages.
  Digunakan oleh GitLab CI untuk mengirim webhook callback ke
  dashboard setelah build selesai (image/exe ready di R2).

BUILD_WEBHOOK_SECRET:
  Secret random untuk mengamankan webhook dari GitLab CI ke dashboard.
  Tanpa ini, siapa saja bisa mengirim fake webhook ke dashboard kamu.
  Secret ini HARUS SAMA di kedua tempat (GitLab CI + CF Pages).
  Script ini sudah auto-generate: ${BUILD_SECRET}

GITLAB_TOKEN:
  Personal Access Token dari GitLab untuk trigger pipeline dari dashboard.
  Buat di: GitLab → User Settings → Access Tokens
  Scope: api (centang)
  Expiry: set 1 tahun atau no expiry

GITLAB_PROJECT:
  Path repo di GitLab. Format: namespace/project-name
  Contoh: axto-platform/guardian-ai

CF_R2_ACCESS_KEY + CF_R2_SECRET_KEY:
  API token untuk R2 storage. Buat di:
  Cloudflare Dashboard → R2 → Manage R2 API Tokens → Create API Token
  Permission: Object Read & Write
  Bucket: pilih bucket yang sesuai

═══════════════════════════════════════════════════════════════════════
INFO

echo "💾 Menyimpan BUILD_WEBHOOK_SECRET ke file .env.generated..."
cat > .env.generated << ENVFILE
# Auto-generated $(date -Iseconds)
# Copy nilai ini ke GitLab CI + Cloudflare Pages env vars

BUILD_WEBHOOK_SECRET=${BUILD_SECRET}

# Set DASHBOARD_URL di GitLab CI = URL production kamu
# Contoh: DASHBOARD_URL=https://axto.io

# Set NEXT_PUBLIC_APP_URL di CF Pages = URL production kamu
# Contoh: NEXT_PUBLIC_APP_URL=https://axto.io
ENVFILE

echo "✅ Tersimpan di .env.generated"
echo ""
echo "🚀 Langkah selanjutnya:"
echo "   1. Copy BUILD_WEBHOOK_SECRET ke GitLab CI Variables"
echo "   2. Copy BUILD_WEBHOOK_SECRET ke CF Pages Variables"
echo "   3. Set DASHBOARD_URL di GitLab CI = URL production kamu"
echo "   4. Push ke main → auto build 12 produk"
echo ""
