-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- Migration 0007: Client self-registration & password login
-- Adds password-based auth for clients (fallback when magic link is down)
-- ============================================================

-- Add password_hash column to clients for direct login
-- (users table already has password_hash, but clients table doesn't)
-- We'll use the users table password_hash for client password login.

-- Registration queue: stores pending registrations before payment
CREATE TABLE IF NOT EXISTS registrations (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  country      TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  verify_token TEXT,
  verify_expires TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','completed','expired')),
  pkg_interest TEXT NOT NULL DEFAULT '',
  source       TEXT NOT NULL DEFAULT 'register',
  ip_address   TEXT NOT NULL DEFAULT '',
  user_agent   TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_reg_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_reg_verify ON registrations(verify_token);

-- Audit log for admin actions
CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  actor_id   TEXT NOT NULL DEFAULT '',
  actor_email TEXT NOT NULL DEFAULT '',
  action     TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id  TEXT NOT NULL DEFAULT '',
  detail     TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- Email delivery log (track Resend status)
CREATE TABLE IF NOT EXISTS email_log (
  id          TEXT PRIMARY KEY,
  to_email    TEXT NOT NULL,
  subject     TEXT NOT NULL DEFAULT '',
  template    TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','bounced')),
  resend_id   TEXT NOT NULL DEFAULT '',
  error_msg   TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_to ON email_log(to_email);
CREATE INDEX IF NOT EXISTS idx_email_status ON email_log(status);
