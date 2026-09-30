-- ==============================================================================
-- AXTO v3 — Support inbox (live chat + contact form).
-- D1 keeps only a small index row per conversation; the messages themselves
-- live in R2 (support/threads/<id>.json), presence in R2 (support/presence.json).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS support_threads (
  id              TEXT PRIMARY KEY,
  token_hash      TEXT NOT NULL,                 -- SHA-256 of the visitor's access token
  user_id         TEXT,                          -- set when the visitor was signed in
  name            TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  topic           TEXT NOT NULL DEFAULT 'other',
  source          TEXT NOT NULL DEFAULT 'chat' CHECK (source IN ('chat', 'contact', 'payment')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  needs_admin     INTEGER NOT NULL DEFAULT 0,    -- handoff topic or visitor asked for a person
  ai_enabled      INTEGER NOT NULL DEFAULT 1,    -- admin can silence the AI per conversation
  subject         TEXT NOT NULL DEFAULT '',
  last_from       TEXT NOT NULL DEFAULT 'visitor',
  last_preview    TEXT NOT NULL DEFAULT '',
  unread_admin    INTEGER NOT NULL DEFAULT 0,
  message_count   INTEGER NOT NULL DEFAULT 0,
  last_message_at TEXT NOT NULL,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_support_threads_status ON support_threads (status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_threads_user ON support_threads (user_id);
CREATE INDEX IF NOT EXISTS idx_support_threads_email ON support_threads (email);
