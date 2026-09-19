const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./helpers/load-ts.cjs");
const { localRateLimit, clientKey, withPublicApi } = load("src/lib/api-safety.ts");
const { publicSiteOrigin } = load("src/lib/public-site.ts");
const { currentPlanningEpoch } = load("src/lib/planning-time.ts");

test("automatic planning times share the current five-minute UTC epoch", () => {
  assert.equal(currentPlanningEpoch(new Date("2026-09-19T09:43:51.721Z")), "2026-09-19T09:40:00.000Z");
  assert.equal(currentPlanningEpoch(new Date("2026-09-19T09:45:00.000Z")), "2026-09-19T09:45:00.000Z");
  assert.throws(() => currentPlanningEpoch(Number.NaN), /valid time/);
});

test("rate counters reject excess requests and reset after expiry", () => {
  assert.equal(localRateLimit("unit-window", 2, 1000).allowed, true);
  assert.equal(localRateLimit("unit-window", 2, 1001).allowed, true);
  assert.equal(localRateLimit("unit-window", 2, 1002).allowed, false);
  assert.equal(localRateLimit("unit-window", 2, 61000).allowed, true);
});

test("local clients cannot bypass limits by spoofing proxy headers", () => {
  const vercel = process.env.VERCEL;
  delete process.env.VERCEL;
  try {
    const first = new Request("http://localhost/api/event/weather", { headers: { "x-vercel-forwarded-for": "1.2.3.4" } });
    const second = new Request("http://localhost/api/event/weather", { headers: { "x-vercel-forwarded-for": "5.6.7.8" } });
    assert.equal(clientKey(first), clientKey(second));
    process.env.VERCEL = "1";
    assert.notEqual(clientKey(first), clientKey(second));
    assert.equal(clientKey(first).includes("1.2.3.4"), false);
  } finally {
    if (vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercel;
  }
});

test("QR links accept public HTTPS origins, not credentials or HTTP", () => {
  const local = "http://localhost:3000";
  assert.equal(publicSiteOrigin("https://space-interpreter.vercel.app/path", local), "https://space-interpreter.vercel.app");
  for (const input of ["http://example.com", "javascript:alert(1)", "https://user:password@example.com", "https://localhost", "https://192.168.0.39", "invalid"])
    assert.equal(publicSiteOrigin(input, local), local);
});

test("public API hides unexpected errors and disables response caching", async () => {
  const route = withPublicApi(async () => { throw new Error("secret-token-must-not-leak"); });
  const response = await route(new Request("http://localhost/api/places/route"));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Retry-After"), "10");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await response.text()).includes("secret-token"), false);
});

test("public API preserves an explicit Vercel edge-cache policy", async () => {
  const route = withPublicApi(async () => Response.json({ ok: true }, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Vercel-CDN-Cache-Control": "public, s-maxage=300",
    },
  }));
  const response = await route(new Request("http://localhost/api/event/weather"));
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
  assert.equal(response.headers.get("Vercel-CDN-Cache-Control"), "public, s-maxage=300");
});

test("requests above concurrency capacity fail quickly and slots are released", async () => {
  const releases = [];
  const route = withPublicApi(async () => new Promise((resolve) => releases.push(() => resolve(Response.json({ ok: true })))));
  const requests = Array.from({ length: 8 }, () => route(new Request("http://localhost/api/test")));
  await new Promise((resolve) => setImmediate(resolve));
  try {
    const excess = await route(new Request("http://localhost/api/test"));
    assert.equal(excess.status, 503);
  } finally {
    releases.forEach((release) => release());
    await Promise.all(requests);
  }
  const recovered = await withPublicApi(async () => Response.json({ ok: true }))(new Request("http://localhost/api/test"));
  assert.equal(recovered.status, 200);
});

test("the public wrapper returns 429 without running an over-limit handler", async () => {
  const isolated = load("src/lib/api-safety.ts");
  let calls = 0;
  const route = isolated.withPublicApi(async () => { calls++; return Response.json({ ok: true }); });
  for (let index = 0; index < 300; index++)
    assert.equal((await route(new Request("http://localhost/api/test"))).status, 200);
  const blocked = await route(new Request("http://localhost/api/test"));
  assert.equal(blocked.status, 429);
  assert.equal(calls, 300);
  assert.ok(Number(blocked.headers.get("Retry-After")) > 0);
});

test("configured shared limiter failures fail closed without exposing credentials", async () => {
  const isolated = load("src/lib/api-safety.ts");
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = "https://untrusted.example.com";
  process.env.UPSTASH_REDIS_REST_TOKEN = "private-test-token";
  try {
    const response = await isolated.withPublicApi(async () => { throw new Error("Handler must not execute"); })(new Request("http://localhost/api/test"));
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes("private-test-token"), false);
  } finally {
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  }
});

test("shared limiting sends an atomic expiring command and enforces its result", async () => {
  const isolated = load("src/lib/api-safety.ts");
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const savedFetch = global.fetch;
  process.env.UPSTASH_REDIS_REST_URL = "https://limiter-test.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "private-test-token";
  global.fetch = async (url, options) => {
    assert.equal(url.origin, "https://limiter-test.upstash.io");
    assert.equal(url.search, "");
    assert.equal(options.headers.Authorization, "Bearer private-test-token");
    const command = JSON.parse(options.body);
    assert.equal(command[0], "EVAL");
    assert.ok(command[1].includes("PEXPIRE"));
    assert.equal(command[4], "60000");
    return Response.json({ result: [301, 12000] });
  };
  try {
    const response = await isolated.withPublicApi(async () => { throw new Error("Handler must not execute"); })(new Request("http://localhost/api/test"));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "12");
  } finally {
    global.fetch = savedFetch;
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  }
});
