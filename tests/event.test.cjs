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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const localRequire = createRequire(filename);
  const requireTs = (name) =>
    name.startsWith(".")
      ? load(
          path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(filename), `${name}.ts`)),
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
const night = load("src/lib/horizons-analysis.ts");
const utc = "2026-09-08T10:00:00.000Z";

test("Horizons requests use the observer's exact coordinates and UTC", () => {
  const url = providers.horizonsUrl("saturn", types.mqLocation, utc);
  assert.equal(url.origin, "https://ssd.jpl.nasa.gov");
  assert.equal(url.searchParams.get("SITE_COORD"), "'151.1126,-33.7738,0'");
  assert.equal(url.searchParams.get("CENTER"), "'coord@399'");
  assert.equal(url.searchParams.get("TIME_TYPE"), "'UT'");
  assert.equal(url.searchParams.get("TLIST"), "'2026-09-08 10:00:00.000'");
});

test("invalid observer details and ambiguous epochs are rejected", () => {
  for (const query of ["lat=91", "lon=-181", "elevation=10001", "lat=oops"])
    assert.throws(() => providers.readLocation(new URLSearchParams(query)));
  assert.throws(() => providers.readUtc("2026-09-08T10:00"));
  assert.throws(() => providers.readUtc("banana"));
});

test("weather failures are explicit rather than invented", async () => {
  const service = load("src/lib/event-providers.ts", async () => ({ ok: false, status: 429 }));
  const result = await service.getEventWeather(types.mqLocation);
  assert.equal(result.status, "unavailable");
  assert.equal(result.data, null);
  assert.match(result.error, /429/);
});

test("night analysis only recommends real dark, elevated intervals", () => {
  assert.equal(night.skyState(undefined), "NASA/JPL data unavailable");
  assert.equal(night.skyState(-18), "Astronomical night");
  assert.equal(night.analyseNight(undefined, "saturn", null).best, null);
  assert.equal(night.weatherSuitable(null), null);
});
