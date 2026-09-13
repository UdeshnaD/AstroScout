import { parse } from "csv-parse/sync";
import { eventTargets, mqLocation } from "./event-types";
import type {
  EventLocation,
  EventTarget,
  EventWeather,
  HorizonsSnapshot,
  JplPosition,
  SourceResult,
  WeatherPoint,
} from "./event-types";

export function readLocation(params: URLSearchParams): EventLocation {
  const read = (key: string, fallback: number) => {
    const raw = params.get(key);
    if (raw !== null && !raw.trim())
      throw new Error("Coordinates cannot be empty.");
    return raw === null ? fallback : Number(raw);
  };
  const latitude = read("lat", mqLocation.latitude);
  const longitude = read("lon", mqLocation.longitude);
  const elevation = read("elevation", mqLocation.elevation);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    !Number.isFinite(elevation) ||
    elevation < -500 ||
    elevation > 10000
  ) {
    throw new Error(
      "Latitude must be -90 to 90, longitude -180 to 180, and elevation -500 to 10000 metres.",
    );
  }
  return { latitude, longitude, elevation };
}

export function readUtc(raw: string | null) {
  const date = raw === null ? new Date() : new Date(raw);
  if (
    (raw !== null &&
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(raw)) ||
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < 2000 ||
    date.getUTCFullYear() > 2100
  ) {
    throw new Error("Use an explicit UTC timestamp between 2000 and 2100.");
  }
  if (raw !== null && date.toISOString().slice(0, 19) !== raw.slice(0, 19)) {
    throw new Error("The UTC calendar date is invalid.");
  }
  return date.toISOString();
}

export function horizonsUrl(
  target: EventTarget,
  location: EventLocation,
  utc: string,
) {
  const object = eventTargets.find((item) => item.id === target);
  if (!object?.horizons)
    throw new Error("This catalogue target has no JPL Horizons observer-table target.");
  const url = new URL("https://ssd.jpl.nasa.gov/api/horizons.api");
  url.searchParams.set("format", "json");
  const params = {
    COMMAND: object.horizons.command,
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "OBSERVER",
    CENTER: "coord@399",
    COORD_TYPE: "GEODETIC",
    SITE_COORD: `${location.longitude},${location.latitude},${location.elevation / 1000}`,
    TLIST: utc.replace("T", " ").replace("Z", ""),
    TIME_TYPE: "UT",
    QUANTITIES: "2,4,9,10,23,25,29",
    ANG_FORMAT: "DEG",
    CSV_FORMAT: "YES",
    CAL_FORMAT: "BOTH",
    TIME_DIGITS: "FRACSEC",
    APPARENT: "AIRLESS",
  };
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, `'${value}'`);
  return url;
}

const optionalNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (
    typeof value !== "string" ||
    !value.trim() ||
    !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(value.trim())
  )
    return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (radiansValue: number) => (radiansValue * 180) / Math.PI;
const normaliseDegrees = (value: number) => ((value % 360) + 360) % 360;

function angularSeparation(
  first: { rightAscension: number | null; declination: number | null } | undefined,
  second: { rightAscension: number | null; declination: number | null } | undefined,
) {
  if (
    first?.rightAscension == null ||
    first.declination == null ||
    second?.rightAscension == null ||
    second.declination == null
  ) return null;
  const cosine =
    Math.sin(radians(first.declination)) * Math.sin(radians(second.declination)) +
    Math.cos(radians(first.declination)) * Math.cos(radians(second.declination)) *
      Math.cos(radians(first.rightAscension - second.rightAscension));
  return degrees(Math.acos(Math.max(-1, Math.min(1, cosine))));
}

