-- Future transactional events only. No existing order is changed or backfilled.
CREATE TABLE IF NOT EXISTS email_outbox (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('request_received','project_accepted','report_ready','payment_confirmed')),
 metadata TEXT NOT NULL DEFAULT '{}',
 created_at INTEGER NOT NULL DEFAULT (unixepoch()),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','accepted','failed','uncertain','skipped')),
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0,
 first_attempt INTEGER,
 lease_until INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT NOT NULL DEFAULT '',
 payload TEXT,
 provider_id TEXT NOT NULL DEFAULT '',
 error_code TEXT NOT NULL DEFAULT '',
 accepted_at INTEGER
);
CREATE INDEX IF NOT EXISTS email_outbox_pending ON email_outbox(state,next_attempt,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_once ON email_outbox(order_id,kind)
 WHERE kind IN ('request_received','payment_confirmed');
CREATE TRIGGER IF NOT EXISTS email_order_received AFTER INSERT ON orders
BEGIN
 INSERT INTO email_outbox(id,order_id,kind,metadata)
 VALUES(lower(hex(randomblob(16))),NEW.id,'request_received',json_object('packageId',NEW.package_id));
END;
CREATE TRIGGER IF NOT EXISTS email_order_accepted AFTER UPDATE OF status ON orders
WHEN NEW.status='accepted' AND OLD.status IS NOT NEW.status
BEGIN
 INSERT INTO email_outbox(id,order_id,kind,metadata)
 VALUES(lower(hex(randomblob(16))),NEW.id,'project_accepted',json_object('packageId',NEW.package_id));
END;
CREATE TRIGGER IF NOT EXISTS email_report_ready AFTER UPDATE OF status ON orders
WHEN NEW.status='delivered' AND OLD.status IS NOT NEW.status AND length(trim(NEW.report))>0
BEGIN
 INSERT INTO email_outbox(id,order_id,kind,metadata)
 VALUES(lower(hex(randomblob(16))),NEW.id,'report_ready',json_object('packageId',NEW.package_id));
END;
CREATE TRIGGER IF NOT EXISTS email_payment_confirmed AFTER UPDATE OF state ON order_payments
WHEN NEW.state='paid' AND OLD.state IS NOT NEW.state
BEGIN
 INSERT INTO email_outbox(id,order_id,kind,metadata)
 VALUES(lower(hex(randomblob(16))),NEW.order_id,'payment_confirmed',
 json_object('amountCents',NEW.amount_cents,'currency',NEW.currency,'testMode',NEW.test_mode))
 ON CONFLICT DO NOTHING;
END;
