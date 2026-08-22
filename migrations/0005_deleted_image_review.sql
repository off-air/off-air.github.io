CREATE TABLE IF NOT EXISTS deleted_record_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deletion_group TEXT NOT NULL,
  record_name TEXT NOT NULL,
  image_kind TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_deleted_record_images_group ON deleted_record_images(deletion_group, deleted_at);
UPDATE submissions SET status='reviewed' WHERE status='resolved';
