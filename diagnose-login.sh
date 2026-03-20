#!/bin/bash
# ============================================================
# AXTO — Login Diagnostics
# Run: CF_API_TOKEN=xxx CF_ACCOUNT_ID=xxx bash diagnose-login.sh
# ============================================================
set -e
NC='\033[0m'; GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; YELLOW='\033[0;33m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${CYAN}➤  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

APP_URL="${APP_URL:-https://axto.io}"

echo ""
info "=== AXTO Login Diagnostics ==="
echo ""

# 1. Check health endpoint
info "1. Checking health endpoint..."
HEALTH=$(curl -sf "${APP_URL}/api/health" 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q '"ok"'; then
  ok "Health check passed"
else
  err "Health check failed: $HEALTH"
fi

# 2. Check wrangler.toml
info "2. Checking wrangler.toml..."
if [ -f "dashboard/wrangler.toml" ]; then
  if grep -q "REPLACE_WITH" dashboard/wrangler.toml; then
    err "wrangler.toml still has placeholder IDs!"
    warn "Run setup.sh or manually replace D1/KV IDs"
  else
    ok "wrangler.toml IDs configured"
  fi
else
  err "dashboard/wrangler.toml not found!"
fi

# 3. Check CF secrets
info "3. Checking Cloudflare Pages secrets..."
if command -v wrangler &>/dev/null && [ -n "$CLOUDFLARE_API_TOKEN" ]; then
  SECRETS=$(wrangler pages secret list --project-name=axto-dashboard 2>/dev/null || echo "")
  for SECRET in JWT_SECRET ENCRYPTION_KEY ADMIN_PASSWORD RESEND_API_KEY; do
    if echo "$SECRETS" | grep -q "$SECRET"; then
      ok "$SECRET: set"
    else
      err "$SECRET: NOT SET"
    fi
  done
else
  warn "Wrangler not available or CF_API_TOKEN not set — skipping"
fi

# 4. Test magic link flow
info "4. Testing auth endpoint..."
AUTH_RES=$(curl -sf -X POST "${APP_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"action":"magic_link","email":"test@test.com"}' 2>/dev/null || echo "FAIL")
if echo "$AUTH_RES" | grep -q '"ok"'; then
  ok "Auth endpoint responding correctly"
else
  err "Auth endpoint error: $AUTH_RES"
fi

echo ""
info "=== Diagnostics Complete ==="
echo ""
