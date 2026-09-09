const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");
function load(file, fetchMock = global.fetch, cache = new Map()) {
  const filename = path.resolve(__dirname, "..", file);
  if (cache.has(filename)) return cache.get(filename);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
    },
  }).outputText;
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const localRequire = createRequire(filename);
  const requireTs = (name) =>
    name.startsWith(".")
      ? load(
          path.relative(
            path.resolve(__dirname, ".."),
            path.resolve(path.dirname(filename), `${name}.ts`),
          ),
          fetchMock,
          cache,
        )
      : localRequire(name);
  new Function("require", "module", "exports", "fetch", compiled)(
    requireTs,
    module,
    module.exports,
    fetchMock,
  );
  return module.exports;
}
const providers = load("src/lib/event-providers.ts");
const types = load("src/lib/event-types.ts");
const logs = load("src/lib/event-log.ts");
const utc = "2026-09-08T10:00:00.000Z";

test("Horizons requests use exact Earth topocentric coordinates and UTC", () => {
  const url = providers.horizonsUrl("saturn", types.mqLocation, utc);
  assert.equal(url.origin, "https://ssd.jpl.nasa.gov");
  assert.equal(url.searchParams.get("COMMAND"), "'699'");
  assert.equal(url.searchParams.get("SITE_COORD"), "'151.1126,-33.7738,0'");
  assert.equal(url.searchParams.get("CENTER"), "'coord@399'");
  assert.equal(url.searchParams.get("TIME_TYPE"), "'UT'");
  assert.equal(url.searchParams.get("QUANTITIES"), "'2,4,9,10'");
  assert.equal(url.searchParams.get("APPARENT"), "'AIRLESS'");
  assert.equal(url.searchParams.get("TLIST"), "'2026-09-08 10:00:00.000'");
  const exact = providers.horizonsUrl("jupiter", { latitude: -33.7738123, longitude: 151.1126456, elevation: 52.125 }, "2026-09-08T10:00:00.123Z");
  assert.equal(exact.searchParams.get("SITE_COORD"), "'151.1126456,-33.7738123,0.052125'");
  assert.equal(providers.readUtc("2026-09-08T10:00:00.123Z"), "2026-09-08T10:00:00.123Z");
  assert.equal(exact.searchParams.get("TIME_DIGITS"), "'FRACSEC'");
});
test("reject invalid coordinates and ambiguous epochs", () => {
  for (const query of ["lat=91", "lon=-181", "lat=", "lon=oops", "elevation=10001", "elevation=-501", "elevation=oops"])
    assert.throws(() => providers.readLocation(new URLSearchParams(query)));
  assert.deepEqual(
    providers.readLocation(new URLSearchParams()),
    types.mqLocation,
  );
  assert.throws(() => providers.readUtc("2026-09-08T10:00"));
  assert.throws(() => providers.readUtc("banana"));
  assert.throws(() => providers.readUtc("2026-02-31T10:00:00Z"));
});
test("Horizons malformed/API-error responses never become positions", () => {
  for (const payload of [
    null,
    {},
    { error: "upstream failure" },
    { signature: { source: "NASA/JPL Horizons API" }, result: "No ephemeris" },
  ])
    assert.throws(() =>
      providers.parseHorizons(payload, "saturn", utc, "test"),
    );
});
test("Horizons failures preserve an unavailable result for all six targets and serialize requests", async () => {
  let active = 0,
    maximum = 0,
    calls = 0;
  const service = load("src/lib/event-providers.ts", async () => {
    active++;
    maximum = Math.max(maximum, active);
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 2));
    active--;
    return { ok: false, status: 503 };
  });
  const first = service.getHorizons(types.mqLocation, utc);
  const same = service.getHorizons(types.mqLocation, utc);
  const second = service.getHorizons(
    types.mqLocation,
    "2026-09-08T11:00:00.000Z",
  );
  assert.equal(first, same);
  const snapshots = await Promise.all([first, same, second]);
  assert.equal(calls, 12);
  assert.equal(maximum, 1);
  await service.getHorizons(types.mqLocation, utc);
  assert.equal(calls, 18, "a completed snapshot is never reused as current");
  for (const snapshot of snapshots)
    for (const result of Object.values(snapshot.objects)) {
      assert.equal(result.status, "unavailable");
      assert.equal(result.data, null);
      assert.match(result.error, /503/);
    }
});

