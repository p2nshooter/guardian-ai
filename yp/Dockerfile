# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
FROM python:3.11-slim

LABEL org.opencontainers.image.title="Yusron Power"
LABEL org.opencontainers.image.description="Yusron Power — Super-Enterprise Unified AI Platform (all AXTO capabilities in one app, 100% BYOK)"
LABEL org.opencontainers.image.licenses="Commercial"
LABEL io.axto.product="yp"
LABEL io.axto.version="1.0.0"

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ python3-dev libssl-dev libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /yp

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt \
 && apt-get purge -y gcc g++ python3-dev libssl-dev libffi-dev \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* /root/.cache/pip

COPY src/ ./src/

RUN mkdir -p /yp/data /yp/logs /yp/config

EXPOSE 8100

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8100/health || exit 1

CMD ["python", "-m", "uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8100"]
