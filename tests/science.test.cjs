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

test("sighting model withholds probability without real observations", () => {
  const model = observation.trainObservationModel([], "saturn", "telescope");
  assert.equal(observation.predictObservation(model, null).probability, null);
  assert.equal(model.forest, undefined);
});
test("legacy model observations and unsupported equipment are rejected", () => {
  assert.throws(() => observation.validateObservations([{version: 1}]));
  assert.equal(observation.validEquipment({kind: "eye", aperture: 100, magnification: 10}), false);
});
test("observing nights keep evening and following morning together", () => {
  assert.equal(observation.observingNight("2025-01-01T10:00:00Z"), observation.observingNight("2025-01-01T15:00:00Z"));
});
