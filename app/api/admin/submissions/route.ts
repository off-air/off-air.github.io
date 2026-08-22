import { db, ensureDatabase, isAdmin } from "../../../../lib/db";

const statuses = new Set(["pending", "reviewed", "resolved"]);

export async function GET(request: Request) {
  if (!isAdmin(request))
    return Response.json(
      { error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  await ensureDatabase();
  const { results } = await db()
    .prepare(
      "SELECT * FROM submissions ORDER BY created_at DESC, id DESC LIMIT 200",
    )
    .all();
  return Response.json(results);
}

export async function PATCH(request: Request) {
  if (!isAdmin(request))
    return Response.json(
      { error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  await ensureDatabase();
  const { id, status } = (await request.json()) as {
    id: number;
    status: string;
  };
  if (!Number.isInteger(id) || !statuses.has(status))
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  await db()
    .prepare("UPDATE submissions SET status=? WHERE id=?")
    .bind(status, id)
    .run();
  return Response.json({ ok: true });
}
