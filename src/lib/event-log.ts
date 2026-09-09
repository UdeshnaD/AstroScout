import { eventTargets } from "./event-types";
import type { EventObservation } from "./event-types";
export const eventLogKey = "astroscout.event-observations.v1";
function validContext(context: EventObservation["context"]) {
  if (context === undefined) return true;
  return Boolean(
    context &&
      context.schemaVersion === 2 &&
      typeof context.realObservationConfirmed === "boolean" &&
      context.location &&
      [
        context.location.latitude,
        context.location.longitude,
        context.location.elevation,
      ].every(Number.isFinite) &&
      context.equipment &&
      ["eye", "binoculars", "telescope"].includes(context.equipment.kind) &&
      Number.isFinite(context.equipment.aperture) &&
      Number.isFinite(context.equipment.magnification) &&
      context.sun &&
      context.moon &&
      [context.sun, context.moon].every((source) =>
        ["available", "unavailable"].includes(source.status),
      ),
  );
}
export function readEventLog(raw: string | null): EventObservation[] {
  if (raw === null) return [];
  const rows = JSON.parse(raw) as EventObservation[];
  if (
    !Array.isArray(rows) ||
    rows.length > 2000 ||
    rows.some(
      (r) =>
        !r ||
        r.version !== 1 ||
        typeof r.id !== "string" ||
        !eventTargets.some((t) => t.id === r.target) ||
        typeof r.found !== "boolean" ||
        typeof r.notes !== "string" ||
        !Number.isFinite(Date.parse(r.recordedAt)) ||
        !Number.isFinite(Date.parse(r.observedAt)) ||
        !r.location ||
        !Number.isFinite(r.location.latitude) ||
        !Number.isFinite(r.location.longitude) ||
        !r.position ||
        !["available", "unavailable"].includes(r.position.status) ||
        !r.weather ||
        !["available", "unavailable"].includes(r.weather.status) ||
        !r.image ||
        typeof r.image.filename !== "string" ||
        !validContext(r.context),
    )
  )
    throw new Error(
      "Saved observation data is invalid. Export the stored data before clearing it; it has not been overwritten.",
    );
  return rows;
}
export function saveEventLog(
  storage: Pick<Storage, "setItem">,
  rows: EventObservation[],
) {
  if (rows.length > 2000)
    throw new Error(
      "The log is full (2,000 observations). Export and clear it before recording more.",
    );
  try {
    storage.setItem(eventLogKey, JSON.stringify(rows));
  } catch {
    throw new Error(
      "The browser could not save the observation. Storage may be full or disabled. Export your log before continuing.",
    );
  }
}
export function observationsCsv(rows: EventObservation[]) {
  const headers = [
    "id",
    "target",
    "found",
    "observed_at_utc",
    "recorded_at_utc",
    "latitude",
    "longitude",
    "elevation_m",
    "position_epoch_utc",
    "position_status",
    "altitude_deg",
    "azimuth_deg",
    "ra_deg",
    "dec_deg",
    "magnitude",
    "illumination_percent",
    "jpl_received_at",
    "jpl_error",
    "weather_status",
    "weather_valid_at",
    "cloud_percent",
    "precipitation_mm",
    "visibility_m",
    "temperature_c",
    "wind_kmh",
    "humidity_percent",
    "weather_code",
    "weather_received_at",
    "weather_error",
    "image_filename",
    "image_captured_at",
    "analysis_status",
    "brightness",
    "contrast",
    "laplacian_variance",
    "dark_pixel_percent",
    "cloud_candidate_percent",
    "analysis_error",
    "notes",
    "position_snapshot_json",
    "weather_snapshot_json",
    "image_analysis_json",
    "real_observation_confirmed",
    "equipment_kind",
    "aperture_mm",
    "magnification",
    "sun_altitude_deg",
    "moon_altitude_deg",
    "moon_illumination_percent",
    "jpl_training_context_json",
  ];
  const cell = (value: unknown) => {
    if (value === null || value === undefined) return '"unavailable"';
    let text = String(value);
    if (typeof value === "string" && /^[\s]*[=+\-@]/.test(text))
      text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    headers.join(","),
    ...rows.map((r) => {
      const p = r.position.data,
        w = r.weather.data?.current,
        a = r.analysis;
      return [
        r.id,
        r.target,
        r.found,
        r.observedAt,
        r.recordedAt,
        r.location.latitude,
        r.location.longitude,
        r.location.elevation,
        r.requestedPositionUtc,
        r.position.status,
        p?.altitude,
        p?.azimuth,
        p?.rightAscension,
        p?.declination,
        p?.magnitude,
        p?.illumination,
        r.position.receivedAt,
        r.position.error,
        r.weather.status,
        w?.time,
        w?.cloudCover,
        w?.precipitation,
        w?.visibility,
        w?.temperature,
        w?.wind,
        w?.humidity,
        w?.weatherCode,
        r.weather.receivedAt,
        r.weather.error,
        r.image.filename,
        r.image.capturedAt,
        a ? a.suitability : "unavailable",
        a?.brightness,
        a?.contrast,
        a?.laplacianVariance,
        a?.darkPixelPercent,
        a?.cloudCandidatePercent,
        r.analysisError,
        r.notes,
        JSON.stringify(r.position),
        JSON.stringify(r.weather),
        JSON.stringify(r.analysis),
        r.context?.realObservationConfirmed ?? false,
        r.context?.equipment.kind,
        r.context?.equipment.aperture,
        r.context?.equipment.magnification,
        r.context?.sun.data?.altitude,
        r.context?.moon.data?.altitude,
        r.context?.moon.data?.illumination,
        r.context ? JSON.stringify(r.context) : null,
      ]
        .map(cell)
        .join(",");
    }),
  ].join("\r\n");
}
