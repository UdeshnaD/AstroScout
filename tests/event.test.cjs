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
const nearby = load("src/lib/nearby-places.ts");
const journal = load("src/lib/journal.ts");
const guidance = load("src/lib/object-guidance.ts");
const utc = "2026-09-08T10:00:00.000Z";

test("Horizons requests use the observer's exact coordinates and UTC", () => {
  const url = providers.horizonsUrl("saturn", types.mqLocation, utc);
  assert.equal(url.origin, "https://ssd.jpl.nasa.gov");
  assert.equal(url.searchParams.get("SITE_COORD"), "'151.1126,-33.7738,0'");
  assert.equal(url.searchParams.get("CENTER"), "'coord@399'");
  assert.equal(url.searchParams.get("TIME_TYPE"), "'UT'");
  assert.equal(url.searchParams.get("TLIST"), "'2026-09-08 10:00:00.000'");
  assert.equal(url.searchParams.get("QUANTITIES"), "'2,4,9,10,23,25,29'");
});

test("target catalogue includes the observable planets and deep-sky entries", () => {
  for (const id of [
    "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus",
    "neptune", "pluto", "milky-way-core",
    "andromeda", "large-magellanic-cloud", "small-magellanic-cloud",
    "orion-nebula", "eta-carinae", "pleiades", "omega-centauri", "hyades",
    "hercules-cluster", "eta-aquariids", "vesta", "iss",
  ]) assert.ok(types.eventTargets.some((target) => target.id === id));
  assert.equal(types.eventTargets.find((target) => target.id === "mercury").horizons.command, "199");
  assert.throws(() => providers.horizonsUrl("andromeda", types.mqLocation, utc), /no JPL Horizons observer-table target/);
  assert.equal(types.eventTargets.find((target) => target.id === "andromeda").constellation, "Andromeda");
});

test("JPL metadata fields retain source-provided constellation and angular separations", () => {
  const payload = {
    signature: { source: "NASA/JPL Horizons API", version: "1.2" },
    result: [
      "Target body name: Mars (499)",
      "Date__(UT)__HR:MN:SC.fff,Date_________JDUT,,,R.A._(a-app),DEC_(a-app),Azi_(a-app),Elev_(a-app),APmag,S-brt,Illu%,S-O-T,/r,T-O-M,MN_Illu%,Cnst,",
      "$$SOE",
      "2026-Sep-08 10:00:00.000,2461291.916666667,,,112.98725,22.49200,177.454763,-78.708247,1.235,4.480,91.27221,59.4919,/L,86.8,5.6919,Gem,",
      "$$EOE",
    ].join("\n"),
  };
  const parsed = providers.parseHorizons(payload, "mars", utc, "https://example.test/jpl");
  assert.equal(parsed.objectType, "Planet");
  assert.equal(parsed.constellation, "Gem");
  assert.equal(parsed.sunSeparation, 59.4919);
  assert.equal(parsed.moonSeparation, 86.8);
});

test("catalogue coordinates produce a real local altitude and direction", () => {
  const [andromeda] = providers.fixedEquatorialSeries(
    "andromeda",
    types.mqLocation,
    [utc],
  );
  assert.equal(andromeda.rightAscension, 10.6847);
  assert.equal(andromeda.declination, 41.2692);
  assert.ok(andromeda.altitude >= -90 && andromeda.altitude <= 90);
  assert.ok(andromeda.azimuth >= 0 && andromeda.azimuth < 360);
  assert.match(andromeda.apiVersion, /sidereal calculator/);
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

test("readiness is an additive interpretation and aurora keeps all required factors", () => {
  const point = {
    utc,
    target: { altitude: 42 },
    sun: { altitude: -22 },
    moon: null,
    weather: { cloudCover: 20, precipitation: 0, visibility: 15000, wind: 8 },
    geometric: true,
    suitable: true,
    score: 1,
  };
  const readiness = night.readinessAt(point);
  assert.equal(typeof readiness.score, "number");
  assert.match(readiness.reason, /not a sighting probability/);
  const aurora = night.assessAurora(-22, -33.77, point.weather);
  assert.match(aurora.geomagnetic, /not available/);
  assert.match(aurora.solar, /not available/);
  assert.match(aurora.weather, /support contrast/);
});

test("Geoapify place features become usable observing-place records", () => {
  const places = nearby.parseNearbyPlaces([
    {
      geometry: { coordinates: [151.2921, -33.6034] },
      properties: {
        place_id: "geo-place-1",
        name: "Coastal Lookout",
        formatted: "Coastal Lookout, New South Wales, Australia",
        distance: 12450,
        categories: ["tourism.attraction.viewpoint"],
        city: "Example Bay",
        state: "New South Wales",
        country: "Australia",
      },
    },
  ]);

  assert.deepEqual(places, [
    {
      id: "geo-place-1",
      name: "Coastal Lookout",
      address: "Coastal Lookout, New South Wales, Australia",
      latitude: -33.6034,
      longitude: 151.2921,
      distanceMeters: 12450,
      categories: ["tourism.attraction.viewpoint"],
      kind: "Viewpoint",
      city: "Example Bay",
      region: "New South Wales",
      country: "Australia",
    },
  ]);
});

test("Geoapify route results retain real road distance and duration", () => {
  assert.deepEqual(
    nearby.parseGeoapifyRoute({
      features: [{ properties: { distance: 24310.5, time: 1982.4 } }],
    }),
    { distanceMeters: 24310.5, durationSeconds: 1982.4 },
  );
  assert.equal(nearby.parseGeoapifyRoute({ features: [] }), null);
});

test("journal imports preserve valid teammate entries and reject malformed data", () => {
  const entries = journal.validJournalEntries([
    {
      id: "entry-1",
      observedAt: "2026-09-10T10:00:00.000Z",
      location: "Macquarie University",
      target: "Saturn",
      equipment: "Telescope",
      notes: "Rings visible in steady moments.",
      visibility: "Good",
      transparency: "Fair",
      conditions: "Clear",
    },
    { id: "bad", observedAt: "not-a-date" },
  ]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].target, "Saturn");
  assert.equal(entries[0].conditions, "Clear");
});

test("observing lists retain supported and imported catalogue targets", () => {
  const lists = journal.validObservingLists([
    {
      id: "list-1",
      name: "Southern sky",
      targets: ["Moon", "Large Magellanic Cloud", "Moon"],
    },
  ]);
  assert.deepEqual(lists[0].targets, ["Moon", "Large Magellanic Cloud"]);
  assert.match(guidance.objectGuidance("jupiter").equipment, /Binoculars/);
});
