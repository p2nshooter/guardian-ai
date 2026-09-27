# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hello@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
FROM python:3.11-slim-bookworm
# Shared licence state when Studio core and modules run side by side (see *-compose.yml).
RUN mkdir -p /axto-state && chmod 1777 /axto-state

LABEL maintainer="AXTO Platform <hello@axto.io>"
LABEL description="AXTO GPU Studio — Self-Hosted Creative AI Workspace"
LABEL version="2.0.0"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /gpu-studio

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

RUN mkdir -p /gpu-studio/data /gpu-studio/logs /gpu-studio/config

RUN useradd -r -u 1001 -g root axto && \
    chown -R axto:root /gpu-studio && chmod -R g=u /gpu-studio
USER axto

EXPOSE 8092

ENV AXTO_STATE_DIR=/gpu-studio/data/.axto
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:8092/health', timeout=8)" || exit 1

CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8092"]
