CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY,
 token_hash TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'requested',
 package_id TEXT NOT NULL,
 price_usd INTEGER NOT NULL,
 name TEXT NOT NULL,
 email TEXT NOT NULL,
 website TEXT NOT NULL,
 pages TEXT NOT NULL,
 topic TEXT NOT NULL,
 language TEXT NOT NULL,
 market TEXT NOT NULL,
 goals TEXT NOT NULL,
 report TEXT NOT NULL DEFAULT '',
 owner_note TEXT NOT NULL DEFAULT '',
 revision_used INTEGER NOT NULL DEFAULT 0,
 revision_note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
