export type HourlySkyPoint = {
  time: string;
  cloudCover: number;
  visibilityKm: number;
  precipitationChance: number;
  windKph: number;
  temperatureC: number;
};

export type WeatherSummary = {
  cloudCover: number;
  visibilityKm: number;
  precipitationChance: number;
  windKph: number;
  temperatureC: number;
  conditionLabel: string;
  source: "open-meteo";
  fetchedAt: string;
  hourly: HourlySkyPoint[];
};
