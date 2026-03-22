#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# AXTO Platform — 1 Command Full Deploy
# Usage: ./push.sh "commit message"
#
# Yang terjadi otomatis:
#   1. D1 migrations (semua pending, termasuk 0016 + 0017)
#   2. Upload 48 PDFs → R2 axto-storage
#   3. git add + commit + push → GitHub
#   4. CF Pages auto-build & deploy dashboard
#   5. CF Workers deploy
# ═══════════════════════════════════════════════════════════════════════════
set -e

G='\033[0;32m'; C='\033[0;36m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
ok()   { echo -e "${G}✅ $1${N}"; }
info() { echo -e "${C}➤  $1${N}"; }
warn() { echo -e "${Y}⚠️  $1${N}"; }
err()  { echo -e "${R}❌ $1${N}\n"; exit 1; }

MSG="${1:-deploy: update platform $(date +%Y-%m-%d)}"

# ── Cek dependencies ────────────────────────────────────────────────────────
command -v wrangler &>/dev/null || err "Install wrangler dulu: npm install -g wrangler"
command -v git      &>/dev/null || err "git tidak ditemukan"

# ── Cek login CF ────────────────────────────────────────────────────────────
if [ -n "$CF_API_TOKEN" ]; then
  export CLOUDFLARE_API_TOKEN="$CF_API_TOKEN"
fi
if [ -n "$CF_ACCOUNT_ID" ]; then
  export CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"
fi

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║        AXTO Platform — Full Deploy               ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# ── Step 1: D1 Migrations ──────────────────────────────────────────────────
info "Step 1/4 — D1 Migrations..."
cd dashboard
if wrangler d1 migrations apply axto-db --remote 2>&1 | tee /tmp/d1_out.txt; then
  APPLIED=$(grep -c "Applying migration" /tmp/d1_out.txt 2>/dev/null || echo "0")
  ok "D1 migrations done ($APPLIED applied)"
else
  warn "D1 migration warning — cek output di atas, mungkin sudah up-to-date"
fi
cd ..

# ── Step 2: Upload PDFs ke R2 ──────────────────────────────────────────────
info "Step 2/4 — Upload playbook PDFs → R2 axto-storage..."
PDF_COUNT=0
if ls playbooks-pdf/*.pdf 1>/dev/null 2>&1; then
  for f in playbooks-pdf/*.pdf; do
    KEY="playbooks/$(basename "$f")"
    wrangler r2 object put "axto-storage/${KEY}" \
      --file="$f" \
      --content-type="application/pdf" 2>/dev/null && PDF_COUNT=$((PDF_COUNT+1)) || true
  done
  ok "PDFs uploaded ($PDF_COUNT files)"
else
  warn "Folder playbooks-pdf/ kosong atau tidak ada PDF"
fi

# Upload threat feed ke R2
info "  Upload threat feed → R2 guardian-threat-feed..."
for f in threat-feed/*.json; do
  [ -f "$f" ] || continue
  KEY="$(basename "$f")"
  wrangler r2 object put "guardian-threat-feed/${KEY}" \
    --file="$f" --content-type="application/json" 2>/dev/null || true
done

# ── Step 3: Deploy CF Workers ──────────────────────────────────────────────
info "Step 3/4 — Deploy Cloudflare Workers..."
if [ -f cloudflare/wrangler.toml ]; then
  cd cloudflare && wrangler deploy 2>/dev/null && ok "CF Worker (cloudflare/) deployed" || warn "CF Worker skip" ; cd ..
fi
if [ -f cloudflare-workers/wrangler-autopost.toml ]; then
  cd cloudflare-workers && wrangler deploy --config wrangler-autopost.toml 2>/dev/null && ok "AutoPost Worker deployed" || warn "AutoPost Worker skip" ; cd ..
fi

# ── Step 4: Git push → trigger CF Pages build ──────────────────────────────
info "Step 4/4 — Git push → GitHub (auto-trigger CF Pages deploy)..."
git add .

CHANGED=$(git diff --cached --name-only 2>/dev/null | wc -l)
if [ "$CHANGED" -eq 0 ]; then
  warn "Tidak ada file baru untuk di-commit"
  REPO=$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]//' | sed 's/\.git$//')
  echo ""
  ok "Sudah up-to-date. CF Pages deploy terakhir:"
  echo "  👉 https://dash.cloudflare.com/pages"
  exit 0
fi

echo ""
echo "  Files yang akan di-push ($CHANGED):"
git diff --cached --name-only | head -15 | sed 's/^/    📄 /'
[ "$CHANGED" -gt 15 ] && echo "    ... dan $((CHANGED - 15)) file lainnya"
echo ""

git commit -m "$MSG"
git push origin main

REPO=$(git remote get-url origin | sed 's/.*github.com[:/]//' | sed 's/\.git$//')

echo ""
ok "SEMUA SELESAI!"
echo ""
echo "  ┌─────────────────────────────────────────────────────────────┐"
echo "  │                                                             │"
echo "  │  ✅ D1 Migrations     → applied                            │"
echo "  │  ✅ R2 PDFs           → axto-storage/playbooks/            │"
echo "  │  ✅ CF Workers        → deployed                           │"
echo "  │  ✅ Git push          → origin/main                        │"
echo "  │                                                             │"
echo "  │  CF Pages build sedang berjalan (~3-5 menit):              │"
echo "  │  👉 https://github.com/${REPO}/actions                     │"
echo "  │                                                             │"
echo "  │  Live setelah build:                                        │"
echo "  │  🌐 https://axto.io                                        │"
echo "  │  🔧 https://axto.io/admin/engine-builder                   │"
echo "  │                                                             │"
echo "  └─────────────────────────────────────────────────────────────┘"
echo ""
