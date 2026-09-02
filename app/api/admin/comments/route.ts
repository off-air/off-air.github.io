import { adminGuard, db, readJson, requestError } from "../../../../lib/db";

const statuses = new Set(["pending", "approved", "rejected"]);

export async function GET(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  const [comments, events] = await Promise.all([
    db().prepare(
      `SELECT c.id,c.record_id,r.name AS record_name,c.nickname,c.body,c.status,c.moderation_source,c.moderation_flags,c.created_at,c.updated_at,c.reviewed_at
       FROM record_comments c JOIN records r ON r.id=c.record_id ORDER BY c.created_at DESC,c.id DESC LIMIT 500`,
    ).all(),
    db().prepare("SELECT id,comment_id,record_id,action,reason,created_at FROM comment_events ORDER BY created_at DESC,id DESC LIMIT 100").all(),
  ]);
  return Response.json({ comments: comments.results, events: events.results }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const input = await readJson<{ id?: unknown; status?: unknown }>(request, 1024);
    if (!Number.isInteger(input.id) || typeof input.status !== "string" || !statuses.has(input.status))
      return Response.json({ error: "처리 상태를 확인해주세요." }, { status: 400 });
    const result = await db().prepare(
      "UPDATE record_comments SET status=?,updated_at=CURRENT_TIMESTAMP,reviewed_at=CURRENT_TIMESTAMP,moderation_source='manual' WHERE id=?",
    ).bind(input.status, input.id).run();
    if (!result.meta.changes) return Response.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestError(error);
  }
}

export async function DELETE(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const input = await readJson<{ id?: unknown }>(request, 1024);
    if (!Number.isInteger(input.id)) return Response.json({ error: "댓글을 확인해주세요." }, { status: 400 });
    const row = await db().prepare("SELECT id,record_id FROM record_comments WHERE id=?").bind(input.id).first<{ id: number; record_id: number }>();
    if (!row) return Response.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    await db().batch([
      db().prepare("INSERT INTO comment_events (comment_id,record_id,action,reason) VALUES (?,?,'admin_deleted','관리자 삭제')").bind(row.id, row.record_id),
      db().prepare("DELETE FROM record_comments WHERE id=?").bind(row.id),
    ]);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestError(error);
  }
}
