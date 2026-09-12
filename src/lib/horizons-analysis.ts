import type {
  EventTarget,
  EventWeather,
  HorizonsSnapshot,
  JplPosition,
  WeatherPoint,
} from "./event-types";

export function skyState(altitude: number | null | undefined) {
  if (altitude == null || !Number.isFinite(altitude))
    return "NASA/JPL data unavailable";
  if (altitude >= 0) return "Daylight";
  if (altitude > -6) return "Civil twilight";
  if (altitude > -12) return "Nautical twilight";
  if (altitude > -18) return "Astronomical twilight";
  return "Astronomical night";
}
export function forecastAt(
  weather: EventWeather | null | undefined,
  utc: string,
): WeatherPoint | null {
  if (!weather) return null;
  const nearest = weather.hourly.reduce<WeatherPoint | null>(
    (best, row) =>
      !best ||
      Math.abs(Date.parse(row.time) - Date.parse(utc)) <
        Math.abs(Date.parse(best.time) - Date.parse(utc))
        ? row
        : best,
    null,
  );
  return nearest &&
    Math.abs(Date.parse(nearest.time) - Date.parse(utc)) <= 1800000
    ? nearest
    : null;
}
export function weatherSuitable(row: WeatherPoint | null) {
  if (
    !row ||
    row.cloudCover == null ||
    row.precipitation == null ||
    row.visibility == null ||
    row.wind == null
  )
    return null;
  return (
    row.cloudCover <= 50 &&
    row.precipitation <= 0.1 &&
    row.visibility >= 10000 &&
    row.wind <= 25
  );
}
export type NightPoint = {
  utc: string;
  target: JplPosition;
  sun: JplPosition;
  moon: JplPosition | null;
  weather: WeatherPoint | null;
  geometric: boolean;
  suitable: boolean | null;
  score: number | null;
};
export type ObservingWindow = {
  start: string;
  end: string;
  peak: NightPoint;
  durationMinutes: number;
};
export type NightAnalysis = {
  points: NightPoint[];
  best: ObservingWindow | null;
  geometryOnly: ObservingWindow | null;
  later: boolean;
  status: string;
  reason: string;
  incomplete: boolean;
};

