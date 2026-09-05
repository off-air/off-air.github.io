import { db, ensureDatabase } from '../../../lib/db';
import { withPublicCors } from '../../../lib/public-cors';

export async function GET(request:Request){
  await ensureDatabase();
  const recordId=Number(new URL(request.url).searchParams.get('recordId'));
  if(!Number.isInteger(recordId))return withPublicCors(request,Response.json({error:'기록을 확인해주세요.'},{status:400}));
  const {results}=await db().prepare('SELECT g.id,g.record_id,g.object_key,g.thumbnail_key,g.caption,g.memory_date,g.source_url FROM record_gallery g JOIN records r ON r.id=g.record_id WHERE g.record_id=? AND r.published=1 ORDER BY g.sort_order,g.id').bind(recordId).all();
  return withPublicCors(request,Response.json(results));
}
