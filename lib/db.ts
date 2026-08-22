import { env } from "cloudflare:workers";

type RuntimeEnv = CloudflareEnv & { YEOJEONHI_ADMIN_TOKEN?: string };
const runtime = env as RuntimeEnv;

export function db() { return runtime.DB; }
export function profileImages() { return runtime.PROFILE_IMAGES; }

// Schema changes run through versioned D1 migrations before deployment.
export async function ensureDatabase() { return Promise.resolve(); }

async function fixedLengthHash(value: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

export async function isAdmin(request: Request) {
  const configured = runtime.YEOJEONHI_ADMIN_TOKEN;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured || !provided) return false;
  const [providedHash, configuredHash] = await Promise.all([fixedLengthHash(provided), fixedLengthHash(configured)]);
  const providedBytes = new Uint8Array(providedHash);
  const configuredBytes = new Uint8Array(configuredHash);
  let difference = providedBytes.length ^ configuredBytes.length;
  for (let index = 0; index < configuredBytes.length; index += 1)
    difference |= (providedBytes[index] || 0) ^ configuredBytes[index];
  return difference === 0;
}

export async function adminGuard(request: Request): Promise<Response | null> {
  if (await isAdmin(request)) return null;
  const allowed = await allowRequest(request, "admin-auth", 30, 900);
  return Response.json(
    { error: allowed ? "관리자 인증이 필요합니다." : "잠시 후 다시 시도해주세요." },
    { status: allowed ? 401 : 429, headers: { "Cache-Control": "no-store" } },
  );
}

export async function allowRequest(request: Request, action: string, limit: number, windowSeconds: number) {
  const identity = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const keyMaterial = runtime.YEOJEONHI_ADMIN_TOKEN || "local-development";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(keyMaterial), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${action}:${identity}`));
  const clientHash = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  await db().prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(now - 604800).run();
  await db().prepare("INSERT INTO rate_limits (action,client_hash,window_start,request_count) VALUES (?,?,?,1) ON CONFLICT(action,client_hash,window_start) DO UPDATE SET request_count=request_count+1").bind(action, clientHash, windowStart).run();
  const row = await db().prepare("SELECT request_count FROM rate_limits WHERE action=? AND client_hash=? AND window_start=?").bind(action, clientHash, windowStart).first<{ request_count: number }>();
  return (row?.request_count || 0) <= limit;
}

export async function readJson<T>(request: Request, maxBytes = 32 * 1024) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new RequestBodyError(413);
  if (!request.body) throw new RequestBodyError(400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RequestBodyError(413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400);
  }
}

export class RequestBodyError extends Error {
  constructor(public readonly status: 400 | 413) {
    super(status === 413 ? "요청이 너무 큽니다." : "요청 형식이 올바르지 않습니다.");
  }
}

export function requestError(error: unknown) {
  if (error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status });
  console.error(JSON.stringify({ message: "request failed", error: error instanceof Error ? error.message : String(error) }));
  return Response.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
}

export async function hasImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (file.type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (file.type === "image/gif") { const header = new TextDecoder().decode(bytes.slice(0, 6)); return header === "GIF87a" || header === "GIF89a"; }
  return false;
}
