export type NightSkyHighlight = {
  id: string;
  name: string;
  type: "planet" | "moon" | "meteor-shower" | "deep-sky" | "twilight";
  bestTime: string;
  direction: string;
  equipment: string;
  confidence: "high" | "medium" | "low";
  description: string;
  altitude?: number;
  azimuth?: number;
};

export type AstronomySummary = {
  moonPhase: string;
  moonIllumination: number;
  sunset: string;
  astronomicalTwilight: string;
  moonset: string;
  bestViewingWindow: string;
  highlights: NightSkyHighlight[];
  sunAltitude?: number;
  source?: "astronomy-engine";
};
