export type NightSkyHighlight = {
  id: string;
  name: string;
  type: "planet" | "moon" | "meteor-shower" | "deep-sky" | "twilight";
  bestTime: string;
  direction: string;
  equipment: string;
  confidence?: "high" | "medium" | "low";
  description: string;
  altitude?: number;
  azimuth?: number;
  magnitude?: number;
  rightAscension?: number | null;
  declination?: number | null;
  illumination?: number | null;
  receivedAt?: string;
};

export type AstronomySummary = {
  moonPhase: string;
  moonIllumination: number | null;
  sunset: string;
  astronomicalTwilight: string;
  moonset: string;
  bestViewingWindow: string;
  highlights: NightSkyHighlight[];
  sunAltitude?: number;
  moonAltitude?: number;
  source: "NASA/JPL Horizons API";
  requestedUtc: string;
  receivedAt: string | null;
};
