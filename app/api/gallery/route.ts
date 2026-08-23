import { db, ensureDatabase } from '../../../lib/db';
import { withPublicCors } from '../../../lib/public-cors';

export async function GET(request:Request){
  await ensureDatabase();
  const recordId=Number(new URL(request.url).searchParams.get('recordId'));
  if(!Number.isInteger(recordId))return withPublicCors(request,Response.json({error:'기록을 확인해주세요.'},{status:400}));
  const {results}=await db().prepare('SELECT id,record_id,object_key,thumbnail_key FROM record_gallery WHERE record_id=? ORDER BY sort_order,id').bind(recordId).all();
  return withPublicCors(request,Response.json(results));
}
