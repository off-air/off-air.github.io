import { adminGuard, db, ensureDatabase, profileImages, readJson, requestError } from "../../../../lib/db";

const statuses = new Set(["pending", "reviewed"]);
type SubmissionRow = { id: number; submission_type: string; creator_name: string; channel_url: string; message: string; source_url: string | null; status: string; created_at: string };
type SubmissionImageRow = { id: number; submission_id: number; object_key: string; thumbnail_key: string; caption: string; memory_date: string; source_url: string; published_gallery_id: number | null };

export async function GET(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  await ensureDatabase();
  const { results } = await db().prepare("SELECT * FROM submissions ORDER BY created_at DESC, id DESC LIMIT 200").all<SubmissionRow>();
  const ids = results.map((item) => item.id);
  const images = ids.length
    ? (await db().prepare(`SELECT id,submission_id,object_key,thumbnail_key,caption,memory_date,source_url,published_gallery_id FROM submission_images WHERE submission_id IN (${ids.map(() => "?").join(",")}) ORDER BY id`).bind(...ids).all<SubmissionImageRow>()).results
    : [];
  const grouped = new Map<number, SubmissionImageRow[]>();
  for (const image of images) grouped.set(image.submission_id, [...(grouped.get(image.submission_id) || []), image]);
  return Response.json(results.map((item) => ({ ...item, images: grouped.get(item.id) || [] })), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  let galleryId: number | null = null;
  const copiedKeys: string[] = [];
  try {
    const { imageId, recordId } = await readJson<{ imageId?: unknown; recordId?: unknown }>(request, 2048);
    if (!Number.isInteger(imageId) || !Number.isInteger(recordId))
      return Response.json({ error: "이미지와 반영할 기록을 확인해주세요." }, { status: 400 });
    const image = await db().prepare("SELECT id,object_key,thumbnail_key,caption,memory_date,source_url,published_gallery_id FROM submission_images WHERE id=?").bind(imageId).first<SubmissionImageRow>();
    if (!image) return Response.json({ error: "제보 이미지를 찾을 수 없습니다." }, { status: 404 });
    if (image.published_gallery_id) return Response.json({ error: "이미 반영한 이미지입니다." }, { status: 409 });
    const record = await db().prepare("SELECT id FROM records WHERE id=?").bind(recordId).first();
    if (!record) return Response.json({ error: "반영할 기록을 찾을 수 없습니다." }, { status: 404 });
    const count = await db().prepare("SELECT COUNT(*) AS count FROM record_gallery WHERE record_id=?").bind(recordId).first<{ count: number }>();
    if ((count?.count || 0) >= 50) return Response.json({ error: "선택한 기록의 갤러리가 이미 50장입니다." }, { status: 400 });

    const [original, thumbnail] = await Promise.all([profileImages().get(image.object_key), profileImages().get(image.thumbnail_key)]);
    if (!original || !thumbnail) return Response.json({ error: "보관된 이미지 파일을 찾을 수 없습니다." }, { status: 404 });
    const extension = image.object_key.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
    const key = `gallery/${recordId}/${crypto.randomUUID()}.${extension}`;
    const thumbnailKey = `gallery/${recordId}/thumb-${crypto.randomUUID()}.webp`;
    await profileImages().put(key, original.body, { httpMetadata: { contentType: original.httpMetadata?.contentType || "image/jpeg", cacheControl: "public, max-age=31536000, immutable" } });
    copiedKeys.push(key);
    await profileImages().put(thumbnailKey, thumbnail.body, { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
    copiedKeys.push(thumbnailKey);
    const inserted = await db().prepare("INSERT INTO record_gallery (record_id,object_key,thumbnail_key,caption,memory_date,source_url,sort_order) VALUES (?,?,?,?,?,?,?)").bind(
      recordId, key, thumbnailKey, image.caption, image.memory_date, image.source_url, count?.count || 0,
    ).run();
    galleryId = Number(inserted.meta.last_row_id);
    await db().prepare("UPDATE submission_images SET published_gallery_id=? WHERE id=?").bind(galleryId, imageId).run();
    return Response.json({
      id: galleryId, record_id: recordId, object_key: key, thumbnail_key: thumbnailKey,
      caption: image.caption, memory_date: image.memory_date, source_url: image.source_url, submission_image_id: imageId,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (galleryId !== null) await db().prepare("DELETE FROM record_gallery WHERE id=?").bind(galleryId).run();
    await Promise.all(copiedKeys.map((key) => profileImages().delete(key)));
    return requestError(error);
  }
}

export async function PATCH(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const { id, status } = await readJson<{ id?: unknown; status?: unknown }>(request, 1024);
    if (!Number.isInteger(id) || typeof status !== "string" || !statuses.has(status))
      return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
    const result = await db().prepare("UPDATE submissions SET status=? WHERE id=?").bind(status, id).run();
    if (!result.meta.changes) return Response.json({ error: "제보를 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestError(error);
  }
}
