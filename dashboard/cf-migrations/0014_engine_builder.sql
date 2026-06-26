-- ==============================================================================
-- Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Author & Architect: Yusron Efendi <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ═══════════════════════════════════════════════════════════════
-- Migration 0014: Engine Builder + Enhanced License System
-- ═══════════════════════════════════════════════════════════════

-- Engine builds table (Docker images + EXE artifacts)
CREATE TABLE IF NOT EXISTS engine_builds (
  id            TEXT PRIMARY KEY,
  build_type    TEXT NOT NULL DEFAULT 'docker',   -- 'docker' | 'exe'
  product       TEXT NOT NULL DEFAULT 'guardian', -- 'guardian' | 'orchestra' | 'bundle'
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'building' | 'ready' | 'failed' | 'deleted'
  label         TEXT NOT NULL DEFAULT '',         -- admin label e.g. "Acme Corp v1"
  license_key   TEXT NOT NULL DEFAULT '',         -- embedded license key
  license_type  TEXT NOT NULL DEFAULT 'yearly',   -- 'trial' | 'monthly' | 'yearly' | 'lifetime' | 'per_instance'
  trial_days    INTEGER DEFAULT 0,               -- 1-7 for trial type
  max_nodes     INTEGER DEFAULT 1,               -- CPU cores / nodes
  max_gpu       INTEGER DEFAULT 0,               -- GPU count (0 = no GPU)
  max_workers   INTEGER DEFAULT 10,              -- Orchestra workers
  unlimited     INTEGER DEFAULT 0,               -- 1 = unlimited everything
  client_name   TEXT DEFAULT '',
  client_email  TEXT DEFAULT '',
  client_org    TEXT DEFAULT '',
  r2_key        TEXT DEFAULT '',                 -- Cloudflare R2 storage key
  download_url  TEXT DEFAULT '',                 -- presigned or served URL
  file_size     INTEGER DEFAULT 0,
  checksum      TEXT DEFAULT '',
  version       TEXT DEFAULT 'latest',
  arch          TEXT DEFAULT 'linux/amd64',      -- 'linux/amd64' | 'linux/arm64' | 'windows/amd64'
  notes         TEXT DEFAULT '',
  expires_at    TEXT DEFAULT '',                 -- build expiry (for trial)
  deleted_at    TEXT DEFAULT '',
  created_by    TEXT DEFAULT 'admin',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Engine build logs
CREATE TABLE IF NOT EXISTS engine_build_logs (
  id         TEXT PRIMARY KEY,
  build_id   TEXT NOT NULL REFERENCES engine_builds(id),
  level      TEXT DEFAULT 'info',   -- 'info' | 'warn' | 'error'
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add trial_days and lifetime support to licenses
ALTER TABLE licenses ADD COLUMN license_type TEXT DEFAULT 'yearly';
ALTER TABLE licenses ADD COLUMN trial_days   INTEGER DEFAULT 0;
ALTER TABLE licenses ADD COLUMN is_lifetime  INTEGER DEFAULT 0;
ALTER TABLE licenses ADD COLUMN max_cpu      INTEGER DEFAULT 0;
ALTER TABLE licenses ADD COLUMN max_gpu      INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_engine_builds_status  ON engine_builds(status);
CREATE INDEX IF NOT EXISTS idx_engine_builds_product ON engine_builds(product);
CREATE INDEX IF NOT EXISTS idx_engine_build_logs_bid ON engine_build_logs(build_id);
