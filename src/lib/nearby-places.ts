export type NearbyPlace = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters: number | null;
  categories: string[];
  kind: string;
  city: string | null;
  region: string | null;
  country: string | null;
};

type CuratedPlace = {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
};

type GeoapifyFeature = {
  geometry?: { coordinates?: unknown };
  properties?: {
    place_id?: unknown;
    name?: unknown;
    formatted?: unknown;
    address_line1?: unknown;
    address_line2?: unknown;
    lat?: unknown;
    lon?: unknown;
    distance?: unknown;
    categories?: unknown;
    city?: unknown;
    state?: unknown;
    country?: unknown;
  };
};

const labels: Array<[string, string]> = [
  ["tourism.attraction.viewpoint", "Viewpoint"],
  ["leisure.park.nature_reserve", "Nature reserve"],
  ["leisure.picnic.picnic_site", "Picnic site"],
  ["natural.protected_area", "Protected area"],
  ["national_park", "National park"],
  ["beach", "Beach"],
  ["natural.coastal", "Coastal place"],
  ["natural.mountain", "Mountain place"],
  ["leisure.park", "Park"],
  ["tourism", "Visitor place"],
  ["natural", "Natural place"],
];

function finiteCoordinate(value: unknown, limit: number) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function placeKind(categories: string[]) {
  return labels.find(([category]) => categories.includes(category))?.[1] ?? "Outdoor place";
}

function distanceBetweenMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const radians = Math.PI / 180;
  const latitudeDelta = (toLatitude - fromLatitude) * radians;
  const longitudeDelta = (toLongitude - fromLongitude) * radians;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude * radians) *
      Math.cos(toLatitude * radians) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearbyCuratedPlaces(
  spots: CuratedPlace[],
  latitude: number,
  longitude: number,
  radiusKm: number,
  limit = 12,
): NearbyPlace[] {
  return spots
    .map((spot) => ({
      id: `curated-${spot.id}`,
      name: spot.name,
      address: `${spot.region}, NSW`,
      latitude: spot.latitude,
      longitude: spot.longitude,
      distanceMeters: distanceBetweenMeters(
        latitude,
        longitude,
        spot.latitude,
        spot.longitude,
      ),
      categories: ["curated.observing_site"],
      kind: "Observing place",
      city: spot.region,
      region: "NSW",
      country: "Australia",
    }))
    .filter((spot) => spot.distanceMeters <= radiusKm * 1000)
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, limit);
}

export function parseNearbyPlaces(features: GeoapifyFeature[]): NearbyPlace[] {
  const seen = new Set<string>();
  return features.flatMap((feature, index) => {
    const properties = feature.properties ?? {};
    const coordinates = Array.isArray(feature.geometry?.coordinates)
      ? feature.geometry?.coordinates
      : [];
    const longitude = finiteCoordinate(properties.lon, 180)
      ? properties.lon
      : coordinates[0];
    const latitude = finiteCoordinate(properties.lat, 90)
      ? properties.lat
      : coordinates[1];
    if (!finiteCoordinate(latitude, 90) || !finiteCoordinate(longitude, 180)) return [];

    const categories = Array.isArray(properties.categories)
      ? properties.categories.filter((value): value is string => typeof value === "string")
      : [];
    const name =
      text(properties.name) ??
      text(properties.address_line1) ??
      text(properties.formatted);
    if (!name) return [];
    const id =
      text(properties.place_id) ??
      `geoapify-place-${index}-${latitude}-${longitude}`;
    if (seen.has(id)) return [];
    seen.add(id);

    const address =
      text(properties.formatted) ??
      [text(properties.address_line1), text(properties.address_line2)]
        .filter(Boolean)
        .join(", ") ??
      name;
    return [
      {
        id,
        name,
        address: address || name,
        latitude: latitude as number,
        longitude: longitude as number,
        distanceMeters:
          typeof properties.distance === "number" && Number.isFinite(properties.distance)
            ? Math.max(0, properties.distance)
            : null,
        categories,
        kind: placeKind(categories),
        city: text(properties.city),
        region: text(properties.state),
        country: text(properties.country),
      },
    ];
  });
}

export type PlaceRoute = {
  distanceMeters: number;
  durationSeconds: number;
};

export function parseGeoapifyRoute(data: unknown): PlaceRoute | null {
  if (!data || typeof data !== "object") return null;
  const features = (data as { features?: unknown }).features;
  if (!Array.isArray(features) || !features.length) return null;
  const properties = (features[0] as { properties?: unknown })?.properties;
  if (!properties || typeof properties !== "object") return null;
  const distance = (properties as { distance?: unknown }).distance;
  const time = (properties as { time?: unknown }).time;
  if (
    typeof distance !== "number" ||
    !Number.isFinite(distance) ||
    typeof time !== "number" ||
    !Number.isFinite(time)
  )
    return null;
  return { distanceMeters: Math.max(0, distance), durationSeconds: Math.max(0, time) };
}
