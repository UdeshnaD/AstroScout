export const eventTargets = [
  { id: "sun", name: "Sun", objectType: "Star", group: "Solar System", horizons: { command: "10", validationId: "(10)" } },
  { id: "moon", name: "Moon", objectType: "Natural satellite", group: "Solar System", horizons: { command: "301", validationId: "(301)" } },
  { id: "mercury", name: "Mercury", objectType: "Planet", group: "Solar System", horizons: { command: "199", validationId: "(199)" } },
  { id: "venus", name: "Venus", objectType: "Planet", group: "Solar System", horizons: { command: "299", validationId: "(299)" } },
  { id: "mars", name: "Mars", objectType: "Planet", group: "Solar System", horizons: { command: "499", validationId: "(499)" } },
  { id: "jupiter", name: "Jupiter", objectType: "Planet", group: "Solar System", horizons: { command: "599", validationId: "(599)" } },
  { id: "saturn", name: "Saturn", objectType: "Planet", group: "Solar System", horizons: { command: "699", validationId: "(699)" } },
  { id: "uranus", name: "Uranus", objectType: "Planet", group: "Solar System", horizons: { command: "799", validationId: "(799)" } },
  { id: "neptune", name: "Neptune", objectType: "Planet", group: "Solar System", horizons: { command: "899", validationId: "(899)" } },
  { id: "pluto", name: "Pluto", objectType: "Dwarf planet", group: "Solar System", horizons: { command: "999", validationId: "(999)" } },
  { id: "milky-way-core", name: "Milky Way Core", objectType: "Galactic region", constellation: "Sagittarius", group: "Deep sky", horizons: null, fixedEquatorial: { rightAscension: 266.4168, declination: -29.0078 } },
  { id: "andromeda", name: "Andromeda Galaxy (M31)", objectType: "Galaxy", constellation: "Andromeda", group: "Deep sky", horizons: null, fixedEquatorial: { rightAscension: 10.6847, declination: 41.2692 } },
  { id: "large-magellanic-cloud", name: "Large Magellanic Cloud (LMC)", objectType: "Dwarf galaxy", constellation: "Dorado", group: "Deep sky", horizons: null, fixedEquatorial: { rightAscension: 80.8938, declination: -69.7561 } },
  { id: "small-magellanic-cloud", name: "Small Magellanic Cloud (SMC)", objectType: "Dwarf galaxy", constellation: "Tucana", group: "Deep sky", horizons: null, fixedEquatorial: { rightAscension: 13.1583, declination: -72.8003 } },
  { id: "orion-nebula", name: "Orion Nebula (M42)", objectType: "Emission nebula", constellation: "Orion", group: "Deep sky", horizons: null, fixedEquatorial: { rightAscension: 83.82, declination: -5.3875 } },
  { id: "eta-carinae", name: "Eta Carinae Nebula (NGC 3372)", objectType: "Emission nebula", constellation: "Carina", group: "Deep sky", horizons: null, fixedEquatorial: { rightAscension: 161.265, declination: -59.6844 } },
  { id: "pleiades", name: "Pleiades Star Cluster (M45)", objectType: "Open cluster", constellation: "Taurus", group: "Deep sky", horizons: null, fixedEquatorial: { rightAscension: 56.6008, declination: 24.1139 } },
  { id: "omega-centauri", name: "Omega Centauri Cluster (NGC 5139)", objectType: "Globular cluster", constellation: "Centaurus", group: "Deep sky", horizons: null, fixedEquatorial: { rightAscension: 201.6971, declination: -47.4795 } },
  { id: "hyades", name: "Hyades Star Cluster", objectType: "Open cluster", constellation: "Taurus", group: "Deep sky", horizons: null, fixedEquatorial: { rightAscension: 67.4471, declination: 16.9481 } },
  { id: "hercules-cluster", name: "Hercules Globular Cluster (M13)", objectType: "Globular cluster", constellation: "Hercules", group: "Deep sky", horizons: null, fixedEquatorial: { rightAscension: 250.4235, declination: 36.4613 } },
  { id: "eta-aquariids", name: "Eta Aquariids", objectType: "Meteor shower radiant", constellation: "Aquarius", group: "Moving sky", horizons: null, fixedEquatorial: { rightAscension: 338, declination: -1 }, coordinateNote: "Approximate radiant near the annual peak. This direction does not mean the shower is active on the selected date." },
  { id: "encke", name: "2P/Encke", objectType: "Comet", group: "Moving sky", horizons: { command: "DES=2P;CAP", validationId: "2P/Encke" } },
  { id: "ceres", name: "1 Ceres", objectType: "Asteroid", group: "Moving sky", horizons: { command: "1;", validationId: "1 Ceres" } },
  { id: "vesta", name: "4 Vesta", objectType: "Asteroid", group: "Moving sky", horizons: { command: "4;", validationId: "4 Vesta" } },
  { id: "iss", name: "International Space Station (ISS)", objectType: "Spacecraft", group: "Moving sky", horizons: { command: "-125544", validationId: "-125544" } },
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
  objectType: string;
  constellation: string | null;
  sunSeparation: number | null;
  moonSeparation: number | null;
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
