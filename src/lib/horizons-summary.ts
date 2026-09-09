import type { AstronomySummary } from "../types/astronomy";
import type { HorizonsSnapshot } from "./event-types";
export function unavailableAstronomy(utc: string): AstronomySummary {
  return {
    moonPhase: "NASA/JPL data unavailable",
    moonIllumination: null,
    sunset: "Unavailable",
    astronomicalTwilight: "Unavailable",
    moonset: "Unavailable",
    bestViewingWindow: "Unavailable",
    highlights: [],
    source: "NASA/JPL Horizons API",
    requestedUtc: utc,
    receivedAt: null,
  };
}
export function summaryFromHorizons(
  snapshot: HorizonsSnapshot,
): AstronomySummary {
  const base = unavailableAstronomy(snapshot.utc);
  const moon = snapshot.objects.moon.data;
  return {
    ...base,
    moonPhase:
      moon?.illumination != null
        ? "Moon illuminated disk (JPL)"
        : base.moonPhase,
    moonIllumination: moon?.illumination ?? null,
    moonAltitude: moon?.altitude,
    sunAltitude: snapshot.objects.sun.data?.altitude,
    receivedAt:
      snapshot.objects.sun.status === "available"
        ? snapshot.objects.sun.receivedAt
        : null,
    highlights: Object.values(snapshot.objects).flatMap((result) =>
      result.data
        ? [
            {
              id: result.data.target,
              name: result.data.name,
              type:
                result.data.target === "moon"
                  ? ("moon" as const)
                  : result.data.target === "sun"
                    ? ("twilight" as const)
                    : ("planet" as const),
              bestTime: snapshot.utc,
              direction: result.data.compass,
              equipment: "Visibility depends on equipment and local conditions",
              description:
                "NASA/JPL Horizons calculated apparent position, not a telescope measurement.",
              altitude: result.data.altitude,
              azimuth: result.data.azimuth,
              magnitude: result.data.magnitude ?? undefined,
              rightAscension: result.data.rightAscension,
              declination: result.data.declination,
              illumination: result.data.illumination,
              receivedAt: result.receivedAt,
            },
          ]
        : [],
    ),
  };
}
