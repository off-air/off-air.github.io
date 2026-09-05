import { db, readJson, requestError, allowRequest } from "../../../../lib/db";
import { constantTimeEqual, hashDeleteToken } from "../../../../lib/comment-moderation";
import { publicOptions, withPublicCors } from "../../../../lib/public-cors";

// Ownership credentials stay in the request body, never URLs or public responses.
export async function POST(request: Request) {
  try {
    if (!await allowRequest(request, "comment-mine", 120, 600))
      return withPublicCors(request, Response.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 }));
    const input = await readJson<{ recordId?: unknown; credentials?: Array<{ id: number; token: string }> }>(request, 8192);
    if (!Number.isInteger(input.recordId) || !Array.isArray(input.credentials) || input.credentials.length > 20 ||
      input.credentials.some((item) => !item || !Number.isSafeInteger(item.id) || typeof item.token !== "string" || item.token.length > 100))
      return withPublicCors(request, Response.json({ error: "입력 내용을 확인해주세요." }, { status: 400 }));
    const result = [];
    for (const credential of input.credentials) {
      const row = await db().prepare("SELECT id,record_id,nickname,body,status,created_at,delete_token_hash FROM record_comments WHERE id=? AND record_id=?")
        .bind(credential.id, input.recordId).first<{ id: number; record_id: number; nickname: string; body: string; status: string; created_at: string; delete_token_hash: string }>();
      if (row && constantTimeEqual(await hashDeleteToken(credential.token), row.delete_token_hash))
        result.push({ id: row.id, record_id: row.record_id, nickname: row.nickname, body: row.body, status: row.status, created_at: row.created_at });
    }
    return withPublicCors(request, Response.json(result.sort((a, b) => b.id - a.id), { headers: { "Cache-Control": "no-store" } }));
  } catch (error) { return withPublicCors(request, requestError(error)); }
}
export const OPTIONS = publicOptions;
