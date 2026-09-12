const { test, expect } = require("@playwright/test");
const load = require("../helpers/load-ts.cjs");
const { analyseNight, forecastAt, skyState } = load(
  "src/lib/horizons-analysis.ts",
);

test("real JPL scan preserves precision and qualifies actual forecast windows", async ({ request }) => {
  const instant = new Date();
  instant.setUTCMilliseconds(123);
  const params = new URLSearchParams({
    lat: "-33.7738123",
    lon: "151.1126456",
    elevation: "52.125",
    utc: instant.toISOString(),
  });
  const response = await request.get(`/api/event/horizons?${params}`);
  expect(response.ok()).toBe(true);
  const snapshot = await response.json();
  const weather = await (await request.get(`/api/event/weather?${params}`)).json();
  expect(snapshot.location).toEqual({ latitude: -33.7738123, longitude: 151.1126456, elevation: 52.125 });
  for (const [id, result] of Object.entries(snapshot.objects)) {
    expect(result.status).toBe("available");
    expect(result.data.utc).toBe(instant.toISOString());
    expect(snapshot.series[id]).toHaveLength(577);
  }
  for (const target of ["moon", "venus", "mars", "jupiter", "saturn"]) {
    const analysis = analyseNight(snapshot, target, weather.data);
    if (analysis.best) {
      expect(analysis.best.durationMinutes).toBeGreaterThanOrEqual(15);
      expect(analysis.points.filter((point) => point.suitable)).not.toHaveLength(0);
    }
    expect(analyseNight(snapshot, target, null).best).toBeNull();
    expect(forecastAt(weather.data, snapshot.utc)).not.toBeNull();
  }
  expect(skyState(snapshot.objects.sun.data.altitude)).not.toBe("NASA/JPL data unavailable");
});

test("the clean dashboard exposes the planning views", async ({ page }) => {
  await page.route("**/api/event/**", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tonight's sky." })).toBeVisible();
  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Choose an observing date", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Real sky data, explained clearly." }),
  ).toBeVisible();
});
