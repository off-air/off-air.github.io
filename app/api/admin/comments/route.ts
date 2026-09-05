import { adminGuard, db, readJson, requestError } from "../../../../lib/db";

const statuses = new Set(["pending", "approved", "rejected"]);

export async function GET(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const status = params.get("status") || "pending";
  if (!statuses.has(status)) return Response.json({ error: "처리 상태를 확인해주세요." }, { status: 400 });
  const oldest = params.get("sort") === "oldest";
  const before = Number(params.get("before")) || (oldest ? 0 : Number.MAX_SAFE_INTEGER);
  if (!Number.isSafeInteger(before) || before < 0) return Response.json({ error: "페이지를 확인해주세요." }, { status: 400 });
  const [comments, events, counts] = await Promise.all([
    db().prepare(
      `SELECT c.id,c.record_id,r.name AS record_name,c.nickname,c.body,c.status,c.moderation_source,c.moderation_flags,c.created_at,c.updated_at,c.reviewed_at
       FROM record_comments c JOIN records r ON r.id=c.record_id
       WHERE c.status=? AND c.id ${oldest ? ">" : "<"} ?
       ORDER BY c.id ${oldest ? "ASC" : "DESC"} LIMIT 21`,
    ).bind(status, before).all(),
    db().prepare("SELECT id,comment_id,record_id,action,reason,created_at FROM comment_events ORDER BY created_at DESC,id DESC LIMIT 100").all(),
    db().prepare("SELECT status,COUNT(*) AS total FROM record_comments GROUP BY status").all<{ status: string; total: number }>(),
  ]);
  return Response.json({ comments: comments.results.slice(0, 20), hasMore: comments.results.length > 20, counts: Object.fromEntries(counts.results.map((row) => [row.status, row.total])), events: events.results }, { headers: { "Cache-Control": "no-store" } });
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
