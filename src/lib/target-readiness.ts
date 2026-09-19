import { eventTargets } from "./event-types";
import type { EventTarget, JplPosition, WeatherPoint } from "./event-types";

export type ObservingEquipment = "eye" | "binocs" | "scope";

export type ReadinessFactor = {
  id: string;
  label: string;
  score: number | null;
  weight: number;
  detail: string;
};

export type TargetReadiness = {
  score: number | null;
  coverage: number;
  factors: ReadinessFactor[];
  summary: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const wideFieldTargets = new Set<EventTarget>([
  "milky-way-core",
  "large-magellanic-cloud",
  "small-magellanic-cloud",
  "pleiades",
  "hyades",
]);

function equipmentScore(target: EventTarget, equipment: ObservingEquipment) {
  if (target === "moon") return { eye: 90, binocs: 100, scope: 95 }[equipment];
  if (target === "eta-aquariids" || target === "iss")
    return { eye: 100, binocs: 35, scope: 10 }[equipment];
  if (wideFieldTargets.has(target))
    return { eye: 100, binocs: 90, scope: 35 }[equipment];
  if (target === "uranus") return { eye: 5, binocs: 55, scope: 100 }[equipment];
  if (target === "neptune" || target === "pluto")
    return { eye: 0, binocs: 20, scope: 100 }[equipment];

  const definition = eventTargets.find((item) => item.id === target);
  if (definition?.group === "Deep sky")
    return { eye: 30, binocs: 75, scope: 100 }[equipment];
  if (definition?.group === "Moving sky")
    return { eye: 15, binocs: 65, scope: 100 }[equipment];
  return { eye: 70, binocs: 85, scope: 100 }[equipment];
}

function moonlightScore(position: JplPosition, moon: JplPosition | null | undefined) {
  if (!moon || moon.illumination == null) return null;
  if (moon.altitude <= 0) return 100;
  const moonStrength = clamp((moon.altitude + 5) / 50 * 100) / 100;
  const illuminated = clamp(moon.illumination) / 100;
  const separationRelief = position.moonSeparation == null
    ? 0
    : clamp(position.moonSeparation / 90 * 50) / 100;
  return clamp(100 - moonStrength * illuminated * (1 - separationRelief) * 100);
}

export function calculateTargetReadiness({
  target,
  position,
  sunAltitude,
  weather,
  moon,
  equipment,
  bortle,
}: {
  target: EventTarget;
  position?: JplPosition | null;
  sunAltitude?: number;
  weather?: WeatherPoint | null;
  moon?: JplPosition | null;
  equipment: ObservingEquipment;
  bortle?: number | null;
}): TargetReadiness {
  if (!position || sunAltitude == null || !weather) {
    return {
      score: null,
      coverage: 0,
      factors: [],
      summary: "A matching sky position, Sun position and weather sample are required.",
    };
  }

  const definition = eventTargets.find((item) => item.id === target);
  const deepSky = definition?.group === "Deep sky";
  const faintMovingTarget = definition?.group === "Moving sky" && target !== "iss" && target !== "eta-aquariids";
  const moonSensitive = Boolean(deepSky || faintMovingTarget);
  const limitingMagnitude = { eye: 6, binocs: 10, scope: 14 }[equipment];
  const factors: ReadinessFactor[] = [
    {
      id: "altitude", label: "Height in sky",
      score: clamp(position.altitude / 60 * 100), weight: 22,
      detail: `${position.altitude.toFixed(1)}° altitude`,
    },
    {
      id: "darkness", label: "Sky darkness",
      score: deepSky ? clamp((-sunAltitude - 6) / 12 * 100) : clamp(-sunAltitude / 12 * 100),
      weight: deepSky ? 18 : 12, detail: `Sun ${sunAltitude.toFixed(1)}°`,
    },
    {
      id: "cloud", label: "Clear sky",
      score: weather.cloudCover == null ? null : clamp(100 - weather.cloudCover), weight: 18,
      detail: weather.cloudCover == null ? "Forecast unavailable" : `${weather.cloudCover.toFixed(0)}% cloud`,
    },
    {
      id: "rain", label: "Low rain",
      score: weather.precipitation == null ? null : clamp(100 - weather.precipitation / 0.2 * 100), weight: 8,
      detail: weather.precipitation == null ? "Forecast unavailable" : `${weather.precipitation.toFixed(1)} mm`,
    },
    {
      id: "visibility", label: "Atmospheric visibility",
      score: weather.visibility == null ? null : clamp(weather.visibility / (deepSky ? 20000 : 10000) * 100),
      weight: deepSky ? 10 : 7,
      detail: weather.visibility == null ? "Forecast unavailable" : `${(weather.visibility / 1000).toFixed(1)} km`,
    },
    {
      id: "wind", label: "Low wind",
      score: weather.wind == null ? null : clamp(100 - weather.wind / 30 * 100), weight: 4,
      detail: weather.wind == null ? "Forecast unavailable" : `${weather.wind.toFixed(0)} km/h`,
    },
    {
      id: "equipment", label: "Equipment fit",
      score: equipmentScore(target, equipment), weight: 15,
      detail: equipment === "eye" ? "Naked eye" : equipment === "binocs" ? "Binoculars" : "Telescope",
    },
  ];

  if (!deepSky) {
    factors.push({
      id: "magnitude", label: "Apparent brightness",
      score: position.magnitude == null ? null : clamp((limitingMagnitude - position.magnitude + 1) / 4 * 100),
      weight: 8,
      detail: position.magnitude == null ? "JPL value unavailable" : `Magnitude ${position.magnitude.toFixed(2)}`,
    });
  }

  if (moonSensitive) {
    factors.push(
      {
        id: "moonlight", label: "Moonlight interference",
        score: moonlightScore(position, moon), weight: 15,
        detail: !moon || moon.illumination == null
          ? "Moon data unavailable"
          : moon.altitude <= 0 ? "Moon below horizon" : `${moon.illumination.toFixed(0)}% lit at ${moon.altitude.toFixed(1)}°`,
      },
      {
        id: "bortle", label: "Light pollution",
        score: bortle == null ? null : clamp((9 - bortle) / 8 * 100), weight: 15,
        detail: bortle == null ? "No measured or curated value" : `Curated Bortle ${bortle}`,
      },
    );
  }

  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const available = factors.filter((factor) => factor.score != null);
  const availableWeight = available.reduce((sum, factor) => sum + factor.weight, 0);
  let score = availableWeight
    ? Math.round(available.reduce((sum, factor) => sum + factor.score! * factor.weight, 0) / availableWeight)
    : null;

  if (score != null && position.altitude <= 0) score = 0;
  else if (score != null && position.altitude < 10) score = Math.min(score, 35);
  if (score != null && deepSky && sunAltitude > -6) score = Math.min(score, 20);

  return {
    score,
    coverage: Math.round(availableWeight / totalWeight * 100),
    factors,
    summary: position.altitude <= 0
      ? `${position.name} is below the horizon.`
      : `This is an explainable conditions index for ${position.name}, not a sighting probability.`,
  };
}
