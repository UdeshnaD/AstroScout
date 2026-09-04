export type TravelMode = "driving" | "public_transport" | "walking";

export type TripSummary = {
  travelMode: TravelMode;
  distanceKm: number;
  travelTimeMinutes: number;
  routeLabel: string;
  provider: "estimate" | "openrouteservice" | "tfnsw";
};
