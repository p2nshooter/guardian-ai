#!/usr/bin/env bash
# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
# AXTO 5 Products — Health Check Script
# Usage: bash health-check.sh [product|all]
set -euo pipefail
PRODUCTS=(vault soc compliance edge sentinel)
PORTS=([vault]=8091 [soc]=8092 [compliance]=8093 [edge]=8094 [sentinel]=8095)

check_product() {
    local P=$1
    local PORT=${PORTS[$P]:-0}
    local URL="http://localhost:${PORT}/health"
    local RESULT
    if RESULT=$(curl -sf --max-time 5 "${URL}" 2>/dev/null); then
        local STATUS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))")
        local LIC=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✓' if d.get('license_valid') else '!')")
        printf "  %-12s  port %-5s  status=%-4s  license=%s\n" "$P" "$PORT" "$STATUS" "$LIC"
    else
        printf "  %-12s  port %-5s  ✗ NOT RESPONDING\n" "$P" "$PORT"
    fi
}

PRODUCT="${1:-all}"
echo ""
echo "=== AXTO 5 Products Health Check ==="
echo ""
if [[ "$PRODUCT" == "all" ]]; then
    for P in "${PRODUCTS[@]}"; do check_product "$P"; done
else
    check_product "$PRODUCT"
fi
echo ""
echo "Legend: status=ok ✓ (license valid) | ✗ (down) | ! (license issue)"
