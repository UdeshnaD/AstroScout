import type { AstronomySummary } from "./astronomy";
import type { TravelMode, TripSummary } from "./trip";
import type { WeatherSummary } from "./weather";

export type ObservingSpot = {
  id: string;
  name: string;
  region: string;
  spotType: "lookout" | "park" | "beach" | "observatory" | "reserve";
  latitude: number;
  longitude: number;
  bortleRating: number;
  darknessLabel: string;
  description: string;
  accessNotes: string;
  safetyNotes: string;
  facilities: string[];
  horizonNotes: string;
  imageTheme: string;
};

export type PlanSearchRequest = {
  latitude: number;
  longitude: number;
  startTime: string;
  radiusKm: number;
  travelMode: TravelMode;
};

export type SpotPlan = ObservingSpot & {
  distanceKm: number;
  travelTimeMinutes: number;
  score: number;
  condition: "good" | "mixed" | "poor";
  scoreReasons: string[];
  visibleHighlights: string[];
  trip: TripSummary;
  weather: WeatherSummary;
  astronomy: AstronomySummary;
};
