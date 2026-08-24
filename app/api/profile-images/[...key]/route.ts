import { adminGuard, profileImages } from '../../../../lib/db';

export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  if (key[0] === 'submissions') {
    const denied = await adminGuard(request);
    if (denied) return denied;
  }
  const object = await profileImages().get(key.join('/'));
  if (!object?.body) return new Response('Not found', { status: 404 });
  const headers = new Headers({ ETag: object.httpEtag });
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', key[0] === 'submissions' ? 'private, no-store' : 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(object.body, { headers });
}
