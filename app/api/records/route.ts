import { db, ensureDatabase } from '../../../lib/db';
export async function GET(){
  await ensureDatabase();
  const {results}=await db().prepare(`SELECT r.*, r.base_memories + COUNT(m.visitor_id) AS memories FROM records r LEFT JOIN remembrance m ON m.record_id=r.id WHERE r.published=1 GROUP BY r.id ORDER BY r.last_activity DESC`).all();
  const rows=results as unknown as Array<{tags:string;last_activity:string;[key:string]:unknown}>;
  return Response.json(rows.map(r=>({...r,last:r.last_activity,tags:JSON.parse(r.tags||'[]')})));
}
