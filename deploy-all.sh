#!/usr/bin/env bash
# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; }
STATE_FILE="$SCRIPT_DIR/.deploy-state"
touch "$STATE_FILE"
is_done() { grep -qx "$1" "$STATE_FILE" 2>/dev/null; }
mark_done() { echo "$1" >> "$STATE_FILE"; }
MODE="${1:-full}"
if [[ "$MODE" == "full" ]]; then > "$STATE_FILE"; fi
R2_BUCKET="axto-builds"
echo ""
echo "==============================================================="
echo "   AXTO Master Deploy (Local -> Cloudflare)"
echo "==============================================================="
echo ""
if ! docker info &>/dev/null; then warn "Docker not running (OK - product builds disabled)"; else ok "Docker running"; fi
if ! command -v node &>/dev/null; then fail "Node.js not found!"; exit 1; fi
ok "Node.js $(node -v)"
cd "$SCRIPT_DIR/dashboard"
if ! npx wrangler whoami &>/dev/null 2>&1; then
  warn "Not logged in to Cloudflare"
  npx wrangler login
fi
ok "Cloudflare authenticated"
cd "$SCRIPT_DIR"
echo ""
echo "--- PHASE 1: Dashboard -> Cloudflare Pages ---"
if is_done "dashboard"; then
  ok "Dashboard already deployed - skipping"
else
  info "Building dashboard inside Docker (avoids Windows issues)..."
  docker run --rm -v "$(pwd)/dashboard":/app -w /app node:20-alpine \
    sh -c "apk add --no-cache git bash && npm ci && npx @cloudflare/next-on-pages"
  if [[ $? -ne 0 ]]; then fail "Dashboard build failed!"; exit 1; fi
  ok "Dashboard built"
  info "Deploying to Cloudflare Pages..."
  cd "$SCRIPT_DIR/dashboard"
  npx wrangler pages deploy .vercel/output/static --project-name=axto-dashboard --branch=main
  if [[ $? -ne 0 ]]; then fail "Dashboard deploy failed!"; exit 1; fi
  ok "Dashboard deployed!"
  mark_done "dashboard"
  cd "$SCRIPT_DIR"
fi
echo ""
echo "--- PHASE 2: D1 Migrations ---"
if is_done "migrations"; then
  ok "Migrations done - skipping"
else
  cd "$SCRIPT_DIR/dashboard"
  npx wrangler d1 migrations apply axto-db --remote 2>&1 || warn "Some already applied"
  ok "Migrations done!"
  mark_done "migrations"
  cd "$SCRIPT_DIR"
fi
# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3 & 4: Docker Images & Product Builds — TEMPORARILY DISABLED
# Uncomment when ready to deploy products to VPS/Docker
# For now, only CF Pages (dashboard) auto-deploys via GitLab CI
# ═══════════════════════════════════════════════════════════════════════════
SUCCEEDED=0; FAILED=0; SKIPPED=0; FAILED_LIST=""
echo ""
warn "--- PHASE 3: Docker Images -> R2 [DISABLED — sementara skip] ---"
warn "--- PHASE 4: Update D1 Database [DISABLED — sementara skip] ---"
warn "Product builds disabled. Hanya CF Pages yang auto-deploy."
warn "Untuk enable kembali, edit deploy-all.sh dan uncomment Phase 3 & 4."
echo ""

# --- DISABLED PHASE 3 START ---
# build_product() {
#   local P="$1" TAG="axto/${1}:latest" R2K="builds/latest/raw/${1}.tar.gz" TAR="${1}.tar.gz"
#   echo ""
#   echo ">>> Building: ${P}"
#   if is_done "$P"; then ok "$P - skipping"; SKIPPED=$((SKIPPED+1)); return 0; fi
#   local DF="" CTX=""
#   case "$P" in
#     guardian-core)        DF="engine/Dockerfile";                CTX="engine";;
#     guardian-node)        DF="engine/Dockerfile.node";           CTX="engine";;
#     guardian-antivirus)   DF="antivirus/Dockerfile";             CTX="antivirus";;
#     orchestra-core)       DF="orchestra/Dockerfile";             CTX="orchestra";;
#     orchestra-worker-cpu) DF="orchestra/Dockerfile.worker-cpu";  CTX="orchestra";;
#     orchestra-worker-gpu) DF="orchestra/Dockerfile.worker-gpu";  CTX="orchestra";;
#   esac
#   info "[$P] docker build..."
#   if ! docker build -t "$TAG" -f "$DF" "$CTX"; then
#     fail "[$P] BUILD FAILED"; FAILED=$((FAILED+1)); FAILED_LIST="${FAILED_LIST} ${P}"; return 1; fi
#   ok "[$P] Image built"
#   info "[$P] Saving tar.gz..."
#   if ! docker save "$TAG" | gzip -1 > "$TAR"; then
#     fail "[$P] SAVE FAILED"; FAILED=$((FAILED+1)); FAILED_LIST="${FAILED_LIST} ${P}"; return 1; fi
#   local SZ; SZ=$(du -sh "$TAR" | cut -f1)
#   ok "[$P] Saved: $SZ"
#   info "[$P] Uploading to R2..."
#   cd "$SCRIPT_DIR/dashboard"
#   if ! npx wrangler r2 object put "${R2_BUCKET}/${R2K}" --file="../${TAR}" --content-type="application/gzip"; then
#     fail "[$P] UPLOAD FAILED"; cd "$SCRIPT_DIR"; FAILED=$((FAILED+1)); FAILED_LIST="${FAILED_LIST} ${P}"; return 1; fi
#   cd "$SCRIPT_DIR"
#   rm -f "$TAR"
#   mark_done "$P"; SUCCEEDED=$((SUCCEEDED+1))
#   ok "[$P] -> R2 done ($SZ)"
# }
# for P in guardian-core guardian-node guardian-antivirus orchestra-core orchestra-worker-cpu orchestra-worker-gpu; do
#   build_product "$P" || true
# done
# --- DISABLED PHASE 3 END ---

# --- DISABLED PHASE 4 START ---
# cd "$SCRIPT_DIR/dashboard"
# NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# for P in guardian-core guardian-node guardian-antivirus orchestra-core orchestra-worker-cpu orchestra-worker-gpu; do
#   if is_done "$P"; then
#     BID="build-${P}-$(date +%s)"
#     npx wrangler d1 execute axto-db --remote --command="DELETE FROM product_builds WHERE product='${P}' AND build_type='image';" 2>/dev/null || true
#     npx wrangler d1 execute axto-db --remote --command="INSERT INTO product_builds (id,product,build_type,status,progress,pipeline_id,created_at,updated_at) VALUES ('${BID}','${P}','image','ready',100,'local','${NOW}','${NOW}');" 2>/dev/null || true
#     ok "[$P] DB updated"
#   fi
# done
# cd "$SCRIPT_DIR"
# --- DISABLED PHASE 4 END ---
echo ""
echo "==============================================================="
echo "   DEPLOY COMPLETE (CF Pages Only)"
echo "==============================================================="
echo ""
if is_done "dashboard"; then echo -e "  ${GREEN}OK${NC} dashboard -> axto.io"; fi
if is_done "migrations"; then echo -e "  ${GREEN}OK${NC} D1 migrations"; fi
echo ""
echo -e "  ${YELLOW}NOTE: Product builds (Docker) are DISABLED for now.${NC}"
echo -e "  ${YELLOW}Only CF Pages dashboard auto-deploys.${NC}"
echo ""
echo -e "  ${GREEN}DONE! https://axto.io${NC}"
rm -f "$STATE_FILE"
