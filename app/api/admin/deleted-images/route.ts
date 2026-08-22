import { db, ensureDatabase, isAdmin, profileImages } from '../../../../lib/db';

export async function GET(request:Request){
  if(!isAdmin(request))return Response.json({error:'관리자 인증이 필요합니다.'},{status:401});
  await ensureDatabase();
  const {results}=await db().prepare('SELECT * FROM deleted_record_images ORDER BY deleted_at DESC,id').all();
  return Response.json(results);
}

export async function DELETE(request:Request){
  if(!isAdmin(request))return Response.json({error:'관리자 인증이 필요합니다.'},{status:401});
  await ensureDatabase();
  const {deletion_group}=await request.json() as {deletion_group?:string};
  if(!deletion_group)return Response.json({error:'삭제 묶음을 확인해주세요.'},{status:400});
  const {results}=await db().prepare('SELECT object_key FROM deleted_record_images WHERE deletion_group=?').bind(deletion_group).all<{object_key:string}>();
  if(!results.length)return Response.json({error:'보관된 이미지를 찾을 수 없습니다.'},{status:404});
  await Promise.all(results.map(image=>profileImages().delete(image.object_key)));
  await db().prepare('DELETE FROM deleted_record_images WHERE deletion_group=?').bind(deletion_group).run();
  return Response.json({ok:true,deleted:results.length});
}
