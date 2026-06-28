#!/usr/bin/env bash
# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
# AXTO 5 Products — Smoke Test Script
# Tests each product API after installation
set -euo pipefail

PRODUCT="${1:-all}"
FAILED=0

run_test() {
    local name="$1"; local cmd="$2"; local expect="$3"
    local result
    result=$(eval "$cmd" 2>/dev/null || echo "FAILED")
    if echo "$result" | grep -q "$expect"; then
        echo "  ✅ $name"
    else
        echo "  ❌ $name (expected: $expect, got: ${result:0:100})"
        FAILED=$((FAILED+1))
    fi
}

test_vault() {
    echo "=== AXTO Vault (port 8091) ==="
    run_test "Health endpoint"         "curl -sf http://localhost:8091/health"         '"status":"ok"'
    run_test "PII scan endpoint"         "curl -sf -X POST http://localhost:8091/v1/scan -H 'Content-Type: application/json' -d '{"text":"test@example.com","use_ai":false}'"         '"total_pii_count"'
    run_test "Mask endpoint"         "curl -sf -X POST http://localhost:8091/v1/mask -H 'Content-Type: application/json' -d '{"text":"phone: 08123456789","use_ai":false}'"         '"masked_text"'
    run_test "Stats endpoint"         "curl -sf http://localhost:8091/v1/stats"         '"scans_24h"'
    run_test "PII types list"         "curl -sf http://localhost:8091/v1/pii-types"         '"email"'
}

test_soc() {
    echo "=== AXTO SOC (port 8092) ==="
    run_test "Health endpoint"         "curl -sf http://localhost:8092/health"         '"status":"ok"'
    run_test "Dashboard endpoint"         "curl -sf http://localhost:8092/v1/dashboard"         '"alerts_24h"'
    run_test "Rules list"         "curl -sf http://localhost:8092/v1/rules"         '"rules"'
    run_test "Ingest endpoint"         "curl -sf -X POST http://localhost:8092/v1/ingest -H 'Content-Type: application/json' -d '{"logs":["test log entry"],"source":"json_api"}'"         '"processed"'
}

test_compliance() {
    echo "=== AXTO Compliance (port 8093) ==="
    run_test "Health endpoint"         "curl -sf http://localhost:8093/health"         '"status":"ok"'
    run_test "Framework list"         "curl -sf http://localhost:8093/v1/frameworks"         '"soc2"'
    run_test "Summary endpoint"         "curl -sf http://localhost:8093/v1/summary"         '"frameworks_enabled"'
}

test_edge() {
    echo "=== AXTO Edge (port 8094) ==="
    run_test "Health endpoint"         "curl -sf http://localhost:8094/health"         '"status":"ok"'
    run_test "Models list"         "curl -sf http://localhost:8094/v1/models"         '"object":"list"'
    run_test "Stats endpoint"         "curl -sf http://localhost:8094/v1/stats"         '"requests_24h"'
    run_test "Cache stats"         "curl -sf http://localhost:8094/v1/cache/stats"         '"entries"'
}

test_sentinel() {
    echo "=== AXTO Sentinel (port 8095) ==="
    run_test "Health endpoint"         "curl -sf http://localhost:8095/health"         '"status":"ok"'
    run_test "Dashboard endpoint"         "curl -sf http://localhost:8095/v1/dashboard"         '"total_devices"'
    run_test "Devices list"         "curl -sf http://localhost:8095/v1/devices"         '"devices"'
}

case "$PRODUCT" in
    vault)      test_vault ;;
    soc)        test_soc ;;
    compliance) test_compliance ;;
    edge)       test_edge ;;
    sentinel)   test_sentinel ;;
    all)
        test_vault; test_soc; test_compliance; test_edge; test_sentinel
        ;;
    *)
        echo "Unknown product: $PRODUCT"
        echo "Usage: bash smoke-test.sh [vault|soc|compliance|edge|sentinel|all]"
        exit 1
        ;;
esac

echo ""
if [[ $FAILED -eq 0 ]]; then
    echo "✅ All smoke tests passed!"
else
    echo "❌ $FAILED test(s) failed. Check logs: docker logs axto-<product>"
    exit 1
fi
