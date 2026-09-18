const { test, expect } = require("@playwright/test");
test.skip(process.env.SPACE_INTERPRETER_PRODUCTION_TEST !== "1", "Run explicitly against a local production server.");

test("production pages send browser security headers", async ({ request }) => {
  const response = await request.get("/join");
  expect(response.ok()).toBe(true);
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["permissions-policy"]).toContain("geolocation=(self)");
  expect(headers["strict-transport-security"]).toBe("max-age=31536000");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("development network information is disabled in production", async ({ request }) => {
  const response = await request.get("/api/local-address");
  expect(response.status()).toBe(404);
  expect(await response.json()).not.toHaveProperty("origin");
});

test("public API enforces throttling without contacting external providers", async ({ request }) => {
  let response;
  for (let index = 0; index <= 300; index++) {
    response = await request.get("/api/locations/search?q=a");
    if (response.status() === 429) break;
    expect(response.status()).toBe(400);
  }
  expect(response.status()).toBe(429);
  expect(Number(response.headers()["retry-after"])).toBeGreaterThan(0);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect((await response.json()).error).toContain("Too many requests");
});
