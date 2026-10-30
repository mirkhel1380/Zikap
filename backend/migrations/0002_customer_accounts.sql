-- Additive: existing orders and receipt access are preserved.
CREATE TABLE IF NOT EXISTS customer_users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 name TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 password_salt TEXT NOT NULL,
 recovery_hash TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS customer_sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_sessions_user ON customer_sessions(user_id);
CREATE INDEX IF NOT EXISTS customer_sessions_expiry ON customer_sessions(expires_at);
CREATE TABLE IF NOT EXISTS customer_order_links (
 order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS customer_order_links_user ON customer_order_links(user_id);
