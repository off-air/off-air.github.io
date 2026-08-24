import { allowRequest, db, ensureDatabase, hasImageSignature, profileImages, readJson, RequestBodyError, requestError } from "../../../lib/db";
import { publicOptions, withPublicCors } from "../../../lib/public-cors";

type SubmissionBody = {
  type?: unknown;
  name?: unknown;
  channelUrl?: unknown;
  message?: unknown;
  sourceUrl?: unknown;
  website?: unknown;
  publicInfoConsent?: unknown;
  imageRights?: unknown;
};

type SubmissionInput = SubmissionBody & {
  files: File[];
  thumbnails: File[];
  captions: string[];
  memoryDates: string[];
  imageSources: string[];
};

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const isText = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
const validUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

async function readSubmission(request: Request): Promise<SubmissionInput> {
  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = await readJson<SubmissionBody>(request, 12 * 1024);
    return { ...body, files: [], thumbnails: [], captions: [], memoryDates: [], imageSources: [] };
  }
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 8 * 1024 * 1024) throw new RequestBodyError(413);
  const form = await request.formData();
  const text = (name: string) => form.get(name)?.toString() || "";
  return {
    type: text("type"), name: text("name"), channelUrl: text("channelUrl"), message: text("message"),
    sourceUrl: text("sourceUrl"), website: text("website"), publicInfoConsent: text("publicInfoConsent"), imageRights: text("imageRights"),
    files: form.getAll("images").filter((file): file is File => file instanceof File && file.size > 0),
    thumbnails: form.getAll("thumbnails").filter((file): file is File => file instanceof File && file.size > 0),
    captions: form.getAll("imageCaption").map(String),
    memoryDates: form.getAll("imageDate").map(String),
    imageSources: form.getAll("imageSource").map(String),
  };
}

export async function POST(request: Request) {
  const uploadedKeys: string[] = [];
  let submissionId: number | null = null;
  try {
    const body = await readSubmission(request);
    if (body.website) return withPublicCors(request, Response.json({ ok: true }, { status: 201 }));
    if (!(await allowRequest(request, "submission", 5, 86400)))
      return withPublicCors(request, Response.json({ error: "오늘 접수 가능한 제보 수를 초과했습니다." }, { status: 429 }));
    if (!isText(body.type, 40) || !isText(body.name, 100) || !isText(body.channelUrl, 2048) || !isText(body.message, 4000))
      return withPublicCors(request, Response.json({ error: "입력 내용을 확인해주세요." }, { status: 400 }));
    if (!validUrl(body.channelUrl as string))
      return withPublicCors(request, Response.json({ error: "활동 채널 주소를 확인해주세요." }, { status: 400 }));
    if (body.sourceUrl != null && body.sourceUrl !== "" && (!isText(body.sourceUrl, 2048) || !validUrl(body.sourceUrl as string)))
      return withPublicCors(request, Response.json({ error: "출처 주소를 확인해주세요." }, { status: 400 }));
    if (body.publicInfoConsent !== undefined && body.publicInfoConsent !== "yes")
      return withPublicCors(request, Response.json({ error: "공개 정보 확인 항목에 동의해주세요." }, { status: 400 }));

    const { files, thumbnails, captions, memoryDates, imageSources } = body;
    if (files.length > 5)
      return withPublicCors(request, Response.json({ error: "이미지는 한 번에 최대 5장까지 제보할 수 있습니다." }, { status: 400 }));
    if (files.length && body.imageRights !== "yes")
      return withPublicCors(request, Response.json({ error: "이미지 공개 및 검토 동의를 확인해주세요." }, { status: 400 }));
    if (thumbnails.length !== files.length || captions.length !== files.length || memoryDates.length !== files.length || imageSources.length !== files.length)
      return withPublicCors(request, Response.json({ error: "이미지 설명을 다시 확인해주세요." }, { status: 400 }));
    if (files.some((file) => !allowedTypes.has(file.type) || file.size > 1024 * 1024))
      return withPublicCors(request, Response.json({ error: "각 1MB 이하의 JPG, PNG, WEBP 이미지만 첨부할 수 있습니다." }, { status: 400 }));
    if (thumbnails.some((file) => file.type !== "image/webp" || file.size > 256 * 1024))
      return withPublicCors(request, Response.json({ error: "이미지 미리보기를 만들지 못했습니다." }, { status: 400 }));
    if (captions.some((caption) => !isText(caption, 300)))
      return withPublicCors(request, Response.json({ error: "각 이미지에 300자 이하의 추억을 적어주세요." }, { status: 400 }));
    if (memoryDates.some((date) => date.length > 30) || imageSources.some((source) => source.length > 2048 || (source && !validUrl(source))))
      return withPublicCors(request, Response.json({ error: "이미지 시기 또는 출처를 확인해주세요." }, { status: 400 }));
    const signatures = await Promise.all([...files, ...thumbnails].map(hasImageSignature));
    if (signatures.some((valid) => !valid))
      return withPublicCors(request, Response.json({ error: "이미지 파일 형식이 올바르지 않습니다." }, { status: 400 }));

    await ensureDatabase();
    const result = await db().prepare("INSERT INTO submissions (submission_type,creator_name,channel_url,message,source_url) VALUES (?,?,?,?,?)").bind(
      (body.type as string).trim(), (body.name as string).trim(), (body.channelUrl as string).trim(), (body.message as string).trim(),
      typeof body.sourceUrl === "string" ? body.sourceUrl.trim() || null : null,
    ).run();
    submissionId = Number(result.meta.last_row_id);
    const images: Array<{ key: string; thumbnailKey: string; caption: string; memoryDate: string; sourceUrl: string }> = [];
    for (const [index, file] of files.entries()) {
      const key = `submissions/${submissionId}/${crypto.randomUUID()}.${extensions[file.type]}`;
      const thumbnailKey = `submissions/${submissionId}/thumb-${crypto.randomUUID()}.webp`;
      await profileImages().put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "private, max-age=0" } });
      uploadedKeys.push(key);
      await profileImages().put(thumbnailKey, thumbnails[index].stream(), { httpMetadata: { contentType: "image/webp", cacheControl: "private, max-age=0" } });
      uploadedKeys.push(thumbnailKey);
      images.push({ key, thumbnailKey, caption: captions[index].trim(), memoryDate: memoryDates[index].trim(), sourceUrl: imageSources[index].trim() });
    }
    if (images.length) {
      await db().batch(images.map((image) => db().prepare(
        "INSERT INTO submission_images (submission_id,object_key,thumbnail_key,caption,memory_date,source_url) VALUES (?,?,?,?,?,?)",
      ).bind(submissionId, image.key, image.thumbnailKey, image.caption, image.memoryDate, image.sourceUrl)));
    }
    return withPublicCors(request, Response.json({ ok: true, id: submissionId }, { status: 201 }));
  } catch (error) {
    await Promise.all(uploadedKeys.map((key) => profileImages().delete(key)));
    if (submissionId !== null) await db().prepare("DELETE FROM submissions WHERE id=?").bind(submissionId).run();
    return withPublicCors(request, requestError(error));
  }
}

export const OPTIONS = publicOptions;
