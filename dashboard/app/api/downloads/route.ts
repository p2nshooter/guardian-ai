export const runtime = "edge";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const ghcrOwner = process.env.GHCR_OWNER || "p2nshooter";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";

const FILES: Record<string, { filename: string; type: string; content: string }> = {
  "guardian-compose.yml": {
    filename: "guardian-compose.yml", type: "application/yaml",
    content: `version: "3.9"
# AXTO Guardian AI — Production Docker Compose
services:
  guardian-db:
    image: postgres:16-alpine
    container_name: guardian-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: guardian
      POSTGRES_PASSWORD: \${GUARDIAN_DB_PASSWORD:-guardian-change-me}
      POSTGRES_DB: guardian
    volumes: [guardian-db-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL","pg_isready -U guardian"]
      interval: 10s; timeout: 5s; retries: 5
    networks: [guardian-net]

  guardian-core:
    image: ghcr.io/${ghcrOwner}/guardian-engine:latest
    container_name: guardian-core
    restart: unless-stopped
    ports: ["8080:8080"]
    depends_on:
      guardian-db: {condition: service_healthy}
    environment:
      - GUARDIAN_DB_URL=postgresql://guardian:\${GUARDIAN_DB_PASSWORD:-guardian-change-me}@guardian-db:5432/guardian
      - GUARDIAN_CONFIG=/guardian/config/guardian.yml
    volumes:
      - ./guardian.yml:/guardian/config/guardian.yml:ro
      - guardian-data:/guardian/data
      - guardian-logs:/guardian/logs
    healthcheck:
      test: ["CMD","curl","-sf","http://localhost:8080/health"]
      interval: 30s; timeout: 10s; retries: 3
    networks: [guardian-net]

  guardian-node:
    image: ghcr.io/${ghcrOwner}/guardian-engine:latest
    container_name: guardian-node
    restart: unless-stopped
    command: python -m src
    depends_on:
      guardian-core: {condition: service_healthy}
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

  # BYOK: Your AI keys stay on YOUR server — never sent to AXTO
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
services:
  orchestra-db:
    image: postgres:16-alpine
    container_name: orchestra-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: orchestra
      POSTGRES_PASSWORD: \${ORCHESTRA_DB_PASSWORD:-orchestra-change-me}
      POSTGRES_DB: orchestra
    volumes: [orchestra-db-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL","pg_isready -U orchestra"]
      interval: 10s; timeout: 5s; retries: 5
    networks: [orchestra-net]

  orchestra-core:
    image: ghcr.io/${ghcrOwner}/orchestra-core:latest
    container_name: orchestra-core
    restart: unless-stopped
    ports: ["8080:8080"]
    depends_on:
      orchestra-db: {condition: service_healthy}
    volumes:
      - ./orchestra.yml:/app/config/orchestra.yml:ro
      - orchestra-data:/app/data
    environment:
      - ORCHESTRA_CONFIG=/app/config/orchestra.yml
      - ORCHESTRA_DB_URL=postgresql://orchestra:\${ORCHESTRA_DB_PASSWORD:-orchestra-change-me}@orchestra-db:5432/orchestra
      - ORCHESTRA_CONSOLE_PASSWORD=\${CONSOLE_PASSWORD:-orchestra-console}
      - ORCHESTRA_WORKER_TOKEN=\${WORKER_TOKEN:-orchestra-worker-secret}
    healthcheck:
      test: ["CMD","curl","-sf","http://localhost:8080/health"]
      interval: 30s; timeout: 10s; retries: 3
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
      - WORKER_IDLE_SHUTDOWN=0
    depends_on:
      orchestra-core: {condition: service_healthy}
    networks: [orchestra-net]

  worker-gpu:
    image: ghcr.io/${ghcrOwner}/orchestra-worker-gpu:latest
    container_name: orchestra-worker-gpu-1
    restart: unless-stopped
    # ── NVIDIA GPU (uncomment runtime below) ──
    # runtime: nvidia
    # ── AMD GPU (comment out runtime, uncomment devices below) ──
    # devices:
    #   - /dev/kfd
    #   - /dev/dri
    environment:
      - ORCHESTRA_CORE_URL=http://orchestra-core:8080
      - ORCHESTRA_WORKER_TOKEN=\${WORKER_TOKEN:-orchestra-worker-secret}
      - WORKER_MODEL=llama3.2
      - OLLAMA_BASE_URL=http://localhost:11434
      - WORKER_IDLE_SHUTDOWN=300
    deploy:
      resources:
        reservations:
          devices:
            # NVIDIA: capabilities [gpu]
            # AMD: remove this block, use devices above
            - capabilities: [gpu]
    depends_on:
      orchestra-core: {condition: service_healthy}
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
    content: `# AXTO Orchestra AI — Configuration Template
orchestra:
  license_key: "ORCH-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  license_validate_url: "${appUrl}/api/license-validate"
  console_password: "CHANGE_ME_STRONG_PASSWORD"
  worker_token: "CHANGE_ME_WORKER_SECRET"
  ai_pool:
    vendors:
      - provider: groq
        api_key: "gsk_REPLACE_ME"
      - provider: deepseek
        api_key: "sk-REPLACE_ME"
      - provider: openai
        api_key: "sk-REPLACE_ME"
      - provider: ollama
        base_url: "http://localhost:11434"
  autoscaler:
    enabled: false
    threshold: 20
    max_cpu_workers: 10
    max_gpu_workers: 4
`,
  },
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filename = url.searchParams.get("file") || "";
  const file = FILES[filename];
  if (!file) return NextResponse.json({ error: "File not found", available: Object.keys(FILES) }, { status: 404 });
  return new NextResponse(file.content, {
    headers: { "Content-Type": file.type, "Content-Disposition": `attachment; filename="${file.filename}"`, "Cache-Control": "no-store" },
  });
}
