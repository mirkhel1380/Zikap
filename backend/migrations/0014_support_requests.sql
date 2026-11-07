CREATE TABLE IF NOT EXISTS support_threads (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
 topic TEXT NOT NULL CHECK(topic IN ('account','project','payment','refund','privacy','general')),
 subject TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','waiting','resolved')),
 version INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS support_threads_user ON support_threads(user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS support_threads_status ON support_threads(status,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS support_messages (
 id TEXT PRIMARY KEY,
 thread_id TEXT NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
 sender_role TEXT NOT NULL CHECK(sender_role IN ('customer','owner')),
 body TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS support_messages_thread ON support_messages(thread_id,created_at,id);
CREATE TABLE IF NOT EXISTS support_message_reads (
 message_id TEXT NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
 reader_role TEXT NOT NULL CHECK(reader_role IN ('customer','owner')),
 read_at TEXT NOT NULL,
 PRIMARY KEY(message_id,reader_role)
);
CREATE TRIGGER IF NOT EXISTS support_message_activity AFTER INSERT ON support_messages BEGIN
 UPDATE support_threads SET updated_at=NEW.created_at,version=version+1,
 status=CASE WHEN NEW.sender_role='customer' THEN 'open' ELSE 'waiting' END WHERE id=NEW.thread_id;
END;
