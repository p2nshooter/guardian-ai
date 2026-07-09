# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
# ═══════════════════════════════════════════════════════════════════════════════
# AXTO Guardian Antivirus — Standalone World-Class Engine
# ClamAV daemon + Python multi-engine scanner + REST API + Self-learning
# Works INDEPENDENTLY — no guardian-node required
# ═══════════════════════════════════════════════════════════════════════════════
FROM python:3.11-slim

LABEL org.opencontainers.image.title="AXTO Guardian Antivirus"
LABEL org.opencontainers.image.description="World-class standalone antivirus with ClamAV + AI learning"

# Install ClamAV daemon + deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    clamav clamav-daemon clamav-freshclam \
    curl procps \
    && rm -rf /var/lib/apt/lists/*

# Configure ClamAV daemon
RUN mkdir -p /var/run/clamav /var/log/clamav /var/lib/clamav \
    && chown -R clamav:clamav /var/run/clamav /var/log/clamav /var/lib/clamav \
    && sed -i 's/^Foreground .*/Foreground true/' /etc/clamav/clamd.conf 2>/dev/null || true \
    && sed -i 's/^TCPSocket .*/TCPSocket 3310/' /etc/clamav/clamd.conf 2>/dev/null || true \
    && sed -i 's/^TCPAddr .*/TCPAddr 127.0.0.1/' /etc/clamav/clamd.conf 2>/dev/null || true \
    && echo "TCPSocket 3310" >> /etc/clamav/clamd.conf \
    && echo "TCPAddr 127.0.0.1" >> /etc/clamav/clamd.conf \
    && echo "MaxFileSize 500M" >> /etc/clamav/clamd.conf \
    && echo "MaxScanSize 500M" >> /etc/clamav/clamd.conf \
    && echo "StreamMaxLength 500M" >> /etc/clamav/clamd.conf

WORKDIR /guardian

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

RUN mkdir -p /guardian/data /guardian/data/quarantine /guardian/config /guardian/logs

# Startup script: freshclam → clamd → python API
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8090/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
