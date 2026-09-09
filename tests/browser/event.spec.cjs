const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");

async function offline(page) {
  // Network-failure injection only. No fake success response enters the app.
  await page.route("**/api/event/horizons?**", (route) =>
    route.abort("failed"),
  );
  await page.route("**/api/event/weather?**", (route) => route.abort("failed"));
}
async function upload(page, format = "png", drop = false) {
  if (!page.url().endsWith("/observe")) await page.getByRole("link", { name: "Observe", exact: true }).click();
  const filename = process.env.ASTROSCOUT_TEST_IMAGE;
  test.skip(
    !filename,
    "Set ASTROSCOUT_TEST_IMAGE to a real local PNG/JPG for upload tests.",
  );
  const bytes = await fs.readFile(filename);
  const png = bytes[0] === 137;
  let payload = bytes;
  if (format === "jpeg" && png) {
    // Re-encode the supplied image for format testing; no generated sky fixture.
    const encoded = await page.evaluate(async (base64) => {
      const blob = await (
        await fetch(`data:image/png;base64,${base64}`)
      ).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0);
      bitmap.close();
      return canvas.toDataURL("image/jpeg").split(",")[1];
    }, bytes.toString("base64"));
    payload = Buffer.from(encoded, "base64");
  }
  const name =
    format === "jpeg" ? "visitor-format-test.jpg" : "visitor-format-test.png";
  const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
  if (drop) {
    const dataTransfer = await page.evaluateHandle(
      ({ bytes, name, mimeType }) => {
        const transfer = new DataTransfer();
        transfer.items.add(
          new File([new Uint8Array(bytes)], name, { type: mimeType }),
        );
        return transfer;
      },
      { bytes: [...payload], name, mimeType },
    );
    await page
      .locator(".event-dropzone")
      .dispatchEvent("drop", { dataTransfer });
    await dataTransfer.dispose();
  } else {
    await page
      .getByLabel("Choose sky image")
      .setInputFiles({ name, mimeType, buffer: payload });
  }
  await expect(page.getByAltText(/Uploaded visitor sky image/)).toBeVisible();
}

