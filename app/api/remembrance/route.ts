import { allowRequest, db, ensureDatabase } from '../../../lib/db';
export async function POST(request:Request){
  await ensureDatabase(); const {recordId,visitorId,remember}=await request.json() as {recordId:number;visitorId:string;remember:boolean};
  if(!await allowRequest(request,'remembrance',20,3600))return Response.json({error:'잠시 후 다시 시도해주세요.'},{status:429});
  if(!Number.isInteger(recordId)||!visitorId||visitorId.length>100)return Response.json({error:'잘못된 요청입니다.'},{status:400});
  if(remember) await db().prepare('INSERT OR IGNORE INTO remembrance (record_id,visitor_id) VALUES (?,?)').bind(recordId,visitorId).run();
  else await db().prepare('DELETE FROM remembrance WHERE record_id=? AND visitor_id=?').bind(recordId,visitorId).run();
  const row=await db().prepare('SELECT base_memories + (SELECT COUNT(*) FROM remembrance WHERE record_id=?) AS memories FROM records WHERE id=?').bind(recordId,recordId).first();
  return Response.json(row);
}
