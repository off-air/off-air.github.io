import { adminGuard, db, ensureDatabase, readJson, requestError } from "../../../../lib/db";

type AdminRecord = { id?: unknown; name?: unknown; affiliation?: unknown; avatar_key?: unknown; activity_status?: unknown; initial?: unknown; color?: unknown; debut?: unknown; last?: unknown; category?: unknown; note?: unknown; bio?: unknown; graduation_message?: unknown; fan_name?: unknown; related_links?: unknown; tags?: unknown; published?: unknown };
type RelatedLink = { label: string; url: string };
const categories = new Set(["개인", "소속"]);
const activityStatuses = new Set(["공식적으로 활동 종료한 버튜버", "소식이 끊긴 버튜버", "무기한 휴식기에 들어간 버튜버"]);
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const normalizeDate = (value: unknown) => {
  const raw = text(value, 20);
  if (!raw) return "";
  const compact = raw.match(/^([0-9]{4})([0-9]{2})([0-9]{2})$/);
  const separated = raw.match(/^([0-9]{4})\D+([0-9]{1,2})\D+([0-9]{1,2})\D*$/);
  const parts = compact || separated;
  if (!parts) return null;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};
const parseRelatedLinks = (value: unknown): RelatedLink[] | null => {
  if (!Array.isArray(value) || value.length > 12) return null;
  const links: RelatedLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const label = text((item as Record<string, unknown>).label, 40);
    const url = text((item as Record<string, unknown>).url, 2048);
    if (!label && !url) continue;
    if (!label || !url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
      links.push({ label, url: parsed.toString() });
    } catch { return null; }
  }
  return links;
};

export async function GET(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  await ensureDatabase();
  const [{ results }, { results: gallery }] = await Promise.all([
    db().prepare("SELECT * FROM records ORDER BY id").all(),
    db().prepare("SELECT id,record_id,object_key,thumbnail_key,caption,memory_date,source_url FROM record_gallery ORDER BY sort_order,id").all<{ id: number; record_id: number; object_key: string; thumbnail_key: string | null; caption: string; memory_date: string; source_url: string }>(),
  ]);
  const rows = results as unknown as Array<{ id: number; tags: string; related_links: string; last_activity: string; [key: string]: unknown }>;
  return Response.json(rows.map((row) => {
    let tags: string[] = [];
    let relatedLinks: RelatedLink[] = [];
    try { const parsed: unknown = JSON.parse(row.tags || "[]"); if (Array.isArray(parsed)) tags = parsed.filter((tag): tag is string => typeof tag === "string"); } catch {}
    try { const parsed: unknown = JSON.parse(row.related_links || "[]"); if (Array.isArray(parsed)) relatedLinks = parsed.filter((link): link is RelatedLink => Boolean(link) && typeof link === "object" && typeof (link as RelatedLink).label === "string" && typeof (link as RelatedLink).url === "string"); } catch {}
    return { ...row, last: row.last_activity, tags, related_links: relatedLinks, gallery: gallery.filter((image) => image.record_id === row.id) };
  }), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const p = await readJson<AdminRecord>(request, 96 * 1024);
    const name = text(p.name, 100);
    const category = categories.has(p.category as string) ? p.category as string : "개인";
    const activityStatus = activityStatuses.has(p.activity_status as string) ? p.activity_status as string : "소식이 끊긴 버튜버";
    if (!Number.isInteger(p.id) || !name) return Response.json({ error: "필수 정보를 확인해주세요." }, { status: 400 });
    const tags = Array.isArray(p.tags) ? p.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 30).map((tag) => tag.trim().replace(/^#+/, "").slice(0, 40)).filter(Boolean) : [];
    const debut = normalizeDate(p.debut);
    const last = normalizeDate(p.last);
    const relatedLinks = parseRelatedLinks(p.related_links ?? []);
    if (debut === null || last === null) return Response.json({ error: "날짜 형식을 확인해주세요." }, { status: 400 });
    if (relatedLinks === null) return Response.json({ error: "관련 링크의 이름과 주소를 확인해주세요." }, { status: 400 });
    const result = await db().prepare("UPDATE records SET name=?,affiliation=?,avatar_key=?,activity_status=?,initial=?,color=?,debut=?,last_activity=?,category=?,note=?,bio=?,graduation_message=?,fan_name=?,related_links=?,tags=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(
      name, category === "소속" ? text(p.affiliation, 120) : "", text(p.avatar_key, 512) || null, activityStatus,
      text(p.initial, 4) || name.slice(0, 1), /^#[0-9a-f]{6}$/i.test(String(p.color)) ? p.color : "#718096",
      debut, last, category, text(p.note, 1000), text(p.bio, 10000), text(p.graduation_message, 20000), text(p.fan_name, 100), JSON.stringify(relatedLinks), JSON.stringify(tags), p.published === false || p.published === 0 ? 0 : 1, p.id,
    ).run();
    if (!result.meta.changes) return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return requestError(error); }
}

export async function POST(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    await readJson<Record<string, never>>(request, 128);
    const handle = `record-${crypto.randomUUID()}`;
    const result = await db().prepare("INSERT INTO records (name,handle,affiliation,activity_status,initial,color,debut,last_activity,category,note,bio,graduation_message,fan_name,related_links,tags,base_memories,published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind("새 기록", handle, "", "소식이 끊긴 버튜버", "新", "#718096", "", "", "개인", "", "", "", "", "[]", "[]", 0, 0).run();
    const id = Number(result.meta.last_row_id);
    const row = await db().prepare("SELECT *, last_activity AS last FROM records WHERE id=?").bind(id).first<Record<string, unknown>>();
    return Response.json({ ...row, tags: [], related_links: [] }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return requestError(error); }
}

export async function DELETE(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const { id } = await readJson<{ id?: unknown }>(request, 1024);
    if (!Number.isInteger(id)) return Response.json({ error: "삭제할 기록을 확인해주세요." }, { status: 400 });
    const record = await db().prepare("SELECT name,avatar_key FROM records WHERE id=?").bind(id).first<{ name: string; avatar_key: string | null }>();
    if (!record) return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
    const { results: gallery } = await db().prepare("SELECT object_key,thumbnail_key FROM record_gallery WHERE record_id=?").bind(id).all<{ object_key: string; thumbnail_key: string | null }>();
    const deletionGroup = crypto.randomUUID();
    const images = [...(record.avatar_key ? [{ key: record.avatar_key, kind: "프로필" }] : []), ...gallery.flatMap((image) => [{ key: image.object_key, kind: "갤러리 원본" }, ...(image.thumbnail_key ? [{ key: image.thumbnail_key, kind: "갤러리 썸네일" }] : [])])];
    await db().batch([
      ...images.map((image) => db().prepare("INSERT INTO deleted_record_images (deletion_group,record_name,image_kind,object_key) VALUES (?,?,?,?)").bind(deletionGroup, record.name, image.kind, image.key)),
      db().prepare("DELETE FROM remembrance WHERE record_id=?").bind(id), db().prepare("DELETE FROM record_gallery WHERE record_id=?").bind(id), db().prepare("DELETE FROM records WHERE id=?").bind(id),
    ]);
    return Response.json({ ok: true, retained_images: images.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return requestError(error); }
}