test("real JPL and Open-Meteo APIs, exact epoch, coordinates and laptop layout", async ({
  page,
  request,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const positions = page.waitForResponse((r) =>
    r.url().includes("/api/event/horizons?"),
  );
  const weather = page.waitForResponse((r) =>
    r.url().includes("/api/event/weather?"),
  );
  await page.goto("/");
  const jpl = await (await positions).json();
  const meteo = await (await weather).json();
  expect(Object.keys(jpl.objects)).toHaveLength(6);
  expect(jpl.stepMinutes).toBe(5);
  for (const series of Object.values(jpl.series)) {
    expect(series).toHaveLength(577);
    expect(series[288].utc).toBe(jpl.utc);
    expect(Date.parse(series[576].utc) - Date.parse(series[0].utc)).toBe(48 * 3600000);
  }
  for (const target of Object.values(jpl.objects)) {
    expect(target.status).toBe("available");
    expect(target.data.utc).toBe(jpl.utc);
    expect(target.data.altitude).toBeGreaterThanOrEqual(-90);
    expect(target.data.azimuth).toBeLessThanOrEqual(360);
  }
  expect(meteo.status).toBe("available");
  expect(meteo.data.current.time).toBeTruthy();
  await expect(page.getByText("Probability withheld", { exact: true })).toBeVisible();
  const timeline = page.getByRole("slider", { name: "Night timeline sample" });
  await expect(timeline).toBeVisible();
  await timeline.focus();
  await timeline.press("End");
  await expect(page.locator(".jpl-sample-readout")).toContainText("Exact sample UTC:");
  await page.getByRole("link", { name: "Night planner", exact: true }).click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.locator(".jpl-night-panel")).toContainText(jpl.utc);
  await expect(
    page.getByText("NASA/JPL data unavailable", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".event-upload-section button").filter({ hasText: "Analyse image" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /^Moon/ }).click();
  await expect(page.locator(".event-target-title h3")).toHaveText("Moon");
  await page
    .getByText("Epoch, response & rise/set information", { exact: true })
    .click();
  await expect(page.locator(".event-provenance")).toContainText(jpl.utc);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("event-laptop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("event-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
  const invalid = await request.get("/api/event/horizons?lat=999");
  expect(invalid.status()).toBe(400);
  const invalidWeather = await request.get("/api/event/weather?lon=999");
  expect(invalidWeather.status()).toBe(400);
  if (process.env.ASTROSCOUT_TEST_IMAGE) {
    await upload(page);
    await page
      .getByRole("button", { name: "Analyse image", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Analysis of uploaded image" }),
    ).toBeVisible({ timeout: 60000 });
    await page
      .getByLabel("Visitor notes (optional)")
      .fill("Software test in isolated storage, not a scientific observation.");
    await page.getByRole("button", { name: "I found it", exact: true }).click();
    await expect(page.locator(".event-history article")).toContainText(
      "JPL: available / Weather: available / Image analysis: available",
    );
    await page.getByRole("button", { name: /^Sun/ }).click();
    await expect(
      page.getByRole("button", { name: "I found it", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByText("Sun position is for context only.", { exact: true }),
    ).toBeVisible();
  }
});

test("failures and invalid/no image are explicit", async ({ page }) => {
  await offline(page);
  await page.goto("/observe");
  await expect(
    page.getByText("NASA/JPL data unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Live weather unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "I found it", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Choose sky image")
    .setInputFiles({
      name: "invalid.png",
      mimeType: "image/png",
      buffer: Buffer.from("not an image"),
    });
  await expect(
    page.getByRole("alert").filter({ hasText: "file contents" }),
  ).toBeVisible();
  await page
    .getByLabel("Choose sky image")
    .setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
  await expect(
    page.getByText("Choose a JPG, JPEG or PNG image.", { exact: true }),
  ).toBeVisible();
});

test("real PNG pixels, OpenCV, failed API snapshots, persistence and both exports", async ({
  page,
}, testInfo) => {
  await offline(page);
  await page.goto("/");
  await upload(page, "png", true);
  await page
    .getByRole("button", { name: "Analyse image", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Analysis of uploaded image" }),
  ).toBeVisible({ timeout: 60000 });
  await page
    .getByLabel("Visitor notes (optional)")
    .fill('Test run only, not a sky observation. "Quoted" notes.');
  await page
    .getByRole("button", { name: "I could not find it", exact: true })
    .click();
  await expect(
    page.getByText("Observation saved on this browser."),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("event-analysis.png"),
    fullPage: true,
  });
  for (const format of ["JSON", "CSV"]) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Export ${format}`, exact: true })
      .click();
    const result = await pending;
    const content = await fs.readFile(await result.path(), "utf8");
    expect(content).toContain("unavailable");
    expect(content).toContain("visitor-format-test.png");
    if (format === "JSON") {
      const row = JSON.parse(content).observations[0];
      expect(row.position.data).toBeNull();
      expect(row.weather.data).toBeNull();
      expect(row.analysis.brightness).toBeGreaterThanOrEqual(0);
      expect(row.analysis.source).toBe("OpenCV analysis of uploaded image");
    }
  }
  await page.reload();
  await expect(page.locator(".event-history article")).toHaveCount(1);
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: /^Delete saturn observation/ })
    .click();
  await expect(page.locator(".event-history article")).toHaveCount(0);
});

test("custom coordinates and UTC remain explicit after provider failures", async ({
  page,
}) => {
  await offline(page);
  await page.goto("/");
  await expect(
    page.getByText("NASA/JPL data unavailable", { exact: true }),
  ).toBeVisible();
  await page.getByText("Location & ephemeris time", { exact: true }).click();
  await page.getByLabel("Latitude", { exact: true }).fill("-32.5");
  await page.getByLabel("Longitude", { exact: true }).fill("150.5");
  await page.getByLabel("Elevation above reference ellipsoid (m)", { exact: true }).fill("52.125");
  await page
    .getByLabel("Position date & time (UTC)", { exact: true })
    .fill("2026-09-08T10:00");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator(".event-location-strip")).toContainText(
    "Custom observing location",
  );
  await expect(page.locator(".event-location-strip")).toContainText(
    "-32.5, 150.5",
  );
  await expect(page.locator(".event-location-strip")).toContainText("52.125 m");
  await expect(page.locator(".event-epoch")).toContainText(
    "2026-09-08T10:00:00.000Z",
  );
});

test("JPG upload and OpenCV failure can be logged without inventing analysis", async ({
  page,
}) => {
  await offline(page);
  await page.route("**/workers/sky-analysis.js", (route) =>
    route.abort("failed"),
  );
  await page.goto("/");
  await upload(page, "jpeg");
  await page
    .getByRole("button", { name: "Analyse image", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "OpenCV analysis unavailable" }),
  ).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "I found it", exact: true }).click();
  await expect(page.locator(".event-history article")).toContainText(
    "Image analysis: unavailable",
  );
  await page.getByRole("button", { name: "Remove image", exact: true }).click();
  await expect(page.getByAltText(/Uploaded visitor sky image/)).toHaveCount(0);
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Clear all observations", exact: true })
    .click();
  await expect(page.locator(".event-history article")).toHaveCount(0);
});
