import { db, ensureDatabase, isAdmin, profileImages } from '../../../../lib/db';
type AdminRecord={id:number;name:string;handle:string;affiliation?:string;avatar_key?:string;activity_status?:string;initial:string;color:string;debut:string;last:string;category:string;note:string;bio:string;tags:string[];published?:boolean|number};
export async function GET(request:Request){if(!isAdmin(request))return Response.json({error:'관리자 인증이 필요합니다.'},{status:401});await ensureDatabase();const [{results},{results:gallery}]=await Promise.all([db().prepare('SELECT * FROM records ORDER BY id').all(),db().prepare('SELECT id,record_id,object_key FROM record_gallery ORDER BY sort_order,id').all<{id:number;record_id:number;object_key:string}>()]);const rows=results as unknown as Array<{id:number;tags:string;last_activity:string;[key:string]:unknown}>;return Response.json(rows.map(r=>({...r,last:r.last_activity,tags:JSON.parse(r.tags||'[]'),gallery:gallery.filter(image=>image.record_id===r.id)})))}
export async function PUT(request:Request){
  if(!isAdmin(request))return Response.json({error:'관리자 인증이 필요합니다.'},{status:401});await ensureDatabase();const p=await request.json() as AdminRecord;
  if(!Number.isInteger(p.id)||!p.name)return Response.json({error:'필수 정보를 확인해주세요.'},{status:400});
  await db().prepare(`UPDATE records SET name=?,affiliation=?,avatar_key=?,activity_status=?,initial=?,color=?,debut=?,last_activity=?,category=?,note=?,bio=?,tags=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(p.name,p.category==='소속'?(p.affiliation||''):'',p.avatar_key||null,p.activity_status||'소식이 끊긴 버튜버',p.initial||p.name.slice(0,1),p.color||'#718096',p.debut||'',p.last||'',p.category||'개인',p.note||'',p.bio||'',JSON.stringify(p.tags||[]),p.published===false||p.published===0?0:1,p.id).run();
  return Response.json({ok:true});
}
export async function POST(request:Request){
  if(!isAdmin(request))return Response.json({error:'관리자 인증이 필요합니다.'},{status:401});
  await ensureDatabase();
  const handle=`record-${crypto.randomUUID()}`;
  const result=await db().prepare(`INSERT INTO records (name,handle,affiliation,activity_status,initial,color,debut,last_activity,category,note,bio,tags,base_memories,published) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind('새 기록',handle,'','소식이 끊긴 버튜버','新','#718096','','','개인','','','[]',0,0).run();
  const id=Number(result.meta.last_row_id);
  const row=await db().prepare('SELECT *, last_activity AS last FROM records WHERE id=?').bind(id).first<Record<string,unknown>>();
  return Response.json({...row,tags:[]},{status:201});
}
export async function DELETE(request:Request){
  if(!isAdmin(request))return Response.json({error:'관리자 인증이 필요합니다.'},{status:401});
  await ensureDatabase();
  const {id}=await request.json() as {id?:number};
  if(!Number.isInteger(id))return Response.json({error:'삭제할 기록을 확인해주세요.'},{status:400});
  const record=await db().prepare('SELECT avatar_key FROM records WHERE id=?').bind(id).first<{avatar_key:string|null}>();
  if(!record)return Response.json({error:'기록을 찾을 수 없습니다.'},{status:404});
  const {results:gallery}=await db().prepare('SELECT object_key FROM record_gallery WHERE record_id=?').bind(id).all<{object_key:string}>();
  await db().batch([
    db().prepare('DELETE FROM remembrance WHERE record_id=?').bind(id),
    db().prepare('DELETE FROM record_gallery WHERE record_id=?').bind(id),
    db().prepare('DELETE FROM records WHERE id=?').bind(id),
  ]);
  if(record.avatar_key)await profileImages().delete(record.avatar_key);
  await Promise.all(gallery.map(image=>profileImages().delete(image.object_key)));
  return Response.json({ok:true});
}