export function fixedEquatorialSeries(
  target: EventTarget,
  location: EventLocation,
  epochs: string[],
): JplPosition[] {
  const definition = eventTargets.find((item) => item.id === target);
  if (!definition || !("fixedEquatorial" in definition))
    throw new Error("This target has no fixed catalogue coordinates.");
  const rightAscension = definition.fixedEquatorial.rightAscension;
  const declination = definition.fixedEquatorial.declination;
  const latitude = radians(location.latitude);
  const declinationRadians = radians(declination);
  const samples = epochs.map((utc) => {
    const julianDay = Date.parse(utc) / 86400000 + 2440587.5;
    const centuries = (julianDay - 2451545) / 36525;
    const greenwichSidereal = normaliseDegrees(
      280.46061837 +
        360.98564736629 * (julianDay - 2451545) +
        0.000387933 * centuries * centuries -
        (centuries * centuries * centuries) / 38710000,
    );
    const hourAngle = radians(
      normaliseDegrees(greenwichSidereal + location.longitude - rightAscension),
    );
    const altitude = degrees(
      Math.asin(
        Math.sin(latitude) * Math.sin(declinationRadians) +
          Math.cos(latitude) * Math.cos(declinationRadians) * Math.cos(hourAngle),
      ),
    );
    const azimuth = normaliseDegrees(
      degrees(
        Math.atan2(
          Math.sin(hourAngle),
          Math.cos(hourAngle) * Math.sin(latitude) -
            Math.tan(declinationRadians) * Math.cos(latitude),
        ),
      ) + 180,
    );
    return {
      target,
      name: definition.name,
      utc,
      julianDay,
      altitude,
      azimuth,
      compass: [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
      ][Math.round(azimuth / 22.5) % 16],
      rightAscension,
      declination,
      magnitude: null,
      illumination: null,
      objectType: definition.objectType,
      constellation: definition.constellation,
      sunSeparation: null,
      moonSeparation: null,
      eventMarker: null,
      riseTime: null,
      setTime: null,
      apiVersion: "AstroScout sidereal calculator v1",
      requestUrl: "",
    } satisfies JplPosition;
  });
  return samples.map((sample, index) => {
    const previous = samples[index - 1];
    const next = samples[index + 1];
    const eventMarker =
      previous && previous.altitude < 0 && sample.altitude >= 0
        ? "r"
        : previous && previous.altitude >= 0 && sample.altitude < 0
          ? "s"
          : previous && next && sample.altitude > previous.altitude && sample.altitude >= next.altitude
            ? "t"
            : null;
    return { ...sample, eventMarker };
  });
}

export function parseHorizons(
  payload: unknown,
  target: EventTarget,
  utc: string,
  requestUrl: string,
): JplPosition {
  return parseHorizonsSeries(payload, target, [utc], requestUrl)[0];
}

export function parseHorizonsSeries(
  payload: unknown,
  target: EventTarget,
  epochs: string[],
  requestUrl: string,
): JplPosition[] {
  const data = payload as {
    result?: string;
    error?: string;
    signature?: { source?: string; version?: string };
  };
  if (
    !data ||
    data.error ||
    typeof data.result !== "string" ||
    data.signature?.source !== "NASA/JPL Horizons API"
  )
    throw new Error("JPL returned an error or an unrecognised response.");
  const definition = eventTargets.find((item) => item.id === target);
  const targetLine = data.result
    .split(/\r?\n/)
    .find((line) => line.startsWith("Target body name:"));
  if (!definition?.horizons || !targetLine?.includes(definition.horizons.validationId))
    throw new Error(
      "JPL returned a different target from the requested object.",
    );
  const start = data.result.indexOf("$$SOE");
  const end = data.result.indexOf("$$EOE");
  if (start < 0 || end < start)
    throw new Error("JPL did not return an ephemeris table.");
  const header = data.result
    .slice(0, start)
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("Date__(UT)"));
  if (!header) throw new Error("JPL table columns were not recognised.");
  const columns = parse(header, { trim: true })[0] as string[];
  const rows = parse(data.result.slice(start + 5, end).trim(), {
    trim: true,
    skip_empty_lines: true,
  }) as string[][];
  if (
    rows.length !== epochs.length ||
    rows.some((row) => row.length !== columns.length)
  )
    throw new Error("JPL returned an unexpected number of epochs or columns.");
  return rows.map((row, index) => {
    const utc = epochs[index];
    const get = (name: string) => optionalNumber(row[columns.indexOf(name)]);
    const text = (name: string) => {
      const value = row[columns.indexOf(name)]?.trim();
      return value && value !== "n.a." ? value : null;
    };
    const altitude = get("Elev_(a-app)");
    const azimuth = get("Azi_(a-app)");
    const jd = get("Date_________JDUT");
    if (
      altitude === null ||
      azimuth === null ||
      jd === null ||
      Math.abs(altitude) > 90 ||
      azimuth < 0 ||
      azimuth > 360
    )
      throw new Error("JPL altitude, azimuth or epoch is unavailable.");
    if (Math.abs((jd - 2440587.5) * 86400000 - Date.parse(utc)) > 1)
      throw new Error(
        "JPL returned a different epoch from the requested UTC time.",
      );
    return {
      target,
      name: eventTargets.find((item) => item.id === target)!.name,
      utc,
      julianDay: jd,
      altitude,
      azimuth,
      compass: [
        "N",
        "NNE",
        "NE",
        "ENE",
        "E",
        "ESE",
        "SE",
        "SSE",
        "S",
        "SSW",
        "SW",
        "WSW",
        "W",
        "WNW",
        "NW",
        "NNW",
      ][Math.round(azimuth / 22.5) % 16],
      rightAscension: get("R.A._(a-app)"),
      declination: get("DEC_(a-app)"),
      magnitude: get("APmag"),
      illumination: get("Illu%"),
      objectType: definition.objectType,
      constellation: text("Cnst"),
      sunSeparation: get("S-O-T"),
      moonSeparation: get("T-O-M"),
      eventMarker: ["r", "e", "t", "s"].includes(row[3]) ? row[3] : null,
      riseTime: null,
      setTime: null,
      apiVersion: data.signature?.version ?? "unavailable",
      requestUrl,
    };
  });
}

