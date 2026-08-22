import { db, ensureDatabase, isAdmin } from '../../../../lib/db';
type AdminRecord={id:number;name:string;handle:string;initial:string;color:string;debut:string;last:string;category:string;note:string;bio:string;tags:string[];published?:boolean};
export async function GET(request:Request){if(!isAdmin(request))return Response.json({error:'관리자 인증이 필요합니다.'},{status:401});await ensureDatabase();const {results}=await db().prepare('SELECT * FROM records ORDER BY id').all();const rows=results as unknown as Array<{tags:string;last_activity:string;[key:string]:unknown}>;return Response.json(rows.map(r=>({...r,last:r.last_activity,tags:JSON.parse(r.tags||'[]')})))}
export async function PUT(request:Request){
  if(!isAdmin(request))return Response.json({error:'관리자 인증이 필요합니다.'},{status:401});await ensureDatabase();const p=await request.json() as AdminRecord;
  if(!Number.isInteger(p.id)||!p.name||!p.handle)return Response.json({error:'필수 정보를 확인해주세요.'},{status:400});
  await db().prepare(`UPDATE records SET name=?,handle=?,initial=?,color=?,debut=?,last_activity=?,category=?,note=?,bio=?,tags=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(p.name,p.handle,p.initial,p.color,p.debut,p.last,p.category,p.note,p.bio,JSON.stringify(p.tags||[]),p.published===false?0:1,p.id).run();
  return Response.json({ok:true});
}
