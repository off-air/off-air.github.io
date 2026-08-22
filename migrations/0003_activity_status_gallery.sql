ALTER TABLE records ADD COLUMN activity_status TEXT NOT NULL DEFAULT '소식이 끊긴 버튜버';
CREATE TABLE IF NOT EXISTS record_gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_record_gallery_record_order ON record_gallery(record_id, sort_order, id);
