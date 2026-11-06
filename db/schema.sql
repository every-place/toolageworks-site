-- Cloudflare D1 schema. Apply with:
--   npx wrangler d1 execute toolageworks --remote --file=db/schema.sql
CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  company     TEXT,
  topic       TEXT,
  message     TEXT NOT NULL,
  source      TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS leads_created_at ON leads (created_at);

-- Copies to another backend (e.g. Zoho) that failed. Also created automatically on first failure.
CREATE TABLE IF NOT EXISTS sync_errors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  target      TEXT,
  lead_id     TEXT,
  error       TEXT,
  created_at  TEXT
);
