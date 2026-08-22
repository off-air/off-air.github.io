import { env } from "cloudflare:workers";

export function GET() {
  const runtime = env as CloudflareEnv & { DEPLOYMENT_ROLE?: string };
  return Response.json(
    { adminDeployment: runtime.DEPLOYMENT_ROLE === "admin" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
