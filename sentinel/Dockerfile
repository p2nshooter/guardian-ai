# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
FROM python:3.11-slim-bookworm
LABEL org.opencontainers.image.title="AXTO Sentinel Engine"
LABEL org.opencontainers.image.description="AXTO Sentinel — IoT/OT Security: Device discovery, OT protocol detection, CVE tracking, risk scoring"
LABEL org.opencontainers.image.licenses="Commercial"
LABEL io.axto.product="sentinel"
LABEL io.axto.version="1.0.0"
RUN apt-get update && apt-get install -y --no-install-recommends gcc g++ curl && rm -rf /var/lib/apt/lists/*
WORKDIR /sentinel
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt && apt-get purge -y gcc g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* /root/.cache/pip
COPY src/ ./src/
RUN mkdir -p /sentinel/data /sentinel/logs
EXPOSE 8095
ENV AXTO_STATE_DIR=/sentinel/data/.axto
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('SENTINEL_PORT', '8095') + '/health', timeout=8)" || exit 1
CMD ["python", "-m", "src"]
