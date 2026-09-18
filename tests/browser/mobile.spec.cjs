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
      await page.screenshot({ path: testInfo.outputPath(`${path === "/" ? "home" : path.slice(1)}.png`), fullPage: true });
    }
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    await expect(page.getByRole("link", { name: "Find a spot", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Find a spot", exact: true }).click();
    await expect(page).toHaveURL(/\/places$/);
    await expect(page.locator(".event-drawer")).toHaveCount(0);
  });
}

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
