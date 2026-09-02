import { allowRequest, db, readJson, requestError, runtimeEnv } from "../../../lib/db";
import { constantTimeEqual, createDeleteToken, hashDeleteToken, moderateComment, verifyTurnstile } from "../../../lib/comment-moderation";
import { publicOptions, withPublicCors } from "../../../lib/public-cors";

type CommentBody = {
  recordId?: unknown;
  nickname?: unknown;
  body?: unknown;
  website?: unknown;
  turnstileToken?: unknown;
};

const cleanText = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

export async function GET(request: Request) {
  const recordId = Number(new URL(request.url).searchParams.get("recordId"));
  if (!Number.isInteger(recordId)) return withPublicCors(request, Response.json({ error: "기록을 확인해주세요." }, { status: 400 }));
  const { results } = await db().prepare(
    `SELECT c.id,c.record_id,c.nickname,c.body,c.created_at
     FROM record_comments c JOIN records r ON r.id=c.record_id
     WHERE c.record_id=? AND c.status='approved' AND r.published=1
     ORDER BY c.created_at DESC,c.id DESC LIMIT 100`,
  ).bind(recordId).all();
  return withPublicCors(request, Response.json(results, { headers: { "Cache-Control": "public, max-age=10, s-maxage=20" } }));
}

export async function POST(request: Request) {
  try {
    if (!runtimeEnv().TURNSTILE_SITE_KEY || !runtimeEnv().TURNSTILE_SECRET_KEY)
      return withPublicCors(request, Response.json({ error: "댓글 등록 기능을 준비하고 있습니다." }, { status: 503 }));
    const input = await readJson<CommentBody>(request, 8 * 1024);
    if (input.website) return withPublicCors(request, Response.json({ ok: true, status: "pending" }, { status: 201 }));
    if (!(await allowRequest(request, "comment-10m", 3, 600)) || !(await allowRequest(request, "comment-day", 10, 86400)))
      return withPublicCors(request, Response.json({ error: "댓글을 너무 자주 등록하고 있습니다. 잠시 후 다시 시도해주세요." }, { status: 429 }));
    if (!Number.isInteger(input.recordId) || typeof input.nickname !== "string" || typeof input.body !== "string" || typeof input.turnstileToken !== "string")
      return withPublicCors(request, Response.json({ error: "입력 내용을 확인해주세요." }, { status: 400 }));
    const nickname = cleanText(input.nickname);
    const body = cleanText(input.body);
    if (nickname.length < 1 || nickname.length > 20 || body.length < 2 || body.length > 300)
      return withPublicCors(request, Response.json({ error: "이름은 20자, 내용은 300자 이내로 적어주세요." }, { status: 400 }));
    const turnstileVerified = input.turnstileToken.length > 0
      ? await verifyTurnstile(input.turnstileToken, request)
      : false;
    if (input.turnstileToken.length > 0 && !turnstileVerified)
      return withPublicCors(request, Response.json({ error: "사람 확인이 만료되었습니다. 다시 확인해주세요." }, { status: 400 }));
    const recordId = input.recordId as number;
    const record = await db().prepare("SELECT id FROM records WHERE id=? AND published=1").bind(recordId).first();
    if (!record) return withPublicCors(request, Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 }));
    const moderation = await moderateComment(nickname, body);
    const status = moderation.flagged || !turnstileVerified ? "pending" : "approved";
    const moderationFlags = turnstileVerified ? moderation.flags : [...moderation.flags, "사람 확인 미완료"];
    const deleteToken = createDeleteToken();
    const tokenHash = await hashDeleteToken(deleteToken);
    const inserted = await db().prepare(
      "INSERT INTO record_comments (record_id,nickname,body,status,moderation_source,moderation_flags,delete_token_hash) VALUES (?,?,?,?,?,?,?)",
    ).bind(recordId, nickname, body, status, moderation.source, JSON.stringify(moderationFlags), tokenHash).run();
    const comment = {
      id: Number(inserted.meta.last_row_id), record_id: recordId, nickname, body, status,
      created_at: new Date().toISOString(),
    };
    return withPublicCors(request, Response.json({ comment, deleteToken }, { status: 201, headers: { "Cache-Control": "no-store" } }));
  } catch (error) {
    return withPublicCors(request, requestError(error));
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await allowRequest(request, "comment-delete", 20, 3600)))
      return withPublicCors(request, Response.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 }));
    const input = await readJson<{ commentId?: unknown; deleteToken?: unknown }>(request, 2048);
    if (!Number.isInteger(input.commentId) || typeof input.deleteToken !== "string" || input.deleteToken.length > 100)
      return withPublicCors(request, Response.json({ error: "삭제 정보를 확인해주세요." }, { status: 400 }));
    const row = await db().prepare("SELECT id,record_id,delete_token_hash FROM record_comments WHERE id=?").bind(input.commentId).first<{ id: number; record_id: number; delete_token_hash: string }>();
    if (!row) return withPublicCors(request, Response.json({ error: "이미 삭제되었거나 찾을 수 없는 댓글입니다." }, { status: 404 }));
    const providedHash = await hashDeleteToken(input.deleteToken);
    if (!constantTimeEqual(providedHash, row.delete_token_hash))
      return withPublicCors(request, Response.json({ error: "이 댓글을 삭제할 권한이 없습니다." }, { status: 403 }));
    await db().batch([
      db().prepare("INSERT INTO comment_events (comment_id,record_id,action,reason) VALUES (?,?,'author_deleted','작성자 삭제')").bind(row.id, row.record_id),
      db().prepare("DELETE FROM record_comments WHERE id=?").bind(row.id),
    ]);
    return withPublicCors(request, Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }));
  } catch (error) {
    return withPublicCors(request, requestError(error));
  }
}

export const OPTIONS = publicOptions;
