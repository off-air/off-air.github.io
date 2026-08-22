import { adminGuard, db, ensureDatabase, hasImageSignature, profileImages, requestError } from "../../../../lib/db";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function POST(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > 6 * 1024 * 1024) return Response.json({ error: "업로드 요청이 너무 큽니다." }, { status: 413 });
    const form = await request.formData();
    const file = form.get("file");
    const recordId = Number(form.get("recordId"));
    if (!(file instanceof File) || !Number.isInteger(recordId)) return Response.json({ error: "파일과 기록을 확인해주세요." }, { status: 400 });
    if (!allowedTypes.has(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024 || !(await hasImageSignature(file)))
      return Response.json({ error: "5MB 이하의 올바른 JPG, PNG, WEBP, GIF만 업로드할 수 있습니다." }, { status: 400 });
    await ensureDatabase();
    const current = await db().prepare("SELECT avatar_key FROM records WHERE id=?").bind(recordId).first<{ avatar_key: string | null }>();
    if (!current) return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
    const key = `profiles/${recordId}/${crypto.randomUUID()}.${extensions[file.type]}`;
    await profileImages().put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
    try {
      await db().prepare("UPDATE records SET avatar_key=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(key, recordId).run();
    } catch (error) {
      await profileImages().delete(key);
      throw error;
    }
    if (current.avatar_key && current.avatar_key !== key) await profileImages().delete(current.avatar_key);
    return Response.json({ avatar_key: key }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestError(error);
  }
}
