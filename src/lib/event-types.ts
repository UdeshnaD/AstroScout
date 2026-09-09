export const eventTargets = [
  { id: "sun", name: "Sun", command: "10" },
  { id: "moon", name: "Moon", command: "301" },
  { id: "venus", name: "Venus", command: "299" },
  { id: "mars", name: "Mars", command: "499" },
  { id: "jupiter", name: "Jupiter", command: "599" },
  { id: "saturn", name: "Saturn", command: "699" },
] as const;
export type EventTarget = (typeof eventTargets)[number]["id"];
export type EventLocation = {
  latitude: number;
  longitude: number;
  elevation: number;
};
export const mqLocation: EventLocation = {
  latitude: -33.7738,
  longitude: 151.1126,
  elevation: 0,
};
export type SourceResult<T> = {
  status: "available" | "unavailable";
  source: string;
  requestedAt: string;
  receivedAt: string;
  data: T | null;
  error: string | null;
};
export type JplPosition = {
  target: EventTarget;
  name: string;
  utc: string;
  julianDay: number;
  altitude: number;
  azimuth: number;
  compass: string;
  rightAscension: number | null;
  declination: number | null;
  magnitude: number | null;
  illumination: number | null;
  eventMarker: string | null;
  riseTime: null;
  setTime: null;
  apiVersion: string;
  requestUrl: string;
};
export type HorizonsSnapshot = {
  location: EventLocation;
  utc: string;
  objects: Record<EventTarget, SourceResult<JplPosition>>;
  series: Record<EventTarget, JplPosition[]>;
  scanStartUtc: string;
  scanEndUtc: string;
  stepMinutes: number;
};
export type WeatherPoint = {
  time: string;
  cloudCover: number | null;
  precipitation: number | null;
  visibility: number | null;
  temperature: number | null;
  wind: number | null;
  humidity: number | null;
  weatherCode: number | null;
};
export type EventWeather = {
  location: EventLocation;
  gridLatitude: number;
  gridLongitude: number;
  current: WeatherPoint;
  hourly: WeatherPoint[];
  requestUrl: string;
};
export type ImageAnalysis = {
  source: "OpenCV analysis of uploaded image";
  version: "1.0";
  analysedAt: string;
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  laplacianVariance: number;
  darkPixelPercent: number;
  cloudCandidatePercent: number;
  edgePercent: number;
  largestDarkRegionPercent: number;
  suitability: "limited" | "pixel analysis available";
  warnings: string[];
};
export type VisitorImage = {
  filename: string;
  type: string;
  bytes: number;
  uploadedAt: string;
  capturedAt: string | null;
};
export type EventObservation = {
  version: 1;
  id: string;
  source: "User-recorded observation";
  target: EventTarget;
  observedAt: string;
  recordedAt: string;
  location: EventLocation;
  requestedPositionUtc: string;
  position: SourceResult<JplPosition>;
  weather: SourceResult<EventWeather>;
  image: VisitorImage;
  analysis: ImageAnalysis | null;
  analysisError: string | null;
  found: boolean;
  notes: string;
  context?: {
    schemaVersion: 2;
    sun: SourceResult<JplPosition>;
    moon: SourceResult<JplPosition>;
    equipment: {
      kind: "eye" | "binoculars" | "telescope";
      aperture: number;
      magnification: number;
    };
    realObservationConfirmed: boolean;
    location: EventLocation;
  };
};
