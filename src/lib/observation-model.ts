import { RandomForestClassifier } from "ml-random-forest";
import type { AstronomySummary } from "@/types/astronomy";
import type { WeatherSummary } from "@/types/weather";

export const targetIds = [
  "moon",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "milky-way-core",
  "andromeda",
  "large-magellanic-cloud",
  "small-magellanic-cloud",
  "orion-nebula",
  "eta-carinae",
  "pleiades",
  "omega-centauri",
  "hyades",
  "hercules-cluster",
] as const;
export type TargetId = (typeof targetIds)[number];
export const targetLabels: Record<TargetId, string> = {
  moon: "Moon", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn",
  "milky-way-core": "Milky Way Core", andromeda: "Andromeda Galaxy (M31)",
  "large-magellanic-cloud": "Large Magellanic Cloud (LMC)",
  "small-magellanic-cloud": "Small Magellanic Cloud (SMC)",
  "orion-nebula": "Orion Nebula (M42)", "eta-carinae": "Eta Carinae Nebula (NGC 3372)",
  pleiades: "Pleiades Star Cluster (M45)", "omega-centauri": "Omega Centauri Cluster (NGC 5139)",
  hyades: "Hyades Star Cluster", "hercules-cluster": "Hercules Globular Cluster (M13)",
};
export type Equipment = {
  kind: "eye" | "binoculars" | "telescope";
  aperture: number;
  magnification: number;
};
export const equipmentPresets: Record<Equipment["kind"], Equipment> = {
  eye: { kind: "eye", aperture: 7, magnification: 1 },
  binoculars: { kind: "binoculars", aperture: 50, magnification: 10 },
  telescope: { kind: "telescope", aperture: 130, magnification: 65 },
};
export const featureNames = [
  "Cloud cover",
  "Rain forecast",
  "Visibility",
  "Wind",
  "Target altitude",
  "Sun altitude",
  "Moon above horizon",
  "Target magnitude",
  "Aperture",
  "Magnification",
  "Estimated Bortle",
  "Forecast lead hours",
];

export type Observation = {
  version: 1;
  id: string;
  siteId: string;
  siteName: string;
  target: TargetId;
  equipment: Equipment;
  time: string;
  capturedAt: string;
  forecastFetchedAt: string;
  source: "open-meteo";
  features: number[];
  seen: boolean | null;
  reportedAt: string | null;
};

export function validEquipment(value: unknown): value is Equipment {
  if (!value || typeof value !== "object") return false;
  const e = value as Equipment;
  return (
    ["eye", "binoculars", "telescope"].includes(e.kind) &&
    Number.isFinite(e.aperture) &&
    e.aperture >= 7 &&
    e.aperture <= 500 &&
    Number.isFinite(e.magnification) &&
    e.magnification >= 1 &&
    e.magnification <= 500 &&
    (e.kind !== "eye" || (e.aperture === 7 && e.magnification === 1))
  );
}

export function observationFeatures(
  astronomy: AstronomySummary,
  weather: WeatherSummary,
  hour: number,
  targetId: TargetId,
  equipment: Equipment,
  bortle: number,
  capturedAt: string,
): number[] | null {
  const target = astronomy.highlights.find((t) => t.id === targetId);
  const point = weather.hourly[hour];
  if (
    !target ||
    !point ||
    weather.source !== "open-meteo" ||
    !validEquipment(equipment)
  )
    return null;
  const moonAltitude = astronomy.highlights.find(
    (t) => t.id === "moon",
  )?.altitude;
  if (moonAltitude === undefined) return null;
  const values = [
    point.cloudCover,
    point.precipitationChance,
    point.visibilityKm,
    point.windKph,
    target.altitude,
    astronomy.sunAltitude,
    moonAltitude > 0 ? astronomy.moonIllumination : 0,
    target.magnitude,
    equipment.aperture,
    equipment.magnification,
    bortle,
    Math.max(0, (Date.parse(point.time) - Date.parse(capturedAt)) / 3600000),
  ];
  return values.every((v) => typeof v === "number" && Number.isFinite(v))
    ? (values as number[])
    : null;
}

