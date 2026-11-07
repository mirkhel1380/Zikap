-- A persistent owner pause; deployment never resets an existing choice.
CREATE TABLE IF NOT EXISTS ai_runtime_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 paused INTEGER NOT NULL DEFAULT 0 CHECK(paused IN (0,1)),
 version INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT
);
INSERT INTO ai_runtime_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
