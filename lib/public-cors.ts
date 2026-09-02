const publicSiteOrigin = "https://off-air.github.io";

export function withPublicCors(request: Request, response: Response) {
  if (request.headers.get("origin") === publicSiteOrigin) {
    response.headers.set("Access-Control-Allow-Origin", publicSiteOrigin);
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export function publicOptions(request: Request) {
  if (request.headers.get("origin") !== publicSiteOrigin)
    return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": publicSiteOrigin,
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
