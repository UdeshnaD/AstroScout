const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");

function load(file, fetchMock = global.fetch) {
  const filename = path.resolve(__dirname, "..", file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", "fetch", compiled)(
    createRequire(filename),
    module,
    module.exports,
    fetchMock,
  );
  return module.exports;
}

const model = load("src/lib/recommender.ts");
const astronomy = load("src/lib/astronomy.ts");
const nswLocations = load("src/lib/nsw-postcode.ts");
const weatherData = {
  cloudCover: 20,
  visibilityKm: 25,
  precipitationChance: 0,
};
function spot(id, bortleRating, travelTimeMinutes, weather = weatherData) {
  return {
    id,
    bortleRating,
    travelTimeMinutes,
    weather: { ...weather, hourly: [weather, { ...weather, cloudCover: 90 }] },
    astronomy: { moonIllumination: 30 },
  };
}
const nearby = spot("nearby", 8, 10);
const dark = spot("dark", 3, 120);

test("features stay within 0-1 and weights normalize without NaN", () => {
  assert.ok(model.featuresFor(nearby).every((v) => v >= 0 && v <= 1));
  assert.equal(
    model.contributions([1, 1, 1, 1], [80, 50, 50, 20]).reduce((a, b) => a + b),
    100,
  );
  assert.equal(
    model.contributions([1, 1, 1, 1], [0, 0, 0, 0]).reduce((a, b) => a + b),
    100,
  );
});

test("changing observing priorities reverses the near-versus-dark tradeoff", () => {
  assert.equal(
    model.rankPlans(
      [nearby, dark],
      model.observingProfiles["Quick trip"],
      [],
      false,
    )[0].id,
    "nearby",
  );
  assert.equal(
    model.rankPlans(
      [nearby, dark],
      model.observingProfiles["Deep sky"],
      [],
      false,
    )[0].id,
    "dark",
  );
});

test("hour selection changes weather features and score", () => {
  assert.ok(
    model.rankPlans([nearby], model.defaultPriorities, [], false, 0)[0].score >
      model.rankPlans([nearby], model.defaultPriorities, [], false, 1)[0].score,
  );
});

test("known NSW place names and postcodes resolve without a geocoder request", async () => {
  const byPostcode = await nswLocations.resolveNswLocation("2780");
  const byName = await nswLocations.resolveNswLocation("Katoomba");
  assert.equal(byPostcode.label, "Katoomba NSW 2780");
  assert.deepEqual(byName, byPostcode);
});

test("Melbourne resolves to the expanded observing catalogue area", async () => {
  const location = await nswLocations.resolveNswLocation("Melbourne");
  assert.equal(location.label, "Melbourne VIC 3000");
  assert.equal(location.postcode, "3000");
});

test("logistic regression learns the labelled feature direction", () => {
  const labels = [
    { id: "a", features: [1, 1, 0, 0], liked: true },
    { id: "b", features: [0, 0, 1, 1], liked: false },
  ];
  const trained = model.trainPreferenceModel(labels);
  assert.ok(
    model.preferenceScore(labels[0].features, trained) >
      model.preferenceScore(labels[1].features, trained),
  );
  assert.ok(trained.weights[0] > 0 && trained.weights[2] < 0);
  assert.deepEqual(trained, model.trainPreferenceModel(labels));
});

test("learning has no effect without labels or when disabled, and influence is capped", () => {
  const baseline = model.rankPlans(
    [nearby],
    model.defaultPriorities,
    [],
    false,
  )[0];
  assert.equal(
    baseline.score,
    model.rankPlans([nearby], model.defaultPriorities, [], true)[0].score,
  );
  const labels = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    features: [1, 1, 0, 0],
    liked: true,
  }));
  assert.equal(
    baseline.score,
    model.rankPlans([nearby], model.defaultPriorities, labels, false)[0].score,
  );
  const learned = model.rankPlans(
    [nearby],
    model.defaultPriorities,
    labels,
    true,
  )[0];
  assert.equal(learned.learnedShare, 0.3);
  assert.ok(learned.score >= 0 && learned.score <= 100);
});

test("sky positions change with time and observer coordinates", () => {
  const first = astronomy.getAstronomySummary(
    "2026-09-07T10:00:00Z",
    -33.77,
    151.11,
  );
  const later = astronomy.getAstronomySummary(
    "2026-09-07T14:00:00Z",
    -33.77,
    151.11,
  );
  const other = astronomy.getAstronomySummary(
    "2026-09-07T10:00:00Z",
    51.5,
    -0.1,
  );
  assert.notEqual(first.highlights[0].altitude, later.highlights[0].altitude);
  assert.notEqual(first.highlights[0].altitude, other.highlights[0].altitude);
  assert.ok(first.moonIllumination >= 0 && first.moonIllumination <= 100);
  const saturn = first.highlights.find((target) => target.id === "saturn");
  assert.ok(saturn.technical);
  assert.equal(typeof saturn.technical.rightAscension, "number");
  assert.equal(typeof saturn.technical.declination, "number");
  assert.ok(saturn.technical.constellation.length > 0);
  assert.ok(saturn.technical.moonSeparation >= 0);
  assert.ok(saturn.technical.moonSeparation <= 180);
  assert.equal(first.aurora.direction, "Southern horizon");
  assert.ok(["Not visible", "Very low", "Low", "Moderate"].includes(first.aurora.potential));
  assert.ok(["Daylight", "Twilight", "Dark sky"].includes(first.aurora.visibility));
  assert.equal(
    astronomy.getAstronomySummary("2026-09-07T02:00:00Z", -33.77, 151.11)
      .aurora.potential,
    "Not visible",
  );
  assert.equal(
    astronomy.getAstronomySummary("2026-09-07T10:00:00Z", 51.5, -0.1)
      .aurora.direction,
    "Northern horizon",
  );
  assert.ok(
    first.highlights.every((p) => p.altitude >= -90 && p.altitude <= 90),
  );
});