function bestWindow(
  points: NightPoint[],
  includeWeather: boolean,
): ObservingWindow | null {
  const eligible = (p: NightPoint) =>
    p.geometric && (!includeWeather || p.suitable === true);
  const score = (p: NightPoint) =>
    includeWeather ? (p.score ?? -1) : p.target.altitude / 90;
  const candidates = points.filter(eligible);
  if (!candidates.length) return null;
  for (const peak of candidates.sort((a, b) => score(b) - score(a))) {
    const index = points.indexOf(peak);
    let start = index,
      end = index;
    const close = (p: NightPoint) =>
      eligible(p) && score(p) >= score(peak) - 0.1;
    while (
      start > 0 &&
      close(points[start - 1]) &&
      Date.parse(points[start].utc) - Date.parse(points[start - 1].utc) ===
        300000
    )
      start--;
    while (
      end < points.length - 1 &&
      close(points[end + 1]) &&
      Date.parse(points[end + 1].utc) - Date.parse(points[end].utc) === 300000
    )
      end++;
    const durationMinutes =
      (Date.parse(points[end].utc) - Date.parse(points[start].utc)) / 60000;
    if (durationMinutes < 15) continue;
    return {
      start: points[start].utc,
      end: points[end].utc,
      peak,
      durationMinutes,
    };
  }
  return null;
}
export function analyseNight(
  snapshot: HorizonsSnapshot | undefined,
  target: EventTarget,
  weather: EventWeather | null | undefined,
): NightAnalysis {
  const empty: NightAnalysis = {
    points: [],
    best: null,
    geometryOnly: null,
    later: false,
    status: "Sky position unavailable",
    reason:
      "We need both the object and Sun positions before we can assess the night.",
    incomplete: false,
  };
  if (
    !snapshot?.series?.[target]?.length ||
    !snapshot.series.sun?.length ||
    !snapshot.objects[target]?.data ||
    !snapshot.objects.sun?.data
  )
    return empty;
  const suns = snapshot.series.sun;
  const epoch = Date.parse(snapshot.utc);
  const currentIndex = suns.findIndex((p) => p.utc === snapshot.utc);
  if (currentIndex < 0) return empty;
  let start = currentIndex;
  if (suns[start].altitude < 0) {
    while (start > 0 && suns[start - 1].altitude < 0) start--;
  } else {
    while (start < suns.length && suns[start].altitude >= 0) start++;
  }
  if (start === suns.length)
    return {
      ...empty,
      status: "Daylight",
      reason: "The Sun does not go below the horizon during the period checked.",
    };
  let end = start;
  while (end + 1 < suns.length && suns[end + 1].altitude < 0) end++;
  const targets = new Map(snapshot.series[target].map((p) => [p.utc, p]));
  const moons = new Map((snapshot.series.moon ?? []).map((p) => [p.utc, p]));
  const points: NightPoint[] = suns.slice(start, end + 1).flatMap((sun) => {
    const body = targets.get(sun.utc);
    if (!body) return [];
    const forecast = forecastAt(weather, sun.utc);
    const suitable = weatherSuitable(forecast);
    return [
      {
        utc: sun.utc,
        target: body,
        sun,
        moon: moons.get(sun.utc) ?? null,
        weather: forecast,
        geometric:
          target !== "sun" && sun.altitude <= -18 && body.altitude >= 20,
        suitable,
        score:
          suitable === true
            ? (0.65 * body.altitude) / 90 +
              0.25 * (1 - forecast!.cloudCover! / 100) +
              0.1 * (1 - forecast!.wind! / 25)
            : null,
      },
    ];
  });
  const best = bestWindow(points, true);
  const geometryOnly = bestWindow(points, false);
  const later = Boolean(
    bestWindow(
      points.filter((p) => Date.parse(p.utc) > epoch),
      true,
    ),
  );
  const sun = snapshot.objects.sun.data;
  const body = snapshot.objects[target].data;
  const currentWeather = weatherSuitable(forecastAt(weather, snapshot.utc));
  const status =
    target === "sun"
      ? "Solar observing not supported"
      : sun.altitude >= 0
        ? "Daylight"
        : body.altitude >= 20 && sun.altitude <= -18 && currentWeather === true
          ? "Observable now"
          : later
            ? "Observable later"
            : body.altitude <= 0
              ? "Below horizon"
              : sun.altitude > -18
                ? "Twilight"
                : currentWeather === null
                  ? "Weather unavailable"
                  : currentWeather === false
                    ? "Weather limited"
                    : "Low altitude";
  return {
    points,
    best,
    geometryOnly,
    later,
    status,
    incomplete: start === 0 || end === suns.length - 1,
    reason: best
      ? "This period offers the best mix of darkness, object height, clear sky and calm wind."
      : geometryOnly
        ? "The object reaches a good position, but the weather forecast does not support a recommended time."
        : "The object does not stay at least 20° high during full darkness. Bright planets and the Moon may still be visible in twilight.",
  };
}
export function moonlightExplanation(moon: JplPosition | null | undefined) {
  if (!moon || moon.illumination === null)
    return "Moon position or brightness information is not available right now.";
  if (moon.altitude <= 0)
    return `The Moon is ${Math.abs(moon.altitude).toFixed(1)}° below the horizon and ${moon.illumination.toFixed(1)}% illuminated, so direct moonlight should not affect this view.`;
  return `The Moon is ${moon.altitude.toFixed(1)}° high and ${moon.illumination.toFixed(1)}% illuminated. Moonlight can make faint objects harder to see${moon.illumination >= 75 ? ", especially while the Moon is this bright" : ""}. Local light pollution and haze will also affect your view.`;
}
