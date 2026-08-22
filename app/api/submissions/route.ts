import { db, ensureDatabase } from '../../../lib/db';
const validUrl=(value:string)=>{try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:'}catch{return false}};
export async function POST(request:Request){
  await ensureDatabase(); const body=await request.json() as Record<string,string>;
  if(!body.type||!body.name||!validUrl(body.channelUrl)||!body.message||body.message.length>4000||Boolean(body.sourceUrl&&!validUrl(body.sourceUrl)))return Response.json({error:'입력 내용을 확인해주세요.'},{status:400});
  const result=await db().prepare('INSERT INTO submissions (submission_type,creator_name,channel_url,message,source_url) VALUES (?,?,?,?,?)').bind(body.type.trim(),body.name.trim(),body.channelUrl.trim(),body.message.trim(),body.sourceUrl?.trim()||null).run();
  return Response.json({ok:true,id:result.meta.last_row_id},{status:201});
}