// Only coalesce in-flight requests. Completed data is never reused as a current response.
let queue: Promise<unknown> = Promise.resolve();
let waiting = 0;
const snapshots = new Map<
  string,
  { createdAt: number; promise: Promise<HorizonsSnapshot> }
>();
export function getHorizons(
  location: EventLocation,
  utc: string,
): Promise<HorizonsSnapshot> {
  const key = JSON.stringify([location, utc]);
  const existing = snapshots.get(key);
  if (existing) return existing.promise;
  if (waiting >= 3)
    return Promise.reject(
      new Error("JPL request queue is busy. Please retry shortly."),
    );
  waiting++;
  const promise = queue
    .then(async () => {
      const objects = {} as HorizonsSnapshot["objects"];
      const series = {} as HorizonsSnapshot["series"];
      const epochs = Array.from({ length: 577 }, (_, i) =>
        new Date(Date.parse(utc) + (i - 288) * 300000).toISOString(),
      );
      for (const target of eventTargets) {
        const requestedAt = new Date().toISOString();
        if (!target.horizons && "fixedEquatorial" in target) {
          const samples = fixedEquatorialSeries(target.id, location, epochs);
          const suns = series.sun;
          const moons = series.moon;
          series[target.id] = samples.map((sample, index) => ({
            ...sample,
            sunSeparation: angularSeparation(sample, suns?.[index]),
            moonSeparation: angularSeparation(sample, moons?.[index]),
          }));
          objects[target.id] = {
            status: "available",
            source: "Catalogue coordinates and local sidereal-time calculation",
            requestedAt,
            receivedAt: requestedAt,
            data: series[target.id][288],
            error: null,
          };
          continue;
        }
        try {
          const url = horizonsUrl(target.id, location, utc);
          url.searchParams.delete("TLIST");
          url.searchParams.set(
            "START_TIME",
            `'${epochs[0].replace("T", " ").replace("Z", "")}'`,
          );
          url.searchParams.set(
            "STOP_TIME",
            `'${epochs[576].replace("T", " ").replace("Z", "")}'`,
          );
          url.searchParams.set("STEP_SIZE", "'5 m'");
          const response = await fetch(url, {
            cache: "no-store",
            signal: AbortSignal.timeout(12000),
          });
          if (!response.ok) throw new Error(`JPL HTTP ${response.status}.`);
          const samples = parseHorizonsSeries(
            await response.json(),
            target.id,
            epochs,
            url.toString(),
          );
          const data = samples[288];
          // URL/version are carried by the exact-epoch source envelope, not repeated 577 times.
          series[target.id] = samples.map((sample) => ({
            ...sample,
            requestUrl: "",
          }));
          objects[target.id] = {
            status: "available",
            source: "NASA/JPL Horizons API",
            requestedAt,
            receivedAt: new Date().toISOString(),
            data,
            error: null,
          };
        } catch (error) {
          series[target.id] = [];
          objects[target.id] = {
            status: "unavailable",
            source: "NASA/JPL Horizons API",
            requestedAt,
            receivedAt: new Date().toISOString(),
            data: null,
            error:
              error instanceof Error ? error.message : "JPL request failed.",
          };
        }
      }
      return {
        location,
        utc,
        objects,
        series,
        scanStartUtc: epochs[0],
        scanEndUtc: epochs[576],
        stepMinutes: 5,
      };
    })
    .finally(() => {
      waiting--;
      snapshots.delete(key);
    });
  queue = promise.catch(() => undefined);
  snapshots.set(key, { createdAt: Date.now(), promise });
  return promise;
}

