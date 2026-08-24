import { adminGuard, db, ensureDatabase, hasImageSignature, profileImages, readJson, requestError } from "../../../../lib/db";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const validUrl = (value: string) => { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } };

export async function POST(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  const uploadedKeys: string[] = [];
  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > 14 * 1024 * 1024) return Response.json({ error: "업로드 요청이 너무 큽니다." }, { status: 413 });
    const form = await request.formData();
    const recordId = Number(form.get("recordId"));
    const files = form.getAll("files").filter((file): file is File => file instanceof File);
    const thumbnails = form.getAll("thumbnails").filter((file): file is File => file instanceof File);
    if (!Number.isInteger(recordId) || !files.length || files.length > 10)
      return Response.json({ error: "한 번에 1~10장의 이미지를 선택해주세요." }, { status: 400 });
    if (files.some((file) => !allowedTypes.has(file.type) || file.size < 1 || file.size > 1024 * 1024))
      return Response.json({ error: "각 1MB 이하의 JPG, PNG, WEBP만 업로드할 수 있습니다." }, { status: 400 });
    if (thumbnails.length !== files.length || thumbnails.some((file) => file.type !== "image/webp" || file.size < 1 || file.size > 256 * 1024))
      return Response.json({ error: "썸네일 생성 결과를 확인해주세요." }, { status: 400 });
    const signatures = await Promise.all([...files, ...thumbnails].map(hasImageSignature));
    if (signatures.some((valid) => !valid)) return Response.json({ error: "이미지 파일 형식이 올바르지 않습니다." }, { status: 400 });
    await ensureDatabase();
    const record = await db().prepare("SELECT id FROM records WHERE id=?").bind(recordId).first();
    if (!record) return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
    const count = await db().prepare("SELECT COUNT(*) AS count FROM record_gallery WHERE record_id=?").bind(recordId).first<{ count: number }>();
    if ((count?.count || 0) + files.length > 50) return Response.json({ error: "기록당 갤러리는 최대 50장입니다." }, { status: 400 });
    const uploaded: Array<{ key: string; thumbnailKey: string; order: number }> = [];
    for (const [index, file] of files.entries()) {
      const key = `gallery/${recordId}/${crypto.randomUUID()}.${extensions[file.type]}`;
      const thumbnailKey = `gallery/${recordId}/thumb-${crypto.randomUUID()}.webp`;
      await profileImages().put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
      uploadedKeys.push(key);
      await profileImages().put(thumbnailKey, thumbnails[index].stream(), { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
      uploadedKeys.push(thumbnailKey);
      uploaded.push({ key, thumbnailKey, order: (count?.count || 0) + index });
    }
    await db().batch(uploaded.map((image) => db().prepare("INSERT INTO record_gallery (record_id,object_key,thumbnail_key,sort_order) VALUES (?,?,?,?)").bind(recordId, image.key, image.thumbnailKey, image.order)));
    const { results } = await db().prepare("SELECT id,record_id,object_key,thumbnail_key,caption,memory_date,source_url FROM record_gallery WHERE record_id=? ORDER BY sort_order,id").bind(recordId).all();
    return Response.json(results, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await Promise.all(uploadedKeys.map((key) => profileImages().delete(key)));
    return requestError(error);
  }
}

export async function PATCH(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const { id, caption, memoryDate, sourceUrl } = await readJson<{ id?: unknown; caption?: unknown; memoryDate?: unknown; sourceUrl?: unknown }>(request, 4096);
    if (!Number.isInteger(id) || typeof caption !== "string" || caption.length > 300 || typeof memoryDate !== "string" || memoryDate.length > 30 || typeof sourceUrl !== "string" || sourceUrl.length > 2048 || (sourceUrl && !validUrl(sourceUrl)))
      return Response.json({ error: "갤러리 설명을 확인해주세요." }, { status: 400 });
    const result = await db().prepare("UPDATE record_gallery SET caption=?,memory_date=?,source_url=? WHERE id=?").bind(caption.trim(), memoryDate.trim(), sourceUrl.trim(), id).run();
    if (!result.meta.changes) return Response.json({ error: "이미지를 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ id, caption: caption.trim(), memory_date: memoryDate.trim(), source_url: sourceUrl.trim() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestError(error);
  }
}

export async function DELETE(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const { id } = await readJson<{ id?: unknown }>(request, 1024);
    if (!Number.isInteger(id)) return Response.json({ error: "이미지를 확인해주세요." }, { status: 400 });
    const image = await db().prepare("SELECT object_key,thumbnail_key FROM record_gallery WHERE id=?").bind(id).first<{ object_key: string; thumbnail_key: string | null }>();
    if (!image) return Response.json({ error: "이미지를 찾을 수 없습니다." }, { status: 404 });
    await db().prepare("DELETE FROM record_gallery WHERE id=?").bind(id).run();
    await profileImages().delete(image.object_key);
    if (image.thumbnail_key) await profileImages().delete(image.thumbnail_key);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestError(error);
  }
}
