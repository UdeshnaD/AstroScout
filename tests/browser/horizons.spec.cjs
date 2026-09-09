const { test, expect } = require("@playwright/test");
const load = require("../helpers/load-ts.cjs");
const { analyseNight, forecastAt, skyState } = load(
  "src/lib/horizons-analysis.ts",
);
const { jplFeatures } = load("src/lib/jpl-sighting.ts");

test("real JPL scan preserves precision, supplies model inputs and qualifies actual forecast windows", async ({
  request,
}) => {
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
  expect(response.headers()["cache-control"]).toBe("no-store");
  const snapshot = await response.json();
  const weather = await (
    await request.get(`/api/event/weather?${params}`)
  ).json();
  expect(snapshot.location).toEqual({
    latitude: -33.7738123,
    longitude: 151.1126456,
    elevation: 52.125,
  });
  for (const [id, result] of Object.entries(snapshot.objects)) {
    expect(result.status).toBe("available");
    expect(result.data.utc).toBe(instant.toISOString());
    const query = new URL(result.data.requestUrl).searchParams;
    expect(query.get("SITE_COORD")).toBe("'151.1126456,-33.7738123,0.052125'");
    expect(snapshot.series[id]).toHaveLength(577);
    expect(snapshot.series[id][288].utc).toBe(instant.toISOString());
    expect(result.data.rightAscension).not.toBeNull();
    expect(result.data.declination).not.toBeNull();
  }
  const reportTime = new Date().toISOString();
  for (const target of ["moon", "venus", "mars", "jupiter", "saturn"]) {
    const analysis = analyseNight(snapshot, target, weather.data);
    expect(analysis.points.length).toBeGreaterThan(0);
    if (analysis.best) {
      expect(analysis.best.durationMinutes).toBeGreaterThanOrEqual(15);
      const interval = analysis.points.filter(
        (p) => p.utc >= analysis.best.start && p.utc <= analysis.best.end,
      );
      for (const point of interval) {
        expect(point.target.altitude).toBeGreaterThanOrEqual(20);
        expect(point.sun.altitude).toBeLessThanOrEqual(-18);
        expect(point.suitable).toBe(true);
        expect(
          Math.abs(Date.parse(point.utc) - Date.parse(point.weather.time)),
        ).toBeLessThanOrEqual(1800000);
      }
    }
    expect(analyseNight(snapshot, target, null).best).toBeNull();
    const equipment = { kind: "telescope", aperture: 130, magnification: 65 };
    const features = jplFeatures(
      snapshot,
      weather,
      target,
      equipment,
      reportTime,
    );
    if (features) {
      expect(features[4]).toBe(snapshot.objects[target].data.altitude);
      expect(features[5]).toBe(snapshot.objects.sun.data.altitude);
      expect(features[6]).toBe(snapshot.objects.moon.data.illumination);
      expect(features[7]).toBe(snapshot.objects[target].data.magnitude);
      expect(features[12]).toBe(snapshot.objects.moon.data.altitude);
      expect(features[0]).toBe(forecastAt(weather.data, reportTime).cloudCover);
    }
    expect(
      jplFeatures(
        snapshot,
        weather,
        target,
        equipment,
        new Date(Date.parse(reportTime) + 3600000).toISOString(),
      ),
    ).toBeNull();
  }
  expect(skyState(snapshot.objects.sun.data.altitude)).not.toBe(
    "NASA/JPL data unavailable",
  );
});

test("calendar routes and history preserve one observing session", async ({
  page,
}) => {
  await page.route("**/api/event/**", (route) => route.abort("failed"));
  await page.goto("/planner");
  await page.getByRole("button", { name: /^Jupiter/ }).click();
  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Choose an observing date" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next month" }).click();
  await page.locator(".jpl-date-grid button").first().click();
  await expect(page.locator(".event-target-title h3")).toHaveText("Jupiter");
  await page.getByRole("link", { name: "Journal", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Observation journal" }),
  ).toBeVisible();
  await expect(page.locator(".event-workspace")).toBeHidden();
  await page.getByRole("link", { name: "Observe", exact: true }).click();
  await expect(page.locator(".event-target-title h3")).toHaveText("Jupiter");
});
