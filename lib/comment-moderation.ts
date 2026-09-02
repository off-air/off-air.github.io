import { db, runtimeEnv } from "./db";

type ModerationResult = {
  source: "openai" | "local" | "unavailable" | "limit";
  flagged: boolean;
  flags: string[];
};

const localPatterns: Array<[RegExp, string]> = [
  [/(?:https?:\/\/|www\.)\S+/i, "외부 링크"],
  [/(.)\1{11,}/u, "반복 문자"],
  [/(죽어|꺼져|병신|씨발|시발|개새끼|느금마)/iu, "모욕·비방 표현"],
];

export function localCommentFlags(nickname: string, body: string) {
  const input = `${nickname}\n${body}`;
  return localPatterns.filter(([pattern]) => pattern.test(input)).map(([, label]) => label);
}

async function reserveModerationRequest() {
  const usageDay = new Date().toISOString().slice(0, 10);
  await db().prepare(
    "INSERT INTO daily_usage (usage_day,usage_key,request_count) VALUES (?,'openai-moderation',1) ON CONFLICT(usage_day,usage_key) DO UPDATE SET request_count=request_count+1",
  ).bind(usageDay).run();
  const row = await db().prepare(
    "SELECT request_count FROM daily_usage WHERE usage_day=? AND usage_key='openai-moderation'",
  ).bind(usageDay).first<{ request_count: number }>();
  if ((row?.request_count || 0) % 200 === 0)
    await db().prepare("DELETE FROM daily_usage WHERE usage_day < date('now','-14 day')").run();
  return (row?.request_count || 0) <= 3000;
}

export async function moderateComment(nickname: string, body: string): Promise<ModerationResult> {
  const localFlags = localCommentFlags(nickname, body);
  if (localFlags.length) return { source: "local", flagged: true, flags: localFlags };
  const apiKey = runtimeEnv().OPENAI_API_KEY;
  if (!apiKey) return { source: "unavailable", flagged: true, flags: ["자동 검토 미설정"] };
  if (!(await reserveModerationRequest()))
    return { source: "limit", flagged: true, flags: ["일일 자동 검토 안전 한도"] };
  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: `${nickname}\n${body}` }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`moderation ${response.status}`);
    const result = await response.json() as {
      results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }>;
    };
    const moderation = result.results?.[0];
    if (!moderation) throw new Error("missing moderation result");
    const flags = Object.entries(moderation.categories || {}).filter(([, flagged]) => flagged).map(([category]) => category);
    return { source: "openai", flagged: Boolean(moderation.flagged), flags };
  } catch (error) {
    console.error(JSON.stringify({ message: "comment moderation unavailable", error: error instanceof Error ? error.message : String(error) }));
    return { source: "unavailable", flagged: true, flags: ["자동 검토 일시 오류"] };
  }
}

export async function verifyTurnstile(token: string, request: Request) {
  const secret = runtimeEnv().TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    const remoteIp = request.headers.get("cf-connecting-ip");
    if (remoteIp) body.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json() as { success?: boolean };
    return response.ok && result.success === true;
  } catch {
    return false;
  }
}

export async function hashDeleteToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export function createDeleteToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
