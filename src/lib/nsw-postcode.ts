export type PostcodeLocation = {
  postcode: string;
  label: string;
  latitude: number;
  longitude: number;
};

type NominatimPlace = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

const cache = new Map<string, PostcodeLocation>();

export async function resolveNswPostcode(
  value: string,
): Promise<PostcodeLocation | null> {
  const postcode = value.trim();
  if (!/^\d{4}$/.test(postcode)) return null;

  const cached = cache.get(postcode);
  if (cached) return cached;

  const query = new URLSearchParams({
    q: `${postcode}, New South Wales, Australia`,
    format: "jsonv2",
    limit: "1",
    countrycodes: "au",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${query.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-AU",
        "User-Agent": "AstroScout postcode lookup",
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
    },
  );
  if (!response.ok) return null;

  const [place] = (await response.json()) as NominatimPlace[];
  const latitude = Number(place?.lat);
  const longitude = Number(place?.lon);
  const isNsw = /new south wales|\bnsw\b/i.test(place?.display_name ?? "");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isNsw)
    return null;

  const location = {
    postcode,
    label: `${postcode} NSW`,
    latitude,
    longitude,
  };
  cache.set(postcode, location);
  return location;
}
