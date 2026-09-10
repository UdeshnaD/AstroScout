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
  magnitude?: number;
  reference?: { label: string; url: string };
  technical?: {
    rightAscension: number;
    declination: number;
    constellation: string;
    rise: string;
    transit: string;
    set: string;
    airmass: number | null;
    sunSeparation: number;
    moonSeparation: number;
    visibility: string;
  };
};

export type AuroraOutlook = {
  potential: "Not visible" | "Very low" | "Low" | "Moderate";
  visibility: "Daylight" | "Twilight" | "Dark sky";
  direction: "Northern horizon" | "Southern horizon" | "Overhead";
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
  aurora: AuroraOutlook;
  sunAltitude?: number;
  source?: "astronomy-engine";
};
