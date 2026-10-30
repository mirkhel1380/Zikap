-- Append-only, account-scoped project discussion. No email delivery.
CREATE TABLE IF NOT EXISTS project_messages (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 sender_role TEXT NOT NULL CHECK(sender_role IN ('customer','owner')),
 body TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS project_messages_order ON project_messages(order_id,created_at,id);
