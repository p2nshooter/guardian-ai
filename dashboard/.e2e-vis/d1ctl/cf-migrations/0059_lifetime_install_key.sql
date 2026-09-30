-- ==============================================================================
-- AXTO v3.2.1 — Lifetime licences install with AXTO Setup.
-- install_key (LIFE-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX) is the installer's
-- credential for a lifetime licence: it downloads the images and activates the
-- device automatically. Generated on first view (lib/lifetime-service.ts).
-- ==============================================================================
ALTER TABLE lifetime_licenses ADD COLUMN install_key TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_lifetime_install_key ON lifetime_licenses(install_key) WHERE install_key != '';
