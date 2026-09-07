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
): Promise<WeatherSummary> {
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
      return fallbackWeather(spot.id, startTime);
    }

    const data = (await response.json()) as OpenMeteoResponse;
    return (
      normaliseOpenMeteo(data, startTime) ?? fallbackWeather(spot.id, startTime)
    );
  } catch {
    return fallbackWeather(spot.id, startTime);
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

  const indices = Array.from(
    { length: Math.min(8, hourly.time.length - nearestIndex) },
    (_, offset) => nearestIndex + offset,
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
  const window = hourly.time
    .slice(nearestIndex, nearestIndex + 8)
    .map((time, offset) => {
      const index = nearestIndex + offset;
      return {
        time: new Date(parseForecastTime(time)).toISOString(),
        cloudCover: clamp(hourly.cloud_cover?.[index] ?? 45),
        visibilityKm:
          Math.round(((hourly.visibility?.[index] ?? 18000) / 1000) * 10) / 10,
        precipitationChance: clamp(
          hourly.precipitation_probability?.[index] ?? 10,
        ),
      };
    });

  const cloudCover = clamp(hourly.cloud_cover?.[nearestIndex] ?? 45);
  const visibilityKm =
    Math.round(((hourly.visibility?.[nearestIndex] ?? 18000) / 1000) * 10) / 10;

  return {
    cloudCover,
    visibilityKm,
    precipitationChance: clamp(
      hourly.precipitation_probability?.[nearestIndex] ?? 10,
    ),
    windKph: Math.round(hourly.wind_speed_10m?.[nearestIndex] ?? 12),
    temperatureC: Math.round(hourly.temperature_2m?.[nearestIndex] ?? 14),
    conditionLabel: labelConditions(cloudCover, visibilityKm),
    source: "open-meteo",
    hourly: window,
  };
}

function parseForecastTime(time: string) {
  return new Date(time.endsWith("Z") ? time : `${time}Z`).getTime();
}

function fallbackWeather(seed: string, startTime: string): WeatherSummary {
  const seedValue = seed
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const cloudCover = 18 + (seedValue % 58);
  const visibilityKm = 12 + (seedValue % 14);
  const precipitationChance = seedValue % 28;
  const date = new Date(
    Math.round(new Date(startTime).getTime() / 3600000) * 3600000,
  );

  return {
    cloudCover,
    visibilityKm,
    precipitationChance,
    windKph: 8 + (seedValue % 18),
    temperatureC: 9 + (seedValue % 10),
    conditionLabel: labelConditions(cloudCover, visibilityKm),
    source: "fallback",
    hourly: Array.from({ length: 8 }, (_, index) => {
      const hour = new Date(date.getTime() + index * 3600000);
      return {
        time: hour.toISOString(),
        cloudCover: clamp(cloudCover + index * 3 - 6),
        visibilityKm,
        precipitationChance: clamp(precipitationChance + index * 2),
      };
    }),
  };
}

function labelConditions(cloudCover: number, visibilityKm: number) {
  if (cloudCover <= 25 && visibilityKm >= 15) return "Clear";
  if (cloudCover <= 55 && visibilityKm >= 8) return "Mixed";
  return "Cloudy";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
