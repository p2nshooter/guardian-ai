# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
# ═══════════════════════════════════════════════════════════════════════════════
# AXTO Edge — AI Gateway & API Management
# registry.gitlab.com/axto-platform/edge-engine/edge-engine:latest
# ghcr.io/your-org/edge-engine:latest
# ═══════════════════════════════════════════════════════════════════════════════
FROM python:3.11-slim

LABEL org.opencontainers.image.title="AXTO Edge"
LABEL org.opencontainers.image.description="AI Gateway & API Management"
LABEL org.opencontainers.image.vendor="AXTO Platform"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/your-org/edge-engine"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl procps net-tools iproute2 iputils-ping iptables \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /edge

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

RUN mkdir -p /edge/data /edge/config /edge/logs

EXPOSE 8094

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD curl -sf http://localhost:8094/health || exit 1

CMD ["python", "-m", "src"]
