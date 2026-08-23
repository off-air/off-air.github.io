import { env } from "cloudflare:workers";
import { withPublicCors } from "../../../lib/public-cors";

export function GET(request: Request) {
  const runtime = env as CloudflareEnv & { DEPLOYMENT_ROLE?: string };
  return withPublicCors(request, Response.json(
    { adminDeployment: runtime.DEPLOYMENT_ROLE === "admin" },
    { headers: { "Cache-Control": "no-store" } },
  ));
}
