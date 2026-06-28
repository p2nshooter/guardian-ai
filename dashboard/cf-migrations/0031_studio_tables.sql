-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════════
-- Migration 0031: AXTO Studio — Multi-Tenant AI & GPU Pool Platform
-- ═══════════════════════════════════════════════════════════════════
-- Architecture:
--   • Each client = isolated tenant with own credentials
--   • Zero cross-tenant data access (all queries scoped by tenant_id)
--   • Credentials encrypted at rest (AES-256-GCM via lib/gateway-crypto)
--   • Artifacts auto-delete after 14 days via cron
--   • 3 Studios: AI Studio, GPU Studio, Hybrid Studio
-- ═══════════════════════════════════════════════════════════════════

-- ── Studio Tenants (1:1 with clients) ─────────────────────────────
CREATE TABLE IF NOT EXISTS studio_tenants (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL DEFAULT '',
  plan          TEXT NOT NULL DEFAULT 'starter',     -- starter|professional|enterprise
  status        TEXT NOT NULL DEFAULT 'active',      -- active|suspended|cancelled
  quota_ai_requests   INTEGER NOT NULL DEFAULT 1000, -- daily AI requests
  quota_gpu_hours     REAL NOT NULL DEFAULT 0,       -- monthly GPU hours
  quota_storage_mb    INTEGER NOT NULL DEFAULT 512,   -- artifact storage
  usage_ai_today      INTEGER NOT NULL DEFAULT 0,
  usage_gpu_month     REAL NOT NULL DEFAULT 0,
  usage_storage_mb    REAL NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_st_email  ON studio_tenants(email);
CREATE INDEX IF NOT EXISTS idx_st_plan   ON studio_tenants(plan);

-- ── Studio Credentials (tenant-scoped, encrypted) ─────────────────
-- Each row = one provider credential belonging to ONE tenant
CREATE TABLE IF NOT EXISTS studio_credentials (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  provider      TEXT NOT NULL,       -- openai|anthropic|google|groq|mistral|deepseek|ollama|runpod|lambda|vastai|custom
  category      TEXT NOT NULL DEFAULT 'ai',  -- ai|gpu|custom
  label         TEXT NOT NULL DEFAULT '',     -- user-friendly name
  credentials_enc TEXT NOT NULL DEFAULT '',   -- encrypted JSON {api_key, endpoint, ...}
  is_active     INTEGER NOT NULL DEFAULT 1,
  is_verified   INTEGER NOT NULL DEFAULT 0,  -- validated via API call
  last_used     TEXT,
  total_requests INTEGER NOT NULL DEFAULT 0,
  total_tokens   INTEGER NOT NULL DEFAULT 0,
  total_cost_usd REAL NOT NULL DEFAULT 0,
  meta          TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES studio_tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_sc_tenant   ON studio_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sc_provider ON studio_credentials(tenant_id, provider);
CREATE INDEX IF NOT EXISTS idx_sc_category ON studio_credentials(tenant_id, category);

-- ── Studio Sessions (chat/completion sessions) ───────────────────
CREATE TABLE IF NOT EXISTS studio_sessions (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  studio_type   TEXT NOT NULL DEFAULT 'ai',   -- ai|gpu|hybrid
  title         TEXT NOT NULL DEFAULT 'Untitled',
  provider      TEXT NOT NULL DEFAULT '',
  model         TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT '',
  messages      TEXT NOT NULL DEFAULT '[]',    -- JSON array of {role,content}
  settings      TEXT NOT NULL DEFAULT '{}',    -- JSON {temperature, max_tokens, ...}
  total_tokens  INTEGER NOT NULL DEFAULT 0,
  total_cost_usd REAL NOT NULL DEFAULT 0,
  is_pinned     INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT NOT NULL DEFAULT (datetime('now', '+14 days')),
  FOREIGN KEY (tenant_id) REFERENCES studio_tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_ss_tenant  ON studio_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ss_type    ON studio_sessions(tenant_id, studio_type);
CREATE INDEX IF NOT EXISTS idx_ss_expires ON studio_sessions(expires_at);

-- ── Studio Artifacts (outputs: images, code, files, embeddings) ──
CREATE TABLE IF NOT EXISTS studio_artifacts (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  session_id    TEXT,
  studio_type   TEXT NOT NULL DEFAULT 'ai',
  artifact_type TEXT NOT NULL DEFAULT 'text',  -- text|image|code|file|embedding|model
  title         TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',       -- text content or R2 key
  file_url      TEXT NOT NULL DEFAULT '',       -- public download URL
  file_size     INTEGER NOT NULL DEFAULT 0,
  mime_type     TEXT NOT NULL DEFAULT 'text/plain',
  meta          TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT NOT NULL DEFAULT (datetime('now', '+14 days')),
  FOREIGN KEY (tenant_id)  REFERENCES studio_tenants(id),
  FOREIGN KEY (session_id) REFERENCES studio_sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_sa_tenant  ON studio_artifacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sa_session ON studio_artifacts(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_sa_expires ON studio_artifacts(expires_at);

-- ── Studio GPU Instances (connected GPU endpoints per tenant) ────
CREATE TABLE IF NOT EXISTS studio_gpu_instances (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  credential_id TEXT NOT NULL,       -- FK to studio_credentials
  instance_name TEXT NOT NULL DEFAULT '',
  provider      TEXT NOT NULL DEFAULT 'custom',  -- runpod|lambda|vastai|custom
  gpu_type      TEXT NOT NULL DEFAULT '',         -- A100|H100|RTX4090|...
  gpu_count     INTEGER NOT NULL DEFAULT 1,
  vram_gb       INTEGER NOT NULL DEFAULT 0,
  endpoint_url  TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'offline',  -- online|offline|busy|error
  deployed_model TEXT NOT NULL DEFAULT '',        -- currently loaded model
  last_health   TEXT,
  meta          TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id)    REFERENCES studio_tenants(id),
  FOREIGN KEY (credential_id) REFERENCES studio_credentials(id)
);
CREATE INDEX IF NOT EXISTS idx_sgi_tenant ON studio_gpu_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sgi_status ON studio_gpu_instances(tenant_id, status);

-- ── Studio Pipelines (Hybrid studio workflows) ──────────────────
CREATE TABLE IF NOT EXISTS studio_pipelines (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  title         TEXT NOT NULL DEFAULT 'Untitled Pipeline',
  description   TEXT NOT NULL DEFAULT '',
  nodes         TEXT NOT NULL DEFAULT '[]',     -- JSON array of pipeline nodes
  edges         TEXT NOT NULL DEFAULT '[]',     -- JSON array of connections
  settings      TEXT NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'draft',  -- draft|active|paused
  last_run      TEXT,
  run_count     INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT NOT NULL DEFAULT (datetime('now', '+14 days')),
  FOREIGN KEY (tenant_id) REFERENCES studio_tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_sp_tenant ON studio_pipelines(tenant_id);

-- ── Studio Usage Log (per-request billing audit) ─────────────────
CREATE TABLE IF NOT EXISTS studio_usage_log (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  session_id    TEXT,
  studio_type   TEXT NOT NULL DEFAULT 'ai',
  provider      TEXT NOT NULL DEFAULT '',
  model         TEXT NOT NULL DEFAULT '',
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms    INTEGER NOT NULL DEFAULT 0,
  cost_usd      REAL NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'success',
  error_msg     TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES studio_tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_sul_tenant  ON studio_usage_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sul_created ON studio_usage_log(created_at);

-- ── Audit log entry ──────────────────────────────────────────────
INSERT OR IGNORE INTO audit_log (id, action, entity_type, entity_id, actor_email, metadata, created_at)
VALUES (
  'migration-0031',
  'schema_migration',
  'system',
  '0031',
  'system',
  '{"migration":"0031_studio_tables","description":"Multi-tenant AI/GPU Studio platform with isolated credentials, 14-day artifact TTL, usage tracking"}',
  datetime('now')
);
