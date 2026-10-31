-- Capture only future changes. No existing order is modified or backfilled.
CREATE TABLE IF NOT EXISTS order_edit_versions (
 order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
 version INTEGER NOT NULL CHECK(version>=0)
);
CREATE TABLE IF NOT EXISTS order_history (
 order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 version INTEGER NOT NULL CHECK(version>=0),
 status TEXT NOT NULL,
 report TEXT NOT NULL,
 owner_note TEXT NOT NULL,
 revision_used INTEGER NOT NULL,
 revision_note TEXT NOT NULL,
 saved_at TEXT NOT NULL,
 replaced_at TEXT NOT NULL,
 PRIMARY KEY(order_id,version)
);
CREATE TRIGGER IF NOT EXISTS order_history_capture AFTER UPDATE OF status,report,owner_note,revision_used,revision_note ON orders
WHEN OLD.status IS NOT NEW.status OR OLD.report IS NOT NEW.report OR OLD.owner_note IS NOT NEW.owner_note OR OLD.revision_used IS NOT NEW.revision_used OR OLD.revision_note IS NOT NEW.revision_note
BEGIN
 INSERT INTO order_history(order_id,version,status,report,owner_note,revision_used,revision_note,saved_at,replaced_at)
 VALUES(OLD.id,COALESCE((SELECT version FROM order_edit_versions WHERE order_id=OLD.id),0),OLD.status,OLD.report,OLD.owner_note,OLD.revision_used,OLD.revision_note,OLD.updated_at,NEW.updated_at);
 INSERT INTO order_edit_versions(order_id,version) VALUES(NEW.id,1)
 ON CONFLICT(order_id) DO UPDATE SET version=version+1;
 DELETE FROM order_history WHERE order_id=NEW.id AND version NOT IN(SELECT version FROM order_history WHERE order_id=NEW.id ORDER BY version DESC LIMIT 20);
END;
