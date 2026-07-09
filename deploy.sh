#!/bin/bash
# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
# AXTO Platform — Manual Deploy Script
# Usage: ./deploy.sh [--workers-only|--db-only|--skip-docker]
#
# NOTE: Dashboard (CF Pages) di-deploy otomatis saat push ke GitLab main.
#       Script ini untuk: D1 migrations, CF Workers, Docker images, R2 updates.
set -e
NC='\033[0m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }
info() { echo -e "${CYAN}➤  $1${NC}"; }

DO_WORKERS=true; DO_DB=true; DO_DOCKER=true
for arg in "$@"; do
  case $arg in
    --workers-only) DO_DB=false; DO_DOCKER=false ;;
    --db-only)      DO_WORKERS=false; DO_DOCKER=false ;;
    --skip-docker)  DO_DOCKER=false ;;
  esac
done

command -v wrangler &>/dev/null || err "Install wrangler: npm install -g wrangler"
[ -z "$CF_API_TOKEN" ]  && err "CF_API_TOKEN tidak di-set"
[ -z "$CF_ACCOUNT_ID" ] && err "CF_ACCOUNT_ID tidak di-set"
export CLOUDFLARE_API_TOKEN="$CF_API_TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"

if $DO_DB; then
  info "D1 migrations..."
  cd dashboard && wrangler d1 migrations apply axto-db --remote && cd ..
  ok "D1 done"
fi

if $DO_WORKERS; then
  info "Deploy CF Workers..."
  cd cloudflare && wrangler deploy --env production && cd ..
  cd cloudflare-workers && wrangler deploy --config wrangler-autopost.toml && cd ..

  info "Upload threat feed → R2..."
  wrangler r2 object put guardian-threat-feed/malicious_ips.json     --file=threat-feed/malicious_ips.json     --content-type=application/json
  wrangler r2 object put guardian-threat-feed/malicious_domains.json --file=threat-feed/malicious_domains.json --content-type=application/json
  wrangler r2 object put guardian-threat-feed/malware_hashes.json    --file=threat-feed/malware_hashes.json    --content-type=application/json
  ok "Workers + R2 done"
fi

echo ""
ok "Deploy Complete"
echo ""
echo "  🌐 Dashboard : https://axto.io  (di-build otomatis oleh CF Pages)"
echo "  ☁️  Workers   : https://dash.cloudflare.com → Workers & Pages"
