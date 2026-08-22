import { db, ensureDatabase, isAdmin, profileImages } from '../../../../lib/db';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const extensions: Record<string,string> = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};

export async function POST(request:Request){
  if(!isAdmin(request))return Response.json({error:'관리자 인증이 필요합니다.'},{status:401});
  const form=await request.formData();
  const recordId=Number(form.get('recordId'));
  const files=form.getAll('files').filter((file):file is File=>file instanceof File);
  if(!Number.isInteger(recordId)||!files.length||files.length>50)return Response.json({error:'한 번에 1~50장의 이미지를 선택해주세요.'},{status:400});
  if(files.some(file=>!allowedTypes.has(file.type)||file.size>1024*1024))return Response.json({error:'각 1MB 이하의 JPG, PNG, WEBP만 업로드할 수 있습니다.'},{status:400});
  await ensureDatabase();
  const record=await db().prepare('SELECT id FROM records WHERE id=?').bind(recordId).first();
  if(!record)return Response.json({error:'기록을 찾을 수 없습니다.'},{status:404});
  const count=await db().prepare('SELECT COUNT(*) AS count FROM record_gallery WHERE record_id=?').bind(recordId).first<{count:number}>();
  if((count?.count||0)+files.length>50)return Response.json({error:'기록당 갤러리는 최대 50장입니다.'},{status:400});
  const uploaded:Array<{key:string;order:number}>=[];
  for(const [index,file] of files.entries()){
    const key=`gallery/${recordId}/${crypto.randomUUID()}.${extensions[file.type]}`;
    await profileImages().put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:'public, max-age=31536000, immutable'}});
    uploaded.push({key,order:(count?.count||0)+index});
  }
  await db().batch(uploaded.map(image=>db().prepare('INSERT INTO record_gallery (record_id,object_key,sort_order) VALUES (?,?,?)').bind(recordId,image.key,image.order)));
  const {results}=await db().prepare('SELECT id,record_id,object_key FROM record_gallery WHERE record_id=? ORDER BY sort_order,id').bind(recordId).all();
  return Response.json(results,{status:201});
}

export async function DELETE(request:Request){
  if(!isAdmin(request))return Response.json({error:'관리자 인증이 필요합니다.'},{status:401});
  await ensureDatabase();
  const {id}=await request.json() as {id?:number};
  if(!Number.isInteger(id))return Response.json({error:'이미지를 확인해주세요.'},{status:400});
  const image=await db().prepare('SELECT object_key FROM record_gallery WHERE id=?').bind(id).first<{object_key:string}>();
  if(!image)return Response.json({error:'이미지를 찾을 수 없습니다.'},{status:404});
  await db().prepare('DELETE FROM record_gallery WHERE id=?').bind(id).run();
  await profileImages().delete(image.object_key);
  return Response.json({ok:true});
}