test("after-midnight astronomy retains the preceding evening twilight", () => {
  const evening = astronomy.getAstronomySummary("2026-09-07T10:00:00Z");
  const overnight = astronomy.getAstronomySummary("2026-09-07T16:00:00Z");
  assert.equal(evening.astronomicalTwilight, overnight.astronomicalTwilight);
});

const providerSpot = { id: "test", latitude: -33.77, longitude: 151.11 };
function forecastData() {
  return {
    hourly: {
      time: ["2026-09-07T10:00", "2026-09-07T11:00"],
      cloud_cover: [10, 20],
      visibility: [20000, 18000],
      precipitation_probability: [5, 10],
      wind_speed_10m: [12, 15],
      temperature_2m: [15, 14],
    },
  };
}

test("valid provider data preserves zeroes and converts visibility from metres", async () => {
  const data = forecastData();
  data.hourly.cloud_cover[0] = 0;
  const weather = load("src/lib/weather.ts", async () => ({
    ok: true,
    json: async () => data,
  }));
  const result = await weather.getWeatherForSpot(
    providerSpot,
    "2026-09-07T10:00:00Z",
  );
  assert.equal(result.source, "open-meteo");
  assert.equal(result.cloudCover, 0);
  assert.equal(result.visibilityKm, 20);
});

test("Tonight's noon-to-noon timeline retains afternoon and after-midnight hours", async () => {
  const start = Date.parse("2026-09-07T02:00:00Z"); // 12pm Sydney time
  const data = { hourly: { time: [], cloud_cover: [], visibility: [], precipitation_probability: [], wind_speed_10m: [], temperature_2m: [] } };
  for (let offset = 0; offset < 26; offset += 1) {
    data.hourly.time.push(new Date(start + offset * 3600000).toISOString().slice(0, 16));
    data.hourly.cloud_cover.push(20);
    data.hourly.visibility.push(20000);
    data.hourly.precipitation_probability.push(0);
    data.hourly.wind_speed_10m.push(10);
    data.hourly.temperature_2m.push(15);
  }
  const weather = load("src/lib/weather.ts", async () => ({
    ok: true,
    json: async () => data,
  }));
  const result = await weather.getWeatherForSpot(
    providerSpot,
    "2026-09-07T10:00:00Z", // 8pm Sydney time
  );
  assert.equal(result.hourly[0].time, "2026-09-07T02:00:00.000Z");
  assert.ok(result.hourly.some((point) => point.time === "2026-09-07T14:00:00.000Z"));
});

test("missing data returns unavailable without generated values", async () => {
  const data = forecastData();
  data.hourly.cloud_cover[0] = null;
  const weather = load("src/lib/weather.ts", async () => ({
    ok: true,
    json: async () => data,
  }));
  assert.equal(
    await weather.getWeatherForSpot(providerSpot, "2026-09-07T10:00:00Z"),
    null,
  );
});

test("out-of-range dates never reuse the nearest available forecast as live data", async () => {
  const weather = load("src/lib/weather.ts", async () => ({
    ok: true,
    json: async () => forecastData(),
  }));
  assert.equal(
    await weather.getWeatherForSpot(providerSpot, "2026-09-20T10:00:00Z"),
    null,
  );
});

test("network failure returns unavailable", async () => {
  const weather = load("src/lib/weather.ts", async () => {
    throw new Error("offline");
  });
  const result = await weather.getWeatherForSpot(
    providerSpot,
    "2026-09-07T10:00:00Z",
  );
  assert.equal(result, null);
});

test("physically invalid provider values are rejected", async () => {
  const data = forecastData();
  data.hourly.visibility[0] = -1;
  const weather = load("src/lib/weather.ts", async () => ({
    ok: true,
    json: async () => data,
  }));
  assert.equal(
    await weather.getWeatherForSpot(providerSpot, "2026-09-07T10:00:00Z"),
    null,
  );
});

