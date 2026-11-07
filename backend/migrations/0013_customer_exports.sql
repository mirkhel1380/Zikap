-- Short-lived, session-bound download grants. No archive or password is stored.
CREATE TABLE IF NOT EXISTS customer_export_grants (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
 session_hash TEXT NOT NULL REFERENCES customer_sessions(token_hash) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_export_grants_expiry ON customer_export_grants(expires_at);
