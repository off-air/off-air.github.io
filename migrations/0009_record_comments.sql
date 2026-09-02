CREATE TABLE IF NOT EXISTS record_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL,
  nickname TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderation_source TEXT NOT NULL DEFAULT 'unavailable',
  moderation_flags TEXT NOT NULL DEFAULT '[]',
  delete_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL,
  record_id INTEGER,
  action TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_usage (
  usage_day TEXT NOT NULL,
  usage_key TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (usage_day, usage_key)
);

CREATE INDEX IF NOT EXISTS idx_record_comments_public ON record_comments(record_id, status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_record_comments_review ON record_comments(status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_comment_events_created ON comment_events(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_daily_usage_day ON daily_usage(usage_day);

PRAGMA optimize;
