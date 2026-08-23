import { allowRequest, db, readJson, requestError } from "../../../lib/db";
import { publicOptions, withPublicCors } from "../../../lib/public-cors";

type RemembranceBody = { recordId?: unknown; visitorId?: unknown; remember?: unknown };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await readJson<RemembranceBody>(request, 2048);
    if (!(await allowRequest(request, "remembrance", 20, 3600))) return withPublicCors(request, Response.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 }));
    if (!Number.isInteger(body.recordId) || typeof body.visitorId !== "string" || !uuidPattern.test(body.visitorId) || typeof body.remember !== "boolean") return withPublicCors(request, Response.json({ error: "잘못된 요청입니다." }, { status: 400 }));
    const recordId = body.recordId as number;
    const record = await db().prepare("SELECT id FROM records WHERE id=? AND published=1").bind(recordId).first();
    if (!record) return withPublicCors(request, Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 }));
    if (body.remember) await db().prepare("INSERT OR IGNORE INTO remembrance (record_id,visitor_id) VALUES (?,?)").bind(recordId, body.visitorId).run();
    else await db().prepare("DELETE FROM remembrance WHERE record_id=? AND visitor_id=?").bind(recordId, body.visitorId).run();
    const row = await db().prepare("SELECT base_memories + (SELECT COUNT(*) FROM remembrance WHERE record_id=?) AS memories FROM records WHERE id=?").bind(recordId, recordId).first();
    return withPublicCors(request, Response.json(row));
  } catch (error) { return withPublicCors(request, requestError(error)); }
}

export const OPTIONS = publicOptions;
