# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) — Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
# ==============================================================================
FROM python:3.11-slim

LABEL maintainer="Yusron Efendi <hallo@axto.io>"
LABEL vendor="AXTO (axto.io)"
LABEL product="AXTO Legal"
LABEL version="1.0.0"
LABEL description="Enterprise AI Legal & Compliance Platform. 18 AI Workspaces. 195+ Jurisdictions. Copyright (c) 2024-2026 Yusron Efendi."

WORKDIR /legal

RUN groupadd -r axto && useradd -r -g axto axto

RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY connectors/ ./connectors/

RUN mkdir -p /legal/data/uploads /legal/data/outputs /legal/data/index && \
    chown -R axto:axto /legal

USER axto

EXPOSE 8096

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -sf http://localhost:8096/health || exit 1

CMD ["python", "-m", "src"]
