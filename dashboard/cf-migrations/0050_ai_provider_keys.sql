-- ==============================================================================
-- Copyright (c) 2024-2026 Axto AI. All rights reserved.
-- Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
-- Maintained by: Axto AI <hello@axto.io>
-- Proprietary and Confidential. Unauthorized copying is strictly prohibited.
-- ==============================================================================
-- Migration 0050: AI provider API key vault
--
-- General-purpose encrypted store for AI provider keys (NVIDIA NIM, OpenRouter,
-- etc.) that don't fit the payment_gateways model -- a single provider can have
-- many differently-purposed keys (e.g. NVIDIA: one per model/pipeline). Values
-- are AES-256-GCM encrypted via lib/gateway-crypto.ts (same ENCRYPTION_KEY as
-- payment_gateways) -- never stored in plaintext.
--
-- for_managed_pool marks keys earmarked for AXTO's own shared inference
-- infrastructure (the future client-facing websocket GPU/API pool), as
-- distinct from one-off keys used only for internal testing/development.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS ai_provider_keys (
  id               TEXT PRIMARY KEY,
  provider         TEXT NOT NULL,             -- 'nvidia' | 'openrouter' | ...
  key_name         TEXT NOT NULL,             -- admin-facing label, e.g. 'NVIDIA_KEY_TTS'
  category         TEXT NOT NULL DEFAULT '',  -- e.g. 'speech', 'vision', 'text-generation', 'image'
  purpose          TEXT NOT NULL DEFAULT '',  -- free-text description of what it's used for
  value_enc        TEXT NOT NULL,             -- AES-256-GCM encrypted key value
  for_managed_pool INTEGER NOT NULL DEFAULT 0,-- 1 = earmarked for AXTO's shared client-facing GPU/API pool
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_keys_provider ON ai_provider_keys(provider);
CREATE INDEX IF NOT EXISTS idx_ai_keys_category ON ai_provider_keys(category);