const fields = {
  cloudCover: "cloud_cover",
  precipitation: "precipitation",
  visibility: "visibility",
  temperature: "temperature_2m",
  wind: "wind_speed_10m",
  humidity: "relative_humidity_2m",
  weatherCode: "weather_code",
} as const;
export function openMeteoUrl(location: EventLocation) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: Object.values(fields).join(","),
    hourly: Object.values(fields).join(","),
    timezone: "GMT",
    timeformat: "unixtime",
    forecast_days: "2",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    temperature_unit: "celsius",
  }).toString();
  return url;
}
export function parseEventWeather(
  payload: unknown,
  location: EventLocation,
  requestUrl: string,
): EventWeather {
  const data = payload as {
    error?: boolean;
    latitude?: number;
    longitude?: number;
    current?: Record<string, unknown>;
    hourly?: Record<string, unknown>;
  };
  if (
    !data ||
    data.error ||
    typeof data.latitude !== "number" ||
    typeof data.longitude !== "number" ||
    !data.current ||
    !data.hourly ||
    !Array.isArray(data.hourly.time)
  )
    throw new Error("Open-Meteo returned incomplete current/hourly data.");
  const point = (
    record: Record<string, unknown>,
    index?: number,
  ): WeatherPoint => {
    const get = (key: string) =>
      index === undefined
        ? record[key]
        : Array.isArray(record[key])
          ? record[key][index]
          : null;
    const timestamp = get("time");
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp))
      throw new Error("Weather timestamp unavailable.");
    const result = {
      time: new Date(timestamp * 1000).toISOString(),
    } as WeatherPoint;
    for (const [field, provider] of Object.entries(fields)) {
      let value = optionalNumber(get(provider));
      if (
        value !== null &&
        ((["cloudCover", "humidity"].includes(field) &&
          (value < 0 || value > 100)) ||
          (["precipitation", "visibility", "wind"].includes(field) &&
            value < 0))
      )
        value = null;
      result[field as keyof typeof fields] = value;
    }
    return result;
  };
  const current = point(data.current);
  if (
    Object.keys(fields).every(
      (key) => current[key as keyof typeof fields] === null,
    )
  )
    throw new Error("All current weather measurements are unavailable.");
  return {
    location,
    gridLatitude: data.latitude,
    gridLongitude: data.longitude,
    current,
    hourly: data.hourly.time.map((_, i) => point(data.hourly!, i)),
    requestUrl,
  };
}
export async function getEventWeather(
  location: EventLocation,
): Promise<SourceResult<EventWeather>> {
  const requestedAt = new Date().toISOString();
  try {
    const url = openMeteoUrl(location);
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}.`);
    const data = parseEventWeather(
      await response.json(),
      location,
      url.toString(),
    );
    return {
      status: "available",
      source: "Open-Meteo API",
      requestedAt,
      receivedAt: new Date().toISOString(),
      data,
      error: null,
    };
  } catch (error) {
    return {
      status: "unavailable",
      source: "Open-Meteo API",
      requestedAt,
      receivedAt: new Date().toISOString(),
      data: null,
      error: error instanceof Error ? error.message : "Weather request failed.",
    };
  }
}
