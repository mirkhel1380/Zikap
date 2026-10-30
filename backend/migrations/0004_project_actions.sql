-- Customer-owned manual implementation plans. No changes to orders or payment rows.
CREATE TABLE IF NOT EXISTS project_actions (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 page_url TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
 status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','doing','done','archived')),
 version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS project_actions_order ON project_actions(order_id,created_at,id);
