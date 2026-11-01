#!/usr/bin/env bash
# ==============================================================================
# Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
# ==============================================================================
# Upload one file to Cloudflare R2 with the settings R2 needs and a retry.
#   Usage: bash scripts/ci/r2-put.sh <local file> <bucket/key> [content-type]
#   Env:   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, CF_ACCOUNT_ID
#
# Why: recent AWS CLI releases add default CRC checksums to multipart uploads,
# which R2 intermittently rejects on CompleteMultipartUpload ("InvalidPart").
# Checksums are therefore sent only when required, parts are 64 MB (fewer
# parts for multi-GB images) and a failed upload is retried from scratch.
# ==============================================================================
set -uo pipefail
src="$1"; dst="$2"; ctype="${3:-}"
[ -f "$src" ] || { echo "r2-put: $src not found" >&2; exit 1; }
: "${CF_ACCOUNT_ID:?CF_ACCOUNT_ID is required}"
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"
command -v aws >/dev/null 2>&1 || pip install -q "awscli>=1.32"
aws configure set default.s3.multipart_chunksize 64MB >/dev/null 2>&1 || true
aws configure set default.s3.multipart_threshold 64MB >/dev/null 2>&1 || true

extra=()
[ -n "$ctype" ] && extra+=(--content-type "$ctype")
for attempt in 1 2 3; do
  if aws s3 cp "$src" "s3://${dst}" --endpoint-url "https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com" \
       --no-progress --only-show-errors "${extra[@]}"; then
    echo "☁️  $(basename "$src") → r2://${dst}"
    exit 0
  fi
  echo "::warning::R2 upload attempt ${attempt} failed for ${dst}; retrying…"
  sleep $((attempt * 5))
done
echo "::error::R2 upload failed after 3 attempts: ${dst}"
exit 1
