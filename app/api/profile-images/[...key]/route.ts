import { adminGuard, db, profileImages, runtimeEnv } from '../../../../lib/db';

export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const objectKey = key.join('/');
  const admin = runtimeEnv().DEPLOYMENT_ROLE === 'admin';
  if (admin) {
    const denied = await adminGuard(request);
    if (denied) return denied;
  } else {
    const published = await db().prepare(
      'SELECT id FROM records WHERE published=1 AND avatar_key=? UNION ALL SELECT g.id FROM record_gallery g JOIN records r ON r.id=g.record_id WHERE r.published=1 AND (g.object_key=? OR g.thumbnail_key=?) LIMIT 1'
    ).bind(objectKey, objectKey, objectKey).first();
    if (!published) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const object = await profileImages().get(objectKey);
  if (!object?.body) return new Response('Not found', { status: 404 });
  const headers = new Headers({ ETag: object.httpEtag });
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, no-cache, must-revalidate');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (request.headers.get('if-none-match') === object.httpEtag) {
    await object.body.cancel();
    return new Response(null, { status: 304, headers });
  }
  return new Response(object.body, { headers });
}
