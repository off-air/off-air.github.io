import { env } from "cloudflare:workers";
import { withPublicCors } from "../../../lib/public-cors";

export function GET(request: Request) {
  const runtime = env as CloudflareEnv & { DEPLOYMENT_ROLE?: string; TURNSTILE_SITE_KEY?: string; TURNSTILE_SECRET_KEY?: string };
  return withPublicCors(request, Response.json(
    {
      adminDeployment: runtime.DEPLOYMENT_ROLE === "admin",
      commentsEnabled: Boolean(runtime.TURNSTILE_SITE_KEY && runtime.TURNSTILE_SECRET_KEY),
      turnstileSiteKey: runtime.TURNSTILE_SITE_KEY || "",
    },
    { headers: { "Cache-Control": "no-store" } },
  ));
}
