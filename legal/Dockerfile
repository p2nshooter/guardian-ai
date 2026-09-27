# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) — Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Product: AXTO Legal — Enterprise AI Legal & Compliance Platform
# ==============================================================================
FROM python:3.11-slim-bookworm

LABEL maintainer="Axto AI <hello@axto.io>"
LABEL vendor="AXTO (axto.io)"
LABEL product="AXTO Legal"
LABEL version="1.0.0"
LABEL description="Enterprise AI Legal & Compliance Platform. 18 AI Workspaces. 195+ Jurisdictions. Copyright (c) 2024-2026 Axto AI."

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

ENV AXTO_STATE_DIR=/legal/data/.axto
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:8096/health', timeout=8)" || exit 1

CMD ["python", "-m", "src"]