export function assessVisibility(
  astronomy: AstronomySummary,
  weather: WeatherSummary,
  hour: number,
  targetId: TargetId,
  equipment: Equipment,
) {
  const target = astronomy.highlights.find((t) => t.id === targetId);
  const point = weather.hourly[hour];
  if (
    !target ||
    target.altitude === undefined ||
    astronomy.sunAltitude === undefined ||
    !point ||
    !validEquipment(equipment)
  ) {
    return {
      blocked: true,
      title: "Conditions unavailable",
      reasons: ["A complete forecast and sky position are required."],
    };
  }
  if (target.altitude <= 0)
    return {
      blocked: true,
      title: "Below the horizon",
      reasons: [
        `${target.name} is ${Math.abs(target.altitude).toFixed(0)} degrees below the calculated horizon.`,
      ],
    };
  if (astronomy.sunAltitude >= 0)
    return {
      blocked: true,
      title: "Daytime observing excluded",
      reasons: [
        "This planner supports nighttime observing. Never point binoculars or a telescope towards the Sun.",
      ],
    };
  const reasons: string[] = [];
  if (target.altitude < 15)
    reasons.push(
      "Low altitude: terrain and atmospheric distortion may obstruct the view.",
    );
  if (astronomy.sunAltitude > -6)
    reasons.push("Bright twilight may make the object harder to locate.");
  if (point.cloudCover > 50)
    reasons.push(
      "Clouds cover more than half the forecast sky; gaps at the target are unknown.",
    );
  if (point.precipitationChance > 30)
    reasons.push("The forecast includes a chance of rain.");
  if (point.windKph > 20 && equipment.kind !== "eye")
    reasons.push("Wind may shake the instrument and mount.");
  if (
    equipment.kind !== "eye" &&
    equipment.magnification > equipment.aperture * 2
  )
    reasons.push(
      "Magnification is high relative to aperture; a lower-power eyepiece may provide a steadier view.",
    );
  if (!reasons.length)
    reasons.push(
      "The object is above the horizon with no major warning from the available forecast. Local obstructions and atmospheric seeing remain unknown.",
    );
  return {
    blocked: false,
    title:
      reasons.length === 1 && reasons[0].startsWith("The object")
        ? "Observing opportunity"
        : "View may be limited",
    reasons,
  };
}

export function observationKey(
  row: Pick<Observation, "siteId" | "target" | "equipment" | "time">,
) {
  return [
    row.siteId,
    row.target,
    row.equipment.kind,
    row.equipment.aperture,
    row.equipment.magnification,
    row.time,
  ].join("|");
}

export function canReport(
  row: Pick<Observation, "time" | "capturedAt">,
  now = Date.now(),
) {
  const time = Date.parse(row.time);
  return (
    Number.isFinite(time) &&
    Date.parse(row.capturedAt) <= time &&
    now >= time &&
    now <= time + 2 * 3600000
  );
}

export function validateObservations(
  value: unknown,
  now = Date.now(),
): Observation[] {
  if (!Array.isArray(value) || value.length > 2000)
    throw new Error("An observation file must contain at most 2,000 records.");
  const records = new Map<string, Observation>();
  for (const row of value as Observation[]) {
    if (
      !row ||
      row.version !== 1 ||
      typeof row.id !== "string" ||
      typeof row.siteId !== "string" ||
      typeof row.siteName !== "string" ||
      !targetIds.includes(row.target) ||
      !validEquipment(row.equipment) ||
      row.source !== "open-meteo" ||
      !Array.isArray(row.features) ||
      row.features.length !== featureNames.length ||
      !row.features.every(Number.isFinite) ||
      ![row.time, row.capturedAt, row.forecastFetchedAt].every(
        (t) => typeof t === "string" && Number.isFinite(Date.parse(t)),
      ) ||
      Date.parse(row.capturedAt) > now ||
      Date.parse(row.capturedAt) > Date.parse(row.time) ||
      Date.parse(row.forecastFetchedAt) > Date.parse(row.capturedAt) + 60000 ||
      Date.parse(row.capturedAt) - Date.parse(row.forecastFetchedAt) >
        3600000 ||
      (row.seen !== null && typeof row.seen !== "boolean") ||
      (row.seen === null
        ? row.reportedAt !== null
        : !row.reportedAt ||
          Date.parse(row.reportedAt) > now ||
          !canReport(row, Date.parse(row.reportedAt)))
    ) {
      throw new Error(
        "Invalid record: observations need a real forecast captured before the attempt and an outcome reported within two hours.",
      );
    }
    const bounds = [
      [0, 100],
      [0, 100],
      [0, 1000],
      [0, 500],
      [0, 90],
      [-90, 0],
      [0, 100],
      [-30, 30],
      [7, 500],
      [1, 500],
      [1, 9],
      [0, 168],
    ];
    if (
      row.features.some((v, i) => v < bounds[i][0] || v > bounds[i][1]) ||
      row.features[8] !== row.equipment.aperture ||
      row.features[9] !== row.equipment.magnification ||
      Math.abs(
        row.features[11] -
          (Date.parse(row.time) - Date.parse(row.capturedAt)) / 3600000,
      ) > 0.01
    ) {
      throw new Error("Observation features are outside the supported ranges.");
    }
    const key = observationKey(row);
    const previous = records.get(key);
    if (
      previous &&
      previous.seen !== null &&
      row.seen !== null &&
      previous.seen !== row.seen
    )
      throw new Error("Conflicting outcomes for the same attempt.");
    if (!previous || row.seen !== null) records.set(key, row);
  }
  return [...records.values()].sort(
    (a, b) => Date.parse(a.time) - Date.parse(b.time),
  );
}

