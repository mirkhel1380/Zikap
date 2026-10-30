CREATE TABLE IF NOT EXISTS order_payments (
 order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
 generation TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'creating',
 amount_cents INTEGER NOT NULL,
 currency TEXT NOT NULL DEFAULT 'usd',
 test_mode INTEGER NOT NULL,
 request_params TEXT NOT NULL,
 session_id TEXT UNIQUE,
 checkout_url TEXT NOT NULL DEFAULT '',
 expires_at INTEGER NOT NULL DEFAULT 0,
 started_at INTEGER NOT NULL,
 lock_until INTEGER NOT NULL DEFAULT 0,
 payment_intent TEXT NOT NULL DEFAULT '',
 paid_at TEXT NOT NULL DEFAULT '',
 refunded_cents INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS order_payments_intent ON order_payments(payment_intent);
CREATE TABLE IF NOT EXISTS stripe_events (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL,
 processed_at INTEGER NOT NULL
);
