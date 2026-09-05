import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

async function route(path, mocks) {
  const source = await readFile(new URL("../" + path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = vm.createContext({ Response, Request, Headers, URL, crypto, console });
  const routeModule = new vm.SourceTextModule(code, { context });
  await routeModule.link((specifier) => {
    const values = mocks[specifier.split("/").at(-1)];
    if (!values) throw new Error("Missing mock " + specifier);
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await routeModule.evaluate();
  return routeModule.namespace;
}
const cors = { withPublicCors: (_request, response) => response, publicOptions: () => new Response(null) };
const request = (path) => new Request("https://example.test" + path);

test("private or deleted images never reach object storage", async () => {
  let reads = 0;
  const api = await route("app/api/profile-images/[...key]/route.ts", { db: {
    runtimeEnv: () => ({ DEPLOYMENT_ROLE: "public" }), adminGuard: async () => null,
    db: () => ({ prepare: (sql) => { assert.match(sql, /published=1/); return { bind: () => ({ first: async () => null }) }; } }),
    profileImages: () => ({ get: async () => { reads++; } }),
  } });
  const response = await api.GET(request("/image"), { params: Promise.resolve({ key: ["private.webp"] }) });
  assert.equal(response.status, 404);
  assert.equal(reads, 0);
});

test("admin images require authentication", async () => {
  const api = await route("app/api/profile-images/[...key]/route.ts", { db: {
    runtimeEnv: () => ({ DEPLOYMENT_ROLE: "admin" }), adminGuard: async () => new Response(null, { status: 401 }),
    db: () => assert.fail(), profileImages: () => assert.fail(),
  } });
  assert.equal((await api.GET(request("/image"), { params: Promise.resolve({ key: ["x"] }) })).status, 401);
});

test("published image revalidation returns 304 without retransmission", async () => {
  const api = await route("app/api/profile-images/[...key]/route.ts", { db: {
    runtimeEnv: () => ({ DEPLOYMENT_ROLE: "public" }), adminGuard: async () => null,
    db: () => ({ prepare: () => ({ bind: () => ({ first: async () => ({ id: 1 }) }) }) }),
    profileImages: () => ({ get: async () => ({ body: new ReadableStream(), httpEtag: '"image"', writeHttpMetadata: () => {} }) }),
  } });
  const response = await api.GET(new Request("https://example.test/image", { headers: { "if-none-match": '"image"' } }), { params: Promise.resolve({ key: ["x"] }) });
  assert.equal(response.status, 304);
  assert.match(response.headers.get("cache-control"), /no-cache/);
});

test("gallery excludes unpublished records", async () => {
  const api = await route("app/api/gallery/route.ts", { "public-cors": cors, db: {
    ensureDatabase: async () => {},
    db: () => ({ prepare: (sql) => { assert.match(sql, /r.published=1/); return { bind: () => ({ all: async () => ({ results: [] }) }) }; } }),
  } });
  assert.equal((await api.GET(request("/api/gallery?recordId=1"))).status, 200);
});

test("owner can retrieve pending comments but wrong credentials disclose nothing", async () => {
  const api = await route("app/api/comments/mine/route.ts", {
    "public-cors": cors,
    "comment-moderation": { hashDeleteToken: async (token) => token, constantTimeEqual: (a, b) => a === b },
    db: {
      allowRequest: async () => true, readJson: (req) => req.json(), requestError: () => new Response(null, { status: 400 }),
      db: () => ({ prepare: () => ({ bind: () => ({ first: async () => ({ id: 1, record_id: 2, body: "memory", status: "pending", delete_token_hash: "secret" }) }) }) }),
    },
  });
  const ownRequest = (token) => new Request("https://example.test/api/comments/mine", { method: "POST", body: JSON.stringify({ recordId: 2, credentials: [{ id: 1, token }] }) });
  const owned = await (await api.POST(ownRequest("secret"))).json();
  assert.equal(owned[0].status, "pending");
  assert.equal("delete_token_hash" in owned[0], false);
  assert.equal((await (await api.POST(ownRequest("wrong"))).json()).length, 0);
});

test("archive defaults and Turnstile CSP remain configured", async () => {
  const source = await readFile(new URL("../app/archive-client.tsx", import.meta.url), "utf8");
  const html = await readFile(new URL("../github-pages/index.html", import.meta.url), "utf8");
  assert.match(source, /pageSize, setPageSize.*useState<5 \| 10 \| 15 \| 20>\(20\)/);
  assert.match(html, /script-src 'self' https:\/\/challenges.cloudflare.com/);
  assert.match(html, /frame-src https:\/\/challenges.cloudflare.com/);
});