// Noon-to-noon Sydney nights are indivisible: nearby hours cannot leak into test data.
export function observingNight(time: string) {
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(time));
  const part = (name: string) =>
    Number(local.find((p) => p.type === name)?.value);
  return new Date(
    Date.UTC(
      part("year"),
      part("month") - 1,
      part("day") - (part("hour") < 12 ? 1 : 0),
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export function splitObservationNights(rows: Observation[]) {
  const nights = [...new Set(rows.map((r) => observingNight(r.time)))].sort();
  const trainEnd = Math.floor(nights.length * 0.6);
  const calibrationEnd = Math.floor(nights.length * 0.8);
  const train = rows.filter(
    (r) => nights.indexOf(observingNight(r.time)) < trainEnd,
  );
  const calibration = rows.filter((r) => {
    const i = nights.indexOf(observingNight(r.time));
    return i >= trainEnd && i < calibrationEnd;
  });
  const test = rows.filter(
    (r) => nights.indexOf(observingNight(r.time)) >= calibrationEnd,
  );
  return { train, calibration, test, nights: nights.length };
}

type Bin = { n: number; successes: number };
export type ObservationModel = {
  status: string;
  count: number;
  nights: number;
  split?: { train: number; calibration: number; test: number };
  brier?: number;
  baselineBrier?: number;
  forest?: RandomForestClassifier;
  bins?: Bin[];
  ranges?: number[][];
};
const binIndex = (vote: number) => Math.min(2, Math.floor(vote * 3));
const binProbability = (bin: Bin) => (bin.successes + 1) / (bin.n + 2);
const hasBoth = (rows: Observation[]) =>
  rows.some((r) => r.seen === true) && rows.some((r) => r.seen === false);

export function trainObservationModel(
  all: Observation[],
  target: TargetId,
  kind: Equipment["kind"],
): ObservationModel {
  const rows = validateObservations(all).filter(
    (r) => r.seen !== null && r.target === target && r.equipment.kind === kind,
  );
  const { train, calibration, test, nights } = splitObservationNights(rows);
  const base = {
    count: rows.length,
    nights,
    split: {
      train: train.length,
      calibration: calibration.length,
      test: test.length,
    },
  };
  if (
    rows.length < 60 ||
    nights < 6 ||
    train.length < 30 ||
    calibration.length < 10 ||
    test.length < 10 ||
    ![train, calibration, test].every(hasBoth)
  ) {
    return {
      ...base,
      status:
        "Collecting evidence: at least 60 attempts across 6 nights, with successes and misses in each evaluation period, are needed for this target and equipment type.",
    };
  }
  const forest = new RandomForestClassifier({
    seed: 42,
    nEstimators: 64,
    maxFeatures: 0.7,
    replacement: false,
    useSampleBagging: true,
    noOOB: true,
    treeOptions: { maxDepth: 5, minNumSamples: 5 },
  });
  forest.train(
    train.map((r) => r.features),
    train.map((r) => Number(r.seen)),
  );
  const bins: Bin[] = Array.from({ length: 3 }, () => ({ n: 0, successes: 0 }));
  // Forest votes are not success probabilities; estimate frequencies on separate nights.
  const votes = forest.predictProbability(
    calibration.map((r) => r.features),
    1,
  );
  votes.forEach((v, i) => {
    const bin = bins[binIndex(v)];
    bin.n++;
    bin.successes += Number(calibration[i].seen);
  });
  const testVotes = forest.predictProbability(
    test.map((r) => r.features),
    1,
  );
  if (testVotes.some((v) => bins[binIndex(v)].n < 5))
    return {
      ...base,
      status:
        "More calibration observations are needed before the model can be evaluated.",
    };
  const baseline = train.filter((r) => r.seen).length / train.length;
  const brier =
    testVotes.reduce(
      (sum, v, i) =>
        sum + (binProbability(bins[binIndex(v)]) - Number(test[i].seen)) ** 2,
      0,
    ) / test.length;
  const baselineBrier =
    test.reduce((sum, r) => sum + (baseline - Number(r.seen)) ** 2, 0) /
    test.length;
  if (brier >= baselineBrier)
    return {
      ...base,
      brier,
      baselineBrier,
      status:
        "Prediction withheld: the model did not outperform the training success-rate baseline on later nights.",
    };
  const ranges = featureNames.map((_, i) => [
    Math.min(...train.map((r) => r.features[i])),
    Math.max(...train.map((r) => r.features[i])),
  ]);
  return {
    ...base,
    forest,
    bins,
    ranges,
    brier,
    baselineBrier,
    status:
      "Experimental model: evaluated on later nights, with limited personal observation data.",
  };
}

export function predictObservation(
  model: ObservationModel,
  features: number[] | null,
) {
  if (!model.forest || !model.bins || !model.ranges || !features)
    return { probability: null, reason: model.status };
  if (
    features.length !== featureNames.length ||
    features.some(
      (v, i) =>
        !Number.isFinite(v) ||
        v < model.ranges![i][0] ||
        v > model.ranges![i][1],
    )
  )
    return {
      probability: null,
      reason:
        "These conditions or equipment settings fall outside the model's training range.",
    };
  const vote = model.forest.predictProbability([features], 1)[0];
  const bin = model.bins[binIndex(vote)];
  if (bin.n < 5)
    return {
      probability: null,
      reason: "Too few calibration observations for this prediction.",
    };
  return {
    probability: binProbability(bin),
    reason: model.status,
    calibrationCount: bin.n,
  };
}
