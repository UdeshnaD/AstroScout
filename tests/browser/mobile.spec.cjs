const { test, expect } = require("@playwright/test");

for (const width of [320, 390, 768, 1366]) {
  test(`pages and navigation fit a ${width}px viewport`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width > 1000 ? 900 : 844 });
    await page.route("**/api/**", (route) => route.abort("failed"));
    for (const path of ["/", "/places", "/calendar", "/journal", "/method", "/observe", "/join"]) {
      await page.goto(path);
      await expect(page.locator(".event-brand")).toBeVisible();
      const overflow = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        return [...document.querySelectorAll("main *, header *, footer *")].filter((el) => {
          const box = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return box.width && style.position !== "absolute" && style.position !== "fixed" && box.right > viewport + 1 &&
            !el.closest("svg, .places-explorer__list, .event-header nav, .leaflet-container");
        }).map((el) => ({ tag: el.tagName, class: el.className, right: Math.round(el.getBoundingClientRect().right) }));
      });
      expect(overflow, `${path} exceeds viewport`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      if (path === "/places" && width <= 390) {
        const nearbyList = page.locator(".places-explorer__list");
        if (await nearbyList.count()) {
          expect(await nearbyList.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        }
      }
      await page.screenshot({ path: testInfo.outputPath(`${path === "/" ? "home" : path.slice(1)}.png`), fullPage: true });
    }
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    await expect(page.getByRole("link", { name: "Find a spot", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Find a spot", exact: true }).click();
    await expect(page).toHaveURL(/\/places$/);
    await expect(page.locator(".event-drawer")).toHaveCount(0);
  });
}

test("places maps use keyless Esri tiles without direct OSM or CARTO tiles", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/**", (route) => {
    if (route.request().url().includes("/api/places/nearby")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          provider: "Geoapify",
          places: [{
            id: "test-place",
            name: "Test lookout",
            address: "Sydney NSW",
            latitude: -33.8,
            longitude: 151.1,
            distanceMeters: 1000,
            categories: ["tourism.attraction.viewpoint"],
            kind: "Viewpoint",
            city: "Sydney",
            region: "NSW",
            country: "Australia",
          }],
        }),
      });
    }
    return route.abort("failed");
  });
  await page.goto("/places");
  await expect(page.locator(".leaflet-container")).toHaveCount(2, { timeout: 20000 });
  await expect(page.locator(".leaflet-control-attribution").first()).toContainText("Esri");
  await expect(page.getByText("API KEY REQUIRED")).toHaveCount(0);
  await expect(page.locator('img[src*="tile.openstreetmap.org"]')).toHaveCount(0);
  await expect(page.locator('img[src*="cartocdn.com"]')).toHaveCount(0);
  await expect(page.locator('img[src*="server.arcgisonline.com"]')).not.toHaveCount(0);
  expect(await page.locator(".places-explorer__list").evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )).toBe(true);
});

test("phone sky controls and night timeline remain usable with live data", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const sky = page.locator(".sky-overview");
  await expect(sky).toBeVisible({ timeout: 100000 });
  const diagram = sky.getByRole("img", { name: /^Interactive 360 degree sky view/ });
  await expect(diagram).toHaveAttribute("viewBox", "200 0 400 390");
  const slider = sky.getByRole("slider", { name: "Sky time" });
  await expect(sky.getByRole("button", { name: "One hour earlier", exact: true })).toBeVisible();
  await expect(sky.getByRole("button", { name: "One hour later", exact: true })).toBeVisible();
  const initial = await slider.inputValue();
  await slider.focus();
  await slider.press(Number(initial) > 0 ? "ArrowLeft" : "ArrowRight");
  await expect(slider).not.toHaveValue(initial);
  for (const icon of await sky.locator(".sky-overview-controls button svg:visible").all()) {
    expect((await icon.boundingBox()).height).toBeLessThanOrEqual(24);
  }
  await sky.scrollIntoViewIfNeeded();
  await sky.screenshot({ path: testInfo.outputPath("phone-sky.png"), style: ".event-header { visibility: hidden; }" });
  await sky.getByRole("tab", { name: "Through the night", exact: true }).click();
  await expect(page.locator("#night-view-panel")).toBeVisible();
  await expect(page.locator(".night-plan-row").first()).toBeVisible();
  const periodKey = page.getByLabel("Full timeline labels and time windows", { exact: true });
  await expect(periodKey).toBeVisible();
  const periodButton = periodKey.getByRole("button").first();
  await periodButton.click();
  for (const label of await periodKey.locator(".night-period-key__label").all()) {
    expect(await label.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  }
  expect((await sky.locator(".jpl-window > svg").boundingBox()).height).toBeLessThanOrEqual(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await sky.screenshot({ path: testInfo.outputPath("phone-night.png"), style: ".event-header { visibility: hidden; }" });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
