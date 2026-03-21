export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file }   = await params;
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
  const ghcrOwner  = process.env.GHCR_OWNER || "p2nshooter";

  const files: Record<string, { content: string; type: string; filename: string }> = {
    "docker-compose.yml": {
      filename: "docker-compose.yml", type: "application/yaml",
      content: `version: "3.9"
# AXTO Guardian AI — Production Docker Compose
# Database PostgreSQL berjalan LOKAL di server Anda (inside compose)
# GHCR: ghcr.io/${ghcrOwner}/guardian-engine:latest
services:

  guardian-db:
    image: postgres:16-alpine
    container_name: guardian-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: guardian
      POSTGRES_USER: guardian
      POSTGRES_PASSWORD: \${GUARDIAN_DB_PASSWORD:-guardian-change-me}
    volumes:
      - guardian-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U guardian"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [guardian-net]

  guardian-core:
    image: ghcr.io/${ghcrOwner}/guardian-engine:latest
    container_name: guardian-core
    restart: unless-stopped
    command: uvicorn src.api:app --host 0.0.0.0 --port 8080
    ports: ["8080:8080"]
    depends_on:
      guardian-db:
        condition: service_healthy
    volumes:
      - ./guardian.yml:/guardian/config/guardian.yml:ro
      - guardian-data:/guardian/data
      - guardian-logs:/guardian/logs
    environment:
      - GUARDIAN_CONFIG=/guardian/config/guardian.yml
      - GUARDIAN_DB_URL=postgresql://guardian:\${GUARDIAN_DB_PASSWORD:-guardian-change-me}@guardian-db:5432/guardian
      - GUARDIAN_ROLE=core
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks: [guardian-net]

  guardian-node:
    image: ghcr.io/${ghcrOwner}/guardian-engine:latest
    container_name: guardian-node
    restart: unless-stopped
    command: python -m src
    depends_on:
      guardian-core:
        condition: service_healthy
    privileged: true
    cap_add: [NET_ADMIN, SYS_PTRACE, KILL]
    environment:
      - GUARDIAN_CORE_URL=http://guardian-core:8080
      - GUARDIAN_DB_URL=postgresql://guardian:\${GUARDIAN_DB_PASSWORD:-guardian-change-me}@guardian-db:5432/guardian
      - GUARDIAN_NODE_NAME=\${HOSTNAME:-node-1}
      - GUARDIAN_SCAN_MODE=auto
      - GUARDIAN_SCAN_PATHS=/host,/tmp
    volumes:
      - /:/host:ro
      - /tmp:/tmp
      - guardian-quarantine:/guardian/quarantine
      - ./guardian.yml:/guardian/config/guardian.yml:ro
    networks: [guardian-net]

volumes:
  guardian-db-data:
  guardian-data:
  guardian-logs:
  guardian-quarantine:

networks:
  guardian-net:
    driver: bridge
`,
    },
    "guardian.example.yml": {
      filename: "guardian.example.yml", type: "application/yaml",
      content: `guardian:
  license_key: "GUARD-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  license_validate_url: "${appUrl}/api/license-validate"
  scan_mode: "auto"
  scan_interval: 300
  scan_paths:
    - /host
    - /tmp
    - /var/www

  # BYOK: AI keys tinggal di server Anda — tidak keluar ke AXTO
  ai_pool:
    routing: cost
    fallback: true
    vendors:
      - provider: openai
        api_key: "sk-REPLACE_ME"
        model: "gpt-4o-mini"
      # - provider: anthropic
      #   api_key: "sk-ant-REPLACE_ME"
      # - provider: groq
      #   api_key: "gsk_REPLACE_ME"
      # - provider: ollama
      #   base_url: "http://localhost:11434"
      #   model: "llama3"
`,
    },
    "orchestra-compose.yml": {
      filename: "orchestra-compose.yml", type: "application/yaml",
      content: `version: "3.9"
# AXTO Orchestra AI — Production Docker Compose
# Database PostgreSQL berjalan LOKAL di server Anda (inside compose)
# GHCR: ghcr.io/${ghcrOwner}/orchestra-core:latest
services:

  orchestra-db:
    image: postgres:16-alpine
    container_name: orchestra-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: orchestra
      POSTGRES_USER: orchestra
      POSTGRES_PASSWORD: \${ORCHESTRA_DB_PASSWORD:-orchestra-change-me}
    volumes:
      - orchestra-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orchestra"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [orchestra-net]

  orchestra-core:
    image: ghcr.io/${ghcrOwner}/orchestra-core:latest
    container_name: orchestra-core
    restart: unless-stopped
    ports: ["8080:8080"]
    depends_on:
      orchestra-db:
        condition: service_healthy
    volumes:
      - ./orchestra.yml:/app/config/orchestra.yml:ro
      - orchestra-data:/app/data
    environment:
      - ORCHESTRA_CONFIG=/app/config/orchestra.yml
      - DATABASE_URL=postgresql://orchestra:\${ORCHESTRA_DB_PASSWORD:-orchestra-change-me}@orchestra-db:5432/orchestra
      - ORCHESTRA_CONSOLE_PASSWORD=\${CONSOLE_PASSWORD:-orchestra-console}
      - ORCHESTRA_WORKER_TOKEN=\${WORKER_TOKEN:-orchestra-worker-secret}
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks: [orchestra-net]

  worker-cpu:
    image: ghcr.io/${ghcrOwner}/orchestra-worker-cpu:latest
    container_name: orchestra-worker-cpu-1
    restart: unless-stopped
    environment:
      - ORCHESTRA_CORE_URL=http://orchestra-core:8080
      - ORCHESTRA_WORKER_TOKEN=\${WORKER_TOKEN:-orchestra-worker-secret}
      - WORKER_PROVIDER=groq
      - WORKER_MODEL=llama-3.1-8b-instant
      - WORKER_CONCURRENCY=5
    depends_on:
      orchestra-core:
        condition: service_healthy
    networks: [orchestra-net]

  worker-gpu:
    image: ghcr.io/${ghcrOwner}/orchestra-worker-gpu:latest
    container_name: orchestra-worker-gpu-1
    restart: unless-stopped
    runtime: nvidia
    environment:
      - ORCHESTRA_CORE_URL=http://orchestra-core:8080
      - ORCHESTRA_WORKER_TOKEN=\${WORKER_TOKEN:-orchestra-worker-secret}
      - WORKER_MODEL=llama3.2
      - OLLAMA_BASE_URL=http://localhost:11434
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
    depends_on:
      orchestra-core:
        condition: service_healthy
    networks: [orchestra-net]

volumes:
  orchestra-db-data:
  orchestra-data:

networks:
  orchestra-net:
    driver: bridge
`,
    },
    "orchestra.example.yml": {
      filename: "orchestra.example.yml", type: "application/yaml",
      content: `orchestra:
  license_key: "ORCH-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  license_validate_url: "${appUrl}/api/license-validate"
  console_password: "CHANGE_ME_STRONG_PASSWORD"
  worker_token: "CHANGE_ME_WORKER_SECRET_TOKEN"

  # BYOK: AI keys tinggal di server Anda — tidak keluar ke AXTO
  ai_pool:
    default_routing: cost
    fallback: true
    vendors:
      - provider: groq
        api_key: "gsk_REPLACE_ME"
        model: "llama-3.1-8b-instant"
      - provider: deepseek
        api_key: "sk-REPLACE_ME"
        model: "deepseek-chat"
      # - provider: openai
      #   api_key: "sk-REPLACE_ME"
      # - provider: anthropic
      #   api_key: "sk-ant-REPLACE_ME"
      # - provider: ollama
      #   base_url: "http://localhost:11434"
      #   model: "llama3"
      #   cost_per_1k_tokens: 0

  autoscaler:
    enabled: false
    threshold: 20
    max_cpu_workers: 10
    max_gpu_workers: 4
`,
    },
  };

  const f = files[file];
  if (!f) return NextResponse.json({ error: `File not found: ${file}` }, { status: 404 });

  return new NextResponse(f.content, {
    headers: {
      "Content-Type":        f.type,
      "Content-Disposition": `attachment; filename="${f.filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
