import {
  validEquipment,
  type Equipment,
  type Observation,
} from "./observation-model";
import { forecastAt } from "./horizons-analysis";
import type {
  EventObservation,
  EventTarget,
  EventWeather,
  HorizonsSnapshot,
  SourceResult,
} from "./event-types";

export function jplFeatures(
  snapshot: HorizonsSnapshot | undefined,
  weather: SourceResult<EventWeather> | undefined,
  target: EventTarget,
  equipment: Equipment,
  reportTime: string,
): number[] | null {
  if (
    !snapshot ||
    !validEquipment(equipment) ||
    !weather?.data ||
    target === "sun" ||
    !Number.isFinite(Date.parse(reportTime))
  )
    return null;
  const bodies = [
    snapshot.objects[target],
    snapshot.objects.sun,
    snapshot.objects.moon,
  ];
  if (
    bodies.some(
      (r) =>
        !r?.data ||
        r.source !== "NASA/JPL Horizons API" ||
        r.status !== "available" ||
        r.data.utc !== snapshot.utc ||
        Date.parse(r.receivedAt) > Date.parse(reportTime) ||
        Date.parse(reportTime) - Date.parse(r.receivedAt) > 300000,
    )
  )
    return null;
  if (
    Math.abs(Date.parse(snapshot.utc) - Date.parse(reportTime)) > 300000 ||
    weather.source !== "Open-Meteo API" ||
    weather.status !== "available" ||
    Date.parse(reportTime) - Date.parse(weather.receivedAt) > 3600000 ||
    Date.parse(weather.receivedAt) > Date.parse(reportTime)
  )
    return null;
  if (
    weather.data.location.latitude !== snapshot.location.latitude ||
    weather.data.location.longitude !== snapshot.location.longitude
  )
    return null;
  const body = bodies[0].data!,
    sun = bodies[1].data!,
    moon = bodies[2].data!;
  if (body.target !== target || sun.target !== "sun" || moon.target !== "moon")
    return null;
  const point = forecastAt(weather.data, reportTime);
  if (
    !point ||
    body.altitude <= 0 ||
    sun.altitude >= 0 ||
    body.magnitude === null ||
    moon.illumination === null
  )
    return null;
  // Provider calculations/forecasts only; precipitation is mm, not an invented probability.
  const age = Math.max(
    ...bodies.map((r) => Date.parse(r.receivedAt)),
    Date.parse(weather.receivedAt),
  );
  const values = [
    point.cloudCover,
    point.precipitation,
    point.visibility == null ? null : point.visibility / 1000,
    point.wind,
    body.altitude,
    sun.altitude,
    moon.illumination,
    body.magnitude,
    equipment.aperture,
    equipment.magnification,
    point.humidity,
    (Date.parse(reportTime) - age) / 3600000,
    moon.altitude,
  ];
  return values.every((v) => typeof v === "number" && Number.isFinite(v))
    ? (values as number[])
    : null;
}

export function trainingObservations(log: EventObservation[]): Observation[] {
  const unique = new Map<string, Observation | null>();
  for (const row of log) {
    const context = row.context;
    if (
      !context?.realObservationConfirmed ||
      context.schemaVersion !== 2 ||
      row.target === "sun" ||
      row.source !== "User-recorded observation" ||
      typeof row.found !== "boolean" ||
      !validEquipment(context.equipment) ||
      JSON.stringify(context.location) !== JSON.stringify(row.location)
    )
      continue;
    const snapshot = {
      utc: row.requestedPositionUtc,
      location: row.location,
      objects: {
        [row.target]: row.position,
        sun: context.sun,
        moon: context.moon,
      },
    } as HorizonsSnapshot;
    const features = jplFeatures(
      snapshot,
      row.weather,
      row.target,
      context.equipment,
      row.observedAt,
    );
    if (
      !features ||
      Date.parse(row.recordedAt) < Date.parse(row.observedAt) ||
      Date.parse(row.recordedAt) - Date.parse(row.observedAt) > 7200000 ||
      Date.parse(row.recordedAt) > Date.now()
    )
      continue;
    const capturedAt = new Date(
      Math.max(
        Date.parse(row.position.receivedAt),
        Date.parse(context.sun.receivedAt),
        Date.parse(context.moon.receivedAt),
        Date.parse(row.weather.receivedAt),
      ),
    ).toISOString();
    const siteId = `${row.location.latitude},${row.location.longitude},${row.location.elevation}`;
    const key = `${row.target}|${context.equipment.kind}|${siteId}|${Math.floor(Date.parse(row.observedAt) / 1800000)}`;
    const sample: Observation = {
      version: 2,
      astronomySource: "NASA/JPL Horizons API",
      positionUtc: row.requestedPositionUtc,
      id: row.id,
      siteId,
      siteName: siteId,
      target: row.target,
      equipment: context.equipment,
      time: row.observedAt,
      capturedAt,
      forecastFetchedAt: row.weather.receivedAt,
      source: "open-meteo",
      features,
      seen: row.found,
      reportedAt: row.recordedAt,
    };
    if (!unique.has(key)) unique.set(key, sample);
    else if (unique.get(key)?.seen !== sample.seen) unique.set(key, null);
  }
  return [...unique.values()].filter((row): row is Observation => row !== null);
}