const night = load("src/lib/horizons-analysis.ts");
const sighting = load("src/lib/jpl-sighting.ts");
test("Sun-state boundaries use explicit JPL altitude and never invent missing darkness", () => {
  assert.equal(night.skyState(undefined), "NASA/JPL data unavailable");
  assert.equal(night.skyState(0), "Daylight");
  assert.equal(night.skyState(-0.1), "Civil twilight");
  assert.equal(night.skyState(-6), "Nautical twilight");
  assert.equal(night.skyState(-12), "Astronomical twilight");
  assert.equal(night.skyState(-18), "Astronomical night");
  assert.equal(night.analyseNight(undefined, "saturn", null).best, null);
  assert.equal(night.weatherSuitable(null), null);
});
test("legacy and demonstration records cannot produce model training observations", () => {
  assert.deepEqual(sighting.trainingObservations([{ context: undefined }, { context: { schemaVersion: 2, realObservationConfirmed: false } }]), []);
  assert.equal(sighting.jplFeatures(undefined, undefined, "saturn", { kind: "telescope", aperture: 130, magnification: 65 }, utc), null);
});
test("weather fetch failures are explicit, with no generated substitute", async () => {
  for (const fetchMock of [
    async () => {
      throw new Error("offline");
    },
    async () => ({ ok: false, status: 429 }),
    async () => ({ ok: true, json: async () => ({}) }),
  ]) {
    const service = load("src/lib/event-providers.ts", fetchMock);
    const result = await service.getEventWeather(types.mqLocation);
    assert.equal(result.status, "unavailable");
    assert.equal(result.data, null);
    assert.ok(result.error);
  }
});
test("missing individual weather fields remain null and genuine zeroes are preserved", () => {
  // Deliberately incomplete parser fixture; never served to the application.
  const data = providers.parseEventWeather(
    {
      latitude: -33,
      longitude: 151,
      current: { time: 1788861600, cloud_cover: 0, temperature_2m: 0 },
      hourly: { time: [1788861600], precipitation: [0] },
    },
    types.mqLocation,
    "test-only",
  );
  assert.equal(data.current.cloudCover, 0);
  assert.equal(data.current.temperature, 0);
  assert.equal(data.current.visibility, null);
  assert.equal(data.hourly[0].precipitation, 0);
});
test("local log corruption and quota failures are surfaced", () => {
  assert.deepEqual(logs.readEventLog(null), []);
  assert.throws(() => logs.readEventLog("{}"));
  assert.throws(() => logs.readEventLog('[{"version":1}]'));
  assert.throws(
    () =>
      logs.saveEventLog(
        {
          setItem() {
            throw new Error("QuotaExceededError");
          },
        },
        [],
      ),
    /could not save/,
  );
});
test("CSV preserves failed sources, handles quotes/newlines and blocks spreadsheet formulas", () => {
  const missing = {
    status: "unavailable",
    source: "test",
    requestedAt: utc,
    receivedAt: utc,
    data: null,
    error: "offline",
  };
  const csv = logs.observationsCsv([
    {
      id: "test-only",
      target: "saturn",
      found: false,
      observedAt: utc,
      recordedAt: utc,
      location: types.mqLocation,
      requestedPositionUtc: utc,
      position: missing,
      weather: missing,
      image: { filename: "=FORMULA.png", capturedAt: null },
      analysis: null,
      analysisError: "worker failed",
      notes: 'line one\n"line two"',
    },
  ]);
  const { parse } = require("csv-parse/sync");
  const row = parse(csv, { columns: true })[0];
  assert.equal(row.position_status, "unavailable");
  assert.equal(row.altitude_deg, "unavailable");
  assert.equal(row.latitude, "-33.7738");
  assert.equal(row.image_filename, "'=FORMULA.png");
  assert.equal(row.notes, 'line one\n"line two"');
  assert.equal(row.analysis_error, "worker failed");
  assert.equal(JSON.parse(row.position_snapshot_json).error, "offline");
});
