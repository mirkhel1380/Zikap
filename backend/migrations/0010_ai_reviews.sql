-- Private, temporary source-HTML checks and one-shot AI reservations.
CREATE TABLE IF NOT EXISTS ai_checks (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 audit_json TEXT NOT NULL,
 ai_state TEXT NOT NULL DEFAULT 'not_started' CHECK(ai_state IN ('not_started','generating','ready','failed')),
 ai_json TEXT,
 error_code TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS ai_checks_customer ON ai_checks(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS ai_reservations (
 check_id TEXT PRIMARY KEY REFERENCES ai_checks(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
 day TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_reservations_day ON ai_reservations(day,user_id);
