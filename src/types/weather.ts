export type HourlySkyPoint = {
  time: string;
  cloudCover: number;
  visibilityKm: number;
  precipitationChance: number;
};

export type WeatherSummary = {
  cloudCover: number;
  visibilityKm: number;
  precipitationChance: number;
  windKph: number;
  temperatureC: number;
  conditionLabel: string;
  source: "open-meteo" | "fallback";
  hourly: HourlySkyPoint[];
};
