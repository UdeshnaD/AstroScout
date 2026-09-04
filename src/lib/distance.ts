import type { TravelMode, TripSummary } from "@/types/trip";

const EARTH_RADIUS_KM = 6371;

export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function estimateTrip(distance: number, travelMode: TravelMode): TripSummary {
  const speedByMode: Record<TravelMode, number> = {
    driving: 62,
    public_transport: 38,
    walking: 4.8
  };

  const overheadByMode: Record<TravelMode, number> = {
    driving: 8,
    public_transport: 22,
    walking: 0
  };

  const travelTimeMinutes = Math.max(
    3,
    Math.round((distance / speedByMode[travelMode]) * 60 + overheadByMode[travelMode])
  );

  return {
    travelMode,
    distanceKm: Number(distance.toFixed(1)),
    travelTimeMinutes,
    routeLabel: buildRouteLabel(travelMode, travelTimeMinutes),
    provider: "estimate"
  };
}

function buildRouteLabel(travelMode: TravelMode, minutes: number) {
  const modeLabel: Record<TravelMode, string> = {
    driving: "Estimated drive",
    public_transport: "Estimated public transport trip",
    walking: "Estimated walk"
  };

  return `${modeLabel[travelMode]} around ${minutes} minutes`;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
