import { adminGuard, db, ensureDatabase, profileImages, readJson, requestError } from "../../../../lib/db";

async function purgeExpiredImages() {
  const { results } = await db().prepare("SELECT id, object_key FROM deleted_record_images WHERE deleted_at < datetime('now','-30 days') LIMIT 500").all<{ id: number; object_key: string }>();
  if (!results.length) return;
  await Promise.all(results.map((image) => profileImages().delete(image.object_key)));
  await db().prepare(`DELETE FROM deleted_record_images WHERE id IN (${results.map(() => "?").join(",")})`).bind(...results.map((image) => image.id)).run();
}

export async function GET(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  await ensureDatabase();
  await purgeExpiredImages();
  const { results } = await db().prepare("SELECT * FROM deleted_record_images ORDER BY deleted_at DESC,id").all();
  return Response.json(results, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const { deletion_group: deletionGroup } = await readJson<{ deletion_group?: unknown }>(request, 1024);
    if (typeof deletionGroup !== "string" || !/^[0-9a-f-]{36}$/i.test(deletionGroup))
      return Response.json({ error: "삭제 묶음을 확인해주세요." }, { status: 400 });
    const { results } = await db().prepare("SELECT object_key FROM deleted_record_images WHERE deletion_group=?").bind(deletionGroup).all<{ object_key: string }>();
    if (!results.length) return Response.json({ error: "보관된 이미지를 찾을 수 없습니다." }, { status: 404 });
    await Promise.all(results.map((image) => profileImages().delete(image.object_key)));
    await db().prepare("DELETE FROM deleted_record_images WHERE deletion_group=?").bind(deletionGroup).run();
    return Response.json({ ok: true, deleted: results.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestError(error);
  }
}
