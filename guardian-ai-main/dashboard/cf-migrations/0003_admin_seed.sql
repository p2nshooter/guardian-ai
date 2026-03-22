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
  'pbkdf2:100000:72d76ba044b762513e13205333b5a3ca:9711e7898575e61c032f398ac1f88a56715411f265c813cfc528caa9f00ddbee',
  datetime('now'),
  datetime('now')
);

SELECT id, email, role, created_at FROM users WHERE email = 'alghoniy2026@gmail.com';
