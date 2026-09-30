-- ==============================================================================
-- AXTO v3.2.1 — sign out every other session when a password changes.
-- Unix seconds; a session token issued before it is refused (lib/auth.ts).
-- ==============================================================================
ALTER TABLE users ADD COLUMN sessions_valid_after TEXT NOT NULL DEFAULT '';
