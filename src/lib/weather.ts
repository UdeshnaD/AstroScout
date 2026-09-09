import type { ObservingSpot } from "@/types/spot";
import type { WeatherSummary } from "@/types/weather";

type OpenMeteoResponse = {
  hourly?: {
    time?: string[];
    cloud_cover?: number[];
    visibility?: number[];
    precipitation_probability?: number[];
    wind_speed_10m?: number[];
    temperature_2m?: number[];
  };
};

export async function getWeatherForSpot(
  spot: Pick<ObservingSpot, "latitude" | "longitude" | "id">,
  startTime: string,
): Promise<WeatherSummary | null> {
  const baseUrl =
    process.env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com";
  const url = new URL("/v1/forecast", baseUrl);

  url.searchParams.set("latitude", String(spot.latitude));
  url.searchParams.set("longitude", String(spot.longitude));
  url.searchParams.set(
    "hourly",
    "cloud_cover,visibility,precipitation_probability,wind_speed_10m,temperature_2m",
  );
  url.searchParams.set("timezone", "GMT");
  url.searchParams.set("forecast_days", "7");

  try {
    const response = await fetch(url, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OpenMeteoResponse;
    return normaliseOpenMeteo(data, startTime);
  } catch {
    return null;
  }
}

function normaliseOpenMeteo(
  data: OpenMeteoResponse,
  startTime: string,
): WeatherSummary | null {
  const hourly = data.hourly;

  if (!hourly?.time?.length) {
    return null;
  }

  const target = new Date(startTime).getTime();
  if (
    !Number.isFinite(target) ||
    hourly.time.some((time) => !Number.isFinite(parseForecastTime(time)))
  )
    return null;
  if (
    target < parseForecastTime(hourly.time[0]) ||
    target > parseForecastTime(hourly.time[hourly.time.length - 1])
  )
    return null;
  const nearestIndex = hourly.time.reduce((bestIndex, time, index) => {
    const bestDelta = Math.abs(
      parseForecastTime(hourly.time?.[bestIndex] ?? "") - target,
    );
    const nextDelta = Math.abs(parseForecastTime(time) - target);
    return nextDelta < bestDelta ? index : bestIndex;
  }, 0);

  // Keep the evening timeline anchored at 8pm when a later hour is selected,
  // so Tonight can always navigate back through the beginning of the session.
  const eveningStartIndex = findSydneyEveningStart(hourly.time, nearestIndex);
  const windowStartIndex = eveningStartIndex ?? nearestIndex;

  // A full day lets the Observe page offer every usable night-time window,
  // rather than artificially stopping at the first eight forecast hours.
  const indices = Array.from(
    { length: Math.min(24, hourly.time.length - windowStartIndex) },
    (_, offset) => windowStartIndex + offset,
  );
  if (
    indices.some((index) =>
      [
        hourly.cloud_cover?.[index],
        hourly.visibility?.[index],
        hourly.precipitation_probability?.[index],
        hourly.wind_speed_10m?.[index],
        hourly.temperature_2m?.[index],
      ].some((value) => typeof value !== "number" || !Number.isFinite(value)),
    )
  )
    return null;
  if (
    indices.some(
      (i) =>
        [hourly.cloud_cover![i], hourly.precipitation_probability![i]].some(
          (v) => v < 0 || v > 100,
        ) ||
        hourly.visibility![i] < 0 ||
        hourly.wind_speed_10m![i] < 0,
    )
  )
    return null;
  const window = hourly.time
    .slice(windowStartIndex, windowStartIndex + 24)
    .map((time, offset) => {
      const index = windowStartIndex + offset;
      return {
        time: new Date(parseForecastTime(time)).toISOString(),
        cloudCover: clamp(hourly.cloud_cover![index]),
        visibilityKm: Math.round((hourly.visibility![index] / 1000) * 10) / 10,
        precipitationChance: clamp(hourly.precipitation_probability![index]),
        windKph: hourly.wind_speed_10m![index],
        temperatureC: hourly.temperature_2m![index],
      };
    });

  const cloudCover = clamp(hourly.cloud_cover![windowStartIndex]);
  const visibilityKm =
    Math.round((hourly.visibility![windowStartIndex] / 1000) * 10) / 10;

  return {
    cloudCover,
    visibilityKm,
    precipitationChance: clamp(hourly.precipitation_probability![windowStartIndex]),
    windKph: Math.round(hourly.wind_speed_10m![windowStartIndex]),
    temperatureC: Math.round(hourly.temperature_2m![windowStartIndex]),
    conditionLabel: labelConditions(cloudCover, visibilityKm),
    source: "open-meteo",
    fetchedAt: new Date().toISOString(),
    hourly: window,
  };
}

function parseForecastTime(time: string) {
  return new Date(time.endsWith("Z") ? time : `${time}Z`).getTime();
}

function findSydneyEveningStart(times: string[], beforeIndex: number) {
  const hour = new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "Australia/Sydney",
  });
  for (let index = beforeIndex; index >= 0; index -= 1) {
    if (hour.format(new Date(parseForecastTime(times[index]))) === "20")
      return index;
  }
  return null;
}

function labelConditions(cloudCover: number, visibilityKm: number) {
  if (cloudCover <= 25 && visibilityKm >= 15) return "Clear";
  if (cloudCover <= 55 && visibilityKm >= 8) return "Mixed";
  return "Cloudy";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
