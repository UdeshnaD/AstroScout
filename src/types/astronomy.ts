export type NightSkyHighlight = {
  id: string;
  name: string;
  type: "planet" | "moon" | "meteor-shower" | "deep-sky" | "twilight";
  bestTime: string;
  direction: string;
  equipment: string;
  confidence: "high" | "medium" | "low";
  description: string;
};

export type AstronomySummary = {
  moonPhase: string;
  moonIllumination: number;
  sunset: string;
  astronomicalTwilight: string;
  moonset: string;
  bestViewingWindow: string;
  highlights: NightSkyHighlight[];
};
