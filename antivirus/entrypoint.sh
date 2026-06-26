#!/bin/bash
# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
set -e

echo "🦠 AXTO Guardian Antivirus — Starting..."
echo ""

# 1. Update ClamAV virus definitions
echo "📥 [1/3] Updating ClamAV virus definitions..."
freshclam --quiet 2>/dev/null || {
    echo "⚠️  freshclam failed — starting with existing definitions"
    echo "   (first run may take a few minutes to download)"
    freshclam --no-dns &
}

# 2. Start ClamAV daemon in background
echo "🦠 [2/3] Starting ClamAV daemon..."
clamd &
CLAMD_PID=$!

# Wait for clamd to be ready (max 60 seconds)
WAIT=0
while [ $WAIT -lt 60 ]; do
    if echo "PING" | nc -q 1 127.0.0.1 3310 2>/dev/null | grep -q "PONG"; then
        echo "✅ ClamAV daemon ready"
        break
    fi
    sleep 2
    WAIT=$((WAIT + 2))
done

if [ $WAIT -ge 60 ]; then
    echo "⚠️  ClamAV daemon slow to start — API will start in standalone mode"
fi

# 3. Start Python antivirus API
echo "🚀 [3/3] Starting AXTO Guardian Antivirus API on port ${AV_PORT:-8090}..."
echo ""
exec python -m uvicorn src.api:app --host 0.0.0.0 --port ${AV_PORT:-8090} --log-level info
