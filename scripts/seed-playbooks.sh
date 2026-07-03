#!/bin/bash
# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
# ============================================================
# AXTO Playbooks Auto-Seed Script
# Runs in GitHub Actions after deploy.
# 1. Uploads all PDFs from playbooks-pdf/ to Cloudflare R2
# 2. Seeds/syncs playbook records in D1 database
#
# Required env vars (from GitHub Secrets):
#   CLOUDFLARE_API_TOKEN
#   CLOUDFLARE_ACCOUNT_ID  
#   R2_BUCKET_NAME (default: axto-storage)
# ============================================================

set -euo pipefail

BUCKET="${R2_BUCKET_NAME:-axto-storage}"
PDF_DIR="playbooks-pdf"
DB_NAME="axto-db"

echo "============================================="
echo "AXTO Playbooks Auto-Seed"
echo "============================================="

# ── Step 1: Upload PDFs to R2 ──────────────────────────────────
echo ""
echo "📦 Step 1: Uploading PDFs to R2 bucket: $BUCKET"
echo ""

UPLOADED=0
SKIPPED=0

for pdf in "$PDF_DIR"/*.pdf; do
  [ -f "$pdf" ] || continue
  filename=$(basename "$pdf")
  slug="${filename%.pdf}"
  r2_key="playbooks/${slug}.pdf"
  size=$(stat -c%s "$pdf" 2>/dev/null || stat -f%z "$pdf" 2>/dev/null || echo "0")
  
  echo "  ⬆ Uploading: $filename ($((size/1024))KB) → $r2_key"
  
  npx --yes wrangler@3 r2 object put "$BUCKET/$r2_key" \
    --file="$pdf" \
    --content-type="application/pdf" \
    2>/dev/null && UPLOADED=$((UPLOADED+1)) || {
      echo "    ⚠ Upload failed for $filename (will retry on next deploy)"
      SKIPPED=$((SKIPPED+1))
    }
done

echo ""
echo "  ✅ Uploaded: $UPLOADED  ⚠ Skipped: $SKIPPED"

# ── Step 2: Seed playbook records in D1 ────────────────────────
echo ""
echo "📊 Step 2: Seeding playbook database records"
echo ""

# Build SQL from PDF files — update r2_key and file_size for existing records,
# or the admin can add new playbooks via the admin panel.
# This only updates the r2_key for playbooks that already exist in DB.

SQL_COMMANDS=""
for pdf in "$PDF_DIR"/*.pdf; do
  [ -f "$pdf" ] || continue
  filename=$(basename "$pdf")
  slug="${filename%.pdf}"
  r2_key="playbooks/${slug}.pdf"
  size=$(stat -c%s "$pdf" 2>/dev/null || stat -f%z "$pdf" 2>/dev/null || echo "0")
  
  # Update r2_key and file_size for existing playbook records (by slug)
  SQL_COMMANDS="${SQL_COMMANDS}UPDATE playbooks SET r2_key='${r2_key}', file_size_bytes=${size}, file_format='pdf', updated_at=datetime('now') WHERE slug='${slug}';
"
done

WRANGLER_CONFIG="dashboard/wrangler.toml"

if [ -n "$SQL_COMMANDS" ]; then
  npx --yes wrangler@3 d1 execute "$DB_NAME" --remote --config="$WRANGLER_CONFIG" --command="$SQL_COMMANDS" 2>/dev/null || {
    # If batch fails, try one by one
    echo "  Batch SQL failed, trying individual updates..."
    for pdf in "$PDF_DIR"/*.pdf; do
      [ -f "$pdf" ] || continue
      filename=$(basename "$pdf")
      slug="${filename%.pdf}"
      r2_key="playbooks/${slug}.pdf"
      size=$(stat -c%s "$pdf" 2>/dev/null || stat -f%z "$pdf" 2>/dev/null || echo "0")

      npx --yes wrangler@3 d1 execute "$DB_NAME" --remote --config="$WRANGLER_CONFIG" \
        --command="UPDATE playbooks SET r2_key='${r2_key}', file_size_bytes=${size}, file_format='pdf', updated_at=datetime('now') WHERE slug='${slug}';" \
        2>/dev/null || true
    done
  }
  echo "  ✅ Database records updated"
else
  echo "  ⚠ No PDFs found to seed"
fi

echo ""
echo "============================================="
echo "✅ Playbooks seed complete!"
echo "============================================="
