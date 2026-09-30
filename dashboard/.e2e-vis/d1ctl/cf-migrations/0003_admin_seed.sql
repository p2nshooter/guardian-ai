-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- ============================================================
-- AXTO Platform — Admin Seed Migration
-- Creates initial admin: alghoniy2026@gmail.com
-- Password: set via PBKDF2 hash (also accepts ADMIN_PASSWORD env var)
-- ============================================================

INSERT OR IGNORE INTO users (id, email, role, password_hash, created_at, updated_at)
VALUES (
  lower(hex(randomblob(16))),
  'alghoniy2026@gmail.com',
  'admin',
  'SET_VIA_ADMIN_PASSWORD_ENV',
  datetime('now'),
  datetime('now')
);

SELECT id, email, role, created_at FROM users WHERE email = 'alghoniy2026@gmail.com';
