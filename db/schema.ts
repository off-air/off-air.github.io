export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    affiliation TEXT NOT NULL DEFAULT '',
    avatar_key TEXT,
    activity_status TEXT NOT NULL DEFAULT '소식이 끊긴 버튜버',
    initial TEXT NOT NULL,
    color TEXT NOT NULL,
    debut TEXT NOT NULL,
    last_activity TEXT NOT NULL,
    category TEXT NOT NULL,
    note TEXT NOT NULL,
    bio TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    base_memories INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS record_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    thumbnail_key TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS remembrance (
    record_id INTEGER NOT NULL,
    visitor_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (record_id, visitor_id),
    FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_type TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    channel_url TEXT NOT NULL,
    message TEXT NOT NULL,
    source_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS deleted_record_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deletion_group TEXT NOT NULL,
    record_name TEXT NOT NULL,
    image_kind TEXT NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    action TEXT NOT NULL,
    client_hash TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (action, client_hash, window_start)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_records_published_last ON records(published, last_activity)`,
  `CREATE INDEX IF NOT EXISTS idx_record_gallery_record_order ON record_gallery(record_id, sort_order, id)`,
  `CREATE INDEX IF NOT EXISTS idx_submissions_status_created ON submissions(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_deleted_record_images_group ON deleted_record_images(deletion_group, deleted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start)`,
];
