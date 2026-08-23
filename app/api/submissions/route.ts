import { allowRequest, db, readJson, requestError } from "../../../lib/db";
import { publicOptions, withPublicCors } from "../../../lib/public-cors";

type SubmissionBody = { type?: unknown; name?: unknown; channelUrl?: unknown; message?: unknown; sourceUrl?: unknown; website?: unknown };
const isText = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
const validUrl = (value: string) => { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } };

export async function POST(request: Request) {
  try {
    const body = await readJson<SubmissionBody>(request, 12 * 1024);
    if (body.website) return withPublicCors(request, Response.json({ ok: true }, { status: 201 }));
    if (!(await allowRequest(request, "submission", 5, 86400))) return withPublicCors(request, Response.json({ error: "오늘 접수 가능한 제보 수를 초과했습니다." }, { status: 429 }));
    if (!isText(body.type, 40) || !isText(body.name, 100) || !isText(body.channelUrl, 2048) || !isText(body.message, 4000)) return withPublicCors(request, Response.json({ error: "입력 내용을 확인해주세요." }, { status: 400 }));
    if (body.sourceUrl != null && body.sourceUrl !== "" && (!isText(body.sourceUrl, 2048) || !validUrl(body.sourceUrl as string))) return withPublicCors(request, Response.json({ error: "출처 주소를 확인해주세요." }, { status: 400 }));
    if (!validUrl(body.channelUrl as string)) return withPublicCors(request, Response.json({ error: "활동 채널 주소를 확인해주세요." }, { status: 400 }));
    const result = await db().prepare("INSERT INTO submissions (submission_type,creator_name,channel_url,message,source_url) VALUES (?,?,?,?,?)").bind(
      (body.type as string).trim(), (body.name as string).trim(), (body.channelUrl as string).trim(), (body.message as string).trim(), typeof body.sourceUrl === "string" ? body.sourceUrl.trim() || null : null,
    ).run();
    return withPublicCors(request, Response.json({ ok: true, id: result.meta.last_row_id }, { status: 201 }));
  } catch (error) { return withPublicCors(request, requestError(error)); }
}

export const OPTIONS = publicOptions;
