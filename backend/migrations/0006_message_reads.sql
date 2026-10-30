-- Explicit per-message read state. A concurrent new message is never cleared by an older view.
CREATE TABLE IF NOT EXISTS project_message_reads (
 message_id TEXT NOT NULL REFERENCES project_messages(id) ON DELETE CASCADE,
 reader_role TEXT NOT NULL CHECK(reader_role IN ('customer','owner')),
 read_at TEXT NOT NULL,
 PRIMARY KEY(message_id,reader_role)
);
