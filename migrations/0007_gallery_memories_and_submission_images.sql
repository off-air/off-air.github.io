ALTER TABLE record_gallery ADD COLUMN caption TEXT NOT NULL DEFAULT '';
ALTER TABLE record_gallery ADD COLUMN memory_date TEXT NOT NULL DEFAULT '';
ALTER TABLE record_gallery ADD COLUMN source_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS submission_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  thumbnail_key TEXT NOT NULL UNIQUE,
  caption TEXT NOT NULL,
  memory_date TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  published_gallery_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (published_gallery_id) REFERENCES record_gallery(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_submission_images_submission
ON submission_images(submission_id, id);

