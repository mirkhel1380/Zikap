CREATE TABLE IF NOT EXISTS owner_project_work (
 order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
 completed TEXT NOT NULL DEFAULT '[]',
 private_note TEXT NOT NULL DEFAULT '',
 version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
 updated_at TEXT NOT NULL
);
