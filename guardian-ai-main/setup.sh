#!/bin/bash
# ============================================================
# AXTO Platform — First-Time Setup
# Run: CF_API_TOKEN=xxx CF_ACCOUNT_ID=xxx bash setup.sh
# ============================================================
set -e
GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${CYAN}➤  $1${NC}"; }

echo ""
info "=== AXTO Platform Setup ==="
echo ""

cd dashboard 2>/dev/null || true

# D1 Database
info "Creating D1 database..."
D1_OUTPUT=$(wrangler d1 create axto-db 2>&1 || true)
echo "$D1_OUTPUT"
D1_ID=$(echo "$D1_OUTPUT" | grep -o 'database_id = "[^"]*"' | sed 's/.*"//;s/"//' | head -1)
[ -n "$D1_ID" ] && ok "D1 ID: $D1_ID" || info "D1 may already exist"

# KV Namespace
info "Creating KV namespace..."
KV_OUTPUT=$(wrangler kv namespace create KV 2>&1 || true)
echo "$KV_OUTPUT"
KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | sed 's/.*"//;s/"//' | head -1)
[ -n "$KV_ID" ] && ok "KV ID: $KV_ID"

# R2 Buckets
info "Creating R2 buckets..."
wrangler r2 bucket create axto-storage 2>&1 | tail -1 || true
wrangler r2 bucket create guardian-threat-feed 2>&1 | tail -1 || true
ok "R2 buckets ready"

# Patch wrangler.toml
if [ -n "$D1_ID" ] || [ -n "$KV_ID" ]; then
  info "Patching wrangler.toml..."
  [ -n "$D1_ID" ] && sed -i "s|REPLACE_WITH_YOUR_D1_ID|$D1_ID|g" wrangler.toml
  [ -n "$KV_ID" ] && sed -i "s|REPLACE_WITH_YOUR_KV_ID|$KV_ID|g" wrangler.toml
  ok "wrangler.toml patched"
fi

# CF Pages Project
info "Creating CF Pages project..."
wrangler pages project create axto-dashboard --production-branch=main 2>&1 | tail -2 || true
ok "CF Pages project ready"

# D1 Migrations
info "Running D1 migrations..."
wrangler d1 migrations apply axto-db --remote 2>&1 || true
ok "D1 migrations applied"

# Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

info "Setting secrets..."
echo "$JWT_SECRET" | wrangler pages secret put JWT_SECRET --project-name=axto-dashboard 2>/dev/null || true
echo "$ENCRYPTION_KEY" | wrangler pages secret put ENCRYPTION_KEY --project-name=axto-dashboard 2>/dev/null || true
ok "Secrets set"

# Create admin user
info "Enter admin email:"
read -r ADMIN_EMAIL
ADMIN_ID=$(openssl rand -hex 16)
wrangler d1 execute axto-db --remote --command="INSERT OR IGNORE INTO users (id, email, role, created_at) VALUES ('$ADMIN_ID', '$ADMIN_EMAIL', 'admin', datetime('now'))" 2>/dev/null || true
ok "Admin user created: $ADMIN_EMAIL"

echo ""
ok "=== Setup Complete ==="
info "Next steps:"
echo "  1. Set remaining secrets: ADMIN_PASSWORD, RESEND_API_KEY, CRON_SECRET"
echo "  2. Push to GitHub and configure Actions secrets"
echo "  3. Add custom domain in CF Dashboard"
echo "  4. Visit https://axto.io/auth/login"
echo ""
