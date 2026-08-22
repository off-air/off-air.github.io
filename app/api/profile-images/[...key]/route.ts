import { profileImages } from '../../../../lib/db';

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const object = await profileImages().get(key.join('/'));
  if (!object?.body) return new Response('Not found', { status: 404 });
  const headers = new Headers({ 'Cache-Control': 'public, max-age=31536000, immutable', ETag: object.httpEtag });
  object.writeHttpMetadata(headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(object.body, { headers });
}
