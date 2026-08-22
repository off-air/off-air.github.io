import { adminGuard, db, ensureDatabase, readJson, requestError } from "../../../../lib/db";

const statuses = new Set(["pending", "reviewed"]);

export async function GET(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  await ensureDatabase();
  const { results } = await db().prepare("SELECT * FROM submissions ORDER BY created_at DESC, id DESC LIMIT 200").all();
  return Response.json(results, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const { id, status } = await readJson<{ id?: unknown; status?: unknown }>(request, 1024);
    if (!Number.isInteger(id) || typeof status !== "string" || !statuses.has(status))
      return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
    const result = await db().prepare("UPDATE submissions SET status=? WHERE id=?").bind(status, id).run();
    if (!result.meta.changes) return Response.json({ error: "제보를 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return requestError(error);
  }
}
