# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
# ═══════════════════════════════════════════════════════════════════════════════
# AXTO SOC — Security Operations Center
# registry.gitlab.com/axto-platform/soc-engine/soc-engine:latest
# ghcr.io/your-org/soc-engine:latest
# ═══════════════════════════════════════════════════════════════════════════════
FROM python:3.11-slim

LABEL org.opencontainers.image.title="AXTO SOC"
LABEL org.opencontainers.image.description="Security Operations Center"
LABEL org.opencontainers.image.vendor="AXTO Platform"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/your-org/soc-engine"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl procps net-tools iproute2 iputils-ping iptables \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /soc

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

RUN mkdir -p /soc/data /soc/config /soc/logs

EXPOSE 8092

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD curl -sf http://localhost:8092/health || exit 1

CMD ["python", "-m", "src"]