const observation = load("src/lib/observation-model.ts");
// Synthetic fixtures verify the algorithm only. They never ship as observation data.
function attempts() {
  return Array.from({ length: 200 }, (_, i) => {
    const time = new Date(
      Date.UTC(2025, 0, 1 + Math.floor(i / 20), 10),
    ).toISOString();
    const capturedAt = new Date(Date.parse(time) - 3600000).toISOString();
    return {
      version: 1,
      id: String(i),
      siteId: `site-${i % 20}`,
      siteName: "Test fixture",
      target: "saturn",
      equipment: { kind: "telescope", aperture: 130, magnification: 65 },
      time,
      capturedAt,
      forecastFetchedAt: capturedAt,
      source: "open-meteo",
      features: [i % 2 ? 90 : 10, 10, 20, 10, 40, -20, 0, 1, 130, 65, 4, 1],
      seen: i % 2 === 0,
      reportedAt: new Date(Date.parse(time) + 60000).toISOString(),
    };
  });
}

test("sighting model never invents a cold-start probability or pools other targets", () => {
  const model = observation.trainObservationModel([], "saturn", "telescope");
  assert.equal(
    observation.predictObservation(model, attempts()[0].features).probability,
    null,
  );
  assert.equal(
    observation.trainObservationModel(attempts(), "moon", "telescope").count,
    0,
  );
  assert.equal(
    observation.trainObservationModel(attempts(), "saturn", "eye").count,
    0,
  );
});

test("night-grouped chronological splits have no shared nights", () => {
  const split = observation.splitObservationNights(attempts());
  const sets = [split.train, split.calibration, split.test].map(
    (rows) => new Set(rows.map((r) => observation.observingNight(r.time))),
  );
  assert.ok(
    [...sets[0]].every((night) => !sets[1].has(night) && !sets[2].has(night)),
  );
  assert.ok([...sets[1]].every((night) => !sets[2].has(night)));
  assert.ok(split.train.at(-1).time < split.calibration[0].time);
  assert.ok(split.calibration.at(-1).time < split.test[0].time);
  assert.equal(
    observation.observingNight("2025-01-01T10:00:00Z"),
    observation.observingNight("2025-01-01T15:00:00Z"),
  );
});

test("calibrated forest learns outcomes, evaluates on later nights, and refuses extrapolation", () => {
  const rows = attempts();
  const model = observation.trainObservationModel(rows, "saturn", "telescope");
  assert.ok(model.brier < model.baselineBrier);
  const clear = observation.predictObservation(model, rows[0].features);
  const cloudy = observation.predictObservation(model, rows[1].features);
  assert.ok(clear.probability > cloudy.probability);
  assert.ok(clear.probability < 1 && cloudy.probability > 0);
  assert.equal(
    observation.predictObservation(
      model,
      rows[0].features.map((v, i) => (i === 8 ? 300 : v)),
    ).probability,
    null,
  );
});

test("non-predictive and one-class data cannot enable a probability", () => {
  const constant = attempts().map((r) => ({
    ...r,
    features: attempts()[0].features,
  }));
  assert.equal(
    observation.trainObservationModel(constant, "saturn", "telescope").forest,
    undefined,
  );
  assert.equal(
    observation.trainObservationModel(
      attempts().map((r) => ({ ...r, seen: true })),
      "saturn",
      "telescope",
    ).forest,
    undefined,
  );
});

test("forecast snapshots, report windows, and duplicate outcomes are validated", () => {
  const row = attempts()[0];
  assert.equal(observation.validateObservations([row, row]).length, 1);
  assert.throws(() =>
    observation.validateObservations([row, { ...row, seen: false }]),
  );
  assert.throws(() =>
    observation.validateObservations([{ ...row, source: "fallback" }]),
  );
  assert.throws(() =>
    observation.validateObservations([{ ...row, features: [1, 2] }]),
  );
  assert.throws(() =>
    observation.validateObservations([{ ...row, reportedAt: row.capturedAt }]),
  );
  assert.throws(() =>
    observation.validateObservations([{ ...row, capturedAt: row.reportedAt }]),
  );
  assert.equal(observation.canReport(row, Date.parse(row.time) - 1), false);
  assert.equal(
    observation.canReport(row, Date.parse(row.time) + 7200001),
    false,
  );
  assert.equal(observation.canReport(row, Date.parse(row.time) + 60000), true);
});

test("horizon and sunlight gates are independent of a learned score", () => {
  const sky = {
    sunAltitude: -20,
    highlights: [{ id: "saturn", name: "Saturn", altitude: -10 }],
  };
  const weather = {
    hourly: [{ cloudCover: 0, precipitationChance: 0, windKph: 0 }],
  };
  const eq = observation.equipmentPresets.telescope;
  assert.equal(
    observation.assessVisibility(sky, weather, 0, "saturn", eq).title,
    "Below the horizon",
  );
  sky.highlights[0].altitude = 40;
  sky.sunAltitude = 10;
  assert.equal(
    observation.assessVisibility(sky, weather, 0, "saturn", eq).blocked,
    true,
  );
  sky.sunAltitude = -20;
  assert.equal(
    observation.assessVisibility(sky, weather, 0, "saturn", eq).blocked,
    false,
  );
});
