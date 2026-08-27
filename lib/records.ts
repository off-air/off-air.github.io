import { db, ensureDatabase } from "./db";

export type PublicRecord = {
  id: number;
  name: string;
  handle: string;
  affiliation?: string;
  avatar_key?: string;
  activity_status?: string;
  initial: string;
  color: string;
  debut: string;
  last: string;
  category: string;
  note: string;
  bio: string;
  graduation_message?: string;
  fan_name?: string;
  related_links?: Array<{ label: string; url: string }>;
  tags: string[];
  memories: number;
  published?: boolean | number;
};

type RecordRow = Omit<PublicRecord, "last" | "tags" | "related_links"> & {
  last_activity: string;
  tags: string;
  related_links: string;
};

function normalizeRecord(row: RecordRow): PublicRecord {
  let tags: unknown = [];
  let relatedLinks: unknown = [];
  try {
    tags = JSON.parse(row.tags || "[]");
  } catch {
    tags = [];
  }
  try {
    relatedLinks = JSON.parse(row.related_links || "[]");
  } catch {
    relatedLinks = [];
  }
  return {
    ...row,
    last: row.last_activity,
    tags: Array.isArray(tags)
      ? tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    related_links: Array.isArray(relatedLinks)
      ? relatedLinks.filter((link): link is { label: string; url: string } =>
          Boolean(link) && typeof link === "object" &&
          typeof (link as { label?: unknown }).label === "string" &&
          typeof (link as { url?: unknown }).url === "string",
        )
      : [],
  };
}

export async function listPublicRecords(): Promise<PublicRecord[]> {
  await ensureDatabase();
  const { results } = await db()
    .prepare(
      `SELECT r.*, r.base_memories + COUNT(m.visitor_id) AS memories
       FROM records r
       LEFT JOIN remembrance m ON m.record_id=r.id
       WHERE r.published=1
       GROUP BY r.id
       ORDER BY r.last_activity DESC`,
    )
    .all<RecordRow>();
  return results.map(normalizeRecord);
}

export async function findPublicRecord(id: number): Promise<PublicRecord | null> {
  await ensureDatabase();
  const row = await db()
    .prepare(
      `SELECT r.*, r.base_memories + COUNT(m.visitor_id) AS memories
       FROM records r
       LEFT JOIN remembrance m ON m.record_id=r.id
       WHERE r.id=? AND r.published=1
       GROUP BY r.id`,
    )
    .bind(id)
    .first<RecordRow>();
  return row ? normalizeRecord(row) : null;
}
