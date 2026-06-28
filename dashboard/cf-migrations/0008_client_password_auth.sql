-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hallo@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- Migration 0008: Client password-based auth (fallback for magic link)
-- Allows clients to register & login with email+password
-- when Resend email service is down.
-- ============================================================

-- users.password_hash already exists from 0001, so no ALTER needed.

-- Login attempts rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  ip_address TEXT NOT NULL DEFAULT '',
  success    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_email ON login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_ip    ON login_attempts(ip_address, created_at);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pw_reset_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_pw_reset_email ON password_resets(email);
