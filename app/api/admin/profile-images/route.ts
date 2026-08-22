import { db, ensureDatabase, isAdmin, profileImages } from '../../../../lib/db';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });
  const form = await request.formData();
  const file = form.get('file');
  const recordId = Number(form.get('recordId'));
  if (!(file instanceof File) || !Number.isInteger(recordId)) return Response.json({ error: '파일과 기록을 확인해주세요.' }, { status: 400 });
  if (!allowedTypes.has(file.type) || file.size > 5 * 1024 * 1024) return Response.json({ error: '5MB 이하의 JPG, PNG, WEBP, GIF만 업로드할 수 있습니다.' }, { status: 400 });
  await ensureDatabase();
  const current = await db().prepare('SELECT avatar_key FROM records WHERE id=?').bind(recordId).first<{ avatar_key: string | null }>();
  if (!current) return Response.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
  const key = `profiles/${recordId}/${crypto.randomUUID()}.${extensions[file.type]}`;
  await profileImages().put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' } });
  await db().prepare('UPDATE records SET avatar_key=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(key, recordId).run();
  if (current.avatar_key && current.avatar_key !== key) await profileImages().delete(current.avatar_key);
  return Response.json({ avatar_key: key });
}
